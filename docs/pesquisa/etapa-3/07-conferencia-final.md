# 07. Conferência final da Etapa 3 contra a folha canônica

> Conferência item por item dos itens **C1 a C16** de [`00-canonico.md`](00-canonico.md), lidos contra
> [`01-decisoes.md`](../../01-decisoes.md), [`01-grid-comparativo.md`](01-grid-comparativo.md),
> [`02-replicar.md`](02-replicar.md), [`03-superar.md`](03-superar.md),
> [`04-cortar-e-backlog.md`](04-cortar-e-backlog.md), [`00-sumario-executivo.md`](../00-sumario-executivo.md)
> e [`07-matriz-features.md`](../07-matriz-features.md), todos lidos na íntegra.
> Esta conferência **não corrige nada**. Ela diz o que está de pé e o que falta.

---

## 1. Veredito

**PRONTO COM RESSALVA.** Quinze dos dezesseis itens da folha estão obedecidos nos dois lados de cada
par, e a única falha é uma linha residual em `04-cortar-e-backlog.md` que continua prescrevendo a
tarefa semanal do Portal do iFood que a decisão D3 eliminou. Nada disso bloqueia a Etapa 4, e nada
disso muda o desenho do sistema: é texto a apagar, não decisão a tomar.

---

## 2. Tabela C1 a C16

