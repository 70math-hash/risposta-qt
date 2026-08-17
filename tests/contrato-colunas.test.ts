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
