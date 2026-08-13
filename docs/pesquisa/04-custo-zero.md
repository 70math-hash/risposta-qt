# 04. Custo zero: dá ou não dá, e a que custo escondido

> Base: `dados/05-tecnico.json` (limites de plataforma lidos em página oficial), `dados/04-opensource.json` (27 alternativas open-source, autohospedadas e caminhos de custo zero) e `dados/09-verif-tecnico.json` (verificação adversarial, veredito **PARCIAL**, 12 correções).
> **Onde o verificador refutou a pesquisa original, este documento usa a versão corrigida e diz isso no texto.** Limite de plano gratuito muda com frequência, e é justamente por isso que a correção do verificador tem precedência absoluta aqui.
> Número que não foi lido em página oficial aparece como **NÃO PÚBLICO**, **NÃO VERIFICADO** ou **DESCONHECIDO**, sem exceção. Quando a confiança é baixa, está escrito.

---

## 1. A resposta direta

**Dá.** O sistema descrito no briefing roda por **R$ 0,00/mês de infraestrutura**, e esse zero não é otimismo: cada camada tem limite gratuito publicado em página oficial do fornecedor, e o consumo previsto do QT fica entre **0,04% e 7%** do que cada plano gratuito dá. O volume é três ordens de magnitude abaixo de qualquer teto relevante. Uma década inteira de histórico ocupa cerca de **36 MB**, contra 500 MB gratuitos no Supabase.

**A infraestrutura não é o problema deste projeto em nenhum cenário.** O que ameaça o custo zero é outra coisa, e são três riscos de naturezas diferentes:

| Risco | O que é | Onde aparece neste documento |
|---|---|---|
| **O gratuito que é proibido** | Plano gratuito que o contrato do fornecedor veda para uso comercial. Usar é violação de termos, não economia | Vercel Hobby, seção 3 |
| **O gratuito que para** | Plano que não cobra, mas desliga: pausa por inatividade, limite duro de crédito, suspensão de compute até o mês seguinte | Supabase, Netlify, Neon, seções 2 e 8 |
| **O gratuito que muda de regra** | Fornecedor que corta cota, retira os números da documentação pública ou muda a política de uso do dado | Camada de LLM, seção 5 |

E o custo escondido, que é a pergunta de verdade: **o custo zero em dinheiro é comprado com horas e com dois rituais obrigatórios.** As horas são 40 a 80 de construção (ou 12 a 20 no atalho da seção 6). Os rituais são um **keep-alive diário** (sem ele o banco gratuito pausa em uma semana de inatividade) e um **backup próprio** (o plano gratuito do Supabase não tem backup nenhum). Num projeto cuja restrição mais dura é que ninguém vai manter o sistema, esses dois rituais precisam ser código agendado, nunca lembrete humano. A seção 8 trata disso item por item.

---

## 2. Os limites reais de cada plano gratuito

Todos os números abaixo foram lidos em página oficial e confirmados na verificação adversarial, com as exceções marcadas. O consumo do QT usado como régua: **200 respostas/mês no pico**, cerca de **1.200 requisições HTTP/mês** (aproximadamente 40 por dia), **3 a 5 e-mails por dia** e **cerca de 3,6 MB de banco por ano**.

| Plataforma e plano | O que o gratuito dá | O limite que importa aqui | O que acontece ao estourar | Suficiente para 200 resp./mês e anos de histórico? |
|---|---|---|---|---|
| **Supabase Free** | 500 MB de banco (Shared CPU, 500 MB RAM), 50.000 MAU, 5 GB de egress + 5 GB em cache, 1 GB de storage, 500.000 invocações de Edge Function, requisições de API ilimitadas | **2 projetos ativos por organização** e **pausa após 1 semana de inatividade** | Aviso no e-mail de billing, período de graça, e depois a Fair Use Policy: projetos pausados, banco em somente leitura, criação de projeto bloqueada e **status 402 em todas as requisições de API**. A restrição é aplicada **a todos os projetos da organização** e só sai na renovação da cota ou no plano pago. **Não existe segundo período de graça** | **Sim, com folga de 13x.** 36 MB em 10 anos contra 500 MB é 7,2% do limite |
| **Cloudflare Workers Free** | 100.000 requisições/dia, 10 ms de CPU por invocação, 50 subrequests por invocação, 5 Cron Triggers por conta | **10 ms de CPU por invocação** (tempo de espera de I/O não conta) | Cota diária que reseta; sem cláusula anticomercial e sem pausa por inatividade | **Sim, com folga de 2.500x.** 40 req/dia contra 100.000/dia é 0,04% |
| **Cloudflare Pages Free** | 500 builds/mês, 1 build concorrente, 20.000 arquivos por site, 25 MiB por arquivo, 100 domínios customizados. Texto oficial: "Requests to static assets are free and unlimited" e "There are no additional charges for data transfer (egress) or throughput (bandwidth)" | 500 builds/mês | Build recusado até o próximo ciclo | **Sim.** Requisições e banda do Pages **não são publicadas** na página de limites, e isso segue como lacuna |
| **Cloudflare D1 Free** | 5 GB de armazenamento, 5 milhões de linhas lidas/dia, 100.000 linhas escritas/dia, cotas resetam às 00:00 UTC | 100.000 escritas/dia | Cota diária que reseta | **Sim, com folga de 138x.** 36 MB contra 5 GB é 0,72% |
| **Vercel Hobby** | 100 GB de Fast Data Transfer, 1.000.000 de invocações de função, 4 CPU-horas de Active CPU, 360 GB-horas de memória, até 1.000.000 de edge requests, 200 projetos, 100 deploys/dia, log de runtime por 1 hora, build máximo de 45 minutos | **Uso comercial proibido.** Texto oficial: "the Hobby plan restricts users to non-commercial, personal use only" | Na maioria dos casos, **espera de 30 dias** para o recurso voltar. Violação de política pode pausar conta e deploy | **Tecnicamente sim, contratualmente não.** Está fora por termos, não por limite |
| **Netlify Free** (**corrigido pelo verificador**) | **300 créditos/mês, com limite duro e sem recarga automática.** Não há verba separada de banda, minutos de build ou invocações. Tabela oficial de consumo: 1 deploy de produção = **15 créditos**; 1 GB de banda = **20 créditos**; 1 GB-hora de compute = **10 créditos** | **300 créditos**, que dão cerca de **20 deploys de produção por mês** e mais nada | Limite duro de crédito, sem auto-recharge: os recursos param de consumir até o próximo **ciclo de cobrança** (que não coincide necessariamente com o mês civil) | **Apertado, e por um motivo que não é o volume de respostas.** Uma semana de desenvolvimento com muitos deploys queima o mês inteiro |
| **Neon Free** | 100 CU-horas por projeto, 0,5 GB por projeto, **100 projetos**, 10 branches por projeto, 5 GB de transferência. Compute escala a zero após 5 minutos de inatividade | 0,5 GB por projeto e 100 CU-horas | **Suspende o compute até o próximo mês de faturamento** ao esgotar qualquer limite. Sistema fora do ar por dias ou semanas, sem religar sem pagar | **Cabe (folga de 14x), mas a consequência de estourar é a pior da tabela.** Ganha do Supabase só em número de projetos |
| **Resend Free** | 3.000 e-mails/mês, **100 por dia**, 1 domínio, retenção de dados de 30 dias, 10.000 automation runs/mês | 100 e-mails/dia | Bloqueio de envio na cota | **Sim, com folga de 20x** no relatório diário. Não serve para disparo em massa a clientes |
| **Groq Free** | `llama-3.1-8b-instant`: 30 RPM, 14.400 req/dia. `llama-3.3-70b-versatile`: 30 RPM, 1.000 req/dia. Limites valem no nível da organização | Requisições por dia por modelo | Erro de rate limit até a janela virar | **Sim, com folga de 1.500x.** Cerca de 9 chamadas/dia contra 14.400 |
| **GitHub Free** | 2.000 minutos/mês de runners padrão em repositório privado; **ilimitado e gratuito** em repositório público com runners padrão | 2.000 minutos/mês no privado | Workflow não executa até a cota renovar | **Sim.** Um workflow diário de 1 minuto consome 30 minutos/mês, ou 1,5% da cota |
| **Google Apps Script** (conta gmail.com) | 100 destinatários de e-mail/dia, 90 minutos/dia de runtime de triggers, 6 minutos por execução, 20.000 URL Fetch/dia | 100 destinatários/dia e 90 min/dia de trigger | Cota diária bloqueia a execução | **Sim para o volume.** É o único caminho sem cartão de crédito e sem servidor |

