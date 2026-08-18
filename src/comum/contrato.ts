/**
 * O contrato de gravacao: o `jsonb` que `experiencia.fn_grava_resposta` recebe.
 *
 * E o unico caminho de escrita do PWA (folha canonica, secao 6.4). O tablet nao tem
 * `INSERT` direto em tabela nenhuma e nao le a base de clientes. Uma chamada, uma resposta
 * completa, uma transacao.
 *
 * Por que um payload so em vez de varios inserts: um aparelho com permissao de `INSERT` em
 * varias tabelas precisa de uma credencial ampla, e essa credencial vaza pelo bundle
 * publicado, que e legivel por qualquer pessoa. Com uma funcao de escopo minimo, o que vaza
 * nao serve para ler nem para enumerar.
 *
 * Os nomes de campo espelham as colunas da folha canonica, secao 3.1, de proposito: quando
 * o nome do payload e o nome da coluna sao iguais, ninguem precisa manter um mapa na cabeca.
 */

import type {
  CanalResposta,
  Dimensao,
  FinalidadeConsentimento,
  GrupoRespostaItem,
  Idioma,
} from './dominio.js'

/** Uma opcao marcada em qualquer tela de toque. Vira uma linha de `resposta_opcao`. */
export interface OpcaoMarcada {
  /** A tela que produziu a marcacao: `T2A`, `T2B`, `T2C`, `T3C`, `T3C3`. */
  tela: string
  dimensao: Dimensao
  /** Ausente quando a opcao e de dimensao e nao de fator (caso da T2A e T2B). */
  fator?: string
  /** O codigo da opcao como aparece no questionario. Nome igual ao da coluna no banco. */
  opcao_codigo: string
}

/** O item apontado por detrator com causa comida. Vira uma linha de `resposta_item`. */
export interface ItemApontado {
  grupo: GrupoRespostaItem
  /** `item_cardapio.id`. Ausente quando a pessoa escolheu `prefiro nao dizer`. */
  item_cardapio_id?: string
  /** Um dos seis fatores de `comida`. Ausente se a pessoa pulou a T3C3. */
  fator?: string
}

/**
 * Uma pergunta do banco que foi sorteada. Vira uma linha de `resposta_pergunta_sorteada`.
 *
 * Guarda o `id` da pergunta e nao o numero dela: numero e rotulo de leitura, e se uma pergunta
 * for reescrita o numero pode migrar. O `id` vem do catalogo, junto das perguntas ativas.
 *
 * `opcao_indice` e nao o rotulo da opcao: rotulo muda com reescrita e com idioma, indice nao.
 * Guardar o rotulo faria a contagem de um mes deixar de ser comparavel com a de outro.
 */
export interface PerguntaSorteada {
  pergunta_banco_id: string
  /** Falso quando a pessoa pulou. Sorteada e nao respondida tambem e dado. */
  respondida: boolean
  /** Indice da opcao escolhida, base zero. Ausente quando pulou. */
  opcao_indice?: number
}

/**
 * Carimbo de entrada e de saida de cada tela exibida. Vira uma linha de `tela_evento`.
 *
 * Duracao e sempre a diferenca entre dois carimbos do MESMO dispositivo, nunca contra a
 * hora do servidor: o relogio do tablet pode estar errado, mas esta igualmente errado nas
 * duas pontas, e por isso a diferenca continua valida.
 */
export interface TelaEvento {
  tela: string
  entrou_em: string
  saiu_em: string
  /** Verdadeiro quando a pessoa avancou sem responder. Taxa de pulo por tela e o melhor sinal de tela mal escrita. */
  pulou: boolean
}

/** Contato deixado na T6. Tudo opcional, sempre. */
export interface ContatoOferecido {
  nome?: string
  whatsapp?: string
  email?: string
}

/** Um aceite, com a versao do texto que estava na tela no momento do toque. */
export interface ConsentimentoDado {
  finalidade: FinalidadeConsentimento
  versao_texto: string
  /** Instante do aceite, pelo relogio do aparelho. E o que se prova numa fiscalizacao. */
  aceito_em: string
}

/**
 * A resposta completa, como o tablet a envia.
 *
 * Uma resposta e valida com `nota` e nada mais. Todo o resto e opcional, e o sistema tem de
 * gravar e contar essa resposta como completa.
 */
export interface RespostaEnviada {
  /** UUID v4 gerado no cliente. E ele que da idempotencia: reenvio do mesmo id nao cria segunda linha. */
  id: string
  /** Instante do toque pelo relogio do tablet. O servidor decide se confia nele. */
  criado_em_cliente: string
  /** NPS de 0 a 10. O unico campo obrigatorio. */
  nota: number
  canal: CanalResposta
  idioma: Idioma
  versao_app: string
  versao_questionario: string

