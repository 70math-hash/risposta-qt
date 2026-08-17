/**
 * O painel de leitura.
 *
 * Sete abas, sem router: o modo saiu da URL uma vez no arranque e a aba e estado, com
 * `history.pushState` so para o endereco continuar compartilhavel. Um painel de sete abas nao
 * justifica uma dependencia de roteamento.
 *
 * Somente leitura. Nenhuma tela do painel escreve no banco, e isso e proposital: escrita vive
 * no Worker, atras da chave de servico, e o painel usa a chave publica.
 */

import { useCallback, useEffect, useState } from 'react'
import { SimboloQt } from '../comum/SimboloQt.js'
import { rotuloDiaOperacional, diaOperacionalAnterior } from '../comum/dia-operacional.js'
import {
  baixaCsv,
  enviaR3,
  le,
  supabase,
  type ResultadoImportacao,
  type VwAlertaIncidente,
  type VwClienteMes,
  type VwColetaDia,
  type VwCustoPrato,
  type VwDiaSemana,
  type VwDispositivoSinal,
  type VwDuracaoSemana,
  type VwFatorContagem,
  type VwGarcomTrimestre,
  type VwHoje,
  type VwImportacao,
  type VwItemTrimestre,
  type VwNpsJanela,
  type VwPerguntaDesempenho,
  type VwPerguntaResposta,
  type VwSatisfacaoVendaDia,
  type VwSaudeRotina,
  type VwSemanaDetrator,
  type VwTelaPulo,
} from './dados.js'
import { Aviso, Barra, Cartao, Marca, Numero, Proporcao, Tabela } from './componentes.jsx'

const ABAS = [
  { id: '', nome: 'Hoje' },
  { id: 'tendencia', nome: 'Tendência' },
  { id: 'garcons', nome: 'Garçons' },
  { id: 'pratos', nome: 'Pratos' },
  { id: 'coleta', nome: 'Coleta' },
  { id: 'clientes', nome: 'Clientes' },
  { id: 'saude', nome: 'Saúde' },
] as const

type AbaId = (typeof ABAS)[number]['id']

function abaDaUrl(): AbaId {
  const resto = location.pathname.replace(/^\/painel\/?/, '')
  const achada = ABAS.find((a) => a.id === resto)
  return achada?.id ?? ''
}

export function Painel(): React.ReactElement {
  const [sessao, setSessao] = useState<'carregando' | 'fora' | 'dentro'>('carregando')
  const [aba, setAba] = useState<AbaId>(abaDaUrl())

  useEffect(() => {
    const sb = supabase()
    void sb.auth.getSession().then(({ data }) => {
      setSessao(data.session === null ? 'fora' : 'dentro')
    })
    const { data } = sb.auth.onAuthStateChange((_e, s) => {
      setSessao(s === null ? 'fora' : 'dentro')
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const trocaAba = useCallback((id: AbaId) => {
    setAba(id)
    history.pushState(null, '', id === '' ? '/painel' : `/painel/${id}`)
  }, [])

  useEffect(() => {
    const aoVoltar = () => setAba(abaDaUrl())
    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [])

  if (sessao === 'carregando') return <Centro>Carregando…</Centro>
  if (sessao === 'fora') return <Login />

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: 'var(--u3)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--u2)',
          paddingBottom: 'var(--u3)',
          borderBottom: '2px solid var(--preto)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <SimboloQt largura={52} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '0.24em' }}>
              QT PIZZA BAR
            </p>
            <p className="rotulo" style={{ margin: '3px 0 0' }}>
              Experiência do cliente
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn--secundario"
          onClick={() => void supabase().auth.signOut()}
        >
          Sair
        </button>
      </header>

      <nav
        style={{
          display: 'flex',
          gap: 0,
          flexWrap: 'wrap',
          margin: 'var(--u3) 0',
          borderBottom: '1px solid var(--linha)',
        }}
      >
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => trocaAba(a.id)}
            aria-current={aba === a.id ? 'page' : undefined}
            style={{
              minHeight: 'var(--alvo-min)',
              padding: '0 var(--u2)',
              fontSize: 14,
              fontWeight: 700,
              color: aba === a.id ? 'var(--preto)' : 'var(--tinta-2)',
              borderBottom: aba === a.id ? '3px solid var(--preto)' : '3px solid transparent',
              marginBottom: -1,
            }}
          >
            {a.nome}
          </button>
        ))}
      </nav>

      {aba === '' ? <AbaHoje /> : null}
      {aba === 'tendencia' ? <AbaTendencia /> : null}
      {aba === 'garcons' ? <AbaGarcons /> : null}
      {aba === 'pratos' ? <AbaPratos /> : null}
      {aba === 'coleta' ? <AbaColeta /> : null}
      {aba === 'clientes' ? <AbaClientes /> : null}
      {aba === 'saude' ? <AbaSaude /> : null}
    </div>
  )
}

function Centro({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="tela">
      <div className="tela__corpo">
        <p className="ajuda">{children}</p>
      </div>
    </div>
  )
}

function Login(): React.ReactElement {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const entra = async () => {
    setEnviando(true)
    setErro(null)
    const { error } = await supabase().auth.signInWithPassword({ email, password: senha })
    if (error !== null) setErro('E-mail ou senha não conferem.')
    setEnviando(false)
  }

  return (
    <div className="tela">
      <div className="tela__corpo" style={{ maxWidth: 420 }}>
        <SimboloQt largura={64} />
        <h1 className="pergunta" style={{ fontSize: 28 }}>
          Painel
        </h1>
        <input
          className="campo"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="E-mail"
        />
        <input
          className="campo"
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void entra()
          }}
          aria-label="Senha"
        />
        {erro === null ? null : <Aviso>{erro}</Aviso>}
        <button type="button" className="btn" disabled={enviando} onClick={() => void entra()}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}

/** Carrega uma view e cuida de carregando, erro e vazio num lugar so. */
function useView<T>(view: string): {
  dados: T[]
  erro: string | null
  carregando: boolean
} {
  const [dados, setDados] = useState<T[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    void le<T>(view)
      .then((d) => {
        if (vivo) {
          setDados(d)
          setErro(null)
        }
      })
      .catch((e: unknown) => {
        if (vivo) setErro(e instanceof Error ? e.message : 'erro desconhecido')
      })
      .finally(() => {
        if (vivo) setCarregando(false)
      })
    return () => {
      vivo = false
    }
  }, [view])

  return { dados, erro, carregando }
}

