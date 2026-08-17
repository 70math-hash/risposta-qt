/**
 * Teste de contrato entre o TypeScript e o SQL.
 *
 * Existe por causa de um bug real, encontrado ao conferir as duas pontas a mao: o Worker
 * chamava `fn_grava_resposta` com o argumento `p_carga` enquanto a funcao declarava `p`, o
 * payload mandava `item` no singular enquanto o SQL lia `itens`, mandava `codigo` enquanto o
 * SQL lia `opcao_codigo`, e mandava `texto` como string enquanto o SQL esperava objeto. Nada
 * disso aparece em compilacao, porque a fronteira e JSON: o tipo para na borda e o erro
 * aparece em producao, na primeira resposta gravada.
 *
 * Este teste le a migration de verdade e compara com o payload de verdade. E o unico jeito de
 * a divergencia doer no lugar certo, que e aqui e nao no salao.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { RespostaEnviada } from '../src/comum/contrato.js'

const DIR = join(process.cwd(), 'supabase', 'migrations')

function sqlDasFuncoes(): string {
  const arquivos = readdirSync(DIR).filter((f) => f.endsWith('.sql'))
  return arquivos.map((f) => readFileSync(join(DIR, f), 'utf8')).join('\n')
}

/** Um payload completo, com todo campo que o PWA pode enviar. */
function payloadCompleto(): RespostaEnviada {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    criado_em_cliente: '2026-08-05T01:00:00.000Z',
    nota: 3,
    canal: 'tablet',
    idioma: 'pt',
    versao_app: '0.1.0',
    versao_questionario: '1.0.0',
    mesa_digitada: '7',
    garcom_pin_digitado: '1234',
    dispositivo_id: '22222222-2222-4222-8222-222222222222',
    desfecho: 'respondeu',
    opcoes: [{ tela: 'T2C', dimensao: 'comida', fator: 'sabor', opcao_codigo: 'comida' }],
    itens: [{ grupo: 'pizza', item_cardapio_id: '33333333-3333-4333-8333-333333333333', fator: 'sabor' }],
    texto: { texto_cru: 'a massa veio crua' },
    sorteadas: [
      { pergunta_banco_id: '44444444-4444-4444-8444-444444444444', respondida: true, opcao_indice: 1 },
    ],
    telas: [{ tela: 'T1', entrou_em: '2026-08-05T01:00:00Z', saiu_em: '2026-08-05T01:00:08Z', pulou: false }],
    contato: { nome: 'Cliente', whatsapp: '11999999999', email: 'a@b.com' },
    consentimentos: [
      { finalidade: 'pesquisa', versao_texto: '1', aceito_em: '2026-08-05T01:00:00Z' },
    ],
  }
}

describe('as chaves que o SQL le existem no payload', () => {
  const sql = sqlDasFuncoes()
  const payload = payloadCompleto()

  it('a migration de funcoes foi encontrada', () => {
    expect(sql).toContain('fn_grava_resposta')
  })

  it('toda chave de primeiro nivel lida por p->> existe no payload', () => {
    const lidas = new Set(
      [...sql.matchAll(/\bp->>?'([a-z_]+)'/g)].map((m) => m[1]!),
    )
    // `fila_pendente` e do payload de sinal, nao da resposta. Tratado no teste proprio abaixo.
    lidas.delete('fila_pendente')

    const doPayload = new Set(Object.keys(payload))
    const faltando = [...lidas].filter((k) => !doPayload.has(k))
    expect(faltando, `o SQL le chaves que o payload nao envia: ${faltando.join(', ')}`).toEqual([])
  })

  it('o payload de sinal tem as chaves que fn_registra_sinal le', () => {
    const corpo = sql.slice(sql.indexOf('fn_registra_sinal'))
    const lidas = new Set([...corpo.matchAll(/\bp->>?'([a-z_]+)'/g)].map((m) => m[1]!))
    for (const chave of ['dispositivo_id', 'versao_app', 'fila_pendente']) {
      expect(lidas.has(chave), `fn_registra_sinal deveria ler ${chave}`).toBe(true)
    }
  })

  it('as chaves de array lidas por p-> existem no payload', () => {
    const lidas = new Set([...sql.matchAll(/\bp->'([a-z_]+)'/g)].map((m) => m[1]!))
    const doPayload = new Set(Object.keys(payload))
    const faltando = [...lidas].filter((k) => !doPayload.has(k))
    expect(faltando, `arrays que o SQL le e o payload nao envia: ${faltando.join(', ')}`).toEqual([])
  })

  it('o texto aberto e objeto com texto_cru, e nao string', () => {
    // O SQL le por caminho aninhado: p#>>'{texto,texto_cru}'.
    expect(sql).toContain("'{texto,texto_cru}'")
    expect(typeof payload.texto).toBe('object')
    expect(payload.texto?.texto_cru).toBeTypeOf('string')
  })

  it('as chaves das filhas existem nos objetos filhos do payload', () => {
    const chavesFilhas = new Set([...sql.matchAll(/\br->>?'([a-z_]+)'/g)].map((m) => m[1]!))
    const disponiveis = new Set([
      ...Object.keys(payload.opcoes[0]!),
      ...Object.keys(payload.itens[0]!),
      ...Object.keys(payload.sorteadas[0]!),
      ...Object.keys(payload.telas[0]!),
      ...Object.keys(payload.consentimentos[0]!),
    ])
    const faltando = [...chavesFilhas].filter((k) => !disponiveis.has(k))
    expect(
      faltando,
      `o SQL le chaves de filha que nenhum objeto filho envia: ${faltando.join(', ')}`,
    ).toEqual([])
  })
})

describe('a assinatura do argumento da funcao casa com o que o Worker envia', () => {
  const sql = sqlDasFuncoes()
  const worker = readFileSync(join(process.cwd(), 'worker', 'index.ts'), 'utf8')

  it('fn_grava_resposta declara o argumento `p`, e o Worker chama com `p`', () => {
    expect(sql).toMatch(/create or replace function experiencia\.fn_grava_resposta\(p jsonb\)/)
    expect(worker).toContain("'fn_grava_resposta', { p:")
    // Este e o nome errado que quebrou antes. PostgREST casa argumento por NOME.
    expect(worker).not.toContain('p_carga')
  })

  it('fn_registra_sinal declara `p`, e o Worker chama com `p`', () => {
    expect(sql).toMatch(/create or replace function experiencia\.fn_registra_sinal\(p jsonb\)/)
    expect(worker).toContain("'fn_registra_sinal', { p:")
  })

  it('o Worker nao chama funcao que a migration nao cria', () => {
    const chamadas = [...worker.matchAll(/rpc<?[^>]*>?\(env, '([a-z_]+)'/g)].map((m) => m[1]!)
    for (const fn of new Set(chamadas)) {
      expect(sql, `o Worker chama ${fn}, que nenhuma migration cria`).toContain(
        `experiencia.${fn}(`,
      )
    }
  })
})

describe('o canal qr nao exige PIN, em nenhuma das duas pontas', () => {
  const sql = sqlDasFuncoes()

  it('a funcao exige PIN somente quando o canal e tablet', () => {
    // Sem esta condicao, toda resposta por QR no celular do cliente seria rejeitada, e o canal
    // `qr` que a folha canonica define ficaria morto.
    expect(sql).toMatch(/v_canal = 'tablet' and v_pin = ''/)
  })
})
