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
import { calculaNps } from '../comum/nps.js'
import { rotuloDiaOperacional, diaOperacionalAnterior } from '../comum/dia-operacional.js'
import {
  baixaCsv,
  le,
  supabase,
  type VwClienteMes,
  type VwColetaDia,
  type VwCustoPrato,
  type VwDispositivoSinal,
  type VwFatorContagem,
  type VwGarcomTrimestre,
  type VwHoje,
  type VwItemTrimestre,
  type VwSaudeRotina,
  type VwSatisfacaoVendaDia,
  type VwTelaPulo,
} from './dados.js'
import { Aviso, Barra, BlocoNps, Cartao, Marca, Numero, Proporcao, Tabela } from './componentes.jsx'

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

// --------------------------------------------------------------------------- Hoje

function AbaHoje(): React.ReactElement {
  const dia = diaOperacionalAnterior()
  const { dados, erro, carregando } = useView<VwHoje>('vw_hoje')
  const { dados: fatores } = useView<VwFatorContagem>('vw_fator_contagem')

  const estado = <Estado carregando={carregando} erro={erro} />
  if (estado !== null) return estado

  const d = dados.find((x) => x.dia_operacional === dia) ?? dados[0]
  const nps = calculaNps({
    detratores: d?.detratores ?? 0,
    neutros: d?.neutros ?? 0,
    promotores: d?.promotores ?? 0,
  })
  const maiorFator = Math.max(1, ...fatores.map((f) => f.mencoes))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <p className="rotulo">{rotuloDiaOperacional(d?.dia_operacional ?? dia)}</p>

      <div style={GRADE}>
        <Cartao titulo="Respostas">
          <Numero valor={nps.n} legenda="no dia operacional fechado" />
        </Cartao>
        <Cartao titulo="Distribuição">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Barra rotulo="Promotores 9–10" valor={nps.n === 0 ? 0 : (d?.promotores ?? 0)} maximo={Math.max(1, nps.n)} />
            <Barra rotulo="Neutros 7–8" valor={d?.neutros ?? 0} maximo={Math.max(1, nps.n)} />
            <Barra rotulo="Detratores 0–6" valor={d?.detratores ?? 0} maximo={Math.max(1, nps.n)} />
          </div>
        </Cartao>
        <Cartao titulo="NPS">
          <BlocoNps r={nps} legenda="do dia" />
        </Cartao>
        <Cartao titulo="Conversão">
          <Proporcao
            parte={nps.n}
            total={d?.mesas_atendidas ?? 0}
            legenda="respostas sobre mesas atendidas"
          />
        </Cartao>
      </div>

      <Cartao
        titulo="Menções por fator"
        acao={
          <button
            type="button"
            className="btn btn--secundario"
            style={{ minHeight: 32, padding: '4px 12px', fontSize: 12 }}
            onClick={() => baixaCsv('fatores', fatores)}
          >
            Exportar
          </button>
        }
      >
        {fatores.length === 0 ? (
          <p className="ajuda">Nenhuma menção no período.</p>
        ) : (
          <div>
            {fatores.slice(0, 12).map((f) => (
              <Barra
                key={`${f.dimensao}-${f.fator ?? ''}`}
                rotulo={f.fator ?? f.dimensao}
                detalhe={f.dimensao}
                valor={f.mencoes}
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
  const estado = <Estado carregando={carregando} erro={erro} />
  if (estado !== null) return estado

  const ultimos = dados.slice(-28)
  const maiorResp = Math.max(1, ...ultimos.map((d) => d.respostas))
  const total = ultimos.reduce(
    (acc, d) => ({
      detratores: acc.detratores + d.detratores,
      respostas: acc.respostas + d.respostas,
    }),
    { detratores: 0, respostas: 0 },
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <div style={GRADE}>
        <Cartao titulo="Últimos 28 dias operacionais">
          <Numero valor={total.respostas} legenda="respostas no período" />
        </Cartao>
        <Cartao titulo="Detratores no período">
          <Numero
            valor={total.detratores}
            legenda="notas de 0 a 6"
            ressalva="contagem, não percentual: percentual sobre amostra pequena engana"
          />
        </Cartao>
      </div>

      <Cartao
        titulo="Respostas por dia operacional"
        acao={
          <button
            type="button"
            className="btn btn--secundario"
            style={{ minHeight: 32, padding: '4px 12px', fontSize: 12 }}
            onClick={() => baixaCsv('tendencia', ultimos)}
          >
            Exportar
          </button>
        }
      >
        {ultimos.map((d) => (
          <Barra
            key={d.dia_operacional}
            rotulo={d.dia_operacional.slice(5)}
            valor={d.respostas}
            maximo={maiorResp}
            {...(d.detratores > 0 ? { detalhe: `${d.detratores} detrator(es)` } : {})}
          />
        ))}
      </Cartao>

      <Cartao titulo="Satisfação e faturamento">
        <Tabela
          colunas={['Dia', 'Respostas', 'Detratores', 'Faturamento']}
          linhas={ultimos.map((d) => [
            d.dia_operacional,
            d.respostas,
            d.detratores,
            d.faturamento === null
              ? '—'
              : `R$ ${d.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          ])}
          rodape="Junção por dia operacional, nunca por comanda. Faturamento vazio significa R3 não importado naquele dia."
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <Aviso>
        Janela trimestral e com o <strong>n</strong> ao lado, para conversa de desenvolvimento,
        nunca ranking mensal. Meta amarrada à nota contamina o dado e é proibida por texto
        oficial do Google quando envolve pedido de avaliação (decisão D8).
      </Aviso>

      <Tabela
        colunas={['Garçom', 'Trimestre', 'Respostas (n)', 'Promotores', 'Detratores', 'Conversão']}
        linhas={dados.map((g) => {
          const nps = calculaNps({
            detratores: g.detratores,
            neutros: g.respostas - g.promotores - g.detratores,
            promotores: g.promotores,
          })
          return [
            g.garcom,
            g.trimestre,
            nps.amostraSuficiente ? g.respostas : `${g.respostas} · insuficiente`,
            g.promotores,
            g.detratores,
            g.tentativas === 0
              ? '—'
              : `${Math.round((g.respostas / g.tentativas) * 100)}% de ${g.tentativas}`,
          ]
        })}
        rodape="Conversão por garçom usa as tentativas registradas na T0, não a contagem diária de mesas: são dois denominadores diferentes."
      />
    </div>
  )
}

// --------------------------------------------------------------------------- Pratos

function AbaPratos(): React.ReactElement {
  const { dados, erro, carregando } = useView<VwItemTrimestre>('vw_item_trimestre')
  const { dados: custos, erro: erroCusto } = useView<VwCustoPrato>('vw_custo_prato')
  const estado = <Estado carregando={carregando} erro={erro} />
  if (estado !== null) return estado

  const semFicha = custos.filter((c) => !c.ficha_completa).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <Cartao titulo="Reclamações por item, no trimestre">
        <Tabela
          colunas={['Item', 'Reclamações', 'Unidades', 'Por 100 vendidas', 'Média do cardápio']}
          linhas={dados.map((i) => [
            i.item,
            i.reclamacoes,
            i.unidades_vendidas ?? '—',
            i.reclamacoes_por_100 === null ? '—' : i.reclamacoes_por_100.toFixed(1),
            i.media_do_cardapio === null ? '—' : i.media_do_cardapio.toFixed(1),
          ])}
          rodape="Item só é sinalizado com no mínimo 3 reclamações e 30 unidades vendidas no trimestre. Abaixo disso é ruído."
        />
      </Cartao>

      <Cartao titulo="Satisfação cruzada com custo">
        {erroCusto !== null ? (
          <Aviso>Custo indisponível: {erroCusto}</Aviso>
        ) : (
          <>
            <Tabela
              colunas={['Prato', 'Custo', 'Preço', 'Margem', 'Ficha']}
              linhas={custos.map((c) => [
                c.prato,
                c.custo === null ? '—' : `R$ ${c.custo.toFixed(2)}`,
                c.preco_venda === null ? '—' : `R$ ${c.preco_venda.toFixed(2)}`,
                c.margem === null ? '—' : `R$ ${c.margem.toFixed(2)}`,
                <Marca
                  key="m"
                  estado={c.ficha_completa ? 'cheio' : 'vazio'}
                  texto={c.ficha_completa ? 'completa' : 'ausente'}
                />,
              ])}
            />
            <Aviso>
              O custo vem por leitura das tabelas do sistema fiscal, com resolução recursiva da
              lista de materiais, e nunca é copiado. <strong>Número não conferido:</strong> a
              semântica de <code>rn</code>, <code>rendimento</code> e <code>rn_override</code> é
              NÃO VERIFICADA, e a view usa a premissa mais defensável até o proprietário
              confirmar.
              {semFicha > 0
                ? ` ${semFicha} prato(s) sem ficha técnica: aparecem como ausente, nunca como custo zero.`
                : ''}
            </Aviso>
          </>
        )}
      </Cartao>
    </div>
  )
}

// --------------------------------------------------------------------------- Coleta

function AbaColeta(): React.ReactElement {
  const { dados, erro, carregando } = useView<VwColetaDia>('vw_coleta_dia')
  const { dados: pulos } = useView<VwTelaPulo>('vw_tela_pulo')
  const estado = <Estado carregando={carregando} erro={erro} />
  if (estado !== null) return estado

  const ultimos = dados.slice(-14)
  const totalResp = ultimos.reduce((s, d) => s + d.respostas, 0)
  const totalSusp = ultimos.reduce((s, d) => s + d.suspeitas, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <div style={GRADE}>
        <Cartao titulo="Suspeitas">
          <Proporcao parte={totalSusp} total={totalResp} legenda="respostas marcadas" />
          <span style={{ fontSize: 12, color: 'var(--tinta-3)' }}>
            Meta: abaixo de 3% e estável. Marcação, nunca rejeição.
          </span>
        </Cartao>
        <Cartao titulo="PIN não reconhecido">
          <Numero
            valor={ultimos.reduce((s, d) => s + d.pin_nao_reconhecido, 0)}
            legenda="nos últimos 14 dias"
            ressalva="acima de 3 no dia vira cobrança no e-mail das 16h"
          />
        </Cartao>
      </div>

      <Cartao titulo="Respostas sobre mesas atendidas">
        <Tabela
          colunas={['Dia', 'Respostas', 'Mesas', 'Conversão', 'Suspeitas']}
          linhas={ultimos.map((d) => [
            d.dia_operacional,
            d.respostas,
            d.mesas_atendidas ?? 'não informado',
            d.mesas_atendidas === null || d.mesas_atendidas === 0
              ? '—'
              : `${Math.round((d.respostas / d.mesas_atendidas) * 100)}%`,
            d.suspeitas,
          ])}
          rodape="Sem mesas atendidas informadas não existe taxa. É a cobrança que aparece no digest depois de 3 dias."
        />
      </Cartao>

      <Cartao titulo="Pulo por tela, no mês">
        <Tabela
          colunas={['Tela', 'Mês', 'Exibições', 'Pulos', 'Taxa']}
          linhas={pulos.map((p) => [
            p.tela,
            p.mes,
            p.exibicoes,
            p.pulos,
            p.exibicoes === 0 ? '—' : `${Math.round((p.pulos / p.exibicoes) * 100)}%`,
          ])}
          rodape="Acima de 60% de pulo, a tela é candidata a reescrita. Taxa de pulo é o melhor sinal de tela mal escrita, e sai de graça."
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <Aviso>
        A coleta é anônima por desenho. Estes são apenas os clientes que escolheram deixar
        contato, com consentimento de finalidade própria. Dado pessoal é apagado 12 meses depois
        da última visita, por rotina automática.
      </Aviso>
      <Tabela
        colunas={['Mês', 'Contatos deixados', 'Respostas', 'Taxa de contato']}
        linhas={dados.map((c) => [
          c.mes,
          c.contatos,
          c.respostas,
          c.respostas === 0 ? '—' : `${Math.round((c.contatos / c.respostas) * 100)}%`,
        ])}
        rodape="A taxa de contato é a variável que decide se previsão de recompra é possível algum dia."
      />
    </div>
  )
}

// --------------------------------------------------------------------------- Saúde

function AbaSaude(): React.ReactElement {
  const { dados, erro, carregando } = useView<VwDispositivoSinal>('vw_dispositivo_sinal')
  const { dados: rotinas } = useView<VwSaudeRotina>('vw_saude_rotina')
  const estado = <Estado carregando={carregando} erro={erro} />
  if (estado !== null) return estado

  const agora = Date.now()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <Aviso>
        <strong>A única regra de operação deste sistema:</strong> se o e-mail das 16h não chegar
        dois dias seguidos, algo quebrou. Não existe monitoramento além disso, de propósito.
      </Aviso>

      <Cartao titulo="Aparelhos">
        <Tabela
          colunas={['Apelido', 'Uso', 'Último sinal', 'Fila', 'Estado']}
          linhas={dados.map((d) => {
            const horas =
              d.ultimo_sinal_em === null
                ? null
                : Math.floor((agora - Date.parse(d.ultimo_sinal_em)) / 3_600_000)
            const mudo = horas === null || horas > 24
            const filaAlta = (d.fila_pendente ?? 0) > 5
            return [
              d.apelido,
              d.uso,
              horas === null ? 'nunca' : `há ${horas}h`,
              d.fila_pendente ?? 0,
              <Marca
                key="m"
                estado={mudo ? 'vazio' : filaAlta ? 'meio' : 'cheio'}
                texto={mudo ? 'mudo' : filaAlta ? 'fila alta' : 'ok'}
              />,
            ]
          })}
          rodape="Com quatro tablets em uso, um aparelho mudo é invisível no total do dia: os outros três seguem coletando. É por isso que cada um aparece pelo apelido."
        />
      </Cartao>

      <Cartao titulo="Rotinas">
        <Tabela
          colunas={['Rotina', 'Início', 'Status', 'Erro']}
          linhas={rotinas.slice(0, 40).map((r) => [
            r.rotina,
            r.iniciado_em.replace('T', ' ').slice(0, 16),
            <Marca
              key="m"
              estado={r.status === 'sucesso' ? 'cheio' : 'vazio'}
              texto={r.status}
            />,
            r.erro ?? '',
          ])}
          rodape="Este log vive no próprio banco porque o log do fornecedor expira em 1 dia no plano gratuito."
        />
      </Cartao>
    </div>
  )
}