const GRADE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 'var(--u2)',
}

function Estado({
  carregando,
  erro,
}: {
  carregando: boolean
  erro: string | null
}): React.ReactElement | null {
  if (carregando) return <p className="ajuda">Carregando…</p>
  if (erro !== null)
    return (
      <Aviso>
        Não foi possível ler: {erro}. Isso normalmente significa que a migration ainda não foi
        aplicada, ou que a view mudou de nome.
      </Aviso>
    )
  return null
}

// ---------------------------------------------------------------------------
// Auxiliares de leitura de view.
//
// Toda coluna de view chega `| null`, porque `left join` e `case` bastam para produzir nulo e
// o Postgres nao promete o contrario. Estas tres funcoes concentram o tratamento, em vez de
// espalhar `?? 0` por cento e poucas linhas de JSX.
// ---------------------------------------------------------------------------

/**
 * Numero para conta. Nulo vira zero: somar nulo produz `NaN`, que aparece na tela.
 *
 * Aceita `undefined` porque `find` sobre uma view devolve `undefined` quando o dia nao existe
 * na serie, e `d?.respostas` produz o mesmo. Sao o mesmo caso de leitura: nao veio.
 */
function num(v: number | null | undefined): number {
  return v ?? 0
}

/** Numero para exibicao. Nulo vira travessao, e NUNCA zero: zero e um valor, ausencia nao. */
function mostra(v: number | null | undefined, casas = 0): string {
  return v === null || v === undefined ? '—' : v.toFixed(casas)
}

function reais(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pct(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `${v.toFixed(1)}%`
}

/** Data ISO curta, `08-17`. Rotulo de eixo, nao de leitura. */
function curta(d: string | null): string {
  return d === null ? '—' : d.slice(5)
}

/**
 * O aviso que a VIEW escreveu, e nao um aviso do painel.
 *
 * Dezoito das vinte e cinco views tem uma coluna `aviso` que o SQL preenche quando o numero
 * nao deve ser lido de frente: amostra abaixo de 20, semana incomparavel, casa fechada, R3 nao
 * importado. Mostrar essa coluna, em vez de reescrever a mesma regra em TypeScript, e o que
 * mantem uma regra em um lugar so. Quando a regra muda no SQL, a tela acompanha sem edicao.
 */
function AvisoDaView({ aviso }: { aviso: string | null | undefined }): React.ReactElement | null {
  if (aviso === null || aviso === undefined || aviso === '') return null
  return <Aviso>{aviso}</Aviso>
}

/**
 * O NPS com a faixa de confianca, direto de `vw_nps_janela`.
 *
 * A conta de erro padrao e de diferenca minima detectavel ja esta na view, identica a de
 * `src/comum/nps.ts` e coberta pelos mesmos testes. Recalcular aqui a partir das contagens
 * seria uma segunda implementacao da mesma formula, e a segunda implementacao e a que
 * divergiria em silencio.
 */
function NpsDaView({ r, legenda }: { r: VwNpsJanela | undefined; legenda: string }): React.ReactElement {
  if (r === undefined || num(r.n) === 0) {
    return <Numero valor="—" legenda={legenda} ressalva="nenhuma resposta coletada" />
  }
  if (r.amostra_suficiente !== true) {
    return (
      <Numero
        valor={mostra(r.nps, 1)}
        legenda={legenda}
        ressalva={`amostra insuficiente, n=${num(r.n)}. Não tire conclusão daqui.`}
      />
    )
  }
  return (
    <Numero
      valor={`${mostra(r.nps, 1)} ±${mostra(r.faixa_95, 1)}`}
      legenda={legenda}
      ressalva={`n=${num(r.n)} · só diferença acima de ${mostra(r.diferenca_minima_detectavel, 1)} pontos é real`}
    />
  )
}

/** Botao de exportacao de uma view, sempre com o `n` de cada linha embutido no CSV. */
function Exportar<T extends object>({
  nome,
  linhas,
}: {
  nome: string
  linhas: readonly T[]
}): React.ReactElement {
  return (
    <button
      type="button"
      className="btn btn--secundario"
      style={{ minHeight: 32, padding: '4px 12px', fontSize: 12 }}
      onClick={() => baixaCsv(nome, linhas)}
    >
      Exportar
    </button>
  )
}

/** A linha mais recente de uma serie diaria, pela data e nao pela ordem de chegada. */
function ultimoDia<T extends { dia_operacional: string | null }>(linhas: readonly T[]): T | undefined {
  return [...linhas]
    .filter((l) => l.dia_operacional !== null)
    .sort((a, b) => (a.dia_operacional! < b.dia_operacional! ? 1 : -1))[0]
}

/** Ordena uma serie por uma coluna de data crescente, para os graficos lerem da esquerda. */
function porData<T>(linhas: readonly T[], chave: keyof T): T[] {
  return [...linhas].sort((a, b) => String(a[chave] ?? '').localeCompare(String(b[chave] ?? '')))
}

// --------------------------------------------------------------------------- Hoje

function AbaHoje(): React.ReactElement {
  const dia = diaOperacionalAnterior()
  const { dados, erro, carregando } = useView<VwHoje>('vw_hoje')
  const { dados: janelas } = useView<VwNpsJanela>('vw_nps_janela')
  const { dados: fatores } = useView<VwFatorContagem>('vw_fator_contagem')

  const estado = <Estado carregando={carregando} erro={erro} />
  if (estado !== null) return estado

  const d = dados.find((x) => x.dia_operacional === dia) ?? ultimoDia(dados)
  const diaMostrado = d?.dia_operacional ?? dia

  // O NPS do dia sai da janela `dia` com a data igual. Sem a data, `find` pegaria a primeira
  // linha da view, que e um dia qualquer da serie.
  const npsDoDia = janelas.find((j) => j.janela === 'dia' && j.inicio === diaMostrado)
  const npsDoMes = janelas
    .filter((j) => j.janela === 'mes')
    .sort((a, b) => String(b.inicio).localeCompare(String(a.inicio)))[0]

  // Menções da janela `mes` mais recente, e apenas as de opcao marcada: somar opcao com
  // classificacao de texto contaria a mesma reclamacao duas vezes, uma vez pelo toque e outra
  // pela frase que a descreve.
  const mesFator = fatores
    .filter((f) => f.janela === 'mes' && f.origem === 'opcao')
    .sort((a, b) => String(b.inicio).localeCompare(String(a.inicio)))[0]?.inicio
  const doMes = fatores
    .filter((f) => f.janela === 'mes' && f.origem === 'opcao' && f.inicio === mesFator)
    .sort((a, b) => num(b.mencoes) - num(a.mencoes))
  const maiorFator = Math.max(1, ...doMes.map((f) => num(f.mencoes)))
  const total = num(d?.respostas)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <p className="rotulo">{rotuloDiaOperacional(diaMostrado)}</p>

      {d?.casa_abre === false ? (
        <Aviso>
          Casa fechada neste dia operacional. Zero resposta aqui é o esperado, e não falha de
          coleta.
        </Aviso>
      ) : null}

      <div style={GRADE}>
        <Cartao titulo="Respostas">
          <Numero valor={total} legenda="no dia operacional fechado" />
        </Cartao>
        <Cartao titulo="Distribuição">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Barra rotulo="Promotores 9–10" valor={num(d?.promotores)} maximo={Math.max(1, total)} />
            <Barra rotulo="Neutros 7–8" valor={num(d?.neutros)} maximo={Math.max(1, total)} />
            <Barra rotulo="Detratores 0–6" valor={num(d?.detratores)} maximo={Math.max(1, total)} />
          </div>
        </Cartao>
        <Cartao titulo="NPS do dia">
          <NpsDaView r={npsDoDia} legenda="do dia operacional" />
        </Cartao>
        <Cartao titulo="NPS do mês">
          <NpsDaView r={npsDoMes} legenda="acumulado do mês" />
        </Cartao>
      </div>

      <div style={GRADE}>
        <Cartao titulo="Conversão">
          <Proporcao
            parte={total}
            total={num(d?.mesas_atendidas)}
            legenda="respostas sobre mesas atendidas"
          />
        </Cartao>
        <Cartao titulo="Suspeitas">
          <Numero
            valor={num(d?.suspeitas)}
            legenda="respostas marcadas no dia"
            ressalva="marcação, nunca rejeição: mesas juntadas produzem respostas legítimas em sequência"
          />
        </Cartao>
      </div>

      <AvisoDaView aviso={d?.aviso} />

      <Cartao titulo="Menções por fator, no mês" acao={<Exportar nome="fatores" linhas={doMes} />}>
        {doMes.length === 0 ? (
          <p className="ajuda">Nenhuma menção no período.</p>
        ) : (
          <div>
            {doMes.slice(0, 12).map((f) => (
              <Barra
                key={`${f.dimensao ?? ''}-${f.fator ?? ''}`}
                rotulo={f.fator ?? f.dimensao ?? '—'}
                {...(f.dimensao === null ? {} : { detalhe: f.dimensao })}
                valor={num(f.mencoes)}
                maximo={maiorFator}
              />
            ))}
          </div>
        )}
      </Cartao>

      <Aviso>
        Contagem absoluta, nunca média geral: com até 20 mesas por dia, a média esconde
        exatamente quem vai reclamar em público.
      </Aviso>
    </div>
  )
}

