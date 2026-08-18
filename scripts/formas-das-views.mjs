/**
 * Le a forma real de cada view de `experiencia` no banco de ensaio e escreve duas coisas:
 *
 *   supabase/formas-das-views.json   o retrato, para o teste conferir sem precisar de banco
 *   (na saida padrao)                as interfaces TypeScript, para colar em src/painel/dados.ts
 *
 * POR QUE EXISTE
 *   As interfaces do painel eram escritas a mao, a partir da folha canonica, e divergiram das
 *   views de verdade em quase toda linha: a interface dizia `garcom`, `respostas`, `item`,
 *   `media_do_cardapio`, e a view devolve `nome`, `n`, `nome_pt`, `media_reclamacoes_cardapio`.
 *
 *   Isso nao quebra nada de forma visivel, e e justamente o problema. O painel le com
 *   `select('*')`, entao a consulta funciona; o que chega e um objeto com as chaves certas do
 *   banco, tipado com as chaves erradas do TypeScript. Toda leitura da `undefined`, e a tela
 *   mostra celula vazia. Nenhum erro em lugar nenhum. Quem abre o painel conclui que nao houve
 *   resposta, e nao que o codigo pediu um campo que nao existe.
 *
 *   `tsc` nao pega: a assercao `as T[]` sobre a resposta da rede e uma afirmacao do autor.
 *
 * COMO USAR
 *   scripts/ensaio.sh && node scripts/formas-das-views.mjs > /tmp/formas.ts
 *
 * O QUE NAO FAZ
 *   Nao roda no build e nao gera codigo em tempo de compilacao. O arquivo gerado e colado a
 *   mao, uma vez, e o teste `contrato-views` e que impede a divergencia de voltar. Passo de
 *   codegen no build seria mais uma engrenagem para ninguem manter.
 */

import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const BANCO = process.env.BANCO ?? 'qt_ensaio'

function consulta(sql) {
  return execFileSync('sudo', ['-u', 'postgres', 'psql', '-q', '-d', BANCO, '-tAF', '', '-c', sql], {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter((l) => l !== '')
    .map((l) => l.split(''))
}

const linhas = consulta(`
  select c.table_name, c.column_name, c.data_type, c.is_nullable
  from information_schema.columns c
  join information_schema.views v
    on v.table_schema = c.table_schema and v.table_name = c.table_name
  where c.table_schema = 'experiencia'
  order by c.table_name, c.ordinal_position
`)

const views = new Map()
for (const [view, coluna, tipo] of linhas) {
  if (!views.has(view)) views.set(view, [])
  views.get(view).push({ coluna, tipo })
}

/**
 * De tipo Postgres para tipo TypeScript.
 *
 * `numeric` vira `number` e nao `string`, porque o supabase-js entrega numero. `date` e
 * `timestamptz` viram `string`, que e como chegam no JSON.
 */
function ts(tipo) {
  switch (tipo) {
    case 'smallint':
    case 'integer':
    case 'bigint':
    case 'numeric':
    case 'double precision':
    case 'real':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'ARRAY':
      return 'string[]'
    case 'jsonb':
    case 'json':
      return 'unknown'
    default:
      return 'string'
  }
}

/**
 * Toda coluna de view sai como opcional-nula.
 *
 * Nao e preguica: `information_schema` devolve `is_nullable = YES` para praticamente toda
 * coluna de view, porque um `left join` ou um `case` bastam para produzir nulo, e o Postgres nao
 * tenta provar o contrario. Fingir `not null` aqui seria inventar uma garantia que o banco nao
 * deu, e o painel quebraria em tempo de execucao no primeiro dia sem resposta. `| null` obriga
 * quem le a tratar o dia vazio, que e o caso comum e nao o excepcional.
 */
function nomeInterface(view) {
  return view
    .replace(/^vw_/, 'Vw_')
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
}

const retrato = {}
const saida = []
for (const [view, colunas] of [...views].sort()) {
  retrato[view] = colunas.map((c) => c.coluna)
  saida.push(`/** \`experiencia.${view}\`. Forma lida do banco, nao escrita a mao. */`)
  saida.push(`export interface ${nomeInterface(view)} {`)
  for (const { coluna, tipo } of colunas) {
    saida.push(`  ${coluna}: ${ts(tipo)} | null`)
  }
  saida.push('}')
  saida.push('')
}

writeFileSync(
  new URL('../supabase/formas-das-views.json', import.meta.url),
  `${JSON.stringify(retrato, null, 2)}\n`,
)

process.stdout.write(saida.join('\n'))
process.stderr.write(`\n${views.size} views, retrato escrito em supabase/formas-das-views.json\n`)
