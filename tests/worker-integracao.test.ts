/**
 * O Worker rodando de verdade, contra um Postgres de verdade.
 *
 * POR QUE EXISTE
 *   A camada HTTP do Worker era a unica coisa do projeto que nada nunca tinha executado. `tsc`
 *   confere tipos, os testes de contrato conferem nomes lendo o codigo, o ensaio em SQL confere
 *   as funcoes — e no meio ficava `worker/lib/supabase.ts`, montando URL, cabecalho e corpo, sem
 *   nunca ter recebido resposta de nada.
 *
 *   Foi exatamente ali que moraram os piores erros: nome de coluna dentro de string, filtro por
 *   coluna que a view nao tem, `on_conflict` ausente, `bytea` mandado como texto decodificado,
 *   argumento de funcao com o nome errado. Nenhum deles aparece em compilacao, porque todos sao
 *   texto atravessando uma fronteira.
 *
 * COMO
 *   `scripts/postgrest-de-ensaio.mjs` traduz a requisicao para SQL e deixa o POSTGRES julgar: ele
 *   nao tem lista de colunas validas e nao corrige nada. Coluna errada volta como o 42703 do
 *   proprio banco, que e o mesmo erro que o PostgREST devolveria.
 *
 *   Este arquivo importa `worker/index.ts` e chama o handler `fetch` com um `Request` de verdade.
 *   Nao ha mock do Worker: o codigo executado e o que vai para producao.
 *
 * QUANDO ELE RODA
 *   So quando o substituto esta no ar. Em `npm test` numa maquina sem Postgres, os casos sao
 *   pulados com aviso, e nao falham: o resto da suite tem de continuar rodando em qualquer lugar.
 *   `scripts/ensaio.sh --dados` sobe o substituto e roda com ele de pe, que e onde estes casos
 *   valem. Um caso pulado NAO e um caso que passou, e o aviso diz isso.
 */

import { describe, expect, it } from 'vitest'
import trabalhador from '../worker/index.js'
import type { Ambiente } from '../worker/lib/supabase.js'

const BASE = process.env.PGREST_ENSAIO ?? 'http://127.0.0.1:8788'

const env: Ambiente = {
  SUPABASE_URL: BASE,
  SUPABASE_SERVICE_KEY: 'chave-de-ensaio',
  SUPABASE_ANON_KEY: 'publica-de-ensaio',
}

/**
 * A sonda roda no CARREGAMENTO do modulo, com `await` de topo, e nao num `beforeAll`.
 *
 * `it.skipIf(condicao)` avalia a condicao na hora de COLETAR os casos, que acontece antes de
 * qualquer `beforeAll`. Com a sonda num `beforeAll`, `noAr` ainda era falso na coleta e os 16
 * casos eram pulados mesmo com o substituto no ar — um teste que se desliga sozinho e diz que
 * esta tudo bem.
 */
const noAr = await (async () => {
  try {
    const r = await fetch(`${BASE}/rest/v1/mesa?select=numero&limit=1`, {
      headers: { 'accept-profile': 'experiencia' },
      signal: AbortSignal.timeout(2000),
    })
    return r.ok
  } catch {
    return false
  }
})()

if (!noAr) {
  // Aviso, e nao silencio: casos pulados em bloco parecem casos que passaram na saida do vitest.
  process.stderr.write(
    `\n[worker-integracao] substituto de PostgREST fora do ar em ${BASE}. ` +
      'Estes casos foram PULADOS, e nao aprovados. Para rodar: scripts/ensaio.sh --dados\n',
  )
}

/** Um uuid v4 valido e distinto por chamada, sem depender de aleatoriedade global. */
let contador = 0
function idNovo(): string {
  contador += 1
  const s = contador.toString(16).padStart(12, '0')
  return `77777777-7777-4777-8777-${s}`
}

function pede(rota: string, corpo?: unknown, cabecalhos: Record<string, string> = {}): Request {
  return new Request(`https://exemplo.invalid${rota}`, {
    method: corpo === undefined ? 'GET' : 'POST',
    ...(corpo === undefined
      ? {}
      : { body: corpo instanceof ArrayBuffer ? corpo : JSON.stringify(corpo) }),
    headers: { 'content-type': 'application/json', ...cabecalhos },
  })
}

