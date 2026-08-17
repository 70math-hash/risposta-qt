/**
 * Teste de contrato entre as interfaces do painel e as views de verdade.
 *
 * Existe por causa de um bug real e silencioso. As interfaces de `src/painel/dados.ts` eram
 * escritas a mao a partir da folha canonica, e divergiam da view em quase toda linha:
 *
 *   interface dizia        view devolve
 *   --------------------   ---------------------------
 *   garcom                 nome
 *   respostas              n
 *   item                   nome_pt
 *   media_do_cardapio      media_reclamacoes_cardapio
 *   custo                  custo_total
 *   margem                 margem_bruta
 *   prato                  prato_nome
 *   ficha_completa         custo_ausente (invertida!)
 *   contatos               contatos_deixados
 *
 * Por que nao aparecia: `le()` usa `select('*')`, entao a consulta e valida e devolve o objeto
 * certo do banco, tipado com as chaves erradas do TypeScript por uma assercao `as T[]`. Toda
 * leitura da `undefined`. Nenhum erro em lugar nenhum, nem no console. O painel abre, as abas
 * funcionam, e as celulas ficam vazias, o que quem le entende como "nao houve resposta".
 *
 * `ficha_completa` era o pior caso: alem de nao existir, era a INVERSA de `custo_ausente`, e
 * `undefined` e falso, entao todo prato apareceria com a ficha marcada como ausente.
 *
 * O retrato em `supabase/formas-das-views.json` e gerado por `scripts/formas-das-views.mjs`
 * depois de `scripts/ensaio.sh` aplicar as migrations num Postgres de verdade. Este teste le o
 * retrato e nao precisa de banco, entao roda em `npm test` junto com o resto.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const RETRATO = JSON.parse(
  readFileSync(join(process.cwd(), 'supabase', 'formas-das-views.json'), 'utf8'),
) as Record<string, string[]>

const DADOS = readFileSync(join(process.cwd(), 'src', 'painel', 'dados.ts'), 'utf8')
const PAINEL = readFileSync(join(process.cwd(), 'src', 'painel', 'Painel.tsx'), 'utf8')

/** `vw_garcom_trimestre` -> `VwGarcomTrimestre`, a mesma regra do script gerador. */
function nomeInterface(view: string): string {
  return view
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
}

/** Os campos declarados numa interface de `dados.ts`. */
function camposDaInterface(nome: string): string[] | null {
  const abre = DADOS.indexOf(`export interface ${nome} {`)
  if (abre < 0) return null
  const fecha = DADOS.indexOf('\n}', abre)
  const corpo = DADOS.slice(DADOS.indexOf('{', abre) + 1, fecha)
  return [...corpo.matchAll(/^\s*([a-z_][a-z0-9_]*)\s*:/gm)].map((m) => m[1]!)
}

describe('o retrato das views foi gerado e tem conteudo', () => {
  it('tem as 25 views do projeto', () => {
    // Se este numero cair, ou uma migration deixou de criar view, ou o retrato ficou velho.
    // Regerar com: scripts/ensaio.sh && node scripts/formas-das-views.mjs
    expect(Object.keys(RETRATO).length).toBe(25)
  })

  it('toda view do retrato comeca com vw_ e tem coluna', () => {
    for (const [view, colunas] of Object.entries(RETRATO)) {
      expect(view.startsWith('vw_'), `${view} nao comeca com vw_`).toBe(true)
      expect(colunas.length, `${view} sem coluna`).toBeGreaterThan(0)
    }
  })
})

describe('cada interface do painel tem exatamente os campos da view', () => {
  const views = Object.keys(RETRATO).sort()

  it.each(views)('%s', (view) => {
    const nome = nomeInterface(view)
    const campos = camposDaInterface(nome)
    expect(campos, `dados.ts nao declara ${nome} para ${view}`).not.toBeNull()

    const daView = new Set(RETRATO[view]!)
    const daInterface = new Set(campos!)

    const inventados = [...daInterface].filter((c) => !daView.has(c))
    expect(
      inventados,
      `${nome} declara campo que a view nao devolve: ${inventados.join(', ')}. ` +
        `Cada um destes leria undefined e a tela mostraria celula vazia sem erro.`,
    ).toEqual([])

    const faltando = [...daView].filter((c) => !daInterface.has(c))
    expect(faltando, `${nome} nao declara: ${faltando.join(', ')}`).toEqual([])
  })
})

