/**
 * Acesso ao Postgres pelo PostgREST do Supabase, com `fetch` cru.
 *
 * Sem a biblioteca oficial, de proposito: aqui se usa RPC e `select` simples, e a biblioteca
 * traria um cliente inteiro, um construtor de consulta e uma cadeia de dependencias para
 * resolver o que resolve em trinta linhas. Menos codigo de terceiro no caminho da gravacao e
 * menos coisa que muda de comportamento numa atualizacao que ninguem vai acompanhar.
 *
 * A chave de servico vive SO aqui, no Worker. Ela nunca entra no bundle do PWA, que e
 * publicado e legivel por qualquer pessoa.
 */

export interface Ambiente {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  /**
   * A chave publica. Nao serve para escrever nada: existe so para o endpoint `/auth/v1/user`
   * aceitar a pergunta "de quem e este token", que e como a rota de importacao manual confere a
   * sessao do painel. Ver `worker/lib/sessao.ts`.
   */
  SUPABASE_ANON_KEY?: string
  /**
   * O segredo JWT do projeto. Quando presente, o Worker assina um token com
   * `role: experiencia_app` e escreve COM as permissoes do papel restrito, em vez das do
   * `service_role`, que passa por cima de RLS e alcanca o `public` do sistema fiscal.
   *
   * Ausente, o Worker usa a chave de servico e DIZ que esta usando, em `GET /api/saude`. Ver
   * `worker/lib/token.ts`.
   */
  SUPABASE_JWT_SECRET?: string
  RESEND_API_KEY?: string
  GROQ_API_KEY?: string
  DRIVE_SA_JSON?: string
  TZ_CASA?: string
}

import { credencial } from './token.js'
import COLUNAS_NUMERICAS from '../../supabase/colunas-numericas.json'

export class ErroBanco extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detalhe: string,
  ) {
    super(message)
    this.name = 'ErroBanco'
  }
}

const TIMEOUT_MS = 10_000

async function chama(
  env: Ambiente,
  caminho: string,
  init: RequestInit & { schema?: string },
): Promise<Response> {
  const controle = new AbortController()
  const relogio = setTimeout(() => controle.abort(), TIMEOUT_MS)
  // A credencial do papel RESTRITO quando o segredo JWT existe, e a chave de servico quando nao.
  // Com o papel restrito, os grants das 27 tabelas e as politicas de RLS passam a valer para quem
  // escreve de verdade; com a chave de servico, nada disso vale. Ver `worker/lib/token.ts`.
  const cred = await credencial(env)
  try {
    const cabecalhos: Record<string, string> = {
      apikey: cred.apikey,
      authorization: cred.autorizacao,
      'content-type': 'application/json',
      // O schema da pesquisa nao e `public`, e o PostgREST precisa disso explicito.
      'accept-profile': init.schema ?? 'experiencia',
      'content-profile': init.schema ?? 'experiencia',
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    }
    const resp = await fetch(`${env.SUPABASE_URL}/rest/v1${caminho}`, {
      ...init,
      headers: cabecalhos,
      signal: controle.signal,
    })
    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => '')
      throw new ErroBanco(
        `PostgREST devolveu ${resp.status}`,
        resp.status,
        detalhe.slice(0, 500),
      )
    }
    return resp
  } finally {
    clearTimeout(relogio)
  }
}

/** Chama uma funcao do schema `experiencia`. E o caminho de escrita do sistema. */
export async function rpc<T>(
  env: Ambiente,
  funcao: string,
  argumentos: Record<string, unknown>,
  schema = 'experiencia',
): Promise<T> {
  const resp = await chama(env, `/rpc/${funcao}`, {
    method: 'POST',
    body: JSON.stringify(argumentos),
    schema,
  })
  const texto = await resp.text()
  return (texto === '' ? null : JSON.parse(texto)) as T
}

