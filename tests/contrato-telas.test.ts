/**
 * Teste de contrato entre as listas fechadas do codigo e os `CHECK` que as recusam.
 *
 * EXISTE POR CAUSA DO PIOR ERRO ENCONTRADO NO PROJETO
 *   `tela_evento_tela_dominio` aceitava `T3` e `T4`, nomes que nenhuma ponta do codigo escreve, e
 *   recusava `ROT1` e `ROT2`, que sao os que o quiosque grava.
 *
 *   `tela_evento` e inserida DENTRO de `fn_grava_resposta`, na mesma transacao da resposta. Logo a
 *   violacao de CHECK nao perdia o carimbo de uma tela: derrubava a RESPOSTA INTEIRA. Promotor
 *   recebe 2 perguntas rotacionadas e neutro 1, entao cerca de 85% de tudo que fosse coletado na
 *   primeira noite seria recusado — e a fila do tablet, que e agressiva de proposito, tentaria de
 *   novo para sempre, sem nunca conseguir.
 *
 *   Por que nada pegava: `tsc` ve o tipo `Passo` de um lado e uma string dentro de um CHECK do
 *   outro, e nao tem como saber que sao a mesma lista. O teste de integracao do Worker mandava
 *   `telas: []`, entao passava com folga. O ensaio em SQL montava as telas a mao, com os nomes que
 *   o CHECK aceita. Tres camadas de verificacao, e as tres passavam ao lado.
 *
 * O QUE ESTE ARQUIVO FAZ
 *   Le o tipo `Passo` e as listas de dominio do TypeScript, le os `CHECK` das migrations, e exige
 *   que sejam o MESMO CONJUNTO. Nao "compativel", nao "contido": igual, nos dois sentidos.
 *
 *   Sobra no banco tambem e defeito, e nao folga: valor que o CHECK aceita e o codigo nunca escreve
 *   e um nome morto que a proxima pessoa vai achar que significa alguma coisa — foi exatamente o
 *   que `T3` e `T4` eram.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DIMENSOES, FATORES, fatorValido } from '../src/comum/dominio.js'
import { caminhoCompleto } from '../src/coleta/questionario.js'

const DIR = join(process.cwd(), 'supabase', 'migrations')

function todoSql(): string {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(DIR, f), 'utf8'))
    .join('\n')
}

const SQL = todoSql()

/**
 * Os valores de um `check (coluna in ('a','b',...))`, pelo nome da constraint.
 *
 * Aceita a lista quebrada em varias linhas, que e como as migrations do projeto a escrevem, e
 * exige que a constraint exista: constraint que nao existe faria o conjunto vir vazio e o teste
 * passar comparando nada com nada.
 */
function dominioDoCheck(constraint: string): Set<string> {
  const i = SQL.indexOf(constraint)
  expect(i, `a constraint ${constraint} nao existe em nenhuma migration`).toBeGreaterThan(-1)
  const abre = SQL.indexOf('(', SQL.indexOf(' in ', i))
  let nivel = 0
  let fim = -1
  for (let j = abre; j < SQL.length; j++) {
    if (SQL[j] === '(') nivel++
    else if (SQL[j] === ')') {
      nivel--
      if (nivel === 0) {
        fim = j
        break
      }
    }
  }
  const corpo = SQL.slice(abre + 1, fim)
  const valores = [...corpo.matchAll(/'([^']+)'/g)].map((m) => m[1]!)
  expect(valores.length, `${constraint} saiu com lista vazia: o recortador quebrou`).toBeGreaterThan(
    1,
  )
  return new Set(valores)
}

/** Os valores do tipo `Passo`, lidos da declaracao em questionario.ts. */
function passosDoTipo(): Set<string> {
  const fonte = readFileSync(join(process.cwd(), 'src', 'coleta', 'questionario.ts'), 'utf8')
  const i = fonte.indexOf('export type Passo =')
  expect(i, 'nao achei a declaracao do tipo Passo').toBeGreaterThan(-1)
  const fim = fonte.indexOf('\n\n', i)
  const valores = [...fonte.slice(i, fim).matchAll(/'([A-Z0-9]+)'/g)].map((m) => m[1]!)
  expect(valores.length).toBeGreaterThan(10)
  return new Set(valores)
}

