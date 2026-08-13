# 00. Sumário executivo e recomendação final

> ## ERRATA, 13/08/2026
>
> **Este documento é da Etapa 2 e foi escrito antes da inspeção do ambiente Supabase e antes das decisões do proprietário (D1 a D4).** Três recomendações dele estão **revogadas**, e o corpo do texto foi mantido como está para que o histórico da recomendação continue legível.
>
> **1. "Criar a organização Supabase separada"** (seção 4, tabela de riscos e seção 6). A inspeção do ambiente encontrou **uma única organização** (`QT Pizza Bar`) e o **teto de 2 projetos ativos já atingido**, ou seja, a recomendação não é aplicável sem criar outra conta ou pagar. No lugar dela vale a decisão **D2**: schema dedicado `experiencia` dentro do projeto `NFe e Financeiro`, na região `sa-east-1`, com as quatro condições inegociáveis da decisão.
>
> **2. A rota C, com ponte de coleta para cancelar a mensalidade na semana 1** (seções 3.3, 2.4 e 6, mais a linha de tempo de retorno do topo). Por **D1**, os tablets são comprados **antes** do cancelamento. A ponte existia unicamente para permitir cancelar na semana 1 e, sem essa finalidade, sai do escopo.
>
> **3. Pedir o Basic API Access da Google Business Profile API para acender a divergência entre pesquisa e avaliação pública na fase 2** (seção 6). Por **D3**, vale **somente link** para Google e iFood, sem API, nem no MVP nem na fase 2, e a detecção de divergência sai da auditoria por IA.
>
> **Para onde ir agora, nesta ordem:** [`docs/01-decisoes.md`](../01-decisoes.md) (as decisões do proprietário, que têm precedência sobre tudo), [`docs/pesquisa/dados/10-supabase-inspecao.md`](dados/10-supabase-inspecao.md) (o estado real do ambiente) e [`docs/pesquisa/etapa-3/00-canonico.md`](etapa-3/00-canonico.md) (a folha de valores canônicos da Etapa 3).

**Hoje:** R$ 501 a R$ 1.000/mês, ou **R$ 6.012 a R$ 12.000/ano**, por 50 a 200 respostas/mês. Isso dá **R$ 2,51 a R$ 20,00 por resposta coletada**, contra o único piso que o fornecedor publica (R$ 200/mês com tablet, R$ 150/mês só QR Code): a fatura está entre **2,5 e 5 vezes** o preço público dele.
**O substituto:** infraestrutura de **R$ 0,00/mês**, verificada camada por camada em página oficial de cada fornecedor, com consumo entre **0,04% e 7,2%** dos limites gratuitos. Dez anos de histórico ocupam 36 MB contra 500 MB grátis.
**Pior cenário verificável:** Supabase Pro mais Resend Pro, **US$ 45/mês**, ou R$ 2.700 a R$ 3.240/ano (câmbio **NÃO VERIFICADO**, duas pontas declaradas de R$ 5,00 e R$ 6,00 por dólar).
**Economia anual:** **R$ 6.012 a R$ 12.000 (100%)** no cenário realista, e **46% a 78%** no pessimista. Não existe cenário verificado em que a economia caia abaixo de 46%.
**Desembolso único:** 2 tablets Android de entrada (preço em BRL **NÃO VERIFICADO**, exige cotação no ato) mais 2 licenças de quiosque a 8,90 EUR cada, pagamento único. **Nenhum Raspberry Pi.**
**Tempo de retorno:** a mensalidade pode ser cancelada na **primeira semana**, antes de o sistema existir. **REVOGADO, ver 01-decisoes.md D1** O hardware se paga com **1 a 4 meses** de mensalidade não paga.
**O custo real não é dinheiro:** 40 a 80 horas de construção, ou 12 a 20 horas no caminho híbrido, mais dois rituais em código (um cron diário e um backup semanal).
**O aviso que você pediu para receber:** existe plataforma pronta com preço público a partir de **R$ 47,92/mês equivalente** (16.000 respostas por ano) e existe plano **gratuito** com NPS contínuo. A diferença é discrepante, de 6 a 20 vezes, e por isso **economia não pode ser a tese do projeto**.
**A tese que sobrevive à pesquisa:** nenhuma dessas plataformas lê o seu PDV, nenhuma sabe o que é ficha técnica, e nenhuma cruza satisfação com CMV. Foi isso que a pesquisa não encontrou em 46 fornecedores brasileiros e 36 globais.
**Recomendação:** **construir, e cancelar antes de construir.** Nesta ordem, porque a economia começa na semana 1 e a construção não tem prazo. **REVOGADO, ver 01-decisoes.md D1**

---

## 1. Os 10 achados que mais mudam a decisão

