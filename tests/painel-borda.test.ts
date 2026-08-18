/**
 * Os dois defeitos que apagaram o painel inteiro, e que nenhuma camada pegava.
 *
 * O CONTEXTO
 *   O painel foi aberto de verdade num navegador, contra um Postgres com dado, pela primeira vez.
 *   As nove abas mostravam cabecalho, barra de abas e NADA. Duas causas independentes, e as duas
 *   invisiveis para `tsc`, para os testes de contrato e para o ensaio em SQL:
 *
 *   1. `const estado = <Estado .../>; if (estado !== null) return estado`. Elemento JSX e um
 *      objeto: `!== null` e sempre verdadeiro. Toda aba retornava cedo. O componente devolvia
 *      `null` depois de carregado, mas isso e o RESULTADO da renderizacao, e nao o valor da
 *      expressao — e o `if` olha a expressao.
 *
 *   2. `numeric` e `bigint` chegam do PostgREST como STRING, entre aspas, porque nao cabem em
 *      `double` sem perder precisao. As interfaces geradas diziam `number`, e o painel chamava
 *      `.toFixed()`: `v.toFixed is not a function`, em 43 colunas de 20 views.
 *
 * POR QUE ESTE ARQUIVO NAO RENDERIZA COMPONENTE
 *   Renderizar exigiria jsdom e uma biblioteca de teste de componente, ou seja duas dependencias
 *   novas num projeto cuja restricao declarada e que ninguem vai mante-lo. As duas causas foram
 *   extraidas para funcoes PURAS — `estadoDaView` e `converteNumericos` — justamente para poderem
 *   ser conferidas sem DOM. O que sobra de risco visual esta anotado no README.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { converteNumericos } from '../src/painel/dados.js'
import { estadoDaView } from '../src/painel/Painel.js'

describe('estadoDaView devolve null quando ha o que mostrar', () => {
  it('carregado e sem erro e NULL, e nao um elemento que renderiza vazio', () => {
    // Este e o caso exato do defeito: antes, a aba recebia um elemento e concluia "tem estado".
    expect(estadoDaView(false, null)).toBeNull()
  })

  it('carregando devolve elemento', () => {
    expect(estadoDaView(true, null)).not.toBeNull()
  })

  it('com erro devolve elemento', () => {
    expect(estadoDaView(false, 'vw_hoje: nao existe')).not.toBeNull()
  })
})

describe('nenhuma aba volta a comparar um elemento JSX com null', () => {
  const PAINEL = readFileSync(join(process.cwd(), 'src', 'painel', 'Painel.tsx'), 'utf8')

  it('não existe `const x = <Componente ... />` seguido de comparação com null', () => {
    // A forma do defeito, e nao o nome dele: qualquer componente serve para reintroduzi-lo.
    const suspeitas = [...PAINEL.matchAll(/const\s+(\w+)\s*=\s*<[A-Z]/g)].map((m) => m[1]!)
    const comparados = suspeitas.filter((v) =>
      new RegExp(`\\b${v}\\s*!==?\\s*null`).test(PAINEL),
    )
    expect(
      comparados,
      `${comparados.join(', ')} recebe JSX e é comparado com null. Elemento JSX é objeto: a ` +
        'comparação é sempre verdadeira, e a aba devolve cedo sem mostrar nada.',
    ).toEqual([])
  })
})

describe('a conversão está LIGADA em `le()`, e não só implementada', () => {
  /**
   * A funcao pura passar em teste nao prova nada se ninguem a chamar.
   *
   * Foi exatamente o que aconteceu na primeira versao destes casos: eles conferiam
   * `converteNumericos` isoladamente, e continuavam VERDES depois de eu tirar a chamada de dentro
   * de `le()`. E a mesma classe do `contato_em` (A29) — a cadeia inteira existindo menos o ultimo
   * elo — e ela merece guarda propria, porque e a que mais engana.
   */
  const DADOS = readFileSync(join(process.cwd(), 'src', 'painel', 'dados.ts'), 'utf8')

  it('`le()` chama `converteNumericos` no caminho da leitura', () => {
    const corpo = DADOS.slice(
      DADOS.indexOf('export async function le<T>'),
      DADOS.indexOf('// -----------------------------------------------------------------------------\n// As formas das views.'),
    )
    expect(corpo.length, 'não achei o corpo de `le()`').toBeGreaterThan(200)
    expect(
      corpo,
      '`le()` parou de converter os `numeric`. A função existe, passa nos casos abaixo, e o ' +
        'painel volta a receber string onde a interface promete número.',
    ).toContain('converteNumericos(view,')
  })
})

