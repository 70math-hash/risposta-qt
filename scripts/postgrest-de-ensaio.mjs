/**
 * Um substituto MINIMO e ESTRITO do PostgREST, para exercitar o Worker contra um Postgres de
 * verdade.
 *
 * POR QUE EXISTE
 *   A camada HTTP do Worker nunca tinha sido executada. `tsc` confere tipos, os testes de
 *   contrato conferem nomes lendo o codigo, e o ensaio em SQL confere as funcoes — e no meio disso
 *   fica `worker/lib/supabase.ts`, que monta URL, cabecalho e corpo, e nada nunca tinha respondido
 *   a ele. Foi exatamente nessa camada que moraram os piores erros do projeto: nome de coluna em
 *   string, filtro por coluna inexistente, `on_conflict` ausente, `bytea` mandado como texto.
 *
 * O QUE ELE FAZ, E COMO ELE E FIEL ONDE IMPORTA
 *   Traduz a requisicao para SQL e deixa o POSTGRES julgar. Nao valida nome de coluna, nao tem
 *   lista do que existe, nao corrige nada: monta `select <colunas> from <relacao> where <filtros>`
 *   e devolve o erro do banco quando o banco reclama. Por isso ele NAO pode passar num pedido que
 *   o PostgREST recusaria por coluna inexistente — quem recusa e o mesmo motor que recusaria la.
 *
 *   Isso e deliberado: um substituto que tivesse a propria ideia de quais colunas existem poderia
 *   aceitar `hash_arquivo` e o teste passaria mentindo.
 *
 * O QUE ELE NAO E
 *   Nao e PostgREST. Nao faz embedding de relacao (`select=a,b(c)`), nao faz `or=`, nao pagina por
 *   `Range`, nao aplica RLS por JWT (roda como superusuario), e nao implementa a maior parte dos
 *   operadores. Implementa o que o Worker usa, e falha alto no que nao conhece, em vez de devolver
 *   uma resposta plausivel: pedido nao suportado devolve 501 com o texto do pedido, e o teste
 *   quebra em vez de passar por engano.
 *
 * USO
 *   node scripts/postgrest-de-ensaio.mjs [porta]        # padrao 8788
 */

import { createServer } from 'node:http'
import pg from 'pg'

const PORTA = Number(process.argv[2] ?? 8788)
const BANCO = process.env.BANCO ?? 'qt_ensaio'

/**
 * `date` sai como TEXTO, e nao como `Date` do JavaScript.
 *
 * FIDELIDADE, E O QUE A INFIDELIDADE ESCONDIA
 *   O PostgREST devolve `date` como `"2026-08-17"`. O `node-postgres`, por padrao, PARSEIA `date`
 *   para um `Date`, e `JSON.stringify` disso vira `"2026-08-17T00:00:00.000Z"`.
 *
 *   A diferenca nao e cosmetica. `rotuloDiaOperacional` faz `dia.split('-')` e le o terceiro
 *   pedaco como o dia do mes: com a forma do PostgREST ele acha `"17"`, e com a forma parseada ele
 *   acha `"17T00:00:00.000Z"`. O painel escrevia `UNDEFINED 17T00:00:00.000Z/08`.
 *
 *   Este substituto existe para NAO aprovar o que o PostgREST recusaria, e vale o inverso: ele nao
 *   pode reprovar o que o PostgREST aceitaria, nem entregar uma forma que o servidor de verdade
 *   nao entrega. Substituto infiel gasta o tempo de quem depura corrigindo codigo que estava certo.
 *
 * O QUE CONTINUA DIFERENTE, DECLARADO
 *   `timestamptz` sai daqui como `"2026-08-17T20:00:00.000Z"` e do PostgREST como
 *   `"2026-08-17T20:00:00+00:00"`. As duas sao ISO-8601 com `T`, e o painel corta com `slice`, que
 *   funciona nas duas. Nao e igualdade, e esta escrito em vez de suposto.
 */
pg.types.setTypeParser(1082, (v) => v)

const pool = new pg.Pool({
  host: '/var/run/postgresql',
  database: BANCO,
  user: process.env.PGUSER ?? 'postgres',
  max: 4,
})

/** Operadores do PostgREST que o Worker usa. */
const OPERADORES = {
  eq: (col, v) => [`${col} = $VAL`, v],
  gte: (col, v) => [`${col} >= $VAL`, v],
  lte: (col, v) => [`${col} <= $VAL`, v],
  neq: (col, v) => [`${col} <> $VAL`, v],
}

/** `is.null`, `is.true`, `is.false` nao levam parametro: entram literais. */
function filtroIs(col, valor) {
  if (valor === 'null') return `${col} is null`
  if (valor === 'true') return `${col} is true`
  if (valor === 'false') return `${col} is false`
  throw new NaoSuportado(`is.${valor}`)
}