/** Le linhas de uma tabela ou view. `consulta` e a query string do PostgREST. */
/**
 * `numeric` e `bigint` chegam do PostgREST como STRING, e o Worker tambem le views.
 *
 * O MESMO DEFEITO DO PAINEL, NO OUTRO LADO
 *   O painel corrigiu isto em `src/painel/dados.ts` convertendo na borda. O Worker tinha a mesma
 *   suposicao, e a consequencia era pior, porque ela nao aparece como tela branca: aparece como
 *   numero errado dentro do UNICO e-mail que o sistema manda.
 *
 *   `sum(valor_liquido)` e `numeric`, entao `vw_venda_dia.faturamento` chega `"1234.5"`. E
 *   `String.prototype.toLocaleString` IGNORA as opcoes e devolve a string intacta: o digest das
 *   16h escrevia `Faturamento: R$ 1234.5` em vez de `R$ 1.234,50`. Sem separador, sem centavos, e
 *   com aparencia de numero — ninguem le aquilo como defeito de software.
 *
 *   Comparacao tambem: `"9" > "10"` e VERDADEIRO entre strings, entao qualquer limiar sobre uma
 *   coluna numerica responderia ao contrario em uma faixa inteira de valores, sem erro nenhum.
 *
 * A lista de colunas e a MESMA que o painel usa, gerada do catalogo do banco por
 * `scripts/formas-das-views.mjs`. Uma fonte, dois consumidores: se ela envelhecer, envelhece para
 * os dois ao mesmo tempo, e o teste de contrato cai.
 */
export function converteNumericos<T>(relacao: string, linhas: T[]): T[] {
  const colunas = (COLUNAS_NUMERICAS as Record<string, string[]>)[relacao]
  if (colunas === undefined) return linhas

  for (const linha of linhas) {
    if (linha === null || typeof linha !== 'object') continue
    const registro = linha as Record<string, unknown>
    for (const coluna of colunas) {
      const valor = registro[coluna]
      if (typeof valor !== 'string') continue
      const n = Number(valor)
      // Texto que nao vira numero fica NULO, e nunca `NaN`: `NaN` se propaga por toda conta
      // seguinte e sairia no e-mail como `R$ NaN`, que manda quem le procurar no lugar errado.
      registro[coluna] = valor.trim() === '' || Number.isNaN(n) ? null : n
    }
  }
  return linhas
}

export async function seleciona<T>(
  env: Ambiente,
  relacao: string,
  consulta: string,
  schema = 'experiencia',
): Promise<T[]> {
  const resp = await chama(env, `/${relacao}?${consulta}`, { method: 'GET', schema })
  return converteNumericos(relacao, (await resp.json()) as T[])
}

/**
 * Insere linhas. Usado apenas pelas rotinas, nunca pelo caminho do tablet.
 *
 * `on_conflict` e obrigatorio quando a idempotencia da tabela vem de um UNIQUE que NAO e a
 * chave primaria. `resolution=merge-duplicates` sozinho resolve o conflito pela chave primaria,
 * e um `id` gerado por `gen_random_uuid()` nunca conflita: o efeito e um 409 na reimportacao em
 * vez da substituicao que se queria. `venda_produto_dia` e o caso: a idempotencia dela e
 * (dia_operacional, produto_nome_norm), e reimportar o mesmo dia tem de substituir o dia.
 */
export async function insere<T>(
  env: Ambiente,
  relacao: string,
  linhas: readonly unknown[],
  schema = 'experiencia',
  opcoes: { on_conflict?: string } = {},
): Promise<T[]> {
  if (linhas.length === 0) return []
  const consulta =
    opcoes.on_conflict === undefined
      ? ''
      : `?on_conflict=${encodeURIComponent(opcoes.on_conflict)}`
  const resp = await chama(env, `/${relacao}${consulta}`, {
    method: 'POST',
    body: JSON.stringify(linhas),
    headers: { prefer: 'return=representation,resolution=merge-duplicates' },
    schema,
  })
  const texto = await resp.text()
  return (texto === '' ? [] : JSON.parse(texto)) as T[]
}

/**
 * Atualiza linhas que casam com um filtro do PostgREST, e devolve as atualizadas.
 *
 * Devolve a representacao SEMPRE, e nao por opcao: quem chama precisa saber se o filtro casou com
 * alguma linha. Sem isso, atualizar um id que nao existe responderia sucesso, e a tela diria
 * "salvo" sobre um registro que nao foi tocado — que e o pior resultado possivel numa tela de
 * cadastro, porque a pessoa vai embora achando que resolveu.
 */
