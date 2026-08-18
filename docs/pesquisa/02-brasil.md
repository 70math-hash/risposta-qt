# 02. Mercado brasileiro: concorrentes diretos e suítes de gestão com CX embutido

> Base: `dados/02-br-diretos.json` (23 players de pesquisa/CX/reputação), `dados/07-suites.json` (23 suítes e ecossistemas de gestão) e `dados/09-verif-br-diretos.json` (verificação adversarial, veredito **PARCIAL**, 10 correções).
> Onde o verificador refutou a pesquisa original, este documento usa a versão corrigida e diz isso no texto. Preço que não foi lido em página oficial aparece como **NÃO PÚBLICO** ou **NÃO VERIFICADO**, sem exceção.

---

## 1. A leitura de mercado em cinco linhas

1. Existe concorrência vertical de verdade, mas ela é pequena e opaca: só a Falae disputa o mesmo cliente de frente, e ela não publica preço em nenhuma página acessível.
2. O preço público desse mercado é uma anomalia. O Risposta é um dos pouquíssimos que publica piso (R$ 150 e R$ 200/mês), e a faixa paga hoje (R$ 501 a R$ 1.000/mês) fica muito acima de qualquer valor publicado por qualquer fornecedor com escopo comparável.
3. Ferramentas genéricas de pesquisa entregam de 7 a 27 vezes o volume necessário por R$ 48 a R$ 90/mês, o que redefine o teto econômico de qualquer solução, comprada ou construída.
4. Suítes de gestão quase sempre vendem fidelidade, cashback e disparo de WhatsApp e chamam isso de avaliação. Só quatro têm pesquisa estruturada nativa verificada em página oficial (Tagme, Goomer, Zig e Teknisa), e nenhuma das quatro é o PDV atual.
5. O PDV já pago (Altec/Next) não entrega nada de CX, portanto não há pagamento em duplicidade hoje, e o único gargalo técnico real do projeto é que ele também não expõe API nem webhook.

---

## 2. Concorrentes diretos verticalizados

O filtro aqui é duro: disputa o mesmo cliente quem vende coleta de opinião para restaurante de salão, com produto vertical de food service ou com mecânica de mesa equivalente.