class NaoSuportado extends Error {}

/** Identificador citado. Nome errado vira erro do Postgres, e nao erro daqui. */
function cita(nome) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nome)) throw new NaoSuportado(`identificador: ${nome}`)
  return `"${nome}"`
}

function montaSelect(relacao, params, schema) {
  const colunas = params.get('select')
  let lista = '*'
  if (colunas !== null && colunas !== '*') {
    if (colunas.includes('(')) throw new NaoSuportado(`select com embedding: ${colunas}`)
    lista = colunas
      .split(',')
      .map((c) => (c.includes(':') ? `${cita(c.split(':')[1])} as ${cita(c.split(':')[0])}` : cita(c)))
      .join(', ')
  }

  const onde = []
  const valores = []
  let ordem = ''
  let limite = ''

  for (const [chave, valor] of params) {
    if (chave === 'select') continue
    if (chave === 'order') {
      ordem =
        ' order by ' +
        valor
          .split(',')
          .map((o) => {
            const [col, dir] = o.split('.')
            return `${cita(col)} ${dir === 'desc' ? 'desc' : 'asc'}`
          })
          .join(', ')
      continue
    }
    if (chave === 'limit') {
      limite = ` limit ${Number(valor)}`
      continue
    }
    if (chave === 'on_conflict') continue

    const ponto = valor.indexOf('.')
    if (ponto < 0) throw new NaoSuportado(`filtro sem operador: ${chave}=${valor}`)
    const op = valor.slice(0, ponto)
    const arg = valor.slice(ponto + 1)

    if (op === 'is') {
      onde.push(filtroIs(cita(chave), arg))
      continue
    }
    const monta = OPERADORES[op]
    if (monta === undefined) throw new NaoSuportado(`operador ${op}`)
    valores.push(arg)
    const [frag] = monta(cita(chave), arg)
    onde.push(frag.replace('$VAL', `$${valores.length}`))
  }

  const sql =
    `select ${lista} from ${cita(schema)}.${cita(relacao)}` +
    (onde.length > 0 ? ` where ${onde.join(' and ')}` : '') +
    ordem +
    limite
  return { sql, valores }
}

/**
 * Um valor JSON para parametro do `pg`.
 *
 * LISTA passa como lista, e nao como texto JSON: `dias_lidos` e `date[]`, e `JSON.stringify` de um
 * array produz `["2026-03-15"]`, que o Postgres recusa com "malformed array literal" porque `[`
 * nao introduz dimensao de array. O `node-postgres` converte array de JS para array do Postgres
 * sozinho. O PostgREST de verdade faz a mesma conversao, e sem isto o substituto reprovava um
 * codigo que esta certo.
 *
 * Objeto continua indo como texto, porque a coluna correspondente e `jsonb`.
 */
function paraParametro(v) {
  if (v === null || v === undefined) return null
  if (Array.isArray(v)) return v
  if (typeof v === 'object') return JSON.stringify(v)
  return v
}

function montaInsert(relacao, linhas, schema, onConflict, retorna) {
  // A uniao das chaves de todas as linhas. Coluna ausente numa linha entra como DEFAULT, que e o
  // que o PostgREST faz: mandar null forcaria nulo por cima de um default.
  const colunas = [...new Set(linhas.flatMap((l) => Object.keys(l)))]
  if (colunas.length === 0) throw new NaoSuportado('insert sem coluna')

  const valores = []
  const tuplas = linhas.map((linha) => {
    const partes = colunas.map((c) => {
      if (!(c in linha)) return 'default'
      valores.push(paraParametro(linha[c]))
      return `$${valores.length}`
    })
    return `(${partes.join(', ')})`
  })

  let sql =
    `insert into ${cita(schema)}.${cita(relacao)} (${colunas.map(cita).join(', ')}) ` +
    `values ${tuplas.join(', ')}`

  if (onConflict !== null) {
    // `merge-duplicates` com `on_conflict` explicito: e o que faz reimportar um dia substituir o
    // dia em vez de levantar 409.
    const alvo = onConflict.split(',').map(cita).join(', ')
    const set = colunas
      .filter((c) => !onConflict.split(',').includes(c))
      .map((c) => `${cita(c)} = excluded.${cita(c)}`)
    sql += ` on conflict (${alvo}) do ${set.length > 0 ? `update set ${set.join(', ')}` : 'nothing'}`
  }
  if (retorna) sql += ' returning *'
  return { sql, valores }
}

/**
 * `bytea` sai como `\x` mais hexadecimal, que e o que o PostgREST devolve.
 *
 * O `pg` entrega `bytea` como `Buffer`, e `JSON.stringify` de um Buffer produz
 * `{"type":"Buffer","data":[80,82,...]}`. Devolver isso faria o teste que confere o arquivo bruto
 * receber um objeto onde espera texto, e a diferenca entre "os bytes chegaram" e "os bytes
 * chegaram no formato certo" e justamente o que se quer conferir aqui.
 */
