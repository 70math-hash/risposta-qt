# 11. Backup e política do Google: verificação adversarial

Verificação independente feita em 14/08/2026. Todas as fontes foram buscadas e lidas de novo, do
zero, sem confiar no levantamento anterior. Nenhum número aparece aqui sem página oficial atrás.
Onde não houve página oficial, está escrito `NÃO VERIFICADO`.

---

## 1. Veredito por frente

| Frente | Veredito | Uma linha |
|---|---|---|
| **A. Destino de backup** | **PARCIAL** | Todos os números e as duas afirmações caras estão corretos, mas o destino recomendado cai por um motivo que o levantamento anterior nunca checou: os Termos Adicionais do GitHub proíbem usar runner hospedado para "any other activity unrelated to the production, testing, deployment, or publication of the software project", com punição documentada até suspensão de conta. A recomendação inverte para Backblaze B2. |
| **B. Política do Google** | **CONFIRMADO** | As sete respostas se sustentam em texto oficial, em inglês e em pt-BR. A cláusula "while on the premises" **existe** e foi confirmada literalmente nas duas línguas, e a leitura do levantamento anterior está certa: ela proíbe exigir e pressionar, não proíbe pedir. A ressalva de que penalidade de ranqueamento é `NÃO VERIFICADO` também se confirma: a página oficial de punições não menciona ranking em nenhum ponto. |

### As duas afirmações caras da Frente A, checadas uma por uma

| Afirmação | Resultado | Prova |
|---|---|---|
| (a) O destino recomendado exige cadastrar forma de pagamento? | **CONFIRMADO que não**, para GitHub e B2. E **confirmado que sim** para R2 e Oracle, como o levantamento dizia. | B2: `"No credit card required."` na página de cadastro. GitHub: nada a cadastrar. R2: `"Complete the checkout flow to add an R2 subscription to your account."` mais `"Ensure that you are using a valid payment method before changing your plan type or enabling subscriptions."` Oracle: `"We use your contact information and credit/debit card information for account setup and identity verification."` |
| (b) Ele apaga objeto antigo sozinho por regra de ciclo de vida no plano gratuito? | **CONFIRMADO**, e sem exigência de plano pago em nenhuma das duas. | B2: `daysFromUploadingToHiding` e `daysFromHidingToDeleting`, `"You can set up to 100 Lifecycle Rules on one bucket."` Nenhuma menção a plano pago na página de lifecycle. GitHub: `retention-days`, `"Minimum 1 day. Maximum 90 days unless changed from the repository settings page."` |

### A cota de artefato do GitHub foi lida em página oficial?

**Sim, mas não na página que o levantamento anterior citou primeiro.** Este é um erro de fonte, não
de número. A página `docs.github.com/en/actions/concepts/billing-and-usage` **não contém** a tabela
de cotas nem os números: ela só diz, de forma genérica, que cada conta recebe uma cota conforme o
plano. A tabela com `500 MB` e `2,000` está em duas outras páginas oficiais, e ali o número se
confirma literalmente:

- `https://docs.github.com/en/billing/concepts/product-billing/github-actions`, linha do plano Free:
  `"GitHub Free | 500 MB | 2,000 | 10 GB | Not applicable"`
- `https://docs.github.com/en/billing/managing-billing-for-your-products/about-billing-for-github-actions`,
  mesma tabela: Free `"500 MB"` e `"2,000"`, Pro `"1 GB"` e `"3,000"`, Team `"2 GB"` e `"3,000"`,
  Enterprise Cloud `"50 GB"` e `"50,000"`.

Confirmados na mesma página, literalmente: `"The artifact storage amounts shown are shared with
GitHub Packages."`, `"GitHub rounds your artifact storage to the nearest MB."`, `"If your account
does not have a valid payment method on file, usage is blocked once you use up your quota."` e
`"The use of standard GitHub-hosted runners is free: In public repositories"`.

Uma correção a favor do levantamento anterior: o cache de 10 GB é cota **separada**, não disputa os
500 MB. A página diz `"Cache storage and custom image storage are separate allowances"`. Quem divide
os 500 MB é só o GitHub Packages.

---

## 2. Tabela de destinos de backup

