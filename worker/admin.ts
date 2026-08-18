/**
 * As escritas administrativas: os deveres humanos recorrentes do sistema.
 *
 * POR QUE ELAS EXISTEM
 *   O sistema tem seis deveres humanos, e cinco deles sao ESCRITA. Sem um caminho para eles, o
 *   sistema le e nao opera:
 *
 *     diario     informar as mesas atendidas. E o denominador da conversao da casa, e sem ele o
 *                criterio de sucesso numero 2 nao tem como ser medido.
 *     eventual   cadastrar e desligar garcom, mesa, item de cardapio e destinatario de e-mail.
 *     mensal     rotacionar a pergunta em foco do banco.
 *     eventual   registrar que alguem falou com o cliente detrator (`contato_em`).
 *     legal      atender pedido de exclusao de titular (LGPD).
 *
 *   O painel entra como `authenticated`, que so tem SELECT. Isso e desenho, e nao falta: a chave
 *   publica vai no bundle publicado, e um bundle com permissao de escrita e uma permissao de
 *   escrita publicada. Logo a escrita administrativa passa por AQUI, no Worker, atras de
 *   conferencia de sessao — o mesmo caminho da importacao manual do R3.
 *
 * A LISTA BRANCA E A FRONTEIRA DE SEGURANCA
 *   O Worker tem a chave de servico, que passa por cima de RLS. Portanto uma rota administrativa
 *   generica ("escreva X na tabela Y") daria, a quem tivesse uma sessao, poder total sobre o banco
 *   inteiro, incluindo `resposta` e as tabelas do sistema fiscal em `public`.
 *
 *   A lista abaixo declara, por entidade: qual tabela, quais colunas podem ser escritas, quais sao
 *   obrigatorias na criacao, e se apagar e permitido. Coluna fora da lista e RECUSADA, e nao
 *   ignorada em silencio: ignorar faria a tela parecer que salvou.
 *
 *   Nenhuma entidade de resposta esta aqui, e nunca deve estar. Resposta nasce completa e nao se
 *   edita; corrigir uma resposta e coletar outra.
 */

import type { Ambiente } from './lib/supabase.js'

/** O que se pode fazer com uma entidade administrativa. */
export interface Entidade {
  tabela: string
  /** Colunas que podem ser escritas. Qualquer outra e recusada. */
  colunas: readonly string[]
  /** Colunas obrigatorias na criacao. */
  obrigatorias: readonly string[]
  /**
   * Como se desliga um registro. `removido_em` marca a data e preserva o historico;
   * `nenhuma` significa que a entidade nao se desliga.
   *
   * Nunca DELETE. Garcom removido continua nas respostas dele, e apagar a linha deixaria a
   * resposta apontando para nada — ou pior, reatribuiria o historico se o id fosse reusado.
   */
  desligar: 'removido_em' | 'ativo' | 'nenhuma'
  /** `upsert` pela coluna citada, para o dever diario nao criar linha duplicada. */
  chaveNatural?: string
}

export const ENTIDADES: Record<string, Entidade> = {
  /**
   * O dever DIARIO. `upsert` por `dia_operacional`: quem informa duas vezes esta corrigindo, e a
   * correcao tem de substituir. Sem a chave natural, o segundo envio criaria uma segunda linha e a
   * conversao do dia passaria a ter dois denominadores.
   */
  mesa_atendida_dia: {
    tabela: 'mesa_atendida_dia',
    colunas: ['dia_operacional', 'mesas'],
    obrigatorias: ['dia_operacional', 'mesas'],
    desligar: 'nenhuma',
    chaveNatural: 'dia_operacional',
  },

  garcom: {
    tabela: 'garcom',
    // `pin` entra porque ele e DADO da resposta e nao autenticacao: mudar o PIN de alguem nao da
    // acesso a nada, so muda a quem as respostas futuras sao atribuidas.
    colunas: ['nome', 'pin', 'ativo'],
    obrigatorias: ['nome', 'pin'],
    desligar: 'removido_em',
  },

  mesa: {
    tabela: 'mesa',
    colunas: ['numero', 'area', 'capacidade'],
    obrigatorias: ['numero', 'area'],
    desligar: 'nenhuma',
  },

  item_cardapio: {
    tabela: 'item_cardapio',
    // `produto_id_pdv` e o `id_altec`, e cadastra-lo e o que liga o cruzamento de reclamacao por
    // 100 unidades vendidas. E a razao numero 1 desta tela existir.
    colunas: ['nome_pt', 'nome_en', 'grupo', 'ativo', 'produto_id_pdv', 'produto_nome_norm', 'prato_id'],
    obrigatorias: ['nome_pt', 'nome_en', 'grupo'],
    desligar: 'removido_em',
  },

  destinatario: {
    tabela: 'destinatario',
    colunas: ['email', 'papel', 'ativo'],
    obrigatorias: ['email', 'papel'],
    desligar: 'removido_em',
  },

  /**
   * O dever MENSAL: rotacionar a pergunta em foco.
   *
   * SO as colunas de rotacao. Texto, dimensao, fator, peso e opcoes NAO entram: mudar o texto de
   * uma pergunta faz a contagem de um mes deixar de ser comparavel com a do outro, e isso e uma
   * decisao que passa por migration, com a pergunta nova ganhando numero novo.
   */
  pergunta_banco: {
    tabela: 'pergunta_banco',
    colunas: ['ativa', 'em_foco', 'em_foco_desde'],
    obrigatorias: [],
    desligar: 'ativo',
  },

  /**
   * Texto de consentimento novo. INSERT apenas, e por permissao: a tabela e append-only, e a
   * invariante da migration de RLS derruba a aplicacao se ela ganhar UPDATE. Editar um texto ja
   * aceito faria os aceites gravados citarem algo que mudou depois.
   */
  consentimento_texto: {
    tabela: 'consentimento_texto',
    colunas: ['versao', 'texto', 'vigente_de'],
    obrigatorias: ['versao', 'texto', 'vigente_de'],
    desligar: 'nenhuma',
  },

  /**
   * Excecao de calendario: feriado em que a casa abriu numa segunda, ou fechamento numa terca.
   * E o que impede o digest de acusar falha de coleta num dia fechado, e de dizer "casa fechada"
   * num dia cheio.
   */
  calendario_operacao: {
    tabela: 'calendario_operacao',
    colunas: ['dia_operacional', 'abre', 'motivo'],
    obrigatorias: ['dia_operacional', 'abre', 'motivo'],
    desligar: 'nenhuma',
    chaveNatural: 'dia_operacional',
  },

  configuracao: {
    tabela: 'configuracao',
    colunas: ['chave', 'valor', 'descricao'],
    obrigatorias: ['chave', 'valor', 'descricao'],
    desligar: 'nenhuma',
    chaveNatural: 'chave',
  },
}

