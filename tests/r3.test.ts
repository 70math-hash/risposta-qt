import { describe, expect, it } from 'vitest'
import {
  divideLinha,
  interpretaData,
  interpretaR3,
  normalizaNome,
  numeroBr,
} from '../worker/rotinas/r3.js'

describe('normalizaNome, a chave de reserva', () => {
  it('tira acento e sobe para maiusculas, como o R3 faz', () => {
    expect(normalizaNome('Rúcola')).toBe('RUCOLA')
    expect(normalizaNome('Fantástica')).toBe('FANTASTICA')
    expect(normalizaNome('  Pão   da  Casa ')).toBe('PAO DA CASA')
  })

  it('e estavel: normalizar duas vezes da o mesmo resultado', () => {
    const uma = normalizaNome('Açaí com Granola')
    expect(normalizaNome(uma)).toBe(uma)
  })
})

describe('numeroBr', () => {
  it('aceita decimal brasileiro', () => {
    expect(numeroBr('1.234,56')).toBe(1234.56)
    expect(numeroBr('89,90')).toBe(89.9)
  })
  it('aceita decimal americano', () => {
    expect(numeroBr('1234.56')).toBe(1234.56)
  })
  it('tira simbolo de moeda e espaco', () => {
    expect(numeroBr('R$ 1.500,00')).toBe(1500)
  })
  it('devolve null para o que nao e numero', () => {
    expect(numeroBr('')).toBeNull()
    expect(numeroBr('abc')).toBeNull()
  })
})

describe('divideLinha', () => {
  it('respeita aspas com separador dentro', () => {
    expect(divideLinha('1;"PIZZA, GRANDE";10', ';')).toEqual(['1', 'PIZZA, GRANDE', '10'])
  })
  it('trata aspas escapadas', () => {
    expect(divideLinha('a;"diz ""oi""";b', ';')).toEqual(['a', 'diz "oi"', 'b'])
  })
})

describe('interpretaData', () => {
  it('aceita os dois formatos plausiveis de export brasileiro', () => {
    expect(interpretaData('2026-08-04')).toBe('2026-08-04')
    expect(interpretaData('04/08/2026')).toBe('2026-08-04')
    expect(interpretaData('agosto')).toBeNull()
  })
})

describe('interpretaR3', () => {
  const csv = [
    'ID;Produto;Grupo;Quantidade;Valor Liquido',
    '1042;MARGHERITA;PIZZAS;12;1.078,80',
    '1043;RUCOLA;PIZZAS;7;679,00',
    '2001;ARANCINI;ENTRADAS;5;245,00',
  ].join('\n')

  it('le id, nome normalizado, unidades e valor', () => {
    const r = interpretaR3(csv, '2026-08-04')
    expect(r.erros).toEqual([])
    expect(r.linhas).toHaveLength(3)
    expect(r.linhas[0]).toEqual({
      dia_operacional: '2026-08-04',
      produto_id_pdv: '1042',
      produto_nome_norm: 'MARGHERITA',
      unidades: 12,
      valor_liquido: 1078.8,
    })
  })

  it('usa o id como chave preferida e conta quantas linhas vieram sem id', () => {
    const semId = ['ID;Produto;Valor Liquido', ';MARGHERITA;100,00'].join('\n')
    const r = interpretaR3(semId, '2026-08-04')
    expect(r.linhas[0]!.produto_id_pdv).toBeNull()
    expect(r.sem_id).toBe(1)
  })

  it('descarta linha de total, que dobraria o faturamento sem ninguem notar', () => {
    const comTotal = [csv, 'TOTAL;;;24;2.002,80', 'TOTAIS GERAIS;;;24;2.002,80'].join('\n')
    const r = interpretaR3(comTotal, '2026-08-04')
    expect(r.linhas).toHaveLength(3)
    const soma = r.linhas.reduce((s, l) => s + l.valor_liquido, 0)
    expect(soma).toBeCloseTo(2002.8, 2)
  })

  it('detecta separador virgula e tabulacao, nao so ponto e virgula', () => {
    const comVirgula = 'ID,Produto,Valor Liquido\n1042,MARGHERITA,1078.80'
    expect(interpretaR3(comVirgula, '2026-08-04').linhas).toHaveLength(1)
    const comTab = 'ID\tProduto\tValor Liquido\n1042\tMARGHERITA\t1078.80'
    expect(interpretaR3(comTab, '2026-08-04').linhas).toHaveLength(1)
  })

  it('acha coluna por nome aproximado, porque o cabecalho exato e NAO VERIFICADO', () => {
    const variante = 'Cod;Descricao;Qtde;Venda Liquida\n9;PAO DA CASA;3;45,00'
    const r = interpretaR3(variante, '2026-08-04')
    expect(r.linhas).toHaveLength(1)
    expect(r.linhas[0]!.produto_id_pdv).toBe('9')
    expect(r.linhas[0]!.unidades).toBe(3)
  })

  it('falha com mensagem util quando o cabecalho nao tem o essencial', () => {
    const ruim = 'Coluna A;Coluna B\n1;2'
    const r = interpretaR3(ruim, '2026-08-04')
    expect(r.linhas).toHaveLength(0)
    expect(r.erros.join(' ')).toContain('nome do produto')
    // A mensagem inclui os cabecalhos lidos, senao diagnosticar exige abrir o arquivo.
    expect(r.erros.join(' ')).toContain('Coluna A')
  })

  it('le a data do arquivo quando ela existe', () => {
    const comData = 'Data;ID;Produto;Valor Liquido\n04/08/2026;1042;MARGHERITA;1078,80'
    const r = interpretaR3(comData)
    expect(r.linhas[0]!.dia_operacional).toBe('2026-08-04')
  })

  it('recusa a linha quando nao ha data no arquivo nem informada', () => {
    const r = interpretaR3('ID;Produto;Valor Liquido\n1042;MARGHERITA;1078,80')
    expect(r.linhas).toHaveLength(0)
    expect(r.erros.join(' ')).toContain('sem data')
  })

  it('arquivo vazio nao explode', () => {
    expect(interpretaR3('').linhas).toHaveLength(0)
    expect(interpretaR3('').erros[0]).toContain('vazio')
  })
})