| # | Item da folha | Situação | Evidência |
|---|---|---|---|
| **C1** | A ponte de coleta não existe | **OBEDECIDO** | `04` seção 4: "**O marco M0 Ponte deixou de existir**, por decisão D1" e "Saíram com ela todas as entregas de ponte: o formulário de terceiro, o webhook, a reimpressão apontando para a ponte, o e-mail diário da ponte, o ensaio com a ponte e a migração da ponte para o schema definitivo". `02` seção 4: "**Não existe quarto ativo a migrar.** [...] o marco M0 deixou de existir, e **não há dado de ponte para migrar**. O único dado histórico a migrar são as **74 linhas de `cliques_avaliacao`**". A discussão de Opção A contra Opção B sobre `versao_texto` não aparece em nenhum dos quatro documentos da Etapa 3 (só no registro histórico de `06-reverificacao.md`) |
| **C2** | Nunca referenciar entrega por número de posição entre documentos | **OBEDECIDO** | Busca por "posição" em `01`, `02` e `03` retorna **zero ocorrência**. `01` seção 4 cita "na entrega **Cancelar a mensalidade e devolver o tablet locado**, da **M1 Coleta própria**". `04` fecha a regra: "Nenhum outro documento deve citar posição: a referência correta é o nome da entrega mais o marco, como em 'cobrado na entrega `painel_leitura`, na M1'" |
| **C3** | Piso de aceite: o que é e quando é cobrado | **OBEDECIDO** | `01` seção 4: "Esta lista é o piso de aceite do **sistema próprio**, cobrado **antes da devolução do tablet locado**" e "**Não existe mais piso menor de quatro itens**, porque não existe mais cancelamento antecipado". A expressão aparece igual nas seções 1 ("no **dia da devolução do tablet locado**"), 2 (linha da coluna Risposta) e na lista "o que não entra no piso" ("Quatro coisas que o incumbente entrega e o QT não vai entregar no **dia da devolução do tablet locado**"). "Dia da troca" **não aparece** em `01` |
| **C4** | Resposta duplicada: marcação, nunca rejeição | **OBEDECIDO nos três lados** | `01` P15: "é **aceita, agradecida e gravada com `suspeita = true`**, e não entra nos indicadores [...] A métrica é respostas marcadas como suspeitas **abaixo de 3% e estável**". `02` F04: mesmo texto, mais "Métrica única desta trava: **respostas marcadas como suspeitas abaixo de 3% e estável**". `03` 2.8: mesmo texto, com citação cruzada explícita "(F04 de `02-replicar.md`, e P15 do piso de aceite em `01-grid-comparativo.md`)", e a métrica como "**menos de 3% e estável**", que é a mesma regra com outras palavras |
| **C5** | Aceite de `item_cardapio` | **OBEDECIDO nos três lados** | `02` F42: "**conferido contra um arquivo R3 exportado à mão**, de um mês qualquer, antes de existir qualquer import automático. Item ativo que não aparece no R3 do período fica como `sem venda no período`, e **isso não reprova o aceite**". Definição de pronto, bloco Dado unificado: frase idêntica. `04` entrega do catálogo: "Item ativo que não aparece no R3 do período fica como `sem venda no período`, e isso não reprova o aceite". A frase "100% dos itens do cardápio ativo casam" **não existe mais** em `02` nem na definição de pronto |
| **C6** | Keep-alive e backup | **OBEDECIDO nos quatro lados** | `02` tabela de rotinas: "`backup_semanal` \| **duas vezes por semana, domingo e quarta** \| **GitHub Actions**", seguida de "**Não existe rotina `cron_keepalive`, e nenhuma rotina é criada só para manter o banco acordado.**". F53: "Roda **duas vezes por semana, domingo e quarta** [...] **não existe rotina `cron_keepalive`**: a entrega chama-se `backup_semanal`". F54: "**Não existe rotina `cron_keepalive`** [...] A entrega no backlog chama-se `backup_semanal`, na M1, e não tem sexta rotina dentro dela". `04`, entrega de backup: "**Não existe rotina `cron_keepalive`**, e nenhuma rotina é criada só para manter o banco acordado". Definição de pronto: "Nenhuma rotina `cron_keepalive` existe" |
| **C7** | Turno | **OBEDECIDO nos quatro lados** | `02` F21: "O corte por turno, quando existir, é **faixa horária sobre `dia_operacional`** (até 20h30, depois de 20h30) [...] Esta definição é a mesma em F39 e F41, e nenhuma outra definição de turno existe no repositório". F39: "a chave de junção é o **dia operacional**, e nada além dele. Se um dia a junção descer para turno, o turno é o de F21". F41: "A junção é por **dia operacional** [...] Não existe junção por turno no MVP". `04`, cruzamento satisfação x faturamento: "**Junção por `dia_operacional`, nunca por comanda**, e ponto. Não existe junção por turno". A frase "possivelmente data mais turno" **não existe mais** em `04` (ver ressalva 2 da seção 3) |
| **C8** | Google e iFood: somente link | **PARCIAL** | Obedecido: `01` bloco E ("**nenhuma linha deste grid promete leitura de avaliação pública em fase alguma**"), `02` F51 ("**Nada de API do Google Business Profile e nada de API do iFood, nem no MVP nem na Fase 2**"), `04` corte 9 ("cobrindo três dos quatro itens pedidos no briefing"), `04` registro de `P7` como decisão tomada, e a ressalva do QR fixo escrita ao lado no corte 2 ("Enquanto não for conferido com a política na mão, este documento **não recomenda** o caminho"). **Falha:** o corte 4 de `04` ainda prescreve "Abrir a seção Avaliações do Portal do Parceiro uma vez por semana. Minutos, zero código, zero credencial para renovar", que é exatamente a tarefa recorrente que D3 eliminou e que `02` F51 já corrigiu. Correção aplicada de um lado do par e não do outro |
| **C9** | Supabase | **OBEDECIDO** | `02` F55: "Schema `experiencia` dentro de `NFe e Financeiro` (`rzrjdbnxhpwzqgqrlfwa`, `sa-east-1`)" e "Não existe ramo alternativo: a pergunta `P2` está respondida". `04`: seção "As quatro condições inegociáveis do schema" e seção "Não existe mais ramo alternativo" ("O desvio escrito para o caso de `P2` ser **não** [...] **saiu deste documento**"). As quatro condições aparecem íntegras nos dois documentos. Errata no topo de `00-sumario-executivo.md` ("**1. 'Criar a organização Supabase separada'** [...] **REVOGADO**") e de `07-matriz-features.md` ("**1. A linha 110 [...] classificada como MVP**"), e a própria linha 110 da matriz traz "**MVP. REVOGADO, ver 01-decisoes.md D2**" |
| **C10** | Retenção | **OBEDECIDO** | `02` F48: "**12 meses contados da última visita** (decisão D4)", "A **resposta da pesquisa** [...] é **mantida indefinidamente, desvinculada do contato**" e "o texto passa por **varredura de padrão** (telefone, e-mail, CPF)". `03` 2.7 item 5 repete as três metades com as mesmas palavras. `04`, entrega de `cron_retencao`: "D4 fechou o prazo, então a rotina **deixa de ser bloqueada por decisão pendente**". Definição de pronto cobra as três |
| **C11** | Faixa de confiança | **OBEDECIDO, e a aritmética continua fechando** | `02` F17: "calculada como **1,96 vezes o erro padrão**, com o erro padrão em `raiz((p_promotores + p_detratores - NPS²) / n)`. Conferência: n=50 dá erro padrão de 10,5 e faixa de ±20,5 pontos", mais a tabela "n=50 dá ±20,5 pontos; n=100 dá ±14,5; n=200 dá ±10,3" e a diferença mínima "**±29, ±20,5 e ±14,5 pontos** respectivamente". `03` 2.3 traz a mesma tabela por linha (50: 10,5 e ±20,5; 100: 7,4 e ±14,5; 200: 5,2 e ±10,3) e a regra "o intervalo multiplicado por raiz de 2". Reconferido aqui: 20,5 x 1,414 = 29,0; 14,5 x 1,414 = 20,5; 10,3 x 1,414 = 14,6. `04` I6 e a definição de pronto citam a tabela de ruído na ordem certa (±29 em n=50, ±20,5 em n=100, ±14,5 em n=200) |
| **C12** | Chamadas ao LLM | **OBEDECIDO nos dois documentos** | `02` F34: "cerca de 2 chamadas por dia, com teto de **10** em noite cheia. Menos de **0,1%** da cota diária gratuita do Groq [...] Este é o único número de volume de LLM do projeto, e ele vale igual em `03-superar.md`". `03` 2.6: "**cerca de 2 chamadas por dia, com teto de 10 em noite cheia** [...] **menos de 0,1% da cota diária gratuita**. É o mesmo número de F34 de `02-replicar.md`, e não existe outro". `02` F37 usa o mesmo número ("Com cerca de 2 chamadas por dia e teto de 10") |
| **C13** | Credencial de longa duração | **OBEDECIDO nos dois lados** | `02` F39: "Ela é uma **conta de serviço** com acesso somente leitura a **uma** pasta, nunca OAuth de usuário com refresh token, justamente para não repetir a fragilidade que fez o corte 3 de `04-cortar-e-backlog.md` recusar a API do Google Business Profile". `04` corte 3, em negrito no corpo do corte: "**A credencial do Drive é uma conta de serviço com acesso somente leitura a uma pasta, nunca OAuth de usuário com refresh token, exatamente para não repetir a fragilidade que faz este corte recusar a API do Google Business Profile.**" |
| **C14** | Destino do dump | **OBEDECIDO nos dois lados** | `02` F44: "**categorias de compartilhamento** (hospedagem, banco de dados, provedor de e-mail, serviço de IA e **o bucket privado de destino do `pg_dump` semanal**, F53)". `02` F53: "O dump conta como **compartilhamento de dado pessoal**: o destino entra nas categorias de compartilhamento do aviso de privacidade (F44) e no registro de operações (F59)". As duas pontas agora dizem a mesma coisa |
| **C15** | Pontos físicos de coleta: divergência a declarar | **OBEDECIDO** | `02`, seção "A divergência dos pontos físicos de coleta, declarada": "O briefing pede **4 ou mais pontos físicos** de coleta. O plano deste documento prevê **1 tablet em uso mais 1 de reserva**", com as duas opções, "mais 2 a 3 licenças de quiosque a **8,90 EUR** cada", "Preço dos tablets em BRL segue **NÃO VERIFICADO**" e "**A decisão precisa sair antes da viagem, não depois.**". A definição de pronto cobra "Decisão do proprietário sobre os pontos físicos de coleta registrada **antes da viagem ao Paraguai**", e a primeira entrega do backlog repete a condição |
| **C16** | Marcações do grid que precisam virar Parcial | **OBEDECIDO** | `01` bloco C, linha C5: "**Parcial** (dia da semana sem ressalva; o corte por faixa horária exige `n` de 20 por faixa no trimestre; nota do bloco)", com o limite detalhado na leitura do bloco. A legenda já foi ajustada junto: "**Parcial** é escopo reduzido decidido de propósito **ou** limite material assumido e declarado (B2, C5 e J8 são deste segundo tipo)" |

