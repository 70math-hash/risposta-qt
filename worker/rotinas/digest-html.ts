/**
 * O HTML do digest, na identidade da QT.
 *
 * Cliente de e-mail nao e navegador: nada de CSS externo, nada de flexbox confiavel, nada de
 * variavel CSS. Tudo inline, tabela quando precisa alinhar. A paleta e a do manual, e a
 * tipografia cai para Helvetica e Arial, que e o que existe em cliente de e-mail.
 *
 * Texto secundario usa o cinza escurecido, e nao o A0A5A5 do manual, porque N37 registra que
 * ele da 2,1:1 sobre fundo claro e por isso nunca carrega texto.
 */

export interface BlocoDigest {
  titulo: string
  linhas: readonly string[]
  /** Quais papeis veem este bloco. */
  areas: readonly string[]
  /** Linhas especificas por area, quando o conteudo muda conforme quem le. */
  linhasPorArea?: Partial<Record<string, readonly string[]>>
}

const PRETO = '#1A1E1E'
const PAPEL = '#EFECEC'
const TINTA2 = '#5F6565'
const LINHA = '#C8C5C5'

function escapa(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function montaHtml(args: {
  titulo: string
  blocos: readonly BlocoDigest[]
  papel: string
  dia: string
}): string {
  const { titulo, blocos, papel } = args

  const secoes = blocos
    .map((b) => {
      const linhas = b.linhasPorArea?.[papel] ?? b.linhas
      if (linhas.length === 0) return ''
      const itens = linhas
        .map(
          (l) =>
            `<p style="margin:0 0 6px;font-size:15px;line-height:1.5;color:${PRETO}">${escapa(l)}</p>`,
        )
        .join('')
      return `
      <tr><td style="padding:20px 0;border-top:1px solid ${LINHA}">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.11em;text-transform:uppercase;color:${TINTA2}">${escapa(b.titulo)}</p>
        ${itens}
      </td></tr>`
    })
    .join('')

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${escapa(titulo)}</title></head>
<body style="margin:0;padding:0;background:${PAPEL};font-family:Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPEL}">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
        <tr><td style="padding-bottom:8px">
          <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${PRETO}">QT PIZZA BAR</p>
          <p style="margin:4px 0 0;font-size:11px;font-weight:700;letter-spacing:0.11em;text-transform:uppercase;color:${TINTA2}">Resumo do dia · ${escapa(papel)}</p>
        </td></tr>
        ${secoes}
        <tr><td style="padding:20px 0 0;border-top:1px solid ${LINHA}">
          <p style="margin:0;font-size:12px;line-height:1.5;color:${TINTA2}">
            Este e-mail chega todo dia às 16h e cobre a noite anterior fechada.
            <strong style="color:${PRETO}">Se ele não chegar dois dias seguidos, algo quebrou.</strong>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}
