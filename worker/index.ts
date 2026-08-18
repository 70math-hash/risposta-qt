/**
 * O Worker: a API de escrita e as quatro rotinas agendadas.
 *
 * E o unico componente que conhece a chave de servico. O tablet fala com ele, ele fala com o
 * banco, e o bundle publicado do PWA nao carrega segredo nenhum.
 *
 * Quatro Cron Triggers dos cinco que o plano gratuito da por conta (N22). O quinto fica livre
 * de proposito, e NAO e para keep-alive: quem mantem o banco acordado e o proprio
 * `cron_digest_16h`.
 */

import type {
  RespostaDaApi,
  RespostaEnviada,
  SinalDispositivo,
  TentativaEnviada,
} from '../src/comum/contrato.js'
import { validaResposta } from '../src/comum/contrato.js'
import type { Ambiente } from './lib/supabase.js'
import { ErroBanco, registraExecucao, rpc, seleciona } from './lib/supabase.js'
import type { ContagensRotina } from './lib/supabase.js'
import { rodaDigest } from './rotinas/digest.js'
import { rodaClassificador } from './rotinas/classificador.js'
import { rodaRetencao } from './rotinas/retencao.js'
import { rodaWatcherDrive } from './rotinas/watcher-drive.js'
import { importaR3, jaImportado, sha256 } from './rotinas/importa.js'
import { SemSessao, usuarioDaRequisicao } from './lib/sessao.js'
import {
  catalogoDeEntidades,
  corpoDeDesligamento,
  ENTIDADES,
  ErroAdmin,
  validaCorpo,
} from './admin.js'
import { atualiza, insere } from './lib/supabase.js'

const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  })
}

function ok(extra: Partial<RespostaDaApi> = {}): Response {
  return json({ ok: true, ...extra })
}

function erro(mensagem: string, status: number): Response {
  return json({ ok: false, erro: mensagem }, status)
}

/**
 * Gravacao de resposta.
 *
 * Idempotente pelo `id` gerado no cliente: reenvio do mesmo id nao cria segunda linha. E isso
 * que permite a fila do tablet ser agressiva sem risco de duplicar, e e isso que faz uma
 * queda de rede no meio do envio ser inofensiva.
 */
async function postResposta(req: Request, env: Ambiente): Promise<Response> {
  let carga: RespostaEnviada
  try {
    carga = (await req.json()) as RespostaEnviada
  } catch {
    return erro('corpo nao e JSON valido', 400)
  }

  // Valida de novo no servidor, sempre. Validacao no cliente e conveniencia, nunca seguranca.
  const erros = validaResposta(carga)
  if (erros.length > 0) return erro(erros.join('; '), 422)

  try {
    // Uma chamada, uma transacao. A funcao grava a resposta, as filhas, a tentativa de par,
    // o contato, o consentimento E o alerta de detrator. Nao existe chamada separada para o
    // alerta de proposito: com duas chamadas, uma resposta poderia existir sem o aviso dela.
    const id = await rpc<string>(env, 'fn_grava_resposta', { p: carga })
    return ok({ id })
  } catch (e) {
    if (e instanceof ErroBanco) {
      // Conflito de chave significa reenvio: o cliente ja tem o que precisa.
      if (e.status === 409 || e.detalhe.includes('duplicate key')) {
        return ok({ id: carga.id, duplicada: true })
      }
      return erro(`banco: ${e.detalhe}`, 502)
    }
    return erro(e instanceof Error ? e.message : 'erro desconhecido', 500)
  }
}

/**
 * A recusa registrada na T0.
 *
 * Vai pela MESMA funcao de gravacao, com `desfecho = 'recusou'`: ela grava so a tentativa e
 * devolve o id dela. Nao existe funcao separada, e isso mantem verdadeira a regra de que duas
 * funcoes, e so duas, escrevem por conta do PWA.
 *
 * A tentativa do caminho `respondeu` NAO passa por aqui: `fn_grava_resposta` grava a tentativa
 * de par com o mesmo id da resposta. Enviar as duas duplicaria o denominador da conversao por
 * garcom, o que inflaria a taxa sem ninguem notar.
 */
