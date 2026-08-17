#!/usr/bin/env node
/**
 * Exporta as 74 linhas de `public.cliques_avaliacao` do projeto `qt-avaliacoes`
 * (`helinoirdizwrluydkzp`, `us-east-1`) e as EMBUTE na migration
 * `supabase/migrations/20260817103000_semeia_convite_clique.sql`, entre os marcadores
 * `>>> INICIO DO BLOCO GERADO` e `>>> FIM DO BLOCO GERADO`.
 *
 * POR QUE ESTE SCRIPT EXISTE
 *   Os dois projetos estao em regioes diferentes e em instancias diferentes, entao nenhum
 *   `SELECT` da migration alcanca a origem. As 74 linhas precisam virar literais dentro do
 *   arquivo, e transcrever 74 linhas a mao e como se perde ou se corrompe a unica copia de
 *   um historico (N40).
 *
 * O QUE ELE NAO FAZ
 *   Nao interpreta nada. Nao normaliza `garcom`, nao descarta `user_agent`, nao arredonda
 *   `criado_em`. Ele transcreve, porque interpretar na exportacao e irreversivel.
 *   Nao aplica migration nenhuma: ele escreve arquivo.
 *
 * COMO USAR
 *   QT_AVALIACOES_URL=https://helinoirdizwrluydkzp.supabase.co \
 *   QT_AVALIACOES_KEY=<chave de leitura do projeto de ORIGEM> \
 *   node scripts/exporta_cliques_avaliacao.mjs
 *
 *   A chave precisa apenas de SELECT em `public.cliques_avaliacao`. Ela NAO e a chave do
 *   projeto de destino, e nao entra no repositorio.
 *
 * DEPOIS DE RODAR
 *   Conferir o `git diff` da migration (74 linhas de `insert`), aplicar a migration, e so
 *   entao conferir a integridade contra a origem. `qt-avaliacoes` so e pausado depois disso,
 *   que e a condicao 4 de D2.
 */

import { readFileSync, writeFileSync } from 'node:fs'

const ARQUIVO = 'supabase/migrations/20260817103000_semeia_convite_clique.sql'
const INICIO = '-- >>> INICIO DO BLOCO GERADO'
const FIM = '-- >>> FIM DO BLOCO GERADO'
const ESPERADO = 74 // N40. Se a origem tiver outro numero, o script para e explica.

const url = process.env.QT_AVALIACOES_URL
const chave = process.env.QT_AVALIACOES_KEY

if (!url || !chave) {
  console.error(
    'Faltam QT_AVALIACOES_URL e QT_AVALIACOES_KEY. A chave e a do projeto de ORIGEM\n' +
      '(qt-avaliacoes, us-east-1), com SELECT em public.cliques_avaliacao, e nao a do destino.',
  )
  process.exit(1)
}

/** Literal SQL de texto, ou `null`. Aspas simples dobradas, que e a unica escapada que o
 *  Postgres exige em cadeia sem prefixo. */
function texto(v) {
  if (v === null || v === undefined) return 'null'
  return `'${String(v).replace(/'/g, "''")}'`
}

const resposta = await fetch(
  `${url.replace(/\/$/, '')}/rest/v1/cliques_avaliacao` +
    '?select=id,garcom,criado_em,user_agent,referrer&order=id.asc',
  { headers: { apikey: chave, Authorization: `Bearer ${chave}` } },
)

if (!resposta.ok) {
  console.error(`origem devolveu HTTP ${resposta.status}: ${await resposta.text()}`)
  process.exit(1)
}

const linhas = await resposta.json()

if (!Array.isArray(linhas)) {
  console.error('resposta da origem nao e uma lista. Nada foi escrito.')
  process.exit(1)
}

if (linhas.length !== ESPERADO) {
  console.error(
    `N40 diz ${ESPERADO} linhas em cliques_avaliacao, e a origem devolveu ${linhas.length}.\n` +
      'Ou a origem mudou depois de 13/08/2026, ou a leitura foi paginada. Nada foi escrito:\n' +
      'conferir antes de seguir, porque este e o unico dado historico a migrar.',
  )
  process.exit(1)
}

const gerado = [
  INICIO,
  '--',
  `-- Gerado por scripts/exporta_cliques_avaliacao.mjs. ${linhas.length} linhas, transcritas`,
  '-- da origem sem interpretacao. Nao editar a mao: rodar o script de novo.',
  '--',
  ...linhas.map(
    (l) =>
      'insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (' +
      `${Number(l.id)}, ${texto(l.garcom)}, ${texto(l.criado_em)}, ` +
      `${texto(l.user_agent)}, ${texto(l.referrer)});`,
  ),
  '--',
  FIM,
].join('\n')

const sql = readFileSync(ARQUIVO, 'utf8')
const i = sql.indexOf(INICIO)
const f = sql.indexOf(FIM)

if (i < 0 || f < 0 || f < i) {
  console.error(`marcadores nao encontrados em ${ARQUIVO}. Nada foi escrito.`)
  process.exit(1)
}

writeFileSync(ARQUIVO, sql.slice(0, i) + gerado + sql.slice(f + FIM.length))

const datas = linhas.map((l) => l.criado_em).sort()
const garcons = [...new Set(linhas.map((l) => String(l.garcom).trim()))].sort()

console.log(`${linhas.length} linhas embutidas em ${ARQUIVO}`)
console.log(`criado_em de ${datas[0]} a ${datas[datas.length - 1]}`)
console.log(`garcons distintos (${garcons.length}): ${garcons.join(', ')}`)
console.log('Conferir o git diff antes de aplicar. qt-avaliacoes so e pausado depois da conferencia (D2).')
