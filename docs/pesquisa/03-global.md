# 03. Referências globais e as mecânicas de produto que valem copiar

> Base: `dados/03-global.json` (36 fornecedores globais mapeados) e `dados/09-verif-global.json` (verificação adversarial, veredito **PARCIAL**, 15 correções).
> As correções do verificador têm precedência. Onde ele refutou preço ou feature, este documento usa a versão corrigida e diz isso no texto. Preço que não foi lido em página oficial aparece como **NÃO PÚBLICO** ou **NÃO VERIFICADO**, sem exceção.
> Aviso de método, do próprio verificador: o erro recorrente da pesquisa original não foi invenção de conteúdo, foi **citação deslocada** (a afirmação é verdadeira, mas a URL indicada não a contém). Em cinco casos a citação foi corrigida aqui. Em dois casos a afirmação caiu.

---

## 1. A tese desta seção em cinco linhas

1. Nenhum dos 36 fornecedores globais é comprável pela QT, e isso não importa: o valor deste levantamento está nas mecânicas de produto, não nos fornecedores.
2. O mercado global convergiu para um punhado de mecânicas de coleta e de leitura que praticamente não existem no Brasil, e quase todas são baratas de implementar porque são desenho, não tecnologia.
3. A mecânica de maior retorno não é uma feature: é **encurtar a pesquisa a três perguntas e rotacionar quais três**, o que resolve profundidade e fricção ao mesmo tempo.
4. O piso de preço auditável do mercado global é **mais alto** do que a pesquisa original afirmava (US$ 90/local/mês na Marqii), e isso reforça a decisão de construir, não a enfraquece.
5. A restrição de que ninguém vai manter o sistema é o filtro mais duro deste documento: várias mecânicas boas foram marcadas IGNORAR só porque exigem um humano cuidando delas toda semana.

---

## 2. As mecânicas

Cada subseção traz como a mecânica funciona, quem faz, o número que comprova (com fonte) e um veredito de **COPIAR**, **ADAPTAR** ou **IGNORAR** para o QT.

---

### 2.1 Pesquisa de duas perguntas, com o questionário longo voltando 24h depois

**Como funciona.** A pesquisa que chega ao cliente tem uma pergunta de nota e um campo aberto opcional. Nada de matriz de dez atributos na primeira tela. O questionário profundo não é eliminado, ele é **adiado**: 24 horas depois da primeira resposta, o sistema dispara um segundo bloco de perguntas, escolhido em função do que a pessoa já respondeu e do que ela pediu.

**Quem faz.** Ovation, com o produto Digital Table Touch e o módulo Custom Questions / Next-Day Questions.