async function postTentativa(req: Request, env: Ambiente): Promise<Response> {
  let carga: TentativaEnviada
  try {
    carga = (await req.json()) as TentativaEnviada
  } catch {
    return erro('corpo nao e JSON valido', 400)
  }
  if (carga.desfecho !== 'recusou') {
    return erro(
      'esta rota aceita apenas desfecho `recusou`. A tentativa de quem respondeu e gravada por fn_grava_resposta, com o mesmo id da resposta',
      422,
    )
  }
  try {
    await rpc(env, 'fn_grava_resposta', { p: { ...carga, desfecho: 'recusou' } })
    return ok({ id: carga.id })
  } catch (e) {
    if (e instanceof ErroBanco && (e.status === 409 || e.detalhe.includes('duplicate key'))) {
      return ok({ id: carga.id, duplicada: true })
    }
    return erro(e instanceof Error ? e.message : 'erro desconhecido', 502)
  }
}

/**
 * Sinal do aparelho.
 *
 * Com quatro tablets em uso, aparelho mudo fica invisivel no agregado (D5). Este sinal e o
 * que permite ao e-mail das 16h listar cada aparelho pelo apelido com a hora do ultimo
 * contato, em vez de so o total de respostas do dia.
 */
async function postSinal(req: Request, env: Ambiente): Promise<Response> {
  let carga: SinalDispositivo
  try {
    carga = (await req.json()) as SinalDispositivo
  } catch {
    return erro('corpo nao e JSON valido', 400)
  }
  try {
    await rpc(env, 'fn_registra_sinal', { p: carga })
    return ok()
  } catch (e) {
    return erro(e instanceof Error ? e.message : 'erro desconhecido', 502)
  }
}

/**
 * O que o PWA precisa e nao esta no bundle.
 *
 * Vem por leitura e nao embutido, porque cardapio, perguntas em foco e versao do texto de
 * consentimento mudam sem deploy. Embutir qualquer um dos tres transformaria mudanca de
 * cardapio em publicacao de app.
 */
async function getCatalogo(env: Ambiente): Promise<Response> {
  try {
    const [itens, perguntas, textos, mesas] = await Promise.all([
      // Os dois nomes, e nao um so: o questionario inteiro e bilingue (T0 a T7 tem texto em
      // pt e en), e o idioma e escolhido pelo cliente NA TELA, depois de o catalogo ja ter
      // sido baixado. Mandar so `nome_pt` mostraria a pizza em portugues a quem escolheu
      // ingles, no meio de uma tela toda traduzida.
      seleciona<{ id: string; nome_pt: string; nome_en: string; grupo: string }>(
        env,
        'item_cardapio',
        'select=id,nome_pt,nome_en,grupo&ativo=is.true&removido_em=is.null&order=nome_pt',
      ),
      // O `id` vem junto do `numero` porque o payload guarda o id, e nao o numero: numero e
      // rotulo de leitura e pode migrar numa reescrita, id nao.
      seleciona<{ id: string; numero: number }>(
        env,
        'pergunta_banco',
        'select=id,numero&ativa=is.true&order=numero',
      ),
      seleciona<{ versao: string; texto: string }>(
        env,
        'consentimento_texto',
        'select=versao,texto&order=vigente_de.desc&limit=1',
      ),
      seleciona<{ numero: string; area: string }>(
        env,
        'mesa',
        'select=numero,area&order=numero',
      ),
    ])
    return json({
      ok: true,
      itens,
      perguntas_ativas: perguntas,
      consentimento: textos[0] ?? null,
      mesas,
    })
  } catch (e) {
    // O quiosque tem de funcionar com catalogo vazio: sem ele, a T3C2 e pulada e a coleta
    // segue. Devolver erro aqui derrubaria a coleta por causa de uma tela opcional.
    return json({
      ok: false,
      itens: [],
      perguntas_ativas: [],
      consentimento: null,
      mesas: [],
      erro: e instanceof Error ? e.message : 'erro desconhecido',
    })
  }
}

/**
 * Importacao manual do R3, pelo painel.
 *
 * O caminho de conserto (F40): quando o watcher do Drive nao pegou um dia — pasta nao
 * sincronizada, arquivo salvo com outro nome, ou o dia em que alguem esqueceu de exportar —, esta
 * rota e como o dia entra sem esperar a proxima meia hora nem depender do Drive.
 *
 * EXIGE SESSAO, ao contrario das rotas do quiosque. As do quiosque escrevem so por duas funcoes
 * de escopo minimo; esta escreve faturamento e guarda o arquivo bruto, com a chave de servico por
 * tras. Ver `worker/lib/sessao.ts` para o porque.
 *
 * NAO recusa arquivo repetido: devolve `duplicada` e o resultado da importacao anterior. Reenviar
 * o mesmo arquivo e um gesto normal de quem nao tem certeza se o primeiro envio funcionou, e a
 * idempotencia de `venda_produto_dia` ja garante que o faturamento do dia nao muda. Recusar com
 * erro faria a pessoa procurar um problema que nao existe.
 */
