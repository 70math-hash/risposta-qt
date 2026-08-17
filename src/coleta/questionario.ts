/**
 * O questionario, tela por tela, nos dois idiomas.
 *
 * Transcrito de `docs/pesquisa/06-questionario.md`, secao 14, com os textos exatos.
 * Os dominios de valor sao os da folha canonica, secao 3.3, que tem precedencia.
 *
 * Regras estruturais que o codigo tem de honrar, e nao apenas descrever:
 *   - `T1` e a UNICA tela obrigatoria. Uma resposta e valida com a nota e nada mais.
 *   - Ninguem recebe a ramificacao de nota baixa E o bloco rotacionado. E o que mantem os
 *     quatro caminhos dentro do teto de 45 s (N16).
 *   - Promotor recebe 2 rotacionadas, neutro recebe 1, detrator recebe 0.
 *   - `T7` so agradece. Sem Google, sem cupom, sem Instagram, em nenhuma condicao (D3, D6).
 *
 * DIVERGENCIA REGISTRADA: a especificacao da Etapa 2 oferece, na `T2C`, a opcao
 * "A reserva ou a espera pela mesa", com tres fatores proprios de reserva. As nove
 * dimensoes da folha canonica (secao 3.3) nao incluem `reserva`, e a folha vence por
 * precedencia. Como reservas esta fora do MVP (bloqueio `P4`, ninguem sabe onde o app de
 * reservas vive), a opcao entra reduzida a `tempo` / `espera_mesa`, que existe no dominio.
 * Perdem-se dois fatores: "a reserva nao foi honrada" e "a mesa nao era a que eu pedi".
 * Se o proprietario quiser os dois, a dimensao entra por edicao da folha canonica primeiro.
 */

import type { Dimensao, Idioma } from '../comum/dominio.js'

export const VERSAO_QUESTIONARIO = '1.0.0'

/** Texto nos dois idiomas. Nunca uma string sozinha: idioma faltando e bug silencioso. */
export interface Texto {
  pt: string
  en: string
}

export function t(texto: Texto, idioma: Idioma): string {
  return texto[idioma]
}

/** Uma opcao de toque. `fator` fica ausente quando a opcao e de dimensao, nao de fator. */
export interface Opcao {
  codigo: string
  rotulo: Texto
  dimensao: Dimensao
  fator?: string
  /** Para a `T2C`: qual tela abre depois. Ausente vai direto para a aberta. */
  abre?: 'grupo_item' | 'fator'
}

// ---------------------------------------------------------------------------
// T1, a unica obrigatoria
// ---------------------------------------------------------------------------

export const T1 = {
  pergunta: {
    pt: 'De 0 a 10, o quanto você recomendaria o QT para um amigo ou familiar?',
    en: 'From 0 to 10, how likely are you to recommend QT to a friend or family member?',
  },
  ancoraEsquerda: { pt: '0 · não recomendaria', en: '0 · not at all likely' },
  ancoraDireita: { pt: '10 · recomendaria com certeza', en: '10 · extremely likely' },
  /**
   * O rodape nao e enfeite: o anonimato percebido e o motor do volume. O proprio
   * fornecedor anterior publica que o tablet responde por cerca de 90% das avaliacoes
   * porque permite resposta anonima.
   */
  rodape: {
    pt: 'Sua resposta é anônima. O garçom não vê o que você responde.',
    en: 'Your answer is anonymous. Your server does not see what you answer.',
  },
} as const

// ---------------------------------------------------------------------------
// T2A e T2B, as oito opcoes compartilhadas
// ---------------------------------------------------------------------------