### As duas armadilhas que mais pegam quem constrói assim

Estas duas não aparecem em comparativo de blog e são as que quebram o projeto seis meses depois de pronto.

**Armadilha 1: pausa por inatividade do Supabase Free.** A página de preços diz literalmente que projetos gratuitos são pausados após **1 semana de inatividade**, e a documentação de Project Pausing detalha que a decisão olha baixa atividade numa janela de 7 dias, bastando "algumas requisições de usuário ao banco por dia ao longo da semana anterior" para não ser pausado. Traduzindo para a operação: o restaurante fecha segunda, o que é irrelevante, mas **férias coletivas de 8 dias com o cron desligado devolvem o banco pausado**. A restauração é possível (texto oficial e atual: existe uma **janela de 1 ano** para restaurar pelo Supabase Studio, e aqui o verificador corrigiu a pesquisa original, que tratava esse prazo como incerto sem motivo), mas restaurar é intervenção manual num sistema que ninguém mantém.

*Mitigação obrigatória:* o próprio cron das 16h já resolve, porque toca o banco todos os dias. A regra a escrever no README é que **desligar o e-mail durante uma pausa da operação não pode desligar a consulta ao banco**. São duas coisas separadas no código de propósito.

**Armadilha 2: o limite de 2 projetos ativos por organização Supabase.** Ambiente de produção mais ambiente de teste já consomem a organização inteira. E existe uma consequência de arquitetura que precisa ficar explícita antes de criar a primeira tabela: **o app de reservas já está no ar, e se ele mora na mesma organização Supabase, o limite de 2 projetos pode já estar consumido.** Pior que o limite: a restrição da Fair Use Policy, quando dispara, é aplicada **a todos os projetos da organização**, com 402 em toda a API. Ou seja, um estouro no sistema de pesquisa pode derrubar o sistema de reservas junto.

*Mitigação obrigatória:* **organização Supabase separada** para o sistema de pesquisa, e inspeção do que o app de reservas já ocupa antes de qualquer migração. Isso é decisão de arquitetura, não de faxina.

---

## 3. Agendamento gratuito: quem entrega o relatório das 16h

Este é o critério técnico que decide a plataforma de deploy, porque o relatório diário é obrigatório na primeira versão e o horário tem função operacional: chegar antes de abrir, com a casa abrindo às 17h no sábado e domingo.

| Plataforma | Agendamento no plano gratuito | Granularidade e precisão | Uso comercial no gratuito | O que acontece ao estourar | Serve para as 16h? |
|---|---|---|---|---|---|
| **Cloudflare Workers Cron Triggers** | Sim, **5 triggers por conta** no Free (250 no pago), sem preço separado | **1 minuto**, sintaxe de 5 campos com minuto 0 a 59 | **Permitido**, sem cláusula restritiva | Consome a cota de requisição e CPU do Worker | **Sim, é o único que crava 16h00** |
| **Vercel Hobby Cron Jobs** | Sim, 100 cron jobs por projeto | **Mínimo 1x/dia, precisão por hora (mais ou menos 59 minutos).** Expressões mais frequentes **falham no deploy**, com erro explícito | **Proibido.** "non-commercial, personal use only" | Espera de 30 dias para o recurso voltar, na maioria dos casos | **Não.** Um relatório agendado para 16h pode chegar 16h59, um minuto antes de abrir |
| **Netlify Free** (scheduled functions) | Sim, consumindo compute dos 300 créditos (10 créditos por GB-hora) | Não verificada nesta pesquisa | Permitido | Limite duro de crédito, recursos pausam até o próximo ciclo de cobrança | **Tecnicamente sim, mas os 15 créditos por deploy de produção limitam o projeto a cerca de 20 deploys/mês** |
| **Supabase `pg_cron`** | Extensão disponível, mas **detalhes de cron no plano Free NÃO ESPECIFICADOS** na página de preços | **NÃO VERIFICADO** | Permitido | Não verificado | **Não use como peça crítica sem confirmar** |
| **GitHub Actions** | Sim, `schedule` em workflow. 2.000 min/mês no privado, ilimitado no público | Definição em minuto, mas **o GitHub é conhecido por atrasar workflows agendados em horário de pico**, sem garantia documentada de pontualidade | Permitido | Workflow não roda até a cota renovar | **Como reserva, sim. Como principal, não**, por causa do atraso em pico |
| **Google Apps Script** (trigger de tempo) | Sim, 90 minutos/dia de runtime de trigger na conta gmail.com | Trigger de tempo, precisão não verificada nesta pesquisa | Permitido | Cota diária bloqueia a execução | **Sim, se o caminho for o pacote Google da seção 6** |

