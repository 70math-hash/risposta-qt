/**
 * A importacao de um arquivo R3, usada pelos DOIS caminhos: o watcher do Drive e o botao de
 * envio manual do painel.
 *
 * POR QUE E UM MODULO SO
 *   Sao dois gatilhos e uma unica regra de importacao. Duas implementacoes divergiriam, e a
 *   divergencia seria justamente no caminho manual, que e o que se usa quando algo deu errado no
 *   automatico: quem sobe a planilha a mao esta consertando um dia faltante, e nao ha momento
 *   pior para a segunda implementacao ter um bug diferente.
 *
 *   O que muda entre os dois e apenas `origem` (`watcher_drive` ou `painel`) e `importado_por`,
 *   que so existe no manual. O resto — resolucao de item, guarda do bruto, idempotencia,
 *   tratamento de linha sem quantidade — e identico por construcao.
 */

import type { Ambiente } from '../lib/supabase.js'
import { insere, seleciona } from '../lib/supabase.js'
import { interpretaR3 } from './r3.js'

/** O resultado de importar UM arquivo. */
export interface ResultadoImportacao {
  execucao_id: string
  arquivo: string
  hash: string
  status: 'sucesso' | 'erro'
  /** Linhas que o parser leu do arquivo. */
  linhas_lidas: number
  /** Linhas efetivamente gravadas em `venda_produto_dia`. Zero quando houve erro. */
  linhas_gravadas: number
  /** Dias operacionais que o arquivo cobre. */
  dias: string[]
  /**
   * Produtos vendidos que nao existem em `item_cardapio`.
   *
   * A venda ENTRA no faturamento mesmo assim. O que ela nao entra e no cruzamento de reclamacao
   * por 100 unidades vendidas, que e o diferencial do projeto, e por isso este numero e devolvido
   * em vez de ficar num log: ele e a cobranca de cadastro de cardapio.
   */
  sem_item_no_cardapio: number
  /** Nomes que nao casaram, para a tela e o e-mail dizerem QUAIS sao. */
  nomes_sem_item: string[]
  erros: string[]
}

/**
 * Bytes para o formato que o PostgREST aceita numa coluna `bytea`: `\x` mais hexadecimal.
 *
 * `arquivo_bruto` e `bytea`, e mandar a string ja decodificada por UTF-8 nao entra como os bytes
 * que chegaram: um R3 salvo em Windows-1252 perderia exatamente os acentos que se quer
 * reprocessar depois de consertar o parser (ADR-12).
 */
export function paraBytea(bytes: ArrayBuffer): string {
  let hex = ''
  for (const b of new Uint8Array(bytes)) hex += b.toString(16).padStart(2, '0')
  return `\\x${hex}`
}

export async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** O cardapio ativo, nas duas chaves de juncao. Lido uma vez e reusado por todas as linhas. */
export interface Cardapio {
  porId: Map<string, string>
  porNome: Map<string, string>
}

export async function leCardapio(env: Ambiente): Promise<Cardapio> {
  const itens = await seleciona<{
    id: string
    produto_id_pdv: string | null
    produto_nome_norm: string | null
  }>(env, 'item_cardapio', 'select=id,produto_id_pdv,produto_nome_norm&removido_em=is.null')

  const porId = new Map<string, string>()
  const porNome = new Map<string, string>()
  for (const item of itens) {
    if (item.produto_id_pdv !== null && item.produto_id_pdv !== '') {
      porId.set(item.produto_id_pdv, item.id)
    }
    if (item.produto_nome_norm !== null && item.produto_nome_norm !== '') {
      porNome.set(item.produto_nome_norm, item.id)
    }
  }
  return { porId, porNome }
}

/**
 * Importa um arquivo R3.
 *
 * A ORDEM importa e nao e negociavel: o bruto e gravado ANTES de a venda ser gravada, e antes de
 * qualquer decisao sobre o conteudo. Se o layout do R3 mudar e o parser quebrar, o dado nao se
 * perde: reprocessa do bruto, sem repetir a coleta (ADR-12).
 */