export class ErroAdmin extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
  ) {
    super(mensagem)
    this.name = 'ErroAdmin'
  }
}

/**
 * Confere o corpo contra a lista branca e devolve a linha pronta para escrever.
 *
 * Recusa, e nao filtra. Coluna desconhecida chegando aqui significa que a tela mandou algo que o
 * servidor nao entende, e as duas explicacoes possiveis — tela velha depois de um deploy, ou
 * alguem tentando escrever onde nao deve — pedem erro visivel e nao silencio.
 */
export function validaCorpo(
  entidade: Entidade,
  corpo: Record<string, unknown>,
  criando: boolean,
): Record<string, unknown> {
  const permitidas = new Set(entidade.colunas)
  const desconhecidas = Object.keys(corpo).filter((c) => !permitidas.has(c))
  if (desconhecidas.length > 0) {
    throw new ErroAdmin(
      `coluna nao permitida em ${entidade.tabela}: ${desconhecidas.join(', ')}. ` +
        `Permitidas: ${entidade.colunas.join(', ')}`,
      422,
    )
  }

  if (criando) {
    const faltando = entidade.obrigatorias.filter(
      (c) => corpo[c] === undefined || corpo[c] === null || corpo[c] === '',
    )
    if (faltando.length > 0) {
      throw new ErroAdmin(`campo obrigatorio faltando: ${faltando.join(', ')}`, 422)
    }
  }

  if (Object.keys(corpo).length === 0) {
    throw new ErroAdmin('corpo vazio: nada a escrever', 422)
  }
  return corpo
}

/**
 * A linha de desligamento, pela estrategia declarada da entidade.
 *
 * `removido_em` vem SEMPRE junto de `ativo = false`, e nao apenas por simetria: `garcom` e
 * `item_cardapio` tem CHECK (`..._removido_nao_ativo`) exigindo que quem tem data de saida esteja
 * inativo. A primeira versao daqui mandava so a data, e o banco recusou — com razao, porque garcom
 * com data de saida e `ativo = true` continuaria tendo o PIN resolvido em
 * `fn_grava_resposta`, e respostas NOVAS seguiriam sendo atribuidas a quem ja saiu.
 *
 * `destinatario` nao tem esse CHECK, mas ganha o mesmo tratamento: destinatario removido e ativo
 * continuaria recebendo o e-mail das 16h.
 */
export function corpoDeDesligamento(entidade: Entidade): Record<string, unknown> {
  if (entidade.desligar === 'removido_em') {
    return { removido_em: new Date().toISOString(), ativo: false }
  }
  if (entidade.desligar === 'ativo') return { ativo: false }
  throw new ErroAdmin(`${entidade.tabela} nao se desliga`, 422)
}

/** As entidades, para a tela montar os formularios sem duplicar a lista. */
export function catalogoDeEntidades(): Record<string, Omit<Entidade, 'tabela'>> {
  const saida: Record<string, Omit<Entidade, 'tabela'>> = {}
  for (const [nome, e] of Object.entries(ENTIDADES)) {
    const { tabela: _tabela, ...resto } = e
    saida[nome] = resto
  }
  return saida
}

export type { Ambiente }