  /** Cru, preservado sempre, mesmo quando nao casa com nenhuma mesa cadastrada. */
  mesa_digitada?: string
  /** Cru, preservado sempre. O PIN e dado da resposta, nunca autenticacao. */
  garcom_pin_digitado?: string
  /** `dispositivo.id`. Nulo quando a resposta vem de QR no celular do cliente. */
  dispositivo_id?: string

  /**
   * `respondeu` por omissao. Com `recusou`, a funcao grava SO a tentativa e devolve o id
   * dela: a recusa registrada na T0 e o denominador da conversao por garcom, e nao tem para
   * onde ir se nao for por aqui.
   */
  desfecho?: 'respondeu' | 'recusou'

  opcoes: readonly OpcaoMarcada[]
  /** Plural: o grupo `mais_de_um` pode render mais de uma linha. */
  itens: readonly ItemApontado[]
  /** Texto cru, como a pessoa escreveu. Nunca reescrito, nunca corrigido. */
  texto?: { texto_cru: string }
  sorteadas: readonly PerguntaSorteada[]
  telas: readonly TelaEvento[]
  contato?: ContatoOferecido
  consentimentos: readonly ConsentimentoDado[]
}

/**
 * A RECUSA registrada na T0. Vira uma linha de `tentativa`.
 *
 * `desfecho` aceita SO `recusou`, e nao os dois valores. A tentativa de quem respondeu e gravada
 * por `fn_grava_resposta`, com o MESMO id da resposta: enviar as duas duplicaria o denominador da
 * conversao por garcom, inflando a taxa sem ninguem notar. O tipo estreito e o que impede a tela de
 * chamar esta rota pelo caminho errado — antes ele aceitava `respondeu` e a rota recusava em tempo
 * de execucao, o que e tarde demais.
 *
 * NAO tem `resposta_id`. A coluna nao existe em `tentativa`, deliberadamente: o par tentativa e
 * resposta e conferivel por IGUALDADE de id, e nao por juncao aproximada. O campo estava no
 * contrato apontando para uma coluna que o schema nunca teve.
 */
export interface TentativaEnviada {
  id: string
  criado_em_cliente: string
  desfecho: 'recusou'
  canal: CanalResposta
  mesa_digitada?: string
  garcom_pin_digitado?: string
  dispositivo_id?: string
}

/** O sinal periodico do aparelho. Vira atualizacao das colunas de sinal de `dispositivo`. */
export interface SinalDispositivo {
  dispositivo_id: string
  versao_app: string
  /** Quantas respostas estao na fila local aguardando envio. */
  fila_pendente: number
}

export interface RespostaDaApi {
  ok: boolean
  /** O `id` gravado, que e o mesmo que foi enviado. */
  id?: string
  /** Verdadeiro quando o servidor reconheceu um reenvio e nao criou linha nova. */
  duplicada?: boolean
  erro?: string
}

/**
 * Validacao do payload antes de sair do tablet.
 *
 * Existe para o aparelho nao gastar bateria e fila enviando o que o servidor vai recusar, e
 * para o erro aparecer perto de onde nasceu. O servidor valida de novo, sempre: validacao no
 * cliente e conveniencia, nunca seguranca.
 */
export function validaResposta(r: RespostaEnviada): readonly string[] {
  const erros: string[] = []

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(r.id)) {
    erros.push('id nao e um UUID v4')
  }
  if (!Number.isInteger(r.nota) || r.nota < 0 || r.nota > 10) {
    erros.push(`nota fora de 0 a 10: ${String(r.nota)}`)
  }
  if (Number.isNaN(Date.parse(r.criado_em_cliente))) {
    erros.push('criado_em_cliente nao e uma data valida')
  }
  if (r.canal !== 'tablet' && r.canal !== 'qr') {
    erros.push(`canal invalido: ${String(r.canal)}`)
  }
  if (r.idioma !== 'pt' && r.idioma !== 'en') {
    erros.push(`idioma invalido: ${String(r.idioma)}`)
  }
  if (r.canal === 'tablet' && r.dispositivo_id === undefined) {
    erros.push('resposta de tablet sem dispositivo_id')
  }
  // O PIN vem da T0, que so existe no tablet. Resposta por QR no celular do cliente nao tem
  // T0 e portanto nao tem PIN, e exigir um rejeitaria o canal `qr` inteiro.
  if (r.canal === 'tablet' && (r.garcom_pin_digitado ?? '') === '') {
    erros.push('resposta de tablet sem garcom_pin_digitado: a T0 nao deixa passar campo vazio')
  }
  // Contato exige consentimento com finalidade `contato`. Sem isso, a LGPD nao fecha, e
  // gravar contato sem aceite e o tipo de coisa que ninguem descobre ate a fiscalizacao.
  const temContato =
    r.contato !== undefined &&
    ((r.contato.whatsapp ?? '') !== '' || (r.contato.email ?? '') !== '')
  const aceitouContato = r.consentimentos.some((c) => c.finalidade === 'contato')
  if (temContato && !aceitouContato) {
    erros.push('contato oferecido sem consentimento de finalidade contato')
  }

  return erros
}