### 2.1 As conferências específicas pedidas, respondidas em uma linha cada

- **Pares nomeados pela folha.** F04 contra P15 contra 2.8: **iguais**. F42 contra definição de pronto contra a entrega de `item_cardapio`: **iguais**. Tabela de rotinas contra F53 contra F54 contra a entrega de backup: **iguais**. F21 contra F39 contra F41 contra a junção de venda: **iguais**. F53 contra F44: **iguais**. Nenhum par ficou corrigido de um lado só dentro da Etapa 3.
- **Expressões proibidas.** `cron_keepalive` só aparece precedido de "não existe". "M0" e "ponte" só aparecem em frases que declaram que deixaram de existir, que é o que a própria folha manda escrever. "Dia da troca", "100% dos itens do cardápio ativo casam" e "ramo alternativo de `P2`" não sobrevivem em lugar nenhum dos quatro documentos da Etapa 3. "Possivelmente data mais turno" saiu de `04`, mas sobreviveu em dois documentos da Etapa 2 (ressalva 2 da seção 3).
- **Tabela de deveres humanos.** **Seis linhas**, conferidas uma a uma: exportar o R3, informar `mesas_atendidas_dia`, trocar as perguntas em foco, anotar a nota de 4 pizzarias, testar a restauração do dump, manter a ficha técnica. O título e a definição de pronto dizem seis, e o texto registra a origem: "Eram sete até a decisão D3, que tirou daqui a tarefa semanal de abrir o Portal do Parceiro do iFood".
- **Fórmula da faixa de 95%.** Continua correta depois das edições, inclusive na multiplicação por raiz de 2 e na ordem dos três valores da tabela de ruído, conferida em `02`, `03` e `04`.
- **Contradição nova criada nesta rodada.** Nenhuma encontrada entre os quatro documentos da Etapa 3. As duas divergências que existem estão **declaradas de propósito** e nos dois lados: a restauração do dump (uma vez antes do go-live em F53, trimestral em `03` 2.7, com a composição escrita nos dois documentos e a linha na tabela de deveres) e o canal do alerta em tempo real (e-mail com push, ou Fase 3 sem tempo real, em F24 e na definição de pronto).

