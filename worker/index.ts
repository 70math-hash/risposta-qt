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
import { rodaDigest } from './rotinas/digest.js'
import { rodaClassificador } from './rotinas/classificador.js'
import { rodaRetencao } from './rotinas/retencao.js'
import { rodaWatcherDrive } from './rotinas/watcher-drive.js'

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

export default {
  async fetch(req: Request, env: Ambiente): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

    const url = new URL(req.url)
    const rota = `${req.method} ${url.pathname}`

    switch (rota) {
      case 'POST /api/resposta':
        return postResposta(req, env)
      case 'POST /api/tentativa':
        return postTentativa(req, env)
      case 'POST /api/sinal':
        return postSinal(req, env)
      case 'GET /api/catalogo':
        return getCatalogo(env)
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
      fn: () => Promise<Record<string, number>>,
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