// --------------------------------------------------------------------------- Tendência

function AbaTendencia(): React.ReactElement {
  const { dados, erro, carregando } = useView<VwSatisfacaoVendaDia>('vw_satisfacao_venda_dia')
  const { dados: semanas } = useView<VwSemanaDetrator>('vw_semana_detrator')
  const { dados: diasSemana } = useView<VwDiaSemana>('vw_dia_semana')
  const estado = <Estado carregando={carregando} erro={erro} />
  if (estado !== null) return estado

  const ultimos = porData(dados, 'dia_operacional').slice(-28)
  const maiorResp = Math.max(1, ...ultimos.map((d) => num(d.n)))
  const soma = ultimos.reduce(
    (acc, d) => ({ detratores: acc.detratores + num(d.detratores), n: acc.n + num(d.n) }),
    { detratores: 0, n: 0 },
  )
  const semanasOrd = porData(semanas, 'semana').slice(-12)
  const quedas = semanasOrd.filter((s) => s.alerta_queda === true)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <div style={GRADE}>
        <Cartao titulo="Últimos 28 dias operacionais">
          <Numero valor={soma.n} legenda="respostas no período" />
        </Cartao>
        <Cartao titulo="Detratores no período">
          <Numero
            valor={soma.detratores}
            legenda="notas de 0 a 6"
            ressalva="contagem, não percentual: percentual sobre amostra pequena engana"
          />
        </Cartao>
        <Cartao titulo="Semanas com queda">
          <Numero
            valor={quedas.length}
            legenda="nas últimas 12 semanas"
            ressalva="queda é o dobro de detratores da semana anterior, com os dias abertos comparáveis"
          />
        </Cartao>
      </div>

      <Cartao
        titulo="Respostas por dia operacional"
        acao={<Exportar nome="tendencia-dia" linhas={ultimos} />}
      >
        {ultimos.map((d) => (
          <Barra
            key={d.dia_operacional ?? ''}
            rotulo={curta(d.dia_operacional)}
            valor={num(d.n)}
            maximo={maiorResp}
            estimado={d.casa_abre === false}
            {...(num(d.detratores) > 0 ? { detalhe: `${num(d.detratores)} detrator(es)` } : {})}
          />
        ))}
      </Cartao>

      <Cartao
        titulo="Detratores por semana"
        acao={<Exportar nome="tendencia-semana" linhas={semanasOrd} />}
      >
        <Tabela
          colunas={['Semana', 'Detratores', 'Respostas (n)', 'Dias abertos', 'Semana anterior', 'Alerta']}
          linhas={semanasOrd.map((s) => [
            s.semana ?? '—',
            num(s.detratores),
            num(s.respostas),
            num(s.dias_abertos),
            s.semana_incomparavel === true
              ? `${num(s.detratores_semana_anterior)} · ${num(s.dias_abertos_semana_anterior)} dia(s), incomparável`
              : num(s.detratores_semana_anterior),
            <Marca
              key="m"
              estado={s.alerta_queda === true ? 'vazio' : 'cheio'}
              texto={s.alerta_queda === true ? 'queda' : 'estável'}
            />,
          ])}
          rodape="Semana com número diferente de dias abertos é marcada como incomparável em vez de comparada: feriado a menos derruba o total sem nada ter piorado."
        />
      </Cartao>

      <Cartao titulo="Satisfação e faturamento" acao={<Exportar nome="satisfacao-venda" linhas={ultimos} />}>
        <Tabela
          colunas={['Dia', 'Respostas (n)', 'Detratores', 'Faturamento', 'Mesas', 'Ticket por mesa']}
          linhas={ultimos.map((d) => [
            d.dia_operacional ?? '—',
            num(d.n),
            num(d.detratores),
            reais(d.faturamento),
            d.mesas_atendidas ?? 'não informado',
            reais(d.ticket_medio_por_mesa),
          ])}
          rodape="Junção por dia operacional, nunca por comanda. Faturamento vazio significa R3 não importado naquele dia."
        />
      </Cartao>

      <Cartao titulo="O mesmo dia da semana, contra a média das quatro ocorrências anteriores">
        <Tabela
          colunas={['Dia', 'Respostas (n)', 'Detratores', 'Média de 4', 'Comparações', 'Aviso']}
          linhas={porData(diasSemana, 'dia_operacional')
            .slice(-14)
            .map((d) => [
              d.dia_operacional ?? '—',
              num(d.n_dia),
              num(d.detratores),
              mostra(d.media_detratores_4, 1),
              num(d.ocorrencias_comparadas),
              d.aviso ?? '',
            ])}
          rodape="Terça se compara com terça, nunca com a média da semana: o padrão semanal de um restaurante é forte o suficiente para produzir alarme falso todo domingo."
        />
      </Cartao>
    </div>
  )
}

