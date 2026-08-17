/**
 * Teste de contrato entre as colunas que o Worker pede e as colunas que existem.
 *
 * Existe por causa de tres bugs reais, achados ao rodar as migrations num Postgres de
 * ensaio e comparar as colunas de verdade com as strings de consulta:
 *
 *   1. `select=id,nome,grupo` em `item_cardapio`, que tem `nome_pt` e `nome_en`, e nao
 *      `nome`. Isso ja seria fatal sozinho.
 *   2. `select=versao,texto_curto` em `consentimento_texto`, que tem `texto`.
 *   3. `order=nome`, pela mesma coluna inexistente.
 *
 * Por que doia tanto: `getCatalogo` faz as quatro consultas em `Promise.all`, entao UMA
 * coluna errada derruba o catalogo INTEIRO. E o `catch` de `getCatalogo` devolve catalogo
 * vazio de proposito, para a coleta nao parar por causa de uma tela opcional. As duas
 * decisoes juntas produzem o pior resultado possivel: o quiosque abre, coleta nota,
 * funciona, e simplesmente nunca mostra a tela de item nem grava pergunta sorteada
 * nenhuma. Ninguem recebe erro. O painel mostra a aba de pratos vazia para sempre, e a
 * conclusao natural de quem olha e "os clientes nao reclamam de item nenhum".
 *
 * Nada disso aparece em `tsc`: o nome da coluna e uma string, e o tipo generico de
 * `seleciona<T>` e uma afirmacao do autor, nao uma verificacao.
 *
 * Este teste le o DDL das migrations e as strings do Worker. Nao precisa de banco.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const DIR = join(process.cwd(), 'supabase', 'migrations')

function todoSql(): string {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(DIR, f), 'utf8'))
    .join('\n')
}

/**
 * Colunas por tabela, lidas do `create table` de verdade.
 *
 * O corpo e recortado pelo parenteses de abertura ate a linha que fecha na coluna zero,
 * que e a forma como todas as migrations do projeto escrevem tabela. De cada linha
 * aproveita-se o primeiro identificador, e descartam-se as linhas de constraint de tabela
 * (`primary key (...)`, `unique (...)`, `constraint ...`, `check (...)`, `foreign key`).
 */
function colunasPorTabela(sql: string): Map<string, Set<string>> {
  const mapa = new Map<string, Set<string>>()
  const re = /create table (?:if not exists )?experiencia\.([a-z_]+)\s*\(/g
  for (const m of sql.matchAll(re)) {
    const nome = m[1]!
    const abre = m.index + m[0].length
    const fecha = sql.indexOf('\n)', abre)
    if (fecha < 0) continue
    const corpo = sql.slice(abre, fecha)
    const colunas = new Set<string>()
    for (const linha of corpo.split('\n')) {
      const limpa = linha.replace(/--.*$/, '').trim()
      if (limpa === '') continue
      if (/^(primary key|unique|constraint|check|foreign key|exclude)\b/i.test(limpa)) continue
      const id = /^([a-z_][a-z0-9_]*)\b/.exec(limpa)
      if (id !== null) colunas.add(id[1]!)
    }
    mapa.set(nome, colunas)
  }

  // As colunas acrescentadas depois, por `alter table ... add column`. Sem esta segunda
  // passada, o DDL lido aqui e o DDL da primeira migration e nao o do banco: `contagens` de
  // `execucao_rotina` nasceu numa migration additiva e o teste a acusaria de inexistente.
  const reAlter =
    /alter table (?:if exists )?experiencia\.([a-z_]+)\s+add column (?:if not exists )?([a-z_][a-z0-9_]*)/gi
  for (const m of sql.matchAll(reAlter)) {
    const tabela = m[1]!.toLowerCase()
    if (!mapa.has(tabela)) mapa.set(tabela, new Set())
    mapa.get(tabela)!.add(m[2]!.toLowerCase())
  }

  return mapa
}

/** Cada `seleciona(env, 'tabela', 'select=...&...')` do Worker, como (tabela, consulta). */
function consultasDoWorker(): { tabela: string; consulta: string }[] {
  const fonte = readFileSync(join(process.cwd(), 'worker', 'index.ts'), 'utf8')
  const re = /seleciona<[^>]*>\(\s*env,\s*'([a-z_]+)',\s*'([^']+)'/g
  return [...fonte.matchAll(re)].map((m) => ({ tabela: m[1]!, consulta: m[2]! }))
}

