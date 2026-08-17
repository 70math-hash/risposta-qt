/**
 * O recuo da fila e a regra de quando desistir.
 *
 * EXISTE POR CAUSA DE UMA PERDA SILENCIOSA DE DADO
 *   A versao anterior marcava `falha_permanente` depois de 8 tentativas, e o sincronizador roda a
 *   cada 5 minutos. Quarenta minutos de rede ruim — um roteador reiniciando no meio do jantar,
 *   Supabase pausado, hotel com portal cativo — descartavam a resposta.
 *
 *   E o descarte era invisivel duas vezes: `pendentes()` filtrava so `pendente` e `enviando`,
 *   entao a resposta saia do contador da T0, de `tamanhoFila()` e de `dispositivo.fila_pendente`,
 *   que e justamente o numero que o digest das 16h usa para dizer que um tablet esta com fila
 *   presa. A resposta era perdida e NADA em lugar nenhum dizia isso.
 *
 *   Contradizia por escrito `01-arquitetura` secao 6: "Supabase pausado ou fora: a coleta
 *   continua... ao voltar, sobem sozinhas".
 *
 * ESTE ARQUIVO NAO USA IndexedDB
 *   `esperaMinutos` e `estaNaHora` sao puras de proposito, e e por isso que dao para testar sem
 *   navegador. A decisao de desistir (`ehRecusaDefinitiva`) tambem e pura. As tres juntas sao a
 *   regra inteira; o resto de `fila.ts` e armazenamento.
 */

import { describe, expect, it } from 'vitest'
import { esperaMinutos, estaNaHora, type ItemFila } from '../src/coleta/fila.js'
import { ehRecusaDefinitiva, ErroEnvio } from '../src/comum/api.js'

describe('quando desistir', () => {
  it('4xx e recusa definitiva: o servidor entendeu e disse nao', () => {
    for (const status of [400, 401, 403, 404, 422]) {
      expect(ehRecusaDefinitiva(new ErroEnvio(`HTTP ${status}`, status)), `status ${status}`).toBe(
        true,
      )
    }
  })

  it('408 e 429 NAO sao recusa: sao pedidos de espera', () => {
    // 408 e tempo esgotado no servidor e 429 e "pedimos demais". Tratar como recusa descartaria a
    // resposta exatamente quando o servidor esta pedindo para tentar mais tarde.
    expect(ehRecusaDefinitiva(new ErroEnvio('HTTP 408', 408))).toBe(false)
    expect(ehRecusaDefinitiva(new ErroEnvio('HTTP 429', 429))).toBe(false)
  })

  it('5xx nunca e recusa: e o servidor com problema, e ele volta', () => {
    for (const status of [500, 502, 503, 504]) {
      expect(ehRecusaDefinitiva(new ErroEnvio(`HTTP ${status}`, status)), `status ${status}`).toBe(
        false,
      )
    }
  })

  it('erro sem status nunca e recusa: e rede, DNS ou tempo esgotado no cliente', () => {
    // O caso que causava a perda. `fetch` rejeita com TypeError quando nao ha rede, e com
    // AbortError no tempo esgotado; os dois viram `ErroEnvio` sem status.
    expect(ehRecusaDefinitiva(new ErroEnvio('Failed to fetch'))).toBe(false)
    expect(ehRecusaDefinitiva(new ErroEnvio('The operation was aborted'))).toBe(false)
    expect(ehRecusaDefinitiva(new Error('qualquer coisa'))).toBe(false)
    expect(ehRecusaDefinitiva('nem erro e')).toBe(false)
  })
})

describe('o recuo exponencial', () => {
  it('dobra a cada tentativa e para de dobrar em 60 minutos', () => {
    expect(esperaMinutos(0)).toBe(5)
    expect(esperaMinutos(1)).toBe(5)
    expect(esperaMinutos(2)).toBe(10)
    expect(esperaMinutos(3)).toBe(20)
    expect(esperaMinutos(4)).toBe(40)
    expect(esperaMinutos(5)).toBe(60)
    expect(esperaMinutos(50)).toBe(60)
  })

  it('o teto garante varias tentativas ao longo de um expediente', () => {
    // O expediente da casa tem cerca de 8 horas. Com teto de 60 minutos, a fila tenta de novo
    // muitas vezes na pior noite possivel, em vez de desistir dentro da primeira hora.
    let minutos = 0
    let tentativas = 0
    while (minutos < 8 * 60) {
      tentativas += 1
      minutos += esperaMinutos(tentativas)
    }
    expect(tentativas).toBeGreaterThanOrEqual(8)
  })
})

function item(parcial: Partial<ItemFila<unknown>>): ItemFila<unknown> {
  return {
    id: 'x',
    carga: {},
    status: 'pendente',
    tentativas_envio: 0,
    criado_em_local: '2026-08-05T01:00:00.000Z',
    ...parcial,
  }
}

describe('estaNaHora', () => {
  const agora = Date.parse('2026-08-05T02:00:00.000Z')

  it('item que nunca foi tentado vai agora', () => {
    expect(estaNaHora(item({}), agora)).toBe(true)
  })

  it('respeita a espera da tentativa corrente', () => {
    // 3 tentativas -> espera de 20 minutos.
    const tentado = (minutosAtras: number) =>
      item({
        tentativas_envio: 3,
        ultima_tentativa_em: new Date(agora - minutosAtras * 60_000).toISOString(),
      })
    expect(estaNaHora(tentado(19), agora)).toBe(false)
    expect(estaNaHora(tentado(20), agora)).toBe(true)
    expect(estaNaHora(tentado(120), agora)).toBe(true)
  })

  it('nunca fica preso para sempre: com o teto, toda espera vence', () => {
    // A propriedade que importa: nao existe estado em que o item deixe de ser tentado. Com 200
    // tentativas a espera e 60 minutos, e nao infinita.
    const velho = item({
      tentativas_envio: 200,
      ultima_tentativa_em: new Date(agora - 61 * 60_000).toISOString(),
    })
    expect(estaNaHora(velho, agora)).toBe(true)
  })
})