// --------------------------------------------------------------------------- Garçons

function AbaGarcons(): React.ReactElement {
  const { dados, erro, carregando } = useView<VwGarcomTrimestre>('vw_garcom_trimestre')
  const estado = <Estado carregando={carregando} erro={erro} />
  if (estado !== null) return estado

  const trimestres = [...new Set(dados.map((g) => g.trimestre).filter((t) => t !== null))].sort()
  const ultimo = trimestres[trimestres.length - 1]
  const doTrimestre = dados
    .filter((g) => g.trimestre === ultimo)
    .sort((a, b) => num(b.n) - num(a.n))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <Aviso>
        Janela trimestral e com o <strong>n</strong> ao lado, para conversa de desenvolvimento,
        nunca ranking mensal. Meta amarrada à nota contamina o dado e é proibida por texto
        oficial do Google quando envolve pedido de avaliação (decisão D8).
      </Aviso>

      <Cartao
        titulo={`Trimestre ${ultimo ?? '—'}`}
        acao={<Exportar nome="garcons" linhas={doTrimestre} />}
      >
        <Tabela
          colunas={['Garçom', 'Respostas (n)', 'NPS', 'Promotores', 'Detratores', 'Conversão', 'Recusas']}
          linhas={doTrimestre.map((g) => [
            g.ativo === false ? `${g.nome ?? '—'} · inativo` : (g.nome ?? '—'),
            g.aviso === null ? num(g.n) : `${num(g.n)} · insuficiente`,
            mostra(g.nps, 1),
            num(g.promotores),
            num(g.detratores),
            g.conversao_pct === null
              ? `— de ${num(g.tentativas)}`
              : `${pct(g.conversao_pct)} de ${num(g.tentativas)}`,
            num(g.recusas),
          ])}
          rodape="Conversão por garçom usa as tentativas registradas na T0, não a contagem diária de mesas: são dois denominadores diferentes. Sem 20 tentativas no trimestre, não existe taxa."
        />
      </Cartao>

      {trimestres.length > 1 ? (
        <Cartao titulo="Trimestres anteriores" acao={<Exportar nome="garcons-historico" linhas={dados} />}>
          <Tabela
            colunas={['Garçom', 'Trimestre', 'Respostas (n)', 'NPS', 'Conversão']}
            linhas={dados
              .filter((g) => g.trimestre !== ultimo)
              .sort((a, b) => String(b.trimestre).localeCompare(String(a.trimestre)))
              .map((g) => [
                g.nome ?? '—',
                g.trimestre ?? '—',
                num(g.n),
                mostra(g.nps, 1),
                pct(g.conversao_pct),
              ])}
            rodape="Garçom removido continua aqui com o histórico dele: remover preenche a data de saída e não reatribui resposta nenhuma."
          />
        </Cartao>
      ) : null}
    </div>
  )
}

// --------------------------------------------------------------------------- Pratos

