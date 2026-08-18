# 06. Padrão de mercado de questionário, e o questionário recomendado para o QT

> Base: `dados/06-padrao.json` (12 tópicos, 12 buscas, 17 páginas lidas via WebFetch, 15 com conteúdo real) e `dados/03-global.json` (mecânicas de 36 fornecedores globais), com as correções de `dados/09-verif-global.json` (verificação adversarial, veredito **PARCIAL**, 15 correções).
> **As correções do verificador têm precedência sobre a pesquisa original.** Onde ele refutou uma feature, um preço ou uma citação, este documento usa a versão corrigida e diz isso no texto.
> Número que não foi lido em página oficial aparece como **NÃO PÚBLICO**, **NÃO VERIFICADO** ou **DESCONHECIDO**, sem exceção. Onde a confiança é baixa, está escrito.
> Aviso de método herdado do verificador: o erro recorrente da pesquisa original não foi inventar conteúdo, foi **citação deslocada** (a afirmação é verdadeira, mas a URL indicada não a contém). Três casos afetam esta seção e estão corrigidos aqui: os atributos por item da Tattle, os 80% da TableSafe e as "35+ categorias" da Ovation.
> A comparação com as perguntas que o Risposta usa hoje está na **seção 15**, reservada e vazia até os prints chegarem.

---

## 1. O que a evidência diz sobre formato, número de perguntas e abandono

### 1.1 A curva de abandono, e como ela deve ser lida

O único estudo com amostra publicada que encontrei sobre abandono por pergunta adicional é o levantamento da Survicate de 2025 sobre **21.863 pesquisas em mais de 50 setores**:

| Número de perguntas | Taxa de conclusão | Custo marginal da pergunta anterior |
|---|---|---|
| 1 | 85,7% | referência |
| 2 | 80,7% | 5,0 pontos |
| 3 | 77,4% | 3,3 pontos |
| 4 | 72,7% | 4,7 pontos |
| 5 | 72,5% | 0,2 ponto |
| 6 | 69,4% | 3,1 pontos |
| 10 | 72,7% | **sobe 3,3 pontos** |
| 20 | 68,7% | 4,0 pontos |
| 21 a 40 | 70,5% | sobe de novo |

