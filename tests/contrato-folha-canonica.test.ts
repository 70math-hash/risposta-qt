/**
 * A folha canônica contra o que existe de verdade.
 *
 * POR QUE ISTO E NECESSARIO
 *   `docs/arquitetura/00-canonico.md` tem PRECEDENCIA sobre todo o resto, inclusive sobre o codigo.
 *   A regra 2 da secao 0 dela diz que nome que falta entra por edicao da folha PRIMEIRO, e so depois
 *   aparece no documento ou no SQL.
 *
 *   Durante a construcao essa regra foi violada em silencio, e o resultado foi uma folha que listava
 *   cinco funcoes enquanto o SQL criava onze, e que nao mencionava cinco dominios fechados que o
 *   banco recusa. Folha desatualizada e PIOR que folha ausente: ela tem precedencia, entao quem a le
 *   para decidir decide errado, com confianca.
 *
 *   O caso mais caro veio exatamente dai: o dominio de `tela_evento.tela` nao estava na folha, as
 *   duas pontas escolheram nomes diferentes, e o `CHECK` passou a recusar ~85% das respostas.
 *
 * O QUE ESTE ARQUIVO NAO FAZ
 *   Nao confere prosa. Confere as LISTAS que a folha declara como lei — funcoes, views, dominios
 *   fechados, papeis — contra as migrations. Uma folha pode estar mal escrita e passar aqui; o que
 *   ela nao pode e afirmar que existem cinco funcoes quando existem onze.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { erroPadraoNps } from '../src/comum/nps.js'

const FOLHA = readFileSync(join(process.cwd(), 'docs', 'arquitetura', '00-canonico.md'), 'utf8')

const SQL = readdirSync(join(process.cwd(), 'supabase', 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(process.cwd(), 'supabase', 'migrations', f), 'utf8'))
  .join('\n')

const RETRATO = JSON.parse(
  readFileSync(join(process.cwd(), 'supabase', 'formas-das-views.json'), 'utf8'),
) as Record<string, string[]>

describe('as funções', () => {
  const doSql = new Set(
    [...SQL.matchAll(/create or replace function experiencia\.(fn_[a-z_]+)\(/g)].map((m) => m[1]!),
  )

  it('o SQL cria as funções que se espera', () => {
    // Se este numero mudar, a folha tem de mudar junto — e e esse o ponto do arquivo.
    expect(doSql.size).toBeGreaterThanOrEqual(10)
  })

  it.each([...doSql].sort())('%s está listada na folha', (fn) => {
    expect(
      FOLHA.includes(fn),
      `${fn} existe no SQL e não está na folha canônica. A regra 2 da seção 0 diz que o nome ` +
        'entra na folha primeiro. Folha desatualizada tem precedência e mente.',
    ).toBe(true)
  })

  it('a folha não promete função que o SQL não cria', () => {
    // O erro inverso, e igualmente ruim: quem le a folha planeja com uma funcao que nao existe.
    const naFolha = new Set([...FOLHA.matchAll(/`(fn_[a-z_]+)\(/g)].map((m) => m[1]!))
    const inventadas = [...naFolha].filter((f) => !doSql.has(f))
    expect(inventadas, `a folha lista funções que nenhuma migration cria: ${inventadas.join(', ')}`).toEqual(
      [],
    )
  })

  it('nenhum documento afirma um número de funções que contradiz o SQL', () => {
    // A frase "5 funcoes fn_" estava no diagrama de `01-arquitetura` enquanto existiam nove, e
    // diagrama e o que as pessoas leem primeiro.
    const arquitetura = readFileSync(
      join(process.cwd(), 'docs', 'arquitetura', '01-arquitetura.md'),
      'utf8',
    )
    for (const doc of [FOLHA, arquitetura]) {
      expect(doc).not.toMatch(/\b5 (funções|funcoes) `?fn_/)
      expect(doc).not.toMatch(/\b25 views/)
    }
  })
})

describe('as views', () => {
  const daFolha = new Set([...FOLHA.matchAll(/`(vw_[a-z_]+)`/g)].map((m) => m[1]!))

  /**
   * So a regiao que LISTA as views (secoes 6.2 e 6.3).
   *
   * A folha cita `vw_respostas` na tabela de convencao de nomenclatura, na coluna do que e ERRADO —
   * o contraexemplo de plural. A primeira versao deste caso leu o arquivo inteiro e acusou a folha
   * de prometer uma view que ela esta justamente proibindo.
   */
  const listaDeViews = FOLHA.slice(FOLHA.indexOf('### 6.2'), FOLHA.indexOf('### 6.4'))
  const prometidas = new Set(
    [...listaDeViews.matchAll(/`(vw_[a-z_]+)`/g)].map((m) => m[1]!),
  )

  it.each(Object.keys(RETRATO).sort())('%s está listada na folha', (view) => {
    expect(
      daFolha.has(view),
      `${view} existe no banco e não está na folha canônica`,
    ).toBe(true)
  })

  it('a folha não promete view que não existe', () => {
    const inventadas = [...prometidas].filter((v) => RETRATO[v] === undefined)
    expect(inventadas, `a folha lista views que não existem: ${inventadas.join(', ')}`).toEqual([])
  })
})