function AbaPratos(): React.ReactElement {
  const { dados, erro, carregando } = useView<VwItemTrimestre>('vw_item_trimestre')
  const { dados: custos, erro: erroCusto } = useView<VwCustoPrato>('vw_custo_prato')
  const estado = <Estado carregando={carregando} erro={erro} />
  if (estado !== null) return estado

  const trimestres = [...new Set(dados.map((i) => i.trimestre).filter((t) => t !== null))].sort()
  const ultimo = trimestres[trimestres.length - 1]
  const itens = dados
    .filter((i) => i.trimestre === ultimo)
    .sort((a, b) => num(b.reclamacoes) - num(a.reclamacoes))

  const semCusto = custos.filter((c) => c.custo_ausente === true)
  const naoConferido = custos.filter((c) => c.premissa_conferida !== true)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <Cartao
        titulo={`Reclamações por item, trimestre ${ultimo ?? '—'}`}
        acao={<Exportar nome="itens" linhas={itens} />}
      >
        <Tabela
          colunas={['Item', 'Grupo', 'Reclamações', 'Unidades', 'Média do cardápio', 'Sinalizado']}
          linhas={itens.map((i) => [
            i.ativo === false ? `${i.nome_pt ?? '—'} · fora do cardápio` : (i.nome_pt ?? '—'),
            i.grupo ?? '—',
            num(i.reclamacoes),
            i.unidades_vendidas === null ? 'R3 não importado' : mostra(i.unidades_vendidas),
            mostra(i.media_reclamacoes_cardapio, 2),
            <Marca
              key="m"
              estado={i.sinalizado === true ? 'cheio' : 'vazio'}
              texto={i.sinalizado === true ? 'sinalizado' : i.aviso === null ? 'dentro da média' : 'sem base'}
            />,
          ])}
          rodape="Item só é sinalizado com no mínimo 3 reclamações e 30 unidades vendidas no trimestre. Abaixo disso é ruído, e a coluna diz `sem base` em vez de fingir um número."
        />
      </Cartao>

      <Cartao
        titulo="Satisfação cruzada com custo"
        acao={<Exportar nome="custo-prato" linhas={custos} />}
      >
        {erroCusto !== null ? (
          <Aviso>Custo indisponível: {erroCusto}</Aviso>
        ) : (
          <>
            <Tabela
              colunas={['Prato', 'Custo', 'Preço', 'CMV', 'Meta', 'Margem', 'Ficha']}
              linhas={custos.map((c) => [
                c.prato_nome ?? '—',
                reais(c.custo_total),
                reais(c.preco_venda),
                pct(c.cmv_pct),
                c.cmv_meta === null ? '—' : pct(c.cmv_meta),
                reais(c.margem_bruta),
                <Marca
                  key="m"
                  estado={c.custo_ausente === true ? 'vazio' : num(c.insumos_sem_preco) > 0 ? 'meio' : 'cheio'}
                  texto={
                    c.custo_ausente === true
                      ? (c.motivo_incompleto ?? 'ausente')
                      : num(c.insumos_sem_preco) > 0
                        ? `${num(c.insumos_sem_preco)} sem preço`
                        : 'completa'
                  }
                />,
              ])}
              rodape="Custo por resolução recursiva da lista de materiais: sub-receita desce um nível e entra pelo conteúdo dela, nunca como zero. Massa e molho são exatamente sub-receitas, e são a maior parte do custo de uma pizza."
            />
            <Aviso>
              O custo vem por <strong>leitura</strong> das tabelas do sistema fiscal, com resolução
              recursiva da lista de materiais, e nunca é copiado.
              {naoConferido.length > 0 ? (
                <>
                  {' '}
                  <strong>Número não conferido:</strong> a semântica de <code>rn</code>,{' '}
                  <code>rendimento</code> e <code>rn_override</code> é NÃO VERIFICADA, e a view usa
                  a premissa mais defensável até o proprietário confirmar.
                  {naoConferido[0]?.nota_premissa === null
                    ? ''
                    : ` ${naoConferido[0]?.nota_premissa ?? ''}`}
                </>
              ) : null}
              {semCusto.length > 0
                ? ` ${semCusto.length} prato(s) sem ficha técnica completa: aparecem como ausente, nunca como custo zero.`
                : ''}
            </Aviso>
          </>
        )}
      </Cartao>
    </div>
  )
}


/**
 * O botao de importar o R3 a mao.
 *
 * POR QUE ELE EXISTE, num painel que por regra nao escreve
 *   O caminho normal e o watcher do Drive, de meia em meia hora. Ele depende de tres coisas fora
 *   do nosso alcance: a pasta continuar sincronizada, o arquivo continuar sendo exportado, e o
 *   nome nao mudar. Quando uma das tres falha, o dia fica sem faturamento, o cruzamento de
 *   satisfacao com venda fica sem denominador, e nao existe outro jeito de consertar sem alguem
 *   com acesso ao servidor.
 *
 *   Este botao e o unico ponto do painel que causa escrita, e a escrita acontece no Worker, atras
 *   de conferencia de sessao. A tela nao insere linha nenhuma.
 *
 * O QUE ELE MOSTRA, E POR QUE
 *   Nunca so "importado". Mostra linhas lidas, linhas gravadas, os dias que o arquivo cobre e os
 *   produtos que nao casaram com o cardapio. Os quatro numeros existem porque os quatro podem
 *   estar errados de formas diferentes, e "importado" esconde todas: arquivo do dia errado, parser
 *   que leu metade, e produto sem `id_altec` cadastrado, que entra no faturamento e NAO entra no
 *   cruzamento de reclamacao por 100 unidades.
 */
function ImportaR3(): React.ReactElement {
  const [estado, setEstado] = useState<'parado' | 'enviando'>('parado')
  const [dia, setDia] = useState('')
  const [r, setR] = useState<ResultadoImportacao | null>(null)

  const envia = async (arquivo: File | undefined) => {
    if (arquivo === undefined) return
    setEstado('enviando')
    setR(null)
    try {
      setR(await enviaR3(arquivo, dia))
    } catch (e) {
      setR({ ok: false, erro: e instanceof Error ? e.message : 'erro desconhecido' })
    } finally {
      setEstado('parado')
    }
  }

  return (
    <Cartao titulo="Importar o R3 à mão">
      <p className="ajuda" style={{ margin: 0 }}>
        O caminho normal é a pasta do Drive, lida de meia em meia hora. Use isto quando um dia
        ficou sem faturamento: o arquivo é guardado inteiro antes de ser interpretado, e enviar o
        mesmo arquivo duas vezes não muda o faturamento do dia.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="rotulo">Dia operacional (opcional)</span>
        <input
          className="campo"
          type="date"
          value={dia}
          onChange={(e) => setDia(e.target.value)}
          aria-label="Dia operacional do arquivo"
          style={{ maxWidth: 220 }}
        />
        <span style={{ fontSize: 12, color: 'var(--tinta-3)' }}>
          Preencha quando o arquivo não tiver coluna de data — o R3 de um dia costuma trazer a data
          só no cabeçalho impresso. Se preencher, este dia vale para todas as linhas.
        </span>
      </div>

      <label
        className="btn btn--secundario"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        {estado === 'enviando' ? 'Enviando…' : 'Escolher arquivo'}
        <input
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          disabled={estado === 'enviando'}
          style={{ display: 'none' }}
          onChange={(e) => {
            void envia(e.target.files?.[0])
            // Limpa o campo para reenviar o MESMO arquivo ser possivel: sem isto, escolher o
            // mesmo nome de novo nao dispara `change` e o botao parece travado.
            e.target.value = ''
          }}
        />
      </label>

      {r === null ? null : r.ok !== true ? (
        <Aviso>Não importou: {r.erro ?? 'motivo não informado'}</Aviso>
      ) : r.duplicada === true ? (
        <Aviso>{r.mensagem ?? 'Este arquivo já havia sido importado.'}</Aviso>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u2)' }}>
          <Tabela
            colunas={['Arquivo', 'Dias', 'Linhas lidas', 'Linhas gravadas', 'Sem item', 'Estado']}
            linhas={[
              [
                r.arquivo ?? '—',
                (r.dias ?? []).join(', ') || '—',
                r.linhas_lidas ?? 0,
                r.linhas_gravadas ?? 0,
                r.sem_item_no_cardapio ?? 0,
                <Marca
                  key="m"
                  estado={r.status === 'sucesso' ? 'cheio' : 'vazio'}
                  texto={r.status ?? '—'}
                />,
              ],
            ]}
          />
          {r.status === 'erro' ? (
            <Aviso>
              <strong>Nenhuma venda foi gravada</strong>, e o arquivo bruto <strong>foi</strong>{' '}
              guardado. Isso é de propósito: dá para reprocessar depois de corrigir o leitor, sem
              precisar exportar o R3 de novo. Motivo: {(r.erros ?? []).join(' · ')}
            </Aviso>
          ) : null}
          {(r.nomes_sem_item ?? []).length > 0 ? (
            <Aviso>
              {r.sem_item_no_cardapio} produto(s) vendido(s) não existem no cadastro de cardápio.
              A venda deles <strong>entra</strong> no faturamento do dia, e <strong>não</strong>{' '}
              entra no cruzamento de reclamações por 100 unidades. Cadastrar o{' '}
              <code>id_altec</code> deles é o que liga esse cruzamento:{' '}
              {(r.nomes_sem_item ?? []).join(', ')}
            </Aviso>
          ) : null}
        </div>
      )}
    </Cartao>
  )
}

