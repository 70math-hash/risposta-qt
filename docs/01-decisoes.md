# Registro de decisões

Decisões tomadas depois do briefing inicial, com a consequência de cada uma. Este arquivo tem
**precedência sobre o briefing e sobre o dossiê** onde houver divergência, porque é mais recente e
foi tomado com a pesquisa e a inspeção do ambiente já na mesa.

---

## D1. Comprar os tablets antes de cancelar a mensalidade

**Data:** 13/08/2026 · **Decidido por:** proprietário
**Resolve:** o achado A1 da crítica adversarial, a contradição entre o piso de 20 itens do grid e o
cancelamento com 4 itens do backlog.

O tablet locado só volta quando os tablets próprios estiverem rodando com painel. O piso de aceite
alto vale, e o cancelamento acontece contra ele.

### Consequências

| Consequência | Detalhe |
|---|---|
| **A ponte sai do escopo** | A ponte de coleta (formulário de terceiro gravando no banco próprio) existia para permitir o cancelamento na semana 1. Sem cancelamento antecipado, ela é complexidade sem propósito. **Economiza 12 a 20 horas** e remove uma dependência externa do caminho crítico |
| **O marco M0 deixa de existir** | O backlog passa a três marcos: M1 Coleta própria, M2 Decisão, M3 Recorrência. A compra dos tablets sobe para o início da M1 |
| **A economia começa depois** | 2 a 3 meses a mais de mensalidade, ou seja, entre R$ 1.000 e R$ 3.000 pagos ao fornecedor atual. É o preço declarado de proteger o critério de sucesso nº 2 |
| **O critério nº 2 fica protegido** | Coletar mais que hoje deixa de depender de o QR sozinho substituir um canal que responde por cerca de 90% do volume |
| **Haverá sobreposição curta** | O briefing dizia "troca direta, sem período em paralelo". Por construção, agora existe uma janela curta com os dois no ar. Não é período de comparação, é transição: o sistema próprio entra, é conferido, e só então o tablet locado volta |
| **A trava de A2 continua valendo** | Medir a conversão sobre mesas atendidas desde o primeiro dia, com a linha de base das 74 linhas de `cliques_avaliacao` |

---

## D2. A pesquisa vive num schema dedicado dentro do projeto `NFe e Financeiro`

**Data:** 13/08/2026 · **Decidido por:** proprietário
**Resolve:** o bloqueio `P2` do backlog e a pergunta 1 da crítica. Substitui a recomendação de
"organização Supabase separada" do sumário executivo, que a inspeção mostrou ser inaplicável.

### Consequências

| Consequência | Detalhe |
|---|---|
| **Diferencial nº 1 a um `JOIN` de distância** | Satisfação e custo por prato no mesmo Postgres. Nenhuma rotina de sincronização, ou seja, uma peça móvel a menos num sistema que ninguém vai manter |
| **Região correta** | `sa-east-1`, São Paulo. Dado pessoal de cliente brasileiro fica no Brasil, com menos latência e menos superfície de conformidade. Região não se troca depois de criada |
| **`qt-avaliacoes` pode ser pausado** | Depois de migrar as 74 linhas de `cliques_avaliacao`. Libera o segundo slot ativo da organização e permite trazer `Fichas Sensoriais` de volta do INACTIVE |
| **Ramo alternativo cai** | O ramo de contingência escrito para o caso de `P2` ser não (rotina diária de cópia de custo, região `us-east-1`, transferência internacional no aviso de privacidade) fica sem efeito |

### Condições inegociáveis desta decisão

Foram oferecidas como parte da pergunta e valem como regra do projeto:

1. Nada da pesquisa tem permissão de escrita fora do próprio schema. O schema fiscal é somente leitura para ela, e apenas nas tabelas de custo.
2. Toda criação e alteração de estrutura por **migration versionada**, nunca ad hoc pelo painel.
3. **`pg_dump` antes de qualquer migração** que toque o projeto, sem exceção.
4. A migração das 74 linhas acontece depois do dump, e o `qt-avaliacoes` só é pausado depois de conferido que o dado chegou íntegro.

---

## D3. Vale "só linkar" para Google e iFood

**Data:** 13/08/2026 · **Decidido por:** proprietário
**Resolve:** a contradição interna do próprio briefing, apontada na omissão 8 da crítica: pedir
"somente link" e ao mesmo tempo pedir que a auditoria por IA detecte divergência entre a pesquisa e
a avaliação pública. Não se compara com o que não se lê.

