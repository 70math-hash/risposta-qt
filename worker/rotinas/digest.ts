/**
 * `cron_digest_16h`: o e-mail das 16h, e o batimento cardiaco do sistema.
 *
 * Esta rotina faz tres coisas ao mesmo tempo, e e por isso que ela e a peca central da
 * arquitetura de manutencao zero:
 *   1. Entrega o resumo do dia operacional fechado, segmentado por area.
 *   2. Mantem o banco acordado, porque projeto gratuito do Supabase e pausado depois de 1
 *      semana de inatividade (N21) e a casa fecha segunda.
 *   3. E o unico alarme do sistema: **se o e-mail nao chegar dois dias seguidos, algo
 *      quebrou** (N42). Nao existe monitoramento alem disso, de proposito.
 *
 * Por isso a consulta ao banco e o envio do e-mail sao passos SEPARADOS: falha do provedor de
 * e-mail nao pode desligar o keep-alive do banco. A consulta roda primeiro, sempre.
 *
 * O e-mail de hoje cobre o dia operacional de ONTEM, fechado. Nunca um dia parcial.
 */

import {
  diaOperacionalAnterior,
  casaAbrePadrao,
  rotuloDiaOperacional,
  somaDias,
} from '../../src/comum/dia-operacional.js'
import { calculaNps, textoNps, textoProporcao } from '../../src/comum/nps.js'
import type { Ambiente } from '../lib/supabase.js'
import { seleciona } from '../lib/supabase.js'
import { montaHtml, type BlocoDigest } from './digest-html.js'
import { enviaEmail } from './email.js'

interface LinhaHoje {
  dia_operacional: string
  respostas: number
  detratores: number
  neutros: number
  promotores: number
  suspeitas: number
  pin_nao_reconhecido: number
}

interface LinhaFator {
  dimensao: string
  fator: string | null
  mencoes: number
}

interface LinhaDispositivo {
  apelido: string
  uso: string
  ultimo_sinal_em: string | null
  fila_pendente: number | null
}

interface LinhaComentario {
  texto_cru: string
  nota: number
  dimensao: string | null
}

interface LinhaDestinatario {
  email: string
  papel: 'proprietario' | 'gerencia' | 'cozinha' | 'salao'
}

interface LinhaMesasAtendidas {
  dia_operacional: string
  mesas: number
}

interface LinhaVenda {
  dia_operacional: string
  faturamento: number | null
  unidades: number | null
}

/** Dimensoes que a cozinha precisa ver. O resto e ruido para quem esta na praca. */
const DIMENSOES_COZINHA = ['comida', 'bebida', 'tempo', 'item_consumido']
/** Dimensoes que o salao precisa ver. */
const DIMENSOES_SALAO = ['atendimento', 'precisao_pedido', 'ambiente', 'limpeza']

