/**
 * O dia operacional, e nada mais.
 *
 * Espelho exato de `experiencia.fn_dia_operacional` (folha canonica, secao 4.3):
 *
 *   select ((ts at time zone 'America/Sao_Paulo') - interval '6 hours')::date
 *
 * O corte e as 6h da manha, no fuso America/Sao_Paulo, e NUNCA a meia-noite.
 * Tudo que entra entre 00:00 e 05:59 pertence a noite anterior.
 *
 * Por que isto existe: o fornecedor anterior cortava o dia as 23:59 enquanto o contador
 * do tablet zerava as 7:00, e numa casa que fecha depois da meia-noite isso lancava o
 * pedaco mais tardio da noite no dia errado, todos os dias. Corrigir esse defeito e uma
 * das razoes do projeto, e e por isso que existe UMA definicao so, aqui e no banco.
 *
 * PROIBIDO no repositorio inteiro: `criado_em::date`, `date(criado_em)`, ou qualquer
 * agrupamento por data civil. Ver folha canonica, secao 4.7.
 */

export const TZ_CASA = 'America/Sao_Paulo'
export const CORTE_HORAS = 6

/** Componentes de parede (wall clock) de um instante, no fuso da casa. */
function paredeNaCasa(ts: Date): {
  ano: number
  mes: number
  dia: number
  hora: number
  minuto: number
} {
  // `en-CA` devolve AAAA-MM-DD, que evita ambiguidade de ordem de campo.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_CASA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const partes: Record<string, string> = {}
  for (const p of fmt.formatToParts(ts)) {
    if (p.type !== 'literal') partes[p.type] = p.value
  }
  return {
    ano: Number(partes.year),
    mes: Number(partes.month),
    dia: Number(partes.day),
    // Em hour12:false, meia-noite pode vir como "24" em algumas plataformas.
    hora: Number(partes.hour) % 24,
    minuto: Number(partes.minute),
  }
}

function iso(ano: number, mes: number, dia: number): string {
  const mm = String(mes).padStart(2, '0')
  const dd = String(dia).padStart(2, '0')
  return `${ano}-${mm}-${dd}`
}

/**
 * O dia operacional de um instante, como `AAAA-MM-DD`.
 *
 * Devolve string e nao Date de proposito: `Date` sem hora carrega fuso implicito e é a
 * fonte classica de erro de um dia. O banco guarda `date`, o painel exibe texto, e nada
 * no meio precisa de objeto de data.
 */
export function diaOperacional(ts: Date): string {
  const p = paredeNaCasa(ts)
  // Trata a hora de parede como se fosse UTC, subtrai o corte, e le a data.
  // E exatamente o que `at time zone` seguido de `- interval '6 hours'` faz no Postgres.
  const comoUtc = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto)
  const deslocado = new Date(comoUtc - CORTE_HORAS * 3_600_000)
  return iso(
    deslocado.getUTCFullYear(),
    deslocado.getUTCMonth() + 1,
    deslocado.getUTCDate(),
  )
}

/** O dia operacional de agora. */
export function diaOperacionalHoje(agora: Date = new Date()): string {
  return diaOperacional(agora)
}

/** O dia operacional fechado que o digest das 16h de hoje cobre: sempre o anterior. */
export function diaOperacionalAnterior(agora: Date = new Date()): string {
  return somaDias(diaOperacional(agora), -1)
}

/** Soma dias a um `AAAA-MM-DD`, sem tocar em fuso. */
export function somaDias(dia: string, n: number): string {
  const [a, m, d] = dia.split('-').map(Number)
  const base = new Date(Date.UTC(a!, m! - 1, d!))
  base.setUTCDate(base.getUTCDate() + n)
  return iso(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate())
}

/** 0 = domingo, 1 = segunda, ..., 6 = sabado. Lido do dia operacional, nunca da data civil. */
export function diaDaSemana(dia: string): number {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a!, m! - 1, d!)).getUTCDay()
}

/** Horario padrao da casa, por dia da semana. Fecha segunda. */
const HORARIO_PADRAO: Readonly<Record<number, { abre: string; fecha: string } | null>> = {
  0: { abre: '17:00', fecha: '23:00' }, // domingo
  1: null, //                              segunda: fechada
  2: { abre: '18:00', fecha: '23:00' }, // terca
  3: { abre: '18:00', fecha: '23:00' }, // quarta
  4: { abre: '18:00', fecha: '23:00' }, // quinta
  5: { abre: '18:00', fecha: '23:00' }, // sexta
  6: { abre: '17:00', fecha: '23:00' }, // sabado
}

/**
 * Espelho de `experiencia.fn_casa_abre`, na parte que nao depende do banco.
 *
 * So o padrao semanal. A excecao (feriado, fechamento extraordinario, abertura extra) vive
 * em `calendario_operacao` e sobrepoe este resultado, e por isso a versao autoritativa e a
 * do banco. Esta serve ao front, que ja recebe as excecoes junto dos dados.
 *
 * Serve a uma coisa so, e ela importa: o digest escreve `casa fechada` em vez de
 * `nenhuma resposta coletada`. Sem isso, o e-mail de terca acusaria falha de coleta na
 * segunda, toda semana, para sempre, e o alarme perderia credibilidade.
 */
export function casaAbrePadrao(dia: string): boolean {
  return HORARIO_PADRAO[diaDaSemana(dia)] !== null
}

export function horarioPadrao(dia: string): { abre: string; fecha: string } | null {
  return HORARIO_PADRAO[diaDaSemana(dia)] ?? null
}

const NOME_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/**
 * Rotulo do dia operacional para a tela, com a janela real.
 *
 * A folha canonica, secao 4.7, exige `terça 12/08, das 18h às 6h`, e nao `12/08`, para
 * que ninguem leia o numero como se fosse dia civil.
 */
export function rotuloDiaOperacional(dia: string): string {
  const [, m, d] = dia.split('-')
  const nome = NOME_DIA[diaDaSemana(dia)]
  const h = horarioPadrao(dia)
  if (h === null) return `${nome} ${d}/${m}, casa fechada`
  const abre = h.abre.replace(':00', 'h')
  return `${nome} ${d}/${m}, das ${abre} às 6h`
}