### Consequências

| Consequência | Detalhe |
|---|---|
| **A detecção de divergência sai** | O quarto item da auditoria por IA é cortado. Os outros três continuam: queda de tendência antes de virar crise, padrões repetidos de falha, e prato específico com problema |
| **Nada de API do Google nem do iFood** | Nem no MVP nem na fase 2. Some a dependência de aprovação de terceiro, o prazo de até 14 dias, a proibição dos termos do Maps de armazenar avaliação, e a exigência do iFood de CNPJ com CNAE de tecnologia |
| **O painel leva até lá** | Link para os perfis, e só |
| **Some uma tarefa humana recorrente** | Abrir o Portal do iFood toda semana sai da lista de deveres. Sobram seis |

---

## D4. Retenção de dado pessoal: 12 meses contados da última visita

**Data:** 13/08/2026 · **Decidido por:** delegado a mim, com o pedido de escolher o proporcional.

A regra tem duas metades, e é a separação entre elas que faz a decisão funcionar:

| O que | Prazo | Por quê |
|---|---|---|
| **Dado pessoal**: nome, WhatsApp, e-mail, data de nascimento | **12 meses da última visita**, depois apagado por rotina automática | Doze meses cobrem um ciclo sazonal inteiro e um aniversário, que são as duas finalidades declaradas. Cliente que não volta há um ano está fora do ciclo de recompra de uma pizzaria, e guardar o WhatsApp dele um segundo ano tem valor decrescente e risco crescente. O princípio da necessidade da LGPD pede o menor prazo que serve à finalidade |
| **Resposta da pesquisa**: nota, comentário, prato, garçom, dia operacional | **Indefinidamente**, desvinculada do contato | Não é dado pessoal depois de desvinculada, e é justamente a série histórica que o proprietário quer preservar e que hoje mora na casa do fornecedor. Apagar isso destruiria o ativo que motiva o projeto |

### O detalhe que quase sempre escapa

O **comentário aberto é campo livre**, e o cliente pode escrever o próprio nome, o telefone ou o de
outra pessoa dentro dele. Portanto, no momento da desvinculação, o texto precisa passar por uma
varredura de padrão (telefone, e-mail, CPF) antes de ser mantido como dado não pessoal. Sem isso, a
retenção de 12 meses é contornada pelo próprio texto que se pretende preservar.

### O que isso liga

- A rotina `cron_retencao`, que passa a ter prazo definido e pode ser escrita.
- A linha de prazo de retenção do aviso de privacidade.
- O registro de operações de tratamento.

---

## D5. Cinco tablets: quatro em uso, um de reserva

**Data:** 13/08/2026 · **Decidido por:** proprietário
**Resolve:** o achado A4 da crítica e o item C15 da folha canônica, a divergência entre os 4 ou mais
pontos físicos que o briefing pede e os 2 tablets que a Etapa 3 havia planejado. **Fechou em favor do
briefing.**

### Lista de compra fechada

| Item | Quantidade | Valor |
|---|---|---|
| Tablet Android, 11", 4 GB de RAM, 64 GB, Android 13 ou superior | **5** | **NÃO VERIFICADO em BRL.** Cotar no ato. Única referência independente: cerca de 180 EUR por unidade |
| Licença Fully Kiosk PLUS, pagamento único por aparelho | **5** | **8,90 EUR** cada, ou seja 44,50 EUR no total. É o único valor de hardware 100% auditável do projeto |
| Suporte de mesa com chave e cabo de segurança | 4 | NÃO PESQUISADO |
| Estação de carregamento de cinco portas | 1 | NÃO PESQUISADO |

### Consequências, e a mais importante não é o dinheiro