export async function importaR3(
  env: Ambiente,
  entrada: {
    nome: string
    bytes: ArrayBuffer
    origem: 'watcher_drive' | 'painel'
    /** Quem subiu, quando a origem e `painel`. Texto, e nao chave para auth.users. */
    importadoPor?: string
    /**
     * O dia operacional, quando quem importa informa.
     *
     * Existe porque o R3 pode vir SEM coluna de data — o relatorio e de um dia e a data fica no
     * cabecalho impresso, nao nas linhas. Sem esta saida, um arquivo desses falha com "sem data no
     * arquivo e sem dia informado", e o caminho manual, que existe justamente para consertar um
     * dia faltante, nao conseguiria consertar nada.
     *
     * Quando o arquivo TEM data, este parametro vence: quem esta consertando um dia sabe de qual
     * dia se trata melhor que o cabecalho de um arquivo que ja deu problema uma vez.
     */
    dia?: string
    cardapio?: Cardapio
  },
): Promise<ResultadoImportacao> {
  const iniciadoEm = new Date().toISOString()
  const hash = await sha256(entrada.bytes)
  const cardapio = entrada.cardapio ?? (await leCardapio(env))

  const texto = new TextDecoder('utf-8').decode(entrada.bytes)
  const resultado = interpretaR3(texto, entrada.dia)

  /**
   * Linha sem `unidades` derruba a importacao inteira, de proposito.
   *
   * `venda_produto_dia.unidades` e NOT NULL, e a alternativa seria gravar zero. Zero unidades com
   * faturamento diferente de zero e uma afirmacao falsa sobre o dia, e ela sobreviveria para
   * sempre no historico com aparencia de dado. `unidades` nula significa que o parser nao achou a
   * coluna de quantidade, o que e mudanca de layout e nao caso de borda.
   */
  const semUnidades = resultado.linhas.filter((l) => l.unidades === null).length
  const erros = [...resultado.erros]
  if (semUnidades > 0) {
    erros.push(
      `${semUnidades} linha(s) sem quantidade: o parser nao achou a coluna de unidades. ` +
        'Arquivo bruto gravado, nenhuma venda importada. Reprocessar depois de corrigir o parser.',
    )
  }
  if (resultado.linhas.length === 0 && erros.length === 0) {
    erros.push('o arquivo nao produziu nenhuma linha de venda: layout inesperado ou arquivo vazio')
  }
  const podeGravarVendas = erros.length === 0 && resultado.linhas.length > 0

  // Os dias operacionais que o arquivo cobre. `date[]` e nao contagem: com a lista, "faltou o R3
  // de terca" e uma consulta, e nao uma leitura de arquivo.
  const dias = [...new Set(resultado.linhas.map((l) => l.dia_operacional))].sort()

  const execucao = await insere<{ id: string }>(env, 'execucao_importacao', [
    {
      origem: entrada.origem,
      arquivo: entrada.nome,
      hash,
      arquivo_bruto: paraBytea(entrada.bytes),
      linhas: resultado.linhas.length,
      ...(dias.length > 0 ? { dias_lidos: dias } : {}),
      iniciado_em: iniciadoEm,
      terminado_em: new Date().toISOString(),
      status: erros.length === 0 ? 'sucesso' : 'erro',
      ...(erros.length > 0 ? { erro: erros.join('; ').slice(0, 1000) } : {}),
      ...(entrada.importadoPor !== undefined ? { importado_por: entrada.importadoPor } : {}),
    },
  ])

  const execucaoId = execucao[0]?.id
  if (execucaoId === undefined) {
    // Sem o id da execucao nao ha como gravar venda: a chave estrangeira e NOT NULL. Parar aqui e
    // melhor que gravar venda orfa.
    throw new Error('execucao_importacao nao devolveu id: venda nao pode ser gravada sem ele')
  }

  const nomesSemItem = new Set<string>()
  let gravadas = 0

  if (podeGravarVendas) {
    const linhas = resultado.linhas.map((l) => {
      // Junta por `produto_id_pdv` (o id_altec) e cai para o nome normalizado como reserva. Item
      // que nao casa fica com `item_cardapio_id` nulo: a venda ENTRA no faturamento do dia de
      // qualquer jeito, e a lista do que nao casou e devolvida. Descartar a linha aqui faria o
      // faturamento do dia ficar menor sem ninguem saber.
      const id =
        (l.produto_id_pdv !== null ? cardapio.porId.get(l.produto_id_pdv) : undefined) ??
        cardapio.porNome.get(l.produto_nome_norm)
      if (id === undefined) nomesSemItem.add(l.produto_nome_norm)
      return {
        dia_operacional: l.dia_operacional,
        produto_id_pdv: l.produto_id_pdv,
        produto_nome_norm: l.produto_nome_norm,
        unidades: l.unidades,
        valor_liquido: l.valor_liquido,
        ...(id !== undefined ? { item_cardapio_id: id } : {}),
        execucao_importacao_id: execucaoId,
      }
    })

    // `on_conflict` pelo par UNIQUE (dia_operacional, produto_nome_norm), e nao pela chave
    // primaria: sem ele o PostgREST resolve o conflito pelo `id`, que e sempre novo, e reimportar
    // o mesmo dia levantaria 409 em vez de substituir. F39 exige que reimportar cinco vezes nao
    // mude o faturamento do dia.
    await insere(env, 'venda_produto_dia', linhas, 'experiencia', {
      on_conflict: 'dia_operacional,produto_nome_norm',
    })
    gravadas = linhas.length
  }

  return {
    execucao_id: execucaoId,
    arquivo: entrada.nome,
    hash,
    status: erros.length === 0 ? 'sucesso' : 'erro',
    linhas_lidas: resultado.linhas.length,
    linhas_gravadas: gravadas,
    dias,
    sem_item_no_cardapio: nomesSemItem.size,
    nomes_sem_item: [...nomesSemItem].sort().slice(0, 40),
    erros,
  }
}

/** Um arquivo com este hash ja foi importado antes? */
export async function jaImportado(env: Ambiente, hash: string): Promise<boolean> {
  const achado = await seleciona<{ id: string }>(
    env,
    'execucao_importacao',
    `select=id&hash=eq.${hash}&limit=1`,
  )
  return achado.length > 0
}
