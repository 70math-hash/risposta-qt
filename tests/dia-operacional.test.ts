import { describe, expect, it } from 'vitest'
import {
  casaAbrePadrao,
  diaDaSemana,
  diaOperacional,
  diaOperacionalAnterior,
  rotuloDiaOperacional,
  somaDias,
} from '../src/comum/dia-operacional.js'

/**
 * Em agosto de 2026, dia 1 e sabado. Sao Paulo esta em UTC-3, sem horario de verao.
 * Para montar um instante a partir da hora local, soma-se 3 horas para chegar em UTC.
 */
function local(iso: string): Date {
  return new Date(`${iso}-03:00`)
}

describe('diaOperacional, os cinco casos da folha canonica secao 4.6', () => {
  it('quarta 00h40 pertence a terca', () => {
    expect(diaOperacional(local('2026-08-05T00:40:00'))).toBe('2026-08-04')
  })

  it('sabado 23h50 pertence ao proprio sabado', () => {
    expect(diaOperacional(local('2026-08-08T23:50:00'))).toBe('2026-08-08')
  })

  it('domingo 05h59 e o ultimo minuto da noite de sabado', () => {
    expect(diaOperacional(local('2026-08-09T05:59:00'))).toBe('2026-08-08')
  })

  it('domingo 06h00 e o primeiro minuto do dia operacional de domingo', () => {
    expect(diaOperacional(local('2026-08-09T06:00:00'))).toBe('2026-08-09')
  })

  it('segunda 01h20 pertence a noite de domingo', () => {
    expect(diaOperacional(local('2026-08-10T01:20:00'))).toBe('2026-08-09')
  })
})

describe('diaOperacional, bordas', () => {
  it('nunca usa a data civil: 00h00 em ponto cai no dia anterior', () => {
    expect(diaOperacional(local('2026-08-05T00:00:00'))).toBe('2026-08-04')
  })

  it('05h59:59 ainda e do dia anterior', () => {
    expect(diaOperacional(local('2026-08-05T05:59:59'))).toBe('2026-08-04')
  })

  it('atravessa virada de mes', () => {
    expect(diaOperacional(local('2026-09-01T02:00:00'))).toBe('2026-08-31')
  })

  it('atravessa virada de ano', () => {
    expect(diaOperacional(local('2027-01-01T03:00:00'))).toBe('2026-12-31')
  })

  it('e estavel independente do fuso de quem chama, porque recebe instante', () => {
    // O mesmo instante, escrito em UTC e em UTC-3, tem de dar o mesmo dia operacional.
    const emUtc = new Date('2026-08-05T03:40:00Z') // 00h40 em Sao Paulo
    expect(diaOperacional(emUtc)).toBe('2026-08-04')
    expect(diaOperacional(local('2026-08-05T00:40:00'))).toBe('2026-08-04')
  })
})

describe('somaDias e diaDaSemana', () => {
  it('soma e subtrai sem erro de fuso', () => {
    expect(somaDias('2026-08-31', 1)).toBe('2026-09-01')
    expect(somaDias('2026-09-01', -1)).toBe('2026-08-31')
    expect(somaDias('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('agosto de 2026 comeca no sabado', () => {
    expect(diaDaSemana('2026-08-01')).toBe(6)
    expect(diaDaSemana('2026-08-03')).toBe(1)
  })
})

describe('diaOperacionalAnterior, que e o que o digest das 16h cobre', () => {
  it('as 16h de quarta, cobre a noite de terca', () => {
    expect(diaOperacionalAnterior(local('2026-08-05T16:00:00'))).toBe('2026-08-04')
  })

  it('as 16h de terca, cobre a noite de segunda, que e dia fechado', () => {
    const dia = diaOperacionalAnterior(local('2026-08-04T16:00:00'))
    expect(dia).toBe('2026-08-03')
    expect(casaAbrePadrao(dia)).toBe(false)
  })
})

describe('casaAbrePadrao', () => {
  it('fecha segunda e abre nos outros seis dias', () => {
    expect(casaAbrePadrao('2026-08-03')).toBe(false) // segunda
    expect(casaAbrePadrao('2026-08-04')).toBe(true) // terca
    expect(casaAbrePadrao('2026-08-08')).toBe(true) // sabado
    expect(casaAbrePadrao('2026-08-09')).toBe(true) // domingo
  })
})

describe('rotuloDiaOperacional', () => {
  it('traz a janela real, e nao so a data', () => {
    expect(rotuloDiaOperacional('2026-08-04')).toBe('terça 04/08, das 18h às 6h')
    expect(rotuloDiaOperacional('2026-08-09')).toBe('domingo 09/08, das 17h às 6h')
  })

  it('diz casa fechada na segunda, em vez de inventar horario', () => {
    expect(rotuloDiaOperacional('2026-08-03')).toBe('segunda 03/08, casa fechada')
  })
})