| Consequência | Detalhe |
|---|---|
| **O heartbeat deixa de ser um alarme e passa a ser quatro** | Com um tablet só, o aparelho mudo é óbvio, porque a coleta para inteira. Com quatro, o aparelho mudo é **invisível no agregado**: os outros três seguem coletando e o total do dia parece normal. O e-mail das 16h passa a listar **cada aparelho pelo nome, com a hora do último sinal**. Sem isso, um tablet morto passa semanas sem ser notado |
| **A conversão precisa de corte por aparelho** | É a única forma de distinguir "a equipe ignora este ponto" de "este ponto está quebrado". Mesmo sintoma, diagnósticos opostos |
| **A licença paga de quiosque virou necessidade** | Reabertura automática após reboot deixa de ser conveniência. Sem ela, alguém reabre o app em cinco aparelhos a cada atualização do sistema, e é o tipo exato de tarefa que ninguém faz |
| **Cinco superfícies de perda física** | Suporte com chave nos pontos fixos e regra escrita de guarda dos que circulam. O suporte do fornecedor atual tem página dedicada a tablet furtado e tela quebrada, o que diz o quanto isso acontece |
| **Mais fricção com a restrição de manutenção zero** | Cinco aparelhos para carregar, atualizar e guardar. Carregar entra na rotina de fechamento de caixa, e não conta como dever novo de sistema, mas aparelho descarregado é indistinguível de aparelho quebrado sem heartbeat por dispositivo |
| **Ganho real** | Quatro pontos sobrevivem a garçom ocupado e a noite cheia, o que ataca direto o critério de sucesso nº 2, coletar mais que hoje. É a razão da decisão e ela é boa |

---

## D6. Os QR por garçom apontam direto para o Google, e vão continuar existindo em separado

**Data:** 13/08/2026 · **Informado por:** proprietário
**Resolve:** o bloqueio `P1`, que era a pendência mais urgente do projeto porque podia estar causando
dano em curso.

**O fato:** o QR por garçom que já circula na casa aponta **direto para a página de avaliação do
Google, sem nenhuma pergunta de nota no caminho**.

### Consequência principal: não há review gating

Review gating exige um **filtro por nota**, ou seja mandar quem deu nota alta para o Google e retermer
quem deu nota baixa. Sem nota no fluxo, não existe filtro. Pedir avaliação a todos os clientes é
prática permitida. **O risco agudo que o dossiê levantou não se materializou.**

O documento [`pesquisa/01-risposta.md`](pesquisa/01-risposta.md) descreve o gating como feature do
fornecedor atual, e isso continua verdadeiro sobre o produto dele. O que muda é que **o QT não está
usando essa feature**.

### Dois riscos residuais, menores e reais

1. **O garçom escolhe a quem entrega o QR.** Ninguém entrega com entusiasmo para a mesa que reclamou. O mecanismo é humano e não software, mas o efeito é solicitação seletiva. A tabela `cliques_avaliacao` mede cliques por garçom, o que amplificaria isso se algum dia virasse meta ou bônus. **A decisão de não amarrar meta à nota, já registrada, protege esse flanco por consequência.** Ela passa a ter uma segunda razão de existir.
2. **A cláusula sobre pedir avaliação dentro do estabelecimento.** Foi afirmada em documento anterior deste projeto com base em fonte de fornecedor, não em página do Google, e está **em verificação dirigida**. O resultado entra em `pesquisa/dados/11-backup-e-politica-google.md`. Se a cláusula não existir, os documentos que a citam precisam de correção.

### A decisão de produto: dois QR fisicamente separados

O QR atual manda o cliente para fora sem capturar nada internamente: 74 cliques, zero dado próprio. Mas
apontá-lo para a pesquisa custaria o fluxo de avaliações no Google, porque a tela final da pesquisa só
agradece, sem convite. Em vez de escolher, o desenho mantém os dois:

| QR | Destino | Regra |
|---|---|---|
| **QR da pesquisa** | Pesquisa interna própria | Termina em agradecimento. Nenhum convite ao Google em nenhuma tela, em nenhuma condição |
| **QR do Google** | Direto para a página de avaliação | **Incondicional**, entregue a todos, sem nota no caminho. É o que o mantém limpo de gating |

A separação **física** entre os dois é o que garante a conformidade: como não existe nota no caminho do
segundo, não existe filtro possível. Juntar os dois num fluxo só é o que criaria a violação, e por isso
não se faz.

**Pendência menor que nasce daqui:** as 74 linhas de `cliques_avaliacao` medem cliques em direção ao
Google, não respostas de pesquisa. Ao usá-las como linha de base da conversão, é preciso lembrar que
elas medem um gesto diferente, e que a conversão do gesto reaproveitado é **DESCONHECIDA**.

---

## D7. O `pg_dump` semanal vai para o Backblaze B2, cifrado com chave que o runner não possui

