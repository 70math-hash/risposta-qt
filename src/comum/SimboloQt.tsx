/**
 * O simbolo da QT, desenhado em SVG.
 *
 * Do manual de marca: o Q e um circulo que representa uma pizza com fatia cortada, e o T sao
 * linhas retas que representam metade de uma taca de drink. Juntos formam um simbolo unico
 * que reforca "Pizza Bar". Geometria pura, inspirada em Bauhaus: circulo mais linha reta.
 *
 * Usa `currentColor` para herdar a tinta do contexto, o que atende a regra do manual de
 * funcionar em preto sobre fundo claro e em branco sobre fundo escuro sem dois arquivos.
 */

export function SimboloQt({ largura = 56 }: { largura?: number }): React.ReactElement {
  return (
    <svg
      className="simbolo"
      width={largura}
      viewBox="0 0 74 40"
      role="img"
      aria-label="QT Pizza Bar"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
    >
      {/* Q: circulo com uma fatia removida. O vao fica no quadrante superior direito. */}
      <circle cx="20" cy="20" r="14" strokeDasharray="76.9 11" />
      {/* Os dois raios que fecham a fatia cortada */}
      <path d="M20 20 H34 M20 20 L29.9 10.1" />
      {/* T: metade de uma taca */}
      <path d="M46 8 H68 M57 8 V32" />
    </svg>
  )
}
