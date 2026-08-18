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
import { seleciona, type ContagensRotina } from '../lib/supabase.js'
import { importaR3, jaImportado, leCardapio, sha256 } from './importa.js'

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

export async function rodaWatcherDrive(env: Ambiente): Promise<ContagensRotina> {
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
  let linhasGravadas = 0
  let semItem = 0
  let comErro = 0

  // O cardapio inteiro, uma vez, fora do laco: sao dezenas de itens e ele nao muda no meio de uma
  // varredura. Resolver item por item dentro do laco faria uma consulta por linha do R3.
  const cardapio = await leCardapio(env)

  for (const arquivo of files) {
    const conteudo = await fetch(
      `https://www.googleapis.com/drive/v3/files/${arquivo.id}?alt=media`,
      { headers: { authorization: `Bearer ${token}` } },
    )
    if (!conteudo.ok) continue
    const bytes = await conteudo.arrayBuffer()

    // Idempotencia por hash, ANTES de gastar tempo interpretando: o mesmo arquivo visto de novo
    // nao importa duas vezes. E por isso que o watcher pode olhar os 10 mais recentes toda meia
    // hora sem reprocessar nada.
    if (await jaImportado(env, await sha256(bytes))) {
      jaConhecidos++
      continue
    }

    const r = await importaR3(env, {
      nome: arquivo.name,
      bytes,
      origem: 'watcher_drive',
      cardapio,
    })

    linhasGravadas += r.linhas_gravadas
    semItem += r.sem_item_no_cardapio
    if (r.status === 'sucesso') importados++
    else comErro++
  }

  return {
    arquivos_vistos: files.length,
    importados,
    ja_conhecidos: jaConhecidos,
    linhas_gravadas: linhasGravadas,
    // Produto vendido que nao existe em `item_cardapio`. E o numero que faz o cardapio se
    // cobrar sozinho: sem item casado, a venda entra no faturamento e NAO entra no cruzamento
    // de reclamacao por 100 unidades, que e o diferencial do projeto.
    sem_item_no_cardapio: semItem,
    arquivos_com_erro: comErro,
    pasta_configurada: 1,
  }
}