async function postImportaR3(req: Request, env: Ambiente): Promise<Response> {
  let usuario
  try {
    usuario = await usuarioDaRequisicao(req, env)
  } catch (e) {
    if (e instanceof SemSessao) return erro(e.motivo, 401)
    return erro(e instanceof Error ? e.message : 'erro desconhecido', 500)
  }

  const parametros = new URL(req.url).searchParams
  const nome = parametros.get('arquivo') ?? 'envio-manual.csv'

  // O dia operacional, quando quem importa informa. O R3 pode nao ter coluna de data (o relatorio
  // e de um dia e a data fica no cabecalho impresso), e sem esta saida o caminho manual nao
  // conseguiria consertar exatamente o caso para o qual existe.
  const dia = parametros.get('dia')
  if (dia !== null && !/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    return erro(`dia invalido: ${dia}. Use o formato AAAA-MM-DD`, 422)
  }

  const bytes = await req.arrayBuffer()

  if (bytes.byteLength === 0) {
    return erro('arquivo vazio', 422)
  }
  // O teto existe porque `arquivo_bruto` vai inteiro para uma coluna `bytea` e o corpo passa pela
  // memoria do Worker. Um R3 de um dia tem alguns kilobytes; 5 MB e folga de duas ordens de
  // grandeza e ainda impede que um envio errado (um video, um zip) tente virar linha de banco.
  if (bytes.byteLength > 5_000_000) {
    return erro(`arquivo de ${Math.round(bytes.byteLength / 1024)} kB: o teto e 5 MB`, 413)
  }

  try {
    const hash = await sha256(bytes)
    if (await jaImportado(env, hash)) {
      return json({
        ok: true,
        duplicada: true,
        mensagem:
          'Este arquivo exato já foi importado antes. Nada foi gravado de novo, e o faturamento do dia não mudou.',
      })
    }

    const r = await importaR3(env, {
      nome,
      bytes,
      origem: 'painel',
      importadoPor: usuario.email,
      ...(dia !== null ? { dia } : {}),
    })
    // Status 200 mesmo quando `r.status` e `erro`: a importacao ACONTECEU e o arquivo bruto esta
    // gravado, o que e o que permite reprocessar. Devolver 5xx faria a tela dizer que nada
    // aconteceu, e a proxima pessoa reenviaria o mesmo arquivo achando que nao chegou.
    return json({ ok: true, ...r })
  } catch (e) {
    // `e.detalhe` junto, e nao so `e.message`. `ErroBanco.message` e sempre "PostgREST devolveu
    // 400", que nao diz nada a quem le: o motivo real (coluna, constraint, chave estrangeira) vem
    // no detalhe. Sem ele, a tela mostra um numero e quem esta consertando um dia faltante nao tem
    // por onde comecar.
    if (e instanceof ErroBanco) return erro(`${e.message}: ${e.detalhe}`, 502)
    return erro(e instanceof Error ? e.message : 'erro desconhecido', 502)
  }
}

/**
 * As escritas administrativas: os cinco deveres humanos que sao escrita.
 *
 * `POST   /api/admin/<entidade>`            cria ou atualiza (upsert quando ha chave natural)
 * `POST   /api/admin/<entidade>/<id>`       atualiza aquele registro
 * `DELETE /api/admin/<entidade>/<id>`       desliga, pela estrategia declarada da entidade
 * `GET    /api/admin`                       o catalogo de entidades, para a tela montar os campos
 *
 * TODAS exigem sessao. A lista branca de `worker/admin.ts` e a fronteira: o Worker tem a chave de
 * servico, que passa por cima de RLS, entao sem lista branca uma sessao valida daria poder sobre o
 * banco inteiro — incluindo `resposta` e as tabelas do sistema fiscal em `public`.
 *
 * Nenhuma entidade de resposta esta na lista, e nunca deve estar: resposta nasce completa e nao se
 * edita. Corrigir uma resposta e coletar outra.
 */