function comparaConjuntos(nome: string, doCodigo: Set<string>, doBanco: Set<string>): void {
  const soNoCodigo = [...doCodigo].filter((v) => !doBanco.has(v)).sort()
  const soNoBanco = [...doBanco].filter((v) => !doCodigo.has(v)).sort()

  expect(
    soNoCodigo,
    `${nome}: o codigo escreve valor que o CHECK RECUSA: ${soNoCodigo.join(', ')}. ` +
      'Isso derruba a gravacao inteira, e nao apenas a linha filha.',
  ).toEqual([])

  expect(
    soNoBanco,
    `${nome}: o CHECK aceita valor que o codigo nunca escreve: ${soNoBanco.join(', ')}. ` +
      'Nome morto num dominio fechado e o que faz a proxima pessoa achar que ele significa algo.',
  ).toEqual([])
}

describe('as telas', () => {
  it('o tipo `Passo` e o CHECK de tela_evento sao o mesmo conjunto', () => {
    comparaConjuntos('tela_evento.tela', passosDoTipo(), dominioDoCheck('tela_evento_tela_dominio'))
  })

  it('toda tela que o fluxo pode percorrer de verdade cabe no CHECK', () => {
    // Nao e o mesmo teste acima. Aquele compara declaracoes; este ANDA os quatro caminhos, do
    // detrator ao promotor, e confere o que a maquina de estados realmente produz. Um valor que
    // esta no tipo e nunca acontece nao doeria; um que acontece e nao esta no CHECK derruba a
    // resposta, e e por aqui que ele aparece.
    const doCheck = dominioDoCheck('tela_evento_tela_dominio')
    for (const nota of [0, 3, 6, 7, 8, 9, 10]) {
      for (const rotacionadas of [0, 1, 2]) {
        // `causa: 'grupo_item'` e `temItensDoGrupo: true` levam ao caminho MAIS LONGO do
        // detrator, passando por T3C, T3C1, T3C2 e T3C3. Com o caminho curto, quatro telas
        // deixariam de ser conferidas contra o CHECK.
        const caminho = caminhoCompleto({
          nota,
          rotacionadas,
          causa: 'grupo_item',
          temItensDoGrupo: true,
        })
        for (const passo of caminho) {
          expect(
            doCheck.has(passo),
            `o caminho de nota ${nota} com ${rotacionadas} rotacionada(s) passa por \`${passo}\`, ` +
              'que o CHECK de tela_evento recusa. A resposta inteira seria rejeitada.',
          ).toBe(true)
        }
      }
    }
  })

  it('as telas que marcam opcao sao um subconjunto das telas que existem', () => {
    // `resposta_opcao` tem o proprio dominio, menor: so as telas de toque que produzem marcacao.
    // Ele tem de estar CONTIDO no de tela_evento, senao existe tela que marca opcao e nao pode
    // registrar o proprio carimbo de tempo.
    const opcao = dominioDoCheck('resposta_opcao_tela_dominio')
    const evento = dominioDoCheck('tela_evento_tela_dominio')
    const fora = [...opcao].filter((t) => !evento.has(t))
    expect(fora, `telas de resposta_opcao que nao existem em tela_evento: ${fora.join(', ')}`).toEqual(
      [],
    )
  })
})