---

## 3. O que ainda falta, em ordem de importância

**1. `04-cortar-e-backlog.md`, corte 4 da seção 2, coluna "Substituto barato".** É a única falha de item da folha (C8).
Trecho exato a corrigir: "Abrir a seção Avaliações do Portal do Parceiro uma vez por semana. Minutos,
zero código, zero credencial para renovar." Ele contradiz `02` F51 ("Ler o Portal do Parceiro do iFood
**não** é dever recorrente deste MVP: a decisão D3 tirou essa tarefa da lista de deveres, e a leitura do
Portal fica sendo o que o proprietário já faz por conta própria, quando faz") e contradiz a própria
tabela de seis deveres. Enquanto ficar, o backlog cria de volta o sétimo dever que D3 cortou.

**2. `07-matriz-features.md`, linha 82 da matriz, e `05-integracoes.md`, seção do modelo de dados.**
Trecho exato: "A chave de junção é a data, **possivelmente data mais turno**. Não prometer junção por
comanda em tela nenhuma." É a frase que C7 mandou apagar, e ela sobreviveu porque a folha nomeou só o
`04`. A errata no topo da matriz cobre organização separada e leitura de avaliação pública, e **não cobre
turno**. Na mesma matriz, a brecha 12 da seção 6 ainda diz "com junção por data e turno declarada em
tela". Não é bloqueio da Etapa 4, é resíduo de documento da Etapa 2 que a folha da Etapa 3 vence, mas
que vai reabrir a discussão na primeira leitura desatenta.