const OITO_OPCOES: readonly Opcao[] = [
  { codigo: 'pizza', rotulo: { pt: 'A pizza', en: 'The pizza' }, dimensao: 'comida' },
  {
    codigo: 'atendimento',
    rotulo: { pt: 'O atendimento', en: 'The service' },
    dimensao: 'atendimento',
  },
  {
    codigo: 'tempo',
    rotulo: { pt: 'O tempo de espera', en: 'The wait time' },
    dimensao: 'tempo',
  },
  { codigo: 'bebidas', rotulo: { pt: 'As bebidas', en: 'The drinks' }, dimensao: 'bebida' },
  {
    codigo: 'ambiente',
    rotulo: { pt: 'O ambiente', en: 'The atmosphere' },
    dimensao: 'ambiente',
  },
  { codigo: 'entrada', rotulo: { pt: 'A entrada', en: 'The starter' }, dimensao: 'comida' },
  {
    codigo: 'sobremesa',
    rotulo: { pt: 'A sobremesa', en: 'The dessert' },
    dimensao: 'comida',
  },
  {
    codigo: 'preco',
    rotulo: { pt: 'Valeu o preço', en: 'Worth the price' },
    dimensao: 'preco_valor',
    fator: 'valor_percebido',
  },
]

export const T2A = {
  pergunta: { pt: 'Que bom. O que mais te agradou hoje?', en: 'Great to hear. What did you enjoy most tonight?' },
  ajuda: { pt: 'Toque em até 2. Ou pule.', en: 'Pick up to 2. Or skip.' },
  maximo: 2,
  opcoes: OITO_OPCOES,
} as const

export const T2B = {
  pergunta: { pt: 'O que faltou para ser 10?', en: 'What kept it from being a 10?' },
  ajuda: { pt: 'Toque em até 2. Ou pule.', en: 'Pick up to 2. Or skip.' },
  maximo: 2,
  opcoes: OITO_OPCOES,
} as const

// ---------------------------------------------------------------------------
// T2C, detrator
// ---------------------------------------------------------------------------

export const T2C = {
  pergunta: { pt: 'Desculpe. Onde a gente errou?', en: "We're sorry. Where did we get it wrong?" },
  ajuda: { pt: 'Toque em 1. Ou pule.', en: 'Pick 1. Or skip.' },
  maximo: 1,
  opcoes: [
    { codigo: 'comida', rotulo: { pt: 'A comida', en: 'The food' }, dimensao: 'comida', abre: 'grupo_item' },
    { codigo: 'tempo', rotulo: { pt: 'O tempo de espera', en: 'The wait' }, dimensao: 'tempo', abre: 'fator' },
    { codigo: 'atendimento', rotulo: { pt: 'O atendimento', en: 'The service' }, dimensao: 'atendimento', abre: 'fator' },
    { codigo: 'bebidas', rotulo: { pt: 'As bebidas', en: 'The drinks' }, dimensao: 'bebida', abre: 'fator' },
    { codigo: 'ambiente', rotulo: { pt: 'O ambiente', en: 'The atmosphere' }, dimensao: 'ambiente', abre: 'fator' },
    { codigo: 'limpeza', rotulo: { pt: 'A limpeza', en: 'Cleanliness' }, dimensao: 'limpeza', abre: 'fator' },
    { codigo: 'preco', rotulo: { pt: 'O preço', en: 'The price' }, dimensao: 'preco_valor', abre: 'fator' },
    // Divergencia registrada no topo do arquivo: reduzida a tempo/espera_mesa.
    {
      codigo: 'espera_mesa',
      rotulo: { pt: 'Esperei muito para sentar', en: 'Waited too long for a table' },
      dimensao: 'tempo',
      fator: 'espera_mesa',
    },
    { codigo: 'outra', rotulo: { pt: 'Outra coisa', en: 'Something else' }, dimensao: 'comida' },
  ] satisfies readonly Opcao[],
} as const

// ---------------------------------------------------------------------------
// T3C, fator por dimensao. Os codigos sao os fatores canonicos da secao 3.3.
// ---------------------------------------------------------------------------

export const T3C_PERGUNTA: Texto = {
  pt: 'O que exatamente aconteceu?',
  en: 'What exactly happened?',
}

