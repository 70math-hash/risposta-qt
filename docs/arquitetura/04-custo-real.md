# Custo real

**Data:** 17/08/2026 · **Escopo:** desenho, não execução. **Nenhuma migration foi aplicada e nenhum DDL foi
executado para escrever este documento.** As 14 migrations que existem em `supabase/migrations/` são arquivo
inerte até que a condição 3 de `D2` esteja cumprida, e o destino do `pg_dump` de `NFe e Financeiro` ainda não
existe (é a entrega **`pg_dump` de `NFe e Financeiro` guardado fora do Supabase**, na M1).

**Precedência:** este documento é nível 5 da tabela da seção 10 de [`00-canonico.md`](00-canonico.md). Ele não
renomeia nada da folha canônica, **não cria nome novo nenhum** e não inventa número. Todo valor abaixo é da
folha canônica (`N01` a `N46`), de `D1` a `D8`, da inspeção do ambiente, ou está marcado com as palavras
**NÃO VERIFICADO**, **NÃO PÚBLICO**, **NÃO PESQUISADO** ou **DESCONHECIDO**.

**A pergunta que este documento responde:** quanto custa, de verdade, operar este sistema por mês e por
resposta coletada, quanto custou de uma vez, o que faz esse número deixar de ser zero, e a partir de que
ponto construir deixa de se justificar por dinheiro. Julgado, como tudo neste projeto, contra a restrição mais
dura: **ninguém vai manter o sistema depois de pronto.**

---

## 1. A resposta em cinco linhas, com o número

1. **A infraestrutura recorrente custa R$ 0,00 por mês**, e esse zero é a soma das dezesseis linhas da tabela da
   seção 2.1, todas dentro de plano gratuito com limite publicado: a cota mais apertada do sistema inteiro não é
   volume de dado, é **4 dos 5 Cron Triggers** do Cloudflare (`N22`), ou seja **80%** de uma cota que se conta
   em unidades.
2. **O desembolso único é NÃO VERIFICADO**, e continua sendo: o único valor 100% auditável do projeto é
   **44,50 EUR** de 5 licenças Fully Kiosk PLUS (`N14`); tablet em BRL é **NÃO VERIFICADO** (`N15`), suporte de
   mesa e estação de carregamento são **NÃO PESQUISADO** (`D5`), e o câmbio do dia é **NÃO VERIFICADO**.
3. **Contra a fatura atual de R$ 501 a R$ 1.000 por mês, a economia anual é de R$ 6.012 a R$ 12.000 (100%) no
   cenário realista**, e não cai abaixo de **46%** nem no pior cenário verificável (Supabase Pro mais Resend
   Pro, com o dólar na ponta alta das duas hipóteses declaradas).
4. **A alternativa pronta mais barata custa R$ 575,00 por ano à vista, equivalentes a R$ 47,92 por mês**, e ela
   é mais barata que o pior cenário deste sistema. Construir não se justifica por economia: se justifica pelo
   diferencial nº 1, satisfação cruzada com custo por prato, que nenhum fornecedor vende a nenhum preço.
5. **O custo que não é dinheiro é o único que não tem plano gratuito**: 40 a 80 horas de construção, número da
   Etapa 2 **nunca reestimado** contra o escopo da Etapa 4, mais **seis deveres humanos recorrentes**, dos
   quais quatro não têm alarme possível e nenhum tem dono nomeado até hoje.

---

## 2. Custo recorrente, componente por componente

### 2.1 Cenário realista

Uma linha por componente do diagrama da seção 2.1 de [`01-arquitetura.md`](01-arquitetura.md). A coluna do
percentual é a que importa, e ela está preenchida com número ou com **NÃO VERIFICADO**, nunca com adjetivo.

| Componente | Plataforma e plano | O que o gratuito dá | Consumo previsto | Percentual da cota | Custo mensal |
|---|---|---|---|---|---|
| Assets do PWA e do painel | **Cloudflare Pages Free** | `Requests to static assets are free and unlimited` e nenhuma cobrança de egress ou banda (texto oficial lido na Etapa 2). **500 builds por mês** | Requisição e banda: sem teto. Build: um por deploy | Requisição e banda: **sem cota a consumir**. Build: **NÃO VERIFICADO**, porque depende do ritmo de deploy, que não é número deste documento | **R$ 0,00** |
| Worker de escrita e Worker de rotina | **Cloudflare Workers Free** | **100.000 requisições por dia** e **10 ms de CPU por invocação** (`N22`) | **Cerca de 103 requisições por dia** no pico. A conta está em 2.2 | **0,05% a 0,10%.** A faixa existe porque se a invocação de Cron Trigger consome a mesma cota de requisição é **NÃO VERIFICADO** (lacuna registrada na Etapa 2) | **R$ 0,00** |
| CPU por invocação | **Cloudflare Workers Free** | **10 ms de CPU por invocação**, sem contar espera de entrada e saída (`N22`) | Nunca medido: não existe deploy | **NÃO VERIFICADO.** É a segunda cota que ninguém mediu, e é a razão de ADR-01 mandar agregar no Postgres e deixar o Worker só lendo o resultado | **R$ 0,00** |
| Agendamento das 5 rotinas | **Cloudflare Workers Cron Triggers** | **5 Cron Triggers por conta** (`N22`) | **4**, declarados em `wrangler.toml`: `*/30 * * * *`, `0 10 * * *`, `0 19 * * *`, `0 8 1 * *` | **80%.** É a cota mais apertada do sistema inteiro, e o quinto slot **não é para keep-alive** (ADR-10) | **R$ 0,00** |
| Banco, schema `experiencia` | **Supabase Free**, projeto `NFe e Financeiro`, `sa-east-1`, Postgres 17 | **500 MB de banco**, **pausa após 1 semana de inatividade**, **nenhum backup**, teto de **2 projetos ativos por organização já atingido** (`N21`) | **3,6 MB por ano**, 36 MB em 10 anos, pela estimativa da Etapa 2, que **não conta** os bytes do arquivo bruto do R3 | **7,2% em 10 anos**, com duas omissões nomeadas em 2.2. Com o R3 dentro, o número é **NÃO VERIFICADO** | **R$ 0,00** |
| Egress do banco | **Supabase Free** | **5 GB de egress mais 5 GB em cache** (lido na Etapa 2, não fixado na folha canônica) | O painel lê as views por REST direto do navegador, e ninguém mediu quanto isso pesa | **NÃO VERIFICADO** | **R$ 0,00** |
| Login do painel | **Supabase Auth Free** | **50.000 MAU** (lido na Etapa 2, não fixado na folha canônica) | **2 administradores com 2FA** | **0,004%.** É a cota mais folgada do projeto, por três ordens de grandeza | **R$ 0,00** |
| Tabelas de custo lidas | mesmo Postgres, schema `public`, **`SELECT` apenas** | Nenhuma cota própria: são as mesmas 500 MB e o mesmo egress | `vw_custo_prato` com `WITH RECURSIVE`, e no MVP ela nem é lida | **Nada adicional.** O schema `experiencia` nunca escreve nessas cinco tabelas (condição 1 de `D2`) | **R$ 0,00** |
| Digest das 16h e alerta de detrator | **Resend Free** | **100 e-mails por dia**, **3.000 por mês**, log de **30 dias** (`N23`) | **5 por dia** de digest (`N23`), mais um alerta por detrator | **5% a 13% do teto diário** e **5% a 12% do mensal.** A conta está em 2.2 | **R$ 0,00** |
| Classificação de comentário | **Groq**, `llama-3.1-8b-instant` | **14.400 requisições por dia** (`N24`) | **Cerca de 2 por dia, com teto de 10 em noite cheia** (`N01`) | **0,01% a 0,07%** | **R$ 0,00** |
| Redação do diagnóstico | **Groq**, `llama-3.3-70b-versatile` | **1.000 requisições por dia** (`N24`) | **1 por dia**, dentro de `cron_digest_16h` (`N02`) | **0,1%.** É o maior percentual das duas camadas de LLM, e `N03` continua verdadeiro: menos de 0,1% da cota diária | **R$ 0,00** |
| `backup_semanal` | **GitHub Actions**, repositório privado | **2.000 minutos por mês** (`N25`) | **Cerca de 30 minutos por mês**, em cerca de 8,7 execuções (duas por semana) | **1,5%** (`N25`) | **R$ 0,00** |
| Destino do backup | **Backblaze B2**, bucket privado | **Primeiros 10 GB sempre grátis**, chamadas de API classe A, B e C gratuitas, **sem cartão de crédito** (`N26`) | **16 objetos `.dump.age` simultâneos**, pelo lifecycle de 56 dias (`N12`). A divergência com `D7` está em 2.2 | **Até 5,6%** se cada dump pesar o banco inteiro do ano 10. Tamanho real do dump: **NÃO VERIFICADO** | **R$ 0,00** |
| Fonte do R3 | **Google Drive**, conta de serviço somente leitura em uma pasta | Cota da conta Google que o QT já usa | Um arquivo R3 por dia operacional, de dezenas de KB | **NÃO VERIFICADO.** A cota da conta não foi lida, e o arquivo é o mesmo que o proprietário já exporta | **R$ 0,00** |
| Endereço na internet | Subdomínio do domínio que o QT já tem | Registrador: **NÃO VERIFICADO** | Um subdomínio, mais SPF e DKIM | **Nenhuma cota nova.** A renovação anual do domínio é custo que já existe | **R$ 0,00 adicional** |
| Modo quiosque nos 5 tablets | **Fully Kiosk PLUS** | Licença de **pagamento único** por aparelho (`N14`) | 5 licenças, uma por aparelho | **Não é cota, é compra.** Entra na seção 3 | **R$ 0,00** |
| **Total recorrente** | | | | | **R$ 0,00 por mês** |

