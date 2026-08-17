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
  RESEND_API_KEY?: string
  GROQ_API_KEY?: string
  DRIVE_SA_JSON?: string
  TZ_CASA?: string
}

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
  try {
    const cabecalhos: Record<string, string> = {
      apikey: env.SUPABASE_SERVICE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
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
export async function seleciona<T>(
  env: Ambiente,
  relacao: string,
  consulta: string,
  schema = 'experiencia',
): Promise<T[]> {
  const resp = await chama(env, `/${relacao}?${consulta}`, { method: 'GET', schema })
  return (await resp.json()) as T[]
}

/** Insere linhas. Usado apenas pelas rotinas, nunca pelo caminho do tablet. */
export async function insere<T>(
  env: Ambiente,
  relacao: string,
  linhas: readonly unknown[],
  schema = 'experiencia',
): Promise<T[]> {
  if (linhas.length === 0) return []
  const resp = await chama(env, `/${relacao}`, {
    method: 'POST',
    body: JSON.stringify(linhas),
    headers: { prefer: 'return=representation,resolution=merge-duplicates' },
    schema,
  })
  const texto = await resp.text()
  return (texto === '' ? [] : JSON.parse(texto)) as T[]
}

/**
 * Registra a execucao de uma rotina no proprio banco.
 *
 * Existe porque o log do fornecedor expira (o plano gratuito do Supabase retem 1 dia) e o
 * nosso nao. Sem este registro, ninguem consegue responder "quando foi a ultima vez que a
 * importacao rodou", que e a primeira pergunta de todo diagnostico.
 */
export async function registraExecucao(
  env: Ambiente,
  rotina: string,
  iniciadoEm: string,
  status: 'sucesso' | 'erro',
  contagens: Record<string, number>,
  erro?: string,
): Promise<void> {
  try {
    await insere(env, 'execucao_rotina', [
      {
        rotina,
        iniciado_em: iniciadoEm,
        terminado_em: new Date().toISOString(),
        status,
        contagens,
        ...(erro !== undefined ? { erro: erro.slice(0, 1000) } : {}),
      },
    ])
  } catch {
    // Falhar ao registrar nao pode derrubar a rotina que estava rodando. O alarme real e a
    // ausencia do e-mail das 16h por dois dias (N42), nao a ausencia de uma linha de log.
  }
}