// --------------------------------------------------------------------------- Coleta

function AbaColeta(): React.ReactElement {
  const { dados, erro, carregando } = useView<VwColetaDia>('vw_coleta_dia')
  const { dados: pulos } = useView<VwTelaPulo>('vw_tela_pulo')
  const { dados: duracoes } = useView<VwDuracaoSemana>('vw_duracao_semana')
  const { dados: perguntas } = useView<VwPerguntaDesempenho>('vw_pergunta_desempenho')
  const { dados: respostasPergunta } = useView<VwPerguntaResposta>('vw_pergunta_resposta')
  const { dados: importacoes } = useView<VwImportacao>('vw_importacao')
  const estado = <Estado carregando={carregando} erro={erro} />
  if (estado !== null) return estado

  const ultimos = porData(dados, 'dia_operacional').slice(-14)
  const totalResp = ultimos.reduce((s, d) => s + num(d.respostas), 0)
  const totalSusp = ultimos.reduce((s, d) => s + num(d.suspeitas), 0)
  const totalPin = ultimos.reduce((s, d) => s + num(d.pin_nao_reconhecido), 0)

  const mesPulo = [...new Set(pulos.map((p) => p.mes).filter((m) => m !== null))].sort().pop()
  const doMes = pulos
    .filter((p) => p.mes === mesPulo)
    .sort((a, b) => num(b.pulo_pct) - num(a.pulo_pct))

  // O trimestre mais recente que a view de respostas devolve. Ela e trimestral, e nao por janela
  // como `vw_pergunta_desempenho`: com 2 rotacionadas por promotor, mes nenhum junta amostra que
  // sustente uma distribuicao.
  const trimestrePergunta = [
    ...new Set(respostasPergunta.map((p) => p.trimestre).filter((t) => t !== null)),
  ]
    .sort()
    .pop()

  const janelaPergunta = [...new Set(perguntas.map((p) => p.janela))].includes('trimestre')
    ? 'trimestre'
    : 'mes'
  const inicioPergunta = [
    ...new Set(
      perguntas.filter((p) => p.janela === janelaPergunta).map((p) => p.inicio).filter((i) => i !== null),
    ),
  ]
    .sort()
    .pop()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <ImportaR3 />

      <div style={GRADE}>
        <Cartao titulo="Suspeitas">
          <Proporcao parte={totalSusp} total={totalResp} legenda="respostas marcadas em 14 dias" />
          <span style={{ fontSize: 12, color: 'var(--tinta-3)' }}>
            Meta: abaixo de 3% e estável. Marcação, nunca rejeição.
          </span>
        </Cartao>
        <Cartao titulo="PIN não reconhecido">
          <Numero
            valor={totalPin}
            legenda="nos últimos 14 dias"
            ressalva="acima de 3 no dia vira cobrança no e-mail das 16h"
          />
        </Cartao>
        <Cartao titulo="Canal">
          <Numero
            valor={`${ultimos.reduce((s, d) => s + num(d.respostas_tablet), 0)} / ${ultimos.reduce((s, d) => s + num(d.respostas_qr), 0)}`}
            legenda="tablet / QR, em 14 dias"
            ressalva="o tablet é o que traz volume; o QR existe para quem prefere o próprio telefone"
          />
        </Cartao>
      </div>

      <Cartao titulo="Coleta por dia" acao={<Exportar nome="coleta-dia" linhas={ultimos} />}>
        <Tabela
          colunas={['Dia', 'Respostas', 'Mesas', 'Sobre mesas', 'Tentativas', 'Sobre tentativas', 'Suspeitas', 'PIN']}
          linhas={ultimos.map((d) => [
            d.casa_abre === false ? `${d.dia_operacional ?? '—'} · fechada` : (d.dia_operacional ?? '—'),
            num(d.respostas),
            d.mesas_atendidas ?? 'não informado',
            pct(d.conversao_casa_pct),
            num(d.tentativas),
            pct(d.conversao_tentativa_pct),
            d.suspeitas_pct === null ? num(d.suspeitas) : `${num(d.suspeitas)} · ${pct(d.suspeitas_pct)}`,
            <Marca
              key="m"
              estado={d.pin_acima_do_limiar === true ? 'vazio' : 'cheio'}
              texto={String(num(d.pin_nao_reconhecido))}
            />,
          ])}
          rodape="Sem mesas atendidas informadas não existe taxa. É a cobrança que aparece no digest depois de 3 dias. Duas taxas, porque são dois denominadores: mesas atendidas vem da casa, tentativas vem da T0."
        />
      </Cartao>

      {ultimos.some((d) => d.dispositivo_acima_do_teto === true) ? (
        <Aviso>
          Em algum dos últimos 14 dias, um único aparelho respondeu por uma fatia do total acima do
          esperado para quatro tablets em uso. Vale conferir se os outros estão ligados e com o
          endereço certo, antes de ler o total do dia como queda de coleta.
        </Aviso>
      ) : null}

      <Cartao titulo={`Pulo por tela, ${mesPulo ?? '—'}`} acao={<Exportar nome="tela-pulo" linhas={doMes} />}>
        <Tabela
          colunas={['Tela', 'Exibições', 'Pulos', 'Taxa', 'Reescrita']}
          linhas={doMes.map((p) => [
            p.tela ?? '—',
            num(p.exibicoes),
            num(p.pulos),
            pct(p.pulo_pct),
            <Marca
              key="m"
              estado={p.candidata_reescrita === true ? 'vazio' : 'cheio'}
              texto={p.candidata_reescrita === true ? 'candidata' : 'ok'}
            />,
          ])}
          rodape="Acima de 60% de pulo, a tela é candidata a reescrita. Taxa de pulo é o melhor sinal de tela mal escrita, e sai de graça."
        />
      </Cartao>

      <Cartao
        titulo="Importações do R3"
        acao={<Exportar nome="importacoes" linhas={importacoes} />}
      >
        <Tabela
          colunas={['Início', 'Origem', 'Arquivo', 'Dias cobertos', 'Linhas', 'Vigentes', 'Quem', 'Estado']}
          linhas={importacoes.slice(0, 20).map((i) => [
            (i.iniciado_em ?? '—').replace('T', ' ').slice(0, 16),
            i.origem ?? '—',
            i.arquivo ?? '—',
            i.primeiro_dia === null
              ? '—'
              : i.primeiro_dia === i.ultimo_dia
                ? i.primeiro_dia
                : `${i.primeiro_dia} a ${i.ultimo_dia}`,
            num(i.linhas),
            // Menor que `linhas` significa que outro arquivo reimportou algum daqueles dias
            // depois: o UNIQUE por (dia, produto) faz a linha passar a pertencer a execucao nova.
            num(i.linhas_vigentes),
            i.importado_por ?? 'automático',
            <Marca
              key="m"
              estado={i.status === 'sucesso' ? (num(i.linhas_sem_item) > 0 ? 'meio' : 'cheio') : 'vazio'}
              texto={i.status ?? '—'}
            />,
          ])}
          rodape="`Vigentes` menor que `Linhas` significa que um arquivo posterior reimportou algum daqueles dias: a linha passa a pertencer à importação mais nova. O arquivo bruto de cada uma fica guardado, e é dele que se reprocessa quando o leitor do R3 precisa ser corrigido."
        />
        {importacoes.some((i) => i.aviso !== null) ? (
          <AvisoDaView aviso={importacoes.find((i) => i.aviso !== null)?.aviso} />
        ) : null}
      </Cartao>

      <Cartao titulo="Duração do caminho, por semana" acao={<Exportar nome="duracao" linhas={duracoes} />}>
        <Tabela
          colunas={['Semana', 'Caminho', 'n', 'Descartadas', 'Mediana', 'p90']}
          linhas={porData(duracoes, 'semana')
            .slice(-16)
            .map((d) => [
              d.semana ?? '—',
              d.tipo_caminho ?? '—',
              num(d.n),
              num(d.descartadas),
              `${mostra(d.mediana_s)}s`,
              <span key="p" style={{ fontWeight: d.p90_acima_do_teto === true ? 700 : 400 }}>
                {mostra(d.p90_s)}s
              </span>,
            ])}
          rodape="Mediana e p90, nunca média: uma pesquisa esquecida aberta na mesa por vinte minutos move a média e não move a mediana. As esquecidas entram na coluna de descartadas."
        />
      </Cartao>

      <Cartao
        titulo="O que responderam nas perguntas rotacionadas"
        acao={<Exportar nome="pergunta-resposta" linhas={respostasPergunta} />}
      >
        <Tabela
          colunas={['Nº', 'Pergunta', 'Resposta', 'Contagem', '% de quem respondeu', 'Pulo']}
          linhas={respostasPergunta
            .filter((p) => p.trimestre === trimestrePergunta)
            .map((p) => [
              num(p.numero),
              p.texto_pt ?? '—',
              // Rotulo nulo e indice que nao existe mais na lista de opcoes, o que acontece quando
              // a pergunta e reescrita com menos opcoes. Aparece como o indice cru, e nao
              // desaparece: a contagem antiga continua sendo verdade sobre o texto antigo.
              p.rotulo ?? (p.opcao_indice === null ? '—' : `opção ${num(p.opcao_indice)}`),
              num(p.respostas),
              p.aviso === null ? pct(p.respostas_pct) : (p.aviso ?? ''),
              pct(p.pulo_pct),
            ])}
          rodape="O índice da opção é gravado, e não o rótulo: rótulo muda com reescrita e com idioma, índice não. Esta tela é onde os dois se encontram. Sem ela, a resposta da rotacionada era gravada e nunca lida por ninguém."
        />
      </Cartao>

      <Cartao titulo="Perguntas do banco" acao={<Exportar nome="perguntas" linhas={perguntas} />}>
        <Tabela
          colunas={['Nº', 'Pergunta', 'Dimensão', 'Foco', 'Sorteadas', 'Respondidas', 'Taxa']}
          linhas={perguntas
            .filter((p) => p.janela === janelaPergunta && p.inicio === inicioPergunta)
            .sort((a, b) => num(a.numero) - num(b.numero))
            .map((p) => [
              num(p.numero),
              p.texto_pt ?? '—',
              p.dimensao ?? '—',
              <Marca
                key="m"
                estado={p.em_foco === true ? 'cheio' : 'vazio'}
                texto={p.em_foco === true ? `desde ${p.em_foco_desde ?? '—'}` : 'fora de foco'}
              />,
              num(p.sorteadas),
              num(p.respondidas),
              p.aviso === null ? pct(p.respondidas_pct) : (p.aviso ?? ''),
            ])}
          rodape="Pergunta em foco recebe metade das exibições, por peso, e não por regra fixa. Taxa de resposta baixa em pergunta sorteada é sinal de pergunta mal escrita, não de cliente apressado."
        />
      </Cartao>
    </div>
  )
}