**A soma é zero e ela é honesta, mas a leitura útil não é o zero, é a coluna do percentual.** Nenhuma linha com
número passa de **13%**, que é o pior dia de e-mail, com uma única exceção: os **4 de 5 Cron Triggers**, que são
**80%**. Quatro linhas estão em **NÃO VERIFICADO** (CPU por invocação, egress do banco, cota do Drive e ritmo de
build), e são elas, não o volume, que sobrariam para medir. O risco de custo deste sistema não está no volume de
dado, que é ridiculamente pequeno, está em **contagem de peças**: Cron Trigger se conta em unidades, e é a única
cota do projeto que uma decisão de desenho consome de uma vez.

### 2.2 As quatro contas que este documento faz, escritas por extenso

Nenhuma delas está na folha canônica. Todas saem de números que estão nela, e por isso ficam explícitas, para
serem refeitas por quem discordar.

**Conta 1. Requisições ao Worker por dia, no pico.**

| Origem | Conta | Por dia |
|---|---|---|
| Envio de resposta pela fila | 200 respostas por mês no pico (`N39`) dividido por 26 dias abertos (`N38`) | 8 |
| Sinal de vida do aparelho (`F08`) | 5 aparelhos (`N13`) vezes 1 abertura mais 6 horas de serviço | 35 |
| Pacote de leitura do questionário (item ativo, pergunta, versão) | 5 aparelhos vezes 2, cacheado pelo service worker | 10 |
| Invocações das 4 rotinas | `watcher_drive` 48, `cron_classificador` 1, `cron_digest_16h` 1, `cron_retencao` 1 por mês | 50 |
| **Total** | | **103** |

103 dividido por 100.000 é **0,10%**. Sem as invocações de Cron Trigger, 53 dividido por 100.000 é **0,05%**.
A Etapa 2 escreveu 40 por dia e 0,04%; a diferença é o heartbeat dos cinco aparelhos, que `D5` criou depois
daquele número. **As duas leituras são da mesma ordem e nenhuma muda nenhuma decisão.** A leitura do painel
não entra nesta conta, porque ela vai direto ao Supabase por REST e não atravessa o Worker.

**Conta 2. Os 500 MB do banco, com as duas omissões que a estimativa da Etapa 2 tem.**

A estimativa de 3,6 MB por ano e 36 MB em 10 anos, que produz os 7,2% da tabela, deixa duas coisas de fora, e
as duas são consequência de decisão registrada:

1. **Os 500 MB não são nossos.** O schema `experiencia` vive dentro de `NFe e Financeiro` (`D2`), junto de
   `notas` (422 linhas), `itens_nota` (1.179), `historico_precos` (344), `insumos_master` (131) e as demais.
   **Quanto o schema fiscal ocupa hoje é NÃO VERIFICADO**, porque a inspeção leu estrutura e contagem de
   linha, nunca tamanho em disco. O percentual real do nosso consumo é maior que 7,2%, e por quanto é
   desconhecido.
2. **O arquivo bruto do R3 fica na linha de `execucao_importacao` e não tem poda no MVP** (ADR-12). O tamanho
   de um R3 é **NÃO VERIFICADO** (dezenas de KB). Premissa declarada, nunca fato: a 30 KB por arquivo, 312
   arquivos por ano dão cerca de **9,4 MB por ano**, que é **2,6 vezes** o crescimento estimado do resto do
   schema; em 10 anos são 94 MB, e somados aos 36 MB dão 130 MB, ou **26% dos 500 MB**, sem contar o fiscal.

**Consequência que fica escrita para não ser descoberta como surpresa:** a única linha do banco que cresce sem
poda é a de bytes de import, e ela cresce por dia operacional, não por resposta. Se algum dia os 500 MB
apertarem, a primeira migration a escrever é a de poda desses bytes, e ela custa R$ 0. Pagar Supabase Pro
antes de tentar isso seria pagar por não ter olhado.

**Conta 3. E-mails por dia e por mês.**