function respostaBase(): Record<string, unknown> & { id: string } {
  return {
    id: idNovo(),
    criado_em_cliente: new Date().toISOString(),
    nota: 9,
    canal: 'tablet',
    idioma: 'pt',
    versao_app: '0.1.0',
    versao_questionario: '1.0.0',
    mesa_digitada: '7',
    garcom_pin_digitado: '1234',
    dispositivo_id: 'cccccccc-0000-4000-8000-000000000001',
    opcoes: [],
    itens: [],
    sorteadas: [],
    telas: [],
    consentimentos: [],
  }
}

describe('GET /api/catalogo', () => {
  it.skipIf(!noAr)('devolve as quatro listas, e nenhuma consulta falha', async () => {
    const r = await trabalhador.fetch(pede('/api/catalogo'), env)
    const corpo = (await r.json()) as Record<string, unknown>

    // `ok: false` aqui e o modo de falha SILENCIOSO que este teste existe para pegar: getCatalogo
    // devolve catalogo vazio de proposito quando a consulta falha, para a coleta nao parar por uma
    // tela opcional. Com uma coluna errada, o quiosque abriria e nunca mostraria a tela de item.
    expect(corpo.erro ?? null, `getCatalogo falhou: ${String(corpo.erro)}`).toBeNull()
    expect(corpo.ok).toBe(true)
    expect(Array.isArray(corpo.itens)).toBe(true)
    expect((corpo.itens as unknown[]).length).toBeGreaterThan(0)
    expect(Array.isArray(corpo.perguntas_ativas)).toBe(true)
    expect((corpo.perguntas_ativas as unknown[]).length).toBeGreaterThan(0)
    expect(Array.isArray(corpo.mesas)).toBe(true)
    expect(corpo.consentimento).not.toBeNull()
  })

  it.skipIf(!noAr)('cada item traz os dois nomes, para o idioma ser escolhido na tela', async () => {
    const r = await trabalhador.fetch(pede('/api/catalogo'), env)
    const corpo = (await r.json()) as { itens: { nome_pt?: string; nome_en?: string }[] }
    for (const item of corpo.itens) {
      expect(item.nome_pt, 'item sem nome_pt').toBeTypeOf('string')
      expect(item.nome_en, 'item sem nome_en').toBeTypeOf('string')
    }
  })
})

