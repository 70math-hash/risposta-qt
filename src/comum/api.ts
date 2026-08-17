/**
 * Cliente da API e o sincronizador da fila.
 *
 * O tablet nunca fala com o banco direto. Fala com o Worker de escrita, que e o unico que
 * conhece a chave de servico. Isso e o que permite o bundle publicado ser legivel por
 * qualquer pessoa sem consequencia.
 */

import type {
  RespostaDaApi,
  RespostaEnviada,
  SinalDispositivo,
  TentativaEnviada,
} from './contrato.js'
import { validaResposta } from './contrato.js'
import {
  limpaEnviadas,
  marcaResposta,
  marcaTentativa,
  respostasPendentes,
  tamanhoFila,
  tentativasPendentes,
} from '../coleta/fila.js'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

/** Depois de 8 tentativas, a resposta para de consumir bateria e vira linha no painel de saude. */
const MAX_TENTATIVAS = 8
const TIMEOUT_MS = 12_000

async function envia<T>(rota: string, corpo: unknown): Promise<T> {
  const controle = new AbortController()
  const relogio = setTimeout(() => controle.abort(), TIMEOUT_MS)
  try {
    const resp = await fetch(`${BASE}${rota}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: controle.signal,
    })
    if (!resp.ok) {
      const texto = await resp.text().catch(() => '')
      throw new Error(`HTTP ${resp.status}: ${texto.slice(0, 200)}`)
    }
    return (await resp.json()) as T
  } finally {
    clearTimeout(relogio)
  }
}

export const gravaResposta = (r: RespostaEnviada): Promise<RespostaDaApi> =>
  envia<RespostaDaApi>('/api/resposta', r)

export const gravaTentativa = (t: TentativaEnviada): Promise<RespostaDaApi> =>
  envia<RespostaDaApi>('/api/tentativa', t)

export const enviaSinal = (s: SinalDispositivo): Promise<RespostaDaApi> =>
  envia<RespostaDaApi>('/api/sinal', s)

export interface ResultadoSincronia {
  enviadas: number
  falhas: number
  pendentes: number
}

/**
 * Drena a fila local.
 *
 * Chamada no arranque, ao voltar a conexao, e a cada resposta nova. Idempotente por
 * construcao: o servidor reconhece reenvio pelo `id` gerado no cliente, entao enviar duas
 * vezes nao cria duas linhas, e por isso a fila pode ser agressiva sem risco de duplicar.
 */
export async function sincroniza(): Promise<ResultadoSincronia> {
  let enviadas = 0
  let falhas = 0

  for (const item of await tentativasPendentes()) {
    try {
      await marcaTentativa(item.id, 'enviando')
      await gravaTentativa(item.carga)
      await marcaTentativa(item.id, 'enviada')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const esgotou = item.tentativas_envio + 1 >= MAX_TENTATIVAS
      await marcaTentativa(item.id, esgotou ? 'falha_permanente' : 'pendente', msg)
    }
  }

  for (const item of await respostasPendentes()) {
    const erros = validaResposta(item.carga)
    if (erros.length > 0) {
      // Payload invalido nao melhora com retentativa. Marcar e seguir, para nao travar a
      // fila atras de uma resposta que o servidor nunca vai aceitar.
      await marcaResposta(item.id, 'falha_permanente', erros.join('; '))
      falhas++
      continue
    }
    try {
      await marcaResposta(item.id, 'enviando')
      await gravaResposta(item.carga)
      await marcaResposta(item.id, 'enviada')
      enviadas++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const esgotou = item.tentativas_envio + 1 >= MAX_TENTATIVAS
      await marcaResposta(item.id, esgotou ? 'falha_permanente' : 'pendente', msg)
      falhas++
    }
  }

  await limpaEnviadas()
  return { enviadas, falhas, pendentes: await tamanhoFila() }
}

/**
 * Liga o sincronizador aos eventos que importam.
 *
 * Devolve a funcao de desligar, para o React poder limpar. O intervalo de 5 minutos existe
 * porque `online` nao dispara em toda recuperacao de rede: Wi-Fi que volta com o mesmo SSID
 * as vezes nao gera evento nenhum, e a fila ficaria parada esperando um sinal que nao vem.
 */
export function ligaSincronizador(aoSincronizar?: (r: ResultadoSincronia) => void): () => void {
  let vivo = true

  const rodar = () => {
    if (!vivo || !navigator.onLine) return
    void sincroniza()
      .then((r) => aoSincronizar?.(r))
      .catch(() => {
        // Sincronia e melhor esforco: erro aqui nao pode aparecer para o cliente na mesa.
      })
  }

  const aoVoltarRede = () => rodar()
  const aoVoltarVisivel = () => {
    if (document.visibilityState === 'visible') rodar()
  }

  window.addEventListener('online', aoVoltarRede)
  document.addEventListener('visibilitychange', aoVoltarVisivel)
  const intervalo = setInterval(rodar, 5 * 60_000)
  rodar()

  return () => {
    vivo = false
    clearInterval(intervalo)
    window.removeEventListener('online', aoVoltarRede)
    document.removeEventListener('visibilitychange', aoVoltarVisivel)
  }
}

/**
 * Liga o heartbeat do aparelho.
 *
 * Com quatro tablets em uso, um aparelho mudo fica invisivel no agregado: os outros tres
 * seguem coletando e o total do dia parece normal (decisao D5). Este sinal e o que permite
 * ao e-mail das 16h listar cada aparelho pelo apelido com a hora do ultimo contato, e sem ele
 * um tablet pode passar semanas morto sem ninguem notar.
 */
export function ligaHeartbeat(dispositivoId: string, versaoApp: string): () => void {
  const bater = () => {
    void tamanhoFila()
      .then((fila) =>
        enviaSinal({
          dispositivo_id: dispositivoId,
          versao_app: versaoApp,
          fila_pendente: fila,
        }),
      )
      .catch(() => {
        // Sinal perdido nao e problema: o alarme dispara por AUSENCIA de sinal por mais de
        // 24 horas (N31), e uma batida perdida nao chega perto disso.
      })
  }
  const intervalo = setInterval(bater, 30 * 60_000)
  bater()
  return () => clearInterval(intervalo)
}
