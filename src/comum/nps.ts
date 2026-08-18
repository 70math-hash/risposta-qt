/**
 * NPS, faixa de confianca e significancia.
 *
 * Esta e a peca que separa este sistema do que o fornecedor anterior entrega. O relatorio
 * dele mostra a seta subindo sem dizer se a diferenca cabe no ruido. Com 50 respostas no
 * mes, duas medicoes so diferem de verdade se a diferenca passar de cerca de 29 pontos, e
 * um painel que esconde isso produz decisao sobre ruido.
 *
 * Numeros canonicos aplicados (folha canonica, secao 7):
 *   N05  faixa de 95% = 1,96 x erro padrao
 *        erro padrao = raiz((p_promotores + p_detratores - NPS^2) / n)
 *   N06  n=50  -> erro padrao 10,5 · faixa +-20,5
 *   N07  n=100 -> erro padrao  7,4 · faixa +-14,5
 *   N08  n=200 -> erro padrao  5,2 · faixa +-10,3
 *   N09  diferenca minima detectavel = faixa x raiz(2)
 *   N32  n minimo para exibir proporcao = 20
 */

import type { Faixa } from './dominio.js'

export const Z_95 = 1.96
export const N_MINIMO_PROPORCAO = 20

/** Espelho de `experiencia.fn_faixa_nps`. Detrator 0 a 6, neutro 7 e 8, promotor 9 e 10. */
export function faixaDaNota(nota: number): Faixa {
  if (!Number.isInteger(nota) || nota < 0 || nota > 10) {
    throw new RangeError(`nota fora de 0 a 10: ${nota}`)
  }
  if (nota <= 6) return 'detrator'
  if (nota <= 8) return 'neutro'
  return 'promotor'
}

export interface Contagem {
  detratores: number
  neutros: number
  promotores: number
}

export interface ResultadoNps {
  /** NPS em pontos, de -100 a 100. Arredondado para uma decimal. */
  nps: number
  /** Tamanho da amostra. Nunca omitido de nenhuma tela nem de nenhum export. */
  n: number
  /** Erro padrao em pontos. */
  erroPadrao: number
  /** Meia largura da faixa de 95%, em pontos. */
  faixa95: number
  /** Diferenca minima detectavel contra outro periodo de mesmo n, em pontos. */
  diferencaMinimaDetectavel: number
  /** Falso quando n < 20. A tela escreve `amostra insuficiente, n=x`. */
  amostraSuficiente: boolean
}

function arredonda(v: number, casas = 1): number {
  const f = 10 ** casas
  return Math.round(v * f) / f
}

/**
 * O erro padrao do NPS, em pontos, a partir das proporcoes. Formula N05.
 *
 * Exposto separado de `calculaNps` para poder ser conferido com proporcoes exatas, sem o
 * arredondamento que contagem inteira impoe. Os valores ilustrativos N06 a N08 da folha
 * canonica (10,5 · 7,4 · 5,2) saem de um numerador de variancia de exatamente 0,55, que
 * corresponde a cerca de 55% de promotores e 15,6% de detratores. Nenhuma contagem inteira
 * em n=50 reproduz 0,55 na virgula, e por isso a conferencia exata se faz aqui e a
 * conferencia com contagem real se faz com tolerancia.
 */
export function erroPadraoNps(
  pPromotores: number,
  pDetratores: number,
  n: number,
): number {
  if (n <= 0) return 0
  const nps = pPromotores - pDetratores
  const numerador = pPromotores + pDetratores - nps ** 2
  return Math.sqrt(Math.max(numerador, 0) / n) * 100
}

/**
 * NPS com faixa de confianca a partir das contagens.
 *
 * Devolve `n = 0` com tudo zerado em vez de lancar, porque dia sem resposta e situacao
 * normal (a casa fecha segunda) e nao erro. Quem chama decide o que exibir.
 */