O digest usa **5 por dia** (`N23`), todo dia, inclusive segunda (`F28`), o que dá 150 por mês. O alerta de
detrator é um e-mail por resposta de nota 0 a 6 (`N30`). O teto lógico de alertas é o total de respostas do
dia, se todas fossem detratoras: 8 por dia no pico. Logo:

- Por dia: **5 a 13 de 100**, ou **5% a 13%**.
- Por mês: **150 a 350 de 3.000**, ou **5% a 12%**.
- No pior dia fisicamente possível desta casa, com as 20 mesas atendidas (`N38`) respondendo e todas
  detratoras: 25 de 100, ou **25%**.

**A proporção real de detratores é NÃO VERIFICADO**, e é por isso que a coluna traz faixa e não ponto.

**Conta 4. Quantos objetos existem no bucket, e a divergência que isso expõe.**

`D7` escreve `8 objetos simultâneos`. Com `backup_semanal` rodando **domingo e quarta** (duas por semana, `D7`
e seção 5.1 da folha canônica) e lifecycle de **56 dias** (`N12`), a conta é 56 dividido por 7, que dá 8
semanas, vezes 2 execuções por semana: **16 objetos**. A divergência é aritmética e não de decisão: `D7` vence
em tudo o que decide, e o número de objetos não é decisão dele. Como 16 objetos continuam sendo fração pequena
de 10 GB, **nenhuma decisão muda**, e a linha existe aqui para que ninguém dimensione retenção com o número
errado depois.

### 2.3 Cenário pessimista: cada plano gratuito estoura e vira pago

Antes da tabela, o fato que muda o sentido dela: **não existe cartão de crédito em nenhuma conta do sistema**
(seção 8 de [`01-arquitetura.md`](01-arquitetura.md)), e foi esse critério que tirou o Cloudflare R2 da disputa
em `D7`. Portanto **nada nesta tabela vira fatura sozinho**. Sem meio de pagamento, o plano gratuito **para**
em vez de cobrar: o job falha, a cota bloqueia, o projeto pausa. Cada linha abaixo é uma **decisão de pagar**
tomada por uma pessoa, não uma cobrança que chega.

| Componente | Gatilho que faria virar pago | Upgrade e preço | Fonte |
|---|---|---|---|
| **Supabase Free** | Estouro dos 500 MB, restrição de uso da organização depois do período de graça, ou a decisão de ter backup gerenciado em vez de dump próprio | **Supabase Pro, US$ 25 por mês** | **Página oficial lida na Etapa 2 e confirmada pelo verificador adversarial**, e citada como oficial na feature `F53`. **Não relida nesta sessão.** O que este upgrade compra também cobre o sistema fiscal, porque os dois vivem no mesmo projeto |
| **Resend Free** | Teto de 100 por dia ou 3.000 por mês estourado, o que só acontece se entrar disparo de campanha por e-mail para a base de clientes, que é Fase 2 | **Resend Pro, US$ 20 por mês** para 50.000 e-mails | **Página oficial lida na Etapa 2.** Não relida nesta sessão |
| **Cloudflare Workers Free** | Os 10 ms de CPU virarem limitação real, ou uma sexta rotina precisar do quinto Cron Trigger e de mais | **NÃO VERIFICADO** | Preço **NÃO EXTRAÍDO** na Etapa 2. Precisa de cotação antes de entrar em qualquer orçamento |
| **Cloudflare Pages Free** | 500 builds por mês estourados numa semana de muitos deploys | **NÃO VERIFICADO** | Nenhuma página de preço de Pages foi lida em nenhuma etapa |
| **Groq** | Fim ou mudança do free tier, **e** a degradação sem IA se provar insuficiente | **NÃO VERIFICADO.** Preço por token **NÃO EXTRAÍDO** | Lacuna registrada na Etapa 2. A camada de degradação sem IA custa **R$ 0** e é o que torna este upgrade opcional por desenho (ADR-07) |
| **GitHub Actions** | 2.000 minutos por mês estourados, o que exigiria multiplicar o backup por 66 | **NÃO VERIFICADO** | Preço de minuto adicional não lido em nenhuma etapa |
| **Backblaze B2** | Passar de 10 GB, o que exigiria 16 dumps de mais de 640 MB cada | **NÃO VERIFICADO** | Só o gratuito foi lido: `First 10GB storage is always free` e chamadas A, B e C gratuitas (`N26`, `D7`) |
| **Supabase Auth** | Passar de 50.000 MAU, com 2 administradores cadastrados | **NÃO VERIFICADO** | Preço de MAU adicional não lido. Gatilho irreal por 4 ordens de grandeza |
| **Google Drive** | Cota da conta Google estourada pelo acúmulo de arquivos R3 | **NÃO VERIFICADO** | Nem a cota nem o preço foram lidos em nenhuma etapa |
| **VPS**, se abandonar serverless | Decisão de trocar o desenho por ferramenta autohospedada, que a Etapa 2 já reprovou | **R$ 30 a R$ 60 por mês**, **estimativa e não preço lido** | **NÃO VERIFICADO** como preço de página oficial. Fora do desenho: seção 8 de `01-arquitetura.md` proíbe terceira plataforma de execução |
| **Total pessimista verificável** | Supabase Pro mais Resend Pro | **US$ 45 por mês**, ou **US$ 540 por ano** | Os dois únicos preços de upgrade com página oficial lida em qualquer etapa deste projeto |

**A conversão para reais, com o câmbio declarado como hipótese porque ele é NÃO VERIFICADO:** US$ 540 por ano
a **R$ 5,00 por dólar** são **R$ 2.700 por ano**, ou **R$ 225,00 por mês**; a **R$ 6,00 por dólar** são
**R$ 3.240 por ano**, ou **R$ 270,00 por mês**. As duas pontas ficam escritas porque escolher uma seria
inventar câmbio.

---

## 3. Custo único

| Item | Quantidade | Valor unitário | Valor total | Situação do número |
|---|---|---|---|---|
| Tablet Android, 11", 4 GB de RAM, 64 GB, Android 13 ou superior | **5** (4 em uso, 1 de reserva, `N13` e `D5`) | **NÃO VERIFICADO em BRL** (`N15`) | **NÃO VERIFICADO em BRL** | Cotar no ato. Única referência independente: cerca de **180 EUR por unidade**, que dariam 900 EUR nos cinco. **Referência, não preço.** A compra em viagem ao Paraguai, que o briefing prevê, muda a conta e **não foi pesquisada** |
| Licença Fully Kiosk PLUS, pagamento único por aparelho | **5** (`N14`) | **8,90 EUR** | **44,50 EUR** | **Oficial.** É o único valor de hardware 100% auditável do projeto, e o único subtotal desta tabela que existe como número |
| Suporte de mesa com chave e cabo de segurança | **4** (`D5`) | **NÃO PESQUISADO** | **NÃO PESQUISADO** | Quatro e não cinco, porque o de reserva não fica fixo em mesa. Tablet solto em salão pede fixação física, e o suporte do fornecedor atual tem página dedicada a tablet furtado |
| Estação de carregamento de cinco portas | **1** (`D5`) | **NÃO PESQUISADO** | **NÃO PESQUISADO** | Exigida porque carregar cinco aparelhos entra na rotina de fechamento de caixa, e aparelho descarregado é indistinguível de aparelho quebrado sem heartbeat por dispositivo |
| Horas de construção | **40 a 80** | **Sem valor em reais** | **Sem valor em reais** | Estimativa da Etapa 2, **nunca reestimada** contra o escopo da Etapa 4. O briefing não declara preço para a hora de quem constrói, e ele não vai ser inventado aqui. Detalhe na seção 9 |
| **Total do desembolso único** | | | **NÃO VERIFICADO** | Três das cinco linhas não têm número, e a única que tem está em euro, com câmbio **NÃO VERIFICADO**. **Escrever um total em reais aqui seria inventar preço** |