function substituiBuffer(_chave, valor) {
  if (valor !== null && typeof valor === 'object' && valor.type === 'Buffer' && Array.isArray(valor.data)) {
    return `\\x${Buffer.from(valor.data).toString('hex')}`
  }
  return valor
}

/**
 * O papel do claim `role` do JWT, se houver.
 *
 * O PostgREST le esse claim e faz `set local role <papel>` antes da consulta. E isso que faz os
 * grants e as politicas de RLS valerem para quem escreve: sem isso, quem escreve e o
 * `service_role`, que passa por cima de tudo.
 *
 * Aqui a ASSINATURA nao e verificada, e isso e uma limitacao declarada: o que se quer exercitar e a
 * MATRIZ DE PERMISSOES, e nao a criptografia. Verificar assinatura exigiria o segredo dos dois
 * lados e nao mudaria em nada o que este substituto prova. Quem verifica assinatura de verdade e o
 * PostgREST hospedado.
 */
function papelDoToken(req) {
  const auth = req.headers.authorization ?? ''
  if (!auth.toLowerCase().startsWith('bearer ')) return null
  const partes = auth.slice(7).trim().split('.')
  if (partes.length !== 3) return null
  try {
    const corpo = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'))
    return typeof corpo.role === 'string' ? corpo.role : null
  } catch {
    return null
  }
}

async function corpoDe(req) {
  const pedacos = []
  for await (const p of req) pedacos.push(p)
  return Buffer.concat(pedacos).toString('utf8')
}