export function calculaNps(c: Contagem): ResultadoNps {
  const n = c.detratores + c.neutros + c.promotores
  if (n === 0) {
    return {
      nps: 0,
      n: 0,
      erroPadrao: 0,
      faixa95: 0,
      diferencaMinimaDetectavel: 0,
      amostraSuficiente: false,
    }
  }

  const pPromotores = c.promotores / n
  const pDetratores = c.detratores / n
  const npsFracao = pPromotores - pDetratores

  // Os neutros entram por omissao: nao somam ao numerador mas contam no denominador, e e
  // por isso que muito neutro derruba a precisao sem mexer no valor central.
  const erroPadrao = erroPadraoNps(pPromotores, pDetratores, n)
  const faixa95 = Z_95 * erroPadrao

  return {
    nps: arredonda(npsFracao * 100),
    n,
    erroPadrao: arredonda(erroPadrao),
    faixa95: arredonda(faixa95),
    diferencaMinimaDetectavel: arredonda(faixa95 * Math.SQRT2),
    amostraSuficiente: n >= N_MINIMO_PROPORCAO,
  }
}

export function contaPorFaixa(notas: readonly number[]): Contagem {
  const c: Contagem = { detratores: 0, neutros: 0, promotores: 0 }
  for (const nota of notas) {
    const f = faixaDaNota(nota)
    if (f === 'detrator') c.detratores++
    else if (f === 'neutro') c.neutros++
    else c.promotores++
  }
  return c
}

/**
 * Duas medicoes diferem de verdade?
 *
 * Compara a diferenca observada contra a faixa combinada dos dois periodos. E a pergunta
 * que o painel precisa responder antes de desenhar qualquer seta, e a resposta honesta
 * na maior parte dos meses desta casa e `nao da para saber`.
 */
export function diferencaSignificativa(
  a: ResultadoNps,
  b: ResultadoNps,
): { diferenca: number; limite: number; significativa: boolean; motivo: string } {
  const diferenca = arredonda(b.nps - a.nps)

  if (a.n === 0 || b.n === 0) {
    return {
      diferenca,
      limite: 0,
      significativa: false,
      motivo: 'um dos periodos nao tem resposta',
    }
  }

  // Faixa da diferenca entre duas medicoes independentes: raiz da soma das variancias.
  const limite = arredonda(
    Z_95 * Math.hypot(a.erroPadrao, b.erroPadrao),
  )
  const significativa = Math.abs(diferenca) > limite

  return {
    diferenca,
    limite,
    significativa,
    motivo: significativa
      ? `diferenca de ${Math.abs(diferenca)} pontos passa do limite de ${limite}`
      : `diferenca de ${Math.abs(diferenca)} pontos cabe no ruido de ${limite}, com n=${a.n} e n=${b.n}`,
  }
}

/**
 * Texto pronto para a tela e para o e-mail.
 *
 * A folha canonica exige que todo NPS apareca com o `n` e com a faixa, e que abaixo de
 * n=20 a tela escreva `amostra insuficiente`. Centralizar a frase aqui e o que garante
 * que nenhuma tela esqueca de escrever o `n`.
 */
export function textoNps(r: ResultadoNps): string {
  if (r.n === 0) return 'nenhuma resposta coletada'
  if (!r.amostraSuficiente) return `amostra insuficiente, n=${r.n}`
  return `NPS ${r.nps} ±${r.faixa95} (n=${r.n})`
}

/**
 * Proporcao com o `n` obrigatorio ao lado, ou o aviso de amostra insuficiente.
 * Usada em conversao, taxa de contato e taxa de recuperacao.
 */
export function textoProporcao(parte: number, total: number, rotulo: string): string {
  if (total === 0) return `sem ${rotulo}`
  if (total < N_MINIMO_PROPORCAO) return `amostra insuficiente, n=${total}`
  return `${arredonda((parte / total) * 100)}% (${parte} de ${total})`
}