export async function rodaDigest(env: Ambiente): Promise<Record<string, number>> {
  const dia = diaOperacionalAnterior()

  // --- Passo 1: consulta. Roda sempre, e e ela que mantem o banco acordado. ---
  const [hoje, fatores, dispositivos, comentarios, destinatarios, mesas, vendas] =
    await Promise.all([
      seleciona<LinhaHoje>(env, 'vw_hoje', `dia_operacional=eq.${dia}`),
      seleciona<LinhaFator>(
        env,
        'vw_fator_contagem',
        `dia_operacional=eq.${dia}&order=mencoes.desc`,
      ),
      seleciona<LinhaDispositivo>(env, 'vw_dispositivo_sinal', 'select=*'),
      seleciona<LinhaComentario>(
        env,
        'vw_exportacao_comentario',
        `dia_operacional=eq.${dia}&order=nota.asc&limit=8`,
      ),
      seleciona<LinhaDestinatario>(env, 'destinatario', 'select=email,papel&ativo=is.true'),
      seleciona<LinhaMesasAtendidas>(
        env,
        'mesa_atendida_dia',
        `dia_operacional=gte.${somaDias(dia, -3)}&order=dia_operacional.desc`,
      ),
      seleciona<LinhaVenda>(env, 'vw_venda_dia', `dia_operacional=eq.${dia}`),
    ])

  const d = hoje[0]
  const abriu = casaAbrePadrao(dia)
  const contagem = {
    detratores: d?.detratores ?? 0,
    neutros: d?.neutros ?? 0,
    promotores: d?.promotores ?? 0,
  }
  const nps = calculaNps(contagem)
  const mesasDoDia = mesas.find((m) => m.dia_operacional === dia)?.mesas ?? null

  // --- Passo 2: montagem dos oito blocos (N41). ---
  const blocos: BlocoDigest[] = []

  // Bloco 1: o dia, em contagem. Nunca media geral: em 20 mesas por dia a media esconde
  // exatamente quem vai reclamar em publico.
  if (!abriu) {
    blocos.push({
      titulo: 'O dia',
      linhas: [`${rotuloDiaOperacional(dia)}.`, 'Casa fechada. Nada a relatar.'],
      areas: ['proprietario', 'gerencia', 'cozinha', 'salao'],
    })
  } else {
    blocos.push({
      titulo: 'O dia',
      linhas: [
        rotuloDiaOperacional(dia),
        `${contagem.promotores} promotores · ${contagem.neutros} neutros · ${contagem.detratores} detratores`,
        textoNps(nps),
        mesasDoDia === null
          ? 'Mesas atendidas: não informado'
          : `Conversão: ${textoProporcao(nps.n, mesasDoDia, 'mesas atendidas')}`,
      ],
      areas: ['proprietario', 'gerencia', 'cozinha', 'salao'],
    })
  }

  // Bloco 2: detratores, com a acao. E o unico bloco que pede resposta de alguem.
  if (contagem.detratores > 0) {
    blocos.push({
      titulo: 'Precisa de atenção',
      linhas: [
        `${contagem.detratores} ${contagem.detratores === 1 ? 'cliente' : 'clientes'} com nota de 0 a 6.`,
        'Cada um gerou alerta no momento da resposta. Confira se houve contato.',
      ],
      areas: ['proprietario', 'gerencia'],
    })
  }

  // Bloco 3 e 4: fatores por area. A cozinha recebe o que e dela, o salao o que e dele.
  const fatoresDe = (dimensoes: readonly string[]) =>
    fatores.filter((f) => dimensoes.includes(f.dimensao))

  const linhaFator = (f: LinhaFator) =>
    `${f.dimensao}${f.fator === null ? '' : ` · ${f.fator}`}: ${f.mencoes}`

  const daCozinha = fatoresDe(DIMENSOES_COZINHA)
  if (daCozinha.length > 0) {
    blocos.push({
      titulo: 'Cozinha e bar',
      linhas: daCozinha.slice(0, 8).map(linhaFator),
      areas: ['proprietario', 'gerencia', 'cozinha'],
    })
  }

  const doSalao = fatoresDe(DIMENSOES_SALAO)
  if (doSalao.length > 0) {
    blocos.push({
      titulo: 'Salão',
      linhas: doSalao.slice(0, 8).map(linhaFator),
      areas: ['proprietario', 'gerencia', 'salao'],
    })
  }

  // Bloco 5: comentarios crus, filtrados por area. Texto cru, nunca reescrito.
  if (comentarios.length > 0) {
    const paraArea = (dimensoes: readonly string[]) =>
      comentarios
        .filter((c) => c.dimensao === null || dimensoes.includes(c.dimensao))
        .slice(0, 5)
        .map((c) => `nota ${c.nota}: "${c.texto_cru.slice(0, 240)}"`)

    blocos.push({
      titulo: 'O que escreveram',
      linhas: comentarios.slice(0, 5).map((c) => `nota ${c.nota}: "${c.texto_cru.slice(0, 240)}"`),
      areas: ['proprietario', 'gerencia'],
      linhasPorArea: {
        cozinha: paraArea(DIMENSOES_COZINHA),
        salao: paraArea(DIMENSOES_SALAO),
      },
    })
  }

  // Bloco 6: venda do dia, quando existe importacao.
  const venda = vendas[0]
  if (venda !== undefined && venda.faturamento !== null) {
    blocos.push({
      titulo: 'Venda',
      linhas: [
        `Faturamento: R$ ${venda.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        venda.unidades === null ? '' : `Itens vendidos: ${venda.unidades}`,
      ].filter((l) => l !== ''),
      areas: ['proprietario', 'gerencia'],
    })
  }

  // Bloco 7: saude dos aparelhos. Com quatro tablets, aparelho mudo e invisivel no
  // agregado, e por isso cada um aparece pelo apelido com a hora do ultimo sinal (D5).
  const agora = Date.now()
  const linhasDispositivo = dispositivos.map((disp) => {
    if (disp.ultimo_sinal_em === null) return `${disp.apelido}: nunca deu sinal`
    const horas = Math.floor((agora - Date.parse(disp.ultimo_sinal_em)) / 3_600_000)
    const fila = disp.fila_pendente ?? 0
    const alerta = horas > 24 ? '  ATENÇÃO' : ''
    return `${disp.apelido} (${disp.uso}): último sinal há ${horas}h · fila ${fila}${alerta}`
  })
  if (linhasDispositivo.length > 0) {
    blocos.push({
      titulo: 'Aparelhos',
      linhas: linhasDispositivo,
      areas: ['proprietario', 'gerencia'],
    })
  }

  // Bloco 8: cobrancas (N43). Sao as unicas coisas que o sistema pede a um humano.
  const cobrancas: string[] = []
  const semMesas = [dia, somaDias(dia, -1), somaDias(dia, -2)].filter(
    (x) => casaAbrePadrao(x) && !mesas.some((m) => m.dia_operacional === x),
  )
  if (semMesas.length >= 3) {
    cobrancas.push('Mesas atendidas não informadas há 3 dias. Sem isso não existe conversão.')
  }
  if ((d?.suspeitas ?? 0) > 0) {
    cobrancas.push(`${d?.suspeitas ?? 0} resposta(s) marcada(s) como suspeita.`)
  }
  if ((d?.pin_nao_reconhecido ?? 0) > 3) {
    cobrancas.push(
      `${d?.pin_nao_reconhecido ?? 0} respostas com PIN não reconhecido. Confira o cadastro de garçons.`,
    )
  }
  if (cobrancas.length > 0) {
    blocos.push({ titulo: 'Pendências', linhas: cobrancas, areas: ['proprietario', 'gerencia'] })
  }

  // --- Passo 3: envio. Falha aqui NAO desfaz o keep-alive do passo 1. ---
  let enviados = 0
  let falhas = 0

  const porPapel = new Map<string, string[]>()
  for (const dest of destinatarios) {
    const lista = porPapel.get(dest.papel) ?? []
    lista.push(dest.email)
    porPapel.set(dest.papel, lista)
  }

  for (const [papel, emails] of porPapel) {
    const visiveis = blocos.filter((b) => b.areas.includes(papel))
    if (visiveis.length === 0) continue
    const assunto = abriu
      ? `QT · ${rotuloDiaOperacional(dia)} · ${nps.n} ${nps.n === 1 ? 'resposta' : 'respostas'}`
      : `QT · ${rotuloDiaOperacional(dia)}`
    try {
      await enviaEmail(env, {
        para: emails,
        assunto,
        html: montaHtml({ titulo: assunto, blocos: visiveis, papel, dia }),
      })
      enviados += emails.length
    } catch {
      falhas += emails.length
    }
  }

  return {
    respostas: nps.n,
    detratores: contagem.detratores,
    blocos: blocos.length,
    destinatarios_enviados: enviados,
    destinatarios_com_falha: falhas,
  }
}
