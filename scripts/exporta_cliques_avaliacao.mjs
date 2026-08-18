/**
 * Le as 74 linhas de `public.cliques_avaliacao` do projeto `qt-avaliacoes` e escreve os
 * `INSERT` literais dentro do BLOCO GERADO de
 * `supabase/migrations/20260817103000_semeia_convite_clique.sql`.
 *
 * POR QUE EXISTE
 *   Os dois projetos Supabase estao em regioes diferentes e nao ha conexao entre eles: nenhum
 *   `SELECT` da migration alcanca `qt-avaliacoes`. As 74 linhas tem de entrar na migration como
 *   valores literais, e este script e o unico caminho.
 *
 *   A migration falha DE PROPOSITO enquanto o bloco estiver vazio, com uma mensagem que manda
 *   rodar este arquivo. Isso e melhor que aplicar em silencio e deixar `convite_clique` vazia
 *   com aparencia de migrada.
 *
 * O QUE ELE NAO FAZ, E ISSO E A PARTE IMPORTANTE
 *   Nao interpreta. Nao normaliza nome de garcom, nao conserta acento, nao decide o que e
 *   duplicata, nao descarta linha feia. Transcreve. Interpretar na exportacao e como se perde a
 *   unica copia de um historico: depois de `qt-avaliacoes` ser pausado, esta migration passa a
 *   ser a unica copia dessas 74 linhas, e nao ha de onde tirar de novo o que foi "consertado".
 *
 *   A normalizacao existe, mas mais adiante e de forma reversivel: a migration resolve
 *   `garcom_id` por nome em minusculas e sem espaco nas pontas, e guarda o `garcom` CRU do lado.
 *   Se a resolucao errar, o valor cru ainda esta la.
 *
 * COMO USAR
 *   export QT_AVALIACOES_URL='https://helinoirdizwrluydkzp.supabase.co'
 *   export QT_AVALIACOES_KEY='<a chave de LEITURA do projeto de origem>'
 *   node scripts/exporta_cliques_avaliacao.mjs
 *
 *   Depois conferir o diff da migration ANTES de aplicar. O script escreve; quem decide e quem
 *   le o diff.
 *
 * QUAL CHAVE USAR
 *   A `anon` basta se a tabela for legivel por ela. Se nao for, a `service_role` do projeto de
 *   ORIGEM, e so para esta leitura. A chave nao e gravada em lugar nenhum: entra por variavel de
 *   ambiente, e o arquivo gerado contem so os dados.
 *
 * IDEMPOTENTE
 *   Rodar duas vezes reescreve o mesmo bloco entre os marcadores, e nao acumula. O `INSERT` da
 *   migration tem `on conflict (id_origem) do nothing`, entao aplicar duas vezes tambem nao
 *   dobra linha.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const AQUI = dirname(fileURLToPath(import.meta.url))
const MIGRATION = join(AQUI, '..', 'supabase', 'migrations', '20260817103000_semeia_convite_clique.sql')

const INICIO = '-- >>> INICIO DO BLOCO GERADO'
const FIM = '-- >>> FIM DO BLOCO GERADO'

/** N40: o numero de linhas conferido na origem em 13/08/2026. */
const ESPERADO = 74

const URL_ORIGEM = process.env.QT_AVALIACOES_URL
const CHAVE_ORIGEM = process.env.QT_AVALIACOES_KEY

if (!URL_ORIGEM || !CHAVE_ORIGEM) {
  console.error(
    'Faltam QT_AVALIACOES_URL e QT_AVALIACOES_KEY.\n\n' +
      "  export QT_AVALIACOES_URL='https://helinoirdizwrluydkzp.supabase.co'\n" +
      "  export QT_AVALIACOES_KEY='<chave de leitura do projeto de origem>'\n",
  )
  process.exit(1)
}

/** Literal de texto para SQL. Aspas simples dobradas, e nada mais: nao ha escape a inventar. */
function texto(v) {
  if (v === null || v === undefined) return 'null'
  return `'${String(v).replace(/'/g, "''")}'`
}

function carimbo(v) {
  if (v === null || v === undefined) return 'null'
  // `::timestamptz` explicito para o valor entrar com o fuso que veio, e nao com o fuso do
  // servidor que aplica a migration. Sem isso, 74 carimbos mudariam de hora em silencio.
  return `${texto(v)}::timestamptz`
}