**Data:** 14/08/2026 · **Delegado a mim, com o pedido de sugerir**
**Resolve:** o achado A9 da crítica, que era a maior lacuna de LGPD do desenho: o backup semanal leva a
base de clientes inteira para fora do Supabase, e nenhum documento dizia para onde, cifrado como, com
que acesso e por quanto tempo.

### A escolha, e por que ela inverteu no meio do caminho

Minha primeira inclinação era **artefato do GitHub Actions**, por ser a opção com menos peças móveis:
zero credencial externa, uma linha de configuração, e o backup vivendo onde o workflow já roda. A
verificação adversarial derrubou isso por um motivo que eu não tinha checado, que não é técnico:

> `"Any other activity unrelated to the production, testing, deployment, or publication of the software project associated with the repository"`

É uso vedado dos runners hospedados nos Termos Adicionais do GitHub, listado ao lado de mineração de
criptomoeda. E a punição está na mesma página:

> `"Misuse of GitHub Actions may result in termination of jobs, restrictions in your ability to use GitHub Actions, disabling of repositories created to run Actions in a way that violates these Terms, or in some cases, suspension or termination of your GitHub account."`

Duas honestidades: não existe pronunciamento do GitHub dizendo que backup do banco do próprio app viola
isso, então a interpretação é **NÃO VERIFICADO**; e é defensável argumentar que o backup do app, no repo
do app, é "related to the production" dele. Mas o critério que manda neste projeto é **sobreviver dez
anos sem ninguém olhando**, e apostar cláusula ambígua contra punição que inclui suspensão de conta é
péssima aposta nesse horizonte. Pior: essa punição levaria **o repositório e os backups no mesmo
evento**, que é exatamente o modo de falha de fornecedor único pelo qual o Supabase Storage foi
corretamente reprovado.

### O destino escolhido, contra os três critérios duros

| Critério | Backblaze B2 | Prova |
|---|---|---|
| **Custo zero de verdade** | Sim | `"First 10GB storage is always free."` O caso usa 8 objetos simultâneos, fração pequena dos 10 GB mesmo no ano 10. `"Class A, B, and C API calls are free for pay-as-you-go customers."` |
| **Sem cadastrar cartão** | Sim | `"No credit card required."` na própria página de cadastro. Sem meio de pagamento na conta, o pior caso de estouro é o job falhar, nunca uma fatura |
| **Apaga sozinho em 8 semanas** | Sim | Lifecycle nativa no bucket, sem plano pago: `daysFromUploadingToHiding = 56` e `daysFromHidingToDeleting = 1` |

O Cloudflare R2 é tecnicamente o melhor produto dos três e **está fora por exigir forma de pagamento**:
`"Ensure that you are using a valid payment method before changing your plan type or enabling subscriptions."`
Volta à disputa no dia em que o proprietário aceitar PayPal, Google Pay ou Apple Pay. O que o R2 nunca
resolve é a consequência de ter meio de pagamento na conta: estouro de cota vira cobrança, não vira
falha.

### O desenho que faz o backup ser seguro, e não só existir

Duas escolhas fazem o trabalho, e as duas são gratuitas:

**1. Cifragem assimétrica com `age`, chave pública no runner e privada fora dele.** Com `gpg` simétrico
a mesma senha cifra e decifra, então o GitHub guardaria o pacote cifrado e a chave que o abre no mesmo
lugar, e quem tivesse admin do repositório leria nome, WhatsApp, e-mail e nascimento dos clientes. Com
`age` assimétrico o runner **escreve backup e não consegue ler nenhum, nem os que ele mesmo escreveu**.

**2. Chave de aplicação do B2 presa a um bucket, com `writeFiles` e `listBuckets`, sem `readFiles`,
sem `deleteFiles` e sem expiração.** Se o segredo do repositório vazar, o atacante escreve lixo e não lê
nem apaga nenhum backup. A ausência de expiração é obrigatória: o B2 aceita `validDurationSeconds` de
até 1000 dias, e chave com prazo faria o backup morrer calado em menos de três anos.

| Item | Onde fica | Por quê |
|---|---|---|
| Chave **pública** `age` | Variable do repositório, `AGE_PUBLIC_KEY` | Chave pública não é segredo |
| Chave **privada** `age` | **Nunca no GitHub, em nenhuma forma.** Gerenciador de senhas do proprietário e uma cópia impressa em papel no cofre do restaurante | Sem ela nenhum backup é recuperável. É o único ponto do sistema que depende de disciplina humana, e é por isso que tem cópia em papel |
| `B2_KEY_ID` e `B2_APP_KEY` | Secrets do repositório | Escopo mínimo, sem expiração |
| String de conexão do Postgres | Secret separado | Separar limita o estrago de um vazamento isolado |

