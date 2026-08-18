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
 * Os tipos que o PostgREST entrega como STRING, e nao como numero JSON.
 *
 * `numeric` e `bigint` nao cabem em `double` sem perder precisao, entao o PostgREST os serializa
 * entre aspas. `int8` de contagem, `numeric` de NPS, de percentual e de dinheiro: todos chegam
 * como `"-100.0"`, e nao como `-100.0`.
 *
 * Isto aqui foi uma suposicao ERRADA deste arquivo, escrita com todas as letras: "numeric vira
 * number e nao string, porque o supabase-js entrega numero". Ele nao entrega. A suposicao gerou
 * `number | null` para 43 colunas em 20 views, o painel chamou `.toFixed()` num string e TODA aba
 * de leitura morria com `v.toFixed is not a function` — tela branca, no primeiro carregamento,
 * contra o Supabase de verdade.
 *
 * O tipo gerado continua sendo `number`, e agora ele e VERDADE, porque `le()` converte estas
 * colunas na entrada usando a lista abaixo. Corrigir na borda, uma vez, em vez de espalhar
 * `Number(...)` por cada leitura de cada tela.
 */
const VEM_COMO_TEXTO = new Set(['numeric', 'bigint'])

/**
 * De tipo Postgres para tipo TypeScript.
 *
 * `numeric` vira `number` porque `le()` converte na borda, e nao porque chega numero. `date` e
 * `timestamptz` viram `string`, que e como chegam no JSON e como sao usados.
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
const numericas = {}
const saida = []
for (const [view, colunas] of [...views].sort()) {
  retrato[view] = colunas.map((c) => c.coluna)
  const texto = colunas.filter((c) => VEM_COMO_TEXTO.has(c.tipo)).map((c) => c.coluna)
  if (texto.length > 0) numericas[view] = texto
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

// A lista das colunas que chegam entre aspas. `le()` a le para converter na borda, e o teste de
// contrato a confere contra o banco: coluna numerica nova entra aqui sozinha ou o teste cai.
writeFileSync(
  new URL('../supabase/colunas-numericas.json', import.meta.url),
  `${JSON.stringify(numericas, null, 2)}\n`,
)

process.stdout.write(saida.join('\n'))
const totalNum = Object.values(numericas).reduce((t, c) => t + c.length, 0)
process.stderr.write(
  `\n${views.size} views, retrato escrito em supabase/formas-das-views.json\n` +
    `${totalNum} colunas chegam como texto (numeric/bigint), em supabase/colunas-numericas.json\n`,
)
