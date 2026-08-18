/**
 * `cron_retencao`: anonimiza dado pessoal com 12 meses da ultima visita, e varre o texto aberto.
 *
 * A regra tem duas metades, e e a separacao entre elas que faz a decisao D4 funcionar:
 *   Dado pessoal (nome, e-mail, WhatsApp, nascimento): apagado 12 meses depois da ULTIMA
 *   VISITA, nao da coleta. Cliente que volta reinicia o prazo, o que e o comportamento certo.
 *   Resposta da pesquisa: mantida indefinidamente, desvinculada do contato. Nao e dado pessoal
 *   depois disso, e e a serie historica que motiva o projeto.
 *
 * O DETALHE QUE QUASE SEMPRE ESCAPA: o comentario aberto e campo livre, e o cliente pode
 * escrever o proprio telefone dentro dele. Sem varredura de padrao, a retencao de 12 meses e
 * furada pelo proprio texto que se pretende preservar.
 */

import type { Ambiente } from '../lib/supabase.js'
import { rpc, seleciona, type ContagensRotina } from '../lib/supabase.js'

export async function rodaRetencao(env: Ambiente): Promise<ContagensRotina> {
  // A regra vive no banco, em SQL, e nao aqui: apagar dado pessoal e operacao de uma
  // transacao, e dividir isso entre Worker e banco criaria estado intermediario onde o
  // cliente esta meio anonimizado.
  const resultado = await rpc<{
    clientes_anonimizados: number
    textos_varridos: number
    padroes_removidos: number
  }>(env, 'fn_aplica_retencao', { p_meses: 12 })

  // Pedido de titular em aberto ha mais de 7 dias vira cobranca no digest (N43). A LGPD nao
  // da prazo de 7 dias, mas prazo interno curto e o que evita o prazo legal ser estourado.
  const atrasados = await seleciona<{ id: string }>(
    env,
    'exclusao_pedido',
    'select=id&atendido_em=is.null',
  )

  // `linhas_anonimizadas` e `mascaramentos` sao as duas colunas de `execucao_rotina` que esta
  // rotina preenche, e sao as que provam que a retencao rodou: sem elas, a unica evidencia de
  // conformidade seria a ausencia de dado, que nao prova nada.
  return {
    linhas_anonimizadas: resultado.clientes_anonimizados,
    mascaramentos: resultado.padroes_removidos,
    textos_varridos: resultado.textos_varridos,
    pedidos_em_aberto: atrasados.length,
  }
}