Fonte: [survicate.com, How many questions should surveys have](https://survicate.com/blog/how-many-questions-should-surveys-have/).

**A leitura crítica importa mais que a tabela.** A curva **não é monotônica**: 10 perguntas concluem melhor que 6, e a faixa de 21 a 40 conclui melhor que 20. Isso significa que esses números **não são uma relação de causa e efeito** entre tamanho e abandono. Há confusão de fatores óbvia: quem topa entrar numa pesquisa de 30 perguntas já é um respondente diferente, e o tipo de pesquisa muda junto com o tamanho. Quem usar essa tabela como se cada pergunta subtraísse uma quantidade fixa de conclusão vai errar.

O que se sustenta na evidência é só isto, e é suficiente para decidir:

1. **A queda concentrada está nas 3 ou 4 primeiras perguntas**, na faixa de 3 a 5 pontos percentuais por pergunta. Depois disso a curva achata e vira ruído.
2. **Taxa de resposta** (quantos começam) é muito mais sensível ao tamanho que taxa de conclusão (quantos terminam depois de começar). No mesmo levantamento, pesquisas de 2 a 3 perguntas tiveram mediana de resposta de **15,97%** contra **6,87%** em pesquisas com 7 ou mais, ou seja, **mais que o dobro**, conforme a compilação da [TruRating](https://trurating.com/blog/response-rate-for-customer-satisfaction-surveys/).
3. Portanto o dano de alongar a pesquisa não aparece principalmente no abandono no meio, aparece na **entrada**. Confiança: média, porque a compilação da TruRating cita corretamente as fontes primárias mas eu não abri cada relatório original.

### 1.2 O que as melhores ferramentas fazem de fato

O padrão dominante das ferramentas de referência mundial **não é o questionário longo com nota na frente**. É uma abertura de um toque, ramificação condicional pela nota, e profundidade obtida por decomposição em fatores, não por lista plana de perguntas.

| Ferramenta | Formato de abertura | Profundidade de onde vem | Número declarado | Como ler o número |
|---|---|---|---|---|
| [Ovation](https://ovationup.com/platform/feedback/) | 1 pergunta, `How was your experience?`, escala de emoji, mais campo aberto opcional | Segunda onda 24h depois, por SMS, segmentada pela nota | `97% survey completion rate`, `up to a 20% take rate`, contra `about 0.1% of guests take traditional long-form surveys` | Autodeclarado em página de marketing, sem metodologia, amostra ou período. Confiança baixa no número, alta no formato |
| [Tattle](https://get.tattleapp.com/features/feedback-collection/) | Toque em categoria, que abre o próximo nível de detalhe | Árvore de categoria e fator, item por item | `55+ data points per survey`, `94.5% completion rate` | O próprio material da Tattle diz 94,5% numa página, 97%+ em outra e 94,7% no blog. Inconsistência interna: é número de marketing, não medição auditada |
| TableSafe RAIL | 1 pergunta fixa de nota geral, mais **2 perguntas rotacionadas aleatoriamente** | Banco de perguntas girando ao longo do tempo | `80 percent response rate on the first question and more than 70 percent on the following two` | **Citação corrigida pelo verificador:** o número não está no release do Businesswire que a pesquisa original citou. A fonte real é [425business.com, 2017](https://425business.com/tablesafe-to-launch-improved-restaurant-payment-system/). O dado tem 9 anos e a TableSafe foi adquirida pela Mad Mobile em 28/10/2021 |
| [Yumpingo, hoje BBI Survey Studio](https://support.yumpingo.com/support/solutions/articles/35000220945-yumpingo-food-score) | Recomendação binária, positivo ou negativo, mais 4 atributos | Avaliação no nível do **prato**, não do restaurante | Food Score com Overall Recommendation valendo 60% e Look, Taste, Portion e Value valendo 10% cada | Pesos lidos em base de conhecimento oficial. O texto literal das perguntas é **NÃO PÚBLICO** |
| [TruRating](https://trurating.com/) | `One tap` no ponto de pagamento | Uma pergunta por transação, girando | 84% de taxa de resposta média | Benchmark do próprio fornecedor sobre a própria base, com uma pergunta só. Não é comparável com pesquisa de 4 telas |

Da mesma fonte de 2017 da TableSafe sai o achado mais direto para o QT, verbatim: `they found if customers were asked more than three questions, the response rates dropped way off`. É a mesma conclusão da Survicate, obtida oito anos antes, em restaurante de mesa, com o dispositivo na mão do cliente sentado.

### 1.3 A ordem: nota primeiro ou depois

A MeasuringU testou empiricamente em dois estudos ([measuringu.com](https://measuringu.com/nps-order/)), com n=2.674 e n=501. Resultado em duas partes:

- **Não houve efeito de ordem na média** da nota de recomendação (8,8 contra 8,9, p=0,9; e 8,26 contra 8,25). Colocar a nota no fim não infla nem deprime a nota.
- **Houve perda de poder explicativo do modelo** quando o item de recomendação vinha depois: R² ajustado de 40,2% com o item primeiro contra 32,6% com ele depois.

Tradução: a nota primeiro explica melhor o resto da pesquisa. Isso **apoia** a decisão de abrir com a nota. Ressalva obrigatória: os dois estudos foram feitos em pesquisas longas de software, de 40 a 72 itens, e não em pesquisa curta de restaurante. Extrapolar para 5 telas é inferência, não medição. Confiança: média.

### 1.4 A aritmética do teto de 45 segundos

Este é o cálculo que amarra a evidência à restrição do briefing. Tela de um toque, com pergunta curta e sem rolagem, consome de **6 a 9 segundos** entre ler, decidir e tocar. As referências de mercado indicam que o respondente presencial dá de 15 a 30 segundos de atenção, e essa faixa vem de resumo de busca sem estudo por trás, então **confiança baixa** nela.

Com 6 a 9 segundos por tela, o orçamento de 45 segundos compra **5 a 7 telas**, contando a de agradecimento. Descontando abertura e agradecimento, sobram de **4 a 5 telas de conteúdo**. É exatamente onde a evidência de conclusão e de resposta diz que o desenho deve ficar. As duas restrições convergem, o que é uma boa notícia: o teto de 45 segundos não está apertando o desenho ótimo, ele está descrevendo o desenho ótimo.

**Consequência de engenharia, e ela é obrigatória:** os 6 a 9 segundos por tela são estimativa, não medição. O sistema precisa **cronometrar cada tela** e reportar a mediana e o percentil 90 da duração total toda semana. Se o p90 passar de 45 segundos, corta tela. Isso é barato (dois carimbos de tempo por tela) e transforma a restrição mais dura do briefing em número medido em vez de promessa.

---

## 2. NPS contra CSAT contra estrelas em food service

### 2.1 O que as melhores usam, e por quê

**Nenhuma** das quatro ferramentas de referência que consegui ler usa o NPS clássico de 0 a 10 como pergunta principal no ponto de venda.

| Escala | Quem usa como abertura | Custo cognitivo | O que ganha | O que perde |
|---|---|---|---|---|
| **Emoji de 5 pontos (CSAT)** | Ovation, HappyOrNot | Mais baixo de todos. Um toque, alvo grande, sem número para interpretar | Volume e velocidade. É o que sustenta os números de conclusão da Ovation | Não é comparável com nada fora da casa. Escala de 5 pontos é grosseira para acompanhar tendência fina |
| **Binário positivo ou negativo** | Yumpingo, no nível do prato | O mais baixo possível | Permite perguntar sobre vários pratos sem cansar | Joga fora toda a nuance. Só funciona porque é por prato e agregado em score ponderado |
| **1 toque no ponto de pagamento** | TruRating | Baixo | Taxa de resposta declarada de 84% | Uma pergunta por transação. A profundidade vem do volume, não da pesquisa |
| **NPS de 0 a 10** | Ninguém, na abertura | O mais alto. 11 alvos, escala numérica, exige interpretar o que 7 significa | Comparabilidade externa e série longitudinal padronizada | Conversão. É escala de 11 pontos numa tela de restaurante |
| **5 estrelas** | Padrão de review público | Baixo | Mapeia mentalmente para o Google, o que ajuda quando existe convite público | Menos sensível a nuance emocional que emoji |

A Tattle critica o NPS de forma explícita e publicada: diz que ele é `too vague` e que os extremos `tend to leave behind the vast majority of your customer base who don't fall on the extremes`, e propõe no lugar a pesquisa por causação ([get.tattleapp.com, blog](https://get.tattleapp.com/blog/when-it-comes-to-guest-surveys-restaurants-are-asking-the-wrong-questions/)). Ressalva de leitura: é conteúdo de marketing de uma concorrente do NPS. O argumento técnico é válido, o veículo é interessado.

### 2.2 A decisão do briefing, e o que ela custa

O briefing fixou **NPS de 0 a 10 como escala principal**, e o questionário da seção 14 respeita isso. Vale registrar o custo com precisão, uma vez, e seguir adiante:

- O risco real é de conversão, não de qualidade do dado. Escala de 11 pontos numérica é a mais caríssima que existe para tela de salão.
- O risco é **mitigável no desenho**, e é isso que a seção 14 faz. Onze botões grandes em duas fileiras, com ancoragem verbal nas pontas, cor de apoio e nenhuma rolagem, ainda são **um toque**. O custo não é o toque, é o tempo de varredura visual dos 11 alvos, que estimo em 2 a 3 segundos a mais que uma escala de 5.
- O ganho é real e o briefing está certo em querê-lo: NPS é a única escala aqui que permite comparar a casa com qualquer coisa fora dela, e é a que a série histórica do próprio Risposta provavelmente usa, o que importa se algum histórico for migrado.
- Confiança de que a mitigação funciona: **média**. Ninguém publica teste A/B de 5 pontos contra 11 pontos em tablet de restaurante. É por isso que a instrumentação de tempo da seção 1.4 não é opcional.

Se a conversão medida no piloto ficar abaixo de 10% das mesas atendidas, a primeira coisa a testar é substituir a tela 1 por 5 alvos e calcular o NPS por conversão de faixa. Isso perde comparabilidade e deve ser a última carta, não a primeira.

### 2.3 A pergunta canônica do NPS em português, escrita corretamente

> **Em uma escala de 0 a 10, o quanto você recomendaria o QT Pizza Bar para um amigo ou familiar?**
>
> Âncoras obrigatórias nas pontas: **0 = não recomendaria de jeito nenhum** · **10 = recomendaria com certeza**

Classificação: **promotores 9 e 10**, **neutros 7 e 8**, **detratores 0 a 6**. NPS = percentual de promotores menos percentual de detratores, resultado de -100 a +100.

Formulação verificada na página da [Goomer](https://goomer.com.br/blog/net-promoter-score-restaurantes), adaptada ao nome da casa. Origem atribuída a Frederick Reichheld, da Bain & Company, no artigo *The One Number You Need to Grow*, na Harvard Business Review. **Ressalva:** não consegui ler a página oficial da Bain nesta pesquisa, então a atribuição vem de fontes brasileiras secundárias. Confiança média na atribuição, alta na mecânica de cálculo, que é consenso.

Os cinco erros que aparecem no mercado e que o QT não deve cometer:

| Erro comum | Por que está errado |
|---|---|
| "Você gostou do atendimento?" | Mede satisfação, não intenção de recomendar. Não é NPS e não é comparável |
| Escala de 1 a 10 | Perde o zero. Muda a distribuição e desalinha as faixas de detrator |
| Escala de 1 a 5 com nome de NPS | Não é NPS. É CSAT com o rótulo errado, e é o erro mais comum em material brasileiro |
| "recomendaria para alguém" | Enfraquece a pergunta. "Amigo ou familiar" existe para forçar custo social real na resposta |
| Perguntar sobre "nosso atendimento" em vez da casa | Troca o objeto da recomendação. A nota deixa de medir o negócio e passa a medir um setor |

**Versão em inglês da tela 1:** `From 0 to 10, how likely are you to recommend QT Pizza Bar to a friend or family member?` A formulação canônica em inglês (`How likely is it that you would recommend...`) é de uso corrente, mas como não li a fonte primária da Bain, trato o texto exato como **NÃO VERIFICADO** em fonte oficial e uso a variante direta acima, que é a mesma pergunta.

**Lacuna registrada:** não pesquisei se o uso da marca "Net Promoter Score" tem restrição de marca registrada para produto de software. Irrelevante para uso interno do QT, relevante se o sistema for cedido a outros restaurantes. **NÃO VERIFICADO.**

---

## 3. Benchmark de NPS do setor, Brasil e mundo

### 3.1 O achado mais importante desta seção

**Não existe benchmark de NPS de restaurante brasileiro com amostra, período e metodologia publicados que eu tenha conseguido verificar. E não existe benchmark de NPS de pizzaria, no Brasil nem no mundo.** Isso não é falta de procura: a Retently, que publica um dos benchmarks de NPS mais citados do planeta, **removeu restaurantes e hospitalidade do benchmark de 2026**, declarando que são `companies which diminished in number and therefore are no longer recurrent in the Retently NPS benchmark`. Quando a referência global do assunto tira o setor da tabela por falta de base, o sinal é claro.

### 3.2 O que existe, e o que cada número realmente é

| Referência | Número | O que é de fato | Amostra e período | Fonte | Confiança |
|---|---|---|---|---|---|
| ACSI, full-service | **82** | CSAT em escala 0 a 100. **Não é NPS** | 16.381 entrevistas, abril/2024 a março/2025, EUA | [theacsi.com](https://theacsi.com/news-and-resources/press-releases/2025/06/17/press-release-restaurant-and-food-delivery-study-2025/) | Alta |
| ACSI, quick-service | **79** | CSAT 0 a 100 | idem | idem | Alta |
| ACSI, food delivery | **74** | CSAT 0 a 100 | idem | idem | Alta |
| ACSI, Papa Johns | **79** | CSAT 0 a 100 | idem | idem | Alta |
| ACSI, Pizza Hut | **79** | CSAT 0 a 100 | idem | idem | Alta |
| ACSI, Domino's | **78** | CSAT 0 a 100 | idem | idem | Alta |
| ACSI, Little Caesars | **77** (alta de 3%) | CSAT 0 a 100 | idem | idem | Alta |
| npsBench, restaurantes | **NPS 32** (era 34) | NPS **derivado de review público** por NLP, agregando Google, TripAdvisor e Yelp. Não é pesquisa | Amostra **não divulgada**. Publicado em 29/09/2025 | [npsbench.com](https://npsbench.com/blog/benchmark/restaurant-nps-benchmark-2025) | Média |
| Retently, benchmark 2026 | **restaurantes removidos** | Ausência de base recorrente | Declarado na própria página | [retently.com](https://www.retently.com/blog/good-net-promoter-score/) | Alta |
| Goomer (Brasil) | Faixas: acima de 70 excelente, 50 a 70 bom, 30 a 50 razoável, 0 a 30 ruim. Afirma que casual e fast food ficam "entre 40 e 60" | **Faixa genérica, não benchmark medido.** A afirmação dos 40 a 60 vem **sem citar fonte** | Nenhuma | [goomer.com.br](https://goomer.com.br/blog/net-promoter-score-restaurantes) | **Baixa** |
| Risposta (Brasil) | Zonas: crítica de -100 a 0, aperfeiçoamento de 1 a 50, qualidade de 51 a 70, excelência de 76 a 100 | Zonas genéricas. **Eles próprios escrevem** que "não recomendamos se fixar ao NPS desses tipos de empresas" e sugerem comparar com casas similares na mesma faixa de preço | Nenhuma. A faixa de 71 a 75 fica sem definição, o que sugere publicação imprecisa | [risposta.app](https://www.risposta.app/guia-completo-nps-net-promoter-score-em-bares-e-restaurantes/) | **Baixa** |
| Pizzaria independente no Brasil | **não existe** | Nenhuma fonte primária encontrada. Track.co, candidata natural, não tem relatório público indexado com esse corte acessível | | | **DESCONHECIDO** |

**Erro grosseiro a evitar:** comparar o 79 do Papa Johns com o 32 do npsBench. São escalas diferentes (0 a 100 de satisfação contra -100 a +100 de recomendação líquida) e não são convertíveis. Se essa comparação aparecer em algum slide do projeto, está errada.

### 3.3 Quanto ruído tem o NPS do QT, em pontos

Antes de falar de meta, o número que ninguém publica e que decide tudo aqui. O erro padrão do NPS é
`raiz((p_promotores + p_detratores − NPS²) / n)`, com o NPS em fração. Assumindo uma distribuição plausível de 60% promotores, 25% neutros e 15% detratores, que dá NPS 45:

| Respostas no mês (n) | Erro padrão do NPS | Intervalo de 95% em torno do valor medido | Diferença mínima entre dois meses para não ser ruído |
|---|---|---|---|
| 50 | 10,5 pontos | ± 20,5 pontos | **± 29 pontos** |
| 100 | 7,4 pontos | ± 14,5 pontos | **± 20,5 pontos** |
| 200 | 5,2 pontos | ± 10,3 pontos | **± 14,5 pontos** |

Cálculo meu, aritmética verificável, confiança alta na conta e média na premissa de distribuição (que muda o número em alguns pontos, não em ordem de grandeza).

Isto é o dado mais importante desta seção inteira: **no volume do QT, uma variação de 10 pontos de NPS entre dois meses não significa nada.** Qualquer painel que mostre a seta subindo ou descendo sem essa faixa está produzindo decisão em cima de ruído. E é provavelmente parte da razão pela qual o relatório atual parece raso: variação de nota agregada, nesse volume, quase sempre é ruído, e um relatório honesto sobre ruído não tem o que dizer.

### 3.4 Meta realista para o QT

**Não adote meta numérica de NPS nos três primeiros meses.** Não porque seja pouco ambicioso, mas porque não há linha de base e o intervalo é largo demais para que qualquer número escolhido hoje signifique algo.

| Fase | Meta | Por que essa e não outra |
|---|---|---|
| Meses 1 a 3 | **Linha de base.** Publicar NPS com o intervalo de 95% ao lado, mais a distribuição (quantos 0 a 6, quantos 7 e 8, quantos 9 e 10) e o n | Sem linha de base própria, meta é chute. E a distribuição informa mais que a média nesse volume |
| Meses 1 a 3 | **Volume: 150 respostas por mês**, ou cerca de 29% das mesas atendidas | É o único indicador que dá para mover por esforço direto no mês 1, e é o que compra significância para todo o resto |
| Do mês 4 em diante | **Contagem de detratores por mês, caindo.** Exemplo: de 18 para 12 | Contagem absoluta é legível em n pequeno. Ponto de NPS não é |
| Do mês 4 em diante | **Tendência de 3 meses não negativa**, em vez de meta mensal | Janela trimestral triplica o n e derruba o ruído para perto de metade |
| Do mês 4 em diante | **100% dos detratores com registro de recuperação**, com tempo até o primeiro contato medido | Meta de processo, sob controle da casa, e é o que gera o número próprio da seção 8 |
| Comparação externa | **Nenhuma.** Registrar por escrito no painel que não existe benchmark de NPS de pizzaria verificável | O próprio Risposta desaconselha fixar-se em benchmark de setor. Colocar "NPS 70 é excelente" apoiado em faixa sem fonte é o tipo de número que destrói a credibilidade do sistema novo |

Se, depois de estabelecida, a linha de base cair na faixa de 40 a 60 que a Goomer cita sem fonte, a meta de melhoria defensável é de **10 pontos em 6 meses**, medidos em janela trimestral. Abaixo disso, não se distingue do ruído no volume do QT.

---

## 4. Benchmark de taxa de resposta por canal

| Canal | Taxa | O que é a medida | Fonte | Confiança |
|---|---|---|---|---|
| **Ponto de pagamento (maquininha, 1 pergunta)** | **84%** | Média declarada pelo próprio fornecedor sobre a própria base, com uma pergunta só | [trurating.com](https://trurating.com/) | Média. Autodeclarado, e não comparável com pesquisa de 4 telas |
| **In-app (média)** | **27,52%** | Refiner 2025, via compilação | [trurating.com/blog](https://trurating.com/blog/response-rate-for-customer-satisfaction-surveys/) | Média |
| **In-app, CSAT** | 26,29% | idem | idem | Média |
| **In-app, NPS** | 21,71% | idem | idem | Média |
| **SMS pós-visita em restaurante** | **até 20% de take rate** | Ovation, autodeclarado na home, contra `about 0.1%` de pesquisa longa tradicional | [ovationup.com](https://ovationup.com/) | Baixa no número, alta na ordem de grandeza da diferença |
| **Mobile (link no celular, proxy de QR Code)** | **mediana 18,69%** | Survicate 2025 | [survicate.com](https://survicate.com/blog/how-many-questions-should-surveys-have/) | Média |
| **Efeito do tamanho, 2 a 3 perguntas** | mediana 15,97% | Survicate 2025 | idem | Média |
| **Widget no site** | 7,64% | Survicate 2025 | idem | Média |
| **Efeito do tamanho, 7 ou mais perguntas** | mediana 6,87% | Survicate 2025 | idem | Média |
| **E-mail, CSAT** | 9,76% | Retently 2025 | [trurating.com/blog](https://trurating.com/blog/response-rate-for-customer-satisfaction-surveys/) | Média |
| **E-mail, NPS** | 4,5% | Retently 2025 | idem | Média |
| **E-mail, e-commerce** | 3,24%, caindo de 4,09% no Q1/2025 para **2,50% no Q4/2025** | Retently 2025 | idem | Média |
| **Tablet na mesa** | **DESCONHECIDO** | Nenhum benchmark com metodologia publicada encontrado | | Qualquer número aqui seria invenção |
| **Comanda impressa com URL ou código** | **DESCONHECIDO** | idem | | |
| **QR Code na conta, os "40% a 60%" que circulam** | **NÃO CONFIÁVEL** | Vêm de blogs de fornecedores de QR Code, sem amostra, período nem metodologia | | Não usar |

### 4.1 O dado do próprio Risposta, e o que ele não diz

A Risposta publica que o **tablet responde por cerca de 90% das avaliações** porque permite resposta anônima, que o **QR adiciona até 15%** em avaliações e cadastros, e que `O grande risco de usar QR Code somente é a manipulação das amostras por parte das equipes` ([risposta.app](https://www.risposta.app/risposta-qr-code/)).

Cuidado com a leitura: **90% é participação no volume coletado, não taxa de conversão.** Não existe nenhuma métrica pública de taxa de resposta da Risposta. Ainda assim, é o dado mais relevante do levantamento inteiro para o QT, porque vem do fornecedor incumbente sobre a própria operação e diz duas coisas úteis: o tablet é o canal que gera volume, e o motivo é o anonimato percebido, não o hardware.

### 4.2 A conta de conversão do QT

Até 20 mesas atendidas por dia, 6 dias por semana, cerca de 26 dias de operação por mês, dá aproximadamente **520 mesas por mês**. A faixa de 50 a 200 respostas equivale a **10% a 38% de conversão sobre mesas atendidas**.

| Meta de respostas por mês | Conversão necessária | Compatível com o canal? |
|---|---|---|
| 50 | 10% | Folgado para tablet. Alcançável para QR |
| 120 | 23% | Compatível com tablet entregue em mão. Difícil para QR |
| 150 | 29% | Meta recomendada. Exige o garçom pedindo, o que já é o processo definido |
| 200 | 38% | Teto otimista. Acima da mediana mobile e dentro da família in-app |

Duas ressalvas honestas. Primeira: mesas são juntadas e existem comandas individuais, então "mesa atendida" não é uma pessoa, e a conversão real por pessoa é menor que a tabela sugere. Segunda: nenhum dos números do benchmark é do Brasil. Todos vêm de base majoritariamente americana e europeia.

---

## 5. As dimensões canônicas, e como cada uma é perguntada

A lista de dimensões é convergente entre fornecedores e templates. **O diferencial das melhores não é a lista, é a decomposição de cada dimensão em fatores acionáveis.** "A comida estava boa?" não gera ação. "A pizza chegou fria" gera.

### 5.1 O que cada referência publica

| Fonte | Dimensões e fatores publicados |
|---|---|
| **Tattle**, modelo de causação | Food Quality decomposta em `texture, flavor, temperature, presentation and freshness`. Accuracy em `entrees, sides, special instructions, incomplete order and allergy requests`. Hospitality em `friendliness, greeting, farewell, eye contact and smiles`. Speed of Service aparece como categoria, **sem fatores publicados**. Fonte: [blog oficial](https://get.tattleapp.com/blog/when-it-comes-to-guest-surveys-restaurants-are-asking-the-wrong-questions/) |
| **Tattle**, atributos por item de menu | `taste, texture, portion, temperature, presentation, and value simultaneously`. **Citação corrigida pelo verificador:** essa lista **não está** nas URLs de item-level-feedback que a pesquisa original citou. A fonte correta é o [blog Menu Engineering 2.0](https://get.tattleapp.com/blog/2026-03-31-menu-engineering-20-itemlevel-feedback-for-better-ltos/) |
| **Yumpingo**, no nível do prato | Overall Recommendation 60%, Look 10%, Taste 10%, Portion 10%, Value 10%. Respostas `can only be positive or negative`. Leitura por semáforo: `More than 90 is green`, `80-89 is amber`, `Less than 79 will be red`. O **texto literal das perguntas é NÃO PÚBLICO**. Fonte: [support.yumpingo.com](https://support.yumpingo.com/support/solutions/articles/35000220945-yumpingo-food-score) |
| **ACSI**, medição independente | Quick-service: precisão do pedido 85, qualidade da bebida 84, cortesia e prestatividade da equipe 84, qualidade da comida 84. Full-service: precisão do pedido 88, qualidade da bebida 86, desempenho do garçom 86. Fonte: [theacsi.com](https://theacsi.com/news-and-resources/press-releases/2025/06/17/press-release-restaurant-and-food-delivery-study-2025/) |
| **Templates de mercado** (SmartSurvey, QuestionPro, 7shifts, Zonka) | Seis blocos: comida, atendimento, atmosfera, limpeza, custo-benefício, delivery. Escala 1 a 5, 10 a 15 perguntas agrupadas por tema. Fontes: [smartsurvey.com](https://www.smartsurvey.com/templates/surveys/hospitality/restaurant-satisfaction-survey-template), [questionpro.com](https://www.questionpro.com/survey-templates/fast-food-restaurant/) |

Dois detalhes que valem ouro e que quase todo template brasileiro erra:

1. **A ACSI mede bebida como atributo separado**, e com nota alta (84 e 86). Bebida merece linha própria e não deve ser embutida em comida. Numa pizzaria com bar, o gargalo de bebida é do balcão e o de pizza é do forno: são dois responsáveis diferentes.
2. **Precisão do pedido é a dimensão de nota mais alta em ambos os segmentos** (85 e 88), o que significa que é a mais fácil de acertar e a mais visível quando erra.

### 5.2 A lista consolidada para o QT, com o modo de perguntar

| Dimensão | Fatores | Como perguntar | Origem |
|---|---|---|---|
| **Comida** | Sabor, temperatura, ponto da massa, apresentação, frescor, item errado ou faltando | Nunca "a comida estava boa". Sempre fator, e só em nota baixa | Fatores da Tattle, com "ponto da massa" acrescentado por ser pizzaria |
| **Bebida** | Temperatura, tempo até chegar, qualidade, veio errada | Linha própria, nunca dentro de comida | ACSI mede separado |
| **Tempo** | Espera pela mesa, até a bebida, até a pizza, até a conta | **Decompor em quatro momentos.** O relatório precisa dizer qual tempo, porque a ação é diferente em cada um | Inferência minha aplicada à pizzaria. Nenhum fornecedor publica essa decomposição. Confiança média |
| **Atendimento** | Recepção, simpatia, atenção durante, despedida, conhecimento do cardápio | Um fator por tela, um toque | Fatores de Hospitality da Tattle |
| **Precisão do pedido** | Item errado, item faltando, pedido especial ignorado, restrição alimentar | Só em nota baixa, dentro de comida | Accuracy da Tattle, ACSI |
| **Ambiente** | Ruído, temperatura do salão, iluminação, conforto | Rotacionar, nunca perguntar sempre | Templates de mercado |
| **Limpeza** | Mesa, salão, **banheiro separado** | Banheiro tem linha própria, porque é o que aparece em review público negativo | Templates, e leitura de risco |
| **Preço e valor** | Valor percebido, preço da pizza, preço da bebida, couvert ou taxa | **Nunca "o preço está bom". Sempre "valeu o que você pagou"** | Formulação de Value da Yumpingo |
| **Item consumido** | Qual pizza, qual entrada, qual sobremesa | Seleção de um toque, ou pré-preenchida pela comanda quando a integração com o Altec existir | Mecânica da Tattle e da Yumpingo |

**Erro a evitar:** perguntar as nove dimensões em nota alta. Isso transforma uma pesquisa de 5 telas em formulário de 12 perguntas, derruba a taxa de entrada de perto de 16% para perto de 7% pelos dados da Survicate, e o QT não tem margem de amostra para pagar isso. Em nota alta se confirma o que brilhou, em uma tela. Em nota baixa se ramifica.

---

## 6. Perguntas abertas: quando, como, e como classificar depois

### 6.1 As regras que o mercado segue

O padrão é: **sempre opcional, sempre no fim, sempre ancorada na nota que a pessoa acabou de dar, e no máximo uma por pesquisa** em contexto presencial.

| Regra | Razão | Confiança |
|---|---|---|
| Nunca no meio do fluxo | Pergunta aberta tem cerca de **18% de não resposta**, contra 1% a 2% em fechada. No meio, esse abandono contamina todas as telas seguintes | Média. O 18% vem de fonte secundária ([sopact.com](https://www.sopact.com/use-case/open-ended-questions-in-surveys)) sem link para o estudo original |
| Ancorar na nota | Em nota baixa, "o que podemos melhorar?". Em nota alta, "o que funcionou bem?". Genérico devolve vazio | Boa prática documentada, **não número medido**. Não encontrei estudo com amostra que quantifique o ganho |
| Caixa pequena, que cresce | Caixa pequena sinaliza que se espera duas frases e converte melhor que caixa gigante em branco | [surveylegend.com](https://www.surveylegend.com/types-of-survey-questions/how-to-get-people-to-answer-open-ended-survey-questions/). Confiança média |
| Uma só | Até 5 ou 6 abertas a resposta se mantém razoável, e depois disso o abandono dispara. Em restaurante, uma | [surveymonkey.com](https://www.surveymonkey.com/learn/survey-best-practices/comparing-closed-ended-and-open-ended-questions/). Confiança média |
| Nunca "algum comentário?" | É o pior formato. Devolve "tudo ótimo" ou nada | Consenso das fontes acima |

### 6.2 A sacada que muda tudo: resolver a classificação antes do texto

A Tattle resolve o problema **antes** de o texto existir. Como a pesquisa já capturou categoria e fator de forma estruturada, por toque, o texto aberto é **complemento**, não fonte primária de classificação. Isso é o oposto de Qualtrics e Caplena, que coletam texto livre e depois tentam extrair estrutura por regra, sentimento e agrupamento de tema.

Para o QT, com 50 a 200 respostas por mês e cerca de 18% de não resposta na aberta, o texto rende **poucas dezenas de comentários por mês, muitos deles "tudo ótimo"**. Depender do texto como fonte de diagnóstico é exatamente o mecanismo que produz relatório raso. A estrutura tem que carregar o diagnóstico. O texto carrega a citação literal, o contexto e o que a taxonomia não previu.

### 6.3 Como classificar as abertas do QT

Volume de 50 a 200 por mês, com cerca de 40 a 165 preenchidas. Nesse volume, **LLM em lote é suficiente e não precisa de pipeline de NLP nem de treino de modelo**. Custo real: **DESCONHECIDO** aqui, porque não calculei tokens nesta pesquisa, mas é ordem de grandeza de centavos a poucos reais por mês nesse volume.

Regras concretas para não produzir lixo classificado:

1. **A taxonomia de saída é a mesma da estrutura**, dimensão e fator da seção 5.2. Nada de o LLM inventar categoria nova por resposta, porque contagem só serve se a categoria for estável entre meses.
2. **Sentimento frase por frase, não por resposta.** O Wisely/Olo analisa `the sentiment of each comment, phrase-by-phrase` ([olo.com/sentiment](https://www.olo.com/sentiment)). "Pizza excelente mas demorou 40 minutos" tem que gerar um positivo em produto e um negativo em tempo, não uma nota média inútil.
3. **Marcar severidade e nomeação de pessoa.** O briefing manda filtrar comentário por área e mandar crítica pessoal grave só para o proprietário. Isso é um campo booleano na saída do classificador, não uma decisão humana diária.
4. **Guardar o texto original sempre**, e mostrar a citação literal no relatório junto da contagem. Contagem sem citação não convence ninguém a mudar o turno.
5. **Nada de nota de sentimento de 0 a 100.** É indicador de vaidade disfarçado de precisão.

A Ovation declara classificação automática de texto aberto em categorias específicas de restaurante. **Correção do verificador:** o número "35+ categorias" que apareceu na pesquisa original é **citação deslocada**, a URL indicada não o contém. Trate o número como **NÃO VERIFICADO** e a existência do recurso como confirmada.

**Limite honesto:** nenhuma das ferramentas publica como o classificador funciona, qual taxonomia usa, qual acurácia atinge ou se há revisão humana. Isso é **DESCONHECIDO** em todo o mercado.

---

## 7. O banco de perguntas rotacionadas: a solução para profundidade contra fricção

Esta é a mecânica mais valiosa deste documento e a que resolve a contradição central do projeto: o briefing quer nota por prato, por garçom, por turno, por área e cruzamento com faturamento, e ao mesmo tempo trava a pesquisa em 45 segundos.

### 7.1 De onde vem e como funciona

**Quem faz:** TableSafe, na plataforma RAIL, no dispositivo de pagamento à mesa. Estrutura: **a primeira pergunta é sempre a nota geral, e as duas seguintes são customizáveis e rotacionadas aleatoriamente**.

**O número, verbatim:** `restaurants get an 80 percent response rate on the first question and more than 70 percent on the following two`, e, na mesma frase, `The first question always asks customers to rate their experience, and restaurants can customize the following two questions`, que são, palavra da fonte, `rotated randomly`. E, da mesma fonte: `they found if customers were asked more than three questions, the response rates dropped way off`.

**Fonte corrigida pelo verificador:** [425business.com, 2017](https://425business.com/tablesafe-to-launch-improved-restaurant-payment-system/). O release do Businesswire que a pesquisa original citou **não contém a estatística**. Contexto obrigatório que faltava: o dado tem **9 anos** e a **TableSafe foi adquirida pela Mad Mobile em 28/10/2021**. Confiança: média no número (autodeclarado, sem metodologia), alta na mecânica, que é verificável no texto.

A ideia em uma frase: **nenhum cliente responde a pesquisa longa, mas o conjunto dos clientes responde.** Cada pessoa vê 1 pergunta fixa mais 1 ou 2 sorteadas de um banco. Ao longo do mês, o banco inteiro é coberto. A profundidade passa a ser propriedade da **amostra**, não da **entrevista**.

### 7.2 A conta de cobertura do QT

Premissas explícitas: 26 dias de operação por mês, até 20 mesas por dia (cerca de 520 mesas), e o desenho da seção 14, no qual **promotor recebe 2 perguntas rotacionadas, neutro recebe 1, e detrator recebe 0** (porque o tempo do detrator é gasto na ramificação de categoria, fator e prato, que vale mais). Assumindo 60% promotores, 25% neutros e 15% detratores, cada resposta gera em média **1,45 impressão rotacionada**.

| Respostas no mês | Impressões rotacionadas no mês | Banco de 20 perguntas: impressões por pergunta por mês | Por trimestre |
|---|---|---|---|
| 50 | 73 | 3,6 | 11 |
| 120 | 174 | 8,7 | 26 |
| 150 | 218 | 10,9 | 33 |
| 200 | 290 | 14,5 | 44 |

**Leitura honesta da tabela.** O banco de 20 perguntas é **tocado** todo mês em qualquer cenário, mas **8 a 15 respostas por pergunta por mês não sustentam um número publicável**. Sustentam duas coisas legítimas:

1. **Detecção de sinal grosso.** Se 6 das 9 respostas sobre temperatura da pizza dizem "chegou fria", isso é acionável hoje, mesmo com n=9, porque é contagem de evento raro, não estimativa de média.
2. **Leitura trimestral.** Com 26 a 44 respostas por pergunta por trimestre, dá para ler proporção com intervalo de mais ou menos 15 a 19 pontos. Grosso, mas legítimo, e é a janela em que o painel deve mostrar esses cortes.

### 7.3 O mecanismo de foco, que é o que torna o banco utilizável no mês

Rotação uniforme distribui a amostra por igual e não concentra em nada. A solução é **peso**, não sorteio puro:

- **2 a 4 perguntas em foco por mês**, definidas pelo proprietário ou sugeridas pelo sistema, recebendo **50% das impressões** somadas.
- As outras 16 a 18 dividem os 50% restantes, mantendo cobertura de fundo.
- Com 174 impressões e 4 perguntas em foco: **22 respostas por pergunta em foco no mês**. Isso já é legível para proporção grosseira e é dez vezes melhor que a média uniforme.
- O foco do mês deve ser definido pelo que a operação vai mexer. Trocou o fornecedor de muçarela: foco em sabor e ponto da massa. Contratou dois extras no salão: foco em recepção e conhecimento de cardápio.

**Regra de seleção do sistema**, a implementar como código e não como planilha:

1. Nunca mais de 2 rotacionadas por resposta.
2. Nunca duas da mesma dimensão na mesma resposta.
3. Suprimir a pergunta cuja dimensão já foi coberta pela ramificação de nota baixa, para não perguntar duas vezes a mesma coisa.
4. Sortear por peso, com o **peso do mês em foco** somando 50%.
5. Registrar em cada resposta **qual pergunta foi sorteada e qual foi respondida**, porque sem isso não se calcula denominador e a proporção fica errada.
6. Não repetir a mesma pergunta na mesma comanda dentro da mesma noite.
7. **Toda pergunta do banco que o sistema pode responder sozinho sai do banco.** Área do salão vem do número da mesa. Prato consumido vem da comanda do Altec, quando a integração existir. Garçom vem do PIN. Slot de pesquisa é o recurso mais escasso do projeto e não se gasta perguntando o que o banco de dados já sabe.

### 7.4 O que o banco compra, em comparação direta

| Desenho | Perguntas que o cliente vê | Tempo estimado | Cobertura por mês | Conclusão esperada |
|---|---|---|---|---|
| Formulário plano com as 20 perguntas | 20 | cerca de 140 segundos, mais de 3 vezes o teto | 20 dimensões, com n alto por pergunta | 68,7% (referência de 20 perguntas da Survicate), e taxa de **entrada** de 6,87% |
| Pesquisa de 1 pergunta | 1 | 8 segundos | 1 dimensão | 85,7% |
| **Nota fixa mais 2 rotacionadas** | **3 a 4** | **28 a 39 segundos** | **20 dimensões por mês, 4 delas com n legível** | perto de **77%**, e taxa de entrada de perto de **16%** |

O banco entrega **20 perguntas de cobertura pelo preço de conclusão de uma pesquisa de 3 a 4 perguntas**. É desenho, não tecnologia: custa uma tabela de perguntas com peso e uma função de sorteio.

### 7.5 A ressalva que o mercado não esconde

A Tattle, que é a ferramenta mais profunda do mundo nesse assunto, declara no FAQ oficial, verbatim: `Tattle is primarily designed for brands with 10 locations and more. We don't recommend brands with fewer than 10 locations to use Tattle because our recommendation engine needs sufficient feedback volume to accurately suggest your top opportunities` ([get.tattleapp.com/resources/faq](https://get.tattleapp.com/resources/faq/), confirmado pelo verificador).

Ou seja: a referência mundial em profundidade diz por escrito que **o volume de uma unidade não sustenta o motor de recomendação dela**. O banco rotacionado não revoga essa física. Ele faz o melhor uso possível de uma amostra pequena, e é por isso que a leitura trimestral e o n visível ao lado de cada número, na seção 10, não são detalhe de rodapé.

---

## 8. Recuperação do insatisfeito

### 8.1 O que é padrão publicado, e o que não é

| Elemento | Padrão de mercado | Status da evidência |
|---|---|---|
| Alerta em tempo real ao gerente na resposta negativa | Sim. Ovation chama de `Real-time Guest Recovery`, promete `Resolve guest issues instantly through direct communication`. HappyOrNot vende alertas em tempo real nos planos Professional e Managed | Confirmado em página oficial ([ovationup.com/platform/feedback](https://ovationup.com/platform/feedback/)) |
| **SLA em minutos** | **NÃO PÚBLICO.** Ovation, Tattle e Yumpingo falam de tempo real e de "durante o turno", e nenhuma publica prazo em minutos | Verificado: nenhuma das páginas lidas publica |
| Resposta em poucos cliques, com template ou IA | Sim. Ovation: `in just two clicks with either an original message, an on-brand templated response, or using our AI-generated custom response` | Confirmado verbatim pelo verificador |
| Oferta anexada à mensagem de recuperação | Sim. Momos emite crédito dentro do PDV ou do loyalty: `Share offer or give credits on POS, Loyalty, or natively.` | Confirmado verbatim pelo verificador |
| Pedir ao cliente para **editar** a review pública já publicada | Sim, Momos: `Send CSAT survey and automatically prompt the customers to edit the public review.` | Confirmado verbatim. **Não aplicável ao QT**, que não faz convite público |
| **Efeito medido sobre retorno do cliente** | Os números que circulam (resposta em menos de 2 horas gerando 15% a 20% mais recuperação; 95% dos clientes dando segunda chance; benchmark de menos de 4 horas atribuído à National Restaurant Association) **não foram verificados em fonte primária** e vêm de blogs de fornecedores de automação | **NÃO VERIFICADO. Não usar em nenhum material do projeto** |
| Paradoxo da recuperação de serviço | A literatura tem resultados mistos. A conclusão recorrente é que a satisfação pós-recuperação, na maioria dos cenários, **não fica significativamente abaixo** da pré-falha | Confiança média ([Mixed Findings on the Service Recovery Paradox](https://www.researchgate.net/publication/247523658_Mixed_Findings_on_the_Service_Recovery_Paradox)) |

Tradução da última linha, que é a mais importante: **recuperação é indispensável para não perder o cliente, e não é oportunidade de encantar.** Quem promete que a falha bem resolvida deixa o cliente melhor do que se nada tivesse acontecido está vendendo o que a literatura não sustenta.

### 8.2 A mecânica para o QT, e por que ela é melhor que a das ferramentas grandes

O QT tem um ativo que Ovation, Tattle e Momos não têm: **um salão só, jantar só, e o tablet chegando junto com a conta.** Todas as grandes disparam o alerta para um cliente que já foi embora. O QT dispara para um cliente **que ainda está sentado**. A janela de recuperação é de minutos, e a recuperação é presencial e de custo zero.

| Elemento | Definição recomendada | Por quê |
|---|---|---|
| **Gatilho** | Nota de 0 a 6 (faixa de detrator). Opcionalmente 7 quando vier com fator crítico marcado | Gatilho em 7 e 8 satura o gerente e mata o processo em duas semanas |
| **Tempo de alerta** | **Push no celular do gerente de salão em menos de 30 segundos** após o envio | Não existe SLA de mercado publicado para copiar. Este número é escolha do projeto, calibrada pelo fato de o cliente ainda estar na mesa. Confiança: é decisão, não benchmark |
| **Conteúdo do alerta** | Número da mesa, hora, nota, categoria e fator marcados. Nada de nome, porque a resposta é anônima | O número da mesa é o único identificador disponível, e vem do PIN do garçom na abertura |
| **Quem age** | Gerente de salão. Nunca o garçom que atendeu | Quem recebeu a nota baixa não é quem deve pedir explicação sobre ela |
| **O que se oferece** | Nesta ordem: reconhecer, desculpar com nome, **corrigir o item na hora**, e cortesia (sobremesa ou couvert) somente quando a falha for de execução da casa | Padrão do setor. Cortesia por gosto pessoal do cliente ensina a equipe a comprar nota |
| **O que nunca se oferece** | Qualquer benefício vinculado a avaliação, nota ou review | Incentivo por review é proibido pelo Google, seção 9 |
| **Registro** | Data, mesa, motivo, fator, ação tomada, quem atendeu, custo da cortesia | Sem registro não existe o número próprio do item abaixo |
| **Medição** | Tempo até o primeiro contato (em minutos), taxa de recuperação (contatados sobre detectados), custo médio da cortesia | São indicadores de processo, sob controle da casa, e legíveis com n pequeno |

### 8.3 O risco não óbvio: a recuperação pode matar o anonimato

Se o gerente aparece na mesa trinta segundos depois de a pessoa dar nota 4 num tablet que ela acabou de devolver, ela entende na hora que a resposta não é anônima na prática. O anonimato percebido é justamente o que sustenta o volume (seção 4.1 e 13.4). Isso é uma tensão real do desenho, e não achei nenhum fornecedor tratando dela.

Regras para conviver com a tensão:

1. O gerente **nunca menciona a pesquisa, nunca cita a nota** e nunca diz "vi que você avaliou". A abordagem é uma ronda normal de salão: "está tudo certo por aqui?".
2. A ronda deve ser um hábito visível em mesas aleatórias, não só nas que deram nota baixa. Se a visita do gerente só acontece depois de nota baixa, o padrão fica óbvio em poucas semanas para a equipe e para o cliente frequente.
3. Nada de alerta visível no tablet, em som ou em tela. O alerta vai para o celular do gerente e para nenhum outro lugar.
4. Quando a mesa tem uma comanda só, a resposta é individualmente identificável de fato. Registre isso no aviso de privacidade em vez de prometer anonimato que o desenho não entrega.

### 8.4 Em vez de prometer efeito, medir efeito

Nenhum número de retorno de cliente pós-recuperação se sustentou na verificação. Portanto o projeto **não deve prometer nenhum**. O que deve fazer é montar a medição desde o primeiro dia: registrar cada recuperação e, para quem deixou contato, comparar retorno de recuperados contra não recuperados. Em 6 a 12 meses o QT tem o próprio número, que vale mais que qualquer benchmark de blog. A honestidade sobre o tamanho dessa amostra está na seção 12.

---

## 9. O convite ao Google depois de nota alta, e por que a decisão do cliente está certa

### 9.1 Onde exatamente está a linha

**A linha é o condicionamento.** Não é o convite, não é o QR Code, não é a pesquisa interna. É fazer o convite ao Google **depender da nota**.

A política de conteúdo contribuído do Google proíbe, textualmente:

> `Discourage or prohibit negative reviews, or selectively solicit positive reviews from customers`

E, na mesma política, uma proibição que é ainda mais relevante para o QT, porque descreve com precisão a situação de um tablet entregue pelo garçom no salão:

> `require or pressure users to leave ratings or write reviews while on the premises`

E o que a política diz que **é permitido**, também textualmente:

> `Solicit or encourage the posting of content that does represent a genuine experience, without offering incentives`

Fonte: [support.google.com/contributionpolicy/answer/7400114](https://support.google.com/contributionpolicy/answer/7400114).

Do lado do Google Business Profile, a página oficial confirma que se pode `ask customers to visit a Google link or scan a QR code`, e proíbe incentivo:

> `Offering incentives, like free or discounted goods or services, in exchange for customers to post reviews, change reviews, or remove negative reviews is considered fake & misleading content and is strictly prohibited`

Fonte: [support.google.com/business/answer/3474122](https://support.google.com/business/answer/3474122). As duas páginas precisam ser lidas juntas: a página do Business Profile **não repete** a proibição de solicitação seletiva, que está na política de conteúdo contribuído.

Confiança: **alta**. Li as duas políticas oficiais.

### 9.2 O mapa do permitido e do proibido, em termos de desenho de produto

| Desenho | Permitido? | Por quê |
|---|---|---|
| Pesquisa interna com quantas perguntas quiser | **Sim** | Não é conteúdo público. O Google não regula pesquisa privada |
| Alerta e recuperação privada do insatisfeito | **Sim** | Resolver problema não é suprimir avaliação |
| Convite ao Google exibido para **todos** os respondentes, mesmo texto, mesma proeminência, independente da nota | **Sim** | A seleção passa a ser do cliente, não do sistema |
| QR Code fixo na conta ou no balcão, sem passar pela nota | **Sim** | Não existe nota no caminho, logo não existe condicionamento |
| Mostrar o link do Google só para quem deu nota alta | **Não. É review gating nomeado na política** | Solicitação seletiva de avaliação positiva |
| Desviar quem deu nota baixa para formulário interno **em vez de** oferecer o mesmo caminho público | **Não** | É a mesma solicitação seletiva, pela via negativa |
| Botão do Google maior, primeiro ou mais colorido para quem deu nota alta | **Não** | O condicionamento não precisa ser explícito para existir |
| Oferecer sobremesa, desconto ou brinde por avaliação | **Não** | Incentivo, proibido de forma expressa |
| Pedir a avaliação no salão com o garçom parado ao lado esperando | **Zona de risco** | `pressure users to leave ratings or write reviews while on the premises`. Convidar é permitido, pressionar dentro do estabelecimento não é |

### 9.3 Por que a decisão de não fazer isso está correta em termos de risco

O briefing decidiu que a tela final apenas agradece e encerra, sem convite ao Google. **Essa decisão elimina o item de maior risco de todo o projeto**, e por três razões que se somam.

**Primeira: o desenho intuitivo é justamente o proibido.** Qualquer pessoa que sente para desenhar isso chega em "nota 9 ou 10 vai para o Google, nota 0 a 6 vai para o formulário interno". É o desenho mais comum do mercado e é exatamente a violação nomeada na política. Não construir o convite remove a chance de o sistema derivar para o gating em alguma iteração futura, feita meses depois, por quem não leu este documento. Num projeto cuja restrição mais dura é que ninguém vai manter o sistema, **remover a possibilidade de errar vale mais que documentar como não errar.**

**Segunda: a consequência é desproporcional ao ganho.** Relatos de 2025 indicam que o Google passou a atacar as ferramentas que facilitam gating e que a penalidade pode ser a **remoção de todas as avaliações do perfil**, não só das viciadas. Confiança nessa mecânica de punição: **média**, porque vem de blogs de fornecedores de reputação ([soci.ai](https://www.soci.ai/knowledge-articles/review-gating/), [birdeye.com](https://birdeye.com/blog/google-review-policy/)) e **não** de página oficial do Google. A proibição em si é alta confiança, porque está na política. Para uma pizzaria de um salão, o perfil do Google é o principal ativo de aquisição, e o histórico acumulado de avaliações não se reconstrói: mesmo com 20% de probabilidade, apostar o perfil inteiro para ganhar algumas avaliações por mês é um péssimo negócio.

**Terceira: o canal do QT agrava o risco específico.** O tablet é entregue em mão pelo garçom, dentro do estabelecimento. Um convite ao Google nessa tela fica muito mais perto de `pressure users to leave ratings or write reviews while on the premises` do que o mesmo convite chegando por SMS no dia seguinte. O QT não teria o mesmo risco que uma ferramenta de SMS teria, teria um risco maior.

**O que a decisão custa, e é honesto dizer:** o convite igual para todos **é permitido** e captura o momento de satisfação máxima, que é a hora em que o cliente promotor mais provavelmente escreveria. O QT abre mão desse ganho. Se quiser recuperá-lo depois com risco praticamente zero, o caminho é o desacoplamento total: **QR Code fixo impresso na conta ou no balcão, apontando direto para o Google, sem passar pela pesquisa e sem nota nenhuma no caminho.** Zero condicionamento porque não existe nota, e nenhuma linha de código no sistema.

### 9.4 O precedente americano, com a distinção que quase todo mundo erra

| Instrumento | O que faz | Vale para gating? |
|---|---|---|
| **FTC contra Fashion Nova, 2022** | Multa de **US$ 4,2 milhões** por suprimir avaliações abaixo de 4 estrelas por cerca de 4 anos, afirmando que as avaliações exibidas refletiam a visão de todos os compradores. Primeiro caso da FTC sobre ocultação de avaliações negativas | Precedente concreto, mas o caso é de **supressão de avaliações no próprio site** da empresa, não de gating de convite a plataforma de terceiro. [ftc.gov](https://www.ftc.gov/news-events/news/press-releases/2022/01/fashion-nova-will-pay-42-million-part-settlement-ftc-allegations-it-blocked-negative-reviews) |
| **Regra final da FTC de 2024, 16 CFR Part 465** | Proíbe review falsa, incentivo condicionado a sentimento específico, review de insider sem divulgação, e supressão via `unfounded or groundless legal threats, physical threats, intimidation, or certain false public accusations` | **Não proíbe gating de forma explícita.** [ftc.gov](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials) |

Conclusão precisa: **para o QT, o risco real de gating é a política do Google e a remoção das avaliações, não a FTC**, que é jurisdição americana e cuja regra final não nomeia gating.

**Lacuna registrada, e ela é relevante:** não pesquisei o equivalente brasileiro (Código de Defesa do Consumidor, CONAR, legislação de publicidade enganosa) para condicionamento de solicitação de avaliação. Isso **deveria ser levantado antes de o sistema ir ao ar**, e vale mesmo com a decisão de não convidar, porque o CRM e as campanhas de retorno da fase 2 tocam o mesmo território. **NÃO PESQUISADO.**

**Nota de exatidão, correção do verificador:** a pesquisa original acusava a Ovation de praticar review gating. A acusação **não se sustenta** nas páginas citadas: nem `/platform/feedback/`, nem `/platform/reputation-management/`, nem a home contêm texto sobre direcionar o cliente satisfeito para review pública em função da nota. A afirmação foi removida. Ela segue verificável para a Guestmeter, cuja home descreve o direcionamento.

---

## 10. Indicadores que geram ação contra indicadores de vaidade

A definição é de Eric Ries: métricas de vaidade são `good for feeling awesome, but bad for action` ([tim.blog, 2009](https://tim.blog/2009/05/19/vanity-metrics-vs-actionable-metrics/)). Em pesquisa de restaurante, todas as métricas de vaidade têm a mesma falha estrutural: são **médias sobre populações misturadas**, e por isso nunca apontam para uma ação nem para um responsável.

As três regras que separam um lado do outro:

1. Tem que ter **sujeito**: turno, garçom, dia da semana, prato, área do salão.
2. Tem que ter **fator** causal, não categoria vaga.
3. Tem que vir em **contagem absoluta**, não só em percentual, porque com 50 a 200 respostas por mês o percentual sozinho engana.

### 10.1 As duas colunas

| Indicador de vaidade (o que tirar) | Indicador que gera ação (o que colocar no lugar) |
|---|---|
| NPS do mês, agregado, sem corte | **Contagem de detratores por turno e por dia da semana**, com o número absoluto e a diferença contra a semana anterior. "Sexta passada: 5 detratores. Esta sexta: 1." |
| Nota média geral de 4,3 | **Distribuição da nota**: quantos 0 a 6, quantos 7 e 8, quantos 9 e 10. Em 22 mesas, a média esconde exatamente os dois clientes que vão reclamar em público |
| Gráfico de tendência da nota geral | **Tendência trimestral com faixa de incerteza**, mais a tabela da seção 3.3 impressa ao lado. Sem a faixa, a seta é ruído com aparência de informação |
| Total de respostas coletadas | **Conversão sobre mesas atendidas, por dia e por garçom**. Diz se o problema é a operação ou é a coleta |
| "Satisfação com o atendimento: 4,1" | **Frequência de cada fator**, em contagem: recepção 3, conhecimento do cardápio 5, despedida 1. É o fator que vira conversa de turno, não a categoria |
| "Qualidade da comida: 4,4" | **Contagem de reclamações por fator de comida**: temperatura 4, ponto da massa 6, item errado 2. E o **fator do mês** com a diferença contra o mês anterior |
| Nota média por prato | **Reclamações por 100 unidades vendidas do prato**, com a contagem absoluta e o n visível. Numerador da pesquisa, denominador do PDV. Detalhado na seção 11 |
| Nota média por garçom, num ranking | **Nota por garçom com n obrigatório ao lado**, em janela trimestral, para conversa de desenvolvimento. Nunca ranking mensal, nunca meta punitiva |
| "Tempo de resposta melhorou" | **Tempo até o primeiro contato de recuperação, em minutos, por incidente**, e a lista dos incidentes sem contato |
| "Melhoramos o atendimento" | **Taxa de recuperação**: insatisfeitos contatados sobre insatisfeitos detectados, com o número dos dois lados |
| Nota de sentimento das abertas, de 0 a 100 | **Contagem de menções por fator com a citação literal ao lado.** A citação é o que convence a equipe, a contagem é o que prioriza |

### 10.2 O que colocar no e-mail das 16h

O relatório é diário, sai antes de abrir, e tem destinatários diferentes. A regra de ouro: **toda linha do relatório termina numa frase que um gerente pode executar no próximo turno. Se não termina, é vaidade e sai.**

| Bloco | Conteúdo | Para quem |
|---|---|---|
| 1. Ontem em quatro números | Respostas coletadas, conversão sobre mesas atendidas, contagem de detratores, contagem de promotores. Sem média, sem percentual isolado | Todos |
| 2. Incidentes de ontem | Uma linha por detrator: mesa, hora, fator, se houve contato, quanto tempo levou. Incidente sem contato aparece em destaque | Proprietário e gerência |
| 3. O fator da semana | O fator com mais menções nos últimos 7 dias, em contagem, com a diferença contra os 7 anteriores e duas citações literais | Área responsável |
| 4. Cozinha | Só fatores de comida e de tempo até a pizza, em contagem, com o prato quando houver | Cozinha |
| 5. Salão | Só fatores de atendimento, limpeza e ambiente, em contagem | Salão |
| 6. Pergunta em foco do mês | A pergunta rotacionada em foco, com n acumulado e a proporção. Se n for menor que 20, mostrar o n e **não** mostrar a proporção | Proprietário e gerência |
| 7. Cruzamento com o faturamento | Faturamento de ontem, ticket médio, e os dois pratos mais vendidos com a contagem de reclamações do trimestre ao lado | Proprietário |
| 8. Nada a relatar | Quando o dia foi normal, escrever "nada a relatar" em vez de encher de gráfico | Todos |

Crítica pessoal grave nunca entra nos blocos 4 e 5. Vai por linha separada, só para o proprietário, conforme o briefing.

### 10.3 O risco do outro extremo

Trocar relatório raso por relatório **denso e estatisticamente inválido** é pior, não melhor. Com 20 mesas por dia, cortar por garçom **e** por dia da semana **e** por prato ao mesmo tempo produz células com 1 ou 2 respostas. Sem n visível e sem faixa de incerteza, alguém vai demitir um garçom por ruído.

Daí a arquitetura de relatório em **duas camadas**, que é a recomendação central desta seção:

- **Camada de turno**, diária: contagem absoluta, nenhuma estatística, só "o que aconteceu ontem e o que fazer hoje".
- **Camada de tendência**, mensal e trimestral: proporções, comparações, n mínimo declarado e faixa de incerteza. Corte que não atinge o n mínimo **não é publicado**, aparece como "amostra insuficiente, n=7".

---

## 11. Engenharia de cardápio cruzando satisfação com margem

### 11.1 A matriz clássica, e quem faz o quê hoje

A matriz de engenharia de cardápio é de **Michael Kasavana e Donald Smith, Michigan State University, 1982**, com dois eixos, **margem de contribuição** e **popularidade**, gerando quatro quadrantes: **Stars** (popular e rentável), **Puzzles** (rentável e impopular), **Plow Horses** (popular e pouco rentável) e **Dogs** (nem popular nem rentável). Referências: [getmeez.com](https://www.getmeez.com/blog/menu-engineering-matrix), [modelo na ResearchGate](https://www.researchgate.net/figure/Menu-Engineering-Model-Kasavana-and-Smith-1982_fig2_332591712).

Do lado da satisfação por prato:

- **Yumpingo** é a referência mundial: pede ao cliente para avaliar **cada prato consumido**, e consolida em Food Score com Overall Recommendation 60% e Look, Taste, Portion e Value 10% cada, lido por semáforo (acima de 90 verde, 80 a 89 âmbar, abaixo de 79 vermelho).
- **Tattle** faz feedback e analytics no nível do item, e a mecânica mais valiosa dela é comparativa, verbatim: `See how a menu item performs against the menu average` (confirmado pelo verificador). Nota 4,2 não diz nada; 4,2 quando a média do cardápio é 4,6 diz tudo.

**Ninguém publica o cruzamento com margem.** Não encontrei nenhum fornecedor que publique produto cruzando nota do cliente com margem de contribuição no mesmo quadrante. Isso é **DESCONHECIDO**, não é "não existe": é ausência de evidência, e não posso provar que não existe. Ainda assim, é a lacuna de mercado mais concreta do dossiê inteiro, e o QT já tem a metade difícil pronta, que é ficha técnica e CMV.

### 11.2 A matriz de oito decisões

Manter os dois eixos de Kasavana e Smith (margem de contribuição em reais por item no vertical, unidades vendidas no horizontal) e usar a **satisfação como terceira dimensão visual**, cor ou tamanho do ponto. Quatro quadrantes viram oito decisões:

| Quadrante | Satisfação | Decisão | Quem executa |
|---|---|---|---|
| **Star** | Estável ou subindo | Não mexer. Proteger a ficha técnica e o fornecedor | Ninguém, e isso é a decisão |
| **Star** | **Caindo** | **Alerta de consistência de produção.** É o indicador mais valioso da matriz, porque pega desvio de execução antes de virar queda de venda | Cozinha, na hora |
| **Puzzle** (rentável, pouco vendido) | Alta | Problema de comunicação, não de produto. Reposicionar no cardápio, treinar sugestão do garçom, foto | Salão e cardápio |
| **Puzzle** | Baixa | Produto ruim e caro de vender. Tirar ou reformular a ficha técnica | Cozinha |
| **Plow Horse** (vende muito, margem baixa) | Alta | Item âncora clássico. Engenharia de custo na ficha técnica ou aumento cirúrgico de preço. **Nunca mexer na receita** | Proprietário |
| **Plow Horse** | **Baixa** | **Prioridade número um.** Vende muito e decepciona muito: é o principal gerador de review negativo | Cozinha, com prazo |
| **Dog** | Baixa | Sai do cardápio | Proprietário |
| **Dog** | Alta | Candidato a sazonal ou item de assinatura, não a item fixo | Proprietário |

Confiança: **alta** na matriz de 1982 e nos pesos da Yumpingo. **Baixa** nas oito regras de ação, que são derivação minha e não padrão publicado por ninguém.

### 11.3 O ajuste obrigatório para o QT, e ele muda o eixo

Existe um conflito real entre a matriz e as restrições do questionário, e ele precisa ficar explícito antes de alguém desenhar o gráfico.

**A avaliação prato a prato só acontece em nota baixa.** Logo, o QT **não vai ter nota média por prato**. Vai ter **evento de reclamação por prato**, e só de quem deu nota baixa. A quantidade: se 15% das respostas são de detratores e o mês tem 120 respostas, são cerca de **18 eventos de reclamação por mês**, espalhados por um cardápio de mais de 15 itens. Média por prato com esse n é ficção.

A solução não é forçar a média, é **trocar o eixo**:

| Eixo ingênuo | Por que quebra | Eixo correto |
|---|---|---|
| Nota média do prato | Amostral, minúscula, e enviesada para baixo por construção, porque só quem deu nota baixa é perguntado | **Reclamações por 100 unidades vendidas do prato**, no trimestre |
| Popularidade em respostas de pesquisa | Amostral | **Unidades vendidas do PDV (R3 do Altec)**, que é dado censitário |
| Margem estimada | | **Margem de contribuição da ficha técnica**, também censitária |

O ganho é grande e não é óbvio: **o denominador vem do PDV e é censitário, e o numerador é contagem de evento raro.** Contar evento raro contra denominador censitário é estatisticamente muito mais honesto do que estimar média de nota com n=4. E o resultado é diretamente acionável: "a Carbonara gerou 5 reclamações em 210 unidades vendidas no trimestre, 2,4 por 100, contra 0,6 por 100 na média do cardápio".

Regras mínimas de publicação, para a matriz não virar decisão errada bonita:

1. Janela **trimestral**, nunca mensal.
2. Mínimo de **3 eventos** de reclamação para o item aparecer sinalizado.
3. Mostrar sempre **numerador e denominador** ao lado da taxa.
4. A margem é censitária e a reclamação é amostral. Rotular os dois eixos com essa diferença, para ninguém tratar as duas incertezas como iguais.
5. **Nunca tirar prato do cardápio** com base em 3 ou 4 reclamações. A matriz prioriza investigação, ela não decide sozinha.

**E o sinal positivo por prato, de onde vem?** Do banco rotacionado da seção 7, que inclui "qual pizza você comeu hoje?" e perguntas de atributo por item. Essa é a fonte do lado bom da leitura, e é mais uma razão para dar peso alto a essa pergunta no banco. Se e quando a integração com o Altec entregar as linhas da comanda, a pergunta sai do banco e o atributo passa a ser perguntado sobre o item que a pessoa realmente comeu, que é a mecânica da Tattle e da Yumpingo. Até lá, perguntar direto é a alternativa barata: perde precisão em mesa compartilhada, e remove a dependência de integração.

---

## 12. Previsão de recompra com 20 mesas por dia: o que é possível e o que é ilusão

### 12.1 A resposta honesta, primeiro

**Não é viável treinar modelo supervisionado de churn no volume do QT.** Os sinais que o mercado usa são RFM (Recência, Frequência, Valor), com a **recência** como preditor mais forte. A camada de machine learning que aparece nos papers (LSTM, GRU, XGBoost, redes híbridas) opera sobre bases de e-commerce com dezenas de milhares de clientes; um dos papers reporta 99,5% de acurácia com GRU em conjuntos "menores", e menor nesse contexto ainda significa milhares de registros. Confiança: média nos sinais (li resumos e abstracts, não os papers completos), **alta na conclusão de inviabilidade**, que é inferência direta e segura a partir do tamanho da amostra.

Prometer previsão de churn com IA em cima de 50 a 200 respostas por mês é a promessa mais fácil de vender e a mais garantida de não funcionar. Um modelo treinado nesse volume produz lista de "clientes em risco" que é ruído puro, e a casa gasta cortesia com quem ia voltar de qualquer forma.

### 12.2 O bloqueio que vem antes do volume

Mesa não é cliente. **Sem identificador, nada disso funciona**, e o questionário é anônimo com contato opcional no fim. Então a variável que decide se o módulo existe é uma só: **quantos por cento deixam contato**. Esse número é **DESCONHECIDO** e não existe benchmark. Precisa ser medido no piloto.

| Se a taxa de contato opcional for | Com 120 respostas/mês, identificados por mês | Base identificada em 6 meses | Dá para quê? |
|---|---|---|---|
| 10% | 12 | cerca de 72 | Nada além de lista de contato |
| 25% | 30 | cerca de 180 | Coorte de retorno grosseira, RFM por regra |
| 40% | 48 | cerca de 288 | RFM por regra com corte por segmento |

E ainda assim: para medir **retorno**, é preciso a mesma pessoa duas vezes. Isso significa que o módulo de recompra não tem nada a dizer nos primeiros 3 a 6 meses, por construção. Não é falha de implementação, é o calendário.

### 12.3 O que é ilusão estatística, em números

Suponha o teste mais interessante do projeto: clientes recuperados voltam mais que os não recuperados? Com 30 identificados de cada lado, taxas de retorno de 30% e 60%:

- Erro padrão da diferença: cerca de **12 pontos percentuais**.
- Intervalo de 95%: cerca de **± 24 pontos**.
- Conclusão: **só uma diferença de 25 a 30 pontos percentuais é detectável.** Diferença de 10 pontos é invisível nesse n, o que não quer dizer que não exista.

Cálculo meu, aritmética verificável. Ou seja: o QT vai conseguir detectar um efeito enorme, e nunca vai conseguir medir um efeito moderado. Isso precisa estar escrito no painel, ao lado do número, para ninguém tomar decisão de dinheiro em cima de uma diferença de 8 pontos.

### 12.4 O que é possível e entrega valor real

| Entrega | Como funciona | Volume exigido | Veredito |
|---|---|---|---|
| **RFM por regra** | Score de 1 a 5 em recência, frequência e valor, com a **recência calibrada pelo intervalo mediano observado na própria base**, e não por uma janela de 90 dias copiada de varejo | Algumas dezenas de identificados | **Viável.** É SQL, não modelo |
| **Detecção em vez de previsão** | Em vez de prever quem vai sair, sinalizar quem **já saiu do padrão dele**: passou do intervalo mediano de visita e tinha frequência estabelecida | idem | **Viável, e a ação é a mesma.** É a substituição recomendada |
| **Coorte de retorno** | Percentual dos clientes identificados de cada mês que voltou em 30, 60 e 90 dias | 20 a 30 identificados por mês, lido em janela trimestral | **Viável com ressalva.** Intervalo largo, tendência legível |
| **Sinal composto de risco** | Cliente identificado que foi detrator, marcou fator crítico e **não voltou** dentro do intervalo mediano dele. É o cruzamento mais valioso e quase ninguém faz | Poucas dezenas | **Viável, e é o diferencial real.** Não precisa de modelo |
| **Taxa de retorno de recuperados contra não recuperados** | Coorte separada, ligada ao registro de recuperação da seção 8 | Ver 12.3 | **Viável só para efeito grande.** Publicar sempre com a faixa |
| **Modelo de ML de churn** | Supervisionado sobre histórico | Milhares de clientes | **Inviável por volume, não por custo.** Não construir |
| **Previsão de valor de vida do cliente** | Olo faz com ML sobre PDV, pedido, loyalty e feedback unificados | Milhares | **Inviável.** O método da Olo é **NÃO PÚBLICO** de todo modo |

**Lacunas registradas:** não pesquisei os requisitos de LGPD para captura e retenção de telefone de cliente em pesquisa, e isso precisa ser levantado **antes** de coletar identificador. E nenhuma ferramenta de guest experience de restaurante publica como faz previsão de churn: a Ovation vende Retention Marketing como tier de produto, e o método é **NÃO PÚBLICO**.

### 12.5 A consequência para o questionário

Se o módulo de recompra depende inteiramente da taxa de contato opcional, então **a tela de contato é a tela mais importante do questionário depois da nota**, e o texto dela vale mais que qualquer modelo. Duas regras que saem daí, e estão aplicadas na seção 14:

1. **Dizer para que serve, em uma linha.** Contato sem propósito declarado converte pior e, sob LGPD, consentimento sem finalidade específica é frágil.
2. **Não prometer anonimato que o desenho não entrega.** Quem deixa contato deixa de ser anônimo, e o texto tem que dizer isso com honestidade. Prometer "sua resposta continua anônima" logo depois de pedir o WhatsApp é ao mesmo tempo falso e ruim para o consentimento.

---

## 13. Design da tela em tablet

Aqui o padrão vem de norma, não de fornecedor, e isso é bom porque é verificável.

### 13.1 Tamanho de toque

| Critério | Exigência | Nível |
|---|---|---|
| [WCAG 2.2, 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | `The size of the target for pointer inputs is at least 24 by 24 CSS pixels` | AA |
| [WCAG 2.2, 2.5.5 Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) | `at least 44 by 44 CSS pixels` | AAA |

A justificativa está no próprio documento do WCAG: `A finger is larger than a mouse pointer, and generally obstructs the user's view of the precise location on the screen that is being touched/activated`.

Recomendação para o QT: **mirar o AAA de 44 por 44 CSS pixels como mínimo absoluto**, e usar alvos muito maiores nas telas de nota. Os 11 botões do NPS devem ocupar a largura útil, em duas fileiras de 6 e 5, com **60 a 80 pixels de lado** e espaçamento generoso. O contexto justifica: cliente sentado de lado, celular na outra mão, taça e conta na mesa, luz baixa. Aplicar o AAA em vez do AA é decisão do projeto, não exigência da norma.

Confiança: **alta** nos dois critérios, lidos no texto normativo do W3C. As referências de 44 pontos da Apple e 48dp do Material Design **não foram verificadas** nesta pesquisa (as páginas renderizam por JavaScript e retornaram só o título), então não são citadas como fonte oficial aqui.

### 13.2 Contraste, com a paleta da QT calculada

O parâmetro é o WCAG 1.4.3 Contrast (Minimum): **4,5:1** para texto normal e **3:1** para texto grande. Confiança média, porque essa página específica não foi aberta nesta pesquisa, e o critério é conhecimento consolidado do WCAG.

Aplicando a fórmula de contraste do WCAG à paleta do manual da QT (cálculo meu, aritmética verificável):

| Combinação | Contraste | Veredito |
|---|---|---|
| Preto `#1A1E1E` sobre branco `#EFECEC` | **14,3:1** | Passa AAA com muita folga. É a combinação principal das telas |
| Cinza `#A0A5A5` sobre branco `#EFECEC` | **2,1:1** | **Reprova até no 3:1 de texto grande.** O cinza da marca não pode ser texto sobre fundo claro. Só borda, divisória e elemento decorativo grande |
| Cinza `#A0A5A5` sobre preto `#1A1E1E` | **6,8:1** | Passa AA para texto normal |

Achado concreto: **a paleta da QT já é acessível, com uma exceção que vai aparecer na primeira tela desenhada.** O cinza `#A0A5A5` é a cor natural para texto secundário ("opcional", "toque para continuar", âncoras da escala), e é justamente onde ele reprova. O texto secundário tem que ser preto com opacidade reduzida controlada, ou um cinza mais escuro derivado, nunca `#A0A5A5` puro sobre fundo claro.

Sobre modo escuro: a pesquisa recomenda fundo escuro por causa do jantar, e o manual de marca prefere fundo branco. **Não é preciso escolher entre os dois.** O fundo `#EFECEC` do manual já não é branco puro `#FFFFFF`, e o par com `#1A1E1E` dá 14,3:1. A ofensa em ambiente de luz baixa é o brilho, não a cor: fixar o brilho do tablet em nível médio, evitar `#FFFFFF` em qualquer área grande e não usar animação de alto contraste resolve sem contrariar a marca.

### 13.3 Tempo de tela, timeout e reinício entre clientes

O padrão de quiosque é timeout de inatividade entre **30 e 90 segundos**, com recomendação mais comum de 30 a 60, sempre com **contagem visível** e opção de cancelar, no formato "esta tela será reiniciada em 30 segundos". Nunca expirar de surpresa. Fontes de indústria: [kioskindustry.org](https://kioskindustry.org/kiosk-ux-ui-how-to-design-checklist/), [kioskmarketplace.com](https://www.kioskmarketplace.com/blogs/kiosk-idle-timeout-what-happens-when-they-walk-away/), [support.kioskgroup.com](https://support.kioskgroup.com/article/991-idle-time-limit). **Isso não é norma, é convenção de indústria**, e nenhuma fonte publica teste com número de conversão por duração de timeout. Confiança média. A documentação oficial de quiosque da Delighted retornou HTTP 410, então o comportamento dela é **DESCONHECIDO**.

Especificação para o QT:

| Item | Valor | Razão |
|---|---|---|
| Modo quiosque real no sistema operacional | Obrigatório | O cliente não pode sair do app nem alcançar dado de outra mesa |
| Timeout de inatividade | **45 segundos**, com contagem visível a partir dos 15 finais | Casa com o teto de duração e evita expirar no meio de uma leitura |
| Ação no timeout | Volta para a tela inicial **e apaga os dados da sessão** | Nunca deixar resposta parcial visível para o próximo |
| Resposta parcial | **Salvar a nota se ela já foi dada**, descartar o resto | A nota é o dado obrigatório. Perder uma nota por timeout é perder amostra que já é escassa |
| Tela de agradecimento | Auto-reset em **8 a 10 segundos** | O garçom não precisa tocar no tablet entre mesas |
| Transição entre telas | Abaixo de 2 segundos | Acima disso o cliente acha que travou |
| Uma pergunta por tela, **sem rolagem** | Obrigatório | Rolagem em quiosque é onde o abandono acontece |
| Teclado | **Nenhum campo de teclado no caminho principal.** Teclado só na aberta opcional e no contato opcional | Teclado é a maior fonte de fricção e de abandono |
| Fila local de envio | Desejável | WiFi de salão cai, e perder resposta é perder amostra pequena. O briefing não exige offline, mas a fila é seguro barato |
| Botão de voltar | Uma tela para trás, sempre | Toque errado em alvo de 60px acontece, e sem voltar a pessoa abandona |
| Instrumentação de tempo | **Obrigatória.** Carimbo de tempo por tela, relatório semanal com mediana e p90 da duração total | É o que transforma o teto de 45 segundos em número medido, conforme a seção 1.4 |

### 13.4 Percepção de anonimato, que é o que sustenta o volume

Este é o item que decide se o QT coleta 50 ou 200 respostas por mês, e é o mais fácil de estragar sem perceber.

A evidência: a **HappyOrNot** construiu um negócio inteiro sobre anonimato total em totem, e os volumes que ela reporta são de outra ordem de magnitude. E a **Risposta**, o fornecedor atual, documenta que o tablet responde por cerca de **90% das avaliações porque permite resposta anônima** ([risposta.app](https://www.risposta.app/risposta-qr-code/)). O anonimato não é uma concessão de privacidade, é o motor do volume.

Regras de desenho que preservam a percepção:

1. **Nenhum campo de identificação antes da última tela.** Nem nome, nem mesa visível para o cliente, nem "para começar, digite seu e-mail".
2. **Nada de login do cliente.** O PIN é do garçom, na tela de abertura, e o cliente não vê essa tela.
3. **A tela de abertura não pode conter vestígio da resposta anterior.** Reset completo de estado, sempre.
4. **Depois de enviar, o tablet não mostra a resposta.** Sem tela de resumo, sem "você deu nota 8". O garçom que recolhe o aparelho não pode ler nada.
5. **Nenhum alerta no tablet.** O aviso de nota baixa vai para o celular do gerente e para nenhum outro lugar. Som, vibração ou aviso na tela entregam o cliente.
6. **Frase explícita na tela 1**, e ela precisa ser verdadeira: a resposta não leva nome, e o garçom não vê o que foi respondido.
7. **Honestidade na tela de contato.** Quem deixa contato deixa de ser anônimo, e a tela tem que dizer isso.
8. **O garçom se afasta.** É processo humano, custo zero, e faz mais pela percepção de anonimato que qualquer linha de código.

### 13.5 Antifraude, que é o outro lado da mesma moeda

A Risposta documenta o risco de manipulação de amostra pela equipe no QR Code, verbatim: `O grande risco de usar QR Code somente é a manipulação das amostras por parte das equipes`. No tablet o risco muda de forma: **o garçom responder por si mesmo para melhorar a própria nota**. Como o briefing prevê nota por garçom, o incentivo existe.

Travas baratas: uma resposta por comanda; janela de tempo válida amarrada ao fechamento da comanda; alerta de duração anômala (resposta completa em menos de 8 segundos é suspeita); e um relatório de **respostas coletadas contra comandas fechadas por garçom**, que expõe tanto quem não pede quanto quem pede demais. Nenhuma dessas travas exige hardware.

---

## 14. O QUESTIONÁRIO RECOMENDADO PARA O QT

### 14.1 Mapa do fluxo

```
[T0] Garçom: mesa + PIN          (não conta no tempo do cliente)
        |
[T1] NOTA 0 a 10                  OBRIGATÓRIA        ~8 s
        |
        +-- 9 ou 10 (promotor) --> [T2A] o que mais agradou      opcional  ~7 s
        |                          [T3] rotacionada 1            opcional  ~7 s
        |                          [T4] rotacionada 2            opcional  ~7 s
        |
        +-- 7 ou 8 (neutro) -----> [T2B] o que faltou para ser 10 opcional ~7 s
        |                          [T3] rotacionada 1            opcional  ~7 s
        |
        +-- 0 a 6 (detrator) ----> [T2C] onde erramos (categoria) opcional ~7 s
                                        |
                                        +-- Comida --> [T3C1] grupo do item  ~5 s
                                        |              [T3C2] qual item      ~6 s
                                        |              [T3C3] o que houve    ~7 s
                                        |
                                        +-- outra ---> [T3C] fator da categoria ~7 s
        |
[T5] ABERTA, ancorada na nota      opcional  ~3 s para pular
        |
[T6] CONTATO                       opcional  ~3 s para pular
        |
[T7] AGRADECIMENTO                 auto-reset em 8 s. Fim. Sem Google, sem cupom, sem Instagram
```

### 14.2 Orçamento de tempo por caminho

| Caminho | Telas de conteúdo | Tempo estimado sem digitar | Margem no teto de 45 s |
|---|---|---|---|
| Promotor (9 ou 10) | 4 | **35 s** | 10 s |
| Neutro (7 ou 8) | 3 | **28 s** | 17 s |
| Detrator, causa não é comida | 3 | **28 s** | 17 s |
| Detrator, causa é comida | 5 | **39 s** | **6 s. O caminho mais apertado** |

Premissas explícitas: 8 s na tela de nota (11 alvos), 6 a 7 s por tela de um toque, 5 s na tela de grupo (4 alvos), 3 s para pular uma tela opcional. **Confiança baixa nesses segundos**: são estimativa, não medição, e é exatamente por isso que a instrumentação da seção 13.3 é obrigatória. Regra de corte definida de antemão: se o p90 do caminho de detrator passar de 45 s, **a tela T3C3 sai** e o fator do item passa a ser inferido pelo texto aberto.

Quem digita na aberta ou no contato estoura os 45 segundos, e isso é aceitável: é escolha da pessoa, não imposição do formulário. O teto de 45 segundos vale para o **caminho sem digitação**, e essa distinção precisa estar escrita no painel para ninguém achar que a meta foi furada.

**Regra estrutural que amarra tudo:** ninguém recebe a ramificação de nota baixa **e** o bloco rotacionado. É o que mantém os quatro caminhos dentro do teto.

### 14.3 Tela por tela, com o texto exato

Idioma: **português é o padrão**, com um botão `EN` fixo no alto à direita, presente em todas as telas, alvo de 44 px, trocando o idioma da sessão sem reiniciar a resposta. Não existe tela de escolha de idioma: ela custaria 2 a 3 segundos de todo mundo para servir a poucos.

---

#### T0. Abertura pelo garçom (o cliente não vê)

| Campo | Texto | Obrigatório |
|---|---|---|
| Mesa | `Mesa` | Sim |
| PIN | `Seu PIN` | Sim |
| Botão | `Entregar ao cliente` | |

Tempo: cerca de 5 s do garçom, fora do orçamento do cliente. Se a integração com o Altec entregar a comanda, esta tela vira uma seleção de comanda aberta, e o PIN continua, porque é ele que amarra a nota ao garçom.

---

#### T1. Nota. **A única tela obrigatória**

| | Texto |
|---|---|
| **PT** | **De 0 a 10, o quanto você recomendaria o QT para um amigo ou familiar?** |
| Âncoras PT | `0 · não recomendaria` à esquerda, `10 · recomendaria com certeza` à direita |
| Rodapé PT | `Sua resposta é anônima. O garçom não vê o que você responde.` |
| **EN** | **From 0 to 10, how likely are you to recommend QT to a friend or family member?** |
| Âncoras EN | `0 · not at all likely`, `10 · extremely likely` |
| Rodapé EN | `Your answer is anonymous. Your server does not see what you answer.` |

Desenho: 11 botões, duas fileiras (6 e 5), 60 a 80 px de lado, sem rolagem. Toque avança sozinho, sem botão de confirmar. Sem opção de pular: é a única tela obrigatória do questionário inteiro.

Tempo estimado: **8 s**.

---

#### T2A. Promotor (nota 9 ou 10)

| | Texto |
|---|---|
| **PT** | **Que bom. O que mais te agradou hoje?** `Toque em até 2. Ou pule.` |
| **EN** | **Great to hear. What did you enjoy most tonight?** `Pick up to 2. Or skip.` |

Opções, seleção múltipla até 2, mais `Pular`:

| PT | EN |
|---|---|
| A pizza | The pizza |
| O atendimento | The service |
| O tempo de espera | The wait time |
| As bebidas | The drinks |
| O ambiente | The atmosphere |
| A entrada | The starter |
| A sobremesa | The dessert |
| Valeu o preço | Worth the price |

Opcional. Tempo: **7 s**.

---

#### T2B. Neutro (nota 7 ou 8)

| | Texto |
|---|---|
| **PT** | **O que faltou para ser 10?** `Toque em até 2. Ou pule.` |
| **EN** | **What kept it from being a 10?** `Pick up to 2. Or skip.` |

Mesmas oito opções da T2A, mais `Pular`. Esta é a tela de maior valor diagnóstico do questionário inteiro: o neutro sabe exatamente o que faltou e não tem raiva para distorcer a resposta.

Opcional. Tempo: **7 s**.

---

#### T2C. Detrator (nota 0 a 6)

| | Texto |
|---|---|
| **PT** | **Desculpe. Onde a gente errou?** `Toque em 1. Ou pule.` |
| **EN** | **We're sorry. Where did we get it wrong?** `Pick 1. Or skip.` |

| PT | EN | Abre |
|---|---|---|
| A comida | The food | T3C1, grupo do item |
| O tempo de espera | The wait | T3C, fatores de tempo |
| O atendimento | The service | T3C, fatores de atendimento |
| As bebidas | The drinks | T3C, fatores de bebida |
| O ambiente | The atmosphere | T3C, fatores de ambiente |
| A limpeza | Cleanliness | T3C, fatores de limpeza |
| O preço | The price | T3C, fatores de preço |
| A reserva ou a espera pela mesa | Booking or table wait | T3C, fatores de reserva |
| Outra coisa | Something else | vai direto para T5 |

Opcional, mas dispara o **alerta de recuperação** no instante do toque, mesmo se a pessoa pular as telas seguintes. O gatilho é a nota, não o motivo.

Tempo: **7 s**.

---

#### T3C1, T3C2, T3C3. Prato a prato, só quando a nota é baixa e a causa é comida

**T3C1, grupo:**

| | Texto |
|---|---|
| **PT** | **O que não estava bom?** |
| **EN** | **What wasn't right?** |

Opções: `Pizza` · `Entrada` · `Sobremesa` · `Mais de um item`. Tempo: **5 s**.

**T3C2, item:** lista do grupo escolhido, um toque, 6 a 7 alvos por tela, sem rolagem, mais `Prefiro não dizer`.

| | Texto |
|---|---|
| **PT** | **Qual?** |
| **EN** | **Which one?** |

Tempo: **6 s**. Quando a integração com o Altec existir, esta tela vem **pré-preenchida com as linhas da comanda** (mecânica da Tattle e da Yumpingo), e a T3C1 desaparece, economizando 5 s.

**T3C3, fator do item:**

| | Texto |
|---|---|
| **PT** | **O que aconteceu com ele?** |
| **EN** | **What was wrong with it?** |

| PT | EN |
|---|---|
| Sabor | Flavor |
| Chegou frio | Arrived cold |
| Ponto da massa | The crust |
| Apresentação | Presentation |
| Ingrediente sem frescor | Not fresh |
| Veio errado ou faltou item | Wrong or missing item |

Fatores de comida da Tattle (`texture, flavor, temperature, presentation and freshness`), com "ponto da massa" no lugar de textura, porque é pizzaria, e "veio errado" trazido de Accuracy. Tempo: **7 s**.

---

#### T3C. Fator, para as categorias que não são comida

Uma tela, um toque, opções conforme a categoria escolhida em T2C. Tempo: **7 s**.

| Categoria | Opções PT | Opções EN | Origem |
|---|---|---|---|
| Tempo | Espera pela mesa · Espera pela bebida · Espera pela pizza · Espera pela conta | Wait for a table · Wait for drinks · Wait for the pizza · Wait for the bill | Decomposição minha para pizzaria. A Tattle **não publica** os fatores de Speed of Service |
| Atendimento | Recepção na chegada · Simpatia · Atenção durante a refeição · Conhecimento do cardápio · Despedida | Greeting · Friendliness · Attention during the meal · Menu knowledge · Farewell | Fatores de Hospitality da Tattle: `friendliness, greeting, farewell, eye contact and smiles` |
| Bebidas | Temperatura · Demorou · Qualidade · Veio errada | Temperature · Took too long · Quality · Wrong drink | ACSI mede bebida como atributo separado |
| Ambiente | Ruído · Temperatura do salão · Iluminação · Conforto da mesa | Noise · Room temperature · Lighting · Table comfort | Templates de mercado. A Tattle **não publica** fatores de Ambiance |
| Limpeza | A mesa · O salão · O banheiro | The table · The dining room · The restroom | Banheiro separado, porque é o que aparece em review público |
| Preço | Não valeu o que paguei · Preço da pizza · Preço das bebidas · Couvert ou taxa | Not worth what I paid · Pizza price · Drink prices · Cover or service charge | Formulação de Value da Yumpingo |
| Reserva ou espera | A reserva não foi honrada · Esperei muito para sentar · A mesa não era a que eu pedi | My booking wasn't honored · Waited too long for a table · Wrong table | Específico do QT, que tem sistema de reservas próprio |

---

#### T3 e T4. Bloco rotacionado

Promotor recebe **2**, neutro recebe **1**, detrator recebe **0**. Cada uma vem do banco da seção 14.5, sorteada por peso, com as sete regras da seção 7.3. Cabeçalho fixo em todas:

| | Texto |
|---|---|
| **PT** | `Só mais uma coisa (opcional)` |
| **EN** | `Just one more thing (optional)` |

Botão `Pular` sempre visível, no mesmo tamanho das opções. Tempo: **7 s** cada.

---

#### T5. Aberta, ancorada na nota

| Faixa | PT | EN |
|---|---|---|
| 9 ou 10 | **O que a gente fez bem hoje?** `Opcional` | **What did we get right tonight?** `Optional` |
| 7 ou 8 | **O que a gente pode melhorar?** `Opcional` | **What could we do better?** `Optional` |
| 0 a 6 | **Conta rápido o que aconteceu?** `Opcional` | **Tell us briefly what happened?** `Optional` |

Uma só aberta, sempre a última pergunta de conteúdo, sempre opcional, sempre ancorada na nota. Caixa pequena, com altura de duas linhas, que cresce conforme a pessoa digita. Botão `Pular` grande e à mostra. Nunca "algum comentário?".

Tempo: **3 s** para pular, 20 a 40 s para quem escolhe escrever.

---

#### T6. Contato, opcional

| | Texto |
|---|---|
| **PT** | **Quer que a gente te responda?** `Deixe WhatsApp ou e-mail. É opcional, e serve só para isso.` |
| Rodapé PT | `Sua nota já foi registrada. Se você deixar contato, ele fica ligado a esta resposta.` mais link `Como usamos seus dados` |
| **EN** | **Want us to get back to you?** `Leave a WhatsApp number or email. Optional, and used only for that.` |
| Rodapé EN | `Your rating is already saved. If you leave a contact, it will be linked to this response.` plus `How we use your data` |

Dois campos, um toque para abrir teclado, botão `Pular` do mesmo tamanho do `Enviar`.

O rodapé é deliberado e não é jurídico por acaso: prometer que a resposta "continua anônima" depois de pedir o WhatsApp seria falso, e consentimento sob LGPD precisa de finalidade específica. A honestidade aqui é o que sustenta a taxa de contato ao longo do tempo, que é a variável que decide o módulo de recompra (seção 12.5).

Tempo: **3 s** para pular.

---

#### T7. Agradecimento e encerramento

| | Texto |
|---|---|
| **PT** | **Obrigado. Boa noite.** |
| **EN** | **Thank you. Have a good evening.** |

Só isso. Sem convite ao Google, sem cupom, sem Instagram, sem QR Code, sem pesquisa de satisfação sobre a pesquisa. Auto-reset para a tela do garçom em **8 segundos**, sem exibir nada da resposta que acabou de ser enviada.

Tempo: fora do orçamento do cliente.

### 14.4 O que é obrigatório e o que é opcional, em uma tabela

| Tela | Obrigatório | Pode pular | Dispara ação |
|---|---|---|---|
| T1, nota 0 a 10 | **Sim** | Não | Nota de 0 a 6 dispara alerta de recuperação em menos de 30 s |
| T2A, T2B, T2C | Não | Sim | T2C alimenta o alerta com categoria |
| T3C1, T3C2, T3C3 | Não | Sim | Alimenta a matriz de cardápio da seção 11 |
| T3C, fator | Não | Sim | Alimenta a contagem de fator do relatório |
| T3 e T4, rotacionadas | Não | Sim | Alimenta a cobertura mensal do banco |
| T5, aberta | Não | Sim | Vai para o classificador em lote |
| T6, contato | Não | Sim | Habilita recuperação individual e coorte de retorno |
| T7, agradecimento | Não se aplica | Auto-reset | Nenhuma |

**Uma resposta é válida com a nota e nada mais.** O sistema tem que gravar e contar essa resposta como completa, e o painel tem que mostrar, por tela, quanta gente pulou. Taxa de pulo por tela é o melhor sinal de que uma tela está mal escrita, e sai de graça.

### 14.5 O banco de perguntas rotacionadas

Vinte perguntas, todas de um toque, todas opcionais, todas com resposta que vira contagem. Peso `alto` recebe cerca de duas vezes o sorteio de `médio`, e `baixo` cerca de metade. A coluna "sai do banco quando" é a regra da seção 7.3, item 7: pergunta que o sistema pode responder sozinho não gasta slot de pesquisa.

| # | PT | EN | Opções | Dimensão | Peso | Sai do banco quando |
|---|---|---|---|---|---|---|
| 1 | **Qual pizza você comeu hoje?** | **Which pizza did you have tonight?** | Lista das pizzas · Mais de uma · Não comi pizza | Item | **Alto** | A comanda do Altec entrar no sistema |
| 2 | **A pizza chegou na temperatura certa?** | **Was your pizza served at the right temperature?** | Sim · Mais ou menos · Não | Comida, temperatura | **Alto** | Nunca |
| 3 | **Como estava o ponto da massa?** | **How was the crust?** | Bom · Muito mole · Muito seca ou queimada | Comida, execução de forno | **Alto** | Nunca |
| 4 | **Quanto tempo você esperou pela pizza?** | **How long did you wait for your pizza?** | Rápido · No tempo certo · Demorou | Tempo, forno | **Alto** | O PDV expor hora do pedido e hora da entrega |
| 5 | **Quanto tempo você esperou pela primeira bebida?** | **How long did you wait for your first drink?** | Rápido · No tempo certo · Demorou | Tempo, bar | Médio | Nunca |
| 6 | **A bebida veio na temperatura certa?** | **Was your drink at the right temperature?** | Sim · Não | Bebida | Médio | Nunca |
| 7 | **Alguém te recebeu bem na chegada?** | **Were you greeted well when you arrived?** | Sim · Mais ou menos · Não | Atendimento, recepção | Médio | Nunca |
| 8 | **O garçom soube explicar o cardápio?** | **Did your server explain the menu well?** | Sim · Em parte · Não · Não perguntei | Atendimento, conhecimento | Médio | Nunca |
| 9 | **Você pediu entrada hoje? Como estava?** | **Did you order a starter tonight? How was it?** | Não pedi · Boa · Regular · Ruim | Comida, entradas | Médio | A comanda entrar no sistema |
| 10 | **Você pediu sobremesa hoje? Como estava?** | **Did you order dessert tonight? How was it?** | Não pedi · Boa · Regular · Ruim | Comida, sobremesas | Médio | A comanda entrar no sistema |
| 11 | **Valeu o que você pagou?** | **Was it worth what you paid?** | Valeu · Mais ou menos · Não valeu | Valor percebido | **Alto** | Nunca. É a formulação de Value da Yumpingo e a única forma honesta de perguntar preço |
| 12 | **O nível de ruído estava confortável?** | **Was the noise level comfortable?** | Confortável · Alto · Muito alto | Ambiente | Médio | Nunca |
| 13 | **A temperatura do salão estava boa?** | **Was the room temperature comfortable?** | Boa · Quente · Fria | Ambiente | Baixo | Nunca |
| 14 | **Sua mesa estava limpa e posta quando você sentou?** | **Was your table clean and set when you sat down?** | Sim · Mais ou menos · Não | Limpeza, mesa | Médio | Nunca |
| 15 | **Se você usou o banheiro, estava limpo?** | **If you used the restroom, was it clean?** | Não usei · Limpo · Mais ou menos · Sujo | Limpeza, banheiro | **Alto** | Nunca. É o fator que mais aparece em review público negativo |
| 16 | **Você esperou para sentar? Quanto?** | **Did you wait for a table? How long?** | Não esperei · Até 10 min · 10 a 30 min · Mais de 30 min | Fila e reserva | Médio | O sistema de reservas expuser hora de chegada e hora de acomodação |
| 17 | **É sua primeira vez no QT?** | **Is this your first time at QT?** | Primeira vez · Já vim antes · Venho sempre | Mix de novo e recorrente | **Alto** | Nunca. É a base do corte de coorte sem precisar identificar ninguém |
| 18 | **Como você conheceu o QT?** | **How did you hear about QT?** | Indicação · Instagram · Google ou mapa · Passei na frente · Já conhecia | Aquisição | Médio | Nunca |
| 19 | **Você sentou na varanda ou no salão?** | **Were you seated on the veranda or indoors?** | Varanda · Salão | Área do salão | Baixo | **Imediatamente**, se o mapa das 22 mesas estiver no sistema. O número da mesa já responde |
| 20 | **Você fez reserva? Como foi?** | **Did you book a table? How was the booking?** | Não reservei · Fácil · Confuso · Deu problema | Reservas | Médio | O app de reservas próprio expuser o dado |

Notas de uso do banco:

- **Comece com 12, não com 20.** Menos perguntas com peso significa mais respostas por pergunta no primeiro trimestre, quando a linha de base está sendo formada. Sugestão de arranque: 1, 2, 3, 4, 11, 15, 17, mais cinco escolhidas pelo que a operação vai mexer no mês.
- **Perguntas 1, 4, 9, 10, 16, 19 e 20 são temporárias por desenho.** Todas morrem quando a integração correspondente entrar. Um banco que só cresce é sinal de que ninguém está olhando as integrações.
- **Nenhuma pergunta do banco usa teclado.** Nenhuma exceção.
- **Nenhuma pergunta do banco pede nota de 1 a 5.** Duas ou três opções nomeadas contam melhor e leem mais rápido que escala numérica, e contagem é o que o relatório da seção 10 usa.
- **Nunca colocar no banco pergunta sobre garçom nomeado.** O PIN já amarra a resposta ao garçom, e perguntar o nome destrói o anonimato percebido, que é o motor do volume.

### 14.6 O que este questionário deliberadamente não faz

| Não faz | Por quê |
|---|---|
| Não abre com emoji de 5 pontos | O briefing fixou NPS de 0 a 10 como escala principal. O custo de conversão está registrado na seção 2.2 e mitigado no desenho dos 11 alvos grandes |
| Não convida ao Google, nem para todos | Decisão do cliente. Convite igual para todos seria permitido (seção 9), mas não construir remove o item de maior risco do projeto |
| Não oferece cupom, brinde nem sorteio | Incentivo por avaliação é proibido pelo Google, e o briefing já decidiu que o pedido é humano e de custo zero |
| Não pergunta as nove dimensões a todo mundo | Derrubaria a taxa de entrada de perto de 16% para perto de 7%, pelos dados da Survicate |
| Não faz segunda onda 24h no lançamento | A mecânica da Ovation depende de contato, e aqui o contato é opcional e a fração é desconhecida. Fase 2, e só depois de medir a taxa de contato |
| Não pede nome | Anonimato é o motor do volume (seção 13.4) |
| Não usa escala de 1 a 5 no banco | Contagem de opções nomeadas é mais legível em n pequeno |
| Não mostra a nota depois de enviar | Para o garçom que recolhe o tablet não conseguir ler |

---

## 15. Comparação com as perguntas que o Risposta usa hoje

**Seção reservada. Vazia de propósito.**

O proprietário vai enviar prints das perguntas que o Risposta aplica hoje. **Nada foi assumido, inferido ou reconstruído sobre elas neste documento.** O que existe hoje é apenas o que a Risposta publica na própria página sobre canal e volume, citado na seção 4.1, e nenhuma informação pública sobre o texto das perguntas.

Quando os prints chegarem, preencher a tabela abaixo e voltar a este documento.

| Aspecto | Risposta, hoje | Recomendado, seção 14 | Diferença e o que fazer |
|---|---|---|---|
| Número de telas no caminho normal | *a preencher* | 4 a 6 | |
| Escala da pergunta principal | *a preencher* | NPS 0 a 10 | |
| Texto exato da pergunta principal | *a preencher* | Seção 14.3, T1 | |
| Quantas perguntas são obrigatórias | *a preencher* | 1 | |
| Existe ramificação por nota? | *a preencher* | Sim, três caminhos | |
| Avaliação prato a prato | *a preencher* | Só em nota baixa | |
| Existe banco rotacionado? | *a preencher* | Sim, 20 perguntas | |
| Perguntas abertas: quantas e onde | *a preencher* | Uma, no fim, ancorada na nota | |
| Captura de contato: obrigatória ou opcional | *a preencher* | Opcional, no fim | |
| Tela final: o que oferece | *a preencher* | Só agradecimento | |
| Convite ao Google, e se é condicionado à nota | *a preencher* | Não existe | **Ponto de atenção da seção 9.** Se o Risposta condiciona o convite à nota, isso é review gating operando hoje no perfil do QT, e vale checar o estado do perfil no Google antes da troca |
| Idiomas | *a preencher* | Português e inglês | |
| Duração estimada | *a preencher* | 28 a 39 s sem digitar | |

Checklist do que olhar nos prints, para a comparação render:

1. A pergunta principal é de recomendação ou de satisfação, e qual é a escala exata.
2. Quantos campos são obrigatórios, e se algum deles pede teclado.
3. Se existe ramificação, e se ela é por nota ou por categoria.
4. Se a tela final oferece algo (Google, cupom, cadastro, Instagram) e se essa oferta depende da nota.
5. Se existe captura de nome ou telefone, e em que ponto do fluxo ela aparece.
6. Se alguma pergunta amarra a resposta a um garçom nomeado.
7. Quantas perguntas existem no total, e se todas aparecem para todo mundo.

Duas perguntas que os prints vão responder e que valem dinheiro: **quantas perguntas o QT está pagando para fazer hoje** e **quais dessas perguntas jamais viraram uma decisão**. A segunda é a definição operacional da queixa de que o relatório atual é raso.
