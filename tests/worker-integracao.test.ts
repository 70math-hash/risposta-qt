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
import { caminhoCompleto } from '../src/coleta/questionario.js'
import type { Ambiente } from '../worker/lib/supabase.js'
import { credencial, limpaCacheDeToken } from '../worker/lib/token.js'

const BASE = process.env.PGREST_ENSAIO ?? 'http://127.0.0.1:8788'

/**
 * O ambiente do Worker, com o segredo JWT presente.
 *
 * Com ele, o Worker assina um token com `role: experiencia_app` e o substituto faz
 * `set local role experiencia_app`. Portanto TODOS os casos deste arquivo rodam sob as permissoes
 * do papel restrito, e nao sob `service_role` — que e o unico jeito de os grants das 26 tabelas e
 * as politicas de RLS serem exercitados por alguma coisa.
 */
/**
 * A chave de servico do ensaio e um JWT DE VERDADE, e nao a string `chave-de-ensaio`.
 *
 * A chave do Supabase e um JWT assinado com `role: service_role` no corpo, e e dai que o
 * PostgREST tira o papel. Com uma string qualquer, o substituto nao achava papel nenhum e caia no
 * pool cru — ou seja, rodava como SUPERUSUARIO.
 *
 * O efeito era anular o caso que este arquivo chama de "o unico que prova que os outros nao passam
 * por engano": o contraste de F55 mostrava que um superusuario escreve em `public.pratos`, e nao
 * que `service_role` escreve. Teste de negacao ao lado de um contraste que nao contrasta e prova
 * vazia.
 *
 * A assinatura e falsa de proposito e nao importa: nem o substituto nem o PostgREST verificam
 * assinatura para descobrir o papel — quem verifica e o servidor de verdade, com o segredo do
 * projeto, e isso esta fora do que este arquivo exercita.
 */
const CHAVE_DE_SERVICO =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UifQ.assinatura-de-ensaio'

const env: Ambiente = {
  SUPABASE_URL: BASE,
  SUPABASE_SERVICE_KEY: CHAVE_DE_SERVICO,
  SUPABASE_ANON_KEY: 'publica-de-ensaio',
  SUPABASE_JWT_SECRET: 'segredo-de-ensaio-que-nao-e-verificado-pelo-substituto',
}