export const T3C_FATORES: Partial<Record<Dimensao, readonly Opcao[]>> = {
  tempo: [
    { codigo: 'espera_mesa', rotulo: { pt: 'Espera pela mesa', en: 'Wait for a table' }, dimensao: 'tempo', fator: 'espera_mesa' },
    { codigo: 'espera_bebida', rotulo: { pt: 'Espera pela bebida', en: 'Wait for drinks' }, dimensao: 'tempo', fator: 'espera_bebida' },
    { codigo: 'espera_pizza', rotulo: { pt: 'Espera pela pizza', en: 'Wait for the pizza' }, dimensao: 'tempo', fator: 'espera_pizza' },
    { codigo: 'espera_conta', rotulo: { pt: 'Espera pela conta', en: 'Wait for the bill' }, dimensao: 'tempo', fator: 'espera_conta' },
  ],
  atendimento: [
    { codigo: 'recepcao', rotulo: { pt: 'Recepção na chegada', en: 'Greeting' }, dimensao: 'atendimento', fator: 'recepcao' },
    { codigo: 'simpatia', rotulo: { pt: 'Simpatia', en: 'Friendliness' }, dimensao: 'atendimento', fator: 'simpatia' },
    { codigo: 'atencao_durante', rotulo: { pt: 'Atenção durante a refeição', en: 'Attention during the meal' }, dimensao: 'atendimento', fator: 'atencao_durante' },
    { codigo: 'conhecimento_cardapio', rotulo: { pt: 'Conhecimento do cardápio', en: 'Menu knowledge' }, dimensao: 'atendimento', fator: 'conhecimento_cardapio' },
    { codigo: 'despedida', rotulo: { pt: 'Despedida', en: 'Farewell' }, dimensao: 'atendimento', fator: 'despedida' },
  ],
  bebida: [
    { codigo: 'temperatura', rotulo: { pt: 'Temperatura', en: 'Temperature' }, dimensao: 'bebida', fator: 'temperatura' },
    { codigo: 'tempo_ate_chegar', rotulo: { pt: 'Demorou', en: 'Took too long' }, dimensao: 'bebida', fator: 'tempo_ate_chegar' },
    { codigo: 'qualidade', rotulo: { pt: 'Qualidade', en: 'Quality' }, dimensao: 'bebida', fator: 'qualidade' },
    { codigo: 'veio_errada', rotulo: { pt: 'Veio errada', en: 'Wrong drink' }, dimensao: 'bebida', fator: 'veio_errada' },
  ],
  ambiente: [
    { codigo: 'ruido', rotulo: { pt: 'Ruído', en: 'Noise' }, dimensao: 'ambiente', fator: 'ruido' },
    { codigo: 'temperatura_salao', rotulo: { pt: 'Temperatura do salão', en: 'Room temperature' }, dimensao: 'ambiente', fator: 'temperatura_salao' },
    { codigo: 'iluminacao', rotulo: { pt: 'Iluminação', en: 'Lighting' }, dimensao: 'ambiente', fator: 'iluminacao' },
    { codigo: 'conforto', rotulo: { pt: 'Conforto da mesa', en: 'Table comfort' }, dimensao: 'ambiente', fator: 'conforto' },
  ],
  limpeza: [
    { codigo: 'mesa', rotulo: { pt: 'A mesa', en: 'The table' }, dimensao: 'limpeza', fator: 'mesa' },
    { codigo: 'salao', rotulo: { pt: 'O salão', en: 'The dining room' }, dimensao: 'limpeza', fator: 'salao' },
    { codigo: 'banheiro', rotulo: { pt: 'O banheiro', en: 'The restroom' }, dimensao: 'limpeza', fator: 'banheiro' },
  ],
  preco_valor: [
    { codigo: 'valor_percebido', rotulo: { pt: 'Não valeu o que paguei', en: "Not worth what I paid" }, dimensao: 'preco_valor', fator: 'valor_percebido' },
    { codigo: 'preco_pizza', rotulo: { pt: 'Preço da pizza', en: 'Pizza price' }, dimensao: 'preco_valor', fator: 'preco_pizza' },
    { codigo: 'preco_bebida', rotulo: { pt: 'Preço das bebidas', en: 'Drink prices' }, dimensao: 'preco_valor', fator: 'preco_bebida' },
    { codigo: 'couvert_ou_taxa', rotulo: { pt: 'Couvert ou taxa', en: 'Cover or service charge' }, dimensao: 'preco_valor', fator: 'couvert_ou_taxa' },
  ],
}

