/**
 * `watcher_drive`: importa o relatorio R3 de Vendas por Produto Detalhado, do Altec.
 *
 * O caminho escolhido entre os nove avaliados: pasta sincronizada do Drive mais este watcher.
 * Nao depende de nada da Altec, que nao tem API publica (o repositorio de documentacao dela
 * esta vazio), nao depende do PC do caixa, que desliga no fim do dia, e nao precisa de
 * Raspberry Pi, que seria um ponto de falha fisico no salao para uma tarefa que um cron na
 * nuvem faz de graca.
 *
 * A credencial e uma CONTA DE SERVICO com leitura em UMA pasta, nunca OAuth de usuario com
 * refresh token. Isso e deliberado: token de usuario que expira em silencio e exatamente a
 * fragilidade que fez a API do Google Business Profile ser recusada.
 *
 * O arquivo bruto e guardado ANTES de ser interpretado. Se o layout mudar e o parser quebrar,
 * o dado nao se perde: reprocessa do bruto, sem repetir a coleta.
 */

import type { Ambiente } from '../lib/supabase.js'
import { insere, seleciona } from '../lib/supabase.js'
import { interpretaR3 } from './r3.js'

interface ArquivoDrive {
  id: string
  name: string
  modifiedTime: string
}

async function tokenDaContaDeServico(env: Ambiente): Promise<string> {
  if (env.DRIVE_SA_JSON === undefined || env.DRIVE_SA_JSON === '') {
    throw new Error('DRIVE_SA_JSON ausente: watcher sem credencial')
  }
  const sa = JSON.parse(env.DRIVE_SA_JSON) as {
    client_email: string
    private_key: string
    token_uri?: string
  }

  const agora = Math.floor(Date.now() / 1000)
  const cabecalho = { alg: 'RS256', typ: 'JWT' }
  const reivindicacao = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: sa.token_uri ?? 'https://oauth2.googleapis.com/token',
    exp: agora + 3600,
    iat: agora,
  }

  const b64url = (s: string) =>
    btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const naoAssinado = `${b64url(JSON.stringify(cabecalho))}.${b64url(JSON.stringify(reivindicacao))}`

  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
  const bruto = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))
  const chave = await crypto.subtle.importKey(
    'pkcs8',
    bruto,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const assinatura = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    chave,
    new TextEncoder().encode(naoAssinado),
  )
  const assinaturaB64 = btoa(String.fromCharCode(...new Uint8Array(assinatura)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const resp = await fetch(reivindicacao.aud, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${naoAssinado}.${assinaturaB64}`,
    }),
  })
  if (!resp.ok) throw new Error(`token do Drive falhou: ${resp.status}`)
  const dados = (await resp.json()) as { access_token: string }
  return dados.access_token
}

async function hash(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function rodaWatcherDrive(env: Ambiente): Promise<Record<string, number>> {
  const pastaId = (
    await seleciona<{ valor: string }>(env, 'configuracao', 'select=valor&chave=eq.drive_pasta_r3')
  )[0]?.valor

  if (pastaId === undefined) {
    // Sem pasta configurada, a rotina nao e falha: e um sistema que ainda nao foi ligado.
    // O botao de importar planilha no painel continua sendo o caminho manual.
    return { arquivos_vistos: 0, importados: 0, ja_conhecidos: 0, pasta_configurada: 0 }
  }

  const token = await tokenDaContaDeServico(env)
  const busca = new URL('https://www.googleapis.com/drive/v3/files')
  busca.searchParams.set('q', `'${pastaId}' in parents and trashed = false`)
  busca.searchParams.set('fields', 'files(id,name,modifiedTime)')
  busca.searchParams.set('orderBy', 'modifiedTime desc')
  busca.searchParams.set('pageSize', '10')

  const lista = await fetch(busca, { headers: { authorization: `Bearer ${token}` } })
  if (!lista.ok) throw new Error(`Drive devolveu ${lista.status}`)
  const { files = [] } = (await lista.json()) as { files?: ArquivoDrive[] }

  let importados = 0
  let jaConhecidos = 0

  for (const arquivo of files) {
    const conteudo = await fetch(
      `https://www.googleapis.com/drive/v3/files/${arquivo.id}?alt=media`,
      { headers: { authorization: `Bearer ${token}` } },
    )
    if (!conteudo.ok) continue
    const bytes = await conteudo.arrayBuffer()
    const sha = await hash(bytes)

    // Idempotencia por hash: o mesmo arquivo visto de novo nao importa duas vezes.
    const conhecido = await seleciona<{ id: string }>(
      env,
      'execucao_importacao',
      `select=id&hash_arquivo=eq.${sha}&limit=1`,
    )
    if (conhecido.length > 0) {
      jaConhecidos++
      continue
    }

    const texto = new TextDecoder('utf-8').decode(bytes)
    const resultado = interpretaR3(texto)

    // O bruto entra na propria linha de execucao, ANTES de o resultado ser gravado.
    await insere(env, 'execucao_importacao', [
      {
        arquivo_nome: arquivo.name,
        hash_arquivo: sha,
        arquivo_bruto: texto.slice(0, 500_000),
        iniciado_em: new Date().toISOString(),
        terminado_em: new Date().toISOString(),
        status: resultado.erros.length === 0 ? 'sucesso' : 'erro',
        linhas_lidas: resultado.linhas.length,
        ...(resultado.erros.length > 0 ? { erro: resultado.erros.join('; ').slice(0, 1000) } : {}),
      },
    ])

    if (resultado.linhas.length > 0) {
      await insere(env, 'venda_produto_dia', resultado.linhas)
      importados++
    }
  }

  return {
    arquivos_vistos: files.length,
    importados,
    ja_conhecidos: jaConhecidos,
    pasta_configurada: 1,
  }
}
