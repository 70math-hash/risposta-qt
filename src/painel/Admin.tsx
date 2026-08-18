/**
 * A aba de administracao: os cinco deveres humanos que sao escrita.
 *
 * POR QUE ELA EXISTE
 *   O sistema tem seis deveres humanos recorrentes, e cinco deles sao escrita. Sem tela para eles,
 *   o sistema le e nao opera:
 *
 *     diario     informar as mesas atendidas. E o DENOMINADOR da conversao da casa, e sem ele o
 *                critério de sucesso nº 2 nao tem como ser medido.
 *     eventual   cadastrar e desligar garcom, mesa, item de cardapio, destinatario de e-mail.
 *     mensal     rotacionar a pergunta em foco.
 *     eventual   registrar que alguem falou com o cliente detrator.
 *     legal      atender pedido de exclusao de titular.
 *
 * A TELA NAO ESCREVE NO BANCO
 *   Toda escrita passa pelo Worker, atras de conferencia de sessao. O painel entra como
 *   `authenticated`, que tem SELECT e nada mais: a chave publica vai no bundle publicado, e um
 *   bundle com permissao de escrita e uma permissao de escrita publicada.
 *
 * OS CAMPOS NAO SAO ESCRITOS AQUI
 *   Eles vem de `GET /api/admin`, que le a lista branca do Worker. Duas listas divergiriam, e a
 *   divergencia apareceria como campo que a tela mostra e o servidor recusa — depois de a pessoa ter
 *   preenchido tudo.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  atendeExclusao,
  desligaAdmin,
  le,
  leCatalogoAdmin,
  salvaAdmin,
  type EntidadeAdmin,
  type VwExclusaoPedido,
} from './dados.js'
import { Aviso, Cartao, Marca, Numero, Tabela } from './componentes.jsx'

/** Rotulo legivel e ordem de exibicao. O primeiro e o dever diario, que e o que mais se usa. */
const ORDEM: readonly { chave: string; titulo: string; ajuda: string }[] = [
  {
    chave: 'mesa_atendida_dia',
    titulo: 'Mesas atendidas (dever diário)',
    ajuda:
      'Informe no fechamento. É o denominador da conversão da casa: sem ele, o painel mostra respostas e não mostra taxa. Informar o mesmo dia duas vezes corrige, não duplica.',
  },
  {
    chave: 'garcom',
    titulo: 'Garçons',
    ajuda:
      'O PIN é dado da resposta, nunca senha: ele diz a quem a resposta é atribuída, e não dá acesso a nada. Desligar preenche a data de saída e preserva o histórico — nada é reatribuído.',
  },
  { chave: 'mesa', titulo: 'Mesas', ajuda: 'Número e área. A área é `salao` ou `varanda`.' },
  {
    chave: 'item_cardapio',
    titulo: 'Cardápio',
    ajuda:
      'Preencher `produto_id_pdv` (o id do Altec) é o que liga o cruzamento de reclamações por 100 unidades vendidas. Sem ele, a venda entra no faturamento e não entra no cruzamento.',
  },
  {
    chave: 'destinatario',
    titulo: 'Quem recebe o e-mail das 16h',
    ajuda:
      'O papel decide quais blocos a pessoa vê: `proprietario`, `gerencia`, `cozinha` ou `salao`. A cozinha não recebe o que é do salão, e vice-versa.',
  },
  {
    chave: 'pergunta_banco',
    titulo: 'Pergunta em foco (dever mensal)',
    ajuda:
      'Só as colunas de rotação. Texto, dimensão e opções não se editam por aqui: mudar o texto faz a contagem de um mês deixar de ser comparável com a do outro, e isso passa por migration com número novo.',
  },
  {
    chave: 'calendario_operacao',
    titulo: 'Exceção de calendário',
    ajuda:
      'Feriado em que a casa abriu numa segunda, ou fechamento numa terça. É o que impede o e-mail de acusar falha de coleta num dia fechado.',
  },
  {
    chave: 'consentimento_texto',
    titulo: 'Texto de consentimento',
    ajuda:
      'Somente inserção, por permissão do banco. Texto novo é VERSÃO nova: editar o antigo faria os aceites já gravados citarem algo que mudou depois.',
  },
  {
    chave: 'configuracao',
    titulo: 'Configuração',
    ajuda: 'Chave e valor. É aqui que vive o e-mail do gerente para o alerta de detrator.',
  },
]