// ---------------------------------------------------------------------------
// T3C1, T3C2, T3C3, o caminho de comida
// ---------------------------------------------------------------------------

export const T3C1 = {
  pergunta: { pt: 'O que não estava bom?', en: "What wasn't right?" },
  opcoes: [
    { codigo: 'pizza', rotulo: { pt: 'Pizza', en: 'Pizza' } },
    { codigo: 'entrada', rotulo: { pt: 'Entrada', en: 'Starter' } },
    { codigo: 'sobremesa', rotulo: { pt: 'Sobremesa', en: 'Dessert' } },
    { codigo: 'mais_de_um', rotulo: { pt: 'Mais de um item', en: 'More than one item' } },
  ],
} as const

export const T3C2 = {
  pergunta: { pt: 'Qual?', en: 'Which one?' },
  /** Sempre presente, e do mesmo tamanho dos outros alvos. */
  preferoNaoDizer: { pt: 'Prefiro não dizer', en: 'Rather not say' },
  /** Seis a sete alvos por tela, sem rolagem (N34). */
  maximoPorTela: 7,
} as const

export const T3C3 = {
  pergunta: { pt: 'O que aconteceu com ele?', en: 'What was wrong with it?' },
  /** Os seis fatores de `comida` da folha canonica, nesta ordem. */
  opcoes: [
    { codigo: 'sabor', rotulo: { pt: 'Sabor', en: 'Flavor' }, dimensao: 'comida', fator: 'sabor' },
    { codigo: 'chegou_frio', rotulo: { pt: 'Chegou frio', en: 'Arrived cold' }, dimensao: 'comida', fator: 'chegou_frio' },
    { codigo: 'ponto_da_massa', rotulo: { pt: 'Ponto da massa', en: 'The crust' }, dimensao: 'comida', fator: 'ponto_da_massa' },
    { codigo: 'apresentacao', rotulo: { pt: 'Apresentação', en: 'Presentation' }, dimensao: 'comida', fator: 'apresentacao' },
    { codigo: 'ingrediente_sem_frescor', rotulo: { pt: 'Ingrediente sem frescor', en: 'Not fresh' }, dimensao: 'comida', fator: 'ingrediente_sem_frescor' },
    { codigo: 'veio_errado_ou_faltou', rotulo: { pt: 'Veio errado ou faltou item', en: 'Wrong or missing item' }, dimensao: 'comida', fator: 'veio_errado_ou_faltou' },
  ] satisfies readonly Opcao[],
} as const

// ---------------------------------------------------------------------------
// T5, aberta ancorada na nota
// ---------------------------------------------------------------------------

export const T5 = {
  cabecalho: { pt: 'Opcional', en: 'Optional' },
  promotor: { pt: 'O que a gente fez bem hoje?', en: 'What did we get right tonight?' },
  neutro: { pt: 'O que a gente pode melhorar?', en: 'What could we do better?' },
  detrator: { pt: 'Conta rápido o que aconteceu?', en: 'Tell us briefly what happened?' },
} as const

export function perguntaAberta(nota: number): Texto {
  if (nota <= 6) return T5.detrator
  if (nota <= 8) return T5.neutro
  return T5.promotor
}

// ---------------------------------------------------------------------------
// T6, contato. O rodape e deliberado e nao e juridico por acaso.
// ---------------------------------------------------------------------------

export const T6 = {
  pergunta: { pt: 'Quer que a gente te responda?', en: 'Want us to get back to you?' },
  ajuda: {
    pt: 'Deixe WhatsApp ou e-mail. É opcional, e serve só para isso.',
    en: 'Leave a WhatsApp number or email. Optional, and used only for that.',
  },
  /**
   * Prometer que a resposta "continua anonima" depois de pedir o WhatsApp seria falso, e
   * consentimento sob LGPD precisa de finalidade especifica. A honestidade aqui e o que
   * sustenta a taxa de contato ao longo do tempo.
   */
  rodape: {
    pt: 'Sua nota já foi registrada. Se você deixar contato, ele fica ligado a esta resposta.',
    en: 'Your rating is already saved. If you leave a contact, it will be linked to this response.',
  },
  linkPrivacidade: { pt: 'Como usamos seus dados', en: 'How we use your data' },
} as const

