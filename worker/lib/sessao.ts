/**
 * Quem esta falando com o Worker, quando quem fala e uma pessoa e nao um tablet.
 *
 * POR QUE EXISTE
 *   O Worker guarda a chave de servico, que passa por cima de RLS. As rotas do quiosque nao
 *   precisam de autenticacao porque escrevem SO por `fn_grava_resposta` e `fn_registra_sinal`,
 *   duas funcoes de escopo minimo: o pior que um estranho faz com elas e inserir uma resposta
 *   falsa, que e ruido, aparece como suspeita e nao le nada.
 *
 *   A importacao manual do R3 e outra coisa. Ela escreve `venda_produto_dia`, que e faturamento,
 *   e guarda o arquivo bruto. Uma rota aberta ali seria escrita de dado financeiro por qualquer
 *   pessoa que descubra a URL, com a chave de servico por tras. Por isso ela exige sessao.
 *
 * COMO A SESSAO E CONFERIDA
 *   O painel manda o `access_token` da propria sessao do Supabase. O Worker pergunta ao Supabase
 *   quem e esse token, chamando `/auth/v1/user`. Nao se verifica assinatura JWT aqui de proposito:
 *   isso exigiria guardar o segredo do projeto tambem no Worker, e um segredo a mais e um segredo
 *   a mais que pode vazar. A chamada custa uma ida de rede numa rota que uma pessoa usa algumas
 *   vezes por mes.
 *
 *   O que se obtem e o e-mail, que vai para `execucao_importacao.importado_por`. Isso responde
 *   "quem subiu esta planilha", que e a primeira pergunta quando um numero de faturamento nao
 *   fecha.
 */

import type { Ambiente } from './supabase.js'

export interface Usuario {
  id: string
  email: string
}

export class SemSessao extends Error {
  constructor(readonly motivo: string) {
    super(motivo)
    this.name = 'SemSessao'
  }
}

/**
 * Confere o token e devolve o usuario. Lanca `SemSessao` quando o token nao presta.
 *
 * A chave publica vai no cabecalho `apikey` porque o endpoint de auth a exige; o token do usuario
 * vai no `authorization`. A chave de SERVICO nao entra aqui: com ela, `/auth/v1/user` responderia
 * sobre o proprio service_role e a conferencia passaria sempre, o que transformaria esta funcao
 * numa que sempre diz sim.
 */
export async function usuarioDaRequisicao(req: Request, env: Ambiente): Promise<Usuario> {
  const cabecalho = req.headers.get('authorization') ?? ''
  const token = cabecalho.toLowerCase().startsWith('bearer ') ? cabecalho.slice(7).trim() : ''
  if (token === '') {
    throw new SemSessao('requisicao sem cabecalho authorization: entre no painel antes de importar')
  }
  if (env.SUPABASE_ANON_KEY === undefined || env.SUPABASE_ANON_KEY === '') {
    throw new SemSessao(
      'SUPABASE_ANON_KEY nao configurada no Worker: sem ela nao ha como conferir a sessao, e a rota nao pode abrir sem conferir',
    )
  }

  const resp = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${token}`,
    },
  })
  if (!resp.ok) {
    throw new SemSessao(`sessao invalida ou expirada (${resp.status}). Entre no painel de novo`)
  }

  const dados = (await resp.json()) as { id?: string; email?: string }
  if (dados.id === undefined || dados.id === '') {
    throw new SemSessao('o Supabase nao devolveu um usuario para este token')
  }
  return { id: dados.id, email: dados.email ?? dados.id }
}