**Duas leituras que esta tabela obriga a fazer:**

1. **O custo único é o oposto do recorrente em confiabilidade.** O recorrente é R$ 0,00 com fonte oficial em
   cada camada. O único é desconhecido em quase todas as linhas, e é ele que decide o tempo de retorno da
   seção 4. Enquanto o proprietário não cotar, **o projeto tem custo recorrente conhecido e custo de entrada
   desconhecido**, que é exatamente o inverso do que a intuição espera.
2. **O tablet não é desembolso único de verdade, é reposição.** A Etapa 2 registra troca a cada **2 a 3 anos**,
   porque WebView de aparelho de entrada envelhece e quebra o formulário. Isso não é mensalidade e não entra na
   tabela recorrente, mas no horizonte de 10 anos são de 3 a 5 rodadas de compra, com preço **NÃO VERIFICADO**
   em todas. **O custo zero é zero de infraestrutura, nunca de hardware.**

---

## 4. Contra a fatura atual, nas duas pontas

A fatura atual é de **R$ 501 a R$ 1.000 por mês, sem fidelidade e sem multa** (briefing, e registrado na
seção 7 da folha canônica como referência externa).

**As duas contas de base, explícitas:** R$ 501 vezes 12 são **R$ 6.012 por ano**. R$ 1.000 vezes 12 são
**R$ 12.000 por ano**.

| Cenário do sistema próprio | Custo mensal | Custo anual | Economia contra R$ 6.012 | Economia contra R$ 12.000 |
|---|---|---|---|---|
| **Realista** | **R$ 0,00** | **R$ 0** | **R$ 6.012**, ou **100%** | **R$ 12.000**, ou **100%** |
| **Pessimista a R$ 5,00 por dólar** | R$ 225,00 | R$ 2.700 | **R$ 3.312**, ou **55%** | **R$ 9.300**, ou **77,5%** |
| **Pessimista a R$ 6,00 por dólar** | R$ 270,00 | R$ 3.240 | **R$ 2.772**, ou **46%** | **R$ 8.760**, ou **73%** |

**As contas, uma por uma:** 6.012 menos 2.700 são 3.312, e 3.312 dividido por 6.012 é 0,551, ou 55%. 6.012
menos 3.240 são 2.772, e 2.772 dividido por 6.012 é 0,461, ou 46%. 12.000 menos 2.700 são 9.300, e 9.300
dividido por 12.000 é 0,775, ou 77,5%. 12.000 menos 3.240 são 8.760, e 8.760 dividido por 12.000 é 0,730, ou
73%. A Etapa 2 arredondou 77,5% para 78%; o valor exato é 77,5% e é ele que vale aqui.

**A leitura que importa é a linha de baixo:** mesmo se os dois únicos upgrades verificáveis do projeto virarem
necessários, e com o dólar na ponta alta das duas hipóteses, **a economia não cai abaixo de 46%**. No cenário
realista, que é o que as dezesseis linhas da seção 2.1 sustentam, ela é de 100%.

### 4.1 Tempo de retorno do hardware

**A fórmula é uma só:** `retorno em meses = desembolso único ÷ economia mensal`.

O numerador é **NÃO VERIFICADO** (seção 3), então **não existe um número de retorno para este projeto hoje**, e
escrever um seria retórica com cara de prova. O que existe é a sensibilidade, e ela se lê ao contrário: **cada
R$ 501 de desembolso único é um mês de retorno no piso da fatura, e cada R$ 1.000 é um mês no teto.**

| Desembolso único, **hipótese e não cotação** | Retorno contra R$ 501 por mês | Retorno contra R$ 1.000 por mês |
|---|---|---|
| R$ 3.000 | **6,0 meses** | **3,0 meses** |
| R$ 5.000 | **10,0 meses** | **5,0 meses** |
| R$ 7.000 | **14,0 meses** | **7,0 meses** |

**Nenhum dos três valores da primeira coluna é preço lido em lugar nenhum.** São hipóteses para ler a
sensibilidade, e a linha da esquerda se apaga no dia em que a cotação existir.

Duas honestidades que vêm junto:

- **No cenário pessimista o retorno é bem mais lento**, porque a economia mensal encolhe: R$ 501 menos
  R$ 270 são R$ 231 por mês, e o mesmo desembolso hipotético de R$ 5.000 levaria **21,6 meses** para voltar
  (5.000 dividido por 231). Contra o teto de R$ 1.000, a economia mensal é de R$ 730 e o retorno é de
  **6,8 meses**.
- **A Etapa 2 afirmou que o hardware se paga dentro do primeiro trimestre.** Aquela conta era de **2 tablets**,
  antes de `D5`. Com 5 tablets, 5 licenças, 4 suportes e 1 estação de carregamento, a afirmação **nunca foi
  reconferida** e passa a ser **NÃO VERIFICADO**. Ela não é repetida neste documento.

### 4.2 A parte da economia que não é mérito do sistema

O fornecedor atual publica piso de **R$ 200 por mês com tablet** e **R$ 150 por mês só QR Code** (páginas
oficiais lidas na Etapa 2, com citação literal). A fatura de R$ 501 a R$ 1.000 é, portanto, de **2,5 a 5 vezes
o preço de entrada divulgado pelo próprio fornecedor**, e o verificador adversarial registrou a ressalva
correta: o piso é de escopo diferente (só QR), então a comparação não é de igual para igual sem a proposta
comercial item por item, que é a entrega **Pedir a proposta comercial atual, item por item**, na M1.

**A consequência é desconfortável e fica escrita:** parte da economia de R$ 6.012 a R$ 12.000 por ano não é
mérito de construir nada, é o custo de nunca ter renegociado um contrato sem multa. Uma conversa com o
fornecedor poderia capturar parte disso em uma tarde, sem uma linha de código. **Isso não muda a decisão de
construir, e muda o que se pode honestamente atribuir a ela.**

---

## 5. Contra a alternativa pronta mais barata