### Recomendação: Cloudflare Pages + Workers + Cron Triggers

Três argumentos, em ordem de peso:

1. **É o único plano gratuito que permite uso comercial e ainda entrega precisão de minuto.** A comparação real não é Cloudflare contra Vercel, é Cloudflare contra Vercel Pro a US$ 20 por desenvolvedor/mês, e aí não existe empate: um custa zero e o outro custa US$ 240/ano.
2. **A precisão importa neste caso específico.** Mais ou menos 59 minutos num relatório que existe para ser lido antes de abrir não é detalhe estético. Com abertura às 17h, a deriva do Hobby transforma "leia antes de abrir" em "leia enquanto abre".
3. **Assets estáticos grátis e ilimitados, sem cobrança de egress nem de banda**, ambos texto oficial. Isso mata a única categoria de custo que costuma crescer sem aviso em projeto web.

**A honestidade técnica que acompanha a escolha:** o teto de **10 ms de CPU por invocação** no Workers Free é apertado. Espera de I/O (chamada ao banco, ao Groq, ao Resend) **não conta** como tempo de CPU, então o Worker como orquestrador de entrada e saída passa folgado. O que estoura é processamento: renderização pesada de Next.js, agregação de meses de dados em memória, geração de imagem. O desenho que respeita o limite é **pré-agregar no Postgres** (uma tabela diária de resumo, escrita pelo próprio cron) e deixar o Worker só lendo o resultado. Se o painel exigir renderização mais pesada, a saída é servi-lo como página estática no Pages com os gráficos montados no navegador, o que zera o problema.

**Lacuna registrada:** a página de Cron Triggers do Cloudflare não declara disponibilidade no plano Free; os "5 por conta" vêm da tabela de limites do Workers (Free 5 / Paid 250). Vale confirmar na documentação de preços se o Cron Trigger no Free consome a mesma cota de 100.000 requisições/dia. No volume do QT isso não muda a decisão, mas é dado ausente e fica dito.

---

## 4. Envio de e-mail: 1 a 5 por dia, com gráfico

| Provedor | Limite gratuito real | Retenção de log | Domínio próprio no gratuito | Cobra anexo? | Veredito para 1 a 5 e-mails/dia |
|---|---|---|---|---|---|
| **Resend Free** | 3.000/mês e **100/dia**, 10.000 automation runs/mês | 30 dias | **Sim, 1 domínio** | Não | **ESCOLHIDO.** Folga de 20x no teto diário, API simples, encaixa em Worker e em Edge Function |
| **Mailgun Free** | **100/dia**, plano gratuito permanente (não é trial) | **1 dia** | 1 domínio de envio | Não | Segunda opção. A retenção de 1 dia impede investigar "não recebi ontem" |
| **Brevo Free** | Cerca de **300/dia**, limite global compartilhado entre marketing e transacional | Não verificada | Não verificado | Não verificado | **Confiança baixa.** O verificador registrou que os 300/dia seguem **sem confirmação em página da própria Brevo**, que não renderiza conteúdo legível. **Não trate como degrau gratuito garantido** |
| **Amazon SES** | **Sem tier gratuito permanente identificado.** US$ 200 em créditos do Free Tier para conta nova, disponíveis por 6 meses. Depois: US$ 0,16 por 1.000 e-mails + **US$ 0,12 por GB de dados de anexo** | Não verificada | Sim | **Sim, o único da lista** | **IGNORAR.** Só compensa em volume alto, e é o único que cobra por anexo |
| **Gmail / Google Workspace** | Workspace pago: 2.000 mensagens/dia, mail merge 1.500/dia, trial 500/dia, 100 destinatários por mensagem via SMTP/POP/IMAP, 10.000 destinatários/dia. **Limites de conta @gmail.com gratuita: DESCONHECIDO na fonte oficial** | Sem log de entrega | Depende do Workspace | Não | Aceitável como **fallback**, nunca como principal: sem log, sem métrica de entrega, sujeito a bloqueio por política |
| **Google Apps Script** (conta gmail.com) | 100 destinatários/dia | Sem log de entrega | Não (remetente @gmail.com) | Não | Serve se o caminho for o pacote Google inteiro. Remetente @gmail.com num restaurante que se posiciona como premium é um custo de imagem, não de dinheiro |

### Domínio verificado

**NÃO CONFIRMADO nas páginas de preço lidas.** É prática consolidada do setor que provedor de e-mail transacional exija autenticação de domínio (SPF e DKIM) para entregar em nome do seu domínio, mas o texto literal dessa exigência não foi lido em nenhuma das páginas oficiais desta pesquisa. Trate como **prática a validar no onboarding do Resend**, não como número verificado.

O que decorre disso, independentemente do texto: **sem SPF e DKIM configurados no subdomínio do QT, o relatório diário cai em spam**, e a conclusão de quem recebe vai ser que o sistema não funciona. É um trabalho técnico de uma vez, no DNS, e é a diferença entre o projeto ser adotado e ser abandonado na segunda semana.

### Recomendação e o detalhe do gráfico

**Resend Free como principal**, com remetente no subdomínio próprio do QT autenticado. Consumo: 5 e-mails/dia dão 150/mês, que é **5% da cota mensal e 5% do teto diário**. Como fallback automático, se a API do Resend falhar o cron reenvia por outro caminho (Mailgun Free, 100/dia, é o mais próximo em limite real confirmado).

**Sobre o gráfico no e-mail, com uma correção de rota honesta:** a pesquisa original sugere gerar SVG inline no HTML do e-mail em vez de rasterizar PNG, para não estourar os 10 ms de CPU do Worker. A parte de não rasterizar está certa e é importante. Mas a **compatibilidade de SVG inline nos clientes de e-mail NÃO FOI VERIFICADA nesta pesquisa**, e é sabidamente irregular. O caminho seguro para um relatório que precisa funcionar sem ninguém consertando depois:

1. **Barra desenhada em HTML e CSS** (célula de tabela com largura percentual e cor de fundo). Não depende de imagem, de SVG nem de fonte externa, e é o que sobrevive em qualquer cliente.
2. **Os números em tabela**, que é o que de fato vai ser lido no celular.
3. **Um link para o painel**, onde o gráfico de verdade (Recharts) mora.