describe('POST /api/resposta', () => {
  it.skipIf(!noAr)('grava e devolve o id que o cliente gerou', async () => {
    const carga = respostaBase()
    const r = await trabalhador.fetch(pede('/api/resposta', carga), env)
    const corpo = (await r.json()) as { ok: boolean; id?: string; erro?: string }
    expect(corpo.erro ?? null, `gravacao falhou: ${String(corpo.erro)}`).toBeNull()
    expect(r.status).toBe(200)
    expect(corpo.id).toBe(carga.id)
  })

  it.skipIf(!noAr)('reenvio do mesmo id nao cria segunda linha', async () => {
    const carga = respostaBase()
    await trabalhador.fetch(pede('/api/resposta', carga), env)
    const r2 = await trabalhador.fetch(pede('/api/resposta', carga), env)
    const corpo = (await r2.json()) as { ok: boolean; id?: string }
    expect(corpo.ok).toBe(true)
    expect(corpo.id).toBe(carga.id)

    const conta = await fetch(
      `${BASE}/rest/v1/resposta?select=id&id=eq.${String(carga.id)}`,
      { headers: { 'accept-profile': 'experiencia' } },
    )
    expect(((await conta.json()) as unknown[]).length).toBe(1)
  })

  it.skipIf(!noAr)('nota fora de 0 a 10 e recusada antes de tocar o banco', async () => {
    const r = await trabalhador.fetch(pede('/api/resposta', { ...respostaBase(), nota: 11 }), env)
    expect(r.status).toBe(422)
    expect((await r.json()) as { erro: string }).toHaveProperty('erro')
  })

  it.skipIf(!noAr)('resposta por QR e aceita sem PIN', async () => {
    const carga = respostaBase()
    delete carga.garcom_pin_digitado
    delete carga.dispositivo_id
    delete carga.mesa_digitada
    carga.canal = 'qr'
    const r = await trabalhador.fetch(pede('/api/resposta', carga), env)
    const corpo = (await r.json()) as { ok: boolean; erro?: string }
    expect(corpo.erro ?? null, `QR sem PIN foi recusado: ${String(corpo.erro)}`).toBeNull()
    expect(corpo.ok).toBe(true)

    // E NAO gera tentativa: resposta por QR nao e abordagem de mesa, e contar uma inflaria o
    // denominador da conversao por garcom com abordagens que nunca existiram.
    const t = await fetch(`${BASE}/rest/v1/tentativa?select=id&id=eq.${String(carga.id)}`, {
      headers: { 'accept-profile': 'experiencia' },
    })
    expect(((await t.json()) as unknown[]).length).toBe(0)
  })

  it.skipIf(!noAr)('a nota de detrator gera alerta na mesma chamada', async () => {
    const carga = { ...respostaBase(), nota: 2 }
    await trabalhador.fetch(pede('/api/resposta', carga), env)
    const a = await fetch(
      `${BASE}/rest/v1/alerta_detrator?select=nota,destinatario&resposta_id=eq.${String(carga.id)}`,
      { headers: { 'accept-profile': 'experiencia' } },
    )
    const linhas = (await a.json()) as { nota: number }[]
    expect(linhas.length, 'nota 2 deveria ter gerado alerta na mesma transacao').toBe(1)
    expect(linhas[0]!.nota).toBe(2)
  })
})

describe('POST /api/tentativa', () => {
  it.skipIf(!noAr)('aceita a recusa e grava so a tentativa', async () => {
    const id = idNovo()
    const r = await trabalhador.fetch(
      pede('/api/tentativa', {
        id,
        criado_em_cliente: new Date().toISOString(),
        desfecho: 'recusou',
        canal: 'tablet',
        mesa_digitada: '12',
        garcom_pin_digitado: '5678',
        dispositivo_id: 'cccccccc-0000-4000-8000-000000000001',
      }),
      env,
    )
    expect((await r.json()) as { ok: boolean }).toMatchObject({ ok: true })

    const t = await fetch(`${BASE}/rest/v1/tentativa?select=desfecho&id=eq.${id}`, {
      headers: { 'accept-profile': 'experiencia' },
    })
    expect((await t.json()) as { desfecho: string }[]).toEqual([{ desfecho: 'recusou' }])

    const resp = await fetch(`${BASE}/rest/v1/resposta?select=id&id=eq.${id}`, {
      headers: { 'accept-profile': 'experiencia' },
    })
    expect(((await resp.json()) as unknown[]).length, 'recusa nao pode criar resposta').toBe(0)
  })

  it.skipIf(!noAr)('recusa `respondeu` por esta rota, para nao dobrar o denominador', async () => {
    const r = await trabalhador.fetch(
      pede('/api/tentativa', {
        id: idNovo(),
        criado_em_cliente: new Date().toISOString(),
        desfecho: 'respondeu',
        canal: 'tablet',
      }),
      env,
    )
    expect(r.status).toBe(422)
  })
})

describe('POST /api/sinal', () => {
  it.skipIf(!noAr)('atualiza o aparelho conhecido', async () => {
    const r = await trabalhador.fetch(
      pede('/api/sinal', {
        dispositivo_id: 'cccccccc-0000-4000-8000-000000000002',
        versao_app: '9.9.9',
        fila_pendente: 3,
      }),
      env,
    )
    expect((await r.json()) as { ok: boolean }).toMatchObject({ ok: true })

    const d = await fetch(
      `${BASE}/rest/v1/dispositivo?select=versao_app,fila_pendente&id=eq.cccccccc-0000-4000-8000-000000000002`,
      { headers: { 'accept-profile': 'experiencia' } },
    )
    expect((await d.json()) as unknown[]).toEqual([{ versao_app: '9.9.9', fila_pendente: 3 }])
  })
})