**O número, sem esconder:** a alternativa de mercado publica **R$ 575,00 por ano à vista, equivalentes a
R$ 47,92 por mês** (Avalio Starter, com API REST inclusa; seção 7 da folha canônica). A conta é 575 dividido
por 12, que dá 47,9166, arredondado para R$ 47,92. Qualquer preço parcelado atribuído a esse fornecedor está
**refutado** e não se reproduz aqui (seção 9.4 da folha canônica).

| Comparação | Por mês | Por ano |
|---|---|---|
| Sistema próprio, cenário realista | R$ 0,00 | R$ 0 |
| **Alternativa pronta mais barata** | **R$ 47,92** | **R$ 575,00** |
| Sistema próprio, pessimista a R$ 5,00 por dólar | R$ 225,00 | R$ 2.700 |
| Sistema próprio, pessimista a R$ 6,00 por dólar | R$ 270,00 | R$ 3.240 |

**As três leituras que esta tabela produz, e a terceira é a que dói:**

1. **Contra a alternativa pronta, o ganho recorrente é de R$ 575,00 por ano**, o que dá **cerca de R$ 1,58 por
   dia** (575 dividido por 365). Essa é a régua honesta do projeto, e ela vale **do segundo ano em diante**,
   porque no primeiro ano o desembolso único ainda não se pagou e ele é **NÃO VERIFICADO**.
2. **As 40 a 80 horas de construção nunca voltam em dinheiro por esta conta.** A R$ 1,58 por dia, o ganho
   recorrente contra a alternativa pronta não paga hora nenhuma: ele paga a diferença de mensalidade e nada
   mais. As horas são preço de entrada, e o único jeito de elas se pagarem é o sistema durar anos.
3. **No cenário pessimista, o sistema próprio é mais caro que a alternativa pronta.** R$ 225,00 dividido por
   R$ 47,92 é **4,7 vezes**; R$ 270,00 dividido por R$ 47,92 é **5,6 vezes**. Se os dois upgrades virarem
   necessários, a infraestrutura própria custa de 4,7 a 5,6 vezes o que custa comprar pronto. **Este número
   não é escondido em nenhuma linha deste documento, e ele é o argumento mais forte contra construir.**

### 5.1 Então por que construir, se não é economia

Porque a razão nunca foi o preço, e três coisas sustentam isso sem depender de nenhum fornecedor errar:

| Razão | O que ela é | Por que a alternativa pronta não entrega |
|---|---|---|
| **Diferencial nº 1: satisfação cruzada com custo por prato** | `vw_custo_prato` com `WITH RECURSIVE` lendo `pratos`, `prato_ingredientes`, `insumos_master`, `historico_precos` e `producao_ingredientes` no mesmo Postgres, a um `JOIN` de distância (`D2`, ADR-04) | **Nenhum fornecedor vende isso a nenhum preço**, porque nenhum tem acesso ao custo de insumo do cliente. Não é vantagem de preço, é vantagem de posse do dado |
| **Critério de sucesso nº 4: unificar os dados** | Satisfação, venda do R3, custo e ficha técnica no mesmo banco, sem rotina de sincronização | A dor declarada no briefing é o dado ficar numa ilha. Comprar pronto compra outra ilha, mais barata |
| **O corte do dia operacional às 6h** | `fn_dia_operacional`, uma definição só, com a coluna gerada em `resposta` (seção 4 da folha canônica) | O fornecedor atual publica que o relatório dele fecha às 23:59 enquanto o contador do tablet zera às 7:00. Numa casa que fecha depois da meia-noite isso corrompe a série toda noite, e nenhum plano pago conserta o corte de quem vende |

**A honestidade que fecha a seção, e ela puxa nos dois sentidos.** A favor de construir: se a alternativa a
R$ 575 por ano também for operada com tablet em mesa, o hardware aparece nos dois lados da conta, e o que sobra
de exclusivo do caminho próprio são as licenças e as horas. **Se aquele plano inclui algum hardware é NÃO
VERIFICADO.** Contra construir: a única das três razões acima que se prova em reais é a primeira, e ela é a
**última** a entrar, na entrega **Preencher `pratos` e `prato_ingredientes`**, na M3, que é trabalho humano de
ficha técnica sem substituto técnico. **Enquanto essa entrega não existir, o sistema próprio é, em dinheiro,
uma alternativa mais cara e mais trabalhosa de fazer o que R$ 47,92 por mês já fazem.**

---

## 6. Custo por resposta coletada

Três cenários vezes três volumes. O volume de hoje é de **50 a 200 respostas por mês** e a meta é **150 por
mês** (`N39`). Todas as células são o custo mensal dividido pelo número de respostas do mês.

| Cenário | Custo mensal | 50 respostas | 150 respostas (meta) | 200 respostas |
|---|---|---|---|---|
| **Realista** | R$ 0,00 | **R$ 0,00** | **R$ 0,00** | **R$ 0,00** |
| **Pessimista a R$ 5,00 por dólar** | R$ 225,00 | **R$ 4,50** | **R$ 1,50** | **R$ 1,13** |
| **Pessimista a R$ 6,00 por dólar** | R$ 270,00 | **R$ 5,40** | **R$ 1,80** | **R$ 1,35** |
| *Referência: fatura atual no piso* | R$ 501,00 | R$ 10,02 | R$ 3,34 | R$ 2,51 |
| *Referência: fatura atual no teto* | R$ 1.000,00 | R$ 20,00 | R$ 6,67 | R$ 5,00 |
| *Referência: alternativa pronta mais barata* | R$ 47,92 | R$ 0,96 | R$ 0,32 | R$ 0,24 |

**As contas das duas linhas que mais importam:** 225 dividido por 150 é R$ 1,50, e 225 dividido por 200 é
R$ 1,125, arredondado para R$ 1,13. 501 dividido por 200 é R$ 2,505, arredondado para R$ 2,51, e 1.000 dividido
por 50 é R$ 20,00. **A fatura atual custa de R$ 2,51 a R$ 20,00 por resposta coletada**, e é esse intervalo que
o projeto existe para acabar.

**Três avisos que impedem esta tabela de mentir:**

1. **O R$ 0,00 por resposta é verdadeiro só para infraestrutura, e só do segundo ano em diante.** Com o
   desembolso único **NÃO VERIFICADO**, **o custo por resposta do primeiro ano não pode ser calculado**. A
   fórmula é `(desembolso único ÷ respostas do ano) + custo recorrente por resposta`, e o primeiro termo não
   tem numerador.
2. **A alternativa pronta é mais barata por resposta que o cenário pessimista em todos os três volumes.**
   R$ 0,32 contra R$ 1,50 na meta. Está na tabela de propósito.
3. **Custo por resposta cai com volume e isso favorece quem coleta mais**, que é exatamente o contrário do
   modelo de cobrança por resposta. Se um dia o sistema for cedido a amigos do setor, a régua registrada na
   pesquisa é cobrar por ponto de coleta e **nunca por volume de resposta**, porque cobrar por resposta pune o
   critério de sucesso nº 2.

---