describe('as dimensoes e os fatores', () => {
  it('as 9 dimensoes do codigo sao as mesmas do CHECK de resposta_opcao', () => {
    comparaConjuntos(
      'resposta_opcao.dimensao',
      new Set(DIMENSOES),
      dominioDoCheck('resposta_opcao_dimensao_dominio'),
    )
  })

  it('as dimensoes do CHECK de classificacao_texto tambem batem', () => {
    // O classificador filtra por `DIMENSOES` antes de inserir. Se as duas listas divergirem, ou a
    // frase valida e descartada, ou o lote inteiro e recusado pelo CHECK.
    comparaConjuntos(
      'classificacao_texto.dimensao',
      new Set(DIMENSOES),
      dominioDoCheck('classificacao_texto_dimensao_dominio'),
    )
  })

  /**
   * O corpo de `fn_fator_valido`, ancorado no `create` e nao na primeira mencao do nome.
   *
   * A primeira versao deste teste usava `SQL.indexOf('fn_fator_valido')`, que casa com um
   * COMENTARIO de cabecalho muito antes da funcao, e recortava um trecho que nao continha lista
   * nenhuma. O teste falhava dizendo que `sabor` nao existia, quando existia: um teste errado
   * acusando codigo certo, que e o modo de falha que mais custa tempo.
   */
  function corpoDoFatorValido(): string {
    const i = SQL.indexOf('create or replace function experiencia.fn_fator_valido')
    expect(i, 'nao achei a definicao de fn_fator_valido').toBeGreaterThan(-1)
    return SQL.slice(i, SQL.indexOf('$$;', i))
  }

  // `item_consumido` fica de fora: a lista dele e vazia de proposito (o item vai em
  // `resposta_item`) e a funcao o trata numa clausula propria, `fator is null`, conferida no caso
  // seguinte. Filtrar pela lista vazia, e nao pelo nome, faz uma dimensao futura sem fator entrar
  // no mesmo tratamento sem ninguem editar este arquivo.
  const COM_FATOR = Object.keys(FATORES).filter(
    (d) => FATORES[d as keyof typeof FATORES].length > 0,
  )

  it.each(COM_FATOR)(
    'os fatores de %s sao os mesmos no codigo e em fn_fator_valido',
    (dimensao) => {
      // Compara a LISTA daquela dimensao, e nao a presenca do fator em qualquer lugar da funcao.
      // `temperatura` e fator de bebida e `temperatura_salao` de ambiente: um teste de presenca
      // aprovaria `comida.temperatura`, que e o par que o CHECK de pergunta_banco recusou de
      // verdade durante o ensaio.
      const corpo = corpoDoFatorValido()
      const re = new RegExp(`when '${dimensao}' then array\\[([^\\]]*)\\]`)
      const m = re.exec(corpo)
      expect(m, `fn_fator_valido nao trata a dimensao \`${dimensao}\``).not.toBeNull()
      const doBanco = new Set([...m![1]!.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]!))
      const doCodigo = new Set(FATORES[dimensao as keyof typeof FATORES])
      comparaConjuntos(`fn_fator_valido(${dimensao})`, doCodigo, doBanco)
    },
  )

  it('as 8 dimensoes com fator foram conferidas, e item_consumido e a nona', () => {
    // Se este numero cair, uma dimensao saiu do laco acima sem ninguem notar, e os fatores dela
    // deixariam de ser conferidos em silencio.
    expect(COM_FATOR.length).toBe(8)
    expect(DIMENSOES.length).toBe(9)
  })

  it('a dimensao sem fator e tratada, e item_consumido exige fator nulo', () => {
    const corpo = corpoDoFatorValido()
    // `item_consumido` nao usa fator: o item vai em `resposta_item`. Se esta linha sair, um fator
    // colado em `item_consumido` passaria e a contagem por fator ganharia uma categoria que nao
    // significa nada.
    expect(corpo).toContain("when dimensao = 'item_consumido' then fator is null")
    // Opcao de dimensao sem fator e legitima: a T2A grava "A pizza" sem fator.
    expect(corpo).toContain('when fator is null then true')
  })
})

describe('os outros dominios fechados que a gravacao atravessa', () => {
  it('canal', () => {
    comparaConjuntos('resposta.canal', new Set(['tablet', 'qr']), dominioDoCheck('resposta_canal_dominio'))
  })

  it('idioma', () => {
    comparaConjuntos('resposta.idioma', new Set(['pt', 'en']), dominioDoCheck('resposta_idioma_dominio'))
  })

  it('desfecho da tentativa', () => {
    comparaConjuntos(
      'tentativa.desfecho',
      new Set(['respondeu', 'recusou']),
      dominioDoCheck('tentativa_desfecho_dominio'),
    )
  })

  it('finalidade do consentimento', () => {
    comparaConjuntos(
      'consentimento.finalidade',
      new Set(['pesquisa', 'contato']),
      dominioDoCheck('consentimento_finalidade_dominio'),
    )
  })

  it('as cinco rotinas que o Worker despacha sao as cinco do CHECK', () => {
    const indexTs = readFileSync(join(process.cwd(), 'worker', 'index.ts'), 'utf8')
    const doCheck = dominioDoCheck('execucao_rotina_dominio')
    // `backup_semanal` roda no GitHub Actions e nao no Worker, entao ela esta no CHECK e nao no
    // switch. As outras quatro tem de estar nos dois.
    for (const rotina of [...doCheck].filter((r) => r !== 'backup_semanal')) {
      expect(
        indexTs.includes(`'${rotina}'`),
        `o CHECK aceita a rotina \`${rotina}\` e o Worker nao a despacha`,
      ).toBe(true)
    }
    expect(doCheck.has('backup_semanal')).toBe(true)
  })
})