// --------------------------------------------------------------------------- Clientes

function AbaClientes(): React.ReactElement {
  const { dados, erro, carregando } = useView<VwClienteMes>('vw_cliente_mes')
  const estado = <Estado carregando={carregando} erro={erro} />
  if (estado !== null) return estado

  const meses = porData(dados, 'mes').slice(-18)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <Aviso>
        A coleta é anônima por desenho. Estes são apenas os clientes que escolheram deixar
        contato, com consentimento de finalidade própria. Dado pessoal é apagado 12 meses depois
        da última visita, por rotina automática, e a resposta da pesquisa fica sem dono.
      </Aviso>
      <Cartao titulo="Contato por mês" acao={<Exportar nome="clientes-mes" linhas={meses} />}>
        <Tabela
          colunas={['Mês', 'Contatos deixados', 'Respostas (n)', 'Taxa de contato', 'Anonimizados']}
          linhas={meses.map((c) => [
            c.mes ?? '—',
            num(c.contatos_deixados),
            num(c.respostas),
            c.aviso === null ? pct(c.taxa_contato_pct) : (c.aviso ?? ''),
            num(c.anonimizados_no_mes),
          ])}
          rodape="A taxa de contato é a variável que decide se previsão de recompra é possível algum dia. A coluna de anonimizados é a prova de que a retenção rodou."
        />
      </Cartao>
    </div>
  )
}

