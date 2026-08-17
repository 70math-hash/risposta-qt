/**
 * As pecas visuais do painel.
 *
 * Monocromatico por determinacao do manual de marca, que proibe cor vibrante. Isso obriga a
 * codificar dado por TOM e FORMA em vez de matiz, o que por acaso e mais acessivel: quem nao
 * distingue cor le a mesma coisa que todo mundo.
 *
 * Regras de leitura que estas pecas garantem por construcao:
 *   Toda proporcao carrega o `n` ao lado. Abaixo de n=20 escreve `amostra insuficiente`.
 *   Nenhuma seta de tendencia aparece sem a faixa de confianca ter sido consultada.
 *   Numero em coluna usa `tabular-nums`, senao a coluna dança e a leitura fica mais lenta.
 */

import type { ReactNode } from 'react'
import { N_MINIMO_PROPORCAO, type ResultadoNps } from '../comum/nps.js'

export function Cartao({
  titulo,
  children,
  acao,
}: {
  titulo: string
  children: ReactNode
  acao?: ReactNode
}): React.ReactElement {
  return (
    <section
      style={{
        border: '1px solid var(--linha)',
        background: 'var(--papel)',
        padding: 'var(--u3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--u2)',
        minWidth: 0,
      }}
    >
      <header
        style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}
      >
        <span className="rotulo">{titulo}</span>
        {acao}
      </header>
      {children}
    </section>
  )
}

/** Numero grande com legenda. Para contagem, nunca para media geral. */
export function Numero({
  valor,
  legenda,
  ressalva,
}: {
  valor: string | number
  legenda: string
  ressalva?: string
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        className="num"
        style={{
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-0.03em',
        }}
      >
        {valor}
      </span>
      <span style={{ fontSize: 13, color: 'var(--tinta-2)' }}>{legenda}</span>
      {ressalva === undefined ? null : (
        <span style={{ fontSize: 12, color: 'var(--tinta-3)' }}>{ressalva}</span>
      )}
    </div>
  )
}

/**
 * Barra horizontal de serie unica.
 *
 * Tom cheio para dado medido, tom medio para dado estimado ou de terceiro. Rotulo direto no
 * fim da barra, nunca legenda separada: com uma serie so, legenda e ruido.
 */
export function Barra({
  rotulo,
  valor,
  maximo,
  sufixo = '',
  estimado = false,
  detalhe,
}: {
  rotulo: string
  valor: number
  maximo: number
  sufixo?: string
  estimado?: boolean
  detalhe?: string
}): React.ReactElement {
  const largura = maximo <= 0 ? 0 : Math.max((valor / maximo) * 100, valor > 0 ? 1.5 : 0)
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(110px, 1.3fr) minmax(70px, 3fr) 64px',
        gap: 12,
        alignItems: 'center',
        padding: '5px 0',
      }}
    >
      <span style={{ fontSize: 13.5, lineHeight: 1.3 }}>
        {rotulo}
        {detalhe === undefined ? null : (
          <small style={{ display: 'block', fontSize: 11.5, color: 'var(--tinta-3)' }}>
            {detalhe}
          </small>
        )}
      </span>
      <div
        style={{ height: 14, background: 'var(--papel-3)', position: 'relative' }}
        title={`${valor}${sufixo}`}
      >
        <div
          style={{
            height: '100%',
            width: `${largura}%`,
            background: estimado ? 'var(--tinta-3)' : 'var(--preto)',
            borderRadius: '0 4px 4px 0',
          }}
        />
      </div>
      <span className="num" style={{ fontSize: 14, fontWeight: 700, textAlign: 'right' }}>
        {valor}
        {sufixo}
      </span>
    </div>
  )
}

/**
 * O NPS com a faixa de confianca sempre visivel.
 *
 * E a peca que separa este painel do relatorio do fornecedor anterior: la a seta sobe sem
 * dizer se a diferenca cabe no ruido. Com 50 respostas no mes, dois periodos so diferem de
 * verdade se a diferenca passar de cerca de 29 pontos.
 */