## 7. O que ameaça o custo zero

O custo zero não é um estado que se alcança, é uma condição que se mantém. A coluna do custo traz número onde
existe número, e **NÃO VERIFICADO** onde não existe.

| Gatilho | Probabilidade | Quanto custaria | Mitigação |
|---|---|---|---|
| **Pausa do Supabase por 1 semana de inatividade** (`N21`) | **Alta.** É comportamento documentado, não acidente | **R$ 0 em dinheiro.** Custa uma intervenção manual num sistema que ninguém mantém, mais o painel, o digest e as rotinas fora do ar. A coleta sobrevive na fila local | `backup_semanal` duas vezes por semana antes do digest existir, e o `cron_digest_16h` depois (ADR-10). **Nenhuma rotina só de ping**, e o quinto Cron Trigger não é para isso |
| **Estouro dos 500 MB do banco**, com o arquivo bruto do R3 sem poda e o schema fiscal no mesmo teto | **Média no horizonte de 10 anos**, **NÃO VERIFICADO** no de 1 ano, porque o tamanho do R3 e o do fiscal são desconhecidos | **US$ 25 por mês** se a resposta for pagar. **R$ 0** se a resposta for uma migration de poda dos bytes de `execucao_importacao` | Escrever a poda antes de pagar. O tamanho do schema é candidato natural a linha do digest, e hoje não existe nenhuma |
| **Restrição de uso da organização, com HTTP 402 em toda a API** (ADR-02) | **Média** | **US$ 25 por mês**, e o custo que não é dinheiro é pior: **o sistema fiscal cai junto**, porque a restrição vale para todos os projetos da organização | Papel sem escrita fora do schema, RLS em todas as tabelas, e consumo da pesquisa visível no digest em vez de descoberto num 402 |
| **Teto de 2 projetos ativos por organização** (`N21`) | **Certa: já está atingido** | **R$ 0**, e custa um slot: criar projeto novo obriga a pausar outro | Pausar `qt-avaliacoes` depois de conferidas as 74 linhas (condição 4 de `D2`), e **não criar projeto de teste** (seção 7.1 de `01-arquitetura.md`) |
| **Uma sexta rotina precisar do quinto Cron Trigger** (`N22`, 4 de 5 em uso) | **Média.** É a pressão mais natural de um sistema que vai crescer | **NÃO VERIFICADO** (Workers Paid) | A folha canônica declara que **não existe sexta rotina**, e que uma sexta entra na folha antes de existir em código (seção 5.2) |
| **Os 10 ms de CPU por invocação virarem limitação real** (`N22`) | **Média**, se alguém agregar em memória no Worker | **NÃO VERIFICADO** (Workers Paid) | ADR-01: agregar no Postgres, em view, e deixar o Worker só lendo o resultado. As 25 views existem para isso |
| **Teto de e-mail do Resend estourado** (`N23`) | **Baixa no MVP.** Alta se entrar campanha por e-mail, que é Fase 2 | **US$ 20 por mês** | Campanha fora do MVP; alerta só para nota 0 a 6 (`N30`); digest com 5 por dia e folga de 20 vezes |
| **Mudança de política de free tier de LLM** (ADR-07) | **Alta.** Já ocorreu no mercado: a Google retirou os números de cota da documentação pública | **R$ 0** na degradação sem IA, que entrega o digest com os oito blocos e o comentário sem categoria. Tier pago: **NÃO VERIFICADO** | Módulo único com prompt, chamada e parser num lugar só, com `provedor`, `modelo` e `versao_prompt` em `configuracao`, mais modo de resposta fixa |
| **Mudança de política de free tier de qualquer outra camada** | **Alta no horizonte de 10 anos**, para o conjunto | **NÃO VERIFICADO** em todas as camadas menos duas | Duas plataformas de execução e não mais que duas; nenhum cartão em nenhuma conta, para o pior caso ser o serviço parar e não a fatura crescer |
| **Cota do GitHub Actions estourada** (`N25`, consumo de 1,5%) | **Baixa.** Exigiria multiplicar o backup por 66 | **NÃO VERIFICADO** | Uma rotina só no Actions, com a versão do cliente Postgres fixada no workflow |
| **Passar de 10 GB no Backblaze B2** (`N26`) | **Baixa.** Exigiria 16 dumps de mais de 640 MB | **NÃO VERIFICADO** | Lifecycle de 56 dias mais 1 (`N12`), que mantém 16 objetos e não 500 |
| **Cartão de crédito cadastrado por descuido, com recarga automática** | **Média**, porque depende de descuido humano e não de cota | **DESCONHECIDO**, e é a única linha desta tabela sem teto | Regra escrita: **nenhum cartão de crédito em conta nenhuma do sistema** (seção 8 de `01-arquitetura.md`). É o critério que tirou o Cloudflare R2 da disputa |
| **Crescimento do volume de respostas** | **Certa, e é o objetivo do projeto.** Hoje 50 a 200, meta 150 (`N39`) | **R$ 0** até cerca de **2.470 respostas por mês**. A conta está na seção 8 | Nenhuma mitigação necessária. A cota que aperta primeiro é o e-mail, e o que escala com o volume é o alerta de detrator, não o digest |
| **Reposição dos tablets a cada 2 a 3 anos** | **Certa** | **NÃO VERIFICADO**, 5 aparelhos por rodada, de 3 a 5 rodadas em 10 anos | 1 de reserva já comprado, suporte com chave nos pontos fixos, e a regra escrita de guarda dos que circulam (`D5`) |
| **Fully Kiosk PLUS trocar licença única por assinatura** | **DESCONHECIDO** | **NÃO VERIFICADO**, e se afetaria licença já comprada também é **NÃO VERIFICADO** | Nenhuma. O que existe é o registro de que a licença comprada é de pagamento único (`N14`), e a fixação de tela nativa do Android como caminho degradado, sem reabertura automática após reboot |
| **Ceder o sistema a amigos do setor**, que o briefing admite no máximo | **Declarada como possível pelo proprietário** | **Multiplica consumo por casa, e duas cotas quebram na primeira casa cedida.** Detalhe abaixo | **Uma casa é uma casa.** Cada casa cedida é outro projeto, com conta, organização e deploy próprios, e nunca uma coluna a mais neste |

### 7.1 O caso de ceder a amigos do setor, com as contas

É a única ameaça da tabela que não é de fornecedor nem de descuido, é de escopo, e ela merece as contas
escritas porque a intuição erra aqui.

