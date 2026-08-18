/**
 * A fila local do tablet: `fila_resposta` em IndexedDB, com espelho append-only em
 * localStorage.
 *
 * Por que existe, mesmo com a internet do salao declarada estavel: resposta perdida com o
 * cliente vendo tela de erro contamina justamente a experiencia que se esta medindo. O custo
 * de ter fila e baixo, e o custo de nao ter e perder o dado e a confianca de uma vez.
 *
 * O volume torna a cota irrelevante: 200 respostas por mes com nota, texto e contato sao
 * kilobytes, contra dezenas de por cento do disco disponiveis. O que importa nao e cota, e
 * **eviccao**: por padrao o armazenamento e best-effort e pode ser descartado sob pressao de
 * disco. Por isso duas coisas: pedimos persistencia ao navegador, e mantemos um espelho em
 * localStorage, que e a redundancia mais barata que existe.
 */

import type { RespostaEnviada, TentativaEnviada } from '../comum/contrato.js'

const BANCO = 'qt_experiencia'
const VERSAO_BANCO = 1
const LOJA_RESPOSTA = 'fila_resposta'
const LOJA_TENTATIVA = 'fila_tentativa'
const ESPELHO = 'qt_fila_espelho'

/**
 * `falha_permanente` significa "o servidor NUNCA vai aceitar isto", e nao "ainda nao consegui".
 *
 * A distincao e a coisa mais importante deste arquivo. A versao anterior marcava
 * `falha_permanente` depois de 8 tentativas, e o sincronizador roda a cada 5 minutos: 40 minutos
 * de rede ruim descartavam a resposta em silencio. E `pendentes()` filtrava so `pendente` e
 * `enviando`, entao a resposta saia do contador da T0, de `tamanhoFila()` e do
 * `dispositivo.fila_pendente` — a unica coisa que poderia ter avisado.
 *
 * Agora `falha_permanente` sai apenas de erro que retentativa nao conserta: payload que a
 * validacao local recusa, ou HTTP 4xx (o servidor entendeu e disse nao). Rede, tempo esgotado e
 * 5xx retentam para sempre, com recuo, porque a promessa escrita e "ao voltar, sobem sozinhas".
 */
export type StatusFila = 'pendente' | 'enviando' | 'enviada' | 'falha_permanente'

export interface ItemFila<T> {
  id: string
  carga: T
  status: StatusFila
  tentativas_envio: number
  ultimo_erro?: string
  criado_em_local: string
  /**
   * Quando a ultima tentativa aconteceu. Base do recuo exponencial.
   *
   * Sem recuo, retentar para sempre a cada 5 minutos gastaria bateria a noite inteira num tablet
   * sem rede. Com recuo, a espera cresce ate um teto e a fila continua viva.
   */
  ultima_tentativa_em?: string
}

/**
 * Quanto esperar antes da proxima tentativa, em minutos: 5, 10, 20, 40, e dai em diante 60.
 *
 * Teto de 60 minutos, e nao desistencia. O expediente da casa tem cerca de 8 horas, entao com o
 * teto a fila tenta ao menos 8 vezes na pior noite possivel, e volta a tentar no dia seguinte
 * quando o tablet for ligado.
 */
export function esperaMinutos(tentativas: number): number {
  return Math.min(5 * 2 ** Math.max(0, tentativas - 1), 60)
}

/** Ja passou tempo suficiente desde a ultima tentativa deste item? */
export function estaNaHora(item: ItemFila<unknown>, agora = Date.now()): boolean {
  if (item.ultima_tentativa_em === undefined) return true
  const desde = agora - Date.parse(item.ultima_tentativa_em)
  return desde >= esperaMinutos(item.tentativas_envio) * 60_000
}

function abre(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BANCO, VERSAO_BANCO)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(LOJA_RESPOSTA)) {
        const loja = db.createObjectStore(LOJA_RESPOSTA, { keyPath: 'id' })
        loja.createIndex('por_status', 'status')
      }
      if (!db.objectStoreNames.contains(LOJA_TENTATIVA)) {
        const loja = db.createObjectStore(LOJA_TENTATIVA, { keyPath: 'id' })
        loja.createIndex('por_status', 'status')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('indexedDB indisponivel'))
  })
}

function transacao<T>(
  loja: string,
  modo: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return abre().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(loja, modo)
        const req = fn(tx.objectStore(loja))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error ?? new Error('falha na transacao'))
        tx.oncomplete = () => db.close()
      }),
  )
}

/**
 * Pede ao navegador que o armazenamento deixe de ser descartavel.
 *
 * Sem isso, o padrao e best-effort e o dado pode sair por LRU sob pressao de disco. Com isso,
 * so o usuario apaga. Chamar no arranque do app, e nao falhar se o navegador recusar.
 */