**3. `07-matriz-features.md`, linha 76 da matriz e item 9 da seção 3.** Trecho exato: "Com **9 chamadas
por dia**, trocar de fornecedor custa uma linha de configuração" e "O volume é de cerca de **9 chamadas
por dia**, ou seja 0,06% da cota gratuita do Groq". C12 fixou "cerca de 2 chamadas por dia, com teto de
10" e "menos de 0,1%", e os dois documentos da Etapa 3 estão certos. Mesmo caso do item 2: resíduo de
Etapa 2 fora do alcance nominal da folha, e a errata da matriz não menciona.

**4. Referência por nome que não casa com o nome da entrega.** `02`, tabela de deveres, última linha:
"entrega `preencher_ficha_tecnica`, na M3 de `04-cortar-e-backlog.md`". No `04`, a entrega se chama
"**Preencher `pratos` e `prato_ingredientes`**". O marco está certo e a regra de C2 foi respeitada (nome
mais marco, nunca número), mas o nome citado não existe literalmente do outro lado. É a menor das quatro,
e a correção é escolher um nome só e usá-lo nos dois documentos.

**Observação que não é falha e fica registrada para não virar achado na Etapa 4.** `02` F11 manda
"**Arranque com 12 perguntas ativas, não 20**", enquanto `03` 2.4 monta as contas de cobertura sobre um
banco de 20 e fixa "**teto de 20 perguntas ativas**". As duas coisas convivem (12 no arranque, 20 no
teto), nenhuma folha canônica trata do ponto, e nenhum documento afirma o contrário do outro. Só não está
escrito em lugar nenhum que 12 é arranque e 20 é teto **da mesma escada**.

---

## 4. As perguntas que continuam dependendo do proprietário

Saíram desta lista, porque D1 a D4 as responderam: onde vive o schema da pesquisa (`P2`, respondida por
D2), o prazo de retenção de 12 ou 24 meses (`P3`, respondida por D4), "somente link" contra detecção de
divergência (`P7`, respondida por D3), o pedido de Basic API Access da Google (`G1`, encerrado por D3) e
cancelar antes ou depois de construir (respondida por D1).

Continuam abertas, em ordem de urgência:

1. **Para onde apontam hoje os QR por garçom, e o convite depende da nota? (`P1`)** É a única que pode
   estar impedindo dano em curso, e ela precede a reimpressão dos QR.
2. **Manter 1 tablet em uso mais 1 de reserva, ou os 4 pontos físicos do briefing?** Tem prazo próprio:
   precisa sair **antes da viagem ao Paraguai**, porque depois a compra sai da única janela prevista.
3. **Quem executa, com nome, cada um dos seis deveres humanos recorrentes, e quem responde quando o
   e-mail das 16h não chega dois dias seguidos.** Dever sem dono é dever cortado, e cortá-lo muda o que o
   painel consegue mostrar.
4. **Onde fica guardado o `pg_dump`: qual bucket, sob qual conta.** Sem destino nomeado, o
   `backup_semanal` não pode entrar no ar, porque leva a base de clientes inteira para fora do Supabase.
5. **A casa aceita um aparelho com push e som ligados durante o serviço?** É o que decide se o alerta com
   o cliente ainda na mesa existe no MVP ou só na Fase 3.
6. **Restauração do dump: uma vez antes do go-live, ou uma por trimestre?** A divergência está declarada
   nos dois documentos, e quem escolhe é quem paga a tarefa recorrente.
7. **Onde vive o app de reservas (`P4`).** Sem ela, toda a integração com o CRM de reservas fica fora, e
   qualquer afirmação sobre ela tem confiança baixa.
8. **Nome do produto e subdomínio (`P6`).** Precede o DNS, que precede SPF e DKIM, que precedem o digest
   das 16h chegar sem cair em spam.
9. **Prints das perguntas do Risposta e capacidade das 22 mesas (`P5`).** Calibragem, não bloqueio, mas os
   prints são o que transforma o risco de review gating em fato verificado.

Fora do proprietário, segue pendente apenas o bloqueio `A1`, as 8 perguntas ao suporte da Altec, que
melhora o sistema se responder bem e não trava nada.
