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

export type StatusFila = 'pendente' | 'enviando' | 'enviada' | 'falha_permanente'

export interface ItemFila<T> {
  id: string
  carga: T
  status: StatusFila
  tentativas_envio: number
  ultimo_erro?: string
  criado_em_local: string
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

export async function enfileiraTentativa(carga: TentativaEnviada): Promise<void> {
  const item: ItemFila<TentativaEnviada> = {
    id: carga.id,
    carga,
    status: 'pendente',
    tentativas_envio: 0,
    criado_em_local: new Date().toISOString(),
  }
  await transacao(LOJA_TENTATIVA, 'readwrite', (s) => s.put(item))
}

async function pendentes<T>(loja: string): Promise<ItemFila<T>[]> {
  const todos = await transacao<ItemFila<T>[]>(loja, 'readonly', (s) => s.getAll())
  return todos.filter((i) => i.status === 'pendente' || i.status === 'enviando')
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
  const r = await respostasPendentes()
  return r.length
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
