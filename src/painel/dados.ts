/**
 * Leitura do painel.
 *
 * O painel le o banco DIRETO, com a chave publica e sessao autenticada, e nao pelo Worker.
 * Motivo: seriam dezenove rotas de API para replicar dezenove views que ja existem, e cada
 * rota seria mais um lugar onde a consulta pode divergir da view. Com RLS ligado em todas as
 * tabelas e o papel `experiencia_leitura`, quem autoriza e o banco, que e onde a regra mora.
 *
 * A chave publica no bundle e por desenho: ela nao da acesso a nada sem sessao valida. A chave
 * de servico, que da, vive so no Worker.
 */

import { createClient } from '@supabase/supabase-js'

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL as string | undefined
const CHAVE_PUBLICA = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function cria() {
  if (URL_SUPABASE === undefined || CHAVE_PUBLICA === undefined) {
    throw new Error(
      'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorias. Copie .env.example para .env.local.',
    )
  }
  return createClient(URL_SUPABASE, CHAVE_PUBLICA, {
    // O schema da pesquisa nao e public, e sem isso toda leitura falha com tabela inexistente.
    db: { schema: 'experiencia' },
    auth: { persistSession: true, autoRefreshToken: true },
  })
}

let cliente: ReturnType<typeof cria> | null = null

export function supabase(): ReturnType<typeof cria> {
  cliente ??= cria()
  return cliente
}

/**
 * Le uma view inteira. Sem construtor de consulta: as views ja entregam o recorte pronto, e
 * filtrar de novo no cliente seria duplicar a regra que vive no SQL.
 *
 * Erro sobe para a tela dizer o que falhou, em vez de mostrar zero. Painel que mostra zero
 * quando a leitura falhou e pior que painel que mostra erro: zero parece dado.
 */
export async function le<T>(view: string): Promise<T[]> {
  const { data, error } = await supabase().from(view).select('*')
  if (error !== null) throw new Error(`${view}: ${error.message}`)
  return (data ?? []) as T[]
}

// --- Formas das views do painel, conforme a folha canonica, secao 6.2 ---

export interface VwHoje {
  dia_operacional: string
  respostas: number
  detratores: number
  neutros: number
  promotores: number
  suspeitas: number
  pin_nao_reconhecido: number
  mesas_atendidas: number | null
}

export interface VwDistribuicaoFaixaDia {
  dia_operacional: string
  faixa: string
  respostas: number
}

export interface VwSemanaDetrator {
  semana: string
  detratores: number
  dias_abertos: number
}

export interface VwFatorContagem {
  dimensao: string
  fator: string | null
  mencoes: number
}

export interface VwGarcomTrimestre {
  garcom: string
  trimestre: string
  respostas: number
  promotores: number
  detratores: number
  tentativas: number
}

export interface VwItemTrimestre {
  item: string
  trimestre: string
  reclamacoes: number
  unidades_vendidas: number | null
  reclamacoes_por_100: number | null
  media_do_cardapio: number | null
}

export interface VwColetaDia {
  dia_operacional: string
  respostas: number
  mesas_atendidas: number | null
  suspeitas: number
  pin_nao_reconhecido: number
}

export interface VwDispositivoSinal {
  apelido: string
  uso: string
  ultimo_sinal_em: string | null
  fila_pendente: number | null
}

export interface VwSaudeRotina {
  rotina: string
  iniciado_em: string
  status: string
  erro: string | null
}

export interface VwSatisfacaoVendaDia {
  dia_operacional: string
  respostas: number
  detratores: number
  faturamento: number | null
}

export interface VwCustoPrato {
  prato: string
  data_referencia: string
  custo: number | null
  preco_venda: number | null
  margem: number | null
  ficha_completa: boolean
}

export interface VwTelaPulo {
  tela: string
  mes: string
  exibicoes: number
  pulos: number
}

export interface VwDuracaoSemana {
  semana: string
  tipo_caminho: string
  mediana_s: number | null
  p90_s: number | null
}

export interface VwAlertaIncidente {
  dia_operacional: string
  detectados: number
  contatados: number
  minutos_ate_contato: number | null
}

export interface VwClienteMes {
  mes: string
  contatos: number
  respostas: number
}

/**
 * Exporta uma view em CSV, no navegador.
 *
 * Existe porque quem tem o dado nao fica preso a ferramenta nenhuma, **inclusive a esta**. E o
 * requisito de portabilidade do briefing, e a garantia de que trocar de sistema um dia nao
 * custa a serie historica.
 *
 * Toda linha agregada exportada carrega o `n`, sem excecao (folha canonica, secao 6.3).
 */
export function baixaCsv<T extends object>(nome: string, linhas: readonly T[]): void {
  if (linhas.length === 0) return
  const colunas = Object.keys(linhas[0]!) as (keyof T & string)[]
  const escapa = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [
    colunas.join(';'),
    ...linhas.map((l) => colunas.map((c) => escapa((l as Record<string, unknown>)[c])).join(';')),
  ].join('\n')

  // BOM para o Excel brasileiro abrir com acento correto sem perguntar nada.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nome}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
