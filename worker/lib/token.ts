/**
 * O token do papel restrito.
 *
 * POR QUE EXISTE
 *   O unico caminho de escrita do sistema era `SUPABASE_SERVICE_KEY`. O `service_role` do Supabase
 *   tem `BYPASSRLS` e privilegio no `public` do sistema fiscal, entao com ele:
 *
 *     - a matriz de grants das 26 tabelas nao vale para quem escreve;
 *     - as politicas de RLS nao valem para quem escreve;
 *     - a invariante de append-only protege um papel que nao era usado;
 *     - e o critério de aceite de F55, "tentativa de INSERT em tabela fiscal tem que falhar",
 *       FALHAVA POR CONSTRUCAO.
 *
 *   Aqui o Worker assina um JWT curto com `role: experiencia_app`. O PostgREST le esse claim e faz
 *   `set local role experiencia_app` antes da consulta. A partir dai grants e RLS passam a valer de
 *   verdade, e a permissao deixa de ser decoracao.
 *
 * O QUE E **NAO VERIFICADO**
 *   Se o PostgREST hospedado do Supabase aceita um papel CUSTOM no claim `role`, e se o projeto
 *   ainda tem o segredo HS256 legado (projetos novos estao migrando para chaves assimetricas).
 *   Nenhuma das duas da para conferir sem o projeto na mao.
 *
 *   Por isso a degradacao e EXPLICITA e nao silenciosa: sem `SUPABASE_JWT_SECRET`, o Worker usa a
 *   chave de servico e diz que esta usando, em `GET /api/saude`. Um sistema que cai para o caminho
 *   mais permissivo sem avisar e pior que um que nunca teve o caminho restrito, porque o documento
 *   passa a descrever uma protecao que nao existe.
 *
 * O SEGREDO NAO SAI DAQUI
 *   Ele vive so como variavel do Worker. O token assinado dura 60 segundos e nao e guardado em
 *   lugar nenhum alem do cache em memoria da isolada, que morre com ela.
 */

import type { Ambiente } from './supabase.js'

/** Quanto tempo o token vale. Curto de proposito: ele e reassinado a cada minuto. */
const VALIDADE_S = 60

/**
 * Cache do token na isolada.
 *
 * Assinar HS256 e barato, mas nao gratuito, e uma rotina do digest faz sete consultas seguidas. Uma
 * assinatura por minuto por isolada e o suficiente.
 */
let cache: { token: string; expiraEm: number; papel: string } | null = null

function base64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function textoParaBase64url(texto: string): string {
  return base64url(new TextEncoder().encode(texto))
}

/**
 * Assina um JWT HS256 com o claim `role`.
 *
 * `iss: 'supabase'` e `aud: 'authenticated'` acompanham o formato dos tokens do proprio projeto. O
 * que decide o papel no banco e `role`, e e o unico claim que este arquivo existe para colocar.
 */
async function assina(segredo: string, papel: string, agoraS: number): Promise<string> {
  const cabecalho = textoParaBase64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const corpo = textoParaBase64url(
    JSON.stringify({
      role: papel,
      iss: 'supabase',
      aud: 'authenticated',
      iat: agoraS,
      exp: agoraS + VALIDADE_S,
    }),
  )
  const naoAssinado = `${cabecalho}.${corpo}`

  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const assinatura = await crypto.subtle.sign(
    'HMAC',
    chave,
    new TextEncoder().encode(naoAssinado),
  )
  return `${naoAssinado}.${base64url(new Uint8Array(assinatura))}`
}

export interface Credencial {
  /** O que vai no cabecalho `authorization`. */
  autorizacao: string
  /** O que vai no cabecalho `apikey`. O gateway do Supabase exige uma chave de projeto aqui. */
  apikey: string
  /** Qual caminho esta ativo, para `GET /api/saude` poder dizer. */
  papel: 'experiencia_app' | 'service_role'
}

/**
 * A credencial que o Worker deve usar agora.
 *
 * Prefere o papel restrito. Cai para a chave de servico SO quando o segredo nao esta configurado, e
 * quem chama registra isso.
 */
export async function credencial(env: Ambiente, agoraMs = Date.now()): Promise<Credencial> {
  const segredo = env.SUPABASE_JWT_SECRET
  const apikey = env.SUPABASE_ANON_KEY ?? env.SUPABASE_SERVICE_KEY

  if (segredo === undefined || segredo === '') {
    return {
      autorizacao: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      apikey: env.SUPABASE_SERVICE_KEY,
      papel: 'service_role',
    }
  }

  const agoraS = Math.floor(agoraMs / 1000)
  // Reassina 10 segundos antes de vencer: um token que expira no meio de uma rotina de sete
  // consultas faria a rotina falhar pela metade, com parte gravada.
  if (cache !== null && cache.expiraEm - 10 > agoraS && cache.papel === 'experiencia_app') {
    return { autorizacao: `Bearer ${cache.token}`, apikey, papel: 'experiencia_app' }
  }

  const token = await assina(segredo, 'experiencia_app', agoraS)
  cache = { token, expiraEm: agoraS + VALIDADE_S, papel: 'experiencia_app' }
  return { autorizacao: `Bearer ${token}`, apikey, papel: 'experiencia_app' }
}

/** Zera o cache. Existe para o teste poder trocar de ambiente sem carregar token de outro. */
export function limpaCacheDeToken(): void {
  cache = null
}
