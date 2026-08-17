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
import { insere, seleciona, type ContagensRotina } from '../lib/supabase.js'
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

/**
 * Bytes para o formato que o PostgREST aceita numa coluna `bytea`: `\x` mais hexadecimal.
 *
 * Existe porque `arquivo_bruto` e `bytea`, e a versao anterior mandava `texto.slice(...)`, uma
 * string ja decodificada por UTF-8. Duas consequencias: o valor nao entra como os bytes que
 * chegaram, e um R3 salvo em Windows-1252 perde exatamente os acentos que se quer reprocessar.
 */
function paraBytea(bytes: ArrayBuffer): string {
  let hex = ''
  for (const b of new Uint8Array(bytes)) hex += b.toString(16).padStart(2, '0')
  return `\\x${hex}`
}

async function hash(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
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

  // O cardapio inteiro, uma vez, fora do laco: sao dezenas de itens e ele nao muda no meio de
  // uma importacao. Resolver item por item dentro do laco faria uma consulta por linha do R3.
  const cardapio = await seleciona<{
    id: string
    produto_id_pdv: string | null
    produto_nome_norm: string | null
  }>(env, 'item_cardapio', 'select=id,produto_id_pdv,produto_nome_norm&removido_em=is.null')

  const porId = new Map<string, string>()
  const porNome = new Map<string, string>()
  for (const item of cardapio) {
    if (item.produto_id_pdv !== null && item.produto_id_pdv !== '') {
      porId.set(item.produto_id_pdv, item.id)
    }
    if (item.produto_nome_norm !== null && item.produto_nome_norm !== '') {
      porNome.set(item.produto_nome_norm, item.id)
    }
  }

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
      `select=id&hash=eq.${sha}&limit=1`,
    )
    if (conhecido.length > 0) {
      jaConhecidos++
      continue
    }

    const iniciadoEm = new Date().toISOString()
    const texto = new TextDecoder('utf-8').decode(bytes)
    const resultado = interpretaR3(texto)

    /**
     * Linha sem `unidades` derruba a importacao inteira, de proposito.
     *
     * `venda_produto_dia.unidades` e NOT NULL, e a alternativa seria gravar zero. Zero unidades
     * com faturamento diferente de zero e uma afirmacao falsa sobre o dia, e ela sobreviveria
     * para sempre no historico com aparencia de dado. `unidades` nula significa que o parser nao
     * achou a coluna de quantidade, o que e mudanca de layout do R3 e nao um caso de borda: o
     * arquivo bruto fica gravado e se reprocessa depois de consertar o parser (ADR-12).
     */
    const semUnidades = resultado.linhas.filter((l) => l.unidades === null).length
    const erros = [...resultado.erros]
    if (semUnidades > 0) {
      erros.push(
        `${semUnidades} linha(s) sem quantidade: o parser nao achou a coluna de unidades. ` +
          'Arquivo bruto gravado, nenhuma venda importada. Reprocessar depois de corrigir o parser.',
      )
    }
    const podeGravarVendas = erros.length === 0 && resultado.linhas.length > 0

    // Os dias operacionais que este arquivo cobre. E `date[]`, e nao uma contagem: com a lista,
    // a cobranca de "faltou o R3 de terca" e uma consulta, e nao uma leitura de arquivo.
    const dias = [...new Set(resultado.linhas.map((l) => l.dia_operacional))].sort()

    // O bruto entra na propria linha de execucao, ANTES de o resultado ser gravado, e entra como
    // BYTES exatos e nao como texto decodificado: a coluna e `bytea`, e o PostgREST le `\x` mais
    // hexadecimal. Mandar a string decodificada por UTF-8 perderia o byte original de um arquivo
    // que veio em outra codificacao, que e justamente o caso em que se quer reprocessar do bruto.
    const execucao = await insere<{ id: string }>(env, 'execucao_importacao', [
      {
        origem: 'watcher_drive',
        arquivo: arquivo.name,
        hash: sha,
        arquivo_bruto: paraBytea(bytes),
        linhas: resultado.linhas.length,
        ...(dias.length > 0 ? { dias_lidos: dias } : {}),
        iniciado_em: iniciadoEm,
        terminado_em: new Date().toISOString(),
        status: erros.length === 0 ? 'sucesso' : 'erro',
        ...(erros.length > 0 ? { erro: erros.join('; ').slice(0, 1000) } : {}),
      },
    ])

    const execucaoId = execucao[0]?.id
    if (execucaoId === undefined) {
      // Sem o id da execucao nao ha como gravar venda: a chave estrangeira e NOT NULL. Melhor
      // parar aqui e deixar o arquivo para a proxima passada do que gravar venda orfa.
      throw new Error('execucao_importacao nao devolveu id: venda nao pode ser gravada sem ele')
    }

    if (podeGravarVendas) {
      const linhas = resultado.linhas.map((l) => {
        // Junta por `produto_id_pdv` (o id_altec) e cai para o nome normalizado como reserva.
        // Item que nao casa fica com `item_cardapio_id` nulo: a venda ENTRA no faturamento do
        // dia de qualquer jeito, e a lista do que nao casou vira linha no e-mail das 16h, que e
        // como o cadastro de cardapio se cobra sozinho (F42). Descartar a linha aqui faria o
        // faturamento do dia ficar menor sem ninguem saber.
        const id =
          (l.produto_id_pdv !== null ? porId.get(l.produto_id_pdv) : undefined) ??
          porNome.get(l.produto_nome_norm)
        if (id === undefined) semItem++
        return {
          dia_operacional: l.dia_operacional,
          produto_id_pdv: l.produto_id_pdv,
          produto_nome_norm: l.produto_nome_norm,
          unidades: l.unidades,
          valor_liquido: l.valor_liquido,
          ...(id !== undefined ? { item_cardapio_id: id } : {}),
          execucao_importacao_id: execucaoId,
        }
      })

      // `on_conflict` pelo par UNIQUE (dia_operacional, produto_nome_norm), e nao pela chave
      // primaria: sem ele o PostgREST resolve o conflito pelo `id`, que e sempre novo, e
      // reimportar o mesmo dia levantaria 409 em vez de substituir. F39 exige que reimportar
      // cinco vezes nao mude o faturamento do dia.
      await insere(env, 'venda_produto_dia', linhas, 'experiencia', {
        on_conflict: 'dia_operacional,produto_nome_norm',
      })
      linhasGravadas += linhas.length
      importados++
    }
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
    pasta_configurada: 1,
  }
}