// ---------------------------------------------------------------------------
// T7, agradecimento
// ---------------------------------------------------------------------------

export const T7 = {
  texto: { pt: 'Obrigado. Boa noite.', en: 'Thank you. Have a good evening.' },
  /** N18. Sem exibir nada da resposta que acabou de ser enviada. */
  autoResetSegundos: 8,
} as const

// ---------------------------------------------------------------------------
// T0, a tela do garcom. O cliente nunca ve.
// ---------------------------------------------------------------------------

export const T0 = {
  rotuloMesa: { pt: 'Mesa', en: 'Table' },
  rotuloPin: { pt: 'Seu PIN', en: 'Your PIN' },
  botao: { pt: 'Entregar ao cliente', en: 'Hand to guest' },
  /** A recusa tambem e registrada: e o denominador da conversao por garcom. */
  botaoRecusou: { pt: 'Cliente não quis responder', en: 'Guest declined' },
} as const

// ---------------------------------------------------------------------------
// O banco de 20 perguntas rotacionadas
// ---------------------------------------------------------------------------

export type Peso = 'alto' | 'medio' | 'baixo'

export interface PerguntaBanco {
  numero: number
  texto: Texto
  opcoes: readonly Texto[]
  dimensao: Dimensao
  fator?: string
  peso: Peso
  /** Verdadeiro quando a pergunta morre ao entrar uma integracao. Banco que so cresce e sinal de que ninguem olha as integracoes. */
  temporaria: boolean
  saiQuando: string
}

export const CABECALHO_ROTACIONADA: Texto = {
  pt: 'Só mais uma coisa (opcional)',
  en: 'Just one more thing (optional)',
}

const o = (pt: string, en: string): Texto => ({ pt, en })