describe('converteNumericos transforma o que o PostgREST manda entre aspas', () => {
  const COLUNAS = JSON.parse(
    readFileSync(join(process.cwd(), 'supabase', 'colunas-numericas.json'), 'utf8'),
  ) as Record<string, string[]>

  it('a lista foi gerada e cobre as views que têm numeric', () => {
    // Se cair para zero, o gerador parou de emitir a lista e a conversao vira no-op silencioso.
    expect(Object.keys(COLUNAS).length).toBeGreaterThanOrEqual(15)
    expect(COLUNAS['vw_nps_janela']).toContain('nps')
  })

  it('o NPS chega "-100.0" e vira -100', () => {
    const [linha] = converteNumericos('vw_nps_janela', [
      { janela: 'dia', nps: '-100.0', erro_padrao: '33.5', n: 3 },
    ]) as Array<Record<string, unknown>>
    expect(linha!['nps']).toBe(-100)
    expect(linha!['erro_padrao']).toBe(33.5)
    // `n` ja vinha numero (integer), e continua numero.
    expect(linha!['n']).toBe(3)
  })

  it('o resultado aceita `.toFixed`, que era exatamente o que estourava', () => {
    const [linha] = converteNumericos('vw_nps_janela', [{ nps: '53.8' }]) as Array<
      Record<string, number>
    >
    expect(() => linha!['nps']!.toFixed(1)).not.toThrow()
    expect(linha!['nps']!.toFixed(1)).toBe('53.8')
  })

  it('nulo continua nulo, e não vira zero', () => {
    // Zero e um valor; ausencia nao. O painel mostra travessao para nulo, e um zero inventado
    // apareceria como "NPS 0", que e uma afirmacao sobre o negocio que ninguem fez.
    const [linha] = converteNumericos('vw_nps_janela', [{ nps: null }]) as Array<
      Record<string, unknown>
    >
    expect(linha!['nps']).toBeNull()
  })

  it('texto que não é número vira nulo, e nunca NaN', () => {
    // `NaN` se propaga por toda conta seguinte e aparece na tela como `NaN%`, que parece defeito
    // de formatacao e manda quem le procurar no lugar errado.
    const [linha] = converteNumericos('vw_nps_janela', [{ nps: 'sem numero' }]) as Array<
      Record<string, unknown>
    >
    expect(linha!['nps']).toBeNull()
  })

  it('coluna de TEXTO que parece número passa intacta', () => {
    // O ponto de usar a lista do catalogo em vez de adivinhar pelo valor: `mesa_digitada` e texto,
    // e `07` virando 7 perderia o zero que o garcom digitou.
    const [linha] = converteNumericos('vw_alerta_incidente', [
      { mesa_digitada: '07', segundos_ate_envio: '12.5' },
    ]) as Array<Record<string, unknown>>
    expect(linha!['mesa_digitada']).toBe('07')
    expect(linha!['segundos_ate_envio']).toBe(12.5)
  })

  it('view fora da lista passa sem tocar em nada', () => {
    const linhas = [{ qualquer: '123' }]
    expect(converteNumericos('vw_que_nao_existe', linhas)).toEqual([{ qualquer: '123' }])
  })
})