| O que multiplica | Conta | Quebra na casa número |
|---|---|---|
| **Cron Triggers** | 4 por casa (`N22`), contra **5 por conta** | **2.** Duas casas pedem 8 triggers, e 8 é maior que 5 |
| **Projetos Supabase ativos** | 1 por casa, contra **2 por organização, já atingido** (`N21`) | **2**, e na verdade já na primeira: não existe slot livre hoje |
| **Restrição de uso em cascata** | Um estouro de qualquer casa devolve **HTTP 402 em todos os projetos da organização** | **2, se dividirem organização.** O estouro de um amigo derrubaria o **sistema fiscal do QT** |
| **E-mails do Resend** | 5 por dia de digest por casa, contra 100 por dia e 3.000 por mês (`N23`) | Cerca de **20**, e é a única cota que aguenta |
| **Deploy e migration** | 1 por casa, sem multi-tenant no desenho (seção 8 de `01-arquitetura.md`) | **2.** Cada casa é um deploy a mais para esquecer atualizado |
| **Deveres humanos recorrentes** | 6 por casa (seção 9) | **2.** Doze deveres sem dono não são o dobro do problema, são outro problema |
| **Responsabilidade sob LGPD** | Operar dado pessoal de cliente de outra empresa | **2.** A seção 1.2 de [`03-seguranca-e-lgpd.md`](03-seguranca-e-lgpd.md) declara que este é o único gatilho para reabrir o modelo de ameaça inteiro |

**A conclusão, e ela é simples:** ceder o sistema não é uma decisão de custo, é uma decisão de escopo que
quebra o desenho em dois lugares na primeira casa. **Ceder de graça a um amigo custa, no mínimo, uma conta
Cloudflare nova, uma organização Supabase nova e um dono nomeado para seis deveres.** Nada disso é dinheiro, e
tudo isso é caro.

---

## 8. O ponto em que o custo zero deixa de valer a pena

Três números, e eles respondem coisas diferentes.

### 8.1 Por volume de respostas: cerca de 2.470 por mês, e esta casa não chega lá

A cota que aperta primeiro com o volume é o e-mail, porque o alerta de detrator é o único envio que escala com
a resposta. A conta, por extenso:

- Teto diário do Resend: **100 e-mails por dia** (`N23`). O digest consome **5**. Sobram **95** para alerta.
- 95 alertas por dia vezes **26 dias abertos** por mês (`N38`) dão **2.470 respostas por mês**, no cenário mais
  conservador possível, em que **toda** resposta é detratora.
- Pelo teto mensal: 3.000 menos 150 de digest dão 2.850. Logo **o teto diário aperta primeiro**, e o número é
  **2.470**.

**E aqui está a parte que fecha o assunto:** a casa tem **22 mesas** e atende **até 20 mesas por dia**, cerca de
**520 mesas por mês** (`N38`). Se **toda** mesa respondesse **toda** noite, seriam 520 respostas por mês.
**2.470 dividido por 520 é 4,75.** O limite da cota gratuita fica **4,75 vezes acima do máximo físico desta
casa**, com toda resposta sendo detratora. Portanto, com uma unidade, **o volume de respostas nunca quebra o
custo zero**, e a meta de 150 por mês (`N39`) usa 6% do que a cota permite.

### 8.2 Por unidade: a partir da segunda

**O custo zero deixa de valer a partir de 2 unidades**, e a razão não é volume nenhum: é contagem de peças.
Duas casas pedem 8 Cron Triggers contra 5 por conta (`N22`), e 2 projetos Supabase ativos onde o teto de 2 já
está atingido (`N21`). **A segunda casa é o ponto de ruptura, não a décima**, e a seção 7.1 tem as sete contas.

### 8.3 Por dinheiro: quando os dois upgrades verificáveis virarem necessários

No dia em que Supabase Pro e Resend Pro forem os dois necessários, a infraestrutura própria passa a custar
**R$ 225,00 a R$ 270,00 por mês**, que é **4,7 a 5,6 vezes** a alternativa pronta mais barata (R$ 47,92 por
mês). **Nesse ponto, o único argumento que sobra para o sistema próprio é o diferencial nº 1**, e se a entrega
**Preencher `pratos` e `prato_ingredientes`**, na M3, não estiver feita, não sobra argumento nenhum.

### 8.4 O ponto que não tem número, e é o que decide de verdade

Nenhum dos três acima é o gatilho mais provável. **O custo zero deixa de valer a pena no dia em que os seis
deveres humanos recorrentes não tiverem dono nomeado**, porque aí o sistema segue rodando de graça e para de
produzir os números pelos quais foi construído: a conversão sobre mesas atendidas morre, o cruzamento com
faturamento morre, e a referência externa trimestral morre. **Manter de graça um sistema que não produz mais
nada é o pior negócio deste documento**, e é o único que não aparece em nenhuma cota.

---

## 9. O custo que não é dinheiro

### 9.1 As horas de construção

**40 a 80 horas**, número da Etapa 2, e ele precisa de três ressalvas para não ser lido como orçamento:

1. **Nunca foi reestimado contra o escopo da Etapa 4.** Aquele número foi escrito para um sistema menor. O que
   está desenhado hoje são **26 tabelas**, **25 views**, **5 funções**, **5 rotinas em duas plataformas**,
   **12 ADRs**, um PWA de 8 telas em dois idiomas, um painel de 7 telas e a camada de LGPD inteira. O que já
   existe no repositório, medido agora: **10.154 linhas** em `src/`, `worker/`, `tests/` e
   `supabase/migrations/`, com **118 testes** passando em 7 arquivos, e **14 migrations** ainda inertes.
   **A estimativa de 40 a 80 horas está NÃO VERIFICADA contra esse escopo.**
2. **Não tem valor em reais, e não vai ter.** O briefing não declara preço para a hora de quem constrói, e
   inventar um seria o mesmo erro dos preços refutados da seção 9.4 da folha canônica.
3. **Elas não voltam por nenhuma conta deste documento.** A régua da seção 5 é de R$ 1,58 por dia contra a
   alternativa pronta, e isso não paga hora nenhuma. As horas se pagam apenas se o sistema durar anos, o que
   depende inteiramente de a restrição "ninguém vai manter" ser premissa ou ficção.

### 9.2 Os seis deveres humanos recorrentes

Eram sete até `D3`, que tirou a leitura semanal do Portal do Parceiro do iFood. **A coluna do dono é proposta,
não decidida:** quem executa cada uma, com nome, é a pendência mais grave da seção 11 da folha canônica.

