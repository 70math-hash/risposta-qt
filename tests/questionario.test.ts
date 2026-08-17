import { describe, expect, it } from 'vitest'
import { FATORES, fatorValido } from '../src/comum/dominio.js'
import {
  ARRANQUE_SUGERIDO,
  BANCO_PERGUNTAS,
  T1,
  T2A,
  T2B,
  T2C,
  T3C3,
  T3C_FATORES,
  T7,
  perguntaAberta,
  perguntasAtivas,
  quantasRotacionadas,
  sorteiaPerguntas,
} from '../src/coleta/questionario.js'

describe('quantasRotacionadas, a regra que mantem os caminhos dentro dos 45 s', () => {
  it('promotor recebe 2, neutro recebe 1, detrator recebe 0', () => {
    expect(quantasRotacionadas(10)).toBe(2)
    expect(quantasRotacionadas(9)).toBe(2)
    expect(quantasRotacionadas(8)).toBe(1)
    expect(quantasRotacionadas(7)).toBe(1)
    expect(quantasRotacionadas(6)).toBe(0)
    expect(quantasRotacionadas(0)).toBe(0)
  })

  it('ninguem recebe ramificacao de nota baixa E bloco rotacionado', () => {
    // A regra estrutural: detrator tem o caminho de causa, e por isso zero rotacionadas.
    for (let nota = 0; nota <= 6; nota++) {
      expect(quantasRotacionadas(nota)).toBe(0)
    }
  })
})

describe('perguntaAberta, sempre ancorada na nota', () => {
  it('muda o texto conforme a faixa, e nunca pergunta "algum comentario?"', () => {
    expect(perguntaAberta(10).pt).toBe('O que a gente fez bem hoje?')
    expect(perguntaAberta(8).pt).toBe('O que a gente pode melhorar?')
    expect(perguntaAberta(3).pt).toBe('Conta rápido o que aconteceu?')
    for (const nota of [0, 5, 7, 9, 10]) {
      expect(perguntaAberta(nota).pt).not.toMatch(/algum coment/i)
    }
  })
})

describe('integridade dos dominios: todo fator usado existe na folha canonica', () => {
  it('os seis fatores da T3C3 sao exatamente os de comida', () => {
    const daTela = T3C3.opcoes.map((op) => op.fator)
    expect(daTela).toEqual([...FATORES.comida])
  })

  it('todo fator de toda tela pertence a sua dimensao', () => {
    const todas = [
      ...T2A.opcoes,
      ...T2B.opcoes,
      ...T2C.opcoes,
      ...T3C3.opcoes,
      ...Object.values(T3C_FATORES).flatMap((l) => l ?? []),
    ]
    for (const op of todas) {
      if (op.fator !== undefined) {
        expect(
          fatorValido(op.dimensao, op.fator),
          `${op.dimensao}/${op.fator} nao existe no dominio`,
        ).toBe(true)
      }
    }
  })

  it('todo fator do banco de perguntas pertence a sua dimensao', () => {
    for (const p of BANCO_PERGUNTAS) {
      if (p.fator !== undefined) {
        expect(
          fatorValido(p.dimensao, p.fator),
          `pergunta ${p.numero}: ${p.dimensao}/${p.fator} nao existe`,
        ).toBe(true)
      }
    }
  })
})