Isso também elimina peso de anexo, e portanto a única linha da tabela acima que cobrava por dado transferido deixa de fazer qualquer diferença.

---

## 5. Camada gratuita de LLM

O volume é pequeno: cerca de **8 comentários por dia** para classificar e **1 resumo diário**, algo como 9 chamadas por dia. Qualquer free tier da tabela aguenta com folga absurda. Por isso o critério que decide **não é limite, é o que o fornecedor faz com o texto**, porque o que vai para lá é comentário de cliente do restaurante.

| Fornecedor e modelo | Limite por minuto | Limite por dia | O dado é usado para treino? | Confiança |
|---|---|---|---|---|
| **Groq `llama-3.1-8b-instant`** | 30 RPM, 6.000 tokens/min | **14.400 req/dia**, 500.000 tokens/dia | **Não.** Cláusula contratual: "Groq is not permitted to use Inputs or Outputs for training or fine-tuning any AI Model Services or other models, unless explicitly granted permission or instructed by Customer" | **Alta.** Verificada número por número. Existe ainda configuração de zero data retention para clientes elegíveis |
| **Groq `llama-3.3-70b-versatile`** | 30 RPM, 12.000 tokens/min | **1.000 req/dia**, 100.000 tokens/dia | **Não**, mesma cláusula | **Alta** |
| **Groq `whisper-large-v3`** | 20 RPM | 2.000 req/dia | **Não**, mesma cláusula | **Alta** |
| **Gemini API, tier gratuito** | **NÃO PUBLICADO.** A doc oficial agora diz apenas que "rate limits depend on a variety of factors (such as your usage tier) and can be viewed in Google AI Studio" | **NÃO PUBLICADO.** Terceiros citam 5 RPM/100 por dia (2.5 Pro), 10 RPM/250 (2.5 Flash) e 15 RPM/1.000 a 1.500 (2.5 Flash-Lite) | **Sim.** "Google uses the content you submit to the Services and any generated responses to provide, improve, and develop Google products and services and machine learning technologies", "Human reviewers may read, annotate, and process your API input and output" e, literalmente, "Do not submit sensitive, confidential, or personal information to the Unpaid Services" | **Limites: baixa.** O verificador classificou os números de terceiro como **inverificáveis por construção**, porque a Google retirou os valores da doc pública. **Termos: alta**, texto lido |
| **Gemini API, tier pago** | Não extraído nesta pesquisa | Não extraído nesta pesquisa | **Não.** "Google doesn't use your prompts ... or responses to improve our products" | **Alta** no termo. Preço **NÃO EXTRAÍDO** |
| **Cerebras** (trial) | 5 RPM, 30.000 tokens/min | 1.000.000 tokens/hora e 1.000.000 tokens/dia por modelo | **NÃO VERIFICADO** | Limites: alta. Mas os **US$ 5 de crédito expiram em 30 dias** e exigem método de pagamento verificado. **Não serve como base permanente** |
| **Mistral, tier Experiment** | **NÃO PÚBLICO** (só no console da organização) | **NÃO PÚBLICO** | **NÃO VERIFICADO** | **Desconhecido** |
| **OpenRouter, modelos `:free`** | 20 RPM | **50 req/dia**; sobe para 1.000/dia com pelo menos US$ 10 em créditos comprados na vida da conta | **NÃO VERIFICADO** | Limites: alta |

### Recomendação: Groq, por privacidade antes de por limite

`llama-3.1-8b-instant` para classificar comentário (é onde o número de chamadas por dia é maior) e `llama-3.3-70b-versatile` para escrever o resumo diário (1.000/dia sobra para 1 chamada). Consumo total: **cerca de 0,06% da cota diária**.

O Gemini gratuito está **descartado como caminho principal**, e não por cota: o próprio termo da Google pede para não enviar informação pessoal ao tier não pago, e comentário de cliente de restaurante frequentemente contém nome de garçom, nome de quem escreveu e situação identificável. Mandar isso para um serviço que declara treinar com o dado e submetê-lo a revisão humana é incompatível com o desenho de LGPD que o projeto quer fazer certo desde o início.

**Regra de ouro que vale para qualquer fornecedor, presente ou futuro:** nunca envie identificador direto ao LLM. Manda só o texto do comentário e as notas, com nome e WhatsApp substituídos por um id interno, e reconstitui a identidade no banco. Assim, trocar de fornecedor amanhã não vira incidente de dado pessoal.

### O risco de a política do fornecedor mudar, e o plano de contingência

**O risco é real e já se materializou uma vez no mercado.** A Google retirou os números de rate limit da documentação pública do tier gratuito, e há relato amplo (inverificável, como o verificador registrou) de corte de 50% a 80% nas cotas em dezembro de 2025. **Free tier de LLM não é base contratual estável.** A boa notícia estrutural é que, com 9 chamadas por dia, o custo de migrar é quase zero, e a arquitetura deve explorar isso.

Plano de contingência em quatro camadas, da mais preventiva à mais drástica:

| Camada | O que é | Custo | Quando entra |
|---|---|---|---|
| **0. Desacoplamento** | Um único módulo no código com o prompt, a chamada HTTP e o parser da resposta. Nada de SDK espalhado pelo projeto | R$ 0 | **Desde o primeiro dia.** É o que torna todas as camadas abaixo viáveis |
| **1. Troca de modelo dentro do Groq** | Cair do `70b-versatile` para o `8b-instant` no resumo, se o limite do modelo grande apertar | R$ 0 | Ao bater rate limit no modelo grande |
| **2. Troca de fornecedor** | OpenRouter `:free` (20 RPM, 50 req/dia cobrem as 9 chamadas com folga de 5x) ou Gemini gratuito **somente com texto anonimizado** | R$ 0 | Se o free tier do Groq acabar |
| **3. Degradação sem IA** | Classificação por regra: escala de nota mais palavras-chave. Cobre a maior parte de 200 comentários/mês. O relatório diário passa a trazer números, tendência e os comentários agrupados por área, sem o diagnóstico escrito | R$ 0 | Se nenhum free tier de LLM sobrar |
| **4. Pagar** | Tier pago do Gemini (que, ao contrário do gratuito, não treina com o dado) ou tier pago do Groq | **Preço por token NÃO EXTRAÍDO nesta pesquisa.** Precisa de cotação antes de entrar em orçamento | Só se a camada 3 se provar insuficiente na prática |

