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

// -----------------------------------------------------------------------------
// As formas das views.
//
// GERADAS, e nao escritas a mao: `scripts/formas-das-views.mjs` as le do banco de ensaio
// depois de `scripts/ensaio.sh` aplicar as migrations, e `supabase/formas-das-views.json`
// guarda o retrato para `tests/contrato-views.test.ts` conferir sem precisar de banco.
//
// A versao anterior deste bloco era escrita a mao a partir da folha canonica e divergia da
// view de verdade em quase toda linha: dizia `garcom`, `respostas`, `item`,
// `media_do_cardapio`, e a view devolve `nome`, `n`, `nome_pt`,
// `media_reclamacoes_cardapio`. Como `le()` usa `select('*')`, a consulta funcionava e o
// erro nao aparecia em lugar nenhum: cada campo lia `undefined` e a tela mostrava celula
// vazia, que quem abre o painel le como "nao houve resposta".
//
// Toda coluna e `| null` de proposito. Ver a explicacao no script gerador: `left join` e
// `case` bastam para a view produzir nulo, e fingir `not null` aqui inventaria uma garantia
// que o banco nao deu.
// -----------------------------------------------------------------------------

/** `experiencia.vw_alerta_incidente`. Forma lida do banco, nao escrita a mao. */
export interface VwAlertaIncidente {
  id: string | null
  resposta_id: string | null
  dia_operacional: string | null
  respondido_em: string | null
  mesa_digitada: string | null
  nota: number | null
  fator: string | null
  canal: string | null
  destinatario: string | null
  enviado_em: string | null
  segundos_ate_envio: number | null
  dentro_dos_30_s: boolean | null
  atrasado: boolean | null
  contato_em: string | null
  houve_contato: boolean | null
  minutos_ate_contato: number | null
  erro: string | null
}

/** `experiencia.vw_cliente_mes`. Forma lida do banco, nao escrita a mao. */
export interface VwClienteMes {
  mes: string | null
  respostas: number | null
  contatos_deixados: number | null
  taxa_contato_pct: number | null
  anonimizados_no_mes: number | null
  aviso: string | null
}

/** `experiencia.vw_coleta_dia`. Forma lida do banco, nao escrita a mao. */
export interface VwColetaDia {
  dia_operacional: string | null
  casa_abre: boolean | null
  respostas: number | null
  mesas_atendidas: number | null
  conversao_casa_pct: number | null
  tentativas: number | null
  recusas: number | null
  conversao_tentativa_pct: number | null
  suspeitas: number | null
  suspeitas_pct: number | null
  pin_nao_reconhecido: number | null
  pin_acima_do_limiar: boolean | null
  respostas_tablet: number | null
  respostas_qr: number | null
  respostas_por_dispositivo: unknown | null
  maior_por_dispositivo: number | null
  dispositivo_acima_do_teto: boolean | null
  aviso: string | null
}

/** `experiencia.vw_custo_prato`. Forma lida do banco, nao escrita a mao. */
export interface VwCustoPrato {
  prato_id: string | null
  prato_nome: string | null
  categoria: string | null
  id_altec: string | null
  ativo: boolean | null
  data_referencia: string | null
  vigente_ate: string | null
  custo_total: number | null
  preco_venda: number | null
  cmv_meta: number | null
  cmv_pct: number | null
  margem_bruta: number | null
  desvio_do_cmv_meta: number | null
  insumos_contados: number | null
  insumos_sem_preco: number | null
  insumos_sem_rendimento: number | null
  insumos_truncados: number | null
  nivel_maximo: number | null
  custo_ausente: boolean | null
  motivo_incompleto: string | null
  premissa_conferida: boolean | null
  nota_premissa: string | null
}

/** `experiencia.vw_dia_semana`. Forma lida do banco, nao escrita a mao. */
export interface VwDiaSemana {
  dia_operacional: string | null
  dia_semana: number | null
  n_dia: number | null
  detratores: number | null
  promotores: number | null
  media_respostas_4: number | null
  media_detratores_4: number | null
  n_4: number | null
  ocorrencias_comparadas: number | null
  aviso: string | null
}

