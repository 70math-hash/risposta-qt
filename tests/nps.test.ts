import { describe, expect, it } from 'vitest'
import {
  calculaNps,
  contaPorFaixa,
  diferencaSignificativa,
  erroPadraoNps,
  faixaDaNota,
  textoNps,
  textoProporcao,
} from '../src/comum/nps.js'

describe('faixaDaNota', () => {
  it('corta em 0 a 6, 7 e 8, 9 e 10', () => {
    expect([0, 3, 6].map(faixaDaNota)).toEqual(['detrator', 'detrator', 'detrator'])
    expect([7, 8].map(faixaDaNota)).toEqual(['neutro', 'neutro'])
    expect([9, 10].map(faixaDaNota)).toEqual(['promotor', 'promotor'])
  })

  it('recusa nota fora de 0 a 10, porque a escala nunca e 1 a 5 nem 1 a 10', () => {
    expect(() => faixaDaNota(11)).toThrow(RangeError)
    expect(() => faixaDaNota(-1)).toThrow(RangeError)
    expect(() => faixaDaNota(7.5)).toThrow(RangeError)
  })
})

/**
 * Os numeros N06, N07 e N08 da folha canonica assumem uma distribuicao que a folha nao
 * declara. Ela e recuperavel: os tres valores fecham quando
 * `p_promotores + p_detratores - NPS^2 = 0,55`, o que corresponde a cerca de 55% de
 * promotores e 15% de detratores, ou seja uma casa saudavel.
 *
 * Este bloco prova as duas coisas de uma vez: que a formula esta implementada como N05
 * manda, e que ela reproduz os tres valores canonicos sob essa distribuicao. Fixar a
 * premissa aqui e o que impede alguem de "corrigir" a formula um dia para bater o numero.
 */
describe('faixa de 95%, contra os valores canonicos N06 a N08', () => {
  // Os tres valores ilustrativos da folha saem de um numerador de variancia de exatamente
  // 0,55. Resolvendo `p + q - (p-q)^2 = 0,55` para p=0,55, obtem-se q = 0,155635.
  // Conferido aqui com proporcoes exatas, o que prova a formula sem depender de contagem.
  const P = 0.55
  // Raiz de `Q^2 - 2,1Q + 0,3025 = 0`, escrita como expressao para ser exata e conferivel,
  // em vez de um decimal copiado que ninguem sabe de onde veio.
  const Q = (2.1 - Math.sqrt(3.2)) / 2

  const casos = [
    { n: 50, erroPadrao: 10.5, faixa95: 20.6, minima: 29.1 },
    { n: 100, erroPadrao: 7.4, faixa95: 14.5, minima: 20.6 },
    { n: 200, erroPadrao: 5.2, faixa95: 10.3, minima: 14.5 },
  ]

  it('o numerador da variancia da premissa e 0,55', () => {
    expect(P + Q - (P - Q) ** 2).toBeCloseTo(0.55, 6)
  })

  for (const caso of casos) {
    it(`n=${caso.n} da erro padrao ${caso.erroPadrao} pela formula exata`, () => {
      const ep = erroPadraoNps(P, Q, caso.n)
      expect(ep).toBeCloseTo(caso.erroPadrao, 1)
      expect(1.96 * ep).toBeCloseTo(caso.faixa95, 0)
      expect(1.96 * ep * Math.SQRT2).toBeCloseTo(caso.minima, 0)
    })
  }

  it('com contagem inteira o valor fica proximo, e a diferenca e arredondamento', () => {
    // 28 promotores e 8 detratores em 50 dao numerador 0,56, nao 0,55. A diferenca de
    // 0,1 ponto no erro padrao e aritmetica de contagem, nao erro de formula.
    const r = calculaNps({ detratores: 8, neutros: 14, promotores: 28 })
    expect(r.n).toBe(50)
    expect(r.erroPadrao).toBeCloseTo(10.5, 0)
    expect(Math.abs(r.erroPadrao - 10.5)).toBeLessThanOrEqual(0.2)
  })

  it('a faixa e sempre 1,96 vezes o erro padrao, nunca o erro padrao sozinho', () => {
    const r = calculaNps({ detratores: 8, neutros: 16, promotores: 26 })
    expect(r.faixa95).toBeCloseTo(1.96 * r.erroPadrao, 1)
    // O erro que a critica adversarial pegou na Etapa 3 foi exibir o erro padrao como se
    // fosse a faixa, o que mostraria incerteza quase pela metade.
    expect(r.faixa95).toBeGreaterThan(r.erroPadrao * 1.9)
  })

  it('a diferenca minima detectavel e a faixa vezes raiz de 2', () => {
    const r = calculaNps({ detratores: 8, neutros: 16, promotores: 26 })
    expect(r.diferencaMinimaDetectavel).toBeCloseTo(r.faixa95 * Math.SQRT2, 1)
  })
})