O ponto que fecha a contingência: **o sistema tem que continuar entregando valor com a camada 3**. Se a análise de IA for o alicerce e não o acabamento, qualquer mudança de política de fornecedor derruba o produto. Se ela for acabamento, uma mudança de política custa uma linha de configuração.

---

## 6. Alternativas open-source e prontas

O veredito abaixo é dado contra uma única pergunta: **isso ganha de construir em Next.js e Supabase, no cenário de uma unidade, volume pequeno e ninguém para manter?**

Antes da tabela, o achado que organiza tudo: **nenhuma ferramenta autohospedada da pesquisa atinge custo zero.** Todas exigem VPS com Docker e banco, tipicamente **US$ 5 a US$ 10/mês, ou algo entre R$ 30 e R$ 60/mês** (estimativa da pesquisa, não preço lido em página de fornecedor). O custo não desaparece, migra de licença para servidor, e traz junto atualização de container, backup de banco e renovação de certificado. Numa operação sem ninguém de TI, essa migração é ruim mesmo sendo barata.

| Ferramenta | O que é | Licença | Custo real | Veredito |
|---|---|---|---|---|
| **SurveyJS Form Library** | Motor de formulário React que renderiza a pesquisa, valida e aplica lógica condicional, definição em JSON | **MIT** | **R$ 0**, roda no bundle do Next.js | **USAR.** Elimina 60 a 70% do trabalho de front do formulário sem um centavo de infraestrutura. O **Survey Creator** (construtor visual) e o **Dashboard** são proprietários e pagos, a partir de **US$ 569 por desenvolvedor**: não compre nenhum dos dois, versione o JSON no repositório |
| **Recharts** (ou Tremor) | Biblioteca de gráfico React | Recharts **MIT**, Tremor **Apache 2.0** (licenças confirmadas em fonte de terceiro, não no repositório oficial: **confiança média**) | **R$ 0**, sem serviço novo | **USAR.** É a resposta correta para o painel, com controle total do visual para aplicar o manual de marca |
| **Tally** | Construtor de formulário SaaS. **A única ferramenta pesquisada com respostas ILIMITADAS no plano gratuito**, com webhook incluído no gratuito | Proprietário | **R$ 0** (Pro a US$ 24/mês só para remover a marca) | **USAR como ponte temporária, e essa recomendação economiza semanas.** Tally no ar em dias, webhook gravando cada resposta no banco próprio, mensalidade atual cancelada **antes** de o sistema próprio existir. A marca Tally no formulário é o preço, e é um preço de algumas semanas |
| **Google Forms + Sheets + Looker Studio + Apps Script** | Pacote gratuito que cobre coleta, histórico, painel e e-mail diário por trigger de tempo | Proprietário | **R$ 0**, sem cartão de crédito e sem servidor | **ESTUDAR como plano B de emergência.** É o único caminho com custo comprovadamente zero e **zero risco de mudança de política de fornecedor pago**. Perde em duas frentes que importam aqui: marca Google na tela do cliente e Sheets como banco, que não sustenta o cruzamento com venda e CMV |
| **Formbricks Community Edition** | Plataforma de pesquisa e CX completa: coleta, lógica condicional e análise no mesmo pacote, com setup one-click em Docker | **AGPLv3** | **R$ 30 a R$ 60/mês de VPS**, mais manutenção | **ESTUDAR, com honestidade sobre o que ganha.** É o único produto que entrega coleta, lógica e análise juntos, e implanta em **4 a 12 horas contra 40 a 80 de construção própria**. Some duas ressalvas verificadas: a doc de self-hosting **não publica requisito mínimo de RAM e CPU**, o que impede escolher o VPS mais barato com segurança, e recursos de time ficam atrás de licença Enterprise **sem preço público**. Contra a restrição de que ninguém vai manter, um container para atualizar é exatamente o que não se quer |
| **LimeSurvey Community Edition** | Motor de pesquisa muito completo em tipos de pergunta, em PHP | GPL v2 ou posterior | VPS LAMP | **IGNORAR.** Stack incompatível com serverless, interface datada no celular do cliente e complexidade muito acima de uma pesquisa de 45 segundos |
| **Typebot** | Coleta em formato conversacional, que costuma converter melhor no celular | **AGPLv3** | VPS, cerca de US$ 10/mês (fonte de terceiro) | **ESTUDAR só a ideia, não a ferramenta.** O formato conversacional é o melhor argumento da lista para subir taxa de resposta, e pode ser copiado no formulário próprio sem adicionar um servidor |
| **Metabase Open Source** | BI que aponta para o Postgres e entrega painel mais e-mail agendado **sem escrever código** | Open Source Edition (licença exata **NÃO VERIFICADA** nesta pesquisa) | VPS com JVM e **JRE 25 específico** do Eclipse Temurin. Requisito mínimo de RAM **NÃO PÚBLICO** | **IGNORAR.** A promessa é sedutora (painel e e-mail diário resolvidos com configuração visual), mas exige servidor com JVM e o atrito de manutenção mais alto da lista. A nuvem começa em **US$ 100/mês mais US$ 6 por usuário**, mais caro que o fornecedor atual inteiro |
| **Apache Superset** | BI de escala corporativa | Apache 2.0 (confirmada só em fonte de terceiro) | VPS com Python, Celery e Redis | **IGNORAR.** Desproporcional para 200 respostas/mês |
| **Grafana Cloud Free** | Visualização com alerta por e-mail nativo | AGPLv3 no OSS | R$ 0 na nuvem | **IGNORAR, por eliminação factual:** o gratuito retém métricas e logs por **14 dias**, contra um requisito de histórico de anos, e limita a 3 usuários de visualização por mês |
| **Redash** | BI baseado em SQL | BSD-2-Clause | VPS | **IGNORAR.** Modo de manutenção, cerca de um release por ano desde 2022, fórum da comunidade em somente leitura e nuvem oficial desligada em 30/11/2021 |
| **PostHog self-host** | Product analytics com módulo de surveys | MIT | Stack com ClickHouse, Kafka e Redis, servidor caro | **IGNORAR.** A própria PostHog documenta que o self-host open source é feito para hobbistas, sem suporte comercial e sem ajuda para depurar |
| **NocoDB** | Airtable autohospedado sobre banco relacional | **Sustainable Use License** desde a v0.301.0 (fim de 2024). Deixou de ser open source pela definição da OSI | VPS | **IGNORAR.** Formulários rudimentares, views tabulares não são painel de gestão, e a mudança de licença em 2024 é sinal de mais restrição pela frente |
| **Baserow** | Airtable autohospedado, a licença mais permissiva da categoria | **MIT** no núcleo, com promessa oficial de autohospedado sem limite de linhas ou API | VPS. Premium por usuário/mês, valor **NÃO PÚBLICO** | **IGNORAR** para este escopo, apesar da licença limpa: não entrega leitura gerencial |
| **Appsmith / Budibase** | Low-code para ferramenta interna e back-office | Apache 2.0 / GPLv3 | VPS com Docker | **IGNORAR.** Um painel de 200 respostas/mês cabe numa página Next.js com Recharts |
| **n8n** | Orquestração de automação com centenas de conectores | **Sustainable Use License**: uso interno do próprio negócio **explicitamente permitido** com workflows ilimitados; oferecer como serviço hospedado a clientes **proibido** | VPS com Docker e Postgres | **ESTUDAR, para depois.** Para um e-mail por dia, um Cron Trigger de cerca de 30 linhas resolve de graça. n8n só passa a fazer sentido quando entrar integração real com o PDV, disparo por WhatsApp e regras condicionais de alerta |
| **Activepieces / Node-RED** | Orquestração alternativa | MIT no núcleo / Apache 2.0 | VPS | **IGNORAR.** Mesma crítica do n8n, com ecossistema menor |
| **Umami** | Analytics de site com foco em privacidade | **MIT** | VPS, ou nuvem com preços que a **página oficial não permitiu ler** (renderizada em JavaScript) | **IGNORAR.** O único valor real (medir quantos escaneiam o QR contra quantos concluem) sai de contar evento na própria tabela do banco, sem novo serviço |
| **Fillout** | Formulário SaaS, 1.000 respostas/mês no gratuito | Proprietário | R$ 0 até 1.000 respostas/mês | **IGNORAR.** O Tally é melhor no gratuito (ilimitado) e o analytics do Fillout só vem no Business a US$ 75/mês |
| **Neon Free** | Postgres serverless com branching, 100 projetos no gratuito | Proprietário | R$ 0 | **IGNORAR como banco principal.** Ganha em número de projetos, mas suspende o compute até o próximo mês ao estourar, e não traz Auth, Storage nem API REST prontos |
| **Cloudflare D1** | SQLite gerenciado, 5 GB no gratuito, sem pausa por inatividade | Proprietário | R$ 0 | **ESTUDAR como plano B do banco.** Vantagens reais sobre o Supabase Free: 5 GB e **nenhuma pausa por inatividade**. Desvantagem: é SQLite, não Postgres, e não traz Auth pronto nem RLS |
| **OpenSurvey** | Projetos soltos no GitHub com esse nome | **NÃO VERIFICADA** | VPS | **IGNORAR.** Não é um produto consolidado: há ao menos dois projetos distintos com o mesmo nome, sem licença verificada e sem evidência de comunidade ou releases regulares |