// --------------------------------------------------------------------------- Saúde

function AbaSaude(): React.ReactElement {
  const { dados, erro, carregando } = useView<VwDispositivoSinal>('vw_dispositivo_sinal')
  const { dados: rotinas } = useView<VwSaudeRotina>('vw_saude_rotina')
  const { dados: incidentes } = useView<VwAlertaIncidente>('vw_alerta_incidente')
  const estado = <Estado carregando={carregando} erro={erro} />
  if (estado !== null) return estado

  const recentes = [...incidentes]
    .sort((a, b) => String(b.respondido_em).localeCompare(String(a.respondido_em)))
    .slice(0, 25)
  const semContato = recentes.filter((i) => i.houve_contato !== true).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <Aviso>
        <strong>A única regra de operação deste sistema:</strong> se o e-mail das 16h não chegar
        dois dias seguidos, algo quebrou. Não existe monitoramento além disso, de propósito.
      </Aviso>

      <Cartao titulo="Aparelhos" acao={<Exportar nome="dispositivos" linhas={dados} />}>
        <Tabela
          colunas={['Apelido', 'Uso', 'Último sinal', 'Fila', 'Respostas hoje', 'Versão', 'Estado']}
          linhas={dados.map((d) => [
            d.apelido ?? '—',
            d.uso ?? '—',
            d.horas_sem_sinal === null ? 'nunca' : `há ${Math.floor(num(d.horas_sem_sinal))}h`,
            num(d.fila_pendente),
            num(d.respostas_dia_corrente),
            d.versao_app ?? '—',
            <Marca
              key="m"
              estado={d.mudo === true ? 'vazio' : d.fila_alta === true ? 'meio' : 'cheio'}
              texto={d.mudo === true ? 'mudo' : d.fila_alta === true ? 'fila alta' : 'ok'}
            />,
          ])}
          rodape="Com quatro tablets em uso, um aparelho mudo é invisível no total do dia: os outros três seguem coletando. É por isso que cada um aparece pelo apelido."
        />
      </Cartao>

      <Cartao titulo="Rotinas" acao={<Exportar nome="rotinas" linhas={rotinas} />}>
        <Tabela
          colunas={['Rotina', 'Passo', 'Início', 'Duração', 'Status', 'Erro']}
          linhas={rotinas.slice(0, 40).map((r) => [
            r.rotina ?? '—',
            r.passo ?? '—',
            (r.iniciado_em ?? '—').replace('T', ' ').slice(0, 16),
            r.duracao_s === null ? '—' : `${mostra(r.duracao_s, 1)}s`,
            <Marca
              key="m"
              estado={r.status === 'sucesso' ? 'cheio' : 'vazio'}
              texto={r.status ?? '—'}
            />,
            r.erro ?? '',
          ])}
          rodape="Este log vive no próprio banco porque o log do fornecedor expira em 1 dia no plano gratuito. A consulta e o envio do e-mail são passos separados: falha de e-mail não pode desligar o keep-alive do banco."
        />
      </Cartao>

      <Cartao titulo="Alertas de detrator" acao={<Exportar nome="incidentes" linhas={recentes} />}>
        <Tabela
          colunas={['Dia', 'Mesa', 'Nota', 'Fator', 'Envio', 'Contato', 'Erro']}
          linhas={recentes.map((i) => [
            i.dia_operacional ?? '—',
            i.mesa_digitada ?? '—',
            num(i.nota),
            i.fator ?? '—',
            i.enviado_em === null ? (
              <Marca key="e" estado="vazio" texto="não enviado" />
            ) : (
              <Marca
                key="e"
                estado={i.dentro_dos_30_s === true ? 'cheio' : 'meio'}
                texto={`${mostra(i.segundos_ate_envio)}s`}
              />
            ),
            i.houve_contato === true
              ? `${mostra(i.minutos_ate_contato)} min`
              : <Marca key="c" estado="vazio" texto="sem registro" />,
            i.erro ?? '',
          ])}
          rodape="O alerta é gravado na mesma transação da resposta, e não por rotina: com duas chamadas, uma resposta poderia existir sem o aviso dela. Alerta sem destinatário configurado é gravado com o erro e reaparece no digest do dia seguinte."
        />
        {semContato > 0 ? (
          <Aviso>
            {semContato} dos últimos {recentes.length} alertas não têm contato registrado. O
            registro é manual e o campo existir vazio não prova que ninguém falou com a mesa — prova
            que ninguém anotou.
          </Aviso>
        ) : null}
      </Cartao>
    </div>
  )
}