| Dever | Frequência | Dono proposto | Tem alarme? | O que morre se ninguém fizer |
|---|---|---|---|---|
| Exportar o R3 para a pasta do Drive | **Diária** | Proprietário, na mesma rotina de análise de CMV. O hábito já existir é **NÃO VERIFICADO** | **Sim.** Arquivo ausente por 2 dias operacionais vira linha de cobrança no digest (`N43`) | O bloco 7 do digest e o cruzamento satisfação com faturamento, que é o terceiro obrigatório do MVP |
| Informar `mesa_atendida_dia` | **Diária** | Gerente de turno, no fechamento do caixa | **Sim.** Campo vazio por 3 dias vira cobrança no digest (`N43`) | A conversão sobre mesas atendidas. Sem denominador, "coletar mais que hoje" deixa de ser mensurável, e esse é o critério de sucesso nº 2 |
| Trocar as 2 a 4 perguntas em foco | **Mensal** | Proprietário, na tela de administração, sem deploy | **Não** | O banco rotacionado congela, as impressões deixam de se concentrar e a pesquisa para de se renovar. É a mais fácil de deixar cair |
| Anotar a nota de 4 pizzarias comparáveis no Google | **Trimestral** | Proprietário ou gerência | **Não** | A única referência externa do projeto, já que não existe benchmark de NPS de pizzaria verificável |
| Testar a restauração do dump em banco vazio | **Uma vez antes do go-live é piso, uma por trimestre é o recomendado por cima** (divergência declarada de propósito) | Proprietário ou o segundo administrador | **Não.** É a única falha do sistema sem sintoma antes da hora em que ela importa | A garantia de que existe backup. Sem a chave privada `age`, **nenhum backup é recuperável** |
| Manter a ficha técnica atualizada, na entrega **Preencher `pratos` e `prato_ingredientes`**, na M3 | **Contínua**, a cada mudança de receita ou de preço | Proprietário, nas skills, onde a ficha técnica vive por instrução do briefing | **Não** | O diferencial nº 1 passa a cruzar satisfação com custo velho, o que é **pior** que não cruzar, porque tem aparência de número certo (`N46`) |

**Duas leituras honestas, e as duas incomodam.** A primeira: **quatro dos seis deveres não têm alarme
possível**, e só os dois diários entram no digest como cobrança, porque só eles produzem um sinal que o sistema
consegue observar. A segunda: **o sistema roda sozinho, o painel completo não.** O que sobrevive sem nenhum dos
seis é a coleta, o alerta ao gerente, a distribuição em três faixas, o corte por garçom e o e-mail das 16h. O
que morre é exatamente a parte que justifica ter construído.

**A frase que resume o documento inteiro:** a infraestrutura deste sistema custa R$ 0,00 por mês e isso é
verificável camada por camada. **O que ele custa de verdade é atenção humana recorrente, e para atenção humana
não existe plano gratuito.**

---

## 10. Onde este documento e o código já escrito divergem

Três divergências, e em todas o efeito sobre o custo é **nenhum**. Ficam registradas porque descobrir depois
custa mais que escrever agora.

| Divergência | O que o documento diz | O que o código faz | Quem está errado, e por que | Efeito no custo |
|---|---|---|---|---|
| **Dois Workers ou um** | A seção 2.1 de [`01-arquitetura.md`](01-arquitetura.md) declara **dois Workers**, escrita e rotina, para que deploy de rotina não derrube o caminho da resposta | `wrangler.toml` declara **um** Worker, `qt-experiencia`, com `main = "worker/index.ts"` e os 4 crons juntos | **O código está incompleto, não errado no destino.** O documento é o desenho de registro, deu a razão e é nível 5 da precedência; a separação ainda não foi feita. Cabe cindir o `wrangler.toml` em dois antes do go-live | **Nenhum.** O próprio `01-arquitetura.md` declara que **nos dois arranjos o consumo é de 4 dos 5 Cron Triggers**, e requisição de Worker é cota de conta, não de deploy |
| **Motor de formulário e biblioteca de gráfico** | A stack da Etapa 2 recomenda **SurveyJS Form Library** e **Recharts**, as duas MIT | `package.json` tem só `react`, `react-dom` e `@supabase/supabase-js`. `src/coleta/questionario.ts` implementa o questionário à mão, com `proximoPasso`, `sorteiaPerguntas` e `BANCO_PERGUNTAS` | **O código está certo.** A Etapa 2 é o nível **8**, o mais fraco da precedência; o questionário da folha canônica tem texto fixo nos dois idiomas e o sorteio vive em `fn_sorteia_pergunta`, no banco, então um motor genérico adicionaria dependência sem remover trabalho | **Nenhum.** As duas bibliotecas são MIT e custam R$ 0. Se Recharts entrar para o painel, a folha de custo continua igual |
| **Contagem de testes do dia operacional** | O pedido que originou este documento cita **21 testes** em `src/comum/dia-operacional.ts` | `tests/dia-operacional.test.ts` tem **17 testes**, conferidos rodando `vitest` agora. A suíte inteira tem **118** | **O número 21 está errado**, e nenhum documento do repositório o afirma. O fato é o resultado da execução | **Nenhum** |

**O que não diverge, e vale dizer:** `src/comum/dominio.ts` transcreve as listas fechadas da seção 3.3 da
folha canônica sem inventar valor, e isso tem consequência de custo direta, porque **o classificador não pode
criar valor novo** e portanto não existe caminho pelo qual o consumo de LLM cresça por categoria nova.
`src/comum/dia-operacional.ts` espelha `fn_dia_operacional` com o corte às 6h literal, e `src/comum/nps.ts`
reproduz `N05` a `N09` sem nenhuma dependência externa. **Nenhum dos três acrescenta uma linha à tabela da
seção 2.1.**

---

## 11. O que este documento deliberadamente não decide

| Em aberto | Quem responde | O que trava |
|---|---|---|
| A cotação em BRL dos 5 tablets, dos 4 suportes e da estação de carregamento (`N15`, `D5`) | Proprietário, no ato da compra | **O total do desembolso único, o tempo de retorno do hardware e o custo por resposta do primeiro ano.** As três coisas ficam sem número enquanto isso não existir |
| O câmbio do dia para os 44,50 EUR e para o total pessimista em dólar | Proprietário | A conversão de qualquer valor deste documento para reais com uma casa só. Por isso o pessimista aparece em duas pontas |
| Quanto o schema fiscal já ocupa dos 500 MB de `NFe e Financeiro` | Leitura direta do banco, quando houver `pg_dump` | O percentual real da cota de banco, que hoje é maior que os 7,2% da Etapa 2 e desconhecido por quanto |
| O tamanho real de um arquivo R3 | Primeiro import, ou o suporte da Altec (`A1`) | A única linha do banco que cresce sem poda (ADR-12), e com ela a projeção de 10 anos |
| Se a alternativa a R$ 575,00 por ano inclui hardware | Página do fornecedor, não lida | Saber se o hardware aparece nos dois lados da comparação da seção 5 |
| O preço dos upgrades sem página oficial lida: Workers Paid, Pages, Groq pago, minuto extra do Actions, B2 acima de 10 GB, MAU adicional, Google Drive | Cotação, se algum dia for necessária | O cenário pessimista completo. Hoje só os dois upgrades da tabela 2.3 têm preço, e **US$ 45 por mês é o pior caso verificável, não o pior caso possível** |
| Quem executa, com nome, cada um dos seis deveres da seção 9.2 | Proprietário | Se a restrição "ninguém vai manter" é premissa ou ficção. **Dever sem dono é dever cortado**, e o corte fica escrito ao lado do indicador que ele deixa de sustentar |

**Nenhuma dessas pendências autoriza inventar número.** Onde faltar resposta, escreve-se **NÃO VERIFICADO** com
essas palavras, aqui e no painel.