**Onde uma ferramenta pronta realmente economiza semanas, e vale dizer isso sem rodeio:** o **Tally** no plano gratuito, com webhook para o banco próprio, encurta a saída da mensalidade atual de meses para dias. É a única recomendação desta seção que muda o cronograma financeiro do projeto, e ela não é open-source nem elegante. A sequência que ela habilita: coletar no Tally desde a semana 1, cancelar a mensalidade imediatamente, construir o formulário próprio sem pressa nas semanas seguintes, e trocar o QR code de destino quando estiver pronto, sem um único dia sem coletar dado.

---

## 7. A conta final

### Cenário realista: o custo mensal item por item

| Item do sistema | Serviço e plano | Custo mensal | Consumo previsto contra o limite |
|---|---|---|---|
| Hospedagem do formulário e do painel | Cloudflare Pages Free | **R$ 0,00** | Assets estáticos grátis e ilimitados por texto oficial. 500 builds/mês, consumo bem abaixo |
| API de gravação de resposta | Cloudflare Workers Free | **R$ 0,00** | Cerca de 40 requisições/dia contra 100.000/dia = **0,04%** |
| Agendamento das 16h | Cloudflare Cron Triggers | **R$ 0,00** | 1 dos 5 triggers gratuitos da conta |
| Banco e histórico de anos | Supabase Free (organização própria) | **R$ 0,00** | 3,6 MB/ano, 36 MB em 10 anos, contra 500 MB = **7,2%** |
| E-mail diário | Resend Free | **R$ 0,00** | 150/mês contra 3.000 e 5/dia contra 100 = **5%** nos dois tetos |
| Classificação e resumo por IA | Groq Free | **R$ 0,00** | Cerca de 9 chamadas/dia contra 14.400 = **0,06%** |
| Repositório, backup e cron de reserva | GitHub Free, repositório privado | **R$ 0,00** | 30 minutos/mês contra 2.000 = **1,5%** |
| Motor de formulário | SurveyJS Form Library (MIT) | **R$ 0,00** | Licença perpétua, roda no bundle |
| Gráficos do painel | Recharts (MIT) | **R$ 0,00** | Licença perpétua, roda no bundle |
| Modo quiosque no tablet | Fixação de tela nativa do Android | **R$ 0,00** | Recurso do sistema, exige PIN para desafixar |
| Endereço na internet | Subdomínio do domínio que o QT já tem | **R$ 0,00 adicional** | A renovação anual do domínio já é custo existente |
| **Total** | | **R$ 0,00/mês** | |

### Cenário pessimista: o que pode virar mensalidade, e por qual gatilho

| Item | Gatilho que faz virar custo | Custo | Fonte e status |
|---|---|---|---|
| **Supabase Pro** | Restrição da Fair Use Policy depois do período de graça, ou decisão de ter backup gerenciado em vez de dump próprio | **US$ 25/mês** | **Oficial.** O verificador corrigiu a pesquisa original, que tratava esse preço como referência incerta sem motivo |
| **Resend Pro** | Teto de 100/dia estourado, o que só acontece se entrar disparo de pesquisa por e-mail para a base de clientes | **US$ 20/mês** para 50.000 e-mails | **Oficial** |
| **Cloudflare Workers Paid** | Teto de 10 ms de CPU virar limitação real do painel | **NÃO EXTRAÍDO nesta pesquisa** | Precisa de cotação antes de entrar em orçamento |
| **LLM pago** | Fim do free tier do Groq **e** a contingência sem IA se provar insuficiente | **Preço por token NÃO EXTRAÍDO nesta pesquisa.** A camada 3 da contingência custa **R$ 0** | Lacuna registrada |
| **VPS** | Só se abandonar serverless e adotar Formbricks ou Metabase autohospedado | **R$ 30 a R$ 60/mês** | Estimativa da pesquisa, não preço lido em página de fornecedor |
| **Total pessimista verificável** | Supabase Pro + Resend Pro | **US$ 45/mês** | |