O comando completo de dump, cifragem, envio e restauração está em
[`pesquisa/dados/11-backup-e-politica-google.md`](pesquisa/dados/11-backup-e-politica-google.md),
seção 3, pronto para colar no workflow.

### Vigilância sem manutenção

`set -euo pipefail` derruba o job em qualquer falha, e o GitHub manda e-mail automático de workflow
falho para o dono do repositório. Isso cobre os três modos de morte silenciosa mais prováveis: senha do
banco rotacionada, chave do B2 revogada, e incompatibilidade de versão do `pg_dump`. A versão do cliente
Postgres precisa ser **fixada no workflow**, não herdada da imagem do runner, porque essa
incompatibilidade é um dos dois modos de falha mais prováveis e a versão que a imagem traz hoje é
**NÃO VERIFICADO**.

---

## D8. Nenhuma meta, ranking ou bônus ligado a volume de avaliações, agora por dois motivos

**Data:** 14/08/2026 · **Reforço de decisão já tomada**

A decisão de não amarrar meta de equipe à nota já existia, e a razão era higiene de dado: meta
contamina o número. A verificação da política do Google acrescentou uma **segunda razão, independente
da primeira**, que é conformidade. O Google proíbe literalmente:

> `"Merchants requesting that staff solicit a certain number of reviews"`
>
> `"Merchants requesting that staff solicit reviews that include specific content, including content that identifies a staff member."`

Portanto: rastrear internamente qual garçom entregou o QR é **permitido** (nenhuma cláusula proibindo
atribuição interna foi encontrada). Transformar isso em meta, ranking, semáforo, competição, bônus,
comissão, prêmio ou folga é **proibido por texto oficial**.

O painel pode contar cliques por garçom para reconhecimento qualitativo. Não pode exibir meta, semáforo
de desempenho por volume, nem comparação competitiva, porque isso é meta com outro nome. **É o item que
mais provavelmente vai ser proposto no futuro, e o que deve ser barrado com mais firmeza**, porque é o
único que transformaria um sistema conforme em violação nomeada.

### A regra de operação que precisa estar escrita e treinada

O risco real do caso não está no software: está na boca do garçom. Um garçom que entrega o QR do Google
só a quem pareceu satisfeito reconstrói o gating na mão, e cai direto em
`"selectively solicit positive reviews from customers"`, mesmo com o QR sendo tecnicamente
incondicional. **É a armadilha mais grave de todo o desenho.**

Script único de entrega, igual para toda mesa e todo cliente: *"Se quiser deixar sua avaliação no
Google, o QR está aqui."* Entregar sempre, para todos, independente de o cliente parecer satisfeito.
Entregar e sair. A lista completa das quinze práticas a evitar está na seção 6 de
[`pesquisa/dados/11-backup-e-politica-google.md`](pesquisa/dados/11-backup-e-politica-google.md).

---

## Pendências que continuam abertas

| Pendência | O que trava | Quem responde |
|---|---|---|
| ~~Para onde apontam hoje os QR por garçom~~ | **RESPONDIDA em 13/08/2026: apontam direto para o Google, sem pergunta de nota no caminho.** Ver D6 | — |
| **Quem executa as seis tarefas recorrentes, com nome, e quem conserta quando o alarme soa** | Decide se a restrição "ninguém vai manter" é premissa ou ficção. Tarefa sem dono é tarefa cortada, e cortá-la muda o que o painel mostra | Proprietário |
| ~~Onde fica guardado o `pg_dump` semanal~~ | **RESOLVIDA por D7:** Backblaze B2, bucket privado, cifrado com `age` assimétrico, lifecycle de 56 dias. Falta apenas o proprietário criar a conta e gerar o par de chaves | — |
| **Onde vive o app de reservas** | Integração com o CRM de reservas fica fora do MVP até essa resposta | Proprietário |
| **As 8 perguntas ao suporte da Altec** | A pergunta 3 (agendamento de e-mail do R3) e a 4 (o R3 tem mesa e comanda?) decidem se a importação é automática e se o cruzamento por comanda existe | Suporte da Altec |
| **Prints das perguntas do Risposta e capacidade das mesas** | Calibragem, não bloqueio | Proprietário |