export async function atualiza<T>(
  env: Ambiente,
  relacao: string,
  filtro: string,
  campos: Record<string, unknown>,
  schema = 'experiencia',
): Promise<T[]> {
  const resp = await chama(env, `/${relacao}?${filtro}`, {
    method: 'PATCH',
    body: JSON.stringify(campos),
    headers: { prefer: 'return=representation' },
    schema,
  })
  const texto = await resp.text()
  return (texto === '' ? [] : JSON.parse(texto)) as T[]
}

/**
 * As contagens que uma rotina devolve.
 *
 * Cinco chaves tem COLUNA PROPRIA em `execucao_rotina`, porque sao as que o digest e o painel
 * leem por nome e as que valem alarme. As demais entram em `contagens`, que e `jsonb`.
 *
 * O tipo e aberto (`[chave: string]: ...`) porque cada rotina tem os proprios numeros, e nao
 * faria sentido uma uniao fechada de tudo que as quatro devolvem. O que o tipo garante e que as
 * cinco chaves com coluna, quando aparecem, aparecem com o tipo da coluna: `email_enviado` como
 * booleano e `destinatarios` como lista de texto, e nao como numero.
 */
export interface ContagensRotina {
  respostas_no_periodo?: number
  email_enviado?: boolean
  destinatarios?: readonly string[]
  linhas_anonimizadas?: number
  mascaramentos?: number
  [chave: string]: number | boolean | readonly string[] | undefined
}

/** As cinco chaves que tem coluna propria. Fonte unica, usada para separar do resto. */
const COLUNAS_DE_CONTAGEM = [
  'respostas_no_periodo',
  'email_enviado',
  'destinatarios',
  'linhas_anonimizadas',
  'mascaramentos',
] as const

/**
 * Registra a execucao de uma rotina no proprio banco.
 *
 * Existe porque o log do fornecedor expira (o plano gratuito do Supabase retem 1 dia) e o
 * nosso nao. Sem este registro, ninguem consegue responder "quando foi a ultima vez que a
 * importacao rodou", que e a primeira pergunta de todo diagnostico.
 *
 * ATENCAO ao `catch` vazio no fim: ele existe para falha de log nao derrubar a rotina que
 * estava rodando, e essa decisao esta certa. Mas ela tem um custo, e o custo apareceu de
 * verdade: enquanto esta funcao mandava um campo `contagens` que nenhuma coluna recebia, as
 * quatro rotinas rodavam, todo log falhava com 400 e `/painel/saude` ficava vazio, sem uma
 * linha de erro em lugar nenhum. E por isso que os nomes de coluna daqui sao conferidos por
 * `tests/contrato-colunas.test.ts` contra o DDL, e nao pela primeira execucao em producao.
 */
export async function registraExecucao(
  env: Ambiente,
  rotina: string,
  iniciadoEm: string,
  status: 'sucesso' | 'erro',
  contagens: ContagensRotina,
  erro?: string,
): Promise<void> {
  // As cinco com coluna vao para a coluna; o resto vai para `contagens`, que e jsonb. Assim o
  // numero que alguma tela le por nome nunca fica escondido dentro de um objeto.
  const nomeadas: Record<string, unknown> = {}
  const resto: Record<string, unknown> = {}
  for (const [chave, valor] of Object.entries(contagens)) {
    if (valor === undefined) continue
    if ((COLUNAS_DE_CONTAGEM as readonly string[]).includes(chave)) nomeadas[chave] = valor
    else resto[chave] = valor
  }

  try {
    await insere(env, 'execucao_rotina', [
      {
        rotina,
        iniciado_em: iniciadoEm,
        terminado_em: new Date().toISOString(),
        status,
        ...nomeadas,
        ...(Object.keys(resto).length > 0 ? { contagens: resto } : {}),
        // `execucao_rotina_erro_tem_mensagem` exige mensagem quando o status e `erro`. Sem este
        // texto de reserva, a linha de log de uma falha sem mensagem seria REJEITADA pelo
        // CHECK, e a falha desapareceria justamente no caso em que o log mais importa.
        ...(status === 'erro'
          ? { erro: (erro ?? 'rotina falhou sem mensagem').slice(0, 1000) }
          : erro !== undefined
            ? { erro: erro.slice(0, 1000) }
            : {}),
      },
    ])
  } catch {
    // Falhar ao registrar nao pode derrubar a rotina que estava rodando. O alarme real e a
    // ausencia do e-mail das 16h por dois dias (N42), nao a ausencia de uma linha de log.
  }
}