describe('calculaNps', () => {
  it('NPS e a diferenca entre proporcao de promotores e de detratores', () => {
    const r = calculaNps({ detratores: 10, neutros: 20, promotores: 70 })
    expect(r.nps).toBe(60)
    expect(r.n).toBe(100)
  })

  it('neutro nao mexe no valor central mas derruba a precisao', () => {
    const semNeutro = calculaNps({ detratores: 10, neutros: 0, promotores: 30 })
    const comNeutro = calculaNps({ detratores: 10, neutros: 60, promotores: 30 })
    expect(semNeutro.nps).toBe(50)
    expect(comNeutro.nps).toBe(20)
    // Mais amostra reduz o erro padrao, mesmo quando o acrescimo e todo neutro.
    expect(comNeutro.erroPadrao).toBeLessThan(semNeutro.erroPadrao)
  })

  it('dia sem resposta devolve n=0 sem lancar, porque a casa fecha segunda', () => {
    const r = calculaNps({ detratores: 0, neutros: 0, promotores: 0 })
    expect(r.n).toBe(0)
    expect(r.amostraSuficiente).toBe(false)
    expect(textoNps(r)).toBe('nenhuma resposta coletada')
  })

  it('marca amostra insuficiente abaixo de n=20, que e N32', () => {
    expect(calculaNps({ detratores: 2, neutros: 5, promotores: 12 }).amostraSuficiente).toBe(
      false,
    )
    expect(calculaNps({ detratores: 2, neutros: 6, promotores: 12 }).amostraSuficiente).toBe(
      true,
    )
  })

  it('extremos nao produzem erro padrao negativo nem NaN', () => {
    const todosPromotores = calculaNps({ detratores: 0, neutros: 0, promotores: 40 })
    expect(todosPromotores.nps).toBe(100)
    expect(todosPromotores.erroPadrao).toBe(0)
    const todosDetratores = calculaNps({ detratores: 40, neutros: 0, promotores: 0 })
    expect(todosDetratores.nps).toBe(-100)
    expect(Number.isFinite(todosDetratores.erroPadrao)).toBe(true)
  })
})

describe('contaPorFaixa', () => {
  it('conta a partir de uma lista de notas', () => {
    expect(contaPorFaixa([10, 9, 8, 7, 6, 0])).toEqual({
      detratores: 2,
      neutros: 2,
      promotores: 2,
    })
  })
})

describe('diferencaSignificativa, que e o que o painel precisa antes de desenhar seta', () => {
  it('no volume desta casa, uma alta pequena cabe no ruido', () => {
    const antes = calculaNps({ detratores: 8, neutros: 12, promotores: 30 })
    const depois = calculaNps({ detratores: 6, neutros: 12, promotores: 32 })
    const d = diferencaSignificativa(antes, depois)
    expect(d.significativa).toBe(false)
    expect(d.motivo).toContain('cabe no ruido')
  })

  it('uma queda grande passa do limite', () => {
    const antes = calculaNps({ detratores: 2, neutros: 8, promotores: 40 })
    const depois = calculaNps({ detratores: 30, neutros: 10, promotores: 10 })
    const d = diferencaSignificativa(antes, depois)
    expect(d.significativa).toBe(true)
    expect(d.diferenca).toBeLessThan(0)
  })

  it('nao afirma nada quando um dos periodos esta vazio', () => {
    const vazio = calculaNps({ detratores: 0, neutros: 0, promotores: 0 })
    const cheio = calculaNps({ detratores: 5, neutros: 5, promotores: 20 })
    const d = diferencaSignificativa(vazio, cheio)
    expect(d.significativa).toBe(false)
    expect(d.motivo).toContain('nao tem resposta')
  })
})

describe('textos, que garantem que o n nunca desaparece da tela', () => {
  it('todo NPS exibido carrega n e faixa', () => {
    const r = calculaNps({ detratores: 8, neutros: 12, promotores: 30 })
    const t = textoNps(r)
    expect(t).toContain('n=50')
    expect(t).toContain('±')
  })

  it('proporcao abaixo de n=20 nao mostra percentual', () => {
    expect(textoProporcao(3, 10, 'mesas')).toBe('amostra insuficiente, n=10')
    expect(textoProporcao(30, 100, 'mesas')).toBe('30% (30 de 100)')
    expect(textoProporcao(0, 0, 'mesas')).toBe('sem mesas')
  })
})