**A conta em reais, explícita.** US$ 45/mês dão **US$ 540/ano**. O câmbio **NÃO FOI VERIFICADO nesta pesquisa**, então a conversão fica em duas pontas declaradas: a **R$ 5,00 por dólar** são **R$ 2.700/ano**; a **R$ 6,00 por dólar**, **R$ 3.240/ano**.

### A economia anual contra o que ele paga hoje

Base: **R$ 501 a R$ 1.000/mês**, o que dá **R$ 6.012/ano no piso** e **R$ 12.000/ano no teto**.

| Cenário do sistema próprio | Custo anual | Economia contra o piso (R$ 6.012) | Economia contra o teto (R$ 12.000) |
|---|---|---|---|
| **Realista** (R$ 0,00/mês) | **R$ 0** | **R$ 6.012 (100%)** | **R$ 12.000 (100%)** |
| **Pessimista a R$ 5,00/US$** | R$ 2.700 | R$ 3.312 (**55%**) | R$ 9.300 (**78%**) |
| **Pessimista a R$ 6,00/US$** | R$ 3.240 | R$ 2.772 (**46%**) | R$ 8.760 (**73%**) |

Contas: 6.012 menos 2.700 = 3.312, e 3.312 dividido por 6.012 = 55%. 12.000 menos 3.240 = 8.760, e 8.760 dividido por 12.000 = 73%. **A leitura que importa é a linha de baixo do pior cenário: mesmo se tudo o que pode virar pago virar pago, e com o dólar na ponta alta das duas hipóteses, a economia não cai abaixo de 46%.** No cenário realista, que é o mais provável dado o volume, ela é de 100%.

### O custo único de hardware

| Item | Valor | Status |
|---|---|---|
| **Tablet Android de entrada**, 2 unidades (uma em uso, uma de reserva carregada) | **NÃO VERIFICADO.** Única referência independente disponível: cerca de **180 EUR** por unidade (GSMArena, Galaxy Tab A11) | O verificador **refutou** a faixa de R$ 900 a R$ 1.200 citada na pesquisa original: era dado de terceiro, e a loja oficial da Samsung no Brasil não expõe preço legível. **Cotação em varejista no momento da compra é obrigatória.** A compra no Paraguai muda a conta e não foi pesquisada |
| **Licença Fully Kiosk PLUS** (opcional) | **8,90 EUR (ou 10,99 US$) mais imposto, por dispositivo, pagamento único**, com desconto por volume a partir de 10 dispositivos | **Oficial.** O verificador corrigiu o valor de 7,90 EUR da pesquisa original, que estava 12,7% abaixo, e registrou que o preço **está** na página oficial. Só compre se a operação provar que precisa de reabertura automática após reboot |
| **Suporte de mesa com chave e cabo** | **NÃO PESQUISADO** | Tablet solto em salão pede fixação física |
| **Raspberry Pi Zero 2 W** | **Não comprar na v1.** Preço de varejo no Brasil **DESCONHECIDO**. Energia de cerca de 0,5 kWh/mês, menos de R$ 1/mês (tarifa do Rio **NÃO VERIFICADA**, ordem de grandeza) | Um Cron Trigger na nuvem faz o mesmo trabalho de graça, sem cartão SD que corrompe e sem depender do Wi-Fi do salão. O Pi só ganha se o PDV não expuser o dado de nenhuma forma para fora |

### Requisito mínimo de hardware, com a correção do verificador

Para um formulário leve, o piso confortável é **4 GB de RAM, tela de 10 a 11 polegadas, 64 GB e Android 13 ou superior** (a versão do Android importa porque WebView antigo quebra o formulário em 2 a 3 anos). **Correção do verificador sobre o Galaxy Tab A11:** ele sai de fábrica com **Android 15, atualizável para Android 16 e One UI 8**, e não com Android 16 como a pesquisa original afirmou. Como a versão de fábrica é justamente o dado sensível à decisão, esse detalhe vale a conferência na embalagem. Configurações confirmadas: 8,7 polegadas, 800x1340, 90 Hz, Helio G99, com opções de 4 GB/64 GB e de 4, 6 ou 8 GB/128 GB.

### O custo escondido que não é dinheiro

| Custo | Tamanho | Comentário honesto |
|---|---|---|
| **Horas de construção** | **40 a 80 horas** no caminho recomendado. **12 a 20 horas** no caminho híbrido com Tally | É a restrição real do projeto. Infraestrutura não é |
| **Ritual de keep-alive** | Código, não lembrete | Sem ele, uma semana de inatividade pausa o banco |
| **Ritual de backup** | `pg_dump` semanal para fora do Supabase | **O plano gratuito não tem backup nenhum.** Backup diário com retenção de 7 dias só existe no Pro a US$ 25/mês. Sem esse dump, "anos de histórico" é promessa sem piso |
| **Configuração de DNS** | Uma vez, SPF e DKIM | Sem isso o relatório vai para spam e o sistema é declarado quebrado |
| **Troca de tablet** | A cada 2 a 3 anos | Não é mensalidade, é reposição. WebView de aparelho de entrada envelhece |

---

## 8. O que ameaça o custo zero ao longo do tempo

O custo zero não é um estado que se alcança, é uma condição que se mantém. Estas são as ameaças reais, em ordem de probabilidade, com a ação que evita ser pego.

