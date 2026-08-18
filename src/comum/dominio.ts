/**
 * Listas fechadas de valor, transcritas da folha canonica, secao 3.3.
 *
 * "Estas listas sao fechadas. O classificador de IA nao pode criar valor novo, e valor
 * fora da lista e rejeitado. Valor novo entra por decisao humana e por migration, nunca
 * por prompt."
 *
 * Este arquivo e a unica definicao destes dominios no codigo. O banco tem as mesmas
 * listas em constraint, e as duas precisam ser alteradas na mesma migration.
 */

export const DIMENSOES = [
  'comida',
  'bebida',
  'tempo',
  'atendimento',
  'precisao_pedido',
  'ambiente',
  'limpeza',
  'preco_valor',
  'item_consumido',
] as const
export type Dimensao = (typeof DIMENSOES)[number]

/**
 * Fatores por dimensao. `item_consumido` nao usa fator: o item vai em `resposta_item`.
 * Os seis fatores de `comida` sao exatamente os da tela T3C3.
 * `limpeza.banheiro` tem linha propria de proposito, porque e o que aparece em
 * avaliacao publica negativa.
 */
export const FATORES = {
  comida: [
    'sabor',
    'chegou_frio',
    'ponto_da_massa',
    'apresentacao',
    'ingrediente_sem_frescor',
    'veio_errado_ou_faltou',
  ],
  bebida: ['temperatura', 'tempo_ate_chegar', 'qualidade', 'veio_errada'],
  tempo: ['espera_mesa', 'espera_bebida', 'espera_pizza', 'espera_conta'],
  atendimento: [
    'recepcao',
    'simpatia',
    'atencao_durante',
    'despedida',
    'conhecimento_cardapio',
  ],
  precisao_pedido: [
    'item_errado',
    'item_faltando',
    'pedido_especial_ignorado',
    'restricao_alimentar',
  ],
  ambiente: ['ruido', 'temperatura_salao', 'iluminacao', 'conforto'],
  limpeza: ['mesa', 'salao', 'banheiro'],
  preco_valor: ['valor_percebido', 'preco_pizza', 'preco_bebida', 'couvert_ou_taxa'],
  item_consumido: [],
} as const satisfies Record<Dimensao, readonly string[]>

export type Fator = (typeof FATORES)[Dimensao][number]

export const FAIXAS = ['detrator', 'neutro', 'promotor'] as const
export type Faixa = (typeof FAIXAS)[number]

export const CANAIS_RESPOSTA = ['tablet', 'qr'] as const
export type CanalResposta = (typeof CANAIS_RESPOSTA)[number]

export const PAPEIS_DESTINATARIO = ['proprietario', 'gerencia', 'cozinha', 'salao'] as const
export type PapelDestinatario = (typeof PAPEIS_DESTINATARIO)[number]

export const FINALIDADES_CONSENTIMENTO = ['pesquisa', 'contato'] as const
export type FinalidadeConsentimento = (typeof FINALIDADES_CONSENTIMENTO)[number]

export const DESFECHOS_TENTATIVA = ['respondeu', 'recusou'] as const
export type DesfechoTentativa = (typeof DESFECHOS_TENTATIVA)[number]

export const GRUPOS_ITEM_CARDAPIO = ['pizza', 'entrada', 'sobremesa'] as const
export type GrupoItemCardapio = (typeof GRUPOS_ITEM_CARDAPIO)[number]

/** `resposta_item` aceita `mais_de_um`, que `item_cardapio` nao aceita. */
export const GRUPOS_RESPOSTA_ITEM = [...GRUPOS_ITEM_CARDAPIO, 'mais_de_um'] as const
export type GrupoRespostaItem = (typeof GRUPOS_RESPOSTA_ITEM)[number]

export const AREAS_MESA = ['salao', 'varanda'] as const
export type AreaMesa = (typeof AREAS_MESA)[number]

export const USOS_DISPOSITIVO = ['em_uso', 'reserva'] as const
export type UsoDispositivo = (typeof USOS_DISPOSITIVO)[number]

export const POLARIDADES = ['positivo', 'negativo', 'neutro'] as const
export type Polaridade = (typeof POLARIDADES)[number]

export const SEVERIDADES = ['baixa', 'media', 'alta'] as const
export type Severidade = (typeof SEVERIDADES)[number]

export const STATUS_EXECUCAO = ['sucesso', 'erro'] as const
export type StatusExecucao = (typeof STATUS_EXECUCAO)[number]

export const ORIGENS_CLIENTE = ['pesquisa'] as const
export type OrigemCliente = (typeof ORIGENS_CLIENTE)[number]

/** As cinco rotinas, e so cinco. Nao existe `cron_keepalive`. */
export const ROTINAS = [
  'watcher_drive',
  'cron_classificador',
  'cron_digest_16h',
  'cron_retencao',
  'backup_semanal',
] as const
export type Rotina = (typeof ROTINAS)[number]

export const IDIOMAS = ['pt', 'en'] as const
export type Idioma = (typeof IDIOMAS)[number]

// --- Validacao ---

/**
 * Espelho EXATO de `experiencia.fn_fator_valido`. Fator orfao e erro, nao aviso.
 *
 * As tres regras, na mesma ordem da funcao do banco:
 *
 *   1. `item_consumido` nao usa fator: o item vai em `resposta_item`. Fator preenchido ali e
 *      invalido, e nao apenas ignorado.
 *   2. Fator NULO e valido em qualquer outra dimensao: a T2A e a T2B marcam a dimensao sem descer
 *      ao fator ("A pizza", sem dizer o que teve a pizza).
 *   3. Dimensao nula aceita a lista PLANA de todos os fatores. E o caso de `alerta_detrator`, que
 *      guarda o primeiro fator marcado sem carregar a dimensao junto.
 *
 * A versao anterior nao tinha nenhuma das tres: aceitava so o par completo, e o comentario do SQL
 * dizia "espelho de `fatorValido`" enquanto os dois discordavam nos dois casos que o SQL
 * acrescentou. Espelho que nao espelha e pior que ausencia de espelho, porque quem le confia.
 */
export function fatorValido(dimensao: string | null, fator: string | null): boolean {
  if (dimensao === 'item_consumido') return fator === null
  if (fator === null) return true
  if (dimensao === null) {
    return Object.values(FATORES).some((lista) => (lista as readonly string[]).includes(fator))
  }
  const lista = (FATORES as Record<string, readonly string[]>)[dimensao]
  return lista !== undefined && lista.includes(fator)
}

export function dimensaoValida(valor: string): valor is Dimensao {
  return (DIMENSOES as readonly string[]).includes(valor)
}

/**
 * Todos os pares dimensao/fator validos, em ordem estavel.
 * Serve ao painel, ao seletor de fator e a validacao da saida do classificador.
 */
export function paresDimensaoFator(): ReadonlyArray<{ dimensao: Dimensao; fator: string }> {
  const pares: Array<{ dimensao: Dimensao; fator: string }> = []
  for (const dimensao of DIMENSOES) {
    for (const fator of FATORES[dimensao]) pares.push({ dimensao, fator })
  }
  return pares
}