async function le() {
  const alvo = new URL(`${URL_ORIGEM}/rest/v1/cliques_avaliacao`)
  alvo.searchParams.set('select', 'id,garcom,criado_em,user_agent,referrer')
  alvo.searchParams.set('order', 'id')

  const resp = await fetch(alvo, {
    headers: {
      apikey: CHAVE_ORIGEM,
      authorization: `Bearer ${CHAVE_ORIGEM}`,
      accept: 'application/json',
      // Sem `Range`: 74 linhas cabem numa resposta, e paginar aqui seria mais uma coisa que
      // pode truncar o historico sem avisar.
    },
  })

  if (!resp.ok) {
    const detalhe = await resp.text().catch(() => '')
    throw new Error(
      `a origem devolveu ${resp.status}: ${detalhe.slice(0, 300)}\n\n` +
        'Se for 401 ou 404, a chave nao tem leitura em `public.cliques_avaliacao`. ' +
        'Se for 42P01, a tabela mudou de nome.',
    )
  }
  return await resp.json()
}

const linhas = await le()

if (!Array.isArray(linhas)) {
  throw new Error(`a origem nao devolveu uma lista: ${JSON.stringify(linhas).slice(0, 200)}`)
}

// A conferencia de contagem acontece AQUI e tambem na migration. Duas vezes de proposito: aqui
// para nao escrever um bloco truncado, e la para nao aplicar um bloco truncado que alguem
// escreveu a mao depois.
if (linhas.length !== ESPERADO) {
  console.error(
    `A origem devolveu ${linhas.length} linhas e N40 diz ${ESPERADO}.\n\n` +
      'Ou a origem mudou depois de 13/08/2026, ou a leitura truncou. Nos dois casos, ' +
      'conferir na origem antes de seguir. O bloco NAO foi escrito.\n',
  )
  process.exit(1)
}

const faltandoId = linhas.filter((l) => l.id === null || l.id === undefined).length
if (faltandoId > 0) {
  console.error(`${faltandoId} linha(s) sem id. O id e a chave de idempotencia da migration.`)
  process.exit(1)
}

const comandos = linhas.map(
  (l) =>
    'insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (' +
    [
      String(Number(l.id)),
      texto(l.garcom ?? ''),
      carimbo(l.criado_em),
      texto(l.user_agent),
      texto(l.referrer),
    ].join(', ') +
    ');',
)

const original = readFileSync(MIGRATION, 'utf8')
const iInicio = original.indexOf(INICIO)
const iFim = original.indexOf(FIM)
if (iInicio < 0 || iFim < 0 || iFim < iInicio) {
  throw new Error(`nao achei os marcadores do BLOCO GERADO em ${MIGRATION}`)
}

const datas = linhas.map((l) => l.criado_em).filter(Boolean).sort()

const cabecalho = [
  INICIO,
  '--',
  `-- ${comandos.length} linhas lidas de public.cliques_avaliacao do projeto qt-avaliacoes,`,
  `-- de ${datas[0] ?? '?'} a ${datas[datas.length - 1] ?? '?'}.`,
  '--',
  '-- GERADO por scripts/exporta_cliques_avaliacao.mjs. Nao editar a mao: rodar o script de',
  '-- novo reescreve este bloco inteiro. Os valores sao transcricao, sem normalizacao nenhuma.',
  '--',
]

const gerado = [...cabecalho, '', ...comandos, '', FIM].join('\n')
writeFileSync(MIGRATION, original.slice(0, iInicio) + gerado + original.slice(iFim + FIM.length))

const semGarcom = linhas.filter((l) => String(l.garcom ?? '').trim() === '').length
const distintos = new Set(linhas.map((l) => String(l.garcom ?? '').trim().toLowerCase()))

console.log(
  `${comandos.length} linhas escritas em ${MIGRATION.replace(process.cwd(), '.')}\n` +
    `  periodo: ${datas[0] ?? '?'} a ${datas[datas.length - 1] ?? '?'}\n` +
    `  nomes de garcom distintos: ${distintos.size}\n` +
    `  linhas com garcom vazio: ${semGarcom}\n\n` +
    'Proximos passos, nesta ordem:\n' +
    '  1. Conferir o diff da migration.\n' +
    '  2. Aplicar a migration. Ela confere a contagem de novo e derruba se nao for 74.\n' +
    '  3. Conferir os numeros que ela imprime contra a origem.\n' +
    '  4. So depois disso pausar qt-avaliacoes (condicao 4 de D2).\n',
)