export function Admin(): React.ReactElement {
  const [catalogo, setCatalogo] = useState<Record<string, EntidadeAdmin> | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    void leCatalogoAdmin()
      .then((c) => {
        if (vivo) setCatalogo(c)
      })
      .catch((e: unknown) => {
        if (vivo) setErro(e instanceof Error ? e.message : 'erro desconhecido')
      })
    return () => {
      vivo = false
    }
  }, [])

  if (erro !== null) {
    return (
      <Aviso>
        Não foi possível falar com a API de escrita: {erro}. Sem ela, esta aba não funciona — e a
        leitura do painel continua funcionando, porque são caminhos diferentes.
      </Aviso>
    )
  }
  if (catalogo === null) return <p className="ajuda">Carregando…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <Aviso>
        Esta é a única aba que escreve, e a escrita passa pela API com sessão conferida, nunca pelo
        navegador direto. Nada aqui edita resposta de cliente: resposta nasce completa e não se
        edita, e corrigir uma resposta é coletar outra.
      </Aviso>

      <PedidosDeExclusao />

      {ORDEM.filter((o) => catalogo[o.chave] !== undefined).map((o) => (
        <Formulario
          key={o.chave}
          entidade={o.chave}
          titulo={o.titulo}
          ajuda={o.ajuda}
          def={catalogo[o.chave]!}
        />
      ))}
    </div>
  )
}

/**
 * Um formulario por entidade, montado a partir da lista branca do servidor.
 *
 * Genérico de proposito: nove formularios escritos a mao divergiriam da lista branca um por um, e a
 * divergencia so apareceria no momento de salvar.
 */
function Formulario({
  entidade,
  titulo,
  ajuda,
  def,
}: {
  entidade: string
  titulo: string
  ajuda: string
  def: EntidadeAdmin
}): React.ReactElement {
  const [valores, setValores] = useState<Record<string, string>>({})
  const [id, setId] = useState('')
  const [estado, setEstado] = useState<'parado' | 'salvando'>('parado')
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  const muda = useCallback((coluna: string, valor: string) => {
    setValores((v) => ({ ...v, [coluna]: valor }))
  }, [])

  const salva = async () => {
    setEstado('salvando')
    setMsg(null)
    // Campo vazio nao vai: mandar `''` sobrescreveria com vazio o que ja esta gravado, e num
    // formulario de atualizacao parcial isso apaga dado sem ninguem pedir.
    const campos: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(valores)) {
      if (v.trim() === '') continue
      campos[k] = v === 'true' ? true : v === 'false' ? false : v
    }
    const r = await salvaAdmin(entidade, campos, id.trim() === '' ? undefined : id.trim())
    setMsg(
      r.ok === true
        ? { ok: true, texto: 'Salvo.' }
        : { ok: false, texto: r.erro ?? 'não salvou, e o servidor não disse por quê' },
    )
    if (r.ok === true) {
      setValores({})
      setId('')
    }
    setEstado('parado')
  }

  const desliga = async () => {
    if (id.trim() === '') {
      setMsg({ ok: false, texto: 'Informe o id do registro a desligar.' })
      return
    }
    setEstado('salvando')
    const r = await desligaAdmin(entidade, id.trim())
    setMsg(
      r.ok === true
        ? { ok: true, texto: 'Desligado. O histórico continua.' }
        : { ok: false, texto: r.erro ?? 'não desligou' },
    )
    if (r.ok === true) setId('')
    setEstado('parado')
  }

  return (
    <Cartao titulo={titulo}>
      <p className="ajuda" style={{ margin: 0 }}>
        {ajuda}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--u2)',
        }}
      >
        {def.colunas.map((coluna) => (
          <label key={coluna} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="rotulo">
              {coluna}
              {def.obrigatorias.includes(coluna) ? ' *' : ''}
            </span>
            <input
              className="campo"
              value={valores[coluna] ?? ''}
              onChange={(e) => muda(coluna, e.target.value)}
              placeholder={dica(coluna)}
              aria-label={coluna}
            />
          </label>
        ))}

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="rotulo">id (só para alterar ou desligar)</span>
          <input
            className="campo"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="deixe vazio para criar"
            aria-label={`id de ${entidade}`}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 'var(--u2)', flexWrap: 'wrap' }}>
        <button type="button" className="btn" disabled={estado === 'salvando'} onClick={() => void salva()}>
          {estado === 'salvando' ? 'Salvando…' : id.trim() === '' ? 'Criar' : 'Alterar'}
        </button>
        {def.desligar === 'nenhuma' ? null : (
          <button
            type="button"
            className="btn btn--secundario"
            disabled={estado === 'salvando'}
            onClick={() => void desliga()}
          >
            {def.desligar === 'removido_em' ? 'Desligar (preserva histórico)' : 'Desativar'}
          </button>
        )}
      </div>

      {msg === null ? null : msg.ok ? (
        <p style={{ margin: 0, fontSize: 13.5 }}>{msg.texto}</p>
      ) : (
        <Aviso>{msg.texto}</Aviso>
      )}
    </Cartao>
  )
}

