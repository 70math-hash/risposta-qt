/**
 * A aba de exportacao.
 *
 * POR QUE ELA EXISTE, E POR QUE E UMA ABA E NAO UM BOTAO ESCONDIDO
 *   O briefing pede portabilidade: quem tem o dado nao fica preso a ferramenta nenhuma, INCLUSIVE a
 *   esta. E a garantia de que trocar de sistema um dia nao custa a serie historica — e a razao de
 *   ter saido do fornecedor anterior foi, em parte, exatamente essa.
 *
 *   As seis views de exportacao existiam desde a primeira migration e NENHUMA tela as lia. A
 *   promessa estava no documento, o SQL estava escrito, e nao havia como um humano baixar nada.
 *
 * O QUE CADA ARQUIVO E
 *   Sao seis recortes, e nao um despejo do banco. Cada um responde a uma pergunta inteira, com as
 *   juncoes ja resolvidas: quem le o CSV nao precisa saber que `garcom_id` existe.
 *
 * O `n` VAI JUNTO, SEMPRE
 *   Toda linha agregada exportada carrega a contagem que a sustenta (folha canonica, secao 6.3).
 *   Percentual sem `n` numa planilha vira grafico numa reuniao, e ninguem lembra que eram tres
 *   respostas.
 *
 * TRUNCAMENTO NAO ACONTECE EM SILENCIO
 *   `le()` pagina ate o fim e compara o total lido com a contagem do servidor. Se divergir, ele
 *   levanta erro e ESTA TELA MOSTRA O ERRO em vez de baixar o pedaco. Exportacao truncada em
 *   silencio e pior que exportacao que falha: a primeira vira decisao errada, a segunda vira
 *   tentativa de novo.
 */

import { useState } from 'react'
import { baixaCsv, le } from './dados.js'
import { Aviso, Cartao, Marca, Tabela } from './componentes.jsx'

interface Recorte {
  view: string
  nome: string
  titulo: string
  descricao: string
}

const RECORTES: readonly Recorte[] = [
  {
    view: 'vw_exportacao_resposta',
    nome: 'respostas',
    titulo: 'Respostas',
    descricao:
      'Uma linha por resposta, com nota, faixa, canal, idioma, garçom, mesa, aparelho e as marcas de tempo. É o arquivo que reconstrói a série histórica inteira.',
  },
  {
    view: 'vw_exportacao_opcao',
    nome: 'opcoes',
    titulo: 'Opções marcadas',
    descricao:
      'Uma linha por opção tocada, com a dimensão e o fator ao lado da nota. É daqui que sai qualquer recontagem de menções por fator.',
  },
  {
    view: 'vw_exportacao_item',
    nome: 'itens',
    titulo: 'Itens apontados',
    descricao:
      'Uma linha por item de cardápio apontado por detrator, já com o nome do item e o id do PDV resolvidos.',
  },
  {
    view: 'vw_exportacao_comentario',
    nome: 'comentarios',
    titulo: 'Comentários',
    descricao:
      'O texto cru como a pessoa escreveu, com a classificação por frase ao lado quando existe. O texto nunca é reescrito nem corrigido.',
  },
  {
    view: 'vw_exportacao_venda',
    nome: 'vendas',
    titulo: 'Vendas por produto e dia',
    descricao:
      'O que veio do R3, com o item de cardápio casado quando casou. É o denominador do cruzamento de reclamações por 100 unidades.',
  },
  {
    view: 'vw_exportacao_cliente',
    nome: 'clientes',
    titulo: 'Clientes e consentimentos',
    descricao:
      'Só quem deixou contato, com a contagem de consentimentos e a data de anonimização quando já ocorreu. Linha anonimizada vem sem dado pessoal, e é assim que se prova que a retenção rodou.',
  },
]

export function Exportar(): React.ReactElement {
  const [estado, setEstado] = useState<Record<string, 'parado' | 'baixando' | 'erro' | 'pronto'>>({})
  const [erros, setErros] = useState<Record<string, string>>({})
  const [linhas, setLinhas] = useState<Record<string, number>>({})

  const baixa = async (r: Recorte) => {
    setEstado((e) => ({ ...e, [r.view]: 'baixando' }))
    setErros((e) => ({ ...e, [r.view]: '' }))
    try {
      const dados = await le<Record<string, unknown>>(r.view)
      if (dados.length === 0) {
        setEstado((e) => ({ ...e, [r.view]: 'erro' }))
        setErros((e) => ({ ...e, [r.view]: 'não há linha nenhuma neste recorte ainda' }))
        return
      }
      baixaCsv(`qt-${r.nome}`, dados)
      setLinhas((l) => ({ ...l, [r.view]: dados.length }))
      setEstado((e) => ({ ...e, [r.view]: 'pronto' }))
    } catch (e) {
      setEstado((s) => ({ ...s, [r.view]: 'erro' }))
      setErros((s) => ({
        ...s,
        [r.view]: e instanceof Error ? e.message : 'erro desconhecido',
      }))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <Aviso>
        <strong>O dado é seu, inclusive para sair daqui.</strong> Cada arquivo abaixo é um recorte
        completo, com as junções já resolvidas: quem abrir o CSV não precisa conhecer o banco. O
        separador é ponto e vírgula e o arquivo abre no Excel brasileiro com acento correto.
      </Aviso>

      <Cartao titulo="Os seis recortes">
        <Tabela
          colunas={['Arquivo', 'O que é', 'Linhas', 'Baixar']}
          linhas={RECORTES.map((r) => [
            r.titulo,
            r.descricao,
            linhas[r.view] === undefined ? '—' : linhas[r.view],
            <button
              key="b"
              type="button"
              className="btn btn--secundario"
              style={{ minHeight: 32, padding: '4px 12px', fontSize: 12 }}
              disabled={estado[r.view] === 'baixando'}
              onClick={() => void baixa(r)}
            >
              {estado[r.view] === 'baixando' ? 'Lendo…' : 'CSV'}
            </button>,
          ])}
          rodape="A leitura pagina até o fim e confere o total contra a contagem do servidor. Se divergir, o arquivo NÃO é gerado e o motivo aparece aqui embaixo: exportação truncada em silêncio vira decisão errada, e exportação que falha vira tentativa de novo."
        />
      </Cartao>

      {RECORTES.filter((r) => (erros[r.view] ?? '') !== '').map((r) => (
        <Aviso key={r.view}>
          <strong>{r.titulo}:</strong> {erros[r.view]}
        </Aviso>
      ))}

      {RECORTES.some((r) => estado[r.view] === 'pronto') ? (
        <Cartao titulo="Baixados nesta sessão">
          <Tabela
            colunas={['Arquivo', 'Linhas', 'Estado']}
            linhas={RECORTES.filter((r) => estado[r.view] === 'pronto').map((r) => [
              `qt-${r.nome}.csv`,
              linhas[r.view] ?? 0,
              <Marca key="m" estado="cheio" texto="completo" />,
            ])}
            rodape="`Completo` aqui significa que o total lido bateu com a contagem do servidor, e não apenas que o arquivo foi gerado."
          />
        </Cartao>
      ) : null}

      <Aviso>
        Para a série histórica inteira, o que importa é o arquivo de <strong>respostas</strong>: os
        outros cinco se ligam a ele por <code>resposta_id</code>. Guardar os seis juntos preserva
        tudo o que este sistema sabe, num formato que qualquer planilha abre e nenhum fornecedor
        controla.
      </Aviso>
    </div>
  )
}