**1. Você paga entre 2,5 e 5 vezes o único preço que o seu fornecedor publica, e não existe tabela para conferir.**
O piso publicado é R$ 200/mês com tablet e R$ 150/mês só QR Code ([risposta.app](https://www.risposta.app/), [Risposta Tap](https://www.risposta.app/risposta-tap/)). Preço por volume, por módulo e por unidade adicional: **NÃO PÚBLICO**. Como não há tabela, é impossível saber se você paga o preço de mercado do fornecedor ou o preço negociado em 2017 e nunca revisto.

**2. Existe plataforma pronta muito mais barata, com preço público, e isso derruba a economia como justificativa.**
Avalio Starter custa **R$ 575,00/ano à vista**, o equivalente a **R$ 47,92/mês**, e entrega 16.000 respostas por ano contra uma necessidade de 600 a 2.400 ([avalio.com.br/planos](https://avalio.com.br/planos)). Um ano da sua fatura atual compra de **10,5 a 20,9 anos** desse plano. Correção do verificador aplicada: 12x R$ 64,00 é a mesma assinatura parcelada, a opção mais cara do mesmo plano, e não deve ser usada como régua.

**3. O que nenhum fornecedor faz é exatamente o que você quer.**
Em 23 concorrentes diretos, 23 suítes de gestão (com sobreposição entre as listas) e 36 fornecedores globais, **nenhum documenta integração nomeada com PDV brasileiro e nenhum liga satisfação a ficha técnica ou a CMV**. Os que mais chegam perto (Tattle, Yumpingo, Bikky) param na receita. Confiança **média**: ausência de evidência nas fontes lidas não é prova de ausência no mundo.

**4. O defeito mais grave do fornecedor atual atinge a sua casa todas as noites, e a correção custa uma linha.**
O relatório corta às 23:59 e o contador do tablet só zera às 7:00, então tudo o que é respondido depois da meia-noite aparece no tablet como do dia anterior e no relatório como do dia seguinte ([página oficial de suporte](https://www.risposta.app/o-relatorio-e-os-tablets-consideram-horarios-diferentes/)). Numa casa que abre às 17h e fecha depois da meia-noite, o pedaço mais tardio da noite é sempre lançado no dia errado. O substituto corrige isso definindo o corte do dia operacional no fechamento real.

**5. O Altec/Next não expõe API nem webhook, e o R3 provavelmente não tem mesa nem comanda.**
O repositório de documentação da própria Altec, [hub-api-docs](https://github.com/altec-sistemas/hub-api-docs), está literalmente vazio, e não há portal de desenvolvedor nem programa técnico de parceiros. Consequência de produto: o plano B do briefing (garçom digita mesa e PIN) **passa a ser o plano A**, o cruzamento satisfação por faturamento fica em nível de dia e não de mesa, e a nota por prato tem de nascer na própria pesquisa. Confiança **média** sobre o conteúdo do R3, e a pergunta 4 ao suporte resolve.

**6. Custo zero é real, verificável e tem duas armadilhas que quebram o projeto seis meses depois.**
Consumo previsto: 0,04% do limite de requisições do Cloudflare, 7,2% do banco do Supabase em dez anos, 5% da cota de e-mail, 0,06% da cota de IA. As armadilhas: **Vercel Hobby proíbe uso comercial** por texto oficial, e o **Supabase Free pausa o projeto após 1 semana de inatividade e não tem backup nenhum**. As duas são evitáveis com decisão de arquitetura, não com dinheiro.

**7. No seu volume, boa parte da variação de nota é ruído, e é provavelmente por isso que o relatório atual parece raso.**
Com 50 respostas no mês, dois meses só diferem de verdade se a diferença passar de **± 29 pontos** de NPS. Com 200 respostas, de **± 14,5 pontos** (cálculo aritmético verificável, premissa de distribuição com confiança média). Painel que mostra a seta subindo sem essa faixa produz decisão em cima de ruído. A saída é contagem absoluta, n visível ao lado de cada número e leitura trimestral.

**8. Três perguntas é o teto empírico, e o banco rotacionado resolve a contradição entre profundidade e 45 segundos.**
Levantamento com 21.863 pesquisas mostra taxa de resposta mediana de **15,97%** em pesquisas de 2 a 3 perguntas contra **6,87%** com 7 ou mais ([survicate.com](https://survicate.com/blog/how-many-questions-should-surveys-have/)). Uma pergunta fixa mais duas sorteadas de um banco de 20 entrega cobertura de 20 dimensões pelo preço de conclusão de uma pesquisa de 3 perguntas. Custa uma tabela e uma função de sorteio.

**9. O anonimato é o motor do volume, não o hardware.**
O próprio fornecedor atual publica que o tablet responde por cerca de **90% das opiniões porque permite resposta anônima**, que o QR adiciona até 15%, e que "o grande risco de usar QR Code somente é a manipulação das amostras por parte das equipes" ([risposta.app](https://www.risposta.app/risposta-qr-code/)). Portanto: tablet como canal principal, QR como caminho paralelo, e antifraude no software é obrigatório, não opcional.

**10. Existe um risco no seu perfil do Google que pode estar ativo hoje, e ele é seu, não do fornecedor.**
O módulo Risposta Tap vende roteamento condicional (nota alta vai para o Google, nota baixa fica retida). A política do Google proíbe textualmente "discourage or prohibit negative reviews, or selectively solicit positive reviews" ([política de conteúdo](https://support.google.com/contributionpolicy/answer/7400114)). A punição recai sobre o perfil do restaurante, e o perfil é o seu principal ativo de aquisição. **Checar se isso está ligado na sua conta antes de cancelar.** Se está: **NÃO VERIFICADO**, só a configuração da conta responde.

---

## 2. A conta: o que sai, o que entra, quando se paga

### 2.1 Quadro geral

| Linha | Hoje (Risposta) | Substituto, cenário realista | Substituto, pior cenário verificável | Alternativa pronta mais barata |
|---|---|---|---|---|
| Mensalidade | R$ 501 a R$ 1.000 | **R$ 0,00** | US$ 45,00 (Supabase Pro + Resend Pro) | R$ 47,92 equivalente (Avalio Starter à vista) |
| Custo anual | **R$ 6.012 a R$ 12.000** | **R$ 0,00** | R$ 2.700 a R$ 3.240 (câmbio **NÃO VERIFICADO**) | R$ 575,00 |
| Custo por resposta a 150/mês | R$ 3,34 a R$ 6,67 | R$ 0,00 | R$ 1,50 a R$ 1,80 | R$ 0,32 |
| Fidelidade e multa | Nenhuma nos Termos | Nenhuma | Nenhuma | Não verificado |
| Hardware único | Tablet locado, volta no cancelamento | 2 tablets + 2 licenças de quiosque | Igual | Tablet por conta do restaurante (modo totem incluso no plano) |
| Horas de construção | Zero | 40 a 80 (ou 12 a 20 no híbrido) | Igual | Zero |
| Posse do dado | Na casa do fornecedor, API com janela de 4 dias | **No seu Postgres** | No seu Postgres | Na casa do fornecedor |

### 2.2 Economia anual, contra as duas pontas da fatura atual

| Cenário do sistema próprio | Custo anual | Economia contra R$ 6.012 | Economia contra R$ 12.000 |
|---|---|---|---|
| **Realista** (R$ 0,00/mês) | R$ 0 | **R$ 6.012 (100%)** | **R$ 12.000 (100%)** |
| Pessimista a R$ 5,00/US$ | R$ 2.700 | R$ 3.312 (55%) | R$ 9.300 (78%) |
| Pessimista a R$ 6,00/US$ | R$ 3.240 | R$ 2.772 (46%) | R$ 8.760 (73%) |

### 2.3 Custo único de hardware

| Item | Quantidade | Valor | Status |
|---|---|---|---|
| Tablet Android de entrada, 11 polegadas, 4 GB de RAM, 64 GB, Android 13 ou superior (prefira 15) | 2 (um em uso, um de reserva carregado) | **NÃO VERIFICADO em BRL.** Única referência independente: cerca de 180 EUR por unidade (GSMArena, Galaxy Tab A11) | O verificador **refutou** a faixa de R$ 900 a R$ 1.200 da pesquisa original. Cotação em varejista no ato da compra é obrigatória |
| Licença Fully Kiosk PLUS | 2 | **8,90 EUR por aparelho, pagamento único** | **Oficial.** É o único número de hardware 100% auditável deste projeto |
| Suporte de mesa com chave e cabo de segurança | 2 | **NÃO PESQUISADO** | Tablet solto em salão pede fixação física |
| Raspberry Pi | **0** | R$ 0 | **Não comprar.** Um cron na nuvem faz o mesmo trabalho de graça |

### 2.4 Tempo de retorno

Como a infraestrutura é R$ 0,00 e a mensalidade pode cair na primeira semana, o retorno é o hardware dividido pela mensalidade que deixa de ser paga. **REVOGADO no prazo, ver 01-decisoes.md D1** Os valores de hardware abaixo são **hipóteses de faixa, não preços apurados**, porque o preço em BRL segue **NÃO VERIFICADO**.

| Hipótese de hardware total | Retorno contra R$ 1.000/mês | Retorno contra R$ 501/mês |
|---|---|---|
| R$ 1.000 | 1,0 mês | 2,0 meses |
| R$ 1.500 | 1,5 mês | 3,0 meses |
| R$ 2.000 | 2,0 meses | 4,0 meses |
| R$ 2.500 | 2,5 meses | 5,0 meses |

Em qualquer hipótese dessa tabela, o hardware se paga dentro do **primeiro trimestre**. O que não se paga em dinheiro são as 40 a 80 horas de construção, e é por isso que elas, não a infraestrutura, são a restrição real do projeto.

---

## 3. A tese do projeto, corrigida pela pesquisa

### 3.1 A parte desconfortável, dita sem rodeio

Você pediu para ser avisado apenas se a diferença de preço fosse muito discrepante. **Ela é.** Existem plataformas prontas, com preço público, custando de 6 a 20 vezes menos do que você paga hoje. Se o objetivo fosse apenas parar de gastar, **trocar de fornecedor resolveria em uma tarde**, sem uma linha de código, sem tablet comprado e sem 40 horas de trabalho.

| Alternativa pronta | Preço público | O que entrega | O que **não** entrega para o seu caso |
|---|---|---|---|
| **Avalio Starter** ([avalio.com.br/planos](https://avalio.com.br/planos)) | **R$ 575,00/ano à vista (R$ 47,92/mês equivalente)**, ou 12x R$ 64,00 | 16.000 respostas/ano, modo totem em tablet, API REST, IA com 50.000 tokens, 1 usuário | Não lê Google nem iFood, não tem banco de perguntas de pizzaria, limite de respostas é anual sem folga em pico, SMS é compra separada, 1 usuário só. **Não lê o Altec e não conhece ficha técnica** |
| **Avalio Standard** | R$ 810,00/ano (R$ 67,50/mês equivalente) | 20.000 respostas/ano, 5.000 convites | Mesmas ausências |
| **ReviewBR Essencial** ([reviewbr.com](https://reviewbr.com/home)) | **R$ 79,90/mês** (100 fluxos/mês), sem fidelidade | Fluxo por WhatsApp pedindo avaliação no Google | É captura de reputação pública por canal único, não pesquisa estruturada com série histórica por prato, garçom ou turno. O dado nasce público e chega depois do cliente ir embora |
| **Fidelimax** ([fidelimax.com.br](https://www.fidelimax.com.br/clientes/restaurantes/)) | **Plano gratuito confirmado, sem cartão.** Valores dos combos pagos **não publicados** | Fidelidade e cashback, com **NPS contínuo** de uma pergunta, mais de 50 integrações de PDV | NPS de uma pergunta é mais raso que questionário multidimensão. Limites do plano gratuito **NÃO PUBLICADOS**. Integração nativa com Altec/Next **NÃO CONFIRMADA** |
| **Risposta, piso publicado** | R$ 150/mês (só QR) e R$ 200/mês (com tablet) | O que você já conhece | Continua sem PDV, sem WhatsApp e com o defeito do corte de 23:59 |
| **Tally Free** | **R$ 0**, respostas ilimitadas, webhook incluso | Formulário no ar em dias, gravando no seu próprio banco | Marca Tally na tela do cliente, sem painel de gestão próprio |

Duas ressalvas de rigor, porque isso é decisão de dinheiro. Primeira: **não é comparação de igual para igual**, e a coluna da direita existe justamente para mostrar onde cada uma falha. Segunda: **a tese de sobrepreço não fecha sem um documento que você tem e a pesquisa não tem**, que é a proposta comercial atual por escrito. O preço dos planos superiores do Risposta é **NÃO PÚBLICO**, e comparar a sua fatura com o piso de R$ 150 (que é escopo somente QR Code) não é honesto. Peça a proposta, item por item. Não há multa, então essa conversa é de graça.

### 3.2 A tese correta

A economia é **consequência**, não justificativa. O que justifica construir é uma lista curta, e cada item dela é uma coisa que **nenhuma** das alternativas acima faz, por um motivo estrutural e não por preguiça delas: **nenhuma lê o seu PDV, e nenhuma sabe o que é ficha técnica.**

| O que você quer | Existe pronto no mercado? | Por que só um sistema próprio faz |
|---|---|---|
| **Dados unificados** (satisfação, venda, CMV, ficha técnica, reserva na mesma base) | **Não** em nenhum dos 82 fornecedores levantados, para uma unidade | Cada fornecedor é uma ilha por desenho comercial. Fornecedor de CX não tem acesso ao seu custo de insumo |
| **Satisfação cruzada com CMV e ficha técnica** | **Não encontrado.** Tattle, Yumpingo e Bikky param na receita. Confiança **média** | Depende de um dado que só quem está dentro do restaurante tem. É o diferencial mais defensável dos três |
| **Decisão em vez de relatório** | O degrau anterior existe (digest por IA na SevenRooms, plano de ação de 30 dias na Tattle) | O digest diário às 16h por área, comparando contra o período anterior, é uma rotina agendada mais uma consulta mais um prompt. É o item de maior retorno absoluto do dossiê |
| **Posse do dado** | **Treze fornecedores levantados não têm nenhuma API pública** | Com eles, a série histórica mora na casa do fornecedor e sair custa perder a série. No seu Postgres, ela sobrevive a troca de PDV e de fornecedor |
| **Previsão de recompra** | **Sim, já existe e bem feito.** Olo Guest Data Platform prediz lifetime value e churn risk por machine learning ([olo.com/gdp](https://www.olo.com/gdp)) | **Aqui você está correndo atrás, não na frente.** E com coleta anônima não há identidade para treinar nada: isso tem de vir do CRM de reservas, na fase 2, por regra RFM e não por modelo |
| **Conversa com os próprios dados** | Nenhum dos 36 globais vende isso para CX de restaurante, mas **o fosso é raso** | Consultar banco com LLM é capacidade genérica hoje. E é a feature que mais briga com a restrição de manutenção zero: tradução de pergunta para SQL erra em silêncio. Só com consultas fixas e revisadas, depois do digest |

Ou seja, dos três diferenciais pretendidos, **um se sustenta inteiro** (satisfação cruzada com CMV), **um é paridade competitiva atrasada** (previsão de recompra) e **um é fácil de fazer errado** (conversa com os dados). O que não estava na lista e é o ativo mais sólido de todos é a **posse do dado**.

### 3.3 As três rotas possíveis, e o que cada uma custa

| Rota | Custo ano 1 | O que você ganha | O que você abre mão |
|---|---|---|---|
| **A. Trocar por plataforma pronta** | R$ 575 (Avalio) ou R$ 0 (Fidelimax, com limites não publicados) | Economia imediata, zero horas, zero manutenção, zero risco técnico | Cruzamento com PDV, CMV, ficha técnica e reservas. Posse do dado. Digest que gera decisão. Ou seja, os quatro critérios de sucesso do projeto, menos o de cancelar a mensalidade |
| **B. Construir do zero** | R$ 0 de infra mais hardware, 40 a 80 horas | Tudo o que a rota A não dá | Semanas a meses de convivência com a mensalidade atual, se a coleta só começar quando o sistema estiver pronto |
| **C. Ponte agora, construção sem pressa** (recomendada) | R$ 0 de infra mais hardware, 12 a 20 horas até a ponte | **Cancela a mensalidade na semana 1** com Tally gravando no seu banco, e a construção segue sem prazo e sem um dia sem coletar dado | A marca Tally na tela do cliente por algumas semanas. É o único custo, e é reversível. **REVOGADO, ver 01-decisoes.md D1** |

**Recomendação: rota C. REVOGADO, ver 01-decisoes.md D1** Ela é a única que separa a decisão financeira (parar de pagar, agora) da decisão de produto (construir o que ninguém vende, sem prazo). A decisão é sua, e as três rotas acima são defensáveis com os números deste dossiê. O que não é defensável é continuar pagando R$ 501 a R$ 1.000 por mês por um produto cujo módulo de reputação você já decidiu não usar, cuja consultoria talvez não esteja sendo usada, e cujo relatório embaralha a série diária todas as noites.

---

## 4. Decisões que estavam delegadas à recomendação técnica

| Decisão | Recomendação | Argumento em uma linha |
|---|---|---|
| **Plataforma de deploy** | **Cloudflare Pages + Workers + Cron Triggers** | É o único plano gratuito que permite uso comercial e crava 16h00 com precisão de minuto. O Vercel Hobby proíbe uso comercial por texto oficial e o cron dele tem precisão de hora (mais ou menos 59 minutos), o que transforma "leia antes de abrir" em "leia enquanto abre" |
| **Repositório** | **Repositório próprio, separado do app de reservas.** Manter `risposta-qt` | Dois ciclos de vida diferentes, dois deploys, duas superfícies de falha. A ligação com as reservas é por leitura de dado, nunca por código compartilhado. Confiança **média** até a inspeção do app de reservas, que ainda não foi feita |
| **Banco: mesmo do app de reservas ou separado** | **Organização Supabase separada, decidida antes de criar a primeira tabela. REVOGADO, ver 01-decisoes.md D2** | O plano gratuito permite 2 projetos por organização, e a restrição da Fair Use Policy, quando dispara, devolve **HTTP 402 em toda a API de todos os projetos da organização**. Um estouro na pesquisa derrubaria o sistema de reservas junto |
| **O sistema calcula CMV ou apenas consome** | **Apenas consome.** Tabela própria de itens, custo e margem de contribuição, com data de vigência, alimentada por importação | Ficha técnica muda por fornecedor, gramagem e preço, e duas implementações da mesma regra é a garantia de dois números diferentes. O briefing manda manter as fichas separadas, e consumir o resultado respeita isso sem acoplar nada |
| **Nível de segurança proporcional** | RLS ligado no Supabase, 2FA nas contas de administrador, chave de serviço **fora** do front-end, PIN do garçom tratado como **dado da resposta e não como autenticação**, dois administradores nomeados | Segurança proporcional é o que protege o dado sem criar tarefa recorrente. Fora do escopo, por desproporção: DPO externo, RIPD completo, ISO 27001, criptografia de campo e contrato de operador de dezenas de páginas |
| **Reconhecimento de cliente recorrente sob LGPD** | **Recorrência pelo lado do pedido, sempre ligada** (mesa, turno, itens, ticket), mais **código voluntário de 6 caracteres** como camada opcional | Hash de telefone **não anonimiza nada**, é pseudonimização e continua sob a LGPD. Proibido em qualquer hipótese: biometria, fingerprinting e cruzar telefone de delivery com salão sem consentimento. Retenção contada da **última visita**, não da coleta, com prazo escrito e apagamento em código. Confiança **baixa** nesta subseção: é desenho defensável, não parecer |
| **Comprar o Raspberry Pi** | **Não comprar** | O trabalho previsto para ele (buscar um relatório uma vez por dia) é exatamente o que um cron na nuvem faz de graça, sem cartão SD que corrompe, sem depender do Wi-Fi do salão e sem alguém para reiniciar. E o modelo certo depende de qual caminho for necessário (Zero 2 W para ler banco, Pi 4 ou 5 para automação de navegador), então comprar antes de saber é comprar o aparelho errado |
| **Orçamento mínimo de hardware** | 2 tablets de 11 polegadas (4 GB de RAM, 64 GB, Android 13+, prefira 15), 2 licenças Fully Kiosk PLUS a **8,90 EUR** cada, 2 suportes de mesa com chave. Zero MDM, zero Pi, zero app de loja | O segundo tablet não é luxo, é continuidade: tela trincada numa sexta cheia custa dias de dado. O `boot on start` da licença paga elimina a única tarefa humana recorrente do quiosque. Preço dos tablets em BRL: **NÃO VERIFICADO**, cotar no ato |
| **Metas de equipe amarradas à nota** | **Contra, sem meio termo.** Nenhum bônus, ranking ou meta atrelado a nota de pesquisa | **Meta amarrada à nota contamina o dado.** O próprio fornecedor atual publica um guia de metas que prevê punição administrativa de 2% e teto de 25 tentativas por dia por tablet ([guia oficial](https://www.risposta.app/como-usar-o-risposta-para-definir-boas-metas-de-experiencia-do-cliente-para-as-equipes/)), o que prova duas coisas: manipulação pela equipe é problema real e conhecido, e amarrar bônus à nota é o que cria o incentivo para manipular. Num sistema que ninguém audita, um painel contaminado é pior que nenhum painel |
| **A alternativa às metas por nota** | Meta em **processo**, que está sob controle da equipe: respostas coletadas por comanda fechada (por garçom e por turno), tempo até o primeiro contato de recuperação em minutos, e 100% dos detratores com registro de atendimento | Processo é o que a equipe controla e não pode falsificar sem aparecer no relatório de respostas contra comandas. A nota por garçom continua existindo, mas **só em janela trimestral, com o n ao lado, para conversa de desenvolvimento**, nunca em ranking mensal |
| **Nome do produto e subdomínio** | Decisão sua, não técnica, mas precisa sair **antes** do DNS | O subdomínio entra na configuração de SPF e DKIM, e sem essa configuração o relatório diário cai em spam e o sistema é declarado quebrado na segunda semana |

---

## 5. Riscos do projeto

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| **Falha silenciosa: o sistema para e ninguém percebe** | **Alta**, porque ninguém monitora | **Máximo.** Dias sem dado, e a confiança no sistema não volta | Fazer do e-mail das 16h o batimento cardíaco: ele é entregável, keep-alive do banco e alarme ao mesmo tempo. **Duas ausências seguidas do e-mail significam que algo quebrou.** Essa é a única regra de operação que precisa existir, e ela vai no README |
| **Pausa do Supabase Free por 1 semana de inatividade** | **Alta**, é comportamento documentado | Alto: coleta e painel fora do ar, restauração manual | Cron diário que toca o banco, com o **envio do e-mail separado da consulta ao banco** no código, para pausar um sem pausar o outro em férias |
| **Ausência de backup no plano gratuito** | **Alta**, é ausência declarada | Alto: "anos de histórico" sem ponto de restauração | `pg_dump` semanal via GitHub Actions para fora do Supabase, desde o primeiro mês de dado real |
| **Restrição em cascata na organização Supabase (402 em todos os projetos)** | Média | Alto: derrubaria o app de reservas junto | Organização separada, decidida antes da primeira tabela. **REVOGADO, ver 01-decisoes.md D2** |
| **Mudança de política de free tier de LLM** | **Alta.** Já aconteceu: a Google retirou os números de cota da doc pública | Médio: o diagnóstico escrito para de sair | Um único módulo com prompt, chamada e parser, desde o primeiro dia, mais quatro camadas de contingência que terminam em **classificação por regra sem IA**, ainda a R$ 0. O produto precisa continuar entregando valor sem IA |
| **Alguém subir o projeto no Vercel Hobby "só para testar"** | Média, é o erro mais fácil de cometer | Médio: violação de termos, com risco de conta e deploy pausados | Uma linha no README dizendo que Vercel Hobby é proibido neste projeto, e por quê |
| **Taxa de resposta cair porque o garçom não pede** | **Alta.** É a fragilidade que não desaparece com a troca de fornecedor | Alto: derruba o critério de sucesso de coletar mais que hoje | Medir o denominador (respostas contra comandas fechadas, por garçom e por turno), meta de **processo** e não de nota, tablet como canal principal e QR impresso funcionando como caminho paralelo desde o primeiro dia |
| **NPS de 0 a 10 converter menos que uma escala de 5 pontos** | Média. Confiança **média**, ninguém publica teste A/B disso em tablet de restaurante | Médio: menos amostra, e amostra é o recurso escasso | Onze alvos grandes em duas fileiras, sem rolagem, com âncoras nas pontas, e **cronometragem de cada tela**. Se a conversão medida ficar abaixo de 10% das mesas atendidas, testar 5 alvos. Última carta, não primeira |
| **Tablet quebrado, furtado ou com bateria morta** | Média a alta em dois anos | Alto: coleta para | Segundo aparelho comprado na mesma viagem e no mesmo modelo, suporte com chave, e QR permanente impresso e testado |
| **Layout do R3 mudar sem aviso e o parser quebrar em silêncio** | Média | Médio: o cruzamento com faturamento morre calado | Salvar o arquivo bruto **antes** de parsear, idempotência por data, alerta ativo após duas falhas seguidas, e botão permanente de upload manual de planilha como rede de segurança |
| **Peça frágil entrar no sistema e furar a manutenção zero** (raspagem de review, template de WhatsApp, automação de navegador, Raspberry Pi) | **Alta se alguma delas entrar na v1** | **Máximo**, porque é a restrição mais dura do briefing | Nenhuma delas na v1. Regra de arquitetura: cada peça móvel precisa justificar a própria existência, e template externo, raspagem e hardware no salão não justificam |
| **Perfil do Google penalizado por convite condicionado à nota** | **DESCONHECIDO** se está ativo hoje na sua conta | Alto: possível remoção de avaliações do perfil (confiança **média** na mecânica de punição, que vem de blogs de fornecedores e não de página do Google) | Checar a configuração da conta antes do cancelamento, e **não construir convite ao Google no substituto**. Se um dia quiser, QR fixo na conta apontando direto para o Google, sem nota no caminho |
| **Meta amarrada à nota contaminar o dado** | Média, se a decisão for tomada | Alto: o painel inteiro perde valor e ninguém percebe | Decisão explícita contra, mais travas de antifraude: uma resposta por comanda, janela de tempo válida, alerta de resposta concluída em menos de 8 segundos, e relatório de respostas contra comandas fechadas por garçom |
| **Consentimento sem registro de versão e horário** | Média | Médio: não se prova o consentimento numa fiscalização | Duas caixas separadas e não pré-marcadas (responder a pesquisa, receber contato), guardando data, hora e **versão do texto aceito**, mais job de retenção agendado |
| **Migração do histórico do Risposta ser penosa** | **Alta.** A API pública limita cada requisição a 4 dias e 50 registros por página, cerca de 92 requisições por ano de histórico, com credencial pedida por e-mail | Baixo, se a decisão for consciente | Provavelmente não migrar, ou migrar só os últimos meses. E, antes de desligar o acesso, pedir por escrito a **exportação completa** e a **eliminação comprovada** dos dados pessoais (`privacy@risposta.com.br`, `lgpd@risposta.com.br`), porque depois do cancelamento a alavanca desaparece |
| **Recuperação do detrator matar o anonimato percebido** | Média | Médio: o anonimato é o que sustenta o volume | O gerente nunca menciona a pesquisa nem a nota, a ronda acontece em mesas aleatórias e não só nas de nota baixa, e o tablet nunca emite som, aviso ou tela de alerta |

---

## 6. O que fazer em seguida

### Depende de você (esta semana, e nada disso depende de código)

1. **Pedir a proposta comercial atual do Risposta por escrito**, item por item, e conferir contra os pisos de R$ 150 e R$ 200. É o documento que falta para fechar a tese de sobrepreço. Sem multa, essa conversa não tem risco.
2. **Checar se o convite condicionado ao Google está ativo** na sua conta hoje, e olhar o estado do perfil do Google.
3. **Pedir por escrito, aos canais de privacidade do fornecedor**, a exportação completa dos dados pessoais tratados em seu nome e a eliminação comprovada após o encerramento. **Antes** de desligar o acesso.
4. **Mandar as 8 perguntas ao suporte da Altec** (prontas para copiar em `05-integracoes.md`, seção 5), pedindo a resposta da pergunta 6 por escrito. A pergunta 3 é a que mais destrava; a 4 decide se o cruzamento por mesa é possível.
5. **Enviar os prints das perguntas do Risposta e a capacidade de cada mesa.** As duas pendências estão bloqueando exatamente duas coisas, descritas na seção 7.
6. **Informar o nome do repositório e do app de reservas**, mais o endereço do Retaguarda Cloud, para a inspeção que precede a primeira tabela.
7. **Decidir duas coisas que são de dono e não de engenharia:** o prazo de retenção (12 ou 24 meses contados da última visita) e a decisão de manter metas de equipe fora da nota.
8. **Comprar 2 tablets na viagem**, com o checklist de loja de `05-integracoes.md` (versão do Android na tela, RAM real, certificação do Play, fixação de app no menu, fonte 100 a 240 V). **Não comprar Raspberry Pi.**
9. **Pedir o Basic API Access da Google Business Profile API** agora. É um formulário gratuito com prazo de até 14 dias, não obriga a construir nada, e compra a opção de acender o item de divergência entre pesquisa e avaliação pública na fase 2. **REVOGADO, ver 01-decisoes.md D3**

### Depende de desenvolvimento (nesta ordem)

1. **Inspecionar o Supabase e o app de reservas** antes de criar qualquer tabela, e **criar a organização Supabase separada**. **REVOGADO, ver 01-decisoes.md D2**
2. **Subir a ponte de coleta** (formulário no Tally gravando por webhook no banco próprio), para que a mensalidade possa cair na semana 1 sem um único dia sem dado. **REVOGADO, ver 01-decisoes.md D1**
3. **Modelar o schema com os dois grãos** (resposta da pesquisa e venda por dia), com UUID gerado no cliente, idempotência por chave e **corte do dia operacional no fechamento real**, não à meia-noite.
4. **Construir a tela de coleta própria:** uma pergunta por tela, sem rolagem, alvos de 44 pixels ou mais, NPS na abertura, ramificação por nota, aberta e contato opcionais, agradecimento com auto-reset, e cronometragem de cada tela.
5. **Cron das 16h no Cloudflare** com o digest por área, comparando sempre contra o período anterior, e gravando uma linha de log de execução no próprio banco (o log do fornecedor expira, o seu não).
6. **`pg_dump` semanal** via GitHub Actions, mais as duas regras de operação escritas no README.
7. **Importação do R3** pelos caminhos 3 e 4 juntos: pasta sincronizada com watcher gratuito, mais botão de upload manual de planilha, salvando o arquivo bruto antes de parsear.
8. **Banco de perguntas rotacionadas** com peso, 2 a 4 perguntas em foco por mês somando 50% das impressões, e registro de qual pergunta foi sorteada e qual foi respondida.
9. **Antifraude e alerta de detrator:** uma resposta por comanda, janela de tempo, e push no celular do gerente com mesa e hora, sem nada visível no tablet.
10. **Sentimento frase por frase no Groq**, com o texto cru sempre guardado, saída estruturada por área e polaridade, e degradação prevista para funcionar sem IA.
11. **Matriz de cardápio** com reclamações por 100 unidades vendidas, janela trimestral, mínimo de 3 eventos e numerador e denominador sempre visíveis.
12. **Só então:** CRM e detecção de recompra ancorados no CRM de reservas, e conversa com os dados por um conjunto fixo de consultas revisadas, nunca por tradução livre de pergunta para SQL.

---

## 7. Nota de metodologia

**Escopo.** Oito conjuntos de dados brutos, de sete frentes de pesquisa mais uma investigação dedicada ao PDV Altec/Next, cobrindo o fornecedor atual (54 funcionalidades mapeadas, das quais 14 essenciais, 17 úteis e 23 dispensáveis para uma casa só), 23 concorrentes brasileiros diretos, 23 suítes de gestão, 36 fornecedores globais, 27 alternativas open-source e de custo zero, 12 temas técnicos e 12 tópicos de padrão de questionário.

**Verificação adversarial.** Quatro verificadores independentes revisaram as frentes: um deu veredito **CONFIRMADO** (fornecedor atual, com 3 ressalvas) e três deram **PARCIAL** (concorrentes brasileiros com 10 correções, globais com 15, técnico com 12). Total de **40 correções e 40 lacunas registradas**. Todas as correções têm precedência sobre a pesquisa original neste documento. O erro recorrente encontrado não foi invenção de conteúdo, foi **citação deslocada**: a afirmação verdadeira apontando para uma URL que não a contém. Preços refutados na verificação e que **não devem ser usados**: Avalio a 12x R$ 64,00 como régua (o piso real é R$ 47,92 equivalente à vista), Tattle a US$ 59, HappyOrNot a US$ 100 por totem, Birdeye em três tiers, Cloutly a US$ 27, Fully Kiosk a 7,90 EUR (o correto é 8,90 EUR) e tablets a R$ 900 a R$ 1.200.

**Duas falhas de agente por erro de servidor.** Durante a execução da pesquisa, duas execuções de agente falharam por erro de servidor do provedor, não por falta de fonte. As duas foram tratadas por **reexecução**, e nenhum resultado parcial de execução interrompida foi aproveitado: o dossiê usa apenas arquivos que fecharam. O custo dessas falhas foi de tempo, não de conteúdo. Onde a apuração ficou fina, isso está registrado como lacuna no documento correspondente, e as três lacunas que mais afetam decisão são: ninguém testou se existe fornecedor global que venda para **uma** unidade abaixo de cerca de US$ 50/mês **com** feedback por item; os valores oficiais em BRL do rate card do WhatsApp não foram baixados; e o texto integral da Lei 13.709 não pôde ser lido (o Planalto devolveu HTTP 503), então os números de artigo da LGPD precisam ser conferidos antes de publicar o aviso de privacidade.

**Duas pendências suas, e o que muda quando chegarem.**

| Pendência | O que ela desbloqueia | O que **não** muda |
|---|---|---|
| **Prints do painel e das perguntas do Risposta** | Preenche a comparação da seção 15 de `06-questionario.md`, e responde as duas perguntas que valem dinheiro: quantas perguntas você paga para fazer hoje, e quais delas jamais viraram uma decisão. Mostra também se o convite ao Google é condicionado à nota, o que transforma o item 10 dos achados de risco potencial em fato verificado | O questionário recomendado. Ele foi desenhado a partir da evidência de mercado e do briefing, e **nada foi assumido, inferido ou reconstruído** sobre as perguntas atuais |
| **Capacidade individual das 22 mesas** | Troca o denominador da taxa de resposta: hoje a conversão é calculada sobre cerca de 520 **mesas** por mês, e mesa não é pessoa (mesas são juntadas e existem comandas individuais). Com a capacidade por mesa, a meta de 150 respostas passa a ser calibrada por pessoa, e o cruzamento com faturamento ganha ticket por assento | Nada do MVP. Não é bloqueio de desenvolvimento, é calibragem de meta e de leitura do painel |

**Onde a confiança deste documento é baixa, e está dito no ponto exato:** preço em reais de qualquer hardware, câmbio, limites do plano gratuito da Fidelimax, integração Altec com Fidelimax, conteúdo exato do relatório R3, mecânica de punição do Google, números de artigo da LGPD, estimativas de segundos por tela do questionário e as oito regras de ação da matriz de cardápio, que são derivação e não padrão publicado.