/** Dica de formato para as colunas cujo formato erra fácil. */
function dica(coluna: string): string {
  switch (coluna) {
    case 'dia_operacional':
    case 'em_foco_desde':
      return 'AAAA-MM-DD'
    case 'vigente_de':
      return 'AAAA-MM-DDTHH:MM:SS-03:00'
    case 'area':
      return 'salao ou varanda'
    case 'grupo':
      return 'pizza, entrada ou sobremesa'
    case 'papel':
      return 'proprietario, gerencia, cozinha ou salao'
    case 'ativo':
    case 'ativa':
    case 'em_foco':
    case 'abre':
      return 'true ou false'
    case 'produto_id_pdv':
      return 'o id do Altec, ex. ALT-100'
    case 'produto_nome_norm':
      return 'MAIÚSCULAS SEM ACENTO'
    default:
      return ''
  }
}

/**
 * Os pedidos de exclusao de titular.
 *
 * Fica no topo da aba, e nao no meio dos cadastros, porque e o unico dever com PRAZO: os 7 dias sao
 * internos, e prazo interno curto e o que evita o prazo da LGPD ser estourado.
 */
function PedidosDeExclusao(): React.ReactElement {
  const [pedidos, setPedidos] = useState<VwExclusaoPedido[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    let vivo = true
    void le<VwExclusaoPedido>('vw_exclusao_pedido')
      .then((d) => {
        if (vivo) setPedidos(d)
      })
      .catch(() => {
        // A aba nao pode morrer por causa desta lista: os cadastros abaixo continuam servindo.
      })
    return () => {
      vivo = false
    }
  }, [recarga])

  const atende = async (id: string) => {
    const r = await atendeExclusao(id)
    setMsg(
      r.ok === true
        ? r.ja_atendido === true
          ? 'Este pedido já havia sido atendido. Nada mudou.'
          : `Atendido. ${r.resultado ?? ''}`
        : (r.erro ?? 'não atendeu'),
    )
    setRecarga((n) => n + 1)
  }

  const abertos = pedidos.filter((p) => p.aberto === true)

  return (
    <Cartao titulo="Pedidos de exclusão de dados (obrigação legal)">
      {abertos.length === 0 ? (
        <Numero valor={0} legenda="pedidos em aberto" ressalva="nada a fazer aqui hoje" />
      ) : (
        <Tabela
          colunas={['Contato informado', 'Pedido em', 'Dias', 'Prazo', 'Ação']}
          linhas={abertos.map((p) => [
            p.contato_informado ?? '—',
            (p.pedido_em ?? '—').replace('T', ' ').slice(0, 16),
            p.dias_em_aberto ?? '—',
            <Marca
              key="m"
              estado={p.atrasado === true ? 'vazio' : 'cheio'}
              texto={p.atrasado === true ? 'atrasado' : 'no prazo'}
            />,
            <button
              key="b"
              type="button"
              className="btn btn--secundario"
              style={{ minHeight: 32, padding: '4px 12px', fontSize: 12 }}
              onClick={() => void atende(p.id ?? '')}
            >
              Atender
            </button>,
          ])}
          rodape="Atender anonimiza o cliente e carimba o pedido na mesma transação. A resposta da pesquisa fica, sem dono: o histórico de satisfação é da casa, o dado pessoal é da pessoa."
        />
      )}
      {msg === null ? null : <Aviso>{msg}</Aviso>}

      {pedidos.some((p) => p.aberto !== true) ? (
        <Tabela
          colunas={['Contato', 'Atendido em', 'Resultado']}
          linhas={pedidos
            .filter((p) => p.aberto !== true)
            .slice(0, 10)
            .map((p) => [
              p.contato_informado ?? '—',
              (p.atendido_em ?? '—').replace('T', ' ').slice(0, 16),
              p.resultado ?? '—',
            ])}
          rodape="O histórico dos atendidos fica: é a prova de que o pedido foi cumprido, e é o que se mostra numa fiscalização."
        />
      ) : null}
    </Cartao>
  )
}