/** Toda coluna citada numa consulta PostgREST: no `select`, no `order` e nos filtros. */
function colunasCitadas(consulta: string): string[] {
  const citadas: string[] = []
  for (const parte of consulta.split('&')) {
    const igual = parte.indexOf('=')
    if (igual < 0) continue
    const chave = parte.slice(0, igual)
    const valor = parte.slice(igual + 1)

    if (chave === 'select') {
      // `col`, `apelido:col` e `col.outra` para tabela relacionada. Aqui so o nivel raso.
      for (const c of valor.split(',')) {
        const semApelido = c.includes(':') ? c.slice(c.indexOf(':') + 1) : c
        if (semApelido !== '' && !semApelido.includes('(')) citadas.push(semApelido)
      }
    } else if (chave === 'order') {
      for (const c of valor.split(',')) citadas.push(c.split('.')[0]!)
    } else if (chave !== 'limit' && chave !== 'offset') {
      // Filtro: a chave e o nome da coluna.
      citadas.push(chave)
    }
  }
  return citadas
}

describe('as colunas que o Worker pede existem nas tabelas', () => {
  const tabelas = colunasPorTabela(todoSql())
  const consultas = consultasDoWorker()

  it('o DDL foi lido e as tabelas de cadastro estao la', () => {
    for (const t of ['item_cardapio', 'pergunta_banco', 'consentimento_texto', 'mesa']) {
      expect(tabelas.has(t), `nao achei create table de ${t}`).toBe(true)
    }
    // Se este numero cair muito, o recortador de DDL quebrou e o teste passaria vazio.
    expect(tabelas.size).toBeGreaterThanOrEqual(20)
  })

  it('o Worker faz consulta a tabela, e elas foram encontradas na fonte', () => {
    expect(consultas.length).toBeGreaterThanOrEqual(4)
  })

  it.each(consultasDoWorker())('$tabela: toda coluna citada existe', ({ tabela, consulta }) => {
    const existentes = tabelas.get(tabela)
    expect(existentes, `o Worker le a tabela ${tabela}, que nenhuma migration cria`).toBeDefined()
    const faltando = colunasCitadas(consulta).filter((c) => !existentes!.has(c))
    expect(
      faltando,
      `${tabela}: coluna citada e inexistente: ${faltando.join(', ')}. ` +
        `Existem: ${[...existentes!].join(', ')}`,
    ).toEqual([])
  })

  it('item_cardapio e pedido com os dois nomes, porque o idioma e escolhido na tela', () => {
    const q = consultas.find((c) => c.tabela === 'item_cardapio')
    expect(q).toBeDefined()
    expect(q!.consulta).toContain('nome_pt')
    expect(q!.consulta).toContain('nome_en')
  })

  it('o item removido e o inativo nao chegam ao quiosque', () => {
    // Sem os dois filtros, prato tirado do cardapio continuaria aparecendo na T3C2, e a
    // reclamacao seria atribuida a um item que a casa nao serve mais.
    const q = consultas.find((c) => c.tabela === 'item_cardapio')!
    expect(q.consulta).toContain('removido_em=is.null')
    expect(q.consulta).toContain('ativo=is.true')
  })
})

// -----------------------------------------------------------------------------
// A metade da ESCRITA.
//
// As leituras acima cobrem `seleciona(...)`. As escritas eram piores, e por um motivo
// estrutural: `registraExecucao` envolve a insercao num `catch` VAZIO, de proposito, para
// falha de log nao derrubar a rotina que estava rodando. Enquanto ela mandava um campo
// `contagens` que nenhuma coluna recebia, as quatro rotinas rodavam, todo log falhava com 400
// e `/painel/saude` ficava vazio para sempre, sem uma linha de erro em lugar nenhum.
//
// O watcher do Drive tinha quatro nomes errados de uma vez (`arquivo_nome` por `arquivo`,
// `hash_arquivo` por `hash`, `linhas_lidas` por `linhas`, e o filtro de idempotencia pelo nome
// errado do hash), duas colunas NOT NULL ausentes (`origem` e `execucao_importacao_id`) e
// mandava a coluna `bytea` como texto decodificado.
// -----------------------------------------------------------------------------