describe('a versao do texto de consentimento existe no banco', () => {
  /**
   * `consentimento.versao_texto` tem chave estrangeira para `consentimento_texto.versao`, e a
   * insercao acontece DENTRO de `fn_grava_resposta`. Uma versao que nao existe no banco nao perde
   * o consentimento: derruba a RESPOSTA INTEIRA, com 23503.
   *
   * E o consentimento de finalidade `pesquisa` vai em TODA resposta. O valor padrao anterior era
   * `'nao-verificada'`, e nenhuma migration semeava `consentimento_texto`: num projeto novo, a
   * tabela nascia vazia, o catalogo devolvia `consentimento: null`, o PWA caia no padrao, e
   * nenhuma resposta era gravada. Nunca. Com a fila do tablet tentando de novo para sempre.
   */
  const questionario = readFileSync(join(process.cwd(), 'src', 'coleta', 'questionario.ts'), 'utf8')

  /** A versao que o bundle usa por omissao. */
  function versaoEmbutida(): string {
    const m = /const VERSAO_TEXTO_EMBUTIDO = '([^']+)'/.exec(questionario)
    expect(m, 'VERSAO_TEXTO_EMBUTIDO nao esta declarada em questionario.ts').not.toBeNull()
    return m![1]!
  }

  it('a versao embutida no bundle e semeada por uma migration', () => {
    const versao = versaoEmbutida()
    const re = new RegExp(
      `insert into experiencia\\.consentimento_texto[\\s\\S]{0,400}?'${versao}'`,
    )
    expect(
      re.test(SQL),
      `nenhuma migration semeia consentimento_texto com a versao '${versao}'. ` +
        'Sem ela, a chave estrangeira recusa TODA resposta que carregue consentimento.',
    ).toBe(true)
  })

  it('o padrao do PWA e a versao embutida, e nunca um rotulo de desconhecido', () => {
    const app = readFileSync(join(process.cwd(), 'src', 'coleta', 'App.tsx'), 'utf8')
    expect(app).toContain('versaoTextoConsentimento = VERSAO_TEXTO_EMBUTIDO')
    // O valor que quebrava, e SO como valor: o nome dele aparece de proposito num comentario que
    // explica por que ele saiu, e apagar essa explicacao e como o erro volta.
    const semComentarios = app
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*'))
      .join('\n')
    expect(semComentarios).not.toContain("'nao-verificada'")
  })

  it('o texto semeado e o mesmo que a T6 mostra', () => {
    // Texto duplicado em dois lugares divergindo em silencio e justamente o que uma fiscalizacao
    // encontraria: o aceite citaria uma versao cujo texto nao e o que estava na tela.
    // Ancorado em `export const T6`: o primeiro `rodape` do arquivo e o da T1 ("Sua resposta e
    // anonima"), e a primeira versao deste teste comparava o texto errado.
    const t6 = questionario.slice(questionario.indexOf('export const T6'))
    const m = /rodape: \{\s*pt: '([^']+)'/.exec(t6)
    expect(m, 'nao achei o rodape da T6').not.toBeNull()
    const daTela = m![1]!
    expect(
      SQL.includes(daTela),
      `o texto semeado em consentimento_texto nao contem o rodape da T6: "${daTela}"`,
    ).toBe(true)
  })
})

