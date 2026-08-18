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

/**
 * O retrato das views, gerado por `scripts/formas-das-views.mjs` a partir do banco de ensaio.
 *
 * As leituras do Worker nao param em tabela: as rotinas leem VIEW, e a coluna de uma view nao
 * esta em nenhum `create table`. Sem este retrato, a conferencia cobriria so metade das
 * consultas, e foi na metade descoberta que estavam os dois piores erros: o digest filtrando
 * `vw_fator_contagem` por `dia_operacional`, coluna que essa view nao tem, e o classificador
 * lendo `vw_texto_a_classificar`, view que nao existia.
 */
function colunasPorView(): Map<string, Set<string>> {
  const retrato = JSON.parse(
    readFileSync(join(process.cwd(), 'supabase', 'formas-das-views.json'), 'utf8'),
  ) as Record<string, string[]>
  return new Map(Object.entries(retrato).map(([v, cs]) => [v, new Set(cs)]))
}

/** Toda fonte do Worker. As rotinas leem tanto quanto o `index`, e erravam mais. */
function arquivosDoWorker(): { arquivo: string; texto: string }[] {
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

/**
 * Cada `seleciona(env, 'relacao', 'consulta')` de TODO o Worker.
 *
 * A consulta e reconhecida em duas formas, porque as duas existem na fonte: string simples e
 * template com interpolacao. No template, cada `${...}` e trocado por um marcador, porque o
 * que se confere e o NOME DA COLUNA a esquerda do `=`, e nunca o valor a direita.
 */
function consultasDoWorker(): { arquivo: string; relacao: string; consulta: string }[] {
  const saida: { arquivo: string; relacao: string; consulta: string }[] = []
  const re = /seleciona<[^>]*>\(\s*env,\s*'([a-z_]+)',\s*(?:'([^']*)'|`([^`]*)`)/g
  for (const { arquivo, texto } of arquivosDoWorker()) {
    for (const m of texto.matchAll(re)) {
      const consulta = (m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, 'VALOR')
      saida.push({ arquivo: arquivo.replace(process.cwd(), '.'), relacao: m[1]!, consulta })
    }
  }
  return saida
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
        // `*` nao e coluna: e o pedido de todas elas, e nao ha nada a conferir.
        if (semApelido !== '' && semApelido !== '*' && !semApelido.includes('(')) {
          citadas.push(semApelido)
        }
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

describe('as colunas que o Worker pede existem, em tabela ou em view', () => {
  const tabelas = colunasPorTabela(todoSql())
  const views = colunasPorView()
  const consultas = consultasDoWorker()

  it('o DDL foi lido e as tabelas de cadastro estao la', () => {
    for (const t of ['item_cardapio', 'pergunta_banco', 'consentimento_texto', 'mesa']) {
      expect(tabelas.has(t), `nao achei create table de ${t}`).toBe(true)
    }
    // Se este numero cair muito, o recortador de DDL quebrou e o teste passaria vazio.
    expect(tabelas.size).toBeGreaterThanOrEqual(20)
  })

  it('o Worker le tanto tabela quanto view, e as duas familias foram encontradas', () => {
    // Sete leituras chegaram a existir sem conferencia nenhuma, todas em rotina e todas em
    // view. Contar as duas familias separado e o que impede o teste de voltar a cobrir metade.
    expect(consultas.filter((c) => c.relacao.startsWith('vw_')).length).toBeGreaterThanOrEqual(5)
    expect(consultas.filter((c) => !c.relacao.startsWith('vw_')).length).toBeGreaterThanOrEqual(4)
  })

  it.each(consultasDoWorker())(
    '$relacao ($arquivo): toda coluna citada existe',
    ({ relacao, consulta }) => {
      const existentes = tabelas.get(relacao) ?? views.get(relacao)
      expect(
        existentes,
        `o Worker le ${relacao}, que nenhuma migration cria. ` +
          `Views que existem: ${[...views.keys()].join(', ')}`,
      ).toBeDefined()
      const faltando = colunasCitadas(consulta).filter((c) => !existentes!.has(c))
      expect(
        faltando,
        `${relacao}: coluna citada e inexistente: ${faltando.join(', ')}. ` +
          `Existem: ${[...existentes!].join(', ')}`,
      ).toEqual([])
    },
  )

  it('item_cardapio e pedido com os dois nomes, porque o idioma e escolhido na tela', () => {
    const q = consultas.find((c) => c.relacao === 'item_cardapio' && c.consulta.includes('grupo'))
    expect(q).toBeDefined()
    expect(q!.consulta).toContain('nome_pt')
    expect(q!.consulta).toContain('nome_en')
  })

  it('o item removido e o inativo nao chegam ao quiosque', () => {
    // Sem os dois filtros, prato tirado do cardapio continuaria aparecendo na T3C2, e a
    // reclamacao seria atribuida a um item que a casa nao serve mais.
    const q = consultas.find((c) => c.relacao === 'item_cardapio' && c.consulta.includes('grupo'))!
    expect(q.consulta).toContain('removido_em=is.null')
    expect(q.consulta).toContain('ativo=is.true')
  })

  it('vw_fator_contagem e filtrada por janela, e nao por dia_operacional', () => {
    // A view e uma serie por janela e nao tem coluna de dia. O filtro errado devolvia 400, e
    // como as consultas do digest correm num Promise.all, esse 400 derrubava o e-mail das 16h,
    // que e o unico alarme do sistema: a regra "se nao chegar dois dias seguidos, algo quebrou"
    // ficaria permanentemente disparada.
    const q = consultas.find((c) => c.relacao === 'vw_fator_contagem')
    expect(q, 'o digest deveria ler vw_fator_contagem').toBeDefined()
    expect(q!.consulta).toContain('janela=eq.')
    expect(q!.consulta).not.toContain('dia_operacional=eq.')
    // E somente uma origem: opcao marcada mais classificacao de texto contaria a mesma
    // reclamacao duas vezes, uma pelo toque e outra pela frase que a descreve.
    expect(q!.consulta).toContain('origem=eq.')
  })

  it('pin_nao_reconhecido e lido de vw_coleta_dia, que e onde a coluna mora', () => {
    const digest = readFileSync(join(process.cwd(), 'worker', 'rotinas', 'digest.ts'), 'utf8')
    expect(views.get('vw_hoje')?.has('pin_nao_reconhecido')).toBe(false)
    expect(views.get('vw_coleta_dia')?.has('pin_nao_reconhecido')).toBe(true)
    expect(digest).toContain("'vw_coleta_dia'")
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

    // `insere(env, 'x', frases.map((f) => ({ ... })))`: o objeto esta DEPOIS da chamada, no
    // callback ali mesmo, e nao na declaracao da variavel. Sem este ramo, o recortador ia
    // procurar `const frases = ` e trazia o primeiro objeto que achasse dali em diante — que
    // pode ser qualquer `.map` de normalizacao no meio do caminho, e nao o que e escrito.
    if (texto.slice(inicioArg).startsWith(`${nome}.map(`)) {
      const seta = texto.indexOf('=> ({', inicioArg)
      if (seta < 0) continue
      const f = fecha(texto, seta + 3)
      if (f < 0) continue
      saida.push({ tabela, chaves: chavesDeObjeto(texto.slice(seta + 4, f)) })
      continue
    }

    const decl = texto.indexOf(`const ${nome} = `)
    if (decl < 0 || decl > inicioArg) continue

    // O ULTIMO retorno de objeto antes da chamada, e nao o primeiro depois da declaracao.
    //
    // A versao anterior pegava o primeiro, e por isso era fragil: bastava a variavel ganhar um
    // `.map((f) => ({ ... }))` entre a declaracao e a escrita para o recorte trazer o objeto
    // errado. Foi o que aconteceu quando `classificador.ts` passou a normalizar `fator` ausente:
    // o teste acusou "a escrita em classificacao_texto saiu sem chave nenhuma", apontando para
    // um objeto que nao e escrito em lugar nenhum. O que se quer e o objeto que o callback DA
    // CHAMADA devolve, e ele e sempre o mais proximo dela.
    const janela = texto.slice(decl, inicioArg)
    const seta = janela.lastIndexOf('=> ({')
    const retorno = janela.lastIndexOf('return {')
    const abre =
      seta > retorno
        ? decl + seta + 3
        : retorno >= 0
          ? decl + retorno + 7
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
  const escritas = arquivosDoWorker().flatMap((f) =>
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
    arquivosDoWorker().flatMap((f) =>
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
    const worker = arquivosDoWorker().map((f) => f.texto).join('\n')
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
    const worker = arquivosDoWorker().map((f) => f.texto).join('\n')
    expect(worker).toContain('paraBytea')
    // O erro anterior, textualmente: a string decodificada por UTF-8 indo para uma coluna bytea.
    expect(worker).not.toMatch(/arquivo_bruto:\s*texto/)
  })

  it('venda_produto_dia e inserida com on_conflict pelo par UNIQUE, e nao pela chave primaria', () => {
    const worker = arquivosDoWorker().map((f) => f.texto).join('\n')
    // Sem isto, `resolution=merge-duplicates` resolve pelo `id`, que e sempre novo, e a
    // reimportacao do mesmo dia levanta 409 em vez de substituir o dia (F39).
    expect(worker).toContain("on_conflict: 'dia_operacional,produto_nome_norm'")
  })

  it('o filtro de idempotencia do watcher usa a coluna hash que existe', () => {
    const worker = arquivosDoWorker().map((f) => f.texto).join('\n')
    expect(worker).toContain('hash=eq.')
    expect(worker).not.toContain('hash_arquivo')
  })
})

describe('os dominios fechados escritos em TypeScript casam com o CHECK do banco', () => {
  /**
   * O classificador filtra `polaridade` e `severidade` por listas escritas na propria fonte,
   * porque as duas existem so na classificacao e nao no dominio da coleta. Duas listas em dois
   * lugares divergem: se o CHECK do banco passar a aceitar um quarto valor e a lista aqui nao,
   * a frase valida e descartada em silencio; se for o contrario, a insercao do LOTE inteiro e
   * rejeitada e o comentario nao e classificado.
   */
  const sql = todoSql()
  const classificador = readFileSync(
    join(process.cwd(), 'worker', 'rotinas', 'classificador.ts'),
    'utf8',
  )

  /** Os valores de um `check (coluna in ('a','b'))` das migrations. */
  function dominioDoCheck(constraint: string): string[] {
    const m = new RegExp(`${constraint}\\s*\\n?\\s*check \\([a-z_]+ in \\(([^)]*)\\)`).exec(sql)
    expect(m, `nao achei o CHECK ${constraint} nas migrations`).not.toBeNull()
    return [...m![1]!.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]!)
  }

  /** Os valores de uma constante `readonly ... = ['a', 'b']` da fonte. */
  function listaDaFonte(nome: string): string[] {
    const m = new RegExp(`const ${nome}[^=]*=\\s*\\[([^\\]]*)\\]`).exec(classificador)
    expect(m, `nao achei a constante ${nome} no classificador`).not.toBeNull()
    return [...m![1]!.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]!)
  }

  it('polaridade: a lista do classificador e o CHECK sao o mesmo conjunto', () => {
    expect([...listaDaFonte('POLARIDADES')].sort()).toEqual(
      [...dominioDoCheck('classificacao_texto_polaridade_dominio')].sort(),
    )
  })

  it('severidade: a lista do classificador e o CHECK sao o mesmo conjunto', () => {
    expect([...listaDaFonte('SEVERIDADES')].sort()).toEqual(
      [...dominioDoCheck('classificacao_texto_severidade_dominio')].sort(),
    )
  })

  it('o classificador filtra as duas antes de inserir', () => {
    // Sem o filtro, uma frase com `negativa` no lugar de `negativo` derruba o lote inteiro e o
    // comentario fica sem classificacao nenhuma, inclusive as frases que estavam certas.
    expect(classificador).toContain('POLARIDADES.includes')
    expect(classificador).toContain('SEVERIDADES.includes')
  })
})

describe('a rota de importacao manual escreve faturamento, e por isso exige sessao', () => {
  const worker = arquivosDoWorker()
    .map((f) => f.texto)
    .join('\n')
  const index = readFileSync(join(process.cwd(), 'worker', 'index.ts'), 'utf8')

  it('a rota existe e esta registrada no switch', () => {
    expect(index).toContain("case 'POST /api/importa-r3':")
  })

  it('a rota confere a sessao ANTES de qualquer escrita', () => {
    // A ordem e o que importa. Conferir depois de gravar o arquivo bruto deixaria qualquer pessoa
    // com a URL encher `execucao_importacao` de lixo, com a chave de servico por tras.
    const rota = index.slice(index.indexOf('async function postImportaR3'))
    const corpo = rota.slice(0, rota.indexOf('\n}\n'))
    const iSessao = corpo.indexOf('usuarioDaRequisicao')
    const iEscrita = corpo.indexOf('importaR3(env')
    expect(iSessao).toBeGreaterThan(-1)
    expect(iEscrita).toBeGreaterThan(-1)
    expect(iSessao, 'a sessao tem de ser conferida antes de importar').toBeLessThan(iEscrita)
  })

  it('a conferencia de sessao usa a chave publica, e nunca a de servico', () => {
    // Com a chave de servico, `/auth/v1/user` responde sobre o proprio service_role e a
    // conferencia passaria SEMPRE: a funcao viraria uma que so sabe dizer sim.
    const sessao = readFileSync(join(process.cwd(), 'worker', 'lib', 'sessao.ts'), 'utf8')
    expect(sessao).toContain('SUPABASE_ANON_KEY')
    expect(sessao).not.toContain('SUPABASE_SERVICE_KEY')
  })

  it('as rotas do quiosque continuam sem exigir sessao', () => {
    // Exigir sessao no quiosque quebraria a coleta: o tablet nao tem usuario, e a fila dele envia
    // horas depois. As duas funcoes que ele chama tem escopo minimo, e e isso que o protege.
    for (const rota of ['postResposta', 'postTentativa', 'postSinal']) {
      const trecho = index.slice(index.indexOf(`async function ${rota}`))
      const corpo = trecho.slice(0, trecho.indexOf('\n}\n'))
      expect(corpo, `${rota} passou a exigir sessao e isso derruba a coleta`).not.toContain(
        'usuarioDaRequisicao',
      )
    }
  })

  it('existe UMA implementacao da importacao, usada pelos dois gatilhos', () => {
    // Duas implementacoes divergiriam, e a divergencia cairia no caminho manual, que e o que se
    // usa quando o automatico ja falhou.
    const watcher = readFileSync(join(process.cwd(), 'worker', 'rotinas', 'watcher-drive.ts'), 'utf8')
    expect(watcher).toContain('importaR3')
    expect(index).toContain('importaR3')
    // O watcher nao pode ter voltado a montar a linha de venda por conta propria.
    expect(watcher).not.toContain('execucao_importacao_id')
    expect(watcher).not.toContain("insere(env, 'venda_produto_dia'")
  })

  it('a chave publica do Worker esta documentada nos dois lugares que a configuram', () => {
    expect(readFileSync(join(process.cwd(), 'wrangler.toml'), 'utf8')).toContain('SUPABASE_ANON_KEY')
    expect(readFileSync(join(process.cwd(), '.env.example'), 'utf8')).toContain('SUPABASE_ANON_KEY')
  })
})