describe('o painel so le view que existe, e todo campo que le existe nela', () => {
  it('todo nome de view passado a useView esta no retrato', () => {
    const lidas = [...PAINEL.matchAll(/useView<[A-Za-z]+>\('([a-z_]+)'\)/g)].map((m) => m[1]!)
    expect(lidas.length).toBeGreaterThanOrEqual(7)
    for (const v of new Set(lidas)) {
      expect(RETRATO[v], `o painel le ${v}, que nao existe no banco`).toBeDefined()
    }
  })

  it('o tipo passado a useView casa com a view lida', () => {
    // `useView<VwHoje>('vw_coleta_dia')` compila e mente. O compilador nao tem como saber que o
    // parametro de tipo e o nome da view descrevem a mesma coisa.
    const pares = [...PAINEL.matchAll(/useView<([A-Za-z]+)>\('([a-z_]+)'\)/g)]
    for (const [, tipo, view] of pares) {
      expect(nomeInterface(view!), `useView<${tipo!}>('${view!}') usa o tipo da view errada`).toBe(
        tipo!,
      )
    }
  })

  it('nenhum campo antigo escrito a mao sobrou no painel', () => {
    // Os nomes que a versao anterior inventava. Se algum voltar, e porque alguem editou o painel
    // a partir da folha canonica de novo, em vez de a partir da view.
    const inventados = [
      'ficha_completa',
      'media_do_cardapio',
      'reclamacoes_por_100',
      '\\.contatos\\b',
      '\\.prato\\b',
      '\\.garcom\\b',
    ]
    for (const nome of inventados) {
      expect(
        new RegExp(nome).test(PAINEL),
        `o painel voltou a usar \`${nome}\`, que nenhuma view devolve`,
      ).toBe(false)
    }
  })
})

describe('as colunas que carregam a honestidade do numero continuam sendo lidas', () => {
  /**
   * Dezoito views tem coluna `aviso`, e mais algumas tem `amostra_suficiente`,
   * `semana_incomparavel`, `custo_ausente`, `premissa_conferida`. Sao elas que impedem o painel
   * de mostrar um numero de aparencia solida sobre amostra de tres respostas. Uma tela pode
   * deixar de ler uma dessas sem quebrar nada, e e exatamente por isso que ha teste.
   */
  it('vw_nps_janela tem as colunas de faixa de confianca, e o painel as usa', () => {
    for (const c of ['erro_padrao', 'faixa_95', 'diferenca_minima_detectavel', 'amostra_suficiente']) {
      expect(RETRATO['vw_nps_janela'], `vw_nps_janela perdeu ${c}`).toContain(c)
    }
    expect(PAINEL).toContain('diferenca_minima_detectavel')
    expect(PAINEL).toContain('amostra_suficiente')
  })

  it('o painel mostra o aviso que a view escreveu', () => {
    expect(PAINEL).toContain('AvisoDaView')
    expect(PAINEL).toMatch(/aviso={/)
  })

  it('o custo ausente e lido pela coluna da view, e nao invertido a mao', () => {
    expect(RETRATO['vw_custo_prato']).toContain('custo_ausente')
    expect(RETRATO['vw_custo_prato']).toContain('premissa_conferida')
    expect(PAINEL).toContain('custo_ausente')
    expect(PAINEL).toContain('premissa_conferida')
  })

  it('a semana incomparavel aparece como incomparavel, e nao como queda', () => {
    expect(RETRATO['vw_semana_detrator']).toContain('semana_incomparavel')
    expect(PAINEL).toContain('semana_incomparavel')
  })
})