| Fornecedor | Porte declarado | Canais de coleta | Preço | Link |
|---|---|---|---|---|
| **Falae** | Faixa não auditável: "mais de 1600 operações" no site, 1.563 em landing própria, "mais de 700" em material de parceiro e "mais de 2.000" na imprensa. Captou R$ 1,5 milhão em abr/2026, liderado pela Investidores.vc, com meta declarada de 5.000 restaurantes até 2027 | QR Code na mesa, **Tablet**, **Totem**, WhatsApp, SMS, e-mail, link no WiFi | **NÃO PÚBLICO.** `/planos` retornou 404. O valor "a partir de R$ 180" circula em resumo de busca e **NÃO FOI CONFIRMADO** em fonte primária: não use | [falae.app](https://falae.app/) |
| **Harmo** (ex-Reviewr) | 30.000+ lojas, Reclame Aqui sócio com 20% do capital, clientes de rede (Burger King, Bob's, C&A, Cinemark) | Pesquisa própria por WhatsApp, e-mail, SMS, QR Code, push, widget e link, mais leitura de reviews do Google. Tablet e totem **não documentados** | **NÃO PÚBLICO.** Os próprios Termos de Uso descrevem a fórmula: quantidade de locais, mais locais de concorrentes monitorados, vezes valor unitário por local | [harmo.me](https://harmo.me/) |
| **Risposta** (fornecedor atual, baseline) | NÃO PÚBLICO | Tablet em mesa, QR Code, NFC, links, delivery | **A partir de R$ 200/mês** com 30 dias de teste (home). **A partir de R$ 150/mês** no modo somente QR Code | [risposta.app](https://www.risposta.app/) |
| **Solvis** | 20+ anos, 4.000 restaurantes (dado em páginas internas, não na home) | Totem físico, tablet, QR Code, pesquisa online, assinatura de e-mail | **NÃO PÚBLICO**, só proposta comercial | [solvis.com.br](https://solvis.com.br/) |
| **Opinae** | NÃO PÚBLICO | Tablet e totem em modo quiosque, QR Code dinâmico, link por e-mail ou WhatsApp. Opera offline e sincroniza depois | **NÃO PÚBLICO.** Existem páginas de planos e preços, sem valores | [opinae.com.br](https://opinae.com.br/) |
| **ReviewBR** (direto só no eixo Google) | NÃO PÚBLICO | WhatsApp, canal único | **R$ 79,90** (100 fluxos/mês), **R$ 139,90** (1.500), **R$ 299,00** (ilimitado). Sem fidelidade contratual | [reviewbr.com](https://reviewbr.com/home) |
| **Ecoa** (Geengoo) | Não verificável. **Confiança baixa** | QR Code na mesa, canal único | **NÃO PÚBLICO** | [geengoo.com/ecoa](https://geengoo.com/ecoa) |

### Quem realmente disputa o mesmo cliente

**A Falae, e só ela.** É vertical em food service, tem capital fresco, produz conteúdo que domina a busca de "reputação Google restaurante" e já publicou publieditorial no [SindRio](https://www.sindrio.com.br/2026/07/seu-restaurante-esta-invisivel-no-google-a-culpa-pode-ser-da-sua-reputacao-digital/), o sindicato de bares e restaurantes do Rio. Ela está literalmente atacando o mesmo território geográfico.

**Duas correções do verificador mudam o mapa competitivo e precisam ficar explícitas**, porque desmontam o argumento de diferenciação do fornecedor atual:

1. A pesquisa original afirmava que a Falae não documenta tablet nem totem, e que essa era uma "lacuna material" a favor do Risposta. **Refutado em página oficial.** A landing da Falae diz literalmente que a pesquisa é um link acessível por QR Code, Tablet, Totem ou envio por WhatsApp ([conteudo.falae.app](https://conteudo.falae.app/demo-gratuita-site-v2)). O hardware não é diferencial exclusivo do Risposta.
2. A pesquisa original afirmava que a centralização de avaliações externas só existia de forma verificável no Risposta e na Harmo. **Refutado no próprio domínio da Falae:** "Monitore e melhore sua reputação online em Google, TripAdvisor e iFood" ([falae.app/conheca-o-falae-p3](https://falae.app/conheca-o-falae-p3/)). São três os fornecedores com centralização verificável, e a Falae cobre um canal a mais.

A **Harmo joga outro campeonato**. Os Termos de Uso dela deixam o modelo econômico explícito: quanto maior a rede, menor o custo unitário por loja. Isso penaliza estruturalmente o operador de uma unidade. Uma pizzaria de um salão não é cliente-alvo dela, e ela não vai brigar por esse contrato. Também vale rebaixar a confiança da lista de integrações da Harmo: só o Google Perfil de Empresas foi confirmado como conector técnico em página oficial. iFood, TripAdvisor, Facebook e Reclame Aqui **NÃO FORAM VERIFICADOS** como integrações de leitura de review (o Reclame Aqui é sócio acionário, o que não implica integração de produto).

A **Solvis** vende para alimentação coletiva e restaurante corporativo, onde a pesquisa serve como prova documental de SLA na renovação de contrato. Esse argumento de valor não existe em restaurante à la carte próprio.

O **Ecoa** merece um aviso de rigor: a ficha inteira dele vem de um único artigo de terceiro, e nenhuma página oficial do produto foi lida em nenhuma rodada. A arquitetura dele (QR na mesa, nota por dimensão, IA classificando em tempo real, brinde e convite ao Google para promotor, follow-up para neutro, alerta imediato ao dono para detrator) é o melhor desenho funcional encontrado no mercado brasileiro e vale copiar, mas é **fonte única não primária**. Não trate como fato assentado.

---

## 3. Ferramentas genéricas de pesquisa e NPS com preço público

Aqui entram só as plataformas horizontais que publicam tabela. Elas não são food service, não leem Google nem iFood, e é exatamente por isso que servem como régua limpa de preço por capacidade de coleta.

Ordenado pelo custo mensal efetivo mais baixo de cada plano. A necessidade real é de **600 a 2.400 respostas por ano**.

| # | Plano | Custo mensal efetivo | Capacidade e limites do plano | Cobre a necessidade? |
|---|---|---|---|---|
| 1 | **Avalio Starter** | **R$ 47,92** (R$ 575,00/ano à vista) ou 12x R$ 64,00 (R$ 768,00) | 16.000 respostas/ano, 1 usuário, convites por e-mail ilimitados, modo totem, IA (50.000 tokens), API REST | Sim, 6,7 a 26,7 vezes o necessário |
| 2 | **Avalio Standard** | **R$ 67,50** (R$ 810,00/ano) ou 12x R$ 90,00 | 20.000 respostas/ano, 1 usuário, 5.000 convites/ano, totem, IA (50.000 tokens), API | Sim, com folga absurda |
| 3 | **Avalio Premium** | **R$ 105,19** (R$ 1.262,25/ano) ou 12x R$ 140,25 | 50.000 respostas/ano, 3 usuários, 50.000 convites/ano, totem, IA (150.000 tokens), API | Sim, superdimensionado |
| 4 | **Avalio Platinum** | **R$ 233,33** (R$ 2.800,00/ano) ou 12x R$ 312,00 | 100.000 respostas/ano, 10 usuários, 100.000 convites/ano | Irrelevante nesse volume |
| 5 | **NPS Fast Básica** | **R$ 250,00/mês** | Totem físico, QR Code, SMS, e-mail, ligação telefônica, link, embed. **Sem API. Sem nenhuma IA em todo o site.** Trial de 7 dias | Sim, mas caro pelo que entrega |
| 6 | **NPS Fast Intermediária** | **R$ 350,00/mês** | Mesmos canais, mais recursos não detalhados publicamente. Sem API | Sim, sem justificativa |
| 7 | **NPS Fast Completa** | **R$ 450,00/mês** | Único plano com API liberada | Sim, sem justificativa |
| 8 | **binds.co Start** | **R$ 499,99/mês** | Até **500 ENVIOS/mês** (não respostas), API, usuários ilimitados, 20 envios grátis. Sem alerta personalizado nesse plano | **Não encaixa.** Ver nota abaixo |
| 9 | **binds.co Standard** | **R$ 799,99/mês** | 1.000 envios/mês, alertas personalizados, integrações ilimitadas | Não encaixa |
| 10 | **binds.co Growth** | **R$ 2.499,99/mês** | 5.000 envios/mês | Não encaixa |
| 11 | **binds.co Advanced** | "Preço personalizado" | Acima de 5.001 envios/mês | Não encaixa |

Notas de rigor sobre esta tabela:

- **A Avalio à vista, não parcelada, é a régua correta.** A pesquisa original elegeu 12x R$ 64,00 como benchmark, e o verificador mostrou que isso é a opção mais cara do mesmo plano: infla o teto de referência em 34%. O piso real é **R$ 47,92/mês equivalente**. Toda conta abaixo usa esse número. SMS na Avalio é compra separada.
- **binds.co cobra por envio, não por resposta.** Isso exige lista de contatos com e-mail ou telefone. Salão de pizzaria atende público majoritariamente anônimo, então o modelo não encaixa por natureza, não por preço. A lógica dos rótulos "12x R$ 899,99", "12x R$ 1.499,99" e "12x R$ 5.999,99" na página oficial continua **sem explicação** e não fecha com doze vezes a mensalidade exibida.
- **Get In foi removido desta tabela.** O valor de R$ 239/mês que circulava vem de resumo de mecanismo de busca, e a página oficial de planos retorna HTTP 403 para quem tenta ler. Preço não publicado não entra em tabela de preço publicado. Marque como **NÃO VERIFICADO**.
- **Avalio "a partir de R$ 29/mês"** aparece em fonte de terceiro e segue **NÃO CONFIRMADO** na página oficial. Não use.
- O Opinion Box publica "a partir de R$ 300 por projeto" no painel de respondentes, e ficou fora daqui de propósito: é instituto de pesquisa de mercado por projeto, não monitoramento contínuo de satisfação.

### A conta dura: quantos meses de cada alternativa cabem em um mês do que ele paga hoje

Faixa atual: **R$ 501 a R$ 1.000 por mês**. A conta é literal, um mês da fatura atual dividido pela mensalidade da alternativa.

| Alternativa | Mensalidade | Meses que caberiam em R$ 501 | Meses que caberiam em R$ 1.000 |
|---|---|---|---|
| Avalio Starter (à vista) | R$ 47,92 | **10,5 meses** | **20,9 meses** |
| Avalio Starter (12x) | R$ 64,00 | 7,8 meses | 15,6 meses |
| Avalio Standard (à vista) | R$ 67,50 | 7,4 meses | 14,8 meses |
| ReviewBR Essencial | R$ 79,90 | 6,3 meses | 12,5 meses |
| Avalio Premium (à vista) | R$ 105,19 | 4,8 meses | 9,5 meses |
| Risposta, piso publicado QR Code | R$ 150,00 | 3,3 meses | 6,7 meses |
| Risposta, piso publicado geral | R$ 200,00 | 2,5 meses | 5,0 meses |
| Avalio Platinum (à vista) | R$ 233,33 | 2,1 meses | 4,3 meses |
| NPS Fast Básica | R$ 250,00 | 2,0 meses | 4,0 meses |
| NPS Fast Completa | R$ 450,00 | 1,1 mês | 2,2 meses |
| binds.co Start | R$ 499,99 | 1,0 mês | 2,0 meses |
| binds.co Standard | R$ 799,99 | 0,6 mês | 1,3 mês |

Estendendo para o ano, que é onde o número fica difícil de ignorar: doze meses de Avalio Starter custam **R$ 575,00**. Um ano da fatura atual custa **R$ 6.012,00 no piso** e **R$ 12.000,00 no teto**. Ou seja, **um ano do que ele paga hoje compra de 10,5 a 20,9 anos de Avalio Starter**, e o plano de R$ 575,00 já entrega 16.000 respostas por ano contra uma necessidade de 600 a 2.400.

Duas ressalvas honestas, porque este documento vai ser usado para decidir dinheiro:

1. **Não é comparação de igual para igual.** A Avalio não lê avaliação do Google nem do iFood, não tem banco de perguntas de operação de pizzaria, não tem cliente oculto, tem um único usuário nos planos baratos e o limite de respostas é anual, sem folga mensal em pico. O que a tabela prova é que **capacidade de coleta é commodity barata**. O que se paga acima disso é vertical, hardware e reputação.
2. **A tese de sobrepreço de 2,5x a 5x precisa de um passo antes.** O piso de R$ 150 do Risposta é escopo somente QR Code, sem tablet e sem cliente oculto. Comparar a fatura atual com esse piso não é igual para igual, e o preço dos planos superiores do Risposta **NÃO É PÚBLICO**. A ação correta antes de construir qualquer coisa é pedir a proposta comercial atual por escrito e conferir o que exatamente está dentro dos R$ 501 a R$ 1.000. O cancelamento não tem multa, o que torna essa conversa barata de ter.

---

## 4. Suítes de gestão com CX embutido

Esta é a seção que decide o mais importante: **o que é pesquisa de satisfação estruturada de verdade** (questionário próprio, escala, série histórica, painel de leitura) e **o que é apenas fidelidade, cashback ou disparo de WhatsApp** vendido com a palavra "avaliação" na frente.

A distinção é simples e implacável. Pedir review no Google por WhatsApp é captura de reputação: o dado nasce público, chega depois do cliente ir embora e não gera série histórica por prato ou por garçom. Programa de pontos e cashback é retenção: mede quem volta, não mede o que a pessoa achou. Nenhum dos dois substitui pesquisa.

| Suíte / ecossistema | Substituiria o Risposta? | Pesquisa estruturada de verdade, ou só fidelidade/cashback/WhatsApp? | Preço | Link |
|---|---|---|---|---|
| **Tagme** | **SIM.** O mais completo entre os indiretos | **Pesquisa estruturada.** Tagme Review é módulo nomeado e dedicado, com NPS explícito e classificação promotor/neutro/detrator, disparado no ciclo da reserva e da fila | **NÃO PÚBLICO** (landing de planos retornou 503) | [tagme.com.br](https://tagme.com.br/) |
| **Goomer** | **SIM, em grande parte** | **Pesquisa estruturada**, nativa e disparada no fim do checkout, com perguntas customizáveis sobre produto, atendimento e ambiente, campo aberto e resultados no mesmo painel. NPS formal **não mencionado** na página oficial | **NÃO PÚBLICO** | [goomer.com.br](https://goomer.com.br/) |
| **Zig** (ZigPay) | **SIM para quem já paga Zig** | **Pesquisa estruturada**, módulo próprio ligado ao CRM, com segmentação por nível de satisfação e giftback para quem avaliou bem. Canal de coleta **NÃO ESPECIFICADO** em página oficial | **NÃO PÚBLICO** | [zig.fun](https://zig.fun/) |
| **Teknisa** | **SIM no segmento dela, NÃO para este cliente** | **Pesquisa estruturada.** MyQuest é app próprio, coleta anônima em totem ou tablet, com dashboard. Alvo é refeição coletiva e restaurante corporativo | **NÃO PÚBLICO**, licença de projeto corporativo | [teknisa.com](https://www.teknisa.com/) |
| **Get In** | **SIM, PARCIALMENTE** | **Pesquisa citada como módulo**, ao lado de CRM e analytics, mas a profundidade (NPS? série histórica? relatório por garçom?) **NÃO FOI VERIFICADA**: o site oficial retorna 403 | **NÃO VERIFICADO** | [restaurante.getin.app](https://restaurante.getin.app/) |
| **Cardápio Web** | **PARCIALMENTE** | **Zona cinzenta.** Tem sistema de avaliações e índice de satisfação dentro do CRM, o que já é mais que fidelidade, mas se é NPS ou só estrelas **NÃO FOI COMPROVADO**. O resto é fidelidade, cashback e automação de WhatsApp | **NÃO PÚBLICO** | [cardapioweb.com](https://cardapioweb.com/crm/) |
| **Fidelimax** | **PARCIALMENTE**, e é a ameaça mais séria ao preço | **Meio a meio, com NPS real.** O produto é fidelidade e cashback, mas embute NPS contínuo com a pergunta "De 0 a 10, quanto você indicaria nosso restaurante?". NPS de uma pergunta é mais raso que questionário multidimensão | **PARCIALMENTE PÚBLICO:** plano gratuito confirmado, sem cartão. Valores dos combos Start e Pro **não publicados** | [fidelimax.com.br](https://www.fidelimax.com.br/clientes/restaurantes/) |
| **Meep** | **PARCIALMENTE, com asterisco** | **Não é dela.** A pesquisa só existe integrando a Track, um fornecedor externo de CX. Meep é onde o resultado aparece, não quem coleta. O que é próprio é CRM, fidelidade e campanha | **NÃO PÚBLICO** | [meep.com.br](https://meep.com.br/) |
| **Anota AI** | **PARCIALMENTE, e só no delivery** | **Pesquisa no fluxo do WhatsApp** ao final da compra, pelo atendente virtual. Em salão com garçom o gatilho nunca dispara. Resto é cupom, cashback e recuperador de vendas | **PUBLICADO:** R$ 299,99 e R$ 399,99/mês; anual R$ 246,99 e R$ 339,99/mês | [anota.ai](https://anota.ai/blog/planos-principal/) |
| **Consumer** | **NÃO**, apesar do preço atraente | **Só disparo de WhatsApp** pedindo review no Google Meu Negócio, mais fidelidade no cardápio digital. Sem NPS, sem questionário próprio, sem série histórica interna | **PUBLICADO:** R$ 59,90, R$ 179,90 e R$ 269,90/mês | [loja.consumer.com.br](https://loja.consumer.com.br/) |
| **Saipos** | **NÃO**, ou no máximo parcialmente | **Nada.** As páginas sobre pesquisa de satisfação e CRM são conteúdo educativo de SEO, não descrição de funcionalidade. Módulo de pesquisa **NÃO COMPROVADO** | **NÃO PÚBLICO** | [saipos.com](https://saipos.com/) |
| **Sischef** | **NÃO CONFIRMADO, provavelmente NÃO** | **Nada comprovado.** A "mensagem de WhatsApp 2 horas depois da refeição" que aparece em resumo de busca é recomendação editorial de boa prática, não feature. O que existe é CRM de histórico de pedidos | **NÃO PÚBLICO** | [sischef.com](https://sischef.com/) |
| **Linx Degust** | **NÃO** | **Só fidelidade e campanha:** desconto, happy hour, VIP, aniversariante, promocode, cashback, desconto progressivo. A menção a "monitoramento da satisfação em tempo real" vem de blog, sem questionário, canal ou NPS descritos | **NÃO PÚBLICO** | [linx.com.br](https://www.linx.com.br/) |
| **Colibri** | **NÃO** | **Nada.** Nenhum módulo de pesquisa nas páginas lidas, e a própria fidelidade vem de parceiro, não é nativa. Ironia útil: o caminho de CX dentro do ecossistema Colibri é contratar a Goomer, que é parceira | **NÃO PÚBLICO** | [restaurante.colibri.com.br](https://restaurante.colibri.com.br/) |
| **Neemo** | **NÃO** | **Só fidelidade.** Pontos, premiação e campanhas de e-mail e push. "Pesquisa de satisfação" aparece como item de lista sem produto descrito, e a página de funcionalidades retornou 404. **Confiança baixa** | **NÃO PÚBLICO** | [linx.com.br/neemo](https://www.linx.com.br/neemo/) |
| **Repediu** | **NÃO, é o contrário** | **Consome pesquisa alheia.** O material dele trata "plataforma de pesquisa de satisfação" como fonte externa a ser ativada. É complementar, precisa que alguém faça a pesquisa | **NÃO PÚBLICO** | [repediu.com.br](https://repediu.com.br/) |
| **Zenvia** | **NÃO** | **Nem pesquisa nem fidelidade: é encanamento.** CPaaS com API pública de WhatsApp e SMS. NPS via WhatsApp é caso de uso documentado, não produto pronto | **PARCIALMENTE PÚBLICO:** taxa de plataforma declarada entre R$ 0,02 e R$ 0,15 por conversa, mais o custo da Meta. Mensalidade **NÃO PÚBLICA** | [zenvia.com/devs](https://zenvia.com/en/devs/) |
| **Altec / Next** (PDV atual) | **NÃO.** Ver seção 5 | **Nada de CX.** Sem CRM de cliente, sem fidelidade própria, sem pesquisa | **NÃO PÚBLICO** | [altecsistemas.com.br](https://www.altecsistemas.com.br/) |
| **TOTVS Food Service** | **DESCONHECIDO** | **NÃO VERIFICADO** nesta rodada. Registrado para não omitir um player que apareceu nas buscas. Porte de rede grande | **NÃO PÚBLICO** | [totvs.com](https://www.totvs.com/varejo/food-service/) |
| **Dinerama** | **NÃO, de forma alguma** | Cashback de supermercado para consumidor final. Ver seção 6 | Não aplicável | [dinerama.com.br](https://dinerama.com.br/) |
| **Onfly** | **NÃO** | Gestão de viagens corporativas. Ver seção 6 | Não aplicável | [onfly.com.br](https://www.onfly.com.br/) |
| **Oni Sistemas** | **DESCONHECIDO** | Fornecedor não localizado. Ver seção 6 | Desconhecido | Sem site confirmado |

### O que essa tabela ensina

De 23 nomes levantados, **quatro têm pesquisa estruturada nativa e verificada** (Tagme, Goomer, Zig, Teknisa) e **três estão na zona cinzenta** (Get In, Cardápio Web, Fidelimax). O resto vende retenção e chama de avaliação.

E aqui está o ponto econômico que a tabela esconde: **nenhuma dessas rotas gera economia para este caso**. Tagme, Goomer, Zig e Teknisa não são o PDV instalado. Adotar qualquer uma delas significa contratar uma segunda mensalidade, ou trocar o PDV inteiro para ganhar um módulo de CX, o que aumenta o custo em vez de reduzir. A redundância que elas criam é real, mas é redundância para quem já as paga, não para quem paga Altec.

A única exceção que merece ser levada a sério é a **Fidelimax**, porque combina NPS contínuo com plano de entrada declaradamente gratuito e mais de 50 integrações nativas de PDV. É a rota mais barata verificada para cobrir só a nota. Duas ressalvas: os limites do plano gratuito não são publicados, e a integração nativa específica com Altec/Next **não foi confirmada**.

---

## 5. O PDV que ele já paga não entrega CX, logo não há duplicidade hoje

Este é o achado mais importante do levantamento de suítes, e ele corta um argumento comum pela raiz.

A página oficial da Altec Sistemas descreve relatórios estratégicos, relatórios de vendas, custos e performance, gráficos em tempo real, relatório de caixa entregue no celular por WhatsApp, retaguarda com estoque, DRE, contas e fiscal, e um módulo de BI próprio (Insight BI, que envia diagnóstico e recomendação por WhatsApp). Ela **não menciona CRM de cliente, não menciona programa de fidelidade próprio e não menciona pesquisa de satisfação**. Canais de coleta de opinião: nenhum.

Consequências práticas, em ordem de importância:

1. **Não existe pagamento em duplicidade hoje.** O Risposta e o Altec não se sobrepõem em nada. O argumento "posso cancelar porque o PDV já faz isso" é falso neste caso específico. Se a mensalidade cair, o que cai junto é a função inteira, não uma redundância.
2. **A única coisa parecida com CX no catálogo da Altec é integração de terceiro.** Existe uma "Integração com Eu Falo" (fidelidade e cashback, com cadastro automático e integração com o PDV) listada entre as soluções. Isso é fidelidade de um parceiro externo, não pesquisa de satisfação, não gera NPS e não gera série histórica de opinião. Não muda a conclusão acima.
3. **O que o Altec dá é a matéria-prima, não o produto.** Relatório de venda exportável (o R3, Vendas por Produto Detalhado, que a operação já usa) e relatório de caixa por WhatsApp. Isso é exatamente o insumo do cruzamento satisfação por faturamento, e é a razão pela qual esse cruzamento é possível de construir.
4. **E aqui está o gargalo real do projeto:** não foi localizada **API pública documentada nem webhook** da Altec/Next. A página de Relatórios Web retornou 404 em duas URLs, então até o número de relatórios analíticos e os formatos de exportação ficam com **confiança média**. Sem API e sem webhook, a ingestão do dado de venda depende de exportação de planilha ou de leitura direta da base local, e as duas alternativas têm passo manual ou dependência de manutenção. Isso colide de frente com a restrição de que ninguém vai manter o sistema depois de pronto, e a colisão precisa ser resolvida no desenho, não adiada.

---

## 6. Falsos positivos: o que aparece na busca e não existe nesse mercado

Duas categorias diferentes, e as duas custam tempo.

### 6.1 Nomes que não existem como fornecedores deste mercado

| Nome | Veredito | O que é de fato |
|---|---|---|
| **uselets / uselets.com** | **NÃO ENCONTRADO** | Duas buscas dedicadas não retornaram nenhuma referência ao domínio ou à marca em contexto de pesquisa, NPS, CX ou reputação no Brasil. Pegada digital indexada zero |
| **Mesa 1 / Mesa1** | **NÃO ENCONTRADO** | Nenhuma plataforma com esse nome. A aproximação mais próxima é outro produto, o [Reserva de Mesa](https://reservademesa.com.br/), sistema de reservas que empacota pesquisa junto. Provável confusão de nome |
| **Tellus** | **NÃO ENCONTRADO** | Nenhuma empresa com esse nome atuando em CX, NPS ou reputação para food service no Brasil. Sem página oficial, sem imprensa, sem diretório de software que a posicione |
| **Reviewz** | **NÃO EXISTE com esse nome** | É a **Harmo**, contada duas vezes. A Reviewr nasceu em 2017 em Florianópolis, fundiu com a Gorila em 2020 e o resultado passou a se chamar Harmo. Mapear "Reviewz" separado duplicaria a Harmo e distorceria o tamanho do mercado |
| **Qustodio de reputação** | **NOME PROVAVELMENTE INCORRETO** | Qustodio, com essa grafia, é empresa de controle parental e segurança digital para famílias. Nenhuma relação com reputação de restaurante. Confirme o nome real antes de gastar mais apuração |
| **Oni Sistemas** | **NÃO LOCALIZADO** | Duas buscas específicas não retornaram fornecedor identificável de food service com esse nome. Pode ser revenda regional, nome parcial ou grafia diferente |
| **Reviewax** | **NÃO ENTRA NO MAPA** | A descrição encontrada é de venda de avaliações do Google em pacotes mensais, com publicação progressiva "para evitar picos suspeitos". Isso é compra de review e expõe o perfil do restaurante a remoção e penalização. Mas a única fonte é um advertorial em portal de notícias, sem domínio, CNPJ ou página institucional. O verificador foi explícito: **não deveria constar do mapa nem como risco nomeado, por falta de fonte primária.** Fica registrado apenas para que ninguém contrate isso por acidente |
| **Dinerama** | **FORA DE ESCOPO** | App de cashback de compras de supermercado para consumidor final. Sem módulo de restaurante, sem pesquisa, sem CRM de food service. Existem reclamações públicas no Reclame Aqui relatando encerramento de atividades |
| **Onfly** | **FORA DE ESCOPO** | Gestão de viagens e despesas corporativas. A única sobreposição é a palavra "reserva", que ali significa passagem aérea e hotel, não mesa. Provável origem da confusão que colocou o nome na lista |

### 6.2 Quem anuncia avaliação e entrega outra coisa

Esta é a lista mais perigosa, porque esses fornecedores existem, são competentes e aparecem bem posicionados na busca.

- **Consumer:** o único da amostra com preço público atraente (R$ 59,90 a R$ 269,90/mês), e o mais enganoso. O que ele chama de avaliação é o Disparador de WhatsApp pedindo review no Google Meu Negócio. Isso é captura de reputação pública. Não gera questionário próprio, não gera NPS, não gera série por garçom ou por prato e não pega o cliente insatisfeito **antes** de ele publicar.
- **Saipos:** as páginas `/crm-restaurante` e `/pesquisa-de-satisfacao-do-cliente-em-restaurante` são conteúdo educativo de atração, não descrição de produto. Quem paga Saipos continua sem pesquisa estruturada.
- **Sischef:** caso clássico de resumo de busca que induz ao erro. O trecho sobre "mensagem de WhatsApp 2 horas depois da refeição" é conselho de boa prática no blog, e a leitura da página oficial derrubou a hipótese de feature.
- **Linx Degust:** "monitoramento da satisfação do cliente em tempo real" aparece em blog, sem questionário, canal ou métrica descritos. O que existe de fato é CRM promocional, cashback e campanha de aniversariante.
- **Neemo:** "pesquisa de satisfação" aparece como item de uma lista de dados do cliente, sem produto descrito, e a página de funcionalidades retornou 404.
- **Repediu:** não anuncia pesquisa própria, mas é fácil confundir. Ele **consome** plataforma de pesquisa como fonte externa de dados. É complementar, nunca substituto.
- **Koncluí:** app de checklists de operação (abertura, fechamento, limpeza, produção) com mais de 3.500 restaurantes. Aparece nas buscas de "pesquisa de satisfação restaurante" só por marketing de conteúdo. Não faz pesquisa, não faz NPS, não faz reputação.
- **i9Menu / i9Cardápios:** gráfica e indústria de cardápios, embalagens e jogos americanos. O artigo sobre pesquisa de satisfação no domínio deles termina recomendando contratar uma empresa especializada em pesquisa. É isca de conteúdo, não produto.
- **Opinion Box:** instituto de pesquisa de mercado com painel próprio de respondentes, vendido por projeto a partir de R$ 300. Serve para testar aceitação de um sabor novo na cidade, não para medir quem jantou ontem no salão.

---

## 7. Quem tem API pública documentada ou webhook, e por que isso importa

| Fornecedor | API pública documentada | Webhook | Condição de uso real |
|---|---|---|---|
| **Goomer** | **SIM.** [partner-api.goomer.app/docs.html](https://partner-api.goomer.app/docs.html), REST/JSON, OAuth 2.0 client credentials, consulta de histórico e estatísticas de pedidos, módulo OpenDelivery | **DESCONHECIDO**, não mencionado na página de docs lida | Restrita a parceiros e estabelecimentos, exige relação comercial |
| **Saipos** | **SIM.** [saipos-docs-order-api.readme.io](https://saipos-docs-order-api.readme.io/), cobre Delivery, Retirada, Ficha e **Mesa/Comanda** | **SIM**, é o único que declara publicamente "receberá notificações de novas vendas". Sem detalhe técnico na introdução | Credenciamento no Saipos Developer, homologação com evidências (até 5 dias úteis) e oficialização para produção |
| **iFood** | **SIM.** Módulo Review documentado, com `GET /merchants/{merchantId}/reviews`, leitura de review individual e `POST` de resposta | Não confirmado | Homologação com loja de teste, como qualquer módulo. Regras confirmadas: resposta só em review com status `NOT_REPLIED`, texto de 10 a 300 caracteres, review não respondido publica automaticamente em 5 dias |
| **Zenvia** | **SIM.** [zenvia.com/devs](https://zenvia.com/en/devs/), endpoints de WhatsApp e templates | Tem webhooks por ser CPaaS, mas **não verificado** nesta apuração | Conta BSP e aprovação de template no WhatsApp |
| **Avalio** | **SIM**, API REST genérica em **todos** os planos, inclusive o de R$ 47,92/mês | Não documentado | Assinatura, self-service |
| **binds.co** | **SIM**, API em todos os planos; integrações ilimitadas do Standard para cima, sem lista pública de conectores | Não documentado | Assinatura |
| **NPS Fast** | **SIM, mas só no plano Completa de R$ 450/mês** | Não documentado | Trancar API no plano mais caro inviabiliza automação barata |
| **Meep** | **Portal público, documentação fechada.** [meep-management.developer.azure-api.net](https://meep-management.developer.azure-api.net/) exige cadastro para ver as APIs | Não visível sem conta | Cadastro |
| **Opinae** | **NÃO** tem API própria documentada. Correção do verificador: existe menção a "WhatsApp API Oficial" no recurso OPINAE Msg, o que não é API do produto | Não | Não aplicável |
| **Colibri** | **NÃO, e é o pior cenário.** Integração do cliente só "através de um projeto, onde a COLIBRI SISTEMAS valida a integração" | Não | Aprovação caso a caso da fabricante |
| **Altec / Next** (PDV atual) | **NÃO LOCALIZADA** | **NÃO LOCALIZADO** | Só exportação de relatório e envio por WhatsApp |
| **Risposta, Falae, Harmo, Tagme, Get In, Solvis, Teknisa, Fidelimax, Cardápio Web, Sischef, Anota AI, Track.co, SoluCX** | Nenhuma API pública documentada localizada | Não | Não aplicável |

### Por que isso importa se ele algum dia trocar de PDV

Quatro razões concretas, todas com efeito de dinheiro:

1. **Quem tem API define o custo de uma troca de PDV.** Hoje o PDV instalado não expõe nada, então a ingestão de venda vai depender de planilha exportada ou de leitura da base local. Se algum dia a casa migrar para Saipos ou Goomer, existe caminho documentado, e no caso da Saipos existe até pedido de Mesa e Comanda, que é o que uma pizzaria de salão precisa. Ou seja: a troca de PDV pode **reduzir** o custo de integração, não aumentar. Vale saber disso antes de assinar qualquer coisa.
2. **A camada de ingestão tem que ser trocável de propósito.** O desenho correto é separar o adaptador de PDV do resto do sistema, e nunca usar identificador do PDV como chave primária da pesquisa. Troca de PDV vira troca de um adaptador, não reescrita do histórico.
3. **Ficar com o dado é o ativo, e um fornecedor sem API não devolve o histórico.** Treze dos fornecedores listados não têm nenhuma API pública. Contratar qualquer um deles significa que a série histórica de satisfação vive na casa do fornecedor, e sair custa perder a série. Esse é o argumento mais forte a favor de o dado de pesquisa nascer e morar no banco próprio, independentemente de qual PDV esteja instalado.
4. **Ler API não é usar API.** Nos dois casos brasileiros com documentação aberta, ler os docs é público e usar exige credenciamento, homologação e relação comercial. Nenhuma delas é self-service para um restaurante plugar um script no fim de semana. Vale a mesma leitura para o iFood: a correção do verificador é importante, a API de Review é pública e documentada e **não** existe veto categórico a quem não é gestor de reputação, mas o custo de entrada é um processo de homologação com loja de teste. Não prometa paridade com painel unificado de iFood no primeiro dia.

---

## 8. Fechamento: o que o mercado brasileiro ensina

**Onde um sistema próprio ganha:**

- **No cruzamento que ninguém faz.** Nenhum dos fornecedores levantados nas duas frentes (23 de pesquisa e CX, mais 23 de suítes, com alguma sobreposição entre as listas) documenta integração nomeada com PDV brasileiro, e nenhum liga satisfação a faturamento, a ficha técnica ou a CMV. Essa lacuna não é uma opinião, é a ausência de documentação em todo o mercado. É o único terreno onde um sistema próprio não está copiando ninguém.
- **Na posse do dado.** A série histórica de satisfação, dentro do banco próprio, sobrevive a troca de PDV, a troca de fornecedor de mensageria e a mudança de preço de qualquer um deles. Treze fornecedores da lista não têm API pública, o que significa que com eles a série não é portátil.
- **No alerta de detrator em tempo real.** A mecânica mais valiosa do mercado (avisar o dono antes do cliente ir embora) é também a mais barata de implementar. Ela existe no desenho do Ecoa e no Risposta, e custa quase nada em infraestrutura no volume desta operação.
- **Na coleta anônima em mesa.** O mercado corporativo inteiro (binds.co, Track.co, SoluCX) cobra por envio e pressupõe contato identificado. Salão de pizzaria é público anônimo. Coleta anônima sem cadastro prévio, na entrega da conta, é o requisito número um e é exatamente onde as plataformas caras não encaixam.

**Onde um sistema próprio não ganha:**

- **No preço, se o objetivo fosse só economizar.** A capacidade de coleta é commodity barata: R$ 47,92 por mês compram 16.000 respostas por ano, contra uma necessidade de 600 a 2.400. Se a meta fosse apenas parar de gastar, trocar de fornecedor resolveria, e resolveria em uma tarde. A diferença é discrepante o suficiente para ficar registrada: **Avalio Starter a R$ 47,92/mês** e o **plano gratuito da Fidelimax** (que embute NPS contínuo) são as duas alternativas mais baratas verificadas. Construir só se justifica pelo que elas não fazem, que é conversar com o dado de venda da casa.
- **Na reputação pública.** Ler Google e iFood no mesmo painel é território de três fornecedores verticais e envolve, no caso do iFood, homologação com loja de teste. Tratar isso como fora de escopo no MVP, ou como link para a plataforma, é a decisão certa. Prometer paridade aqui é a forma mais rápida de o projeto atrasar.
- **Em nada que exija manutenção contínua.** Este é o limite duro. A mensageria custa centavos por conversa, mas template de WhatsApp muda, layout de exportação do PDV muda e token expira. O mercado tem piso de R$ 47,92 por mês, ou seja, o preço de doze meses de plataforma pronta é menor que o de umas poucas horas de manutenção. Toda peça do sistema próprio que dependa de alguém consertando quando quebrar está, por definição, mais caro que comprar. O corolário de projeto é direto: quanto menos superfície móvel (menos integração frágil, menos template externo, menos agendamento caseiro), mais o sistema próprio ganha.
- **Em hardware.** Tablet e totem deixaram de ser diferencial: Falae, Solvis, Opinae, Teknisa e a Avalio (modo totem em todos os planos, inclusive no de R$ 47,92) cobrem isso. A correção do verificador sobre a Falae enterra o argumento de que o tablet é vantagem exclusiva de alguém.

**A ação que precede tudo:** pedir a proposta comercial atual por escrito e conferir o que está dentro dos R$ 501 a R$ 1.000, item por item, contra os pisos publicados de R$ 150 (somente QR Code) e R$ 200 (plano geral com 30 dias de teste) do próprio fornecedor. O preço dos planos superiores dele **NÃO É PÚBLICO**, então a tese de sobrepreço não fecha sem esse documento. Não há multa de cancelamento, o que significa que essa conversa não tem risco e pode acontecer antes de a primeira linha de código existir.