**O número.** Verbatim: `upwards of 42% response rate, as opposed to traditional receipt-surveys which see a less than 0.5% completion rate` ([ovationup.com, release de Custom Questions](https://ovationup.com/news-releases-ovation-adds-custom-questions-to-actionable-guest-feedback-loop/)). Também verbatim, na home: `about 0.1% of guests take traditional long-form surveys, but Ovation surveys see up to a 20% take rate` e `97% survey completion rate` ([ovationup.com](https://ovationup.com/)).

**Correção obrigatória do verificador.** Os 42% **não são comparáveis** aos 0,5% do recibo, e a pesquisa original construiu essa comparação como base de decisão. Os 42% são medidos sobre uma base filtrada duas vezes: gente que já respondeu a primeira pesquisa **e** que ainda recebeu um SMS pedindo permissão para responder mais algumas perguntas. Os 0,5% do recibo são medidos sobre todos os clientes. Além disso o próprio fornecedor é inconsistente (0,1% na home, menos de 0,5% no release). **Não planeje nada esperando 42%.**

**Veredito: COPIAR a primeira parte, ADAPTAR a segunda.**

A tela curta é COPIAR sem ressalva. Ela é a tradução literal do limite de 45 segundos e da decisão de que só a nota é obrigatória. Uma pergunta por tela, nota, campo aberto, fim.

A segunda onda é ADAPTAR por duas restrições. Primeira: a coleta é anônima com contato opcional no fim, então a segunda onda só existe para a fração que deixou e-mail, e essa fração vai ser pequena. Segunda: o canal de retorno hoje é e-mail (WhatsApp é fase futura), e e-mail é o canal de menor taxa de resposta que existe neste levantamento. O desenho realista é: segunda onda por e-mail, disparada por rotina agendada, só para quem deixou contato e consentiu, com no máximo três perguntas, e com registro de consentimento por causa da LGPD. E o mais importante para a restrição de manutenção: se a segunda onda falhar em silêncio, o sistema não pode perder a primeira resposta.

---

### 2.2 Feedback por item consumido, com atributos desmembrados

**Como funciona.** A pesquisa não pergunta o que a pessoa comeu. A integração com o PDV pré-popula a lista de itens da comanda, e o cliente avalia **cada item** em atributos separados, não com uma nota única.

**Quem faz.** Tattle é a referência. Yumpingo (hoje dentro do Guest Intelligence da Black Box) inventou a categoria de feedback por prato.

**O número e a citação corrigida.** Os atributos confirmados são sabor, textura, porção, temperatura, apresentação e valor percebido, verbatim `across taste, texture, portion, temperature, presentation, and value simultaneously`. A pesquisa original citou a URL errada: os atributos **não estão** em `get.tattleapp.com/item-level-feedback/`. A fonte correta é o blog oficial [Menu Engineering 2.0](https://get.tattleapp.com/blog/2026-03-31-menu-engineering-20-itemlevel-feedback-for-better-ltos/). Do lado do volume de dado, a Tattle declara `55+ data points per survey` com `94.5% completion rate` ([get.tattleapp.com](https://get.tattleapp.com/features/item-level-feedback/)), e a própria página tem um executivo dizendo `despite being 50+ questions`, o que é o oposto da filosofia da Ovation.

**Veredito: ADAPTAR, com corte agressivo.**

Copiar a matriz completa de seis atributos por item é incompatível com o briefing em três pontos: estoura os 45 segundos, contradiz a decisão de que prato a prato só aparece quando a nota é baixa, e depende de uma integração com o Altec/Next que ainda não está confirmada. A adaptação:

- **Gatilho, não padrão.** A grade de itens só aparece quando a nota é baixa. Quem deu nota alta agradece e sai.
- **Três atributos, não seis.** Para pizza, o que discrimina é sabor, temperatura e tempo de espera. Textura, apresentação e porção podem entrar depois no banco de perguntas rotacionadas (2.5), que é onde profundidade não custa fricção.
- **Plano B se o PDV não expõe a comanda.** Sem a comanda em tempo real, mostre os itens vendidos naquele turno segundo a última importação do R3, ou os cinco mais vendidos do dia, e deixe o cliente marcar. É pior, mas é 80% do valor por 10% do esforço. A amarração exata pode ser feita depois, no import, cruzando mesa e horário.

Esta é a mecânica que liga a pesquisa à engenharia de cardápio e, por consequência, ao diferencial de satisfação cruzada com CMV. Vale o esforço, mas ela é a de maior custo de implementação nesta seção e depende de uma pendência aberta do briefing (o que o Altec expõe).

---

### 2.3 Nota do item comparada à média do cardápio, não em valor absoluto

**Como funciona.** O painel não mostra "Margherita: 4,2". Mostra "Margherita: 4,2, e a média do cardápio é 4,6".

**Quem faz.** Tattle.

**O número.** Verbatim, e confirmado pelo verificador: `See how a menu item performs against the menu average` ([get.tattleapp.com](https://get.tattleapp.com/features/item-level-feedback/)).

**Veredito: COPIAR.** É a melhor relação entre retorno e esforço de todo este documento. Tecnicamente é uma view no banco. Muda a leitura de todo o dado coletado, porque nota absoluta em restaurante não informa nada (quase todo mundo dá 8, 9 ou 10) e desvio contra a média informa tudo. Com 50 a 200 respostas por mês o cuidado é estatístico, não técnico: fixe um mínimo de respostas por item antes de exibir o desvio, senão dois clientes mal-humorados condenam um prato.

---

### 2.4 Recuperação do insatisfeito como fluxo com dono e prazo, não como linha de relatório

**Como funciona.** Feedback negativo não vira item de dashboard, vira **ticket**: tem dono, tem prazo, tem desfecho registrado, e o ciclo só fecha quando alguém falou com o cliente. Nas versões mais maduras, o roteamento é por tema (reclamação de comida vai para a cozinha, reclamação de demora vai para o salão), a oferta de recuperação é emitida dentro do PDV ou do programa de fidelidade, e depois de resolver o sistema roda um CSAT de recuperação e pede ao cliente para **editar a avaliação pública que ele já publicou**, em vez de escrever uma nova.

**Quem faz.** Medallia (Smart Closed Loop), InMoment (roteamento do detrator para o responsável), Momos (o desenho mais completo e mais copiável).

**Os números, todos do fornecedor e todos confirmados verbatim pelo verificador.** `Papa Murphy's Turns Guest Feedback Into $2M in Recovered Revenue`; `How Just Salad Cut Response Times by 99% and Saved 1,200 Hours a Month`; `Caribou Coffee Achieves 61% More Reviews`; `Share offer or give credits on POS, Loyalty, or natively.`; `Send CSAT survey and automatically prompt the customers to edit the public review.` ([momos.com/product/customer-recovery](https://www.momos.com/product/customer-recovery)). Nenhum deles tem metodologia publicada. A Momos não publica SLA, janela de tempo, procedimento de escalação nem como atribui a receita recuperada.

**Veredito: COPIAR só a parte presencial. ADAPTAR o ticket. IGNORAR o resto.**

- **COPIAR: alerta em tempo real ao gerente com número da mesa e horário.** É a única forma de recuperação que funciona sob as restrições da QT. O cliente está sentado, a janela é de minutos, o dono do problema é o gerente de turno, o custo é zero e a ferramenta é humana. Isso também é o que Ovation, HappyOrNot e Medallia vendem como alerta em tempo real, então a mecânica é padrão de mercado, não invenção.
- **ADAPTAR: ticket com dono e prazo.** Vale existir como registro simples (aberto, tratado, fechado, com uma linha de texto), porque sem isso não há como saber se a recuperação virou hábito. Mas o gargalo aqui não é técnico, é humano: um SLA só funciona se alguém fecha o ticket, e ninguém vai manter o sistema. Desenhe o ticket para morrer sozinho: se ninguém fechar em 48 horas, ele fecha como "não tratado" e entra no digest diário como contagem. Nunca crie uma fila que cresce para sempre.
- **IGNORAR: crédito emitido dentro do PDV.** O briefing decidiu que a tela final apenas agradece, sem cupom, e o Altec/Next não tem integração confirmada. Voucher solto rastreado à mão é exatamente o tipo de processo que ninguém vai manter.
- **IGNORAR: pedir ao cliente para editar a avaliação pública.** O briefing decidiu que avaliações públicas são somente link, que o conteúdo não entra no sistema e que o sistema não responde por elas. É uma mecânica excelente que está fora do escopo declarado. Se um dia entrar, entra como procedimento humano do gerente, não como automação.

---

### 2.5 Captura dentro de um fluxo que o cliente já ia completar

**Como funciona.** A pesquisa não é um pedido novo feito ao cliente. Ela aparece **dentro** de algo que ele já ia terminar de qualquer jeito: o pagamento. O cliente controla o pagamento na mesa e, no fim do fluxo, responde a micro-pesquisa antes de levantar.

**Quem faz.** TableSafe, na plataforma RAIL.

**O número, com a citação corrigida.** Verbatim: `restaurants get an 80 percent response rate on the first question and more than 70 percent on the following two`. A pesquisa original creditou isso a um press release do Businesswire que **não contém a estatística**. A fonte correta é [425business.com](https://425business.com/tablesafe-to-launch-improved-restaurant-payment-system/), de 2017. Dois contextos que o verificador exigiu registrar: o número tem nove anos, e a TableSafe foi **adquirida pela Mad Mobile em 28/10/2021**, ou seja, não é um fornecedor corrente com preço sob consulta, é um produto absorvido.

**O achado mais útil da mesma fonte**, e que a pesquisa original tinha deixado passar: `they found if customers were asked more than three questions, the response rates dropped way off`.

**Veredito: COPIAR, e é o que o briefing já decidiu sem saber que era a melhor prática mundial.**

Entregar o tablet junto com a conta é exatamente esta mecânica. O cliente já ia parar para pagar. A pesquisa entra nesse intervalo, não compete com ele. Duas consequências de desenho que decorrem direto do número:

- **Teto duro de três perguntas na tela.** Não é preferência, é o único dado empírico deste levantamento sobre onde a taxa de resposta despenca.
- **O momento certo é o da conta, não 90 minutos depois.** A Tattle dispara e-mail ou SMS `sent 90 minutes after a transaction` ([get.tattleapp.com](https://get.tattleapp.com/features/feedback-collection/)), o que faz sentido para quem só tem canal digital e nenhum contato físico com o cliente. A QT tem o garçom e o tablet, que é um ativo melhor. O disparo com atraso fica reservado para a segunda onda (2.1).

---

### 2.6 Banco de perguntas rotacionadas: uma fixa e duas sorteadas

**Como funciona.** A primeira pergunta é sempre a mesma (nota geral). As outras duas são sorteadas de um banco de perguntas customizáveis, aleatoriamente, a cada atendimento. Ninguém vê mais de três perguntas, e o banco inteiro é coberto ao longo do mês pela soma dos respondentes.

**Quem faz.** TableSafe, no mesmo fluxo do RAIL: primeira pergunta sempre a nota, `and restaurants can customize the following two questions, which are rotated randomly` ([425business.com](https://425business.com/tablesafe-to-launch-improved-restaurant-payment-system/)).

**O número.** O mesmo 80% e mais de 70% de 2.5, medido justamente com esse desenho de três perguntas.

**Veredito: COPIAR, e esta é a mecânica que eu implementaria primeiro depois da tela curta.**

Ela resolve três problemas do briefing de uma vez:

1. **Profundidade sem fricção.** Um banco de 20 perguntas cobrindo cardápio, atendimento, ambiente, tempo, banheiro, música e varanda é coberto inteiro com 50 a 200 respostas por mês, mostrando duas perguntas por pessoa. É a resposta ao "quero tudo e mais" sem estourar os 45 segundos.
2. **Manutenção zero.** A pesquisa não precisa ser reescrita quando o cardápio muda: acrescenta-se uma linha na tabela de perguntas. Sob a restrição de que ninguém vai manter o sistema, uma pesquisa que se renova por sorteio vale mais que uma pesquisa perfeita e congelada.
3. **Volume compatível com a estatística.** Com esse volume mensal, cada pergunta do banco recebe poucas dezenas de respostas por mês. Isso serve para tendência trimestral, não para decisão semanal por pergunta. Registre isso no painel para não induzir decisão errada.

Ressalva de rigor: o número que sustenta a mecânica é de 2017, de declaração de fornecedor à imprensa, sem metodologia, e a empresa foi adquirida. A mecânica é sólida por construção lógica (menos perguntas, mais resposta) mais do que pela força da evidência. **Confiança média.**

---

### 2.7 Sentimento frase por frase, não por resposta inteira

**Como funciona.** O comentário aberto não recebe uma classificação única. Cada frase é classificada em separado, com categorização dos termos. "Pizza excelente mas demorou 40 minutos" gera um positivo em produto **e** um negativo em tempo, em vez de uma média inútil.

**Quem faz.** Olo (ex-Wisely), no módulo Sentiment: `the sentiment of each comment, phrase-by-phrase` ([olo.com/sentiment](https://www.olo.com/sentiment)). A Ovation faz a versão categórica disso, classificando texto aberto em mais de 35 categorias específicas de restaurante ([ovationup.com](https://ovationup.com/)). A Chatmeter faz a versão extrema, extraindo tema de milhões de textos sem categoria pré-definida, que é a única forma de descobrir problema que você não pensou em perguntar.

**Veredito: COPIAR.**

É a mecânica com melhor encaixe técnico no projeto. Uma chamada de LLM na camada gratuita de Gemini ou Groq, com saída estruturada em JSON (uma lista de trechos, cada um com área e polaridade), custa R$ 0 e alimenta diretamente duas decisões já tomadas no briefing: comentários filtrados por área nos e-mails de cozinha e de salão, e crítica pessoal grave só para o proprietário.

Duas travas obrigatórias por causa da restrição de manutenção:

- **Guarde sempre o texto cru.** A classificação é derivada e pode ser refeita. Se a política de camada gratuita do fornecedor mudar (risco que o próprio briefing reconhece), você perde a análise, não o dado.
- **Falha silenciosa é proibida.** Se a classificação não voltar, o digest sai com os comentários sem categoria e um aviso, nunca sem os comentários.

---

### 2.8 Biblioteca de respostas pré-aprovadas combinada com IA

**Como funciona.** A IA não escreve livremente em nome da marca. Existe uma biblioteca de respostas aprovadas, e a IA escolhe a certa e personaliza dinamicamente com nome do cliente, loja e detalhes do caso.

**Quem faz.** Olo: `generative AI and pre-approved response libraries`, com `dynamically personalize responses with guest names, store locations, and other details` ([olo.com/sentiment](https://www.olo.com/sentiment)). Ovation faz a versão mais solta, com resposta gerada em um clique a partir do histórico do cliente e da voz da marca, confirmada verbatim: recuperação `in just two clicks with either an original message, an on-brand templated response, or using our AI-generated custom response` ([ovationup.com/platform/feedback/](https://ovationup.com/platform/feedback/)).

**Veredito: ADAPTAR, com a IA na coleira curta.**

O sistema da QT não responde avaliação pública (decisão do briefing), então o caso de uso encolhe para a mensagem privada de recuperação, que só existe para quem deixou contato. Mesmo nesse caso reduzido, a mecânica de biblioteca é a certa e a de IA solta é a errada, por um motivo direto: **ninguém vai revisar o que a IA escreveu**. Sem revisor, resposta gerada livremente em nome do restaurante é risco sem contrapartida.

O desenho: seis a oito respostas escritas e aprovadas pelo proprietário, a IA apenas escolhe qual se aplica e preenche o nome e o item citado. Se a IA não tiver confiança, ela não responde e o caso vira uma linha no digest para o gerente resolver por telefone. Custo de implementação baixo, retorno baixo neste escopo. Prioridade baixa.

---

### 2.9 Digest em linguagem natural, em vez de painel que ninguém abre

**Como funciona.** Um resumo automático em texto corrido chega no e-mail em cadência fixa, dizendo o que aconteceu e o que fazer. O painel continua existindo, mas não é o produto principal.

**Quem faz.** SevenRooms, com o AI Feedback Summary, um digest semanal automático. A Tattle faz a versão com plano de ação: `provides each location-level team their top area for improvement every 30 days` ([get.tattleapp.com](https://get.tattleapp.com/features/item-level-feedback/)).

**Correção obrigatória do verificador.** A pesquisa original afirmava que o AI Coach da Tattle gera plano de ação **por turno**, e concluía que o recorte por turno era o único que importava para a QT. **Refutado.** A palavra `shift` não aparece na página citada. O que a Tattle entrega é granularidade de **local** com ciclo de **30 dias**. O recorte por turno existe na Tattle apenas como visualização de painel (Day Part Heatmap), não como plano de ação gerado por IA. O corte por turno e por dia da semana continua sendo o certo para a QT, mas por lógica do negócio (só jantar, terça a domingo), não porque a Tattle faça isso.

**Números.** SevenRooms declara redução de 27% no tempo de resposta e aumento de 35% no volume de resposta com IA. São números do próprio fornecedor, e a ficha inteira do SevenRooms neste levantamento vem de um comparativo escrito por um concorrente (Tattle). **Confiança baixa no número, alta no valor da mecânica.**

**Veredito: COPIAR, e é a mecânica de maior retorno absoluto do projeto.**

O briefing já pediu exatamente isso: e-mail diário às 16h, antes da abertura, com destinatários separados por área e diagnóstico escrito. A definição de sucesso número 3 é "gerar decisão, não só relatório", e a dor declarada é relatório raso que não gera ação. O digest **é** a resposta a essas duas frases. Tecnicamente é uma rotina agendada, uma consulta ao banco e um prompt.

Duas coisas que fazem a diferença entre digest útil e ruído:

- **Compare sempre contra o período anterior.** Nota isolada não gera decisão. "Nota do sábado abaixo dos últimos quatro sábados" gera.
- **Um dia sem dado tem que sair como um dia sem dado.** Digest que erra em silêncio é pior que digest que não sai, porque ninguém vai auditar o e-mail diário depois do terceiro mês.

---

### 2.10 Anonimato como gerador de volume

**Como funciona.** Feedback anônimo e instantâneo no ponto de serviço, sem identificação e sem fricção. O preço do anonimato é que não existe recuperação individual, histórico nem amarração à comanda. O benefício é volume e sinceridade.

**Quem faz.** HappyOrNot é o caso extremo, com os totens de carinha, feedback anônimo, `Unlimited feedback, surveys, users and administrators` e alertas em tempo real nos planos superiores ([happy-or-not.com](https://www.happy-or-not.com/en/pricing-and-features/)).

**O número que mais importa aqui não é deles, é do fornecedor atual da QT.** A Risposta documenta que o tablet responde por `cerca de 90% das opiniões registradas` justamente porque permite resposta anônima, que o QR Code adiciona `aumentar em até 15%` em avaliações e cadastros, e que `O grande risco de usar QR Code somente é a manipulação das amostras por parte das equipes` ([risposta.app/risposta-qr-code](https://www.risposta.app/risposta-qr-code/)). O verificador classificou esse conjunto como o achado mais bem sustentado de todo o levantamento e o mais relevante para a QT.

**Correção de preço.** O "~US$ 100/mês por totem" da HappyOrNot foi **REFUTADO** em duas frentes: a página oficial não exibe valor nenhum, e o modelo não é mensal por totem, é taxa de setup mais assinatura **anual** dimensionada pelo mix de pontos de coleta. Trate como **NÃO PÚBLICO**.

**Veredito: COPIAR o anonimato. COPIAR também a política de preço, mesmo sem comprar nada.**

O anonimato com contato opcional no fim já é a decisão do briefing, e o dado da Risposta explica por que ela está certa: é o anonimato, mais que o hardware, que gera os 90%. Isso tem duas consequências operacionais:

- **O tablet continua sendo o canal principal, e o QR é o backup.** Se a QT virar só-QR para economizar, o dado da Risposta sugere que o volume cai muito, e a definição de sucesso número 2 é coletar **mais** respostas do que hoje.
- **Antifraude não é opcional, é o que faz o dado valer algo.** Sem hardware alugado e sem detecção de fraude de fornecedor, a trava tem que estar no software: uma resposta por comanda ou por mesa, janela de tempo válida amarrada ao horário do atendimento, PIN do garçom antes de entregar o tablet (que o briefing já previu como plano B) e bloqueio de dispositivo com repetição anômala. Isso é barato e é a diferença entre um painel e um painel confiável.

Sobre a política de preço da HappyOrNot: cobrar por **ponto de coleta** e nunca por volume de resposta é o modelo correto, e o oposto do de SurveySparrow (teto de ~2.500 respostas por ano no plano de entrada) e do que a Delighted fazia. A QT não vai cobrar de ninguém, mas se um dia ceder o sistema a amigos do setor, esta é a régua: nunca punir quem coleta mais.

---

### 2.11 Benchmark contra concorrentes do mesmo raio

**Como funciona.** A plataforma mede automaticamente a nota e o sentimento dos concorrentes próximos e compara com a sua, em tempo real. Nas versões enterprise, o benchmark é contra uma base de rede da indústria.

**Quem faz.** Birdeye, com o Competitors AI, agregando mais de 150 sites de review. Yumpingo e GuestXM fazem a versão de rede, contra a base da Black Box Intelligence. A Intouch Insight faz a versão manual e mais interessante: o cliente oculto coleta **preço da concorrência** durante a própria visita.

**Os números, e por que não dá para usar nenhum.** Os tiers de US$ 299/349/449 da Birdeye foram **REFUTADOS** pelo verificador: a página oficial declara o oposto (`Birdeye pricing is custom and flexible`, `no fixed, one-size-fits-all plan`), e os nomes Starter/Growth/Dominate não constam de fonte oficial ([birdeye.com](https://birdeye.com/blog/what-does-birdeye-cost/)). Preço **NÃO PÚBLICO**. O benchmark da Black Box (300+ empresas, ~100 mil unidades, US$ 153 bi em vendas anuais) vem de um press release de novembro de 2022, tem quase quatro anos e **NÃO FOI VERIFICADO** de forma independente: trate como desatualizado.

**Veredito: IGNORAR como automação. Fazer à mão, uma vez por trimestre.**

Esta é a mecânica que eu mais gostaria de recomendar e a que menos sobrevive às restrições do projeto:

- O briefing decidiu que avaliações públicas entram como **somente link**, sem trazer conteúdo para dentro. Raspar a nota de oito pizzarias do bairro é o contrário disso.
- Raspagem de review de terceiro é a coisa mais frágil que existe: quebra quando a página muda, tem risco de termos de uso e **exige alguém consertando**. Sob a restrição de que ninguém vai manter o sistema, é a definição de dívida técnica garantida.
- A alternativa honesta custa 20 minutos: abrir o Google, olhar a nota de quatro pizzarias comparáveis e anotar em uma linha por trimestre. Se um dia isso virar importante, o caminho certo é comprar **dado**, não interface, no modelo do tier Data Only da ReviewTrackers, que entrega review bruto para processar na plataforma própria.

---

### 2.12 Mecânicas secundárias, com veredito curto

| Mecânica | Quem faz | Evidência | Veredito para o QT |
|---|---|---|---|
| **Uma pergunta por vez, em formato de conversa**, em vez de formulário de página única | SurveySparrow | Feature oficial. Sem número de eficácia publicado | **COPIAR.** Custo zero de implementação, sustenta a percepção de 45 segundos |
| **Follow-up condicional**: a segunda pergunta depende da resposta da primeira | Podium | Feature descrita apenas em comparativo escrito por concorrente. **Confiança baixa** | **COPIAR.** Já é a decisão do briefing (prato a prato só quando a nota é baixa). Nota alta encerra na hora |
| **Fila local e coleta offline**, que sincroniza quando a conexão volta | Zonka Feedback | Feature oficial | **ADAPTAR.** O briefing diz que offline não é requisito (internet estável) mas é desejável como seguro. Implemente como fila no navegador do tablet, não como app |
| **WhatsApp como canal nativo de pesquisa** | Zonka é o único global da lista com isso | Feature oficial | **ADAPTAR, fase 3.** Já está na fase 3 do briefing. Não antecipe: é o canal com maior custo de conformidade e de manutenção |
| **PDV legado e on-premise como cidadão de primeira classe**, e não cobrar pela integração | Bikky | Declaração oficial. Rastreia até 90% dos clientes "dependendo do stack", ou seja, pode ser muito menos | **COPIAR como postura de arquitetura.** É exatamente o problema do Altec/Next. O Raspberry Pi com agente diário lendo o R3 é a versão caseira disso |
| **Nota atribuída a garçom, turno, prato e canal simultaneamente** | Yumpingo, Zonka (CX por atendente) | Yumpingo: páginas oficiais retornam 403, tudo apoiado em release de 2022. **Confiança média** | **COPIAR.** Com 20 mesas por dia, atribuição a garçom e turno é imediatamente acionável. Cuidado com a decisão pendente de amarrar meta de equipe à nota, que é outro problema |
| **Recompensar quem responde** com crédito imediato | Paytronix | Post oficial do fornecedor, sem número | **IGNORAR.** O briefing decidiu: nenhum prêmio, o garçom pede na entrega da conta, custo zero |
| **Amostragem por regra** (disparar para um percentual de quem bate um critério) | Paytronix | Post oficial | **IGNORAR agora, ADAPTAR na segunda onda.** Com 50 a 200 respostas por mês não se amostra, se coleta tudo |
| **Resposta gravada no perfil do cliente**, não na visita | Paytronix, Punchh, Olo GDP | Olo GDP confirmado: unifica PDV, pedido, fidelidade e feedback com GLV e churn risk por ML | **ADAPTAR, fase 2.** A identidade útil da QT não vem da pesquisa (anônima), vem do CRM de reservas que já está no ar |
| **Cruzar checklist operacional e cliente oculto com a nota do mesmo turno** | Intouch Insight | Quatro produtos integrados, declaração oficial | **IGNORAR.** O módulo de checklist foi explicitamente cortado do escopo |
| **Menu interativo como medição antes do consumo** (visualização e curtida por prato no site) | Popmenu | Feature oficial. Preço não confirmado, página oficial retornou 403 e a URL citada era canadense (dúvida CAD vs USD) | **IGNORAR agora.** Interessante para medir demanda por prato que ainda não está no cardápio. Não é problema desta fase |
| **PDV como fonte da verdade do menu, propagado ao Google** | Marqii | Claim oficial real: `saved 2 to 3 hours per week` e um case acumulado de 540 horas. A "economia de ~7 horas por alteração de menu" da pesquisa original foi **REFUTADA**, não existe em fonte oficial. O "70+ publishers" também **não se sustenta**: a página oficial diz apenas Google, Yelp, Facebook, Apple Maps `and more` | **IGNORAR.** Não existe equivalente Altec para Google Business Profile, e construir isso não tem nada a ver com pesquisa de satisfação |
| **Cobrar por review respondida**, em pacotes com desconto por volume | Marqii, add-on Managed Review Response | Oficial e 100% auditável: US$ 100 por 50, US$ 150 por 100, US$ 250 por 250, US$ 375 por 500 | **IGNORAR agora.** Mecânica de embalagem, não de produto. Só relevante se um dia a QT vender o sistema, o que o briefing descarta |
| **Dois planos com ponto de equilíbrio explícito** (menos fixo mais variável, ou mais fixo e zero variável) | Owner.com | Oficial, e o verificador subiu a confiança: `$249 /month + 5% restaurant fee per order`, `$499 /month with no additional restaurant fees`, `Pay month-to-month with no long-term contracts` | **IGNORAR.** Modelo comercial honesto e raro, sem aplicação no escopo interno |
| **Direcionar o satisfeito para a avaliação pública e o insatisfeito para o canal privado** | Guestmeter (verificável na home). **A mesma acusação contra a Ovation foi retirada**: o verificador checou três páginas oficiais e nada sustenta o gating | Risco, não mecânica | **NÃO COPIAR.** Filtrar quem é convidado a avaliar publicamente é review gating. **Lacuna registrada:** nenhuma fonte do Google foi verificada sobre essa política. Não trate como risco jurídico comprovado até ler a política do Google Business Profile |

---

## 3. Taxa de resposta por canal, do melhor ao pior

Antes da tabela, o aviso que vale mais que a tabela: **não existe um único número independente de taxa de resposta neste levantamento.** Todos os números abaixo foram publicados por fornecedores que vendem o canal que o número favorece, nenhum tem metodologia publicada, e vários misturam coisas diferentes (participação no volume, taxa de conclusão de quem começou, penetração sobre transações). Leia como ordem de grandeza e direção, nunca como meta.

| # | Canal e mecânica | Número publicado | O que o número realmente mede | Origem | Fonte |
|---|---|---|---|---|---|
| 1 | **Tablet entregue pelo garçom no salão** (anônimo) | `cerca de 90% das opiniões registradas` | **Participação no volume total**, não taxa de resposta. Diz que o tablet ganha do QR, não quantos clientes respondem | Fornecedor interessado (é o incumbente da QT) | [risposta.app](https://www.risposta.app/risposta-qr-code/) |
| 2 | **Pesquisa no fim do fluxo de pagamento à mesa** | 80% na primeira pergunta, mais de 70% nas duas seguintes | Taxa de resposta entre quem chegou ao fim do pagamento. Número de 2017, empresa adquirida em 2021 | Fornecedor, declaração à imprensa | [425business.com](https://425business.com/tablesafe-to-launch-improved-restaurant-payment-system/) |
| 3 | **Conclusão de pesquisa curta iniciada** | `97% survey completion rate` (Ovation), `94.5% completion rate` (Tattle) | Conclusão de quem **começou**. Não diz nada sobre adesão | Fornecedor | [ovationup.com](https://ovationup.com/) · [get.tattleapp.com](https://get.tattleapp.com/features/item-level-feedback/) |
| 4 | **Segunda onda por SMS, 24h depois** | até 42% | Sobre base filtrada **duas vezes**: já respondeu a primeira pesquisa **e** consentiu em responder mais. Não comparável ao recibo | Fornecedor, e a comparação original era inválida | [ovationup.com](https://ovationup.com/news-releases-ovation-adds-custom-questions-to-actionable-guest-feedback-loop/) |
| 5 | **SMS pós-transação contra e-mail** | `SMS surveys see 5x higher response rates than email` | Relativo, sem valor absoluto de nenhum dos dois | Fornecedor | [get.tattleapp.com](https://get.tattleapp.com/features/feedback-collection/) |
| 6 | **SMS pós-visita, pesquisa de duas perguntas** | `up to a 20% take rate` | Adesão sobre clientes contatados. É o número mais próximo de uma taxa de resposta real da lista | Fornecedor | [ovationup.com](https://ovationup.com/) |
| 7 | **Pesquisa digital pós-transação, penetração** | ~10% sobre transações | Penetração sobre o total de transações. Base honesta, número modesto | Fornecedor | [get.tattleapp.com](https://get.tattleapp.com/features/item-level-feedback/) |
| 8 | **QR Code fixo na mesa ou no cardápio, como canal adicional** | `aumentar em até 15%` | **Incremento** sobre o volume que o tablet já gera, não taxa própria. E exige antifraude | Fornecedor interessado | [risposta.app](https://www.risposta.app/risposta-qr-code/) |
| 9 | **Pesquisa longa tradicional** | `about 0.1%` | Adesão. O mesmo fornecedor publica 0,1% aqui e menos de 0,5% no release, o que é inconsistência dele | Fornecedor | [ovationup.com](https://ovationup.com/) |
| 10 | **Convite impresso no recibo** | `less than 0.5% completion rate` | Adesão sobre todos os clientes. É o piso do mercado | Fornecedor | [ovationup.com](https://ovationup.com/news-releases-ovation-adds-custom-questions-to-actionable-guest-feedback-loop/) |

**O sinal qualitativo mais valioso da tabela não é um número.** É a SMG, que construiu o mercado global de pesquisa por convite no recibo, declarando publicamente que `it's no longer enough to rely on receipt-based invitations` ([marketing.smg.com](https://marketing.smg.com/smg-program-methodology-digital-invitations)). Quando o dono do modelo diz que o modelo acabou, isso vale mais que qualquer benchmark de concorrente, porque é declaração contra o próprio interesse.

**A regra prática que sai daqui:** o canal ganha quando a pesquisa acontece **dentro** de um momento que o cliente já ia viver (pagar a conta, com o garçom presente) e perde quando depende de o cliente tomar uma iniciativa depois (escanear um adesivo, abrir um e-mail, ler um recibo). Tudo o mais é detalhe.

---

## 4. Os 36 fornecedores, ordenados por relevância para este caso

Ordem de relevância para uma pizzaria de um salão que vai construir o próprio sistema, não ordem alfabética nem de tamanho de empresa. Preço marcado como **OFICIAL** foi lido em página do próprio fornecedor. **TERCEIRO** significa agregador ou blog, não confirmado oficialmente. **NÃO PÚBLICO** significa que não existe valor divulgado.

| # | Fornecedor | País | Preço | Mecânica pela qual vale ser lembrado |
|---|---|---|---|---|
| 1 | **Ovation** | EUA | **NÃO PÚBLICO.** Nomes de plano Plus e Growth citados em release, **NÃO VERIFICADOS**. O fornecedor de maior confiança do levantamento não tem nenhuma âncora de custo | Pesquisa de duas perguntas, com o questionário longo voltando 24h depois em segunda onda segmentada |
| 2 | **Tattle** | EUA | **OFICIAL:** US$ 125 por loja/mês (5 a 10 unidades), 100 (11 a 20), 85 (21 a 50), 65 (51 a 200). O "$59" da pesquisa original só existe em meta tag invisível: **descartado.** FAQ oficial declara mínimo de 10 lojas | Feedback por item consumido com atributos desmembrados, e nota do item comparada à média do cardápio |
| 3 | **TableSafe (RAIL)** | EUA | **NÃO PÚBLICO.** Adquirida pela Mad Mobile em 28/10/2021 | Captura dentro do fluxo de pagamento, e banco de perguntas com uma fixa e duas sorteadas. Teto de três perguntas |
| 4 | **Momos** | Singapura / EUA | **NÃO PÚBLICO** (terceiro estima acima de US$ 100 por local, estimativa) | Recuperação do insatisfeito como produto, com crédito no PDV, CSAT de recuperação e receita recuperada atribuída |
| 5 | **Risposta** (incumbente) | Brasil | **NÃO PÚBLICO** na página consultada nesta rodada. A seção 02 confirmou piso na home. Fato conhecido: a QT paga R$ 501 a R$ 1.000/mês | O anonimato é o que gera os 90% do tablet, e o QR sozinho exige antifraude. O achado melhor sustentado do levantamento |
| 6 | **HappyOrNot** | Finlândia | **NÃO PÚBLICO.** O "~US$ 100/mês por totem" foi **REFUTADO**: o modelo é setup mais assinatura anual por mix de pontos de coleta | Anonimato total como gerador de volume, e cobrança por ponto de coleta com respostas ilimitadas |
| 7 | **Olo / Wisely** | EUA | **NÃO PÚBLICO** | Sentimento frase por frase, biblioteca de respostas pré-aprovadas com IA, e GLV e churn risk preditos por ML |
| 8 | **Medallia** | EUA | **NÃO PÚBLICO** | Smart Closed Loop: cada feedback negativo é ticket com dono, prazo e desfecho, não linha de relatório |
| 9 | **SevenRooms** | EUA | **NÃO PÚBLICO** | AI Feedback Summary: digest automático em linguagem natural, em vez de painel que ninguém abre |
| 10 | **Yumpingo / BBI Survey Studio** | Reino Unido / EUA | **NÃO PÚBLICO.** Páginas oficiais retornam 403, tudo apoiado em release de 2022 | Feedback por prato atribuído simultaneamente a loja, turno, garçom, prato e canal |
| 11 | **Marqii** | EUA | **OFICIAL:** US$ 90 (Base), 145 (Pro), 180 (Full Suite) por local/mês, contrato anual. Add-on por review respondida de US$ 2,00 a 0,75. **Único preço 100% auditável do levantamento** | PDV como fonte da verdade do menu, propagado para diretórios. E cobrança por review respondida |
| 12 | **Paytronix** | EUA | **NÃO PÚBLICO** | Resposta amarrada à conta do cliente na hora, recompensa por responder, e amostragem por regra |
| 13 | **Bikky** | EUA | **NÃO PÚBLICO.** Modelo declarado: por loja/mês, sem taxa de integração nem de implementação | PDV legado e on-premise tratado como cidadão de primeira classe. O problema exato do Altec/Next |
| 14 | **Podium** | EUA | **TERCEIRO:** a partir de US$ 399/mês, **não confirmado.** O mais caro por unidade da lista | Follow-up condicional por SMS: a segunda pergunta muda conforme a primeira resposta |
| 15 | **SurveySparrow** | Índia / EUA | **TERCEIRO:** a partir de US$ 19/mês em cobrança anual, teto de ~2.500 respostas por **ano**. Free de 75 respostas por trimestre. Sem opção mensal | Pesquisa conversacional, uma pergunta por vez em formato de chat |
| 16 | **Zonka Feedback** | Índia | **NÃO PÚBLICO** hoje (abandonou a transparência). Terceiro histórico: ~US$ 199 e ~US$ 999/mês | Coleta offline que sincroniza depois, WhatsApp nativo, e CX por atendente como dimensão de primeira classe |
| 17 | **Birdeye** | EUA | **NÃO PÚBLICO.** Os tiers US$ 299/349/449 foram **REFUTADOS**: a página oficial declara preço customizado | Competitors AI: medir a própria nota contra a dos concorrentes do mesmo raio |
| 18 | **Presto Automation** | EUA | **NÃO PÚBLICO** | Valor negativo: é o caso de fracasso do negócio de tablet de mesa. Ver seção 6 |
| 19 | **Intouch Insight** | Canadá | **NÃO PÚBLICO** | Cliente oculto, auditoria, checklist e pesquisa na mesma base, cruzados no mesmo turno. E coleta de preço do concorrente na visita |
| 20 | **ReviewTrackers** | EUA | **NÃO PÚBLICO:** a página oficial deixa o valor literalmente em branco. Terceiros: ~US$ 69 a 89/mês para uma unidade, não confirmado | Tier Data Only: vender review bruto para o cliente processar na própria plataforma. Usuários ilimitados |
| 21 | **Falaê** | Brasil | **NÃO PÚBLICO** | Contraste que calibra a estratégia: amarrar feedback ao pedido do PDV e identificar prato e atendente **já existe no Brasil** |
| 22 | **Popmenu** | EUA | **TERCEIRO:** US$ 179/299/499. Página oficial retornou 403 e a URL citada era canadense (dúvida CAD vs USD) | Menu interativo como instrumento de medição antes do consumo |
| 23 | **Owner.com** | EUA | **OFICIAL** (verificador subiu a confiança): US$ 249/mês mais 5% por pedido, ou US$ 499/mês sem taxa, mês a mês sem contrato longo | Dois planos com ponto de equilíbrio explícito. Modelo comercial honesto e raro |
| 24 | **Guestmeter** | DESCONHECIDO | **NÃO VERIFICÁVEL.** Página de preços em HTTP 503 e **certificado TLS expirado**, sinal de abandono. Não recomendar | QR card impresso entregue no ponto da experiência, em vez de adesivo fixo na mesa |
| 25 | **Delighted (Qualtrics)** | EUA | **ENCERRADO.** Sunset em 30/06/2026, data já passada. A escada de US$ 19 a 249 é histórica e não é mais cotável | Cobrar por resposta/mês com features iguais em todos os planos. Não serve mais como referência de valor |
| 26 | **Punchh (PAR)** | EUA | **NÃO PÚBLICO** | Identidade persistente do cliente: é o que permite amarrar a resposta ao histórico, não à visita isolada |
| 27 | **Thanx** | EUA | **NÃO PÚBLICO.** Nada verificado em página oficial | Nenhuma mecânica proprietária identificável. Relevante só como camada de identidade |
| 28 | **GuestXM (Black Box)** | EUA | **NÃO PÚBLICO** | Cruzar satisfação com dado de força de trabalho: "a nota caiu porque a equipe rotacionou", não só "a nota caiu" |
| 29 | **SMG / smg360** | EUA | **NÃO PÚBLICO.** A página de preços existe, descreve pacotes e não exibe um único valor | O dono do modelo de pesquisa por recibo declarando que o recibo acabou. Declaração contra o próprio interesse |
| 30 | **Cloutly** | Austrália | **NÃO VERIFICÁVEL.** O "a partir de US$ 27" foi **REFUTADO** (a página não tem nenhum valor no HTML). Terceiros divergem entre US$ 29 e 99 | Serviria de piso de preço do mercado global, mas o piso não existe. Ver seção 5 |
| 31 | **Qualtrics** | EUA | **NÃO PÚBLICO.** Free de 500 respostas **vitalícias** (não mensais) e 3 pesquisas. Self-service pago em Strategic Research a ~US$ 420/mês | Rigor metodológico. Com 50 a 200 respostas por mês, significância estatística é problema real antes de julgar item individual |
| 32 | **InMoment** | EUA | **NÃO PÚBLICO** | Roteamento do detrator para o dono do problema, não para caixa genérica. **Lacuna: sem nenhuma fonte oficial** |
| 33 | **Reputation.com** | EUA | **NÃO PÚBLICO** | Fundir feedback privado (pesquisa) e público (review) na mesma base de sentimento. **Lacuna: sem nenhuma fonte oficial** |
| 34 | **Chatmeter** | EUA | **NÃO PÚBLICO** | Extrair tema de milhões de textos sem categoria pré-definida: descobrir o problema que você não pensou em perguntar. **Lacuna: sem fonte oficial** |
| 35 | **Feedier** | França | **NÃO VERIFICADO.** Nenhuma fonte encontrada | Nada verificado. Ausente de todos os comparativos de feedback para restaurante consultados |
| 36 | **Ipsos** | França | **NÃO VERIFICADO.** Nenhuma fonte encontrada | Nada verificado. É instituto de pesquisa, modelo de estudo pontual, não plataforma contínua. Isso é inferência, não fato |

**Registro de lacuna importante.** Os itens 32, 33 e 34 (InMoment, Reputation.com, Chatmeter) repousam **integralmente** em um blog comparativo escrito pela Tattle, que é concorrente direta deles e que, segundo o próprio levantamento, não lista uma única fraqueza de concorrente. Na prática esses três fornecedores estão sem fonte. As mecânicas atribuídas a eles são plausíveis e batem com o que Medallia e Olo fazem com fonte melhor, mas não devem ser citadas como fato verificado.

---

## 5. O piso de preço do mercado global para uma unidade

A pesquisa original afirmava que o piso do mercado global era de US$ 60 a 90 por loja/mês. O verificador desmontou essa faixa: ela era internamente inconsistente (o mesmo parágrafo citava Cloutly a US$ 27 e Guestmeter a US$ 49, ambos abaixo do próprio piso declarado) e três dos valores que a compunham (Birdeye, HappyOrNot, Cloutly) não se sustentam em fonte oficial.

**O piso auditável, contando só o que foi lido em página oficial do fornecedor:**

| Fornecedor | Preço oficial para uma unidade | Serve para a QT? |
|---|---|---|
| **Marqii Base** | US$ 90/local/mês, contrato anual | Vende para uma unidade, mas **não faz pesquisa de satisfação**. É gestão de presença e reputação. First-party review só no tier de US$ 180 |
| **Tattle** | US$ 125/loja/mês, faixa de 5 a 10 unidades | **Não vende para a QT.** O FAQ oficial é explícito: `Tattle is primarily designed for brands with 10 locations and more. We don't recommend brands with fewer than 10 locations` ([FAQ oficial](https://get.tattleapp.com/resources/faq/)) |
| **Owner.com** | US$ 249/mês mais 5% por pedido, ou US$ 499/mês | Vende para uma unidade, mas **não é produto de experiência do cliente**: não faz pesquisa, não tem feedback por item, não tem recuperação |

Ou seja: **o único preço oficial que um restaurante de uma unidade poderia efetivamente contratar neste levantamento é US$ 90/mês da Marqii, e a Marqii não faz o que a QT precisa.** Tudo o que era mais barato (Cloutly, Guestmeter, HappyOrNot, Birdeye, Delighted) caiu na verificação: refutado, não verificável, produto encerrado, ou infraestrutura degradada.

**A comparação com o que a QT paga hoje.** Usando a taxa implícita de ~R$ 5,40 por dólar que a pesquisa original aplicou nas suas próprias conversões (taxa **NÃO VERIFICADA**, conferir a cotação do dia antes de usar em conta), os US$ 90 do piso auditável ficam por volta de R$ 490/mês. A QT paga hoje entre R$ 501 e R$ 1.000/mês. Com 50 a 200 respostas por mês, isso equivale a **R$ 2,50 a R$ 20 por resposta coletada**.

A leitura correta, que é contraintuitiva e vale registrar: **o piso auditável é mais alto do que a pesquisa original dizia, e isso fortalece a decisão de construir, não a enfraquece.** Não existe uma opção global barata e adequada que tenha sido escondida por um erro de pesquisa. O que existe é um mercado onde o produto adequado (feedback por item amarrado à comanda, alerta em tempo real, segunda onda) é vendido a partir de US$ 125 por loja e com mínimo de 10 lojas, e onde o produto acessível a uma unidade não faz nada disso.

**Três lacunas que o verificador registrou e que precisam ficar visíveis, porque afetam essa conclusão:**

1. **A pergunta que decide a compra não foi pesquisada.** Ninguém testou se existe algum fornecedor global que venda para **uma** unidade abaixo de ~US$ 50/mês **com** feedback amarrado ao item. O levantamento mapeou o topo do mercado com profundidade e o piso de forma superficial. A decisão de construir está bem apoiada, mas não está testada contra a alternativa mais barata possível.
2. **Nenhum dos preços confirmados foi verificado para cliente fora dos EUA.** Faturamento no Brasil, cobrança em real, disponibilidade de SMS e WhatsApp nesses produtos: nada disso foi checado. Na prática isso pode eliminar vários deles independentemente de preço.
3. **As condições contratuais da Tattle não foram confirmadas.** Um resultado de busca indica `no annual contracts, month-to-month, cancel anytime`, o que não foi lido em página oficial. Muda a comparação com Marqii e Birdeye, que exigem contrato anual.

---

## 6. Aviso sobre o negócio de tablet de mesa: o caso Presto

**O que aconteceu.** A Presto Automation era referência em tablet de mesa para restaurante (pedido, pagamento e pesquisa na mesa). Em 2024 ela **cindiu esse negócio** para apostar tudo em IA de voz para drive-thru. Perdeu com isso a maior parte da receita, foi **delistada da Nasdaq**, passou por execução de dívida com troca de controle (o credor Metropolitan Partners assumiu), e em janeiro de 2026 levantou US$ 10 milhões para escalar o novo negócio, hoje com 12 marcas atendidas. Fontes: [restaurantdive.com](https://www.restaurantdive.com/news/presto-automation-is-risking-its-business-on-drive-thru-voice-ai/709610/), [restaurantbusinessonline.com](https://www.restaurantbusinessonline.com/technology/ai-supplier-presto-sold-group-including-lender-former-investor), [restauranttechnologynews.com](https://restauranttechnologynews.com/2026/01/presto-raises-10-million-to-scale-voice-ai-deployments-as-restaurant-drive-thru-automation-enters-its-prove-it-era/).

**O que isso significa.** O que quebrou foi o **modelo de negócio de vender tablet de mesa como plataforma**: capital imobilizado em hardware, logística de reposição, locação por loja, dependência de um fornecedor para o dispositivo funcionar. Quem monta esse negócio carrega o custo do hardware e precisa cobrar mensalidade alta para cobrir, e a mensalidade alta é justamente a dor declarada da QT com o Risposta. A Presto é a prova de que essa conta não fecha nem para quem tinha capital de mercado aberto.

**O que isso NÃO significa.** Não significa que tablet no salão não coleta resposta. A evidência aponta na direção oposta, e é a mais consistente deste levantamento: a Risposta atribui `cerca de 90% das opiniões registradas` ao tablet, a TableSafe relata 80% de resposta no dispositivo à mesa, e o Yumpingo depende de dispositivo próprio no salão justamente para atingir os volumes que anuncia. **O canal funciona. O negócio de alugar o canal é que não funciona.**

**O que muda para quem vai comprar tablets Android baratos e rodar software próprio.** A QT inverte exatamente a economia que matou a Presto: o hardware passa a ser despesa única e pequena, sem mensalidade por dispositivo, sem contrato e sem fornecedor no meio. Nesse arranjo o caso Presto é um argumento **a favor** da decisão, não contra.

Mas o risco não desaparece, ele muda de dono. Antes ele era do Risposta, que trocava o tablet quebrado. Agora é da QT, e com a restrição de que ninguém vai manter o sistema:

- **Tablet quebra, cai, é roubado e a bateria morre.** Compre pelo menos dois a mais do que os quatro pontos previstos, na mesma viagem e no mesmo modelo. Reposição em dois anos, do Paraguai, com o modelo fora de linha, é problema garantido.
- **Não assine nada de MDM.** Uma assinatura de gestão de dispositivo recria a mensalidade que o projeto quer matar. Modo quiosque nativo do Android mais um atalho de tela cheia resolve.
- **Nada de app de loja.** A coleta tem que ser uma página web aberta em quiosque no navegador. Aplicativo publicado em loja exige conta de desenvolvedor, assinatura de build, atualização e alguém acompanhando política de plataforma. Isso é manutenção perpétua, e é exatamente o que não pode existir aqui.
- **QR permanente como caminho paralelo, não como plano B guardado na gaveta.** Se o tablet morre numa sexta cheia, o QR na conta tem que estar impresso e funcionando naquela noite. Isso custa um adesivo e uma rota no sistema.
- **Tablet Android de entrada envelhece rápido.** Em três anos o navegador dele pode não rodar o que você escrever hoje. Escreva a tela de coleta com o mínimo de dependência possível, sem framework moderno na ponta se der para evitar. É a tela que menos pode quebrar e a que menos vai ser mexida.

---

## 7. O que ninguém no mundo faz e o cliente quer fazer

Rigor aqui é obrigatório: onde alguém já faz, este documento diz que faz e diz quem.

### 7.1 Satisfação cruzada com CMV e ficha técnica: não encontrei ninguém. Confiança média

Nenhum dos 36 fornecedores cruza nota de satisfação com **custo** do prato ou com margem por item. O mais perto que o mercado chega:

- **Tattle** liga satisfação a **receita**, com dashboard de Revenue Analysis e módulo de análise de promoção temporária que mede se a LTO trouxe cliente novo e aumentou ticket.
- **Yumpingo** declara conectar dado de satisfação a performance financeira.
- **Bikky** faz análise de menu sobre dado de PDV.

Todos param na receita. Nenhum entra na ficha técnica. Isso faz sentido do lado deles: fornecedor de CX não tem acesso ao custo de insumo do cliente, e ficha técnica é dado que vive em outro sistema (no caso da QT, em skills separadas do Claude Code).

**Veredito.** É o diferencial mais defensável dos três que o briefing lista, e é defensável justamente porque depende de um dado que só quem está dentro do restaurante tem. Mas atenção ao rigor: ausência de evidência nestas fontes não é prova de ausência no mundo. **Confiança média.** E o esforço é alto: depende da importação do R3, de uma tabela própria de itens e custos no sistema, e da resolução da tensão de arquitetura que o briefing já identificou (manter as fichas separadas e alimentar o sistema por importação).

### 7.2 Previsão de recompra: já existe, e bem feito. Não é diferencial

Isto **já é produto de mercado**, com nome e método. A **Olo Guest Data Platform** (ex-Wisely) unifica PDV, pedido online, fidelidade e feedback em perfil individual e prediz **guest lifetime value** e **churn risk** por machine learning para segmentar campanha ([olo.com/gdp](https://www.olo.com/gdp)), e o verificador confirmou isso. A **Bikky** faz frequência e lifetime value como CDP. A **Ovation** tem alerta de cliente em risco.

**Veredito honesto: aqui a QT está correndo atrás, não na frente.** E é mais difícil para ela do que para eles, por uma razão estrutural: a coleta é anônima. Sem identidade, a pesquisa não alimenta previsão de recompra. A identidade útil da QT não vem da pesquisa, vem do **CRM de reservas que já está no ar** e do contato opcional deixado no fim. É onde a previsão de recompra deve ser ancorada, na fase 2, como o briefing já prevê. Vender isso como "o que nenhum concorrente entrega" seria impreciso.

### 7.3 Conversa com os dados em linguagem natural: ninguém neste levantamento faz, mas o fosso é raso

Nenhum dos 36 vende "pergunte aos seus dados em linguagem natural" para experiência do cliente em restaurante. O que existe é o degrau anterior: **digest** automático em texto (SevenRooms AI Feedback Summary) e plano de ação periódico gerado por IA (Tattle Objectives, nível de local, ciclo de 30 dias).

**Veredito.** Duas ressalvas que importam mais que a novidade:

1. **O fosso competitivo é raso.** Consultar banco com LLM é capacidade genérica hoje. Que ninguém deste levantamento venda isso diz mais sobre o mercado de CX de restaurante do que sobre a dificuldade da coisa.
2. **É a feature que mais briga com a restrição central do projeto.** Tradução automática de pergunta para SQL erra em silêncio: devolve um número plausível e errado, e ninguém vai auditar. Num sistema que ninguém mantém, isso é pior que não ter a feature.

O caminho seguro é o inverso do texto livre: um conjunto fixo de perguntas escritas por você, com a consulta pronta e revisada, e a IA apenas redigindo a resposta em português a partir do resultado. Perde-se a mágica de perguntar qualquer coisa e ganha-se o direito de confiar na resposta. E isso só depois do digest diário estar no ar e funcionando.

### 7.4 O que é genuinamente raro e ninguém está fazendo assim

- **O conjunto todo em uma unidade só.** Feedback por item com atributos, banco de perguntas rotacionadas, anonimato, sentimento frase por frase e digest diário existem no mundo, mas cada pedaço em um fornecedor diferente, todos multi-loja, todos em inglês e nenhum abaixo de US$ 125 por loja com mínimo de 10 lojas. Reunir isso em um salão, em português, com infra perto de zero, não tem precedente nas fontes consultadas.
- **Pesquisa mais CRM de reserva mais importação de PDV na mesma base, para uma unidade.** O mercado só tem isso em escala enterprise (Olo, Bikky), sempre por cima de PDV em nuvem americano.

### 7.5 O que parece diferencial e não é

**Alerta em tempo real com o cliente ainda no salão não é diferencial.** Ovation, HappyOrNot, Medallia e InMoment todos vendem alerta em tempo real. O detalhe da QT (o alerta carregar o número da mesa e o item da comanda) não aparece documentado assim nas fontes, mas a mecânica é padrão de mercado. Trate como paridade competitiva obrigatória, não como vantagem.

**Amarrar feedback ao pedido do PDV também não é diferencial, e nem no Brasil.** A Falaê declara integração com PDV associando o feedback diretamente aos pedidos, permitindo identificar prato, atendente e processo. **Lacuna registrada pelo verificador:** a Falaê não foi verificada nesta rodada, uma das fontes é um revendedor e não fonte primária, e a conclusão estratégica de que "o gap brasileiro é profundidade, não integração" depende inteiramente de testar se a Falaê já faz atributo por item e segunda onda. Antes de afirmar que a QT tem algo que a Falaê não tem, verifique.

---

## 8. Fechamento: a ordem de implementação, do maior retorno pelo menor esforço ao contrário

| Ordem | Mecânica | Esforço | Por que nesta posição |
|---|---|---|---|
| 1 | **Uma pergunta por tela, no máximo três perguntas, e encerra** | Mínimo | É desenho, não código. É o único dado empírico sobre onde a taxa de resposta despenca, e traduz literalmente o limite de 45 segundos |
| 2 | **Banco de perguntas rotacionadas: uma fixa e duas sorteadas** | Baixo (uma tabela e um sorteio) | Resolve profundidade sem fricção **e** manutenção zero: a pesquisa se renova sozinha sem ninguém reescrever nada |
| 3 | **Digest diário às 16h, em linguagem natural, por área** | Baixo (rotina agendada, consulta, prompt) | É a definição de sucesso número 3 do projeto e a resposta direta à dor de relatório raso. Maior retorno absoluto do documento |
| 4 | **Nota do item comparada à média do cardápio** | Mínimo (uma view no banco) | Muda a leitura de todo o dado coletado. Nota absoluta em restaurante não informa nada |
| 5 | **Antifraude e anonimato: uma resposta por comanda, janela de tempo, PIN do garçom** | Baixo | Sem isso o painel inteiro é decorativo. O próprio incumbente publica que o risco do QR é manipulação pela equipe |
| 6 | **Lógica condicional: nota baixa abre o caminho de prato, nota alta encerra** | Baixo | Já é decisão do briefing. Custa um `if` e economiza segundos de todo mundo que estava satisfeito |
| 7 | **Sentimento frase por frase, com área e polaridade** | Baixo (um prompt com saída estruturada) | Alimenta o filtro por área do digest. Custo R$ 0 na camada gratuita. Guardar o texto cru sempre |
| 8 | **Alerta em tempo real ao gerente, com mesa e horário** | Baixo a médio | A única recuperação viável aqui: janela de minutos, dono claro, custo zero, ferramenta humana |
| 9 | **Fila local no tablet para não perder resposta** | Médio | O briefing diz que não é requisito, só seguro. Barato como fila no navegador, caro como app |
| 10 | **Feedback por item consumido, com três atributos, só quando a nota é baixa** | Médio a alto | Retorno alto (engenharia de cardápio), mas depende da pendência do que o Altec/Next expõe. Tem plano B degradado que entrega a maior parte do valor |
| 11 | **Segunda onda 24h por e-mail, para quem deixou contato** | Médio | Retorno real mas limitado pelo tamanho da base com contato e pelo canal e-mail. Exige consentimento registrado |
| 12 | **Ticket de recuperação com dono e prazo, que fecha sozinho se ninguém tratar** | Médio | O gargalo é humano, não técnico. Desenhe para morrer sozinho, nunca uma fila que cresce para sempre |
| 13 | **Satisfação cruzada com CMV** | Alto | O diferencial mais defensável, e o mais caro: depende do import do R3, de tabela própria de custos e da tensão de arquitetura com as fichas técnicas |
| 14 | **Biblioteca de respostas pré-aprovadas com IA preenchendo nome e prato** | Baixo técnico, retorno baixo | O sistema não responde review público, então o caso de uso encolheu. IA sempre na coleira, nunca solta |
| 15 | **Coorte de receita recuperada** | Alto | Depende de identidade persistente que a coleta anônima não fornece. Só faz sentido depois do CRM |
| 16 | **Previsão de recompra** | Alto | Fase 2, ancorada no CRM de reservas. E não é diferencial: Olo e Bikky já fazem com ML |
| 17 | **Conversa com os dados em linguagem natural** | Alto, e com risco de manutenção | Só com consultas fixas e revisadas, nunca texto livre para SQL. Depois do digest, não antes |
| 18 | **Benchmark automático contra concorrentes do mesmo raio** | **IGNORAR** | Raspagem frágil que quebra sozinha e exige quem conserte. Contradiz "somente link" e a restrição de manutenção. Faça à mão, por trimestre |
| 19 | **Crédito no PDV, pedir para editar review pública, recompensa por responder, checklist cruzado com nota, menu interativo** | **IGNORAR** | Todas boas mecânicas, todas fora do escopo que o briefing fechou. Estão aqui para não serem redescobertas por acidente daqui a seis meses |

**A frase para levar.** As quatro primeiras linhas desta tabela custam pouquíssimo trabalho, não existem em nenhum fornecedor brasileiro juntas, e cobrem a maior parte da distância entre o que a QT tem hoje e o que ela quer. Tudo abaixo da linha 10 pode esperar sem prejuízo.