async function rotaAdmin(
  req: Request,
  env: Ambiente,
  partes: readonly string[],
): Promise<Response> {
  // Sessao ANTES de qualquer coisa, inclusive antes de olhar o caminho.
  try {
    await usuarioDaRequisicao(req, env)
  } catch (e) {
    if (e instanceof SemSessao) return erro(e.motivo, 401)
    return erro(e instanceof Error ? e.message : 'erro desconhecido', 500)
  }

  // `GET /api/admin`: o catalogo. A tela monta os formularios a partir DELE, e nao de uma copia da
  // lista em TypeScript do front: duas listas divergiriam, e a divergencia apareceria como campo
  // que a tela mostra e o servidor recusa.
  if (partes.length === 0) {
    if (req.method !== 'GET') return erro('use GET para ler o catalogo', 405)
    return json({ ok: true, entidades: catalogoDeEntidades() })
  }

  const nome = partes[0]!
  const entidade = ENTIDADES[nome]
  if (entidade === undefined) {
    return erro(
      `entidade desconhecida: ${nome}. Conhecidas: ${Object.keys(ENTIDADES).join(', ')}`,
      404,
    )
  }
  const id = partes[1]

  try {
    if (req.method === 'DELETE') {
      if (id === undefined) return erro('DELETE exige o id do registro', 422)
      const linhas = await atualiza(env, entidade.tabela, `id=eq.${id}`, corpoDeDesligamento(entidade))
      if (linhas.length === 0) return erro(`nao achei ${nome} com id ${id}`, 404)
      return json({ ok: true, desligado: linhas[0] })
    }

    if (req.method !== 'POST') return erro(`metodo ${req.method} nao vale aqui`, 405)

    let corpo: Record<string, unknown>
    try {
      corpo = (await req.json()) as Record<string, unknown>
    } catch {
      return erro('corpo nao e JSON valido', 400)
    }

    const limpo = validaCorpo(entidade, corpo, id === undefined)

    if (id !== undefined) {
      const linhas = await atualiza(env, entidade.tabela, `id=eq.${id}`, limpo)
      if (linhas.length === 0) return erro(`nao achei ${nome} com id ${id}`, 404)
      return json({ ok: true, salvo: linhas[0] })
    }

    // Sem id: cria. Com chave natural, faz upsert por ela, porque quem informa duas vezes esta
    // corrigindo, e a correcao tem de SUBSTITUIR. Sem a chave, o segundo envio das mesas atendidas
    // criaria uma segunda linha e a conversao do dia passaria a ter dois denominadores.
    const linhas = await insere<Record<string, unknown>>(
      env,
      entidade.tabela,
      [limpo],
      'experiencia',
      entidade.chaveNatural === undefined ? {} : { on_conflict: entidade.chaveNatural },
    )
    return json({ ok: true, salvo: linhas[0] ?? null })
  } catch (e) {
    if (e instanceof ErroAdmin) return erro(e.message, e.status)
    if (e instanceof ErroBanco) return erro(`banco: ${e.detalhe}`, 502)
    return erro(e instanceof Error ? e.message : 'erro desconhecido', 500)
  }
}

/**
 * Registra que alguem falou com o cliente detrator.
 *
 * Rota propria, e nao entidade da lista branca, porque `alerta_detrator` NAO e cadastro: a unica
 * coluna que uma pessoa pode tocar ali e `contato_em`, e o resto e escrito por
 * `fn_grava_resposta` e pelo envio do alerta. Uma entidade generica com uma coluna so seria mais
 * confusa que uma rota que diz o que faz.
 *
 * `contato_em` e o que separa "o alerta chegou" de "alguem fez algo". Sem ele, o painel mostra
 * alertas enviados e ninguem sabe se a mesa foi atendida — e o campo vazio nao prova que ninguem
 * falou com o cliente, prova que ninguem anotou.
 */
async function postContatoAlerta(req: Request, env: Ambiente): Promise<Response> {
  try {
    await usuarioDaRequisicao(req, env)
  } catch (e) {
    if (e instanceof SemSessao) return erro(e.motivo, 401)
    return erro(e instanceof Error ? e.message : 'erro desconhecido', 500)
  }

  let corpo: { resposta_id?: string; contato_em?: string }
  try {
    corpo = (await req.json()) as typeof corpo
  } catch {
    return erro('corpo nao e JSON valido', 400)
  }
  if (corpo.resposta_id === undefined || corpo.resposta_id === '') {
    return erro('resposta_id e obrigatorio', 422)
  }

  try {
    const linhas = await atualiza(env, 'alerta_detrator', `resposta_id=eq.${corpo.resposta_id}`, {
      contato_em: corpo.contato_em ?? new Date().toISOString(),
    })
    if (linhas.length === 0) return erro('nao existe alerta para esta resposta', 404)
    return json({ ok: true, salvo: linhas[0] })
  } catch (e) {
    if (e instanceof ErroBanco) return erro(`banco: ${e.detalhe}`, 502)
    return erro(e instanceof Error ? e.message : 'erro desconhecido', 500)
  }
}