describe('o banco de perguntas', () => {
  it('tem exatamente 20 perguntas, numeradas de 1 a 20 sem lacuna', () => {
    expect(BANCO_PERGUNTAS).toHaveLength(20)
    expect(BANCO_PERGUNTAS.map((p) => p.numero)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    )
  })

  it('o arranque sugerido tem 12 perguntas, que e N19', () => {
    expect(ARRANQUE_SUGERIDO).toHaveLength(12)
    expect(perguntasAtivas(ARRANQUE_SUGERIDO)).toHaveLength(12)
  })

  it('o arranque inclui as sete de peso alto citadas na especificacao', () => {
    for (const n of [1, 2, 3, 4, 11, 15, 17]) {
      expect(ARRANQUE_SUGERIDO).toContain(n)
    }
  })

  it('nenhuma pergunta do banco usa teclado: todas tem opcoes de toque', () => {
    for (const p of BANCO_PERGUNTAS) {
      expect(p.opcoes.length, `pergunta ${p.numero} sem opcoes`).toBeGreaterThan(0)
    }
  })

  it('nenhuma pergunta do banco pede nota de 1 a 5 nem escala numerica', () => {
    for (const p of BANCO_PERGUNTAS) {
      for (const op of p.opcoes) {
        expect(op.pt, `pergunta ${p.numero}`).not.toMatch(/^[1-5]$/)
      }
    }
  })

  it('nenhuma pergunta do banco menciona garcom nomeado', () => {
    // Perguntar o nome destroi o anonimato percebido, que e o motor do volume.
    for (const p of BANCO_PERGUNTAS) {
      expect(p.texto.pt).not.toMatch(/nome do gar/i)
    }
  })

  it('as sete perguntas temporarias estao marcadas e dizem quando saem', () => {
    const temporarias = BANCO_PERGUNTAS.filter((p) => p.temporaria).map((p) => p.numero)
    expect(temporarias).toEqual([1, 4, 9, 10, 16, 19, 20])
    for (const p of BANCO_PERGUNTAS.filter((x) => x.temporaria)) {
      expect(p.saiQuando).not.toBe('nunca')
      expect(p.saiQuando.length).toBeGreaterThan(10)
    }
  })

  it('toda pergunta tem texto e opcoes nos dois idiomas', () => {
    for (const p of BANCO_PERGUNTAS) {
      expect(p.texto.pt.length, `pergunta ${p.numero} pt`).toBeGreaterThan(0)
      expect(p.texto.en.length, `pergunta ${p.numero} en`).toBeGreaterThan(0)
      for (const op of p.opcoes) {
        expect(op.pt.length).toBeGreaterThan(0)
        expect(op.en.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('sorteiaPerguntas', () => {
  const ativas = perguntasAtivas(ARRANQUE_SUGERIDO)

  it('devolve a quantidade pedida, sem repetir na mesma resposta', () => {
    const escolhidas = sorteiaPerguntas(ativas, 2, () => 0.5)
    expect(escolhidas).toHaveLength(2)
    expect(new Set(escolhidas.map((p) => p.numero)).size).toBe(2)
  })

  it('nunca devolve mais do que existe disponivel', () => {
    const escolhidas = sorteiaPerguntas(ativas.slice(0, 1), 2, () => 0.5)
    expect(escolhidas).toHaveLength(1)
  })

  it('devolve lista vazia quando a quantidade e zero, que e o caso do detrator', () => {
    expect(sorteiaPerguntas(ativas, 0, () => 0.5)).toHaveLength(0)
  })

  it('peso alto e sorteado com mais frequencia que peso baixo', () => {
    // Sorteio determinístico por semente linear, para a proporcao ser conferivel.
    let semente = 0
    const aleatorio = () => {
      semente = (semente * 9301 + 49297) % 233280
      return semente / 233280
    }
    const contagem = new Map<string, number>()
    for (let i = 0; i < 3000; i++) {
      for (const p of sorteiaPerguntas(BANCO_PERGUNTAS, 1, aleatorio)) {
        const chave = p.peso
        contagem.set(chave, (contagem.get(chave) ?? 0) + 1)
      }
    }
    const alto = contagem.get('alto') ?? 0
    const medio = contagem.get('medio') ?? 0
    const baixo = contagem.get('baixo') ?? 0
    expect(alto).toBeGreaterThan(medio)
    expect(medio).toBeGreaterThan(baixo)
  })
})

describe('T7, o encerramento', () => {
  it('so agradece, e reseta em 8 segundos', () => {
    expect(T7.autoResetSegundos).toBe(8)
    expect(T7.texto.pt).toBe('Obrigado. Boa noite.')
  })

  it('nao cita Google, cupom nem Instagram em nenhum idioma', () => {
    const proibido = /google|cupom|coupon|instagram|avalie|review/i
    expect(T7.texto.pt).not.toMatch(proibido)
    expect(T7.texto.en).not.toMatch(proibido)
  })
})

describe('T1, a unica obrigatoria', () => {
  it('promete anonimato de forma explicita, porque e o motor do volume', () => {
    expect(T1.rodape.pt).toContain('anônima')
    expect(T1.rodape.pt).toContain('garçom não vê')
  })

  it('a escala e de 0 a 10, e as ancoras dizem os dois extremos', () => {
    expect(T1.ancoraEsquerda.pt).toContain('0')
    expect(T1.ancoraDireita.pt).toContain('10')
  })
})

describe('T2A e T2B compartilham as oito opcoes', () => {
  it('sao as mesmas oito, e o maximo e 2', () => {
    expect(T2A.opcoes).toHaveLength(8)
    expect(T2B.opcoes).toEqual(T2A.opcoes)
    expect(T2A.maximo).toBe(2)
    expect(T2B.maximo).toBe(2)
  })
})

describe('T2C, o caminho do detrator', () => {
  it('so a opcao de comida abre o caminho de item', () => {
    const abrem = T2C.opcoes.filter((op) => op.abre === 'grupo_item')
    expect(abrem).toHaveLength(1)
    expect(abrem[0]!.codigo).toBe('comida')
  })

  it('a opcao "outra coisa" nao abre tela de fator, vai direto para a aberta', () => {
    const outra = T2C.opcoes.find((op) => op.codigo === 'outra')
    expect(outra?.abre).toBeUndefined()
  })

  it('toda opcao que abre tela de fator tem lista de fatores definida', () => {
    for (const op of T2C.opcoes.filter((x) => x.abre === 'fator')) {
      const lista = T3C_FATORES[op.dimensao]
      expect(lista, `sem fatores para ${op.dimensao}`).toBeDefined()
      expect(lista!.length).toBeGreaterThan(1)
    }
  })
})