export const BANCO_PERGUNTAS: readonly PerguntaBanco[] = [
  { numero: 1, texto: o('Qual pizza você comeu hoje?', 'Which pizza did you have tonight?'), opcoes: [o('Mais de uma', 'More than one'), o('Não comi pizza', 'No pizza')], dimensao: 'item_consumido', peso: 'alto', temporaria: true, saiQuando: 'a comanda do Altec entrar no sistema' },
  { numero: 2, texto: o('A pizza chegou na temperatura certa?', 'Was your pizza served at the right temperature?'), opcoes: [o('Sim', 'Yes'), o('Mais ou menos', 'Somewhat'), o('Não', 'No')], dimensao: 'comida', fator: 'chegou_frio', peso: 'alto', temporaria: false, saiQuando: 'nunca' },
  { numero: 3, texto: o('Como estava o ponto da massa?', 'How was the crust?'), opcoes: [o('Bom', 'Good'), o('Muito mole', 'Too soft'), o('Muito seca ou queimada', 'Too dry or burnt')], dimensao: 'comida', fator: 'ponto_da_massa', peso: 'alto', temporaria: false, saiQuando: 'nunca' },
  { numero: 4, texto: o('Quanto tempo você esperou pela pizza?', 'How long did you wait for your pizza?'), opcoes: [o('Rápido', 'Quick'), o('No tempo certo', 'Just right'), o('Demorou', 'Too long')], dimensao: 'tempo', fator: 'espera_pizza', peso: 'alto', temporaria: true, saiQuando: 'o PDV expor hora do pedido e hora da entrega' },
  { numero: 5, texto: o('Quanto tempo você esperou pela primeira bebida?', 'How long did you wait for your first drink?'), opcoes: [o('Rápido', 'Quick'), o('No tempo certo', 'Just right'), o('Demorou', 'Too long')], dimensao: 'tempo', fator: 'espera_bebida', peso: 'medio', temporaria: false, saiQuando: 'nunca' },
  { numero: 6, texto: o('A bebida veio na temperatura certa?', 'Was your drink at the right temperature?'), opcoes: [o('Sim', 'Yes'), o('Não', 'No')], dimensao: 'bebida', fator: 'temperatura', peso: 'medio', temporaria: false, saiQuando: 'nunca' },
  { numero: 7, texto: o('Alguém te recebeu bem na chegada?', 'Were you greeted well when you arrived?'), opcoes: [o('Sim', 'Yes'), o('Mais ou menos', 'Somewhat'), o('Não', 'No')], dimensao: 'atendimento', fator: 'recepcao', peso: 'medio', temporaria: false, saiQuando: 'nunca' },
  { numero: 8, texto: o('O garçom soube explicar o cardápio?', 'Did your server explain the menu well?'), opcoes: [o('Sim', 'Yes'), o('Em parte', 'Partly'), o('Não', 'No'), o('Não perguntei', "Didn't ask")], dimensao: 'atendimento', fator: 'conhecimento_cardapio', peso: 'medio', temporaria: false, saiQuando: 'nunca' },
  { numero: 9, texto: o('Você pediu entrada hoje? Como estava?', 'Did you order a starter tonight? How was it?'), opcoes: [o('Não pedi', "Didn't order"), o('Boa', 'Good'), o('Regular', 'Average'), o('Ruim', 'Poor')], dimensao: 'comida', fator: 'sabor', peso: 'medio', temporaria: true, saiQuando: 'a comanda entrar no sistema' },
  { numero: 10, texto: o('Você pediu sobremesa hoje? Como estava?', 'Did you order dessert tonight? How was it?'), opcoes: [o('Não pedi', "Didn't order"), o('Boa', 'Good'), o('Regular', 'Average'), o('Ruim', 'Poor')], dimensao: 'comida', fator: 'sabor', peso: 'medio', temporaria: true, saiQuando: 'a comanda entrar no sistema' },
  { numero: 11, texto: o('Valeu o que você pagou?', 'Was it worth what you paid?'), opcoes: [o('Valeu', 'Worth it'), o('Mais ou menos', 'Somewhat'), o('Não valeu', 'Not worth it')], dimensao: 'preco_valor', fator: 'valor_percebido', peso: 'alto', temporaria: false, saiQuando: 'nunca, e e a unica forma honesta de perguntar preco' },
  { numero: 12, texto: o('O nível de ruído estava confortável?', 'Was the noise level comfortable?'), opcoes: [o('Confortável', 'Comfortable'), o('Alto', 'Loud'), o('Muito alto', 'Very loud')], dimensao: 'ambiente', fator: 'ruido', peso: 'medio', temporaria: false, saiQuando: 'nunca' },
  { numero: 13, texto: o('A temperatura do salão estava boa?', 'Was the room temperature comfortable?'), opcoes: [o('Boa', 'Good'), o('Quente', 'Too warm'), o('Fria', 'Too cold')], dimensao: 'ambiente', fator: 'temperatura_salao', peso: 'baixo', temporaria: false, saiQuando: 'nunca' },
  { numero: 14, texto: o('Sua mesa estava limpa e posta quando você sentou?', 'Was your table clean and set when you sat down?'), opcoes: [o('Sim', 'Yes'), o('Mais ou menos', 'Somewhat'), o('Não', 'No')], dimensao: 'limpeza', fator: 'mesa', peso: 'medio', temporaria: false, saiQuando: 'nunca' },
  { numero: 15, texto: o('Se você usou o banheiro, estava limpo?', 'If you used the restroom, was it clean?'), opcoes: [o('Não usei', "Didn't use"), o('Limpo', 'Clean'), o('Mais ou menos', 'Somewhat'), o('Sujo', 'Dirty')], dimensao: 'limpeza', fator: 'banheiro', peso: 'alto', temporaria: false, saiQuando: 'nunca, e e o fator que mais aparece em review publico negativo' },
  { numero: 16, texto: o('Você esperou para sentar? Quanto?', 'Did you wait for a table? How long?'), opcoes: [o('Não esperei', "Didn't wait"), o('Até 10 min', 'Up to 10 min'), o('10 a 30 min', '10 to 30 min'), o('Mais de 30 min', 'Over 30 min')], dimensao: 'tempo', fator: 'espera_mesa', peso: 'medio', temporaria: true, saiQuando: 'o sistema de reservas expuser hora de chegada e de acomodacao' },
  { numero: 17, texto: o('É sua primeira vez no QT?', 'Is this your first time at QT?'), opcoes: [o('Primeira vez', 'First time'), o('Já vim antes', "I've been before"), o('Venho sempre', 'I come often')], dimensao: 'atendimento', peso: 'alto', temporaria: false, saiQuando: 'nunca, e e a base do corte de coorte sem identificar ninguem' },
  { numero: 18, texto: o('Como você conheceu o QT?', 'How did you hear about QT?'), opcoes: [o('Indicação', 'Word of mouth'), o('Instagram', 'Instagram'), o('Google ou mapa', 'Google or maps'), o('Passei na frente', 'Walked by'), o('Já conhecia', 'Already knew it')], dimensao: 'atendimento', peso: 'medio', temporaria: false, saiQuando: 'nunca' },
  { numero: 19, texto: o('Você sentou na varanda ou no salão?', 'Were you seated on the veranda or indoors?'), opcoes: [o('Varanda', 'Veranda'), o('Salão', 'Indoors')], dimensao: 'ambiente', peso: 'baixo', temporaria: true, saiQuando: 'imediatamente, se o mapa das 22 mesas estiver no sistema' },
  { numero: 20, texto: o('Você fez reserva? Como foi?', 'Did you book a table? How was the booking?'), opcoes: [o('Não reservei', "Didn't book"), o('Fácil', 'Easy'), o('Confuso', 'Confusing'), o('Deu problema', 'Had a problem')], dimensao: 'tempo', fator: 'espera_mesa', peso: 'medio', temporaria: true, saiQuando: 'o app de reservas proprio expuser o dado' },
]