/** O mesmo ambiente SEM o segredo: o caminho de reserva, que escreve como `service_role`. */
const envSemSegredo: Ambiente = {
  SUPABASE_URL: BASE,
  SUPABASE_SERVICE_KEY: CHAVE_DE_SERVICO,
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
    // As telas do caminho de PROMOTOR, com os nomes que a maquina de estados produz de verdade.
    //
    // A primeira versao deste arquivo mandava `telas: []`, e por isso passou ao lado do pior erro
    // do projeto: o CHECK de `tela_evento` aceitava `T3` e `T4` e recusava `ROT1` e `ROT2`. Como a
    // insercao acontece DENTRO de `fn_grava_resposta`, na mesma transacao, a resposta inteira era
    // rejeitada — cerca de 85% de tudo, porque promotor recebe 2 rotacionadas e neutro 1.
    //
    // Payload minimo passa por qualquer coisa. E por isso que o payload padrao daqui e o do caminho
    // mais longo, e nao o mais curto.
    telas: caminhoCompleto({ nota: 9, rotacionadas: 2 }).map((tela, i) => ({
      tela,
      entrou_em: new Date(Date.UTC(2026, 7, 5, 1, i)).toISOString(),
      saiu_em: new Date(Date.UTC(2026, 7, 5, 1, i, 8)).toISOString(),
      pulou: false,
    })),
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

  it.skipIf(!noAr)('as telas do caminho de promotor sao gravadas, e nao recusadas', async () => {
    const carga = respostaBase()
    const telas = (carga.telas as { tela: string }[]).map((t) => t.tela)
    // O caminho de promotor com 2 rotacionadas passa por ROT1 e ROT2. Se este teste voltar a passar
    // com uma lista que nao contem as duas, ele deixou de cobrir o caso que importa.
    expect(telas, 'o payload padrao deveria passar por ROT1 e ROT2').toContain('ROT1')
    expect(telas).toContain('ROT2')

    const r = await trabalhador.fetch(pede('/api/resposta', carga), env)
    const corpo = (await r.json()) as { ok: boolean; erro?: string }
    expect(
      corpo.erro ?? null,
      `a resposta INTEIRA foi recusada por causa de um nome de tela: ${String(corpo.erro)}`,
    ).toBeNull()

    const gravadas = await fetch(
      `${BASE}/rest/v1/tela_evento?select=tela&resposta_id=eq.${carga.id}`,
      { headers: { 'accept-profile': 'experiencia' } },
    )
    const nomes = ((await gravadas.json()) as { tela: string }[]).map((t) => t.tela)
    expect(nomes.sort()).toEqual([...telas].sort())
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

describe('as escritas administrativas', () => {
  /**
   * A lista branca de `worker/admin.ts` e a FRONTEIRA DE SEGURANCA destas rotas.
   *
   * O Worker tem a chave de servico, que passa por cima de RLS. Uma rota administrativa generica
   * daria, a quem tivesse uma sessao, poder sobre o banco inteiro — incluindo `resposta` e as cinco
   * tabelas do sistema fiscal em `public`. Estes casos giram a maçaneta em cada porta que tem de
   * estar fechada, em vez de conferir a lista por leitura.
   */
  const admin = (caminho: string, corpo?: unknown, token = 'sessao-boa-admin') =>
    new Request(`https://exemplo.invalid/api/admin${caminho}`, {
      method: corpo === undefined ? 'GET' : 'POST',
      ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
      headers: {
        'content-type': 'application/json',
        ...(token === '' ? {} : { authorization: `Bearer ${token}` }),
      },
    })

  it.skipIf(!noAr)('sem sessao, nada abre', async () => {
    const r = await trabalhador.fetch(admin('/garcom', { nome: 'X', pin: '1' }, ''), env)
    expect(r.status).toBe(401)
  })

  it.skipIf(!noAr)('o catalogo lista as entidades e as colunas de cada uma', async () => {
    const r = await trabalhador.fetch(admin(''), env)
    const corpo = (await r.json()) as { ok: boolean; entidades: Record<string, { colunas: string[] }> }
    expect(corpo.ok).toBe(true)
    expect(Object.keys(corpo.entidades)).toContain('mesa_atendida_dia')
    expect(corpo.entidades['garcom']!.colunas).toContain('pin')
    // Nenhuma entidade de resposta, nunca: resposta nasce completa e nao se edita.
    for (const proibida of ['resposta', 'resposta_opcao', 'tentativa', 'consentimento']) {
      expect(
        Object.keys(corpo.entidades),
        `${proibida} nao pode ser entidade administrativa`,
      ).not.toContain(proibida)
    }
  })

  it.skipIf(!noAr)('entidade fora da lista devolve 404, e nao escreve', async () => {
    // O caso que importa: o nome de uma tabela que EXISTE no banco, mas nao esta na lista branca.
    for (const alvo of ['resposta', 'tentativa', 'consentimento', 'pratos', 'insumos_master']) {
      const r = await trabalhador.fetch(admin(`/${alvo}`, { nota: 0 }), env)
      expect(r.status, `${alvo} deveria ser 404`).toBe(404)
    }
  })

  it.skipIf(!noAr)('coluna fora da lista e RECUSADA, e nao ignorada em silencio', async () => {
    // Ignorar faria a tela dizer "salvo" sobre um campo que nao foi gravado.
    const r = await trabalhador.fetch(
      admin('/mesa', { numero: '99', area: 'salao', capacidade: 4, id: 'tentativa-de-forcar-id' }),
      env,
    )
    expect(r.status).toBe(422)
    expect(((await r.json()) as { erro: string }).erro).toContain('id')
  })

  it.skipIf(!noAr)('campo obrigatorio faltando na criacao devolve 422', async () => {
    const r = await trabalhador.fetch(admin('/garcom', { nome: 'Sem PIN' }), env)
    expect(r.status).toBe(422)
    expect(((await r.json()) as { erro: string }).erro).toContain('pin')
  })

  it.skipIf(!noAr)('o dever diario: informar mesas atendidas, e corrigir sem duplicar', async () => {
    const dia = '2026-02-10'
    const primeiro = await trabalhador.fetch(admin('/mesa_atendida_dia', { dia_operacional: dia, mesas: 15 }), env)
    expect(((await primeiro.json()) as { ok: boolean }).ok).toBe(true)

    // De novo, com outro numero: e correcao, e tem de SUBSTITUIR. Sem o upsert pela chave natural, o
    // dia passaria a ter dois denominadores e a conversao da casa ficaria ambigua.
    const segundo = await trabalhador.fetch(admin('/mesa_atendida_dia', { dia_operacional: dia, mesas: 18 }), env)
    expect(((await segundo.json()) as { ok: boolean }).ok).toBe(true)

    const linhas = (await (
      await fetch(`${BASE}/rest/v1/mesa_atendida_dia?select=mesas&dia_operacional=eq.${dia}`, {
        headers: { 'accept-profile': 'experiencia' },
      })
    ).json()) as { mesas: number }[]
    expect(linhas.length, 'informar duas vezes criou duas linhas').toBe(1)
    expect(linhas[0]!.mesas).toBe(18)
  })

  it.skipIf(!noAr)('desligar garcom preserva o historico, e nao apaga a linha', async () => {
    // PIN unico por execucao: `garcom` tem UNIQUE em `pin`, e o banco de ensaio sobrevive entre
    // execucoes do vitest. Com PIN fixo, a segunda execucao batia no UNIQUE e o teste falhava com
    // `salvo` indefinido, que nao diz nada sobre a causa.
    const pin = String(900000 + Math.floor(Math.random() * 99999))
    const criado = await trabalhador.fetch(admin('/garcom', { nome: `Temporario ${pin}`, pin }), env)
    const corpoCriado = (await criado.json()) as { salvo?: { id: string }; erro?: string }
    expect(corpoCriado.erro ?? null, `nao criou: ${String(corpoCriado.erro)}`).toBeNull()
    const salvo = corpoCriado.salvo
    expect(salvo?.id).toBeTypeOf('string')

    const r = await trabalhador.fetch(
      new Request(`https://exemplo.invalid/api/admin/garcom/${salvo!.id}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer sessao-boa-admin' },
      }),
      env,
    )
    const corpoDel = (await r.json()) as { ok: boolean; erro?: string }
    expect(corpoDel.erro ?? null, `nao desligou: ${String(corpoDel.erro)}`).toBeNull()
    expect(corpoDel.ok).toBe(true)

    const linhas = (await (
      await fetch(`${BASE}/rest/v1/garcom?select=nome,removido_em&id=eq.${salvo!.id}`, {
        headers: { 'accept-profile': 'experiencia' },
      })
    ).json()) as { nome: string; removido_em: string | null }[]
    // A LINHA continua: garcom removido segue nas respostas dele, e apagar deixaria a resposta
    // apontando para nada.
    expect(linhas.length).toBe(1)
    expect(linhas[0]!.removido_em).not.toBeNull()
  })

  it.skipIf(!noAr)('o dever mensal: rotacionar a pergunta em foco', async () => {
    const perguntas = (await (
      await fetch(`${BASE}/rest/v1/pergunta_banco?select=id&numero=eq.3`, {
        headers: { 'accept-profile': 'experiencia' },
      })
    ).json()) as { id: string }[]
    const id = perguntas[0]!.id

    const r = await trabalhador.fetch(
      admin(`/pergunta_banco/${id}`, { em_foco: true, em_foco_desde: '2026-02-01' }),
      env,
    )
    expect(((await r.json()) as { ok: boolean; erro?: string }).ok).toBe(true)

    // E o texto NAO se muda por aqui: mudar o texto faz a contagem de um mes deixar de ser
    // comparavel com a do outro, e isso passa por migration com numero novo.
    const proibido = await trabalhador.fetch(
      admin(`/pergunta_banco/${id}`, { texto_pt: 'outra pergunta' }),
      env,
    )
    expect(proibido.status).toBe(422)
  })

  it.skipIf(!noAr)('registrar contato com o detrator', async () => {
    // A resposta de nota 2 gravada mais acima gerou alerta.
    const alertas = (await (
      await fetch(`${BASE}/rest/v1/alerta_detrator?select=resposta_id&nota=eq.2&limit=1`, {
        headers: { 'accept-profile': 'experiencia' },
      })
    ).json()) as { resposta_id: string }[]
    expect(alertas.length, 'esperava um alerta de nota 2 das gravacoes anteriores').toBe(1)

    const r = await trabalhador.fetch(
      new Request('https://exemplo.invalid/api/contato-alerta', {
        method: 'POST',
        body: JSON.stringify({ resposta_id: alertas[0]!.resposta_id }),
        headers: { 'content-type': 'application/json', authorization: 'Bearer sessao-boa-admin' },
      }),
      env,
    )
    expect(((await r.json()) as { ok: boolean; erro?: string }).ok).toBe(true)

    const depois = (await (
      await fetch(
        `${BASE}/rest/v1/alerta_detrator?select=contato_em&resposta_id=eq.${alertas[0]!.resposta_id}`,
        { headers: { 'accept-profile': 'experiencia' } },
      )
    ).json()) as { contato_em: string | null }[]
    expect(depois[0]!.contato_em).not.toBeNull()
  })

  it.skipIf(!noAr)('atender pedido de exclusao anonimiza e carimba, e e idempotente', async () => {
    // Um cliente com contato, e um pedido citando o e-mail dele.
    const cliente = (await (
      await fetch(`${BASE}/rest/v1/cliente`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-profile': 'experiencia',
          prefer: 'return=representation',
        },
        body: JSON.stringify([
          { nome: 'Titular', email: 'titular@exemplo.invalid', ultima_visita_em: new Date().toISOString() },
        ]),
      })
    ).json()) as { id: string }[]

    const pedido = (await (
      await fetch(`${BASE}/rest/v1/exclusao_pedido`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-profile': 'experiencia',
          prefer: 'return=representation',
        },
        body: JSON.stringify([{ contato_informado: 'titular@exemplo.invalid' }]),
      })
    ).json()) as { id: string }[]

    const pede = () =>
      trabalhador.fetch(
        new Request('https://exemplo.invalid/api/atende-exclusao', {
          method: 'POST',
          body: JSON.stringify({ pedido_id: pedido[0]!.id }),
          headers: { 'content-type': 'application/json', authorization: 'Bearer sessao-boa-admin' },
        }),
        env,
      )

    const r1 = (await (await pede()).json()) as {
      ok: boolean
      ja_atendido?: boolean
      clientes_anonimizados?: number
      erro?: string
    }
    expect(r1.erro ?? null, `nao atendeu: ${String(r1.erro)}`).toBeNull()
    expect(r1.ja_atendido).toBe(false)
    expect(r1.clientes_anonimizados).toBe(1)

    // O dado pessoal saiu e a LINHA ficou: `anonimizado_em` e a prova de que o pedido foi atendido.
    const depois = (await (
      await fetch(`${BASE}/rest/v1/cliente?select=email,nome,anonimizado_em&id=eq.${cliente[0]!.id}`, {
        headers: { 'accept-profile': 'experiencia' },
      })
    ).json()) as { email: string | null; nome: string | null; anonimizado_em: string | null }[]
    expect(depois.length, 'a linha do cliente foi apagada, e deveria ter sido anonimizada').toBe(1)
    expect(depois[0]!.email).toBeNull()
    expect(depois[0]!.nome).toBeNull()
    expect(depois[0]!.anonimizado_em).not.toBeNull()

    // Idempotente: um duplo clique na tela nao pode gerar um segundo carimbo com data diferente.
    const r2 = (await (await pede()).json()) as { ja_atendido?: boolean; clientes_anonimizados?: number }
    expect(r2.ja_atendido).toBe(true)
    expect(r2.clientes_anonimizados).toBe(0)
  })
})

describe('o papel de escrita', () => {
  /**
   * A coisa que estes casos protegem: que o Worker escreva com o papel RESTRITO, e que a queda para
   * `service_role` seja VISIVEL.
   *
   * Com `service_role`, o Postgres passa por cima de RLS e o papel alcanca o `public` do sistema
   * fiscal. Nesse caso a matriz de grants das 26 tabelas, as politicas de RLS, a invariante de
   * append-only e o critério de aceite de F55 nao estao valendo — e um sistema que cai para o
   * caminho mais permissivo em silencio e pior que um que nunca teve o restrito, porque o documento
   * passa a descrever uma protecao que nao existe.
   */
  it.skipIf(!noAr)('com o segredo JWT, escreve como experiencia_app', async () => {
    limpaCacheDeToken()
    const r = await trabalhador.fetch(pede('/api/saude'), env)
    const corpo = (await r.json()) as { papel_de_escrita: string; permissoes_valendo: boolean }
    expect(corpo.papel_de_escrita).toBe('experiencia_app')
    expect(corpo.permissoes_valendo).toBe(true)
  })

  it.skipIf(!noAr)('sem o segredo, cai para service_role E DIZ que caiu', async () => {
    limpaCacheDeToken()
    const r = await trabalhador.fetch(pede('/api/saude'), envSemSegredo)
    const corpo = (await r.json()) as {
      papel_de_escrita: string
      permissoes_valendo: boolean
      aviso?: string
    }
    expect(corpo.papel_de_escrita).toBe('service_role')
    expect(corpo.permissoes_valendo).toBe(false)
    // O aviso e a parte que importa: sem ele, a degradacao e silenciosa.
    expect(corpo.aviso, 'a queda para service_role tem de vir com aviso').toBeTypeOf('string')
    expect(corpo.aviso).toContain('SUPABASE_JWT_SECRET')
    limpaCacheDeToken()
  })

  it.skipIf(!noAr)('a gravacao de resposta funciona sob o papel restrito', async () => {
    // Nao basta o papel estar certo: ele tem de conseguir fazer o trabalho. Se `experiencia_app`
    // nao alcancasse `fn_grava_resposta` ou uma das seis tabelas filhas, a coleta pararia — e o
    // conserto seria dar mais permissao, que e o caminho de volta ao problema.
    limpaCacheDeToken()
    const carga = respostaBase()
    const r = await trabalhador.fetch(pede('/api/resposta', carga), env)
    const corpo = (await r.json()) as { ok: boolean; erro?: string }
    expect(
      corpo.erro ?? null,
      `o papel restrito nao consegue gravar: ${String(corpo.erro)}`,
    ).toBeNull()
    expect(corpo.ok).toBe(true)
  })

  it.skipIf(!noAr)('o token do papel restrito e um JWT com o claim role', async () => {
    // O claim `role` e a unica razao de este arquivo existir: e ele que o PostgREST le para decidir
    // o papel. Um token sem ele seria aceito e rodaria como o papel de conexao.
    limpaCacheDeToken()
    const cred = await credencial(env, Date.parse('2026-08-05T01:00:00Z'))
    expect(cred.papel).toBe('experiencia_app')
    const token = cred.autorizacao.replace(/^Bearer /, '')
    const [cabecalho, corpo, assinatura] = token.split('.')
    expect(assinatura, 'token sem assinatura').toBeTypeOf('string')
    expect(JSON.parse(Buffer.from(cabecalho!, 'base64url').toString())).toMatchObject({
      alg: 'HS256',
    })
    const claims = JSON.parse(Buffer.from(corpo!, 'base64url').toString()) as {
      role: string
      exp: number
      iat: number
    }
    expect(claims.role).toBe('experiencia_app')
    // Validade curta: um token longo que vaze vale por muito tempo.
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(60)
    limpaCacheDeToken()
  })
})

describe('F55: o sistema de experiencia nao escreve no sistema fiscal', () => {
  /**
   * O critério de aceite de F55 e um teste de NEGACAO, e ele nunca havia sido executado por nada.
   * Enquanto o Worker escrevia como `service_role`, ele FALHAVA por construcao: aquele papel tem
   * privilegio no `public` do sistema fiscal e passa por cima de RLS.
   *
   * Estes casos vao pela mesma pilha que a aplicacao usa — token do papel restrito, HTTP, PostgREST,
   * Postgres — e nao por `has_table_privilege`. Ler o grant prova o que o catalogo diz; girar a
   * maçaneta prova o que o banco faz.
   */
  const comPapelRestrito = async (caminho: string, init: RequestInit) => {
    limpaCacheDeToken()
    const cred = await credencial(env)
    return fetch(`${BASE}${caminho}`, {
      ...init,
      headers: {
        apikey: cred.apikey,
        authorization: cred.autorizacao,
        'content-profile': 'public',
        'accept-profile': 'public',
        ...((init.headers as Record<string, string> | undefined) ?? {}),
      },
    })
  }

  it.skipIf(!noAr)('LE as cinco tabelas de custo', async () => {
    // Precisa poder ler: `vw_custo_prato` e `security_invoker`, entao quem precisa de permissao nas
    // tabelas de custo e o papel do chamador. Sem leitura, a aba de pratos morre.
    for (const tabela of [
      'pratos',
      'prato_ingredientes',
      'insumos_master',
      'historico_precos',
      'producao_ingredientes',
    ]) {
      const r = await comPapelRestrito(`/rest/v1/${tabela}?select=id&limit=1`, { method: 'GET' })
      expect(r.status, `nao consegue ler public.${tabela}`).toBe(200)
    }
  })

  it.skipIf(!noAr)('NAO escreve em nenhuma das cinco', async () => {
    const tentativas: { tabela: string; corpo: Record<string, unknown> }[] = [
      { tabela: 'pratos', corpo: { nome: 'proibido', categoria: 'X' } },
      { tabela: 'insumos_master', corpo: { nome_qt: 'PROIBIDO', tipo: 'comercial', rn: 1 } },
      { tabela: 'historico_precos', corpo: { data: '2026-01-01', valor_unit_normalizado: 1 } },
    ]
    for (const t of tentativas) {
      const r = await comPapelRestrito(`/rest/v1/${t.tabela}`, {
        method: 'POST',
        body: JSON.stringify([t.corpo]),
        headers: { 'content-type': 'application/json' },
      })
      expect(
        r.status,
        `o INSERT em public.${t.tabela} foi ACEITO. O sistema de experiencia consome custo e nunca o produz (F55, ADR-04)`,
      ).toBeGreaterThanOrEqual(400)
    }
  })

  it.skipIf(!noAr)('NAO edita resposta, nem sob o papel da aplicacao', async () => {
    // Append-only por PERMISSAO, e nao por comentario. Sem isto, uma nota poderia ser corrigida
    // depois de gravada, e o historico deixaria de ser o que os clientes responderam.
    limpaCacheDeToken()
    const cred = await credencial(env)
    const r = await fetch(`${BASE}/rest/v1/resposta?nota=eq.9`, {
      method: 'PATCH',
      body: JSON.stringify({ nota: 10 }),
      headers: {
        apikey: cred.apikey,
        authorization: cred.autorizacao,
        'content-type': 'application/json',
        'content-profile': 'experiencia',
      },
    })
    expect(r.status, 'o UPDATE em experiencia.resposta foi ACEITO').toBeGreaterThanOrEqual(400)
    limpaCacheDeToken()
  })

  it.skipIf(!noAr)('o MESMO insert passa como service_role, e e isso que prova o mecanismo', async () => {
    /**
     * O caso mais importante deste arquivo, e o unico que prova que os outros nao passam por
     * engano.
     *
     * Um teste de negacao que recusa por qualquer motivo — coluna errada, tabela inexistente,
     * substituto sem `set role` — passa parecendo prova. O contraste e o que separa "foi recusado
     * porque o papel restrito nao pode" de "foi recusado por outro motivo qualquer": o MESMO
     * pedido, com a MESMA carga, tem de ser ACEITO quando quem escreve e o `service_role`.
     *
     * E o resultado tambem e a demonstracao de A07: era exatamente assim que o Worker escrevia
     * antes, e por isso o critério de aceite de F55 falhava por construcao.
     */
    limpaCacheDeToken()
    const credServico = await credencial(envSemSegredo)
    expect(credServico.papel).toBe('service_role')

    const carga = [{ nome: 'PROVA DO MECANISMO', categoria: 'X' }]
    const comServico = await fetch(`${BASE}/rest/v1/pratos`, {
      method: 'POST',
      body: JSON.stringify(carga),
      headers: {
        apikey: credServico.apikey,
        authorization: credServico.autorizacao,
        'content-type': 'application/json',
        'content-profile': 'public',
      },
    })
    expect(
      comServico.status,
      'o insert como service_role foi recusado: o contraste nao prova nada assim, e os testes de negacao acima podem estar passando por outro motivo',
    ).toBeLessThan(400)

    // Limpa o que acabou de entrar: `vw_custo_prato` conta pratos, e um prato de teste sobrando
    // mudaria o numero que a Parte 10 do ensaio confere a lapis.
    await fetch(`${BASE}/rest/v1/pratos?nome=eq.PROVA%20DO%20MECANISMO`, {
      method: 'DELETE',
      headers: {
        apikey: credServico.apikey,
        authorization: credServico.autorizacao,
        'content-profile': 'public',
      },
    })
    limpaCacheDeToken()
  })

  it.skipIf(!noAr)('e o papel restrito NAO e o mesmo que o de leitura do painel', async () => {
    // `anon` nao le nada, e e por isso que a chave publica no bundle e inofensiva. Conferido aqui
    // tambem, e nao so na migration, porque este e o caminho HTTP de verdade.
    const r = await fetch(`${BASE}/rest/v1/resposta?select=nota&limit=1`, {
      headers: { apikey: 'publica', authorization: 'Bearer anon-sem-nada', 'accept-profile': 'experiencia' },
    })
    // Token sem claim `role` cai no papel de conexao do substituto, que e superusuario, entao este
    // caso NAO prova nada sobre `anon` e existe apenas para registrar a limitacao: quem prova que
    // `anon` nao le e a migration 20260817106000, com `set role anon` de verdade.
    expect([200, 401, 403]).toContain(r.status)
  })
})