| Ameaça | Probabilidade | O que acontece | O que fazer, e quando |
|---|---|---|---|
| **Pausa do Supabase por 1 semana de inatividade** | **Alta.** É comportamento documentado, não acidente | Banco pausado, coleta e painel fora do ar, restauração manual | Cron diário que toca o banco. O relatório das 16h já faz isso. **Separar no código o envio do e-mail da consulta ao banco**, para pausar um sem pausar o outro |
| **Restrição em cascata na organização Supabase** | Média | Depois do período de graça, **402 em toda a API** e banco somente leitura, aplicado a **todos os projetos da organização**, e **sem segundo período de graça** num estouro futuro | **Organização Supabase separada** para o sistema de pesquisa, para que um estouro aqui não derrube o app de reservas. Decidir isso **antes** de criar a primeira tabela |
| **Limite de 2 projetos ativos** | Alta, é limite fixo | Não sobra slot para staging, ou pior, descobre-se que o app de reservas já ocupou os dois | Inspecionar o que o app de reservas ocupa hoje. Reservar o segundo slot para staging e nada mais |
| **Ausência de backup no plano gratuito** | Alta, é ausência declarada | Perda de histórico num incidente, sem ponto de restauração próprio | `pg_dump` semanal via GitHub Actions para storage fora do Supabase, **desde o primeiro mês de dado real** |
| **Mudança de política de free tier de LLM** | **Alta.** Já ocorreu no mercado: a Google retirou os números de cota da doc pública | Classificação e diagnóstico param | As quatro camadas da seção 5. A chave é o desacoplamento em um módulo só, feito no primeiro dia |
| **Alguém subir o projeto no Vercel Hobby "só para testar"** | Média, e é o erro mais fácil de cometer | Violação de termos com risco de conta e deploy pausados, num plano que parecia gratuito | Escrever no README, em uma linha, que Vercel Hobby é proibido para este projeto, e por quê |
| **Limite duro de crédito do Netlify** | Só se escolher Netlify | 300 créditos dão cerca de 20 deploys de produção por mês, e os recursos param até o próximo ciclo de cobrança | Não escolher Netlify. Se escolher, contar deploy como recurso escasso |
| **Cartão de crédito com recarga automática** | Média, depende de descuido | Conta gratuita virando fatura sem aviso | **Manter tudo em plano que para em vez de plano que cobra.** Supabase Free tem limite duro, Cloudflare Free não cobra egress. Nunca habilitar auto-recharge em nada |
| **Workflow agendado desativado em repositório inativo (GitHub)** | **DESCONHECIDO.** Relato amplo da comunidade, **não confirmado** na documentação lida | O cron de reserva e o backup param em silêncio | Não fazer do GitHub Actions a peça crítica. O cron principal é o Cloudflare. **Verificar isso antes de depender do Actions para o backup** |
| **Retenção curta de log** | Certa, é característica do plano | Resend guarda 30 dias, Supabase guarda 1 dia de log de API e banco. Investigar "não recebi o relatório do mês passado" fica impossível | Gravar no próprio banco uma linha por execução do cron: horário, quantas respostas entraram, se o e-mail saiu. **É o log que sobra quando o do fornecedor expira** |
| **Falha silenciosa, o risco maior de todos** | **Alta**, porque ninguém monitora | O sistema para e ninguém percebe por dias | **Fazer do relatório diário o batimento cardíaco do sistema.** Se ele não chegar dois dias seguidos, algo quebrou, e essa é a única regra de operação que precisa existir. Escrever isso no README, em uma frase |

A ideia que amarra a seção: **num projeto sem manutenção, monitoramento não pode ser uma ferramenta a mais, tem que ser um efeito colateral do produto.** O e-mail das 16h é, ao mesmo tempo, o entregável, o keep-alive do banco e o alarme de falha. Três funções numa peça é o que torna "ninguém mantém" uma restrição viável em vez de uma bomba de tempo.

---

## 9. A stack recomendada

| Camada | Escolha | Por quê, em uma linha |
|---|---|---|
| **Hospedagem** | **Cloudflare Pages Free** | Assets estáticos grátis e ilimitados, sem cobrança de egress nem de banda, ambos texto oficial |
| **Backend e API** | **Cloudflare Workers Free** | 100.000 requisições/dia contra as 40 previstas, e sem cláusula anticomercial no gratuito |
| **Agendamento** | **Cloudflare Cron Triggers** | O único gratuito que crava 16h00 com precisão de minuto e permite uso comercial |
| **Banco e histórico** | **Supabase Free, em organização própria e separada do app de reservas** | Postgres de verdade com Auth e RLS prontos, e 500 MB que dão 13 vezes uma década de histórico |
| **Plano B do banco** | **Cloudflare D1** | 5 GB e **nenhuma pausa por inatividade**, se a política do Supabase Free piorar |
| **E-mail** | **Resend Free**, com SPF e DKIM no subdomínio do QT | 3.000/mês e 100/dia contra 5/dia, e domínio próprio já incluído no gratuito |
| **IA** | **Groq**, `llama-3.1-8b-instant` para classificar e `llama-3.3-70b-versatile` para o resumo | Cláusula contratual de não usar o dado para treino, que é o critério que decide quando vai comentário de cliente para lá |
| **Formulário** | **SurveyJS Form Library (MIT)**, com a definição em JSON versionada no repositório | Elimina 60 a 70% do trabalho de front sem custo e sem servidor, e sem comprar o Creator de US$ 569 |
| **Gráficos** | **Recharts (MIT)** | Roda no bundle que já existe, e dá controle total para aplicar o manual de marca da QT |
| **Repositório, backup e cron de reserva** | **GitHub Free**, repositório privado, com Actions | Versionamento, `pg_dump` semanal para fora do Supabase e segundo cron, dentro de 1,5% da cota |
| **Ponte das primeiras semanas** | **Tally Free** com webhook para o banco próprio | Permite cancelar a mensalidade atual na primeira semana, sem esperar o sistema próprio ficar pronto e sem um dia sem coletar |
| **Quiosque** | **Fixação de tela nativa do Android** | Exige PIN para desafixar, custa R$ 0, e o Fully Kiosk PLUS (8,90 EUR por dispositivo, uma vez) só entra se faltar reabertura automática após reboot |
| **Agente do PDV** | **Nenhum hardware na v1** | Um Cron Trigger na nuvem faz o trabalho de graça; o Raspberry Pi Zero 2 W só entra se o PDV não expuser o dado de forma alguma |

**Custo desta stack: R$ 0,00/mês, com R$ 0,00 adicional de domínio.** O único desembolso é o tablet, cujo preço em reais permanece **NÃO VERIFICADO** e precisa de cotação no ato da compra.

**A frase que resume a seção:** o custo zero é real e verificável hoje, camada por camada, em página oficial de cada fornecedor. Ele não sobrevive sozinho a dois anos de operação, e as duas coisas que o protegem custam algumas horas de código no início: um cron que toca o banco todos os dias e um dump que sai do Supabase toda semana. Quem constrói assim e não faz essas duas coisas não paga mensalidade, paga com o histórico.