/** `experiencia.vw_dispositivo_sinal`. Forma lida do banco, nao escrita a mao. */
export interface VwDispositivoSinal {
  dispositivo_id: string | null
  apelido: string | null
  uso: string | null
  ultimo_sinal_em: string | null
  horas_sem_sinal: number | null
  mudo: boolean | null
  fila_pendente: number | null
  fila_alta: boolean | null
  versao_app: string | null
  respostas_dia_corrente: number | null
}

/** `experiencia.vw_distribuicao_faixa_dia`. Forma lida do banco, nao escrita a mao. */
export interface VwDistribuicaoFaixaDia {
  dia_operacional: string | null
  faixa: string | null
  respostas: number | null
}

/** `experiencia.vw_duracao_semana`. Forma lida do banco, nao escrita a mao. */
export interface VwDuracaoSemana {
  semana: string | null
  tipo_caminho: string | null
  n: number | null
  descartadas: number | null
  mediana_s: number | null
  p90_s: number | null
  p90_acima_do_teto: boolean | null
}

/** `experiencia.vw_exportacao_cliente`. Forma lida do banco, nao escrita a mao. */
export interface VwExportacaoCliente {
  cliente_id: string | null
  nome: string | null
  email: string | null
  whatsapp: string | null
  nascimento: string | null
  origem: string | null
  criado_em: string | null
  ultima_visita_em: string | null
  anonimizado_em: string | null
  anonimizado: boolean | null
  consentimentos_pesquisa: number | null
  consentimentos_contato: number | null
  primeiro_aceite_em: string | null
  ultimo_aceite_em: string | null
  versao_texto_mais_recente: string | null
}

/** `experiencia.vw_exportacao_comentario`. Forma lida do banco, nao escrita a mao. */
export interface VwExportacaoComentario {
  resposta_id: string | null
  dia_operacional: string | null
  nota: number | null
  faixa: string | null
  idioma: string | null
  texto_cru: string | null
  mascarado_em: string | null
  frase_ordem: number | null
  frase: string | null
  dimensao: string | null
  fator: string | null
  polaridade: string | null
  severidade: string | null
  nomeia_pessoa: boolean | null
  modelo: string | null
  versao_prompt: string | null
  classificado_em: string | null
  suspeita: boolean | null
}

/** `experiencia.vw_exportacao_item`. Forma lida do banco, nao escrita a mao. */
export interface VwExportacaoItem {
  resposta_id: string | null
  dia_operacional: string | null
  nota: number | null
  grupo: string | null
  item_cardapio_id: string | null
  item_nome: string | null
  produto_id_pdv: string | null
  fator: string | null
  suspeita: boolean | null
}

/** `experiencia.vw_exportacao_opcao`. Forma lida do banco, nao escrita a mao. */
export interface VwExportacaoOpcao {
  resposta_id: string | null
  dia_operacional: string | null
  nota: number | null
  faixa: string | null
  tela: string | null
  opcao_codigo: string | null
  dimensao: string | null
  fator: string | null
  suspeita: boolean | null
}

/** `experiencia.vw_exportacao_resposta`. Forma lida do banco, nao escrita a mao. */
export interface VwExportacaoResposta {
  resposta_id: string | null
  dia_operacional: string | null
  respondido_em: string | null
  nota: number | null
  faixa: string | null
  canal: string | null
  idioma: string | null
  garcom_nome: string | null
  garcom_pin_digitado: string | null
  garcom_reconhecido: boolean | null
  mesa_numero: string | null
  mesa_digitada: string | null
  mesa_area: string | null
  dispositivo_apelido: string | null
  suspeita: boolean | null
  suspeita_motivo: string | null
  versao_app: string | null
  versao_questionario: string | null
  criado_em: string | null
  criado_em_cliente: string | null
}

/** `experiencia.vw_exportacao_venda`. Forma lida do banco, nao escrita a mao. */
export interface VwExportacaoVenda {
  dia_operacional: string | null
  produto_id_pdv: string | null
  produto_nome_norm: string | null
  grupo: string | null
  unidades: number | null
  valor_liquido: number | null
  item_cardapio_id: string | null
  item_nome: string | null
  item_grupo: string | null
  importado_em: string | null
  arquivo_origem: string | null
  importacao_origem: string | null
}

/** `experiencia.vw_fator_contagem`. Forma lida do banco, nao escrita a mao. */
export interface VwFatorContagem {
  janela: string | null
  inicio: string | null
  fim: string | null
  origem: string | null
  dimensao: string | null
  fator: string | null
  mencoes: number | null
}

