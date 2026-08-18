/**
 * `cron_classificador`: classifica os comentarios do dia operacional anterior, frase por frase.
 *
 * Frase por frase, e nao comentario por comentario, porque "pizza excelente mas demorou 40
 * minutos" tem de gerar um positivo em produto E um negativo em tempo. Classificar o
 * comentario inteiro numa polaridade so joga fora metade da informacao.
 *
 * Groq, e nao Gemini, por contrato de privacidade e nao por limite: o tier gratuito do Gemini
 * usa o conteudo para treinar, com revisao humana, e o proprio termo pede para nao enviar
 * dado pessoal. Comentario de cliente e dado pessoal.
 *
 * REGRA DE OURO: nenhum identificador direto vai ao LLM. Vai o texto e a nota, e a identidade
 * e reconstituida no banco pelo `resposta_id`, que nunca sai daqui.
 */

import { diaOperacionalAnterior } from '../../src/comum/dia-operacional.js'
import { DIMENSOES, FATORES, fatorValido } from '../../src/comum/dominio.js'
import type { Ambiente } from '../lib/supabase.js'
import { insere, seleciona, type ContagensRotina } from '../lib/supabase.js'

const MODELO = 'llama-3.1-8b-instant'
const VERSAO_PROMPT = '1.0.0'

/**
 * Os dois dominios fechados de `classificacao_texto`, iguais aos CHECK da migration.
 *
 * Escritos aqui e nao importados de `dominio.ts` porque `dominio.ts` guarda o dominio da
 * COLETA (dimensao, fator, canal, idioma) e estes dois existem so na classificacao. Se um dia
 * mudarem, mudam nos dois lugares, e o teste de contrato acusa a divergencia.
 */
const POLARIDADES: readonly FraseClassificada['polaridade'][] = ['positivo', 'negativo', 'neutro']
const SEVERIDADES: readonly FraseClassificada['severidade'][] = ['baixa', 'media', 'alta']

interface Pendente {
  resposta_id: string
  texto_cru: string
  nota: number
}

interface FraseClassificada {
  frase: string
  dimensao: string
  fator: string | null
  polaridade: 'positivo' | 'negativo' | 'neutro'
  severidade: 'baixa' | 'media' | 'alta'
  nomeia_pessoa: boolean
}

function montaPrompt(texto: string, nota: number): string {
  const dominios = DIMENSOES.map(
    (d) => `${d}: ${(FATORES[d] as readonly string[]).join(', ') || 'sem fator'}`,
  ).join('\n')

  return `Voce classifica comentario de cliente de pizzaria, frase por frase.

DIMENSOES E FATORES PERMITIDOS. Use SOMENTE estes valores, exatamente como escritos:
${dominios}

REGRAS:
- Uma entrada por frase ou ideia distinta. "Pizza otima mas demorou" tem DUAS entradas.
- dimensao e obrigatoria e tem de estar na lista. fator pode ser null se nenhum servir.
- polaridade: positivo, negativo ou neutro.
- severidade: baixa, media ou alta. Alta so para risco sanitario, cobranca errada ou ofensa.
- nomeia_pessoa: true se a frase cita nome de funcionario.
- Nao invente valor fora da lista. Se nada servir, use a dimensao mais proxima com fator null.

Devolva SO um array JSON, sem texto em volta.

Nota dada pelo cliente: ${nota}
Comentario: ${JSON.stringify(texto)}`
}

async function classifica(
  env: Ambiente,
  texto: string,
  nota: number,
): Promise<FraseClassificada[]> {
  if (env.GROQ_API_KEY === undefined || env.GROQ_API_KEY === '') {
    throw new Error('GROQ_API_KEY ausente')
  }
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.GROQ_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELO,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Responda apenas com JSON valido.' },
        { role: 'user', content: `${montaPrompt(texto, nota)}\n\nFormato: {"frases": [...]}` },
      ],
    }),
  })
  if (!resp.ok) {
    throw new Error(`Groq devolveu ${resp.status}: ${(await resp.text()).slice(0, 200)}`)
  }
  const dados = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const conteudo = dados.choices?.[0]?.message?.content ?? '{"frases":[]}'
  const parsed = JSON.parse(conteudo) as { frases?: FraseClassificada[] }
  const frases = parsed.frases ?? []

  // Valor fora da lista fechada e REJEITADO, nao corrigido. O classificador nao cria valor
  // novo: valor novo entra por decisao humana e por migration.
  //
  // `polaridade` e `severidade` sao conferidas aqui pelo mesmo motivo que `dimensao` e `fator`,
  // e nao por simetria: as duas tem CHECK de dominio no banco, e um modelo que devolva
  // `negativa` em vez de `negativo` faria a insercao do LOTE inteiro ser rejeitada. Com o
  // filtro, a frase torta e descartada e as outras do mesmo comentario entram.
  return frases.filter(
    (f) =>
      (DIMENSOES as readonly string[]).includes(f.dimensao) &&
      (f.fator === null || fatorValido(f.dimensao, f.fator)) &&
      POLARIDADES.includes(f.polaridade) &&
      SEVERIDADES.includes(f.severidade),
  )
}

export async function rodaClassificador(env: Ambiente): Promise<ContagensRotina> {
  const dia = diaOperacionalAnterior()
  const pendentes = await seleciona<Pendente>(
    env,
    'vw_texto_a_classificar',
    `dia_operacional=eq.${dia}&limit=40`,
  )

  let classificadas = 0
  let rejeitadas = 0
  let falhas = 0

  for (const p of pendentes) {
    try {
      const frases = await classifica(env, p.texto_cru, p.nota)
      if (frases.length === 0) {
        rejeitadas++
        continue
      }
      await insere(
        env,
        'classificacao_texto',
        frases.map((f) => ({
          resposta_id: p.resposta_id,
          frase: f.frase,
          dimensao: f.dimensao,
          fator: f.fator,
          polaridade: f.polaridade,
          severidade: f.severidade,
          nomeia_pessoa: f.nomeia_pessoa,
          modelo: MODELO,
          versao_prompt: VERSAO_PROMPT,
          classificado_em: new Date().toISOString(),
        })),
      )
      classificadas += frases.length
    } catch {
      // O texto cru fica guardado sempre. Falha de classificacao e recuperavel amanha, e o
      // produto continua entregando valor sem IA: o painel conta nota e fator sem depender
      // de classificador nenhum.
      falhas++
    }
  }

  // `respostas_no_periodo` tem coluna propria em `execucao_rotina`; o resto vai para
  // `contagens`, que e jsonb.
  return {
    respostas_no_periodo: pendentes.length,
    classificadas,
    rejeitadas,
    falhas,
  }
}