/** N19. Arranque com 12, teto de 20. Os dois sao da mesma escada. */
export const ARRANQUE_SUGERIDO: readonly number[] = [1, 2, 3, 4, 11, 15, 17, 5, 8, 12, 14, 18]

const PESO_NUMERICO: Record<Peso, number> = { alto: 4, medio: 2, baixo: 1 }

/** Quantas rotacionadas cada faixa recebe. Detrator recebe zero, por desenho. */
export function quantasRotacionadas(nota: number): number {
  if (nota <= 6) return 0
  if (nota <= 8) return 1
  return 2
}

/**
 * Sorteio por peso, sem repeticao dentro da mesma resposta.
 *
 * `aleatorio` entra por parametro para o teste ser deterministico. Peso `alto` recebe
 * cerca de duas vezes o sorteio de `medio`, e `baixo` cerca de metade.
 */
export function sorteiaPerguntas(
  ativas: readonly PerguntaBanco[],
  quantidade: number,
  aleatorio: () => number = Math.random,
): readonly PerguntaBanco[] {
  const disponiveis = [...ativas]
  const escolhidas: PerguntaBanco[] = []

  while (escolhidas.length < quantidade && disponiveis.length > 0) {
    const total = disponiveis.reduce((s, p) => s + PESO_NUMERICO[p.peso], 0)
    let alvo = aleatorio() * total
    let indice = disponiveis.length - 1
    for (let i = 0; i < disponiveis.length; i++) {
      alvo -= PESO_NUMERICO[disponiveis[i]!.peso]
      if (alvo <= 0) {
        indice = i
        break
      }
    }
    escolhidas.push(disponiveis[indice]!)
    disponiveis.splice(indice, 1)
  }

  return escolhidas
}

export function perguntasAtivas(numeros: readonly number[]): readonly PerguntaBanco[] {
  return BANCO_PERGUNTAS.filter((p) => numeros.includes(p.numero))
}