/**
 * Atende um pedido de exclusao de titular (LGPD).
 *
 * Rota propria pelo mesmo motivo da anterior, e tambem porque atender NAO e editar uma linha: e
 * anonimizar o cliente e carimbar o pedido, e as duas coisas tem de acontecer juntas. Quem faz as
 * duas numa transacao e `fn_atende_exclusao`, no banco: dividir isso entre Worker e banco criaria
 * um estado em que o pedido esta atendido e o dado continua la.
 */
async function postAtendeExclusao(req: Request, env: Ambiente): Promise<Response> {
  let usuario
  try {
    usuario = await usuarioDaRequisicao(req, env)
  } catch (e) {
    if (e instanceof SemSessao) return erro(e.motivo, 401)
    return erro(e instanceof Error ? e.message : 'erro desconhecido', 500)
  }

  let corpo: { pedido_id?: string }
  try {
    corpo = (await req.json()) as typeof corpo
  } catch {
    return erro('corpo nao e JSON valido', 400)
  }
  if (corpo.pedido_id === undefined || corpo.pedido_id === '') {
    return erro('pedido_id e obrigatorio', 422)
  }

  try {
    const r = await rpc<Record<string, unknown>>(env, 'fn_atende_exclusao', {
      p_pedido_id: corpo.pedido_id,
      p_atendido_por: usuario.email,
    })
    return json({ ok: true, ...r })
  } catch (e) {
    if (e instanceof ErroBanco) return erro(`banco: ${e.detalhe}`, 502)
    return erro(e instanceof Error ? e.message : 'erro desconhecido', 500)
  }
}

export default {
  async fetch(req: Request, env: Ambiente): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

    const url = new URL(req.url)
    const rota = `${req.method} ${url.pathname}`

    // As rotas administrativas tem caminho variavel (`/api/admin/<entidade>/<id>`), entao elas sao
    // resolvidas antes do `switch`, que casa caminho exato.
    if (url.pathname === '/api/admin' || url.pathname.startsWith('/api/admin/')) {
      const partes = url.pathname
        .slice('/api/admin'.length)
        .split('/')
        .filter((p) => p !== '')
      return rotaAdmin(req, env, partes)
    }

    switch (rota) {
      case 'POST /api/resposta':
        return postResposta(req, env)
      case 'POST /api/tentativa':
        return postTentativa(req, env)
      case 'POST /api/sinal':
        return postSinal(req, env)
      case 'GET /api/catalogo':
        return getCatalogo(env)
      case 'POST /api/importa-r3':
        return postImportaR3(req, env)
      case 'POST /api/contato-alerta':
        return postContatoAlerta(req, env)
      case 'POST /api/atende-exclusao':
        return postAtendeExclusao(req, env)
      case 'GET /api/saude':
        // Sonda simples, sem tocar o banco: responde se o Worker esta no ar.
        return ok()
      default:
        return erro(`rota desconhecida: ${rota}`, 404)
    }
  },

  /**
   * As quatro rotinas.
   *
   * Cada uma grava uma linha em `execucao_rotina`, com sucesso ou com erro. No digest, a
   * consulta ao banco e o envio do e-mail sao passos separados, porque falha de e-mail nao
   * pode desligar o keep-alive do banco.
   */
  async scheduled(evento: ScheduledController, env: Ambiente): Promise<void> {
    const inicio = new Date().toISOString()
    const cron = evento.cron

    const executa = async (
      nome: string,
      fn: () => Promise<ContagensRotina>,
    ): Promise<void> => {
      try {
        const contagens = await fn()
        await registraExecucao(env, nome, inicio, 'sucesso', contagens)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        await registraExecucao(env, nome, inicio, 'erro', {}, msg)
        // Relanca para o painel de tarefas do Cloudflare marcar a execucao como falha.
        throw e
      }
    }

    switch (cron) {
      case '*/30 * * * *':
        return executa('watcher_drive', () => rodaWatcherDrive(env))
      case '0 10 * * *':
        return executa('cron_classificador', () => rodaClassificador(env))
      case '0 19 * * *':
        return executa('cron_digest_16h', () => rodaDigest(env))
      case '0 8 1 * *':
        return executa('cron_retencao', () => rodaRetencao(env))
      default:
        // Cron desconhecido significa wrangler.toml e codigo fora de sincronia, e isso tem de
        // aparecer no log em vez de passar em silencio.
        await registraExecucao(
          env,
          'cron_digest_16h',
          inicio,
          'erro',
          {},
          `cron nao mapeado: ${cron}`,
        )
    }
  },
}