export async function pedePersistencia(): Promise<boolean> {
  try {
    if (navigator.storage?.persist === undefined) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

/** Espelho append-only em localStorage. Redundancia barata, nunca fonte da verdade. */
function espelha(carga: unknown): void {
  try {
    const bruto = localStorage.getItem(ESPELHO)
    const lista: unknown[] = bruto === null ? [] : (JSON.parse(bruto) as unknown[])
    lista.push({ em: new Date().toISOString(), carga })
    // Teto de 500 entradas: o espelho e rede de seguranca de curto prazo, nao arquivo.
    localStorage.setItem(ESPELHO, JSON.stringify(lista.slice(-500)))
  } catch {
    // Espelho e melhor esforco. Falhar aqui nunca pode derrubar a gravacao principal.
  }
}

export async function enfileiraResposta(carga: RespostaEnviada): Promise<void> {
  const item: ItemFila<RespostaEnviada> = {
    id: carga.id,
    carga,
    status: 'pendente',
    tentativas_envio: 0,
    criado_em_local: new Date().toISOString(),
  }
  espelha(carga)
  await transacao(LOJA_RESPOSTA, 'readwrite', (s) => s.put(item))
}

/**
 * A recusa registrada na T0.
 *
 * Tambem espelhada em `localStorage`, e nao so gravada no IndexedDB. A recusa e o NUMERADOR da
 * conversao por garcom e o unico registro de quem nao respondeu: ela era o unico dado da coleta sem
 * espelho, e o espelho existe justamente para o caso em que o IndexedDB e limpo (modo anonimo,
 * limpeza de dados do navegador, atualizacao do Fully Kiosk).
 */
export async function enfileiraTentativa(carga: TentativaEnviada): Promise<void> {
  const item: ItemFila<TentativaEnviada> = {
    id: carga.id,
    carga,
    status: 'pendente',
    tentativas_envio: 0,
    criado_em_local: new Date().toISOString(),
  }
  espelha(carga)
  await transacao(LOJA_TENTATIVA, 'readwrite', (s) => s.put(item))
}

/**
 * O que ainda tem de subir, e cujo recuo ja venceu.
 *
 * `enviando` entra porque um envio interrompido no meio (aba fechada, aparelho reiniciado) deixa o
 * item nesse estado para sempre; sem ele aqui, a resposta ficaria presa sem ninguem retentar.
 */
async function pendentes<T>(loja: string): Promise<ItemFila<T>[]> {
  const todos = await transacao<ItemFila<T>[]>(loja, 'readonly', (s) => s.getAll())
  return todos.filter(
    (i) => (i.status === 'pendente' || i.status === 'enviando') && estaNaHora(i),
  )
}

/** Tudo que ainda nao foi aceito pelo servidor, inclusive o que o recuo esta segurando. */
async function naoEnviados<T>(loja: string): Promise<ItemFila<T>[]> {
  const todos = await transacao<ItemFila<T>[]>(loja, 'readonly', (s) => s.getAll())
  return todos.filter((i) => i.status !== 'enviada')
}

export const respostasPendentes = (): Promise<ItemFila<RespostaEnviada>[]> =>
  pendentes<RespostaEnviada>(LOJA_RESPOSTA)

export const tentativasPendentes = (): Promise<ItemFila<TentativaEnviada>[]> =>
  pendentes<TentativaEnviada>(LOJA_TENTATIVA)

async function marca(
  loja: string,
  id: string,
  status: StatusFila,
  erro?: string,
): Promise<void> {
  const atual = await transacao<ItemFila<unknown> | undefined>(loja, 'readonly', (s) =>
    s.get(id),
  )
  if (atual === undefined) return
  const novo: ItemFila<unknown> = {
    ...atual,
    status,
    tentativas_envio: atual.tentativas_envio + (status === 'enviando' ? 1 : 0),
    ...(status === 'enviando' ? { ultima_tentativa_em: new Date().toISOString() } : {}),
    ...(erro !== undefined ? { ultimo_erro: erro } : {}),
  }
  await transacao(loja, 'readwrite', (s) => s.put(novo))
}

export const marcaResposta = (id: string, status: StatusFila, erro?: string) =>
  marca(LOJA_RESPOSTA, id, status, erro)

export const marcaTentativa = (id: string, status: StatusFila, erro?: string) =>
  marca(LOJA_TENTATIVA, id, status, erro)

/**
 * Quantas respostas estao aguardando envio. Vai no sinal do aparelho.
 *
 * Fila acima de 5 por mais de 2 horas e um dos dois gatilhos de alarme do heartbeat (N31), e
 * e o que distingue "o tablet esta sem rede" de "o tablet esta desligado".
 */
export async function tamanhoFila(): Promise<number> {
  // TUDO que nao foi aceito, e nao apenas o que esta na hora de tentar. Contar so o vencido faria
  // o numero cair e subir sozinho conforme o recuo, e o painel de saude leria isso como fila
  // esvaziando. Inclui `falha_permanente`: resposta que o servidor recusou de vez tem de aparecer
  // em algum lugar, senao ela desaparece sem ninguem saber que existiu.
  return (await naoEnviados<RespostaEnviada>(LOJA_RESPOSTA)).length
}

/**
 * As que o servidor recusou de vez, separadas do resto.
 *
 * Existe para a T0 e o heartbeat poderem dizer "5 na fila, 1 recusada" em vez de um numero so:
 * fila que nao anda e fila que nao vai andar pedem acoes diferentes.
 */
export async function respostasComFalha(): Promise<ItemFila<RespostaEnviada>[]> {
  const todos = await transacao<ItemFila<RespostaEnviada>[]>(LOJA_RESPOSTA, 'readonly', (s) =>
    s.getAll(),
  )
  return todos.filter((i) => i.status === 'falha_permanente')
}

/** Remove o que ja foi confirmado pelo servidor. Chamado depois de sincronizar. */
export async function limpaEnviadas(): Promise<number> {
  const todos = await transacao<ItemFila<unknown>[]>(LOJA_RESPOSTA, 'readonly', (s) =>
    s.getAll(),
  )
  const enviadas = todos.filter((i) => i.status === 'enviada')
  for (const i of enviadas) {
    await transacao(LOJA_RESPOSTA, 'readwrite', (s) => s.delete(i.id))
  }
  return enviadas.length
}