/** Toda fonte do Worker, para achar escrita onde ela estiver. */
function fontesDoWorker(): { arquivo: string; texto: string }[] {
  const dir = join(process.cwd(), 'worker')
  const achados: { arquivo: string; texto: string }[] = []
  const anda = (caminho: string): void => {
    for (const entrada of readdirSync(caminho, { withFileTypes: true })) {
      const cheio = join(caminho, entrada.name)
      if (entrada.isDirectory()) anda(cheio)
      else if (entrada.name.endsWith('.ts')) {
        achados.push({ arquivo: cheio, texto: readFileSync(cheio, 'utf8') })
      }
    }
  }
  anda(dir)
  return achados
}

/** Do indice de um caractere de abertura, o indice do fechamento equilibrado. */
function fecha(texto: string, inicio: number): number {
  let nivel = 0
  for (let i = inicio; i < texto.length; i++) {
    const c = texto[i]!
    if (c === '[' || c === '{' || c === '(') nivel++
    else if (c === ']' || c === '}' || c === ')') {
      nivel--
      if (nivel === 0) return i
    }
  }
  return -1
}

/** As chaves de primeiro nivel dos objetos dentro de um trecho de codigo. */
function chavesDeObjeto(corpo: string): string[] {
  const chaves = new Set<string>()
  let profundidade = 0
  for (const linha of corpo.split('\n')) {
    const limpa = linha.replace(/\/\/.*$/, '')
    const antes = profundidade
    for (const c of limpa) {
      if (c === '{' || c === '[' || c === '(') profundidade++
      else if (c === '}' || c === ']' || c === ')') profundidade--
    }
    // Nivel 0 ou 1 e o corpo do objeto que esta sendo inserido; mais fundo e valor aninhado.
    if (antes <= 1) {
      for (const k of limpa.matchAll(
        /(?:^|[{,]|\.\.\.\([^)]*\?\s*\{)\s*([a-z_][a-z0-9_]*)\s*:/g,
      )) {
        chaves.add(k[1]!)
      }
    }
  }
  return [...chaves]
}

/**
 * As chaves de cada escrita do Worker, como (tabela, chaves).
 *
 * Duas formas de chamada, porque as duas existem na fonte:
 *
 *   insere(env, 'tabela', [ { ... } ])      objeto literal na propria chamada
 *   insere(env, 'tabela', linhas, ...)      variavel, construida por um `.map(... => ({ ... }))`
 *
 * A segunda forma e a de `venda_produto_dia`, que e a escrita mais perigosa do sistema: e a
 * unica com chave estrangeira NOT NULL e a unica com idempotencia por UNIQUE composto. Ignorar
 * a forma com variavel deixaria justamente ela sem conferencia, e o teste passaria com
 * aparencia de cobertura.
 */
function chavesEscritas(texto: string): { tabela: string; chaves: string[] }[] {
  const saida: { tabela: string; chaves: string[] }[] = []
  const re = /insere(?:<[^>]*>)?\(\s*env,\s*'([a-z_]+)',\s*([[a-zA-Z_])/g

  for (const m of texto.matchAll(re)) {
    const tabela = m[1]!
    const inicioArg = m.index + m[0].length - 1

    if (texto[inicioArg] === '[') {
      const f = fecha(texto, inicioArg)
      if (f < 0) continue
      saida.push({ tabela, chaves: chavesDeObjeto(texto.slice(inicioArg + 1, f)) })
      continue
    }

    // Variavel: acha `const <nome> = ...` e recorta o objeto que o callback devolve. Duas
    // formas de retorno, porque as duas sao idiomaticas: `=> ({ ... })` e `=> { ... return
    // { ... } }`. A segunda e a que `venda_produto_dia` usa, porque o corpo tem uma resolucao
    // de item antes do retorno.
    const nome = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(texto.slice(inicioArg))?.[0]
    if (nome === undefined) continue
    const decl = texto.indexOf(`const ${nome} = `)
    if (decl < 0 || decl > inicioArg) continue

    const seta = texto.indexOf('=> ({', decl)
    const retorno = texto.indexOf('return {', decl)
    const abre =
      seta >= 0 && seta < inicioArg
        ? seta + 3
        : retorno >= 0 && retorno < inicioArg
          ? retorno + 7
          : -1
    if (abre < 0) continue
    const f = fecha(texto, abre)
    if (f < 0) continue
    saida.push({ tabela, chaves: chavesDeObjeto(texto.slice(abre + 1, f)) })
  }
  return saida
}

describe('as colunas que o Worker escreve existem nas tabelas', () => {
  const tabelas = colunasPorTabela(todoSql())
  const escritas = fontesDoWorker().flatMap((f) =>
    chavesEscritas(f.texto).map((e) => ({ ...e, arquivo: f.arquivo })),
  )

  it('as tres escritas do Worker foram encontradas na fonte', () => {
    // Nomeadas, e nao contadas: um recortador que perde uma chamada faria o teste passar com
    // aparencia de cobertura, e a escrita perdida seria justamente a que ninguem confere.
    const alvos = new Set(escritas.map((e) => e.tabela))
    for (const t of ['execucao_rotina', 'execucao_importacao', 'venda_produto_dia']) {
      expect(alvos.has(t), `nenhuma escrita em ${t} foi recortada da fonte do Worker`).toBe(true)
    }
    for (const e of escritas) {
      expect(e.chaves.length, `a escrita em ${e.tabela} saiu sem chave nenhuma`).toBeGreaterThan(2)
    }
  })

  it.each(
    fontesDoWorker().flatMap((f) =>
      chavesEscritas(f.texto).map((e) => ({ tabela: e.tabela, chaves: e.chaves })),
    ),
  )('insere em $tabela: toda chave e uma coluna', ({ tabela, chaves }) => {
    const existentes = tabelas.get(tabela)
    expect(existentes, `o Worker escreve em ${tabela}, que nenhuma migration cria`).toBeDefined()
    const faltando = chaves.filter((c) => !existentes!.has(c))
    expect(
      faltando,
      `${tabela}: chave escrita e inexistente: ${faltando.join(', ')}. ` +
        `Existem: ${[...existentes!].join(', ')}`,
    ).toEqual([])
  })

  it('toda coluna NOT NULL sem default de execucao_importacao e escrita', () => {
    // `origem` era a que faltava, e a insercao inteira falharia por violacao de NOT NULL.
    const sql = todoSql()
    const worker = fontesDoWorker().map((f) => f.texto).join('\n')
    for (const coluna of ['origem', 'arquivo', 'hash', 'arquivo_bruto', 'status']) {
      expect(
        new RegExp(`\\b${coluna}:`).test(worker),
        `execucao_importacao.${coluna} e NOT NULL e o Worker nao a escreve`,
      ).toBe(true)
    }
    // E a venda precisa do id da execucao, que tambem e NOT NULL.
    expect(sql).toContain('execucao_importacao_id  uuid        not null')
    expect(worker).toContain('execucao_importacao_id:')
  })

  it('a coluna bytea e escrita como \\x hexadecimal, e nao como texto decodificado', () => {
    const worker = fontesDoWorker().map((f) => f.texto).join('\n')
    expect(worker).toContain('paraBytea')
    // O erro anterior, textualmente: a string decodificada por UTF-8 indo para uma coluna bytea.
    expect(worker).not.toMatch(/arquivo_bruto:\s*texto/)
  })

  it('venda_produto_dia e inserida com on_conflict pelo par UNIQUE, e nao pela chave primaria', () => {
    const worker = fontesDoWorker().map((f) => f.texto).join('\n')
    // Sem isto, `resolution=merge-duplicates` resolve pelo `id`, que e sempre novo, e a
    // reimportacao do mesmo dia levanta 409 em vez de substituir o dia (F39).
    expect(worker).toContain("on_conflict: 'dia_operacional,produto_nome_norm'")
  })

  it('o filtro de idempotencia do watcher usa a coluna hash que existe', () => {
    const worker = fontesDoWorker().map((f) => f.texto).join('\n')
    expect(worker).toContain('hash=eq.')
    expect(worker).not.toContain('hash_arquivo')
  })
})