const servidor = createServer((req, res) => {
  void (async () => {
    // SEMPRE `JSON.stringify`, inclusive para string. O PostgREST devolve o resultado escalar de
    // uma funcao como JSON, entao um uuid sai com aspas. Deixar a string passar crua fazia o corpo
    // ser `7777...` sem aspas, e o `JSON.parse` do Worker morria em "unexpected non-whitespace
    // character after JSON at position 8" — um erro do substituto que parecia erro do Worker.
    const responde = (status, corpo) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(corpo, substituiBuffer))
    }

    try {
      const url = new URL(req.url, `http://localhost:${PORTA}`)

      // `/auth/v1/user`: a conferencia de sessao da rota de importacao manual. Aqui um token e
      // aceito quando comeca com `sessao-boa`, e recusado no resto. O objetivo do teste e o
      // Worker, e nao o GoTrue: o que precisa ser exercitado e que 401 chega na tela e que o
      // e-mail do usuario vira `importado_por`.
      if (url.pathname === '/auth/v1/user') {
        const auth = req.headers.authorization ?? ''
        const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : ''
        if (req.headers.apikey === undefined) {
          return responde(401, { message: 'No API key found in request' })
        }
        if (!token.startsWith('sessao-boa')) {
          return responde(401, { message: 'invalid claim: missing sub claim' })
        }
        return responde(200, { id: '99999999-9999-4999-8999-999999999999', email: 'dono@qt.invalid' })
      }

      const prefixo = '/rest/v1/'
      if (!url.pathname.startsWith(prefixo)) return responde(404, { message: 'rota desconhecida' })
      const alvo = url.pathname.slice(prefixo.length)
      const schema = req.headers['content-profile'] ?? req.headers['accept-profile'] ?? 'public'

      // Um cliente dedicado quando ha papel, para `set local role` valer para as consultas
      // seguintes da MESMA requisicao. Com o pool cru, `set local` cairia num cliente qualquer.
      const papel = papelDoToken(req)

      /**
       * Roda no papel do token, dentro de transacao, e devolve as linhas.
       *
       * `service_role` ENTRA NO `set local role` COMO QUALQUER OUTRO, e isso e uma correcao.
       *   Antes ele caia no ramo do pool cru, ou seja rodava como o SUPERUSUARIO que abre a
       *   conexao. O efeito era anular justamente o caso que `worker-integracao` chama de "o unico
       *   que prova que os outros nao passam por engano": o contraste de F55 mostrava que um
       *   superusuario consegue escrever em `public.pratos`, e nao que `service_role` consegue.
       *   Um teste de negacao ao lado de um contraste que nao contrasta e uma prova vazia.
       *
       *   Sem token (`papel === null`) continua no pool cru, porque ai nao ha papel a assumir.
       */
      const consulta = async (sql, valores) => {
        if (papel === null) {
          return (await pool.query(sql, valores)).rows
        }
        const cliente = await pool.connect()
        try {
          await cliente.query('begin')
          // `set local` vale ate o fim da transacao, e nao vaza para o proximo uso do cliente.
          await cliente.query(`set local role ${cita(papel)}`)
          const r = await cliente.query(sql, valores)
          await cliente.query('commit')
          return r.rows
        } catch (e) {
          await cliente.query('rollback').catch(() => {})
          throw e
        } finally {
          cliente.release()
        }
      }

      if (alvo.startsWith('rpc/')) {
        if (req.method !== 'POST') throw new NaoSuportado(`${req.method} em rpc`)
        const fn = alvo.slice(4)
        const args = JSON.parse((await corpoDe(req)) || '{}')
        const nomes = Object.keys(args)
        // Argumento por NOME, que e como o PostgREST chama funcao. E o detalhe que fez `p_carga`
        // contra `p` ser um erro invisivel em compilacao.
        const lista = nomes.map((n, i) => `${cita(n)} => $${i + 1}`).join(', ')
        const valores = nomes.map((n) =>
          typeof args[n] === 'object' && args[n] !== null ? JSON.stringify(args[n]) : args[n],
        )
        const linhas = await consulta(
          `select ${cita(schema)}.${cita(fn)}(${lista}) as resultado`,
          valores,
        )
        return responde(200, linhas[0]?.resultado ?? null)
      }

      if (req.method === 'GET') {
        const { sql, valores } = montaSelect(alvo, url.searchParams, schema)
        return responde(200, await consulta(sql, valores))
      }

      if (req.method === 'POST') {
        const bruto = await corpoDe(req)
        const linhas = JSON.parse(bruto)
        const prefer = String(req.headers.prefer ?? '')
        const { sql, valores } = montaInsert(
          alvo,
          Array.isArray(linhas) ? linhas : [linhas],
          schema,
          url.searchParams.get('on_conflict'),
          prefer.includes('return=representation'),
        )
        return responde(201, await consulta(sql, valores))
      }

      if (req.method === 'PATCH') {
        const campos = JSON.parse((await corpoDe(req)) || '{}')
        const nomes = Object.keys(campos)
        if (nomes.length === 0) throw new NaoSuportado('PATCH sem campo')

        // O `where` reusa o montador do GET, pelo mesmo caminho: filtro do PATCH e filtro do GET no
        // PostgREST, e ter duas traducoes faria o UPDATE atingir um conjunto diferente do que o
        // SELECT mostraria.
        const { sql: selecao, valores: valoresDoFiltro } = montaSelect(alvo, url.searchParams, schema)
        const onde = selecao.includes(' where ') ? selecao.slice(selecao.indexOf(' where ')) : ''
        if (onde === '') {
          // PATCH sem filtro atualizaria a tabela inteira. O PostgREST hospedado tambem recusa.
          throw new NaoSuportado('PATCH sem filtro')
        }

        // Os parametros do SET vem primeiro e os do filtro depois, com os indices deslocados.
        const valores = nomes.map((n) => paraParametro(campos[n]))
        const ondeDeslocado = onde.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + valores.length}`)
        const sql =
          `update ${cita(schema)}.${cita(alvo)} set ` +
          nomes.map((n, i) => `${cita(n)} = $${i + 1}`).join(', ') +
          ondeDeslocado +
          (String(req.headers.prefer ?? '').includes('return=representation') ? ' returning *' : '')

        return responde(200, await consulta(sql, [...valores, ...valoresDoFiltro]))
      }

      if (req.method === 'DELETE') {
        const { sql: selecao, valores } = montaSelect(alvo, url.searchParams, schema)
        const onde = selecao.includes(' where ') ? selecao.slice(selecao.indexOf(' where ')) : ''
        // DELETE sem filtro apagaria a tabela inteira. O PostgREST hospedado tambem recusa.
        if (onde === '') throw new NaoSuportado('DELETE sem filtro')
        await consulta(`delete from ${cita(schema)}.${cita(alvo)}${onde}`, valores)
        return responde(204, null)
      }

      return responde(405, { message: `metodo ${req.method}` })
    } catch (e) {
      if (e instanceof NaoSuportado) {
        // 501, e nao 200 vazio: pedido que este substituto nao entende tem de QUEBRAR o teste, e
        // nao passar por engano com uma resposta plausivel.
        return responde(501, { message: `nao suportado pelo substituto: ${e.message}` })
      }
      // Erro do Postgres, no formato que o PostgREST usa. E este o caminho por onde nome de coluna
      // errado chega ao Worker.
      return responde(400, {
        code: e.code ?? 'XX000',
        message: e.message ?? String(e),
        details: e.detail ?? null,
        hint: e.hint ?? null,
      })
    }
  })()
})

servidor.listen(PORTA, '127.0.0.1', () => {
  process.stdout.write(`substituto de PostgREST em http://127.0.0.1:${PORTA} sobre ${BANCO}\n`)
})