describe('nenhum dado gravado fica sem leitura', () => {
  /**
   * `resposta_pergunta_sorteada.opcao_indice` era gravada e NUNCA lida: nenhuma das views a
   * tocava, nenhuma tela a mostrava, nenhuma exportacao a levava. Uma pergunta era feita a cada
   * cliente promotor, todas as noites, e a resposta nao podia ser vista por ninguem.
   *
   * O caso e generalizavel, e por isso o teste tambem e: coluna de dado coletado que nenhuma view
   * le e trabalho pedido ao cliente sem retorno nenhum.
   */
  const retrato = JSON.parse(
    readFileSync(join(process.cwd(), 'supabase', 'formas-das-views.json'), 'utf8'),
  ) as Record<string, string[]>
  const colunasDeViews = new Set(Object.values(retrato).flat())

  it.each([
    ['opcao_indice', 'a opcao escolhida na pergunta rotacionada'],
    ['texto_cru', 'o texto que a pessoa escreveu'],
    ['garcom_pin_digitado', 'o PIN cru, que e dado da resposta e nao autenticacao'],
    ['mesa_digitada', 'a mesa crua, preservada mesmo sem casar com o cadastro'],
    ['suspeita_motivo', 'por que a resposta foi marcada'],
    ['fila_pendente', 'quantas respostas estao presas no aparelho'],
    ['dias_lidos', 'os dias que o arquivo de venda cobre'],
    ['importado_por', 'quem subiu a planilha a mao'],
  ])('%s e lida por alguma view (%s)', (coluna) => {
    expect(
      colunasDeViews.has(coluna),
      `\`${coluna}\` e gravada e nenhuma das views a devolve: dado coletado que ninguem pode ler`,
    ).toBe(true)
  })
})

describe('fatorValido espelha fn_fator_valido nas tres regras', () => {
  /**
   * O comentario do SQL dizia "espelho de `fatorValido`" e os dois discordavam nos DOIS casos que o
   * SQL acrescentou. Espelho que nao espelha e pior que ausencia de espelho, porque quem le confia.
   *
   * As tres regras estao no SQL e agora tambem aqui; os casos abaixo sao os mesmos que a funcao do
   * banco decide, e `scripts/ensaio-dados.sql` confere o lado de la.
   */
  it('item_consumido nao usa fator', () => {
    expect(fatorValido('item_consumido', null)).toBe(true)
    expect(fatorValido('item_consumido', 'sabor')).toBe(false)
  })

  it('fator nulo e valido: a T2A marca a dimensao sem descer ao fator', () => {
    expect(fatorValido('comida', null)).toBe(true)
    expect(fatorValido('atendimento', null)).toBe(true)
  })

  it('dimensao nula aceita a lista plana, que e o caso do alerta de detrator', () => {
    expect(fatorValido(null, 'sabor')).toBe(true)
    expect(fatorValido(null, 'espera_conta')).toBe(true)
    expect(fatorValido(null, 'inventado')).toBe(false)
  })

  it('o par completo continua sendo conferido', () => {
    expect(fatorValido('comida', 'sabor')).toBe(true)
    // `temperatura` e de bebida e `temperatura_salao` de ambiente: o par trocado tem de cair.
    expect(fatorValido('comida', 'temperatura')).toBe(false)
    expect(fatorValido('inventada', 'sabor')).toBe(false)
  })
})

describe('o contrato da tentativa', () => {
  const contrato = readFileSync(join(process.cwd(), 'src', 'comum', 'contrato.ts'), 'utf8')

  it('nao tem `resposta_id`, porque a coluna nao existe', () => {
    // O par tentativa/resposta e conferivel por IGUALDADE de id, e nao por juncao aproximada. O
    // campo estava no contrato apontando para uma coluna que o schema nunca teve.
    const bloco = contrato.slice(
      contrato.indexOf('export interface TentativaEnviada'),
      contrato.indexOf('export interface SinalDispositivo'),
    )
    expect(bloco).not.toContain('resposta_id')
    expect(SQL).not.toMatch(/create table[^;]*experiencia\.tentativa[^;]*resposta_id/s)
  })

  it('`desfecho` aceita so `recusou`', () => {
    // A tentativa de quem RESPONDEU e gravada por `fn_grava_resposta`, com o mesmo id da resposta.
    // Enviar as duas duplicaria o denominador da conversao por garcom.
    const bloco = contrato.slice(
      contrato.indexOf('export interface TentativaEnviada'),
      contrato.indexOf('export interface SinalDispositivo'),
    )
    expect(bloco).toMatch(/desfecho: 'recusou'/)
    expect(bloco).not.toMatch(/desfecho: 'respondeu' \| 'recusou'/)
  })
})
