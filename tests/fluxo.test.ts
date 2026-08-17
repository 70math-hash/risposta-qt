import { describe, expect, it } from 'vitest'
import {
  caminhoCompleto,
  proximoPasso,
  quantasRotacionadas,
  type EstadoFluxo,
  type Passo,
} from '../src/coleta/questionario.js'

const estado = (nota: number, extra: Partial<EstadoFluxo> = {}): EstadoFluxo => ({
  nota,
  rotacionadas: quantasRotacionadas(nota),
  ...extra,
})

describe('proximoPasso, a ramificacao por nota', () => {
  it('nota 9 ou 10 vai para T2A', () => {
    expect(proximoPasso('T1', estado(10))).toBe('T2A')
    expect(proximoPasso('T1', estado(9))).toBe('T2A')
  })

  it('nota 7 ou 8 vai para T2B', () => {
    expect(proximoPasso('T1', estado(8))).toBe('T2B')
    expect(proximoPasso('T1', estado(7))).toBe('T2B')
  })

  it('nota 0 a 6 vai para T2C', () => {
    for (const n of [0, 3, 6]) expect(proximoPasso('T1', estado(n))).toBe('T2C')
  })
})

describe('a invariante central: nota baixa nunca recebe bloco rotacionado', () => {
  it('nenhum caminho de detrator passa por ROT1 nem ROT2', () => {
    const causas = ['grupo_item', 'fator', 'nenhuma'] as const
    for (const causa of causas) {
      for (const temItens of [true, false]) {
        for (let nota = 0; nota <= 6; nota++) {
          const caminho = caminhoCompleto(estado(nota, { causa, temItensDoGrupo: temItens }))
          expect(caminho, `nota ${nota} causa ${String(causa)}`).not.toContain('ROT1')
          expect(caminho).not.toContain('ROT2')
        }
      }
    }
  })

  it('promotor recebe duas rotacionadas e neutro recebe uma', () => {
    expect(caminhoCompleto(estado(10))).toContain('ROT1')
    expect(caminhoCompleto(estado(10))).toContain('ROT2')
    expect(caminhoCompleto(estado(8))).toContain('ROT1')
    expect(caminhoCompleto(estado(8))).not.toContain('ROT2')
  })
})

describe('o caminho de comida, que e o mais longo', () => {
  it('com catalogo carregado passa por T3C1, T3C2 e T3C3', () => {
    const c = caminhoCompleto(estado(3, { causa: 'grupo_item', temItensDoGrupo: true }))
    expect(c).toContain('T3C1')
    expect(c).toContain('T3C2')
    expect(c).toContain('T3C3')
  })

  it('sem catalogo pula a T3C2 em vez de mostrar tela vazia', () => {
    const c = caminhoCompleto(estado(3, { causa: 'grupo_item', temItensDoGrupo: false }))
    expect(c).toContain('T3C1')
    expect(c).not.toContain('T3C2')
    expect(c).toContain('T3C3')
  })

  it('e o caminho com mais telas de conteudo, e ainda assim tem cinco', () => {
    const conteudo = caminhoCompleto(
      estado(3, { causa: 'grupo_item', temItensDoGrupo: true }),
    ).filter((p) => !['T0', 'T7'].includes(p))
    // T1, T2C, T3C1, T3C2, T3C3, T5, T6
    expect(conteudo).toHaveLength(7)
  })
})

describe('todo caminho termina em T7, sem laco infinito', () => {
  const casos: EstadoFluxo[] = [
    estado(10),
    estado(9),
    estado(8),
    estado(7),
    estado(6, { causa: 'fator' }),
    estado(4, { causa: 'grupo_item', temItensDoGrupo: true }),
    estado(0, { causa: 'nenhuma' }),
  ]

  for (const e of casos) {
    it(`nota ${e.nota} com causa ${String(e.causa ?? 'sem')} chega a T7`, () => {
      const c = caminhoCompleto(e)
      expect(c[c.length - 1]).toBe('T7')
      expect(c.length).toBeLessThan(12)
    })
  }

  it('toda resposta passa pela aberta e pelo contato antes do fim', () => {
    for (const e of casos) {
      const c = caminhoCompleto(e)
      expect(c).toContain('T5')
      expect(c).toContain('T6')
      // A ordem importa: contato vem depois da aberta, sempre.
      expect(c.indexOf('T6')).toBeGreaterThan(c.indexOf('T5'))
    }
  })
})

describe('T7 volta para T0, e nunca para o meio do fluxo', () => {
  it('reinicia na tela do garcom', () => {
    expect(proximoPasso('T7', estado(10))).toBe('T0')
  })
})

describe('a funcao cobre todos os passos, sem caso sem saida', () => {
  const todos: Passo[] = ['T0','T1','T2A','T2B','T2C','T3C1','T3C2','T3C3','T3C','ROT1','ROT2','T5','T6','T7']
  it('nenhum passo devolve undefined', () => {
    for (const p of todos) {
      expect(proximoPasso(p, estado(10, { causa: 'fator', temItensDoGrupo: true }))).toBeDefined()
    }
  })
})