describe('os domínios fechados', () => {
  /**
   * Os valores de cada `check (coluna in (...))` das migrations, por constraint.
   *
   * A conferencia e "todo valor que o banco aceita aparece na folha". O contrario — valor na folha
   * que o banco recusa — e coberto por `contrato-telas.test.ts`, que compara conjunto com conjunto.
   */
  function valoresDoCheck(constraint: string): string[] {
    const i = SQL.indexOf(constraint)
    if (i < 0) return []
    const abre = SQL.indexOf('(', SQL.indexOf(' in ', i))
    let nivel = 0
    let fim = -1
    for (let j = abre; j < SQL.length; j++) {
      if (SQL[j] === '(') nivel++
      else if (SQL[j] === ')') {
        nivel--
        if (nivel === 0) {
          fim = j
          break
        }
      }
    }
    return [...SQL.slice(abre + 1, fim).matchAll(/'([^']+)'/g)].map((m) => m[1]!)
  }

  const CONSTRAINTS = [
    'tela_evento_tela_dominio',
    'resposta_opcao_tela_dominio',
    'pergunta_banco_peso_dominio',
    'execucao_importacao_origem_dominio',
    'execucao_rotina_passo_dominio',
    'mesa_area_dominio',
    'dispositivo_uso_dominio',
    'item_cardapio_grupo_dominio',
    'consentimento_finalidade_dominio',
    'tentativa_desfecho_dominio',
    'resposta_canal_dominio',
    'resposta_idioma_dominio',
    'execucao_rotina_dominio',
  ]

  it.each(CONSTRAINTS)('todo valor de %s aparece na folha', (constraint) => {
    const valores = valoresDoCheck(constraint)
    expect(valores.length, `${constraint} não foi encontrada nas migrations`).toBeGreaterThan(0)
    const faltando = valores.filter((v) => !FOLHA.includes(`\`${v}\``))
    expect(
      faltando,
      `${constraint} aceita valores que a folha não lista: ${faltando.join(', ')}. ` +
        'Domínio fechado ausente da folha foi a causa do erro que recusava 85% das respostas.',
    ).toEqual([])
  })
})

describe('os papéis do banco', () => {
  it('os quatro papéis que decidem permissão estão na folha', () => {
    // `authenticated` e `authenticator` entraram depois, e sao os dois que decidem se a matriz de
    // permissoes vale: sem o primeiro o painel nao le, e sem o segundo o Worker escreve como
    // `service_role` e nada da matriz vale.
    for (const papel of [
      'experiencia_app',
      'experiencia_leitura',
      'authenticated',
      'authenticator',
    ]) {
      expect(FOLHA.includes(papel), `o papel \`${papel}\` não está na folha`).toBe(true)
    }
  })

  it('a folha diz que o papel de escrita decide se a matriz vale', () => {
    // Sem esta ressalva, a folha descreve uma proteção que pode não estar ativa.
    expect(FOLHA).toContain('service_role')
    expect(FOLHA).toContain('SUPABASE_JWT_SECRET')
  })
})

describe('o que a folha declara como armazenamento local', () => {
  it('os dois armazenamentos do PWA estão listados', () => {
    // O código cria `fila_resposta` e `fila_tentativa`; a folha fixava só o primeiro.
    for (const nome of ['fila_resposta', 'fila_tentativa']) {
      expect(FOLHA.includes(nome), `\`${nome}\` não está na folha`).toBe(true)
    }
    const fila = readFileSync(join(process.cwd(), 'src', 'coleta', 'fila.ts'), 'utf8')
    expect(fila).toContain('fila_resposta')
    expect(fila).toContain('fila_tentativa')
  })
})

describe('os números canônicos de NPS batem com o que o código calcula', () => {
  /**
   * `N06` dizia faixa de ±20,5 com n=50, e a conta da ±20,6: com o numerador de variancia de 0,55
   * que os tres numeros assumem, `raiz(0,55/50) x 100 = 10,4881` e `1,96 x 10,4881 = 20,56`.
   *
   * Numero canonico errado e caro de um jeito particular: ele tem precedencia, entao quem confere o
   * codigo contra ele conclui que o CODIGO esta errado, e "corrige" o certo.
   */
  const P = 0.55
  const Q = (2.1 - Math.sqrt(3.2)) / 2

  it.each([
    { n: 50, faixa: '±20,6' },
    { n: 100, faixa: '±14,5' },
    { n: 200, faixa: '±10,3' },
  ])('a folha declara $faixa para n=$n, e a formula concorda', ({ n, faixa }) => {
    const ep = erroPadraoNps(P, Q, n)
    const calculada = `±${(1.96 * ep).toFixed(1).replace('.', ',')}`
    expect(calculada, `a formula da ${calculada} para n=${n}`).toBe(faixa)
    expect(FOLHA.includes(faixa), `a folha não traz ${faixa} para n=${n}`).toBe(true)
  })

  it('a folha não traz mais o valor antigo de N06', () => {
    // `±20,5` continua aparecendo em N09 (a diferença mínima com n=100), então a busca é pelo par
    // erro padrão + faixa que só existia na linha errada.
    expect(FOLHA).not.toMatch(/erro padrão \*\*10,5\*\*, faixa \*\*±20,5/)
  })
})