describe('POST /api/importa-r3', () => {
  /**
   * Conteudo UNICO por execucao, e um dia unico tambem.
   *
   * A idempotencia da importacao e por hash do arquivo, e o banco de ensaio sobrevive entre
   * execucoes do vitest. Com conteudo fixo, a segunda execucao da suite recebia
   * `duplicada: true` e o caso de importacao passava a testar outra coisa sem falhar — que e o
   * modo de falha mais perigoso de um teste.
   *
   * A unicidade entra como uma TERCEIRA LINHA DE PRODUTO, e nao como comentario: a primeira versao
   * deste teste punha `# ensaio <marca>` no fim, o parser leu aquilo como linha de dados e a
   * importacao falhou com "valor ilegivel". O parser esta certo — o R3 do Altec nao tem sintaxe de
   * comentario, e ensinar o parser a pular `#` seria tolerar um formato que ninguem viu.
   *
   * De quebra, o produto extra nao existe em `item_cardapio`, o que exercita o caminho do produto
   * sem item casado: a venda dele ENTRA no faturamento e NAO entra no cruzamento de reclamacao por
   * 100 unidades. E o caminho que gera o aviso da tela.
   */
  const marca = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  const CSV =
    'PRODUTO;ID;QUANTIDADE;VALOR LIQUIDO\n' +
    'MARGHERITA;ALT-100;40;1960,00\n' +
    'CALABRESA;ALT-101;12;624,00\n' +
    `PRODUTO DE ENSAIO ${marca};ALT-999;1;1,00\n`
  // Um dia distante do que `ensaio-dados.sql` semeia, para o UNIQUE
  // (dia_operacional, produto_nome_norm) nao esbarrar nas vendas de la.
  const DIA = '2026-03-15'

  it.skipIf(!noAr)('sem sessao devolve 401 e nao escreve nada', async () => {
    const antes = await fetch(`${BASE}/rest/v1/execucao_importacao?select=id`, {
      headers: { 'accept-profile': 'experiencia' },
    })
    const nAntes = ((await antes.json()) as unknown[]).length

    const r = await trabalhador.fetch(
      new Request(`https://exemplo.invalid/api/importa-r3?arquivo=r3.csv&dia=${DIA}`, {
        method: 'POST',
        body: CSV,
      }),
      env,
    )
    expect(r.status).toBe(401)

    const depois = await fetch(`${BASE}/rest/v1/execucao_importacao?select=id`, {
      headers: { 'accept-profile': 'experiencia' },
    })
    expect(
      ((await depois.json()) as unknown[]).length,
      'uma requisicao sem sessao gravou linha de importacao',
    ).toBe(nAntes)
  })

  it.skipIf(!noAr)('com sessao importa, grava o bruto e resolve o item do cardapio', async () => {
    const r = await trabalhador.fetch(
      new Request(`https://exemplo.invalid/api/importa-r3?arquivo=r3-de-teste.csv&dia=${DIA}`, {
        method: 'POST',
        body: CSV,
        headers: { authorization: 'Bearer sessao-boa-1' },
      }),
      env,
    )
    const corpo = (await r.json()) as {
      ok: boolean
      status?: string
      linhas_lidas?: number
      linhas_gravadas?: number
      sem_item_no_cardapio?: number
      nomes_sem_item?: string[]
      execucao_id?: string
      erros?: string[]
      erro?: string
    }
    expect(corpo.erro ?? null, `importacao falhou: ${String(corpo.erro)}`).toBeNull()
    expect(corpo.status, `erros: ${(corpo.erros ?? []).join('; ')}`).toBe('sucesso')
    expect(corpo.linhas_lidas).toBe(3)
    expect(corpo.linhas_gravadas).toBe(3)
    // Tres linhas, e exatamente UMA sem item: as duas pizzas do ensaio tem `produto_id_pdv`
    // cadastrado e casam por id_altec; o produto de ensaio nao existe no cardapio. Se este numero
    // virar 3, a resolucao por id_altec parou de funcionar e o cruzamento de reclamacao por 100
    // unidades perde o denominador sem nenhum erro aparecer em lugar nenhum.
    expect(corpo.sem_item_no_cardapio).toBe(1)
    expect(corpo.nomes_sem_item?.length).toBe(1)

    // O bruto, como BYTES. Se tiver entrado como texto decodificado, nao ha o que reprocessar.
    const e = await fetch(
      `${BASE}/rest/v1/execucao_importacao?select=origem,importado_por,arquivo,linhas,arquivo_bruto&id=eq.${String(corpo.execucao_id)}`,
      { headers: { 'accept-profile': 'experiencia' } },
    )
    const linhas = (await e.json()) as {
      origem: string
      importado_por: string
      arquivo: string
      linhas: number
      arquivo_bruto: string
    }[]
    expect(linhas.length).toBe(1)
    expect(linhas[0]!.origem).toBe('painel')
    // Quem subiu, vindo da sessao. E a primeira pergunta quando um faturamento nao fecha.
    expect(linhas[0]!.importado_por).toBe('dono@qt.invalid')
    expect(linhas[0]!.linhas).toBe(3)
    // Nao basta "chegou": os bytes tem de ser OS MESMOS. E disso que depende reprocessar do bruto
    // quando o layout do R3 mudar (ADR-12), e um arquivo em outra codificacao gravado como texto
    // decodificado perderia exatamente os acentos que se quer recuperar.
    const bruto = linhas[0]!.arquivo_bruto
    expect(typeof bruto, 'arquivo_bruto nao voltou como texto \\x hexadecimal').toBe('string')
    expect(bruto.startsWith('\\x')).toBe(true)
    expect(Buffer.from(bruto.slice(2), 'hex').toString('utf8')).toBe(CSV)
  })

  it.skipIf(!noAr)('o mesmo arquivo de novo e reconhecido, e nao dobra o faturamento', async () => {
    const url =
      `${BASE}/rest/v1/venda_produto_dia?select=valor_liquido` +
      `&produto_nome_norm=eq.MARGHERITA&dia_operacional=eq.${DIA}`
    const antes = (await (
      await fetch(url, { headers: { 'accept-profile': 'experiencia' } })
    ).json()) as { valor_liquido: string }[]
    expect(antes.length, 'a importacao anterior deveria ter gravado a Margherita deste dia').toBe(1)

    const r = await trabalhador.fetch(
      new Request(`https://exemplo.invalid/api/importa-r3?arquivo=r3-de-teste.csv&dia=${DIA}`, {
        method: 'POST',
        body: CSV,
        headers: { authorization: 'Bearer sessao-boa-2' },
      }),
      env,
    )
    const corpo = (await r.json()) as { ok: boolean; duplicada?: boolean }
    expect(corpo.ok).toBe(true)
    expect(corpo.duplicada, 'arquivo repetido deveria ser reconhecido pelo hash').toBe(true)

    const depois = (await (
      await fetch(url, { headers: { 'accept-profile': 'experiencia' } })
    ).json()) as unknown[]
    expect(depois).toEqual(antes)
  })

  it.skipIf(!noAr)('arquivo vazio e recusado com 422', async () => {
    const r = await trabalhador.fetch(
      new Request('https://exemplo.invalid/api/importa-r3', {
        method: 'POST',
        body: '',
        headers: { authorization: 'Bearer sessao-boa-3' },
      }),
      env,
    )
    expect(r.status).toBe(422)
  })
})

describe('as rotas que nao existem', () => {
  it.skipIf(!noAr)('devolvem 404 dizendo qual rota foi pedida', async () => {
    const r = await trabalhador.fetch(pede('/api/inventada'), env)
    expect(r.status).toBe(404)
    expect(((await r.json()) as { erro: string }).erro).toContain('/api/inventada')
  })

  it.skipIf(!noAr)('OPTIONS responde 204 com CORS, para o quiosque nao travar', async () => {
    const r = await trabalhador.fetch(
      new Request('https://exemplo.invalid/api/resposta', { method: 'OPTIONS' }),
      env,
    )
    expect(r.status).toBe(204)
    expect(r.headers.get('access-control-allow-methods')).toContain('POST')
  })
})