| Nome | Gratuito de verdade | Exige cartão | Limite (verbatim de página oficial) | Apaga sozinho | Veredito | Confiança | Fonte |
|---|---|---|---|---|---|---|---|
| **Backblaze B2** | **Sim** | **Não** | `"First 10GB storage is always free."` Egresso: `"Free egress up to 3x their average monthly storage"`, excedente a `"$0.01/GB"`. Chamadas: `"Class A, B, and C API calls are free for pay-as-you-go customers. Class D transactions cost $0.004 per 10,000 calls plus the first 2,500 calls per day are free."` | **Sim.** Lifecycle nativa: `daysFromUploadingToHiding` que "causes the specified files to be automatically hidden after a designated number of days" e `daysFromHidingToDeleting` que "causes hidden files that you specify to be automatically deleted after a number of days". `"You can set up to 100 Lifecycle Rules on one bucket."` Nenhuma exigência de plano pago na página. | **RECOMENDADO** (subiu de ACEITÁVEL) | Alta | [pricing](https://www.backblaze.com/cloud-storage/pricing), [sign-up](https://www.backblaze.com/sign-up/cloud-storage), [lifecycle](https://www.backblaze.com/docs/cloud-storage-lifecycle-rules), [app keys](https://www.backblaze.com/docs/cloud-storage-application-keys) |
| **Artefato do GitHub Actions, repo privado** | Sim | Não | Free: `"500 MB"` de artefato e `"2,000"` minutos/mês. Compartilhado com Packages: `"The artifact storage amounts shown are shared with GitHub Packages."` Cache é cota separada: `"Cache storage and custom image storage are separate allowances"`. Arredondamento: `"GitHub rounds your artifact storage to the nearest MB."` | **Sim.** `retention-days`, cuja doc diz `"Duration after which artifact will expire in days. 0 means using default retention. Minimum 1 day. Maximum 90 days unless changed from the repository settings page."` Padrão do repo: `"retained for 90 days before they are automatically deleted"`, ajustável em repo privado `"anywhere between 1 day or 400 days"`. | **EVITAR** (caiu de RECOMENDADO) | **Média**, e a queda é por Termos de Serviço, não por cota | [billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [upload-artifact](https://github.com/actions/upload-artifact), [settings do repo](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository), [**Termos Adicionais**](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features) |
| **Cloudflare R2** | Sim, com ressalva | **Sim** | `"Storage: 10 GB-month / month"`, `"Class A Operations: 1 million requests / month"`, `"Class B Operations: 10 million requests / month"`, egresso grátis. Ressalva oficial: `"The free tier only applies to Standard storage, and does not apply to Infrequent Access storage."` | **Sim.** Exemplo da própria doc, "Delete logs older than 90 days" com `Expiration: { Days: 90 }`. `"object lifecycles currently has a 1000 rule maximum"`. Nenhuma exigência de plano pago mencionada. | **EVITAR** | Alta | [pricing](https://developers.cloudflare.com/r2/pricing/), [lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/), [get-started](https://developers.cloudflare.com/r2/get-started/), [billing policy](https://developers.cloudflare.com/billing/understand/billing-policy/) |
| **Google Drive via conta de serviço** | Não | Não, o bloqueio é anterior | `"Service accounts don't have storage quota and can't own any files."` Sobram drive compartilhado, que depende de edição paga do Workspace, ou OAuth de usuário humano, que consome a cota pessoal do dono. Quais edições do Workspace incluem drive compartilhado: `NÃO VERIFICADO`. | **Não.** Não existe regra de ciclo de vida por idade no Drive. | **INVIÁVEL** | Alta | [about shared drives](https://developers.google.com/workspace/drive/api/guides/about-shareddrives) |
| **Supabase Storage** | Sim | Não | `"1 GB file storage"` e `"500 MB database size (Shared CPU • 500 MB RAM)"`. Gatilho de perda: `"Free projects are paused after 1 week of inactivity. Limit of 2 active projects."` | **Não.** Confirmado por leitura direta: a página de exclusão não menciona nenhuma regra automática por idade. Exclusão é por chamada explícita, `"there is a limit of 1000 objects at a time using the remove method"`. | **INVIÁVEL** | Alta | [pricing](https://supabase.com/pricing), [delete objects](https://supabase.com/docs/guides/storage/management/delete-objects) |
| **Storj** | **Não**, é trial | Não | `"25GB"` por `"30 days"`, e `"The minimum fee does not apply during the free trial period. It takes effect at the start of your first billing cycle after the trial ends."` Cadastro: `"No credit card required"`. | Object lifecycle no Storj: `NÃO VERIFICADO`. Irrelevante, cai no primeiro critério. | **INVIÁVEL** | Alta | [pricing](https://www.storj.io/pricing) |
| **Oracle Cloud Always Free** | Sim, com ressalva | **Sim** | Limites de GB e requisições do Object Storage Always Free: `NÃO VERIFICADO`. Não aprofundado porque a opção cai antes, no critério do cartão. | `NÃO VERIFICADO`. | **INVIÁVEL** | Alta (subiu de média: a exigência de cartão está literal no FAQ) | [FAQ](https://www.oracle.com/cloud/free/faq/) |
| **Tebi, Filebase, iDrive e2** | `NÃO VERIFICADO` | `NÃO VERIFICADO` | `NÃO VERIFICADO`. Nenhuma página oficial de preço destes provedores foi lida nesta verificação. | `NÃO VERIFICADO` | **EVITAR** | Baixa | Nenhuma |

### Correções e achados novos, em ordem de gravidade

**1. O achado que derruba a recomendação anterior. Termos Adicionais do GitHub.** O levantamento
anterior avaliou o GitHub Actions só contra cota, retenção e credencial, e nunca abriu os Termos de
Serviço. Eles são explícitos, e a restrição é justamente sobre uso alheio ao projeto de software:

> `"Any other activity unrelated to the production, testing, deployment, or publication of the software project associated with the repository"`

Essa proibição é listada como uso vedado dos runners hospedados, ao lado de cryptomining e de
"serverless computing". E a punição está escrita na mesma página:

> `"Misuse of GitHub Actions may result in termination of jobs, restrictions in your ability to use GitHub Actions, disabling of repositories created to run Actions in a way that violates these Terms, or in some cases, suspension or termination of your GitHub account."`

Guardar dump do banco de produção do restaurante como artefato é zona cinzenta contra essa cláusula.
Se o Google, o Cloudflare ou o Backblaze tivessem cláusula equivalente, o levantamento anterior teria
reprovado a opção na hora. Duas honestidades: **primeira**, não existe pronunciamento oficial do
GitHub dizendo que backup de banco em artefato viola os Termos, então a interpretação é
`NÃO VERIFICADO`; **segunda**, dá para argumentar que o backup do banco do próprio app, no repo do
próprio app, é "related to the production" dele. Mas o critério que domina este projeto é sobreviver
dez anos sem ninguém olhando, e apostar uma cláusula ambígua contra uma punição que inclui
`"suspension or termination of your GitHub account"` é péssima aposta nesse horizonte. Pior: essa
punição levaria o repositório do app e os backups no mesmo evento, que é exatamente o modo de falha
de fornecedor único pelo qual o Supabase Storage foi, corretamente, reprovado.

**2. Versão da action está desatualizada no trecho de workflow.** O snippet anterior usa
`actions/upload-artifact@v4`. O major corrente é **v7**, e o README do projeto recomenda v7,
mantendo v3 apenas para GitHub Enterprise Server. A data exata do release é `NÃO VERIFICADO`.

**3. Erro de atribuição de fonte, já detalhado na seção 1.** Os números de cota não estão na página
`actions/concepts/billing-and-usage` que foi citada. Estão nas páginas de billing.

**4. Um risco que o levantamento anterior não listou, e que se descartou aqui.** Existe uma regra
do GitHub que desliga workflow agendado sozinho, o que mataria um backup semanal em silêncio.
Fui buscar e ela **não se aplica** ao caso, porque é escopada a repositório público:
`"In a public repository, scheduled workflows are automatically disabled when no repository activity has occurred in 60 days."`
Como o desenho é repositório privado, o cron sobrevive à inatividade. Ponto a favor do GitHub, que
não é suficiente para vencer o item 1.

**5. Detalhes que reforçam vereditos já dados.** Oracle não aceita cartão pré-pago nem virtual:
`"We do not accept debit cards with a PIN or virtual, single-use, or prepaid cards."` Cloudflare
aceita nove meios, `"Visa, Mastercard, American Express, Discover, PayPal, Apple Pay, Google Pay, Stripe Link, UnionPay"`,
e avisa que `"Gift cards and pre-payment cards may not be accepted"`. A página de preços do B2 lista
`"Credit card or invoice"` como meios de pagamento, o que não contradiz o `"No credit card required"`
do cadastro: o cartão só entra se e quando houver fatura a pagar.

**6. Chave de aplicação do B2, confirmada com mais precisão que antes.** `"You can create standard app keys that have access to all buckets in an account or just a single bucket"`,
e as capacidades são individuais e selecionáveis, com `writeFiles`, `readFiles`, `deleteFiles`,
`listFiles`, `listBuckets` e `shareFiles` como itens distintos. Confirmada também a armadilha que o
levantamento anterior apontou: existe expiração, via `validDurationSeconds`, aceitando
`"a positive integer less than 1000 days (in seconds)"`. Criar a chave **sem** expiração é
obrigatório, senão o backup morre calado em menos de três anos.

---

## 3. Recomendação final de destino

### Destino escolhido: BACKBLAZE B2, com lifecycle rule de 56 dias

A inversão em relação ao levantamento anterior tem uma causa única e verificável: o GitHub Actions
passa nos três critérios duros e reprova nos Termos de Serviço, com punição documentada que inclui
suspensão de conta. O B2 passa nos três critérios duros **e** não tem cláusula equivalente contra o
uso pretendido, porque guardar arquivo é literalmente o produto que ele vende.

Contra os três critérios duros, um por um, todos com texto oficial:

1. **Custo zero de verdade.** `"First 10GB storage is always free."` O caso concreto usa 8 objetos
   simultâneos, e mesmo no tamanho do ano 10 isso é uma fração pequena dos 10 GB. Chamadas de API do
   tipo usado por um upload semanal são gratuitas: `"Class A, B, and C API calls are free for pay-as-you-go customers."`
2. **Sem cadastrar cartão.** `"No credit card required."` na própria página de cadastro. Sem meio de
   pagamento na conta, o pior caso de estouro de cota é o job falhar, nunca uma fatura.
3. **Apaga sozinho em 8 semanas.** Lifecycle rule nativa no bucket, configurada uma vez, sem plano
   pago: `daysFromUploadingToHiding = 56` e `daysFromHidingToDeleting = 1`.

O custo aceito é honesto e é o mesmo que o levantamento anterior já havia identificado: uma conta
nova, um par de chaves em segredo do repositório e uma regra de lifecycle configurada uma vez no
painel. É mais superfície do que o artefato do GitHub. Em troca vem separação real de fornecedor,
20 vezes mais cota, granularidade de credencial que o GitHub não tem, e nenhuma cláusula de Termos
pendendo sobre a operação.

**Configuração da credencial, que é onde o B2 ganha de todos os outros.** Chave presa ao bucket de
backup, com `writeFiles` e `listBuckets`, **sem** `readFiles` e **sem** `deleteFiles`, e **sem**
expiração. Assim, se o segredo do repositório vazar, o atacante escreve lixo e não consegue ler nem
apagar nenhum backup. Isso importa mais que o resto porque o conteúdo é dado pessoal sob LGPD.

### Segundo lugar: ARTEFATO DO GITHUB ACTIONS em repositório privado

Continua sendo a opção mais simples do mundo e a que tem menos peças para quebrar, com zero
credencial externa e uma linha de configuração. Fica em segundo, e não em primeiro, só pela cláusula
dos Termos Adicionais. Serve bem como **cópia secundária** durante a implantação, ou como destino
único se o dono, depois de ler a cláusula, aceitar o risco por escrito. Se for usado, `retention-days: 56`
e `actions/upload-artifact@v7`, não v4.

Registro para quem for reabrir a decisão: o R2 é tecnicamente o melhor produto dos três e volta à
disputa no dia em que o cliente aceitar PayPal, Google Pay ou Apple Pay em vez de cartão, porque os
três estão na lista oficial de meios aceitos. O que ele nunca resolve é a consequência de ter meio de
pagamento na conta: estouro de cota vira cobrança, não vira falha.

### Cifragem: comando concreto

Ferramenta: **age**, no modo assimétrico, com apenas a chave **pública** dentro do runner. O
raciocínio do levantamento anterior está certo e se mantém: com gpg simétrico a mesma senha cifra e
decifra, então o GitHub passaria a guardar o pacote cifrado e a chave que o abre no mesmo lugar, e
quem tiver admin do repositório lê nome, WhatsApp, e-mail e data de nascimento dos clientes. Com age
assimétrico o runner escreve backup e não consegue ler nenhum, nem os que ele mesmo escreveu.

O pacote existe oficialmente no Ubuntu 24.04 noble, seção `universe`, versão `1.1.1-1ubuntu0.24.04.3`,
descrito como `"simple, modern and secure encryption tool"`
([packages.ubuntu.com/noble/age](https://packages.ubuntu.com/noble/age)).

**Passo 1, uma vez, na máquina do dono, NUNCA no runner:**

```
age-keygen -o qt-backup-key.txt
```

A saída imprime a linha `Public key: age1...` e o arquivo `qt-backup-key.txt` contém a chave privada,
que começa com `AGE-SECRET-KEY-1`.

**Passo 2, dump, cifragem e envio ao B2, dentro do workflow:**

```yaml
      - name: Instalar age e rclone
        run: sudo apt-get update -qq && sudo apt-get install -y age rclone

      - name: Dump, cifrar e enviar
        env:
          DB_URL:      ${{ secrets.SUPABASE_DB_URL }}
          AGE_PUB:     ${{ vars.AGE_PUBLIC_KEY }}
          B2_KEY_ID:   ${{ secrets.B2_KEY_ID }}
          B2_APP_KEY:  ${{ secrets.B2_APP_KEY }}
        run: |
          set -euo pipefail
          STAMP="$(date -u +%Y%m%d)"
          mkdir -p /tmp/bkp && cd /tmp/bkp
          pg_dump --no-owner --no-privileges --format=custom --compress=9 \
            "$DB_URL" > "qt-$STAMP.dump"
          age -r "$AGE_PUB" -o "qt-$STAMP.dump.age" "qt-$STAMP.dump"
          rm -f "qt-$STAMP.dump"
          rclone --config /dev/null \
            --b2-account "$B2_KEY_ID" --b2-key "$B2_APP_KEY" \
            copy "qt-$STAMP.dump.age" ":b2:qt-backup/"
```

O `rm -f` do dump em claro é obrigatório, e o `mkdir /tmp/bkp` mantém o arquivo em claro fora de
qualquer diretório que um passo futuro possa varrer por engano.

**Passo 3, a regra que apaga sozinha.** No painel do bucket `qt-backup`, uma vez, na criação:
`daysFromUploadingToHiding = 56` e `daysFromHidingToDeleting = 1`. Ninguém toca nisso depois.

**Passo 4, decifrar e restaurar, na máquina de quem tem a chave privada:**

```
rclone copy ":b2:qt-backup/qt-20260814.dump.age" .
age -d -i qt-backup-key.txt -o qt-20260814.dump qt-20260814.dump.age
pg_restore --no-owner --no-privileges -d "$DB_URL" qt-20260814.dump
```

### Como a chave é guardada

| Item | Onde fica | Por quê |
|---|---|---|
| Chave **pública** age (`age1...`) | Repositório, em Settings > Secrets and variables > Actions, aba **Variables**, nome `AGE_PUBLIC_KEY` | Chave pública não é segredo. Pode ser Variable. Se preferir uniformidade, cadastre como Secret e troque `vars` por `secrets` no workflow. |
| Chave **privada** age (`qt-backup-key.txt`) | **Nunca** no GitHub, em nenhuma forma, nem como Secret. Duas cópias offline: gerenciador de senhas do dono e uma cópia impressa em papel no cofre do restaurante. | Sem ela nenhum backup é recuperável. É o único ponto do sistema que depende de disciplina humana, e por isso a cópia em papel. |
| `B2_KEY_ID` e `B2_APP_KEY` | Secrets do repositório | Chave presa ao bucket, com `writeFiles` e `listBuckets`, sem `readFiles`, sem `deleteFiles` e **sem expiração**. |
| String de conexão do Postgres | Secret separado, `SUPABASE_DB_URL` | Separar do resto limita o estrago de um vazamento isolado. |

**Vigilância sem manutenção.** Como ninguém vai olhar, o sistema precisa gritar quando quebra:
`set -euo pipefail` derruba o job em qualquer falha, e o GitHub manda e-mail automático de workflow
falho para o dono do repositório. Isso cobre os modos de morte silenciosa mais prováveis, que são
senha do banco rotacionada, chave do B2 revogada e incompatibilidade de versão do `pg_dump`.

---

## 4. Tabela da política do Google

| # | Pergunta | Resposta | Trecho literal | Fonte | Confiança |
|---|---|---|---|---|---|
| 1 | O Google permite um negócio pedir avaliação aos clientes? | **Permite de forma expressa**, e vai além: publica página própria ensinando a gerar link e QR code e recomenda expor o QR na loja. O limite é não oferecer incentivo e não tentar influenciar nota nem conteúdo. | `"Solicit or encourage the posting of content that does represent a genuine experience, without offering incentives to do so or attempting to influence the rating or the contents of the review."` pt-BR: `"Solicitem ou incentivem a postagem de conteúdo que represente uma experiência genuína, sem oferecer incentivos"`. E a lista oficial de formatos: `"Include it on your receipts"`, `"Include it in thank you emails"`, `"Add it at the end of a chat interaction"`, `"Print and display the QR code in your store"`. | [7400114 en](https://support.google.com/contributionpolicy/answer/7400114?hl=en), [7400114 pt-BR](https://support.google.com/contributionpolicy/answer/7400114?hl=pt-BR), [16816815](https://support.google.com/business/answer/16816815?hl=en) | Alta |
| 2 | Qual o texto exato que proíbe review gating? | Está na lista "We do not allow merchants to". **A expressão "review gating" não aparece em nenhum texto oficial do Google**: é vocabulário de mercado. O que existe oficialmente é a frase ao lado. A página oficial também não descreve o exemplo clássico do gating, de perguntar a nota antes e rotear por resultado. | `"Discourage or prohibit negative reviews, or selectively solicit positive reviews from customers"` pt-BR: `"Desencorajem ou proíbam avaliações negativas ou peçam avaliações positivas aos clientes de forma seletiva"` | [7400114 en](https://support.google.com/contributionpolicy/answer/7400114?hl=en), [7400114 pt-BR](https://support.google.com/contributionpolicy/answer/7400114?hl=pt-BR) | Alta |
| 3 | Existe cláusula que proíba pedir ou pressionar por avaliação **dentro do estabelecimento**? | **SIM, EXISTE.** Confirmada literalmente nas duas línguas nesta verificação independente. O verbo proibido é **exigir e pressionar**, não pedir e não disponibilizar. | `"When soliciting reviews, merchants should not require or pressure users to leave ratings or write reviews while on the premises, nor should they request that specific content be included."` pt-BR: `"Ao pedir avaliações, os comerciantes não podem exigir nem pressionar os usuários a deixar classificações"` | [7400114 en](https://support.google.com/contributionpolicy/answer/7400114?hl=en), [7400114 pt-BR](https://support.google.com/contributionpolicy/answer/7400114?hl=pt-BR) | Alta |
| 4 | Oferecer incentivo em troca de avaliação é proibido? | **Proibido**, e é a proibição mais repetida da política. Aparece na política de conteúdo e é reforçada com `"strictly prohibited"` em duas páginas operacionais do Perfil da Empresa. Sorteio não está nomeado, mas cai em `"free goods and/or services"`. Vale também para pedir revisão ou remoção de avaliação negativa. | `"Offer incentives – such as payment, discounts, free goods and/or services - in exchange for posting any review or revision or removal of a negative review."` E: `"Offering incentives, like free or discounted goods or services, in exchange for customers to post reviews, change reviews, or remove negative reviews is considered fake & misleading content and is strictly prohibited."` | [7400114](https://support.google.com/contributionpolicy/answer/7400114?hl=en), [3474122](https://support.google.com/business/answer/3474122?hl=en), [16816815](https://support.google.com/business/answer/16816815?hl=en) | Alta |
| 5 | QR individual por funcionário viola política? E meta ou bônus por volume? | **Rastrear internamente qual garçom entregou o QR: `NÃO ENCONTRADO`** nenhuma cláusula que proíba. Não existe texto oficial sobre atribuição interna, telemetria de clique ou QR individualizado. Mas a política proíbe literalmente as duas coisas vizinhas: meta de quantidade pedida à equipe, e pedir avaliação que cite um funcionário. Logo: QR individual como chave de dado interno, **permitido**. Meta ou bônus por volume, **proibido**. | `"Merchants requesting that staff solicit a certain number of reviews"` e `"Merchants requesting that staff solicit reviews that include specific content, including content that identifies a staff member."` | [7400114](https://support.google.com/contributionpolicy/answer/7400114?hl=en) | Alta |
| 6 | Qual a punição real e documentada, e onde está escrita? | Há página oficial dedicada, e ela é concreta. **Documentado em página do Google:** remoção das avaliações violadoras, bloqueio de novas avaliações por período, despublicação das existentes por período, aviso público ao consumidor, notificação prévia por e-mail e direito de recurso. Em nível de conta, padrão de violação leva a suspensão de todos os perfis vinculados. **`NÃO VERIFICADO`:** qualquer penalidade de ranqueamento ou posição no Maps. Verifiquei a página de punições de ponta a ponta e ela **não menciona ranking em nenhum ponto**. Também `NÃO VERIFICADO`: número de tolerância, prazo do bloqueio, percentual de detecção. | `"Business Profile will not be able to receive new reviews or ratings for set period of time"`, `"Business Profile's existing reviews or ratings will be unpublished for set period of time"`, `"Business Profile will display a warning to let consumers know that fake reviews were removed"` | [14114287](https://support.google.com/business/answer/14114287?hl=en) | Alta |
| 7 | O desenho de dois QR separados é conforme? | **Conforme**, e pelo motivo certo. O gating proibido depende de um roteamento **condicional**. Aqui não existe condicional em nenhum dos dois caminhos: o QR do Google é incondicional e não tem pergunta de nota antes, e a pesquisa interna termina em agradecimento e nunca emite link do Google. Duas trilhas paralelas e independentes não são um gate. As armadilhas estão todas fora do código. | `"Discourage or prohibit negative reviews, or selectively solicit positive reviews from customers"`, onde a seleção vedada é **do cliente**, não do canal, combinado com `"We do allow merchants to: Solicit or encourage the posting of content that does represent a genuine experience"` | [7400114](https://support.google.com/contributionpolicy/answer/7400114?hl=en) | Alta |

---

## 5. Veredito explícito sobre a cláusula de pedir avaliação dentro do estabelecimento

### EXISTE

Buscada de forma independente e confirmada literalmente em página oficial do Google, nas duas
línguas, em 14/08/2026. Não é interpretação nem paráfrase de blog.

> **EN:** `"When soliciting reviews, merchants should not require or pressure users to leave ratings or write reviews while on the premises, nor should they request that specific content be included."`
>
> **pt-BR:** `"Ao pedir avaliações, os comerciantes não podem exigir nem pressionar os usuários a deixar classificações"`
>
> Fonte: [Maps User Generated Content Policy, seção Prohibited and restricted content](https://support.google.com/contributionpolicy/answer/7400114?hl=en)

**O que a cláusula proíbe:** exigir e pressionar (`require or pressure`), e pedir que conteúdo
específico seja incluído. São duas proibições independentes na mesma frase.

**O que a cláusula não proíbe:** pedir, e disponibilizar suporte impresso no salão. A leitura
contrária é insustentável porque o próprio Google, em outra página oficial, recomenda literalmente
`"Print and display the QR code in your store"` e `"Include it on your receipts"`. Um QR na conta,
entregue dentro do estabelecimento, é exatamente o formato que a página 16816815 ensina a produzir.
Ler a cláusula como proibição de pedir no local colocaria as duas páginas oficiais em contradição
direta.

Como a cláusula **existe**, os documentos `01-risposta.md` e `04-cortar-e-backlog.md` **não precisam
de correção por citação falsa**. A citação está certa nos dois. Mas resta uma correção de outra
natureza, que é retirar uma ressalva agora resolvida e ajustar uma fonte.

### Correção 1, em `docs/pesquisa/etapa-3/04-cortar-e-backlog.md`, linha 28, posição 2

O texto atual marca como `NÃO VERIFICADO` se um QR impresso na conta escapa da proibição, e por isso
**não recomenda** o caminho, deixando-o como hipótese a checar. Essa checagem foi feita agora e o
resultado é positivo. Substituir o trecho que começa em "Existe a hipótese de um ganho legítimo" até
o fim da célula por:

> Existe um ganho legítimo por um QR fixo impresso na conta apontando direto para o Google, sem nota
> no caminho e sem uma linha de código, e ele sai daqui **verificado e liberado**, não mais como
> hipótese. A dúvida anterior era se um QR entregue dentro do salão cairia em
> `require or pressure users to leave ratings or write reviews while on the premises`. Não cai, e a
> prova é do próprio Google: a página oficial de link e QR de avaliação recomenda literalmente
> `Print and display the QR code in your store` e `Include it on your receipts`
> ([support.google.com/business/answer/16816815](https://support.google.com/business/answer/16816815?hl=en)).
> O que a política proíbe é **exigir e pressionar**, não pedir e não oferecer suporte impresso. O que
> permanece vedado, e precisa entrar como regra de operação escrita, é o garçom escolher a quem
> entrega, insistir, esperar na mesa, ou pedir que a avaliação cite seu nome.

### Correção 2, em `docs/pesquisa/01-risposta.md`, seção 7.2

A tabela de riscos lista "Sinalização ou restrição do perfil no Google" sem fonte. Essa afirmação
está **correta** e agora tem respaldo oficial, então basta ancorá-la. Acrescentar depois da tabela:

> As punições da coluna acima não são inferência de blog de fornecedor: estão escritas em página
> oficial do Google, que lista como restrições possíveis
> `Business Profile will not be able to receive new reviews or ratings for set period of time`,
> `Business Profile's existing reviews or ratings will be unpublished for set period of time` e
> `Business Profile will display a warning to let consumers know that fake reviews were removed`
> ([support.google.com/business/answer/14114287](https://support.google.com/business/answer/14114287?hl=en)).
> Uma ressalva de honestidade: **penalidade de ranqueamento ou de posição no Maps é `NÃO VERIFICADO`**.
> A página oficial de punições não menciona ranking em nenhum ponto, e a ideia de queda de
> posicionamento por review gating aparece só em material de fornecedor de software. Não repetir essa
> afirmação como se fosse do Google.

---

## 6. Veredito sobre o desenho de dois QR separados

### CONFORME, e pelo motivo certo, não por sorte

O que a política proíbe é a **seleção**: `"Discourage or prohibit negative reviews, or selectively
solicit positive reviews from customers"`. Gating exige um condicional em algum ponto do fluxo,
tipicamente perguntar a nota e mandar quem gostou para o Google e quem não gostou para outro lugar.

No desenho pretendido não existe condicional em nenhum dos dois caminhos. O QR do Google é
incondicional e não tem pergunta de nota antes dele. A pesquisa interna termina em agradecimento e
nunca emite link do Google, portanto o filtro que a política veda não existe. Duas trilhas paralelas
e independentes não formam um gate. E o formato, QR impresso exposto no salão e na conta, é
literalmente o que o Google recomenda em `"Print and display the QR code in your store"`.

O registro interno de qual garçom entregou o QR não viola nada: `NÃO ENCONTRADO` cláusula sobre
atribuição interna, telemetria de clique ou QR individualizado por funcionário.

**Não há necessidade de desligar nem redesenhar o que está rodando.** O risco real do caso não está
no software, está na boca do garçom e em qualquer meta futura. O que falta é disciplina de operação,
e nada disso custa infraestrutura nem manutenção, o que respeita a restrição de R$ 0.

### O que evitar

| # | O que evitar | Por quê, com base oficial |
|---|---|---|
| 1 | Garçom entregar o QR do Google só a quem pareceu satisfeito, e não entregar a quem reclamou | Gating humano. Cai direto em `"selectively solicit positive reviews from customers"`, mesmo com o QR sendo tecnicamente incondicional. **É a armadilha mais grave do caso.** |
| 2 | Frase condicional na entrega, do tipo "se você gostou, escaneia este; se não gostou, aquele" | A separação física dos dois QR é legítima, mas essa frase reconstrói o gate na boca do garçom. |
| 3 | Adicionar link do Google no fim da pesquisa interna, mesmo que só para nota alta | É o exemplo de manual do gating e derruba a conformidade dos dois canais de uma vez. **Travar isso no produto**, não só na política. |
| 4 | Rotular os QR por sentimento (gostou / não gostou, elogio / reclamação) | Rótulo por sentimento é seleção declarada. Rotular por função: "Avalie no Google" e "Pesquisa da casa". |
| 5 | Qualquer incentivo ao cliente: desconto, sobremesa, chope, cupom, brinde, sorteio, vale | `"Offer incentives – such as payment, discounts, free goods and/or services - in exchange for posting any review"`, e `"strictly prohibited"` na página de dicas. Inclui a versão informal "avalia e eu te dou" na mesa. |
| 6 | Oferecer qualquer coisa para o cliente apagar ou reescrever avaliação negativa | Mesmo trecho, na parte `"revision or removal of a negative review"`. |
| 7 | Meta de avaliações por garçom, em qualquer formato: número fixo, ranking no vestiário, semáforo no painel, competição | Proibição literal e nomeada: `"Merchants requesting that staff solicit a certain number of reviews"`. |
| 8 | Bônus, comissão, prêmio, folga ou gorjeta extra por volume de avaliações atribuídas | Mesmo trecho. **É o item que mais provavelmente vai ser proposto no futuro** e o que deve ser barrado com mais firmeza, porque é o único que transformaria um sistema conforme em violação nomeada. |
| 9 | Pedir ao cliente que cite o nome do garçom, um prato ou o bairro na avaliação | Proibição literal: `"content that identifies a staff member"`, e `"nor should they request that specific content be included"`. |
| 10 | Garçom aguardar na mesa, olhar o celular do cliente, insistir ou perguntar de novo se já avaliou | É o `"require or pressure users to leave ratings or write reviews while on the premises"` na prática. |
| 11 | Condicionar qualquer coisa da experiência à avaliação: conta, sobremesa, wifi, estacionamento | Condicionar é a forma mais clara de `require`. |
| 12 | Escanear ou avaliar pelo tablet da casa, ou o garçom preencher junto com o cliente | Aproxima de pressão no local e de conteúdo que não é postado pelo próprio cliente. |
| 13 | Campanha concentrada de volume, tipo puxão de 200 avaliações em uma semana numa casa de 22 mesas | Aciona `"unusual volumes or patterns of review contributions"`, critério de detecção explícito. |
| 14 | Avaliação de funcionário, familiar, sócio ou fornecedor | Conflito de interesse, listado nominalmente na política. |
| 15 | Repetir que review gating gera **penalidade de ranqueamento** no Maps | `NÃO VERIFICADO`. Não existe texto oficial do Google sobre posicionamento. As punições documentadas são remoção de avaliações, bloqueio de novas, despublicação temporária, aviso público no perfil e, em caso de padrão, suspensão dos perfis da conta. |

**Ações de operação, sem custo e sem manutenção:** escrever um script único de entrega, igual para
toda mesa e todo cliente, e treinar a equipe nele. Redação neutra sugerida: "Se quiser deixar sua
avaliação no Google, o QR está aqui." Entregar sempre, para todos, independente de o cliente parecer
satisfeito. Entregar e sair. Proibir formalmente, por escrito, qualquer meta, ranking público, prêmio
ou bônus ligado a volume de avaliações. O painel interno pode contar cliques por garçom para
reconhecimento qualitativo, mas não deve exibir meta, semáforo de desempenho por volume nem
comparação competitiva, porque isso é meta por outro nome.

---

## 7. Lacunas que ficaram

### Frente A

| Lacuna | Por que importa | Como fechar |
|---|---|---|
| **Interpretação dos Termos do GitHub sobre backup de banco em artefato** | É o achado que inverteu a recomendação. A cláusula é literal e a punição é literal, mas não existe pronunciamento oficial do GitHub dizendo se backup do banco do próprio projeto conta como "related to the production". | Pergunta ao suporte do GitHub, por escrito, guardando a resposta. Enquanto não houver resposta, tratar como risco e usar o B2. |
| **Backblaze apaga ou limpa conta gratuita inativa?** | Decide se o destino sobrevive dez anos. Li os Termos de Serviço de ponta a ponta e **não há cláusula de inatividade**, nem prazo, nem dormência. Isso é ausência de proibição, não garantia escrita. | Largamente mitigado pelo desenho: um job semanal mantém a conta ativa por construção. Fica como `NÃO VERIFICADO` de forma consciente. |
| **Versão do `pg_dump` na imagem `ubuntu-latest` versus a versão do Postgres do Supabase** | Incompatibilidade de versão faz o dump falhar, e este é um dos dois modos de morte mais prováveis. | Fixar a versão do cliente Postgres no workflow em vez de confiar na imagem. A versão que a imagem traz hoje segue `NÃO VERIFICADO`. |
| **`gpg` já vem na imagem do runner?** | Só mudaria a conveniência da alternativa descartada. Irrelevante para a decisão. | `NÃO VERIFICADO`. |
| **Data do release do `actions/upload-artifact@v7`** | Nenhum impacto na decisão. O que importa, e está verificado, é que v7 é o major corrente e v4 está atrás. | `NÃO VERIFICADO`. |
| **Limites de GB e requisições do Oracle Always Free Object Storage, e lifecycle no Storj** | Nenhum. As duas opções caem antes, em critério anterior. | Não vale o esforço. |
| **Tebi, Filebase, iDrive e2** | Cobertura, não decisão. Nenhuma página oficial de preço foi lida. | Não adotar sem ler a página oficial. O critério de sobreviver dez anos favorece free tier antigo e estável. |
| **Edições do Workspace que incluem drive compartilhado** | Nenhum. A conta de serviço já é inviável por não ter cota. | `NÃO VERIFICADO`. |

### Frente B

| Lacuna | Por que importa | Como fechar |
|---|---|---|
| **Para onde apontam hoje os QR por garçom do sistema atual, e se o convite depende da nota** | É a única pergunta que pode estar impedindo dano em curso no perfil do QT. Continua aberta, e é anterior a qualquer decisão de produto. | Pergunta direta ao proprietário. Já é o bloqueio `P1` em `04-cortar-e-backlog.md` e permanece o item mais urgente. |
| **Prazo, tolerância e critério quantitativo de detecção do Google** | Não muda o veredito, mas ninguém deve prometer número. Nenhum prazo de bloqueio, percentual de detecção ou limiar de "unusual volume" aparece em página oficial. | `NÃO VERIFICADO`, e provavelmente indisponível por desenho: o Google não publica limiar de antiabuso. |
| **Penalidade de ranqueamento por review gating** | Já resolvido como `NÃO VERIFICADO`, e vale registrar que a ausência foi buscada, não presumida: percorri a página oficial de punições e ela não menciona ranking. | Não usar essa afirmação. |
| **Se o Google trata QR individual por funcionário de forma diferente de QR único da casa** | O rastreamento em si está liberado por `NÃO ENCONTRADO`, mas é ausência de cláusula, não permissão expressa. A vizinhança proibida (meta e citação de funcionário) é estreita. | Manter o rastreamento estritamente interno e sem meta. Se algum dia o Google publicar algo sobre atribuição por funcionário, reabrir. |
