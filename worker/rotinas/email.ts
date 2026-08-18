/**
 * Envio de e-mail pelo Resend.
 *
 * Plano gratuito: 3.000 por mes, limitado a 100 por dia (N23). O digest usa 5 por dia, o que
 * da 20 vezes de folga no limite diario, que e o que morde primeiro.
 *
 * Sem biblioteca: e uma chamada HTTP com um corpo JSON.
 */

import type { Ambiente } from '../lib/supabase.js'

export interface Email {
  para: readonly string[]
  assunto: string
  html: string
}

export async function enviaEmail(env: Ambiente, email: Email): Promise<void> {
  if (env.RESEND_API_KEY === undefined || env.RESEND_API_KEY === '') {
    throw new Error('RESEND_API_KEY ausente: e-mail nao enviado')
  }
  if (email.para.length === 0) return

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      // O remetente precisa de dominio proprio autenticado com SPF e DKIM, senao o digest
      // cai em spam e o sistema e declarado quebrado na segunda semana.
      from: 'QT Pizza Bar <relatorio@qtpizzabar.com.br>',
      to: [...email.para],
      subject: email.assunto,
      html: email.html,
    }),
  })

  if (!resp.ok) {
    const detalhe = await resp.text().catch(() => '')
    throw new Error(`Resend devolveu ${resp.status}: ${detalhe.slice(0, 300)}`)
  }
}