export function BlocoNps({ r, legenda }: { r: ResultadoNps; legenda: string }): React.ReactElement {
  if (r.n === 0) {
    return <Numero valor="—" legenda={legenda} ressalva="nenhuma resposta coletada" />
  }
  if (!r.amostraSuficiente) {
    return (
      <Numero
        valor={r.nps}
        legenda={legenda}
        ressalva={`amostra insuficiente, n=${r.n}. Não tire conclusão daqui.`}
      />
    )
  }
  return (
    <Numero
      valor={`${r.nps} ±${r.faixa95}`}
      legenda={legenda}
      ressalva={`n=${r.n} · só diferença acima de ${r.diferencaMinimaDetectavel} pontos é real`}
    />
  )
}

/** Proporcao com o `n` obrigatorio, ou o aviso. Centralizado para nenhuma tela esquecer. */
export function Proporcao({
  parte,
  total,
  legenda,
}: {
  parte: number
  total: number
  legenda: string
}): React.ReactElement {
  if (total === 0) return <Numero valor="—" legenda={legenda} ressalva="sem denominador" />
  if (total < N_MINIMO_PROPORCAO) {
    return (
      <Numero
        valor={`${parte}/${total}`}
        legenda={legenda}
        ressalva={`amostra insuficiente, n=${total}`}
      />
    )
  }
  return (
    <Numero
      valor={`${Math.round((parte / total) * 100)}%`}
      legenda={legenda}
      ressalva={`${parte} de ${total}`}
    />
  )
}

/** Tabela com rolagem propria: conteudo largo nunca faz a pagina rolar de lado. */
export function Tabela({
  colunas,
  linhas,
  rodape,
}: {
  colunas: readonly string[]
  linhas: readonly (readonly ReactNode[])[]
  rodape?: string
}): React.ReactElement {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--linha)' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
        <thead>
          <tr>
            {colunas.map((c) => (
              <th
                key={c}
                style={{
                  textAlign: 'left',
                  padding: '9px 12px',
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--tinta-2)',
                  background: 'var(--papel-2)',
                  borderBottom: '1px solid var(--cinza)',
                  whiteSpace: 'nowrap',
                }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 ? (
            <tr>
              <td
                colSpan={colunas.length}
                style={{ padding: '14px 12px', color: 'var(--tinta-2)', fontSize: 13.5 }}
              >
                Sem dado no período.
              </td>
            </tr>
          ) : (
            linhas.map((l, i) => (
              <tr key={i}>
                {l.map((c, j) => (
                  <td
                    key={j}
                    className={j > 0 ? 'num' : undefined}
                    style={{
                      padding: '9px 12px',
                      borderBottom: '1px solid var(--linha)',
                      verticalAlign: 'top',
                    }}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {rodape === undefined ? null : (
        <p style={{ margin: 0, padding: '9px 12px', fontSize: 12.5, color: 'var(--tinta-2)' }}>
          {rodape}
        </p>
      )}
    </div>
  )
}

/** Marcador de estado por forma, nunca por cor: quadrado cheio, meio ou vazio. */
export function Marca({
  estado,
  texto,
}: {
  estado: 'cheio' | 'meio' | 'vazio'
  texto: string
}): React.ReactElement {
  const fundo =
    estado === 'cheio'
      ? 'var(--preto)'
      : estado === 'meio'
        ? 'linear-gradient(135deg, var(--preto) 0 50%, transparent 50% 100%)'
        : 'none'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 11.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          flex: '0 0 10px',
          border: `1.5px solid ${estado === 'vazio' ? 'var(--cinza)' : 'var(--preto)'}`,
          background: fundo,
        }}
      />
      {texto}
    </span>
  )
}

export function Aviso({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <p
      style={{
        margin: 0,
        padding: 'var(--u2)',
        border: '1px solid var(--cinza)',
        fontSize: 13.5,
        lineHeight: 1.5,
        color: 'var(--tinta-2)',
      }}
    >
      {children}
    </p>
  )
}