/** `experiencia.vw_garcom_trimestre`. Forma lida do banco, nao escrita a mao. */
export interface VwGarcomTrimestre {
  garcom_id: string | null
  nome: string | null
  ativo: boolean | null
  trimestre: string | null
  n: number | null
  n_tablet: number | null
  promotores: number | null
  neutros: number | null
  detratores: number | null
  nps: number | null
  tentativas: number | null
  recusas: number | null
  conversao_pct: number | null
  aviso: string | null
}

/** `experiencia.vw_hoje`. Forma lida do banco, nao escrita a mao. */
export interface VwHoje {
  dia_operacional: string | null
  casa_abre: boolean | null
  respostas: number | null
  detratores: number | null
  neutros: number | null
  promotores: number | null
  suspeitas: number | null
  mesas_atendidas: number | null
  conversao_pct: number | null
  aviso: string | null
}

/** `experiencia.vw_item_trimestre`. Forma lida do banco, nao escrita a mao. */
export interface VwItemTrimestre {
  item_cardapio_id: string | null
  nome_pt: string | null
  grupo: string | null
  ativo: boolean | null
  trimestre: string | null
  reclamacoes: number | null
  media_reclamacoes_cardapio: number | null
  unidades_vendidas: number | null
  sinalizado: boolean | null
  aviso: string | null
}

/** `experiencia.vw_nps_janela`. Forma lida do banco, nao escrita a mao. */
export interface VwNpsJanela {
  janela: string | null
  inicio: string | null
  fim: string | null
  n: number | null
  promotores: number | null
  neutros: number | null
  detratores: number | null
  nps: number | null
  erro_padrao: number | null
  faixa_95: number | null
  diferenca_minima_detectavel: number | null
  amostra_suficiente: boolean | null
  aviso: string | null
}

/** `experiencia.vw_pergunta_desempenho`. Forma lida do banco, nao escrita a mao. */
export interface VwPerguntaDesempenho {
  janela: string | null
  inicio: string | null
  fim: string | null
  pergunta_banco_id: string | null
  numero: number | null
  texto_pt: string | null
  dimensao: string | null
  em_foco: boolean | null
  em_foco_desde: string | null
  sorteadas: number | null
  respondidas: number | null
  respondidas_pct: number | null
  aviso: string | null
}

/** `experiencia.vw_satisfacao_venda_dia`. Forma lida do banco, nao escrita a mao. */
export interface VwSatisfacaoVendaDia {
  dia_operacional: string | null
  casa_abre: boolean | null
  n: number | null
  detratores: number | null
  promotores: number | null
  faturamento: number | null
  unidades: number | null
  mesas_atendidas: number | null
  ticket_medio_por_mesa: number | null
  aviso: string | null
}

/** `experiencia.vw_saude_rotina`. Forma lida do banco, nao escrita a mao. */
export interface VwSaudeRotina {
  id: string | null
  rotina: string | null
  passo: string | null
  iniciado_em: string | null
  terminado_em: string | null
  status: string | null
  respostas_no_periodo: number | null
  email_enviado: boolean | null
  destinatarios: string[] | null
  linhas_anonimizadas: number | null
  mascaramentos: number | null
  erro: string | null
  duracao_s: number | null
}

/** `experiencia.vw_semana_detrator`. Forma lida do banco, nao escrita a mao. */
export interface VwSemanaDetrator {
  semana: string | null
  detratores: number | null
  respostas: number | null
  dias_abertos: number | null
  detratores_semana_anterior: number | null
  dias_abertos_semana_anterior: number | null
  alerta_queda: boolean | null
  semana_incomparavel: boolean | null
}

/** `experiencia.vw_tela_pulo`. Forma lida do banco, nao escrita a mao. */
export interface VwTelaPulo {
  mes: string | null
  tela: string | null
  exibicoes: number | null
  pulos: number | null
  pulo_pct: number | null
  candidata_reescrita: boolean | null
}

/** `experiencia.vw_venda_dia`. Forma lida do banco, nao escrita a mao. */
export interface VwVendaDia {
  dia_operacional: string | null
  faturamento: number | null
  unidades: number | null
  mesas_atendidas: number | null
  ticket_medio_por_mesa: number | null
  produtos_mais_vendidos: unknown | null
  aviso: string | null
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
