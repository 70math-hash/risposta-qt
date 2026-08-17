# Implantação e operação

**Data:** 17/08/2026 · **Escopo:** procedimento, não execução. **Nenhuma migration foi aplicada e nenhum DDL
foi executado para escrever este documento.** As catorze migrations que já existem em
`supabase/migrations/` são arquivo inerte no repositório até que a **condição 3 de `D2`** esteja cumprida:
`pg_dump` do projeto `NFe e Financeiro` feito, guardado fora do Supabase e **confirmado restaurável**. A
seção 2 é o procedimento dessa condição, e ela precede tudo.

**Precedência:** este documento é nível 5 da tabela da seção 10 de [`00-canonico.md`](00-canonico.md). Ele
não renomeia nada da folha canônica, não cria número novo e, onde precisou de um nome que a folha não tem,
o nome está marcado com a nota **nome novo, não consta na folha canônica** e listado na seção 11.

**A restrição que julga cada linha:** ninguém vai manter este sistema depois de pronto. Por isso todo
procedimento aqui tem que ser executável por quem não programa, com o aparelho ou o celular na mão, sem
perguntar nada a quem construiu. Onde isso não for possível, está escrito que não é.

**Uma regra de citação, e ela vale em todo o documento:** entrega se referencia por **nome e marco**, nunca
por número de posição. Os marcos são **M1 Coleta própria**, **M2 Decisão** e **M3 Recorrência**. `M0` não
existe (revogado por `D1`).

---

## 1. Ordem de implantação por marco

### 1.1 As quatro regras de ordem, antes da lista

1. **Nada toca o Supabase antes do `pg_dump`.** A entrega **`pg_dump` de `NFe e Financeiro` guardado fora
   do Supabase**, na **M1**, é a primeira que produz um artefato irreversível de valor, e ela precede a
   entrega **Schema `experiencia` criado por migration versionada, com RLS e papel sem escrita fora do
   schema**. Sem ela, o SQL fica no repositório e não sai de lá.
2. **As cinco entregas de pergunta vão na frente porque não custam nada e podem destravar tudo.**
   **Perguntar ao proprietário para onde os QR por garçom apontam hoje**, **Pedir por escrito ao fornecedor
   a exportação completa e a eliminação comprovada**, **Pedir a proposta comercial atual, item por item**,
   **Mandar as 8 perguntas ao suporte da Altec** e **Comprar os tablets e as licenças Fully Kiosk PLUS**
   saem no mesmo dia e o cronograma não espera resposta de nenhuma delas.
3. **Cada entrega tem uma prova de fora.** Prova é alguém com o sistema na mão respondendo sim ou não em
   menos de 5 minutos, sem perguntar nada a quem construiu. Entrega sem prova não é entrega, é intenção.
4. **Cada entrega tem um desfazer escrito antes de entrar.** Onde o desfazer é perda definitiva, está
   escrito com essas palavras, e é a razão de a ordem ser esta.

### 1.2 M1 Coleta própria

O marco entrega a coleta em tablet próprio com painel de leitura, e é o que o piso de aceite cobra.

| Entrega | O que entra no ar | Como se comprova que funcionou | O que se desfaz se der errado |
|---|---|---|---|
| **Comprar os tablets e as licenças Fully Kiosk PLUS, mais suporte de mesa com chave** | Nada no ar. Cinco aparelhos, 4 em uso e 1 de reserva, e 5 licenças a 8,90 EUR cada, 44,50 EUR no total (`N13`, `N14`) | Os 5 aparelhos passam no teste de aceite de aparelho da seção 4.5, um por um | Nada de software. O aparelho reprovado volta à loja se ainda estiver na viagem, e depois disso não volta: compra fora do Brasil não tem rede autorizada aqui, e o aparelho é consumível |
| **Perguntar ao proprietário para onde os QR por garçom apontam hoje** | Nada no ar | Resposta escrita, arquivada em `docs/`. Está **respondida** por `D6`: apontam direto para o Google, sem pergunta de nota no caminho, e portanto não existe review gating | Nada. É a única entrega que pode estar impedindo dano em curso |
| **Pedir por escrito ao fornecedor a exportação completa e a eliminação comprovada** | Nada no ar | E-mail enviado com data, e a resposta arquivada em `docs/`. Se o fornecedor não responder, o registro de que o pedido foi feito é o que importa | Nada. E o pedido vai **antes** de qualquer aviso de cancelamento, porque depois a alavanca desaparece |
| **Pedir a proposta comercial atual, item por item** | Nada no ar | Proposta arquivada em `docs/`. Não há multa e não há fidelidade, então a conversa é de graça | Nada |
| **Mandar as 8 perguntas ao suporte da Altec** | Nada no ar | As 8 perguntas enviadas, com a 6 pedida por escrito, e a data registrada | Nada. Nenhuma entrega deste documento espera resposta da Altec |
| **`pg_dump` de `NFe e Financeiro` guardado fora do Supabase** | Nada no ar. Um arquivo `.dump.age` em duas cópias offline | O procedimento inteiro da seção 2, incluindo a restauração num Postgres vazio com contagem de linhas por tabela conferida | **Nada se desfaz, porque nada foi alterado.** É o único passo do projeto cujo desfazer é não ter feito |
| **Schema `experiencia` criado por migration versionada, com RLS e papel sem escrita fora do schema** | O schema, as 26 tabelas, as views, as funções, os papéis e as políticas de RLS | `get_advisors` do Supabase sem alerta de segurança em aberto; nenhuma tabela do schema com RLS desligado; `INSERT` numa tabela fiscal com a credencial da aplicação **falha** | `drop schema experiencia cascade`, mais o `revoke` das cinco tabelas de custo em `public`. Nada em `public` é alterado por essas migrations, só concedido, então o desfazer não toca uma linha do sistema fiscal |
| **`backup_semanal` por GitHub Actions, rodando domingo e quarta, com restauração testada e log de execução no banco** | O workflow, o bucket privado no Backblaze B2 com lifecycle de 56 dias mais 1, e o par de chaves `age` | Dois objetos `.dump.age` de semanas diferentes no bucket, e **um deles restaurado num banco vazio** pelo procedimento da seção 8 | Desabilitar o workflow. Enquanto o digest das 16h não existir, isso deixa o banco sem escrita nenhuma e ele pausa em 1 semana, então o desfazer aqui tem prazo |
| **Modelo de dados com dois grãos, `dia_operacional` com corte às 6h e idempotência por UUID do cliente** | As tabelas de coleta e `fn_dia_operacional` | Resposta gravada às 00h40 de quarta aparece como **terça** no painel e no e-mail; busca no repositório por `criado_em::date` e `date(criado_em)` volta zero ocorrência fora de `fn_dia_operacional`; o mesmo `id` enviado 5 vezes não cria segunda linha | Migration nova, nunca edição da aplicada. Derrubar as tabelas de coleta apaga a série histórica inteira, que é o ativo que o projeto existe para preservar: fora de banco de ensaio, **não se desfaz** |
| **Catálogo de itens do cardápio, `item_cardapio`, com `prato_id` aceitando nulo** | A tabela e a aba de cardápio no painel | Toda pizza, entrada e sobremesa do cardápio atual cadastrada, com `grupo` e `ativo`, e `produto_nome_norm` **conferido contra um arquivo R3 exportado à mão**, de um mês qualquer. Item ativo que não aparece no R3 do período fica como `sem venda no período`, e isso **não reprova** | `delete` das linhas e `drop table`. Perda barata: é cadastro, e refazer é digitação |
| **Migrar as 74 linhas de `cliques_avaliacao` e semear a tabela `garcom`** | `convite_clique` com 74 linhas e `garcom` com uma linha por nome distinto | A conferência da seção 3.5: 74 na origem, 74 no destino, mais `criado_em` mínimo e máximo iguais | `delete from experiencia.convite_clique` e `delete from experiencia.garcom where pin like 'provisorio-%'`. **Seguro só enquanto `qt-avaliacoes` estiver ativo.** Depois de pausado, esta tabela é a única cópia do dado |
| **PWA de quiosque, telas `T0` a `T7`, em português e inglês** | A coleta própria, nos 5 aparelhos e no QR | O teste de aceite de aparelho da seção 4.5, nos 5 aparelhos, mais uma noite de serviço real | Reverter o deploy no Cloudflare Pages. O aparelho já instalado continua abrindo a versão em cache pelo service worker, então o desfazer não é instantâneo nos cinco de uma vez |
| **Reimpressão dos QR por garçom apontando para o PWA próprio** | Um QR por garçom ativo, impresso, com o PIN no link | O QR abre a `T1` em menos de 3 segundos em 4G, testado em três celulares diferentes, incluindo um iPhone antigo | Voltar a imprimir o QR antigo. E vale reler a ressalva: o gesto é o mesmo para o garçom, o destino não é o mesmo para o cliente, e a conversão do gesto reaproveitado é **DESCONHECIDA** |
| **Fila local com Background Sync e heartbeat do tablet** | `fila_resposta` no aparelho e as colunas de sinal em `dispositivo` | Três respostas com o Wi-Fi desligado, aceitas com a `T7` normal, e entregues sozinhas em menos de 2 minutos ao religar; aparelho desligado por um dia aparece nomeado no e-mail do dia seguinte | Nada se desfaz sem perder a proteção. Fila apagada com resposta pendente é a **única falha de coleta sem conserto** do desenho |
| **Antifraude e PIN tratado como dado da resposta** | A marcação de `suspeita`, o teto por dispositivo e a resolução de PIN no servidor | Segunda resposta da mesma mesa, no mesmo dia operacional, dentro de **20 minutos**, é aceita, agradecida e gravada com `suspeita = true`; PIN que não casa grava `garcom_reconhecido = false` e a resposta **entra** nos indicadores gerais | Migration nova. Desligar a marcação transforma o painel em decoração |
| **Banco de perguntas rotacionadas, com peso e foco do mês** | `pergunta_banco` com **12 ativas** e **2 a 4 em foco** | As sete regras de sorteio em código, conferidas por teste; nenhuma pergunta salva sem os dois idiomas | `update pergunta_banco set ativa = false`. Desfazer barato, e a pesquisa continua completa porque completa é a nota |
| **Instrumentação de tempo por tela e taxa de pulo** | `tela_evento` e as views de coleta | p90 do caminho sem digitação medido, e comparado com o teto de **45 segundos** | Parar de gravar `tela_evento`. Perde-se a única medida do teto de tempo |
| **LGPD do produto: aviso de três linhas, duas caixas com versão, contato opcional, link de exclusão** | `/privacidade`, as duas caixas na `T6`, `consentimento_texto` versionado | Consentimento dado, texto alterado, segundo consentimento dado, e as duas linhas apontando para versões diferentes | Não se desfaz. `consentimento_texto` é append-only, e apagar `consentimento` destrói a prova que se pede numa fiscalização |
| **`cron_retencao` com prazo de 12 meses contados da última visita** | A quarta rotina, mensal, dia 1, 05h | Cliente com `ultima_visita_em` antiga anonimizado, resposta preservada, e a varredura de padrão rodando sobre o texto aberto antes de ele ser tratado como dado não pessoal | Desabilitar o Cron Trigger. O que ele já apagou não volta: o job nunca faz `DELETE` na resposta, só `UPDATE` de campo pessoal para nulo, e o dump da semana é a rede embaixo |
| **Painel de leitura: n ao lado de todo número, faixa de 95%, distribuição, por área, por garçom trimestral, dia da semana, e exportar CSV e Excel** | As sete abas do painel e a exportação | Abre em menos de **3 segundos** em 4G no celular; todo número com `n` ao lado; corte com amostra abaixo de **20** escrito como `amostra insuficiente, n=x`; nenhuma nota média geral como indicador principal | Reverter o deploy. O painel é somente leitura, então o desfazer não custa dado |
| **Alerta ao gerente com mesa, hora, nota e fator, mais as regras de ronda e nada no tablet** | O disparo na gravação, para o e-mail dedicado do gerente | Nota 2 no tablet produz notificação visível e audível no aparelho do gerente **bloqueado e na tela inicial**, em menos de **30 segundos**; o tablet não emite som, não vibra e não muda de aparência | Desligar o envio. O alerta continua gravado em `alerta_detrator` e reaparece no bloco 2 do digest do dia seguinte |
| **Base de clientes com consentimento, dois administradores com 2FA e registro de tratamento** | `cliente`, `consentimento`, as duas contas e `docs/registro-tratamento.md` | Um contato deixado na `T6` chega à base com data, hora e versão do texto aceito; exatamente **2** contas de administrador, com 2FA ligado nas duas, conferido na tela de conta | Não se desfaz sem apagar dado pessoal com consentimento registrado, o que é pior que o problema que motivou o desfazer |
| **Cancelar a mensalidade e devolver o tablet locado** | Nada no ar. É a saída do fornecedor | A definição de pronto da seção 7 cumprida inteira, sem item pendente | **Não se desfaz.** É a única entrega irreversível do projeto, e é por isso que ela é a última. Ver a contradição de ordem da seção 1.5 |
| **Pausar `qt-avaliacoes` depois do dump conferido** | Nada no ar. Libera o segundo slot ativo da organização | Os cinco critérios da seção 3.6, todos cumpridos | Despausar o projeto pelo painel do Supabase. Reversível enquanto o Supabase mantiver o projeto pausado e não excluído, e por quanto tempo ele mantém é **NÃO VERIFICADO** |

### 1.3 M2 Decisão

O marco entrega o e-mail das 16h, a leitura de comentário e o cruzamento com o faturamento. É onde o
sistema deixa de ser coleta e passa a gerar decisão.

| Entrega | O que entra no ar | Como se comprova que funcionou | O que se desfaz se der errado |
|---|---|---|---|
| **Módulo único de LLM, classificação frase por frase, texto cru sempre guardado e nenhum identificador enviado** | `cron_classificador`, 07h, e `classificacao_texto` | Busca por `groq` no repositório volta ocorrência em **um** arquivo mais a variável de ambiente; um comentário com elogio e reclamação na mesma frase gera **duas** classificações, não uma média; o teste automatizado reprova payload com padrão de telefone brasileiro ou de e-mail | Desligar a rotina. `classificacao_texto` é **derivada e refazível do zero**, porque `resposta_texto.texto_cru` continua intacto. É a única tabela do schema que se pode apagar sem perda |
| **Digest das 16h com os oito blocos, cortes por papel, comparação contra o período anterior, "nada a relatar" e diagnóstico escrito** | `cron_digest_16h`, e com ele o keep-alive do banco e o único alarme do sistema | O e-mail chega em **três caixas diferentes em dois dias consecutivos**, com cortes diferentes para cozinha e salão; sai completo com a chave da IA apagada; dia fechado sai como `casa fechada` e dia de operação sem resposta sai como `nenhuma resposta coletada` | Desabilitar o Cron Trigger. **Consequência imediata:** o sistema perde o alarme e o keep-alive volta a ser o `backup_semanal`, duas vezes por semana. Desfazer isto é ficar cego |
| **Import do R3: watcher na pasta sincronizada mais botão de importar planilha, com o arquivo bruto salvo antes de parsear** | `watcher_drive` a cada 30 minutos, `/painel/importar`, `venda_produto_dia` e `execucao_importacao` | Reimportar o mesmo arquivo **5 vezes** não duplica faturamento; o botão funciona no celular com o mesmo parser; falha de leitura grava `status = erro` com a mensagem e **não** apaga o dado do dia anterior | Desligar o watcher e ficar só com o botão. O caminho manual é rede permanente, não muleta, e o arquivo bruto guardado na linha de `execucao_importacao` permite reprocessar depois de corrigir o parser |
| **Cruzamento satisfação x faturamento em nível de dia** | Bloco 7 do e-mail e a aba de tendência | Junção por `dia_operacional` escrita na tela; dia sem importação aparece como **lacuna explícita**, nunca como zero; nenhum gráfico insinuando causalidade | Esconder o bloco. Não custa dado |
| **Link para Google e iFood no painel** | Dois links | Os dois abrem em aba nova, e nenhuma avaliação pública é lida, guardada ou respondida pelo sistema | Remover dois links |
| **Reclamações por 100 unidades vendidas do prato, trimestral, mínimo de 3 eventos** | A aba de pratos com o denominador do PDV | Só aparece com **3 eventos** de reclamação e **30 unidades vendidas** no trimestre. Depende de um trimestre de dado acumulado, o que é calendário e não implementação | Esconder a coluna. O corte por contagem absoluta continua valendo |

### 1.4 M3 Recorrência

O marco entrega o diferencial nº 1 e o CRM. Nada aqui é obrigatório para cancelar a mensalidade, e isso é
declarado de propósito.

| Entrega | O que entra no ar | Como se comprova que funcionou | O que se desfaz se der errado |
|---|---|---|---|
| **Preencher `pratos` e `prato_ingredientes`** | Nada no sistema de experiência. É cadastro de ficha técnica, feito nas skills, que seguem separadas | `vw_custo_prato` devolve custo por prato numa data de referência, e o painel para de escrever `ficha técnica ausente`. **Enquanto o proprietário não confirmar a semântica de `rn`, `rendimento` e `rn_override` (`N46`), o painel escreve que o número não está conferido** | Nada do nosso lado: o schema `experiencia` **nunca** escreve nessas tabelas. Desfazer é trabalho de quem cuida da ficha técnica, no sistema dela |
| **Matriz de engenharia de cardápio com satisfação, margem de contribuição e CMV** | A leitura cruzada, sobre `vw_custo_prato` | Todo número reconferível por consulta, e a premissa de `N46` escrita na tela enquanto não for fato | Esconder a tela |
| **Descobrir onde vive o app de reservas** | Nada no ar | Resposta do proprietário registrada. Até ela, confiança **baixa** em qualquer afirmação sobre reservas | Nada |
| **Leitura do CRM de reservas, RFM por regra e detecção de saída do padrão** | Leitura, nunca escrita, do que a entrega acima encontrar | Cada regra escrita na tela, com o `n` ao lado | Desligar a leitura |
| **Campanha de aniversário e de retorno por e-mail, com analytics de conversão** | O primeiro disparo ao cliente | Consentimento próprio e destacado para promoção, que **não** reaproveita o aceite da pesquisa | Parar o disparo. O que já foi enviado não volta, e é por isso que a caixa de consentimento de promoção nasce junto com a campanha e não antes |
| **Código voluntário de 6 caracteres** | O reconhecimento do recorrente sem guardar telefone para essa finalidade | Uma segunda visita reconhecida sem nenhum dado pessoal novo | Parar de oferecer o código |
| **Relatório semanal e mensal com tendência trimestral e histórico acessível** | Dois e-mails a mais, no mesmo Resend | Cada número com `n` e faixa de 95% | Desabilitar |
| **Perguntas fixas em linguagem natural, com consulta escrita e revisada** | Um conjunto **fixo** de perguntas, com a consulta escrita e revisada por pessoa | Cada pergunta com a consulta ao lado, reconferível. **Texto livre virando SQL não entra, em fase nenhuma** | Remover a tela. É a primeira candidata a nunca ser feita, e está escrito no backlog |

### 1.5 A contradição de ordem que este documento fecha

O backlog põe a entrega **Cancelar a mensalidade e devolver o tablet locado** na **M1 Coleta própria**, e a
seção 4 de `01-grid-comparativo.md` cobra nela o **piso de aceite de vinte itens**. Mas dois dos vinte itens
do piso só existem depois de entregas da **M2 Decisão**:

| Item do piso | O que ele exige | Entrega que o satisfaz |
|---|---|---|
| `P6` Comentário aberto guardado íntegro e classificado por área | Um comentário com elogio e reclamação na mesma frase gerando **duas** classificações | **Módulo único de LLM, classificação frase por frase, texto cru sempre guardado e nenhum identificador enviado**, na **M2 Decisão** |
| `P9` Relatório diário por e-mail, às 16h, com destinatários editáveis | O e-mail chegando em três caixas em dois dias consecutivos, com cortes diferentes | **Digest das 16h com os oito blocos, cortes por papel, comparação contra o período anterior, "nada a relatar" e diagnóstico escrito**, na **M2 Decisão** |

**Quem se corrige:** o rótulo de marco da entrega de cancelamento, no backlog. O piso vem de `D1`, que é
nível 1 de precedência, e `D1` diz literalmente que o piso de aceite alto vale e que o cancelamento
acontece contra ele. Portanto **a ordem vence o rótulo**: o cancelamento é a última entrega executada do
projeto, depois das duas entregas da M2 acima, e o rótulo `M1` que ele carrega hoje é bookkeeping a
corrigir em `04-cortar-e-backlog.md`.

Duas consequências que ficam escritas para não serem descobertas como surpresa:

- **A sobreposição com o fornecedor atual é mais longa do que a M1.** `D1` já declarou o preço: 2 a 3 meses
  a mais de mensalidade, entre R$ 1.000 e R$ 3.000. Com o cancelamento depois de duas entregas da M2, esse
  intervalo é o piso e não o teto, e o número exato é **NÃO VERIFICADO** porque depende do calendário de
  construção, que o briefing declarou sem prazo.
- **O ensaio de aceite de três noites de serviço real acontece antes do e-mail de cancelamento**, com o
  e-mail das 16h saindo nos três dias seguintes. Isso só é possível depois da entrega do digest, o que
  confirma a ordem acima por um segundo caminho.

---

## 2. A primeira migração, passo a passo

### 2.1 Por que este é o passo de maior risco do projeto

O schema `experiencia` nasce **dentro do projeto que guarda o sistema fiscal da casa**: `NFe e Financeiro`,
ref `rzrjdbnxhpwzqgqrlfwa`, `sa-east-1`, Postgres 17, com `notas` (422 linhas), `itens_nota` (1.179),
`nota_duplicatas` (436), `insumos_master` (131), `historico_precos` (344), `fornecedores` (61), `alertas`
(36), `producao_ingredientes` (5), `pratos` (1), `prato_ingredientes` (0) e `sefaz_estado` (1). Três fatos
somados fazem deste o passo mais caro de errar:

1. **O plano gratuito do Supabase não tem backup nenhum** (`N21`). Não existe ponto de restauração
   automático para voltar.
2. **A restrição de uso da organização é aplicada a todos os projetos**, com HTTP 402 em toda a API. Uma
   consulta mal escrita da pesquisa é um problema do sistema fiscal também.
3. **Ninguém vai manter o sistema.** Um erro que só aparece meses depois não tem quem o reconheça.

Daí a condição 3 de `D2`, que não tem exceção: **`pg_dump` do projeto antes de qualquer migração.** Não
antes da primeira: antes de **qualquer** uma.

### 2.2 Passo 1. O `pg_dump` do projeto, antes de qualquer DDL

Este dump é **outro** dump, e a distinção importa. Ele não é o `backup_semanal`.

| | `pg_dump` da condição 3 de `D2` | `backup_semanal` |
|---|---|---|
| O que cobre | **O banco inteiro**, incluindo o sistema fiscal | Só o schema `experiencia`, com `--schema=experiencia` |
| Quem roda | O proprietário, à mão, da máquina dele | GitHub Actions, domingo e quarta, 04h |
| Com que credencial | A conta de administrador do Supabase (`S11`) | O papel `experiencia_dump` (`S7`) |
| Onde fica | **Duas cópias offline**, e nunca no bucket | Bucket privado no Backblaze B2 |
| Por quanto tempo | Indefinidamente, enquanto o schema estiver mudando | 8 semanas, por lifecycle (`N12`) |
| Para que serve | Voltar atrás no **sistema fiscal** se a migração der errado | Voltar atrás no **schema da pesquisa** |

**Onde o dump fica, e por que não vai para o bucket.** O bucket do B2 é para o dump do schema
`experiencia`. O dump do projeto inteiro carrega `notas`, `itens_nota` e `fornecedores`, que são dado fiscal
da casa sem finalidade declarada de sair do Brasil e sem base legal para essa localização. Portanto ele
fica em **duas cópias offline**: uma na máquina do proprietário e uma em disco externo guardado no cofre do
restaurante, as duas cifradas com a **mesma chave pública `age`** do projeto. A chave privada não existe em
plataforma nenhuma (`S10`), e é isso que faz as duas cópias serem inúteis para quem as achar.

**O que vai para o repositório:** só a nota de que o dump existe. Um arquivo de texto em `docs/` com a
data, a hora em UTC, o tamanho em bytes e o `sha256` do arquivo cifrado. **O dump nunca entra no
repositório, em nenhuma forma.**

Os comandos, do lado de fora do Supabase, com o cliente Postgres **na versão 17**, fixada e não herdada:

```bash
# 1. A versão do cliente tem de casar com a do servidor. Divergência aqui é um dos dois
#    modos de morte mais provaveis de qualquer dump deste projeto.
pg_dump --version   # tem de dizer 17

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARQ="nfe-financeiro-$STAMP.dump"

# 2. O dump do projeto INTEIRO. Sem --schema, de propósito: é o sistema fiscal que se
#    quer poder restaurar. --no-owner e --no-privileges para restaurar em banco vazio
#    sem depender de os papéis do projeto de origem existirem no destino.
pg_dump --no-owner --no-privileges --format=custom --compress=9 "$SUPABASE_DB_URL" > "$ARQ"

# 3. Dump minúsculo quase sempre é conexão que abriu e não trouxe nada, o que é pior que
#    falhar, porque passa por sucesso.
stat -c%s "$ARQ"

# 4. Cifra com a chave pública age. O arquivo em claro sai do disco em seguida.
age -r "$AGE_PUBLIC_KEY" -o "$ARQ.age" "$ARQ"
sha256sum "$ARQ.age"
shred -u "$ARQ" 2>/dev/null || rm -f "$ARQ"
```

### 2.3 Passo 2. Confirmar que o dump é restaurável, e não só que existe

**Dump que ninguém testou não é backup.** A confirmação tem quatro passos, e o terceiro é o único que
prova algo:

1. **Ler o índice do arquivo, sem restaurar nada.** `age -d -i <chave-privada> "$ARQ.age" | pg_restore
   --list` tem que listar as onze tabelas de `public` pelo nome. Se o comando falhar aqui, o problema é a
   cifragem ou o formato, e não custou nada descobrir.
2. **Restaurar num Postgres 17 vazio, local, em contêiner.** Nunca no Supabase, e nunca por cima de nada.
3. **Contar linha por tabela e comparar com a origem, no mesmo dia.** Este é o critério de sucesso, e ele é
   objetivo:

   | Tabela em `public` | Linhas lidas em 13/08/2026 | Critério |
   |---|---|---|
   | `notas` | 422 | Igual à origem **no momento do dump**. O número de 13/08 é referência de ordem de grandeza, não alvo: o sistema fiscal continua ingerindo nota |
   | `itens_nota` | 1.179 | idem |
   | `nota_duplicatas` | 436 | idem |
   | `insumos_master` | 131 | idem |
   | `historico_precos` | 344 | idem |
   | `fornecedores` | 61 | idem |
   | `alertas` | 36 | idem |
   | `producao_ingredientes` | 5 | idem |
   | `pratos` | 1 | idem |
   | `prato_ingredientes` | 0 | **Zero é o valor correto**, e um dump que trouxesse linha aqui seria o sinal de que o arquivo não é deste banco |
   | `sefaz_estado` | 1 | idem |

   A leitura da origem se faz na mesma sessão em que o dump é tirado, e as duas contagens ficam na nota em
   `docs/`, uma ao lado da outra. **Contagem que não bate reprova o dump, e a migração não começa.**
4. **Registrar quem restaurou, quando, e quanto tempo levou.** O tempo importa porque ele é o que alguém
   vai precisar saber no dia em que a restauração for de verdade, e nesse dia ninguém vai querer descobrir.

### 2.4 Passo 3. O ensaio local, que é o mesmo exercício de graça

O repositório já traz o ensaio, e ele não fala com o Supabase:

```bash
scripts/ensaio.sh          # recria o banco de ensaio e aplica TODAS as migrations em ordem
```

O script semeia a estrutura das cinco tabelas de custo em `public` (de
[`12-schema-custo-inspecao.md`](../pesquisa/dados/12-schema-custo-inspecao.md), lida por
`information_schema`) e aplica as catorze migrations com `ON_ERROR_STOP=1`. Ele já pagou por si: achou
`round(double precision, int)`, que não existe em Postgres, e uma tabela `temporary ... on commit drop`
destruída por autocommit antes do `insert` seguinte. **As duas derrubariam a aplicação em produção e são
invisíveis para qualquer outro teste do projeto**, porque `tsc --noEmit` e os testes de contrato não
executam uma linha de SQL.

A economia elegante, já registrada na seção 7.2 de [`01-arquitetura.md`](01-arquitetura.md): restaurar o
dump num banco vazio **é** montar o ambiente de teste. Uma obrigação de sobrevivência paga um ambiente de
desenvolvimento, e nenhuma das duas custa slot de projeto, cartão de crédito nem plataforma nova.

**Uma coisa que o ensaio local não cobre, e que precisa estar dita:** `vw_custo_prato` contra as tabelas de
custo **reais**. Para isso existe o schema de ensaio `experiencia_ensaio`, criado e derrubado por migration
no mesmo projeto, que nunca recebe dado pessoal de cliente e nunca é lido pelo painel.

### 2.5 Passo 4. A aplicação, na ordem, uma migration por vez

Ordem literal, que é a ordem alfabética do nome do arquivo e é a ordem de dependência:

| # | Arquivo | O que ele põe no banco |
|---|---|---|
| 1 | `20260817090000_cria_schema_experiencia.sql` | O schema, os papéis, os privilégios padrão e o `SELECT` nas cinco tabelas de custo |
| 2 | `20260817091000_cria_funcoes_imutaveis.sql` | `fn_dia_operacional`, `fn_faixa_nps` e a validação de fator. Precede as tabelas porque a coluna gerada e os `CHECK` as usam |
| 3 | `20260817092000_cria_tabelas_cadastro.sql` | `garcom`, `mesa`, `dispositivo`, `item_cardapio`, `pergunta_banco`, `destinatario`, `mesa_atendida_dia`, `calendario_operacao`, `configuracao` |
| 4 | `20260817093000_cria_tabelas_coleta.sql` | `resposta` e as seis filhas, mais `tentativa` |
| 5 | `20260817094000_cria_tabelas_cliente_lgpd.sql` | `consentimento_texto`, `cliente`, `consentimento`, `exclusao_pedido` |
| 6 | `20260817095000_cria_tabelas_pdv.sql` | `execucao_importacao` e `venda_produto_dia` |
| 7 | `20260817096000_cria_tabelas_operacao.sql` | `execucao_rotina`, `alerta_detrator`, `classificacao_texto` |
| 8 | `20260817097000_cria_tabela_convite_clique.sql` | `convite_clique`, só a estrutura |
| 9 | `20260817098000_cria_funcoes_experiencia.sql` | `fn_casa_abre`, `fn_sorteia_pergunta`, `fn_grava_resposta`, `fn_registra_sinal` |
| 10 | `20260817099000_cria_views_painel.sql` | As dezoito views de painel |
| 11 | `20260817100000_cria_view_custo_prato.sql` | `vw_custo_prato`, com `WITH RECURSIVE` |
| 12 | `20260817101000_cria_views_exportacao.sql` | As seis views de exportação |
| 13 | `20260817102000_cria_rls_experiencia.sql` | RLS habilitado nas 26 tabelas e as políticas |
| 14 | `20260817103000_semeia_convite_clique.sql` | As 74 linhas e a semente de `garcom`. É a única que move dado, e é a última de propósito |

Quatro regras que valem em toda a aplicação:

1. **Uma por vez, lendo a saída de cada uma antes de aplicar a seguinte.** Aplicar as catorze de uma vez
   economiza minutos e custa a informação de qual delas falhou.
2. **`DDL ad hoc pelo painel do Supabase` é expressão proibida.** Condição 2 de `D2`. O repositório é a
   única fonte de schema.
3. **Migration aplicada nunca é editada.** Correção é migration nova, com nome que diz o assunto.
4. **A décima quarta falha de propósito** enquanto o bloco gerado estiver vazio, com a mensagem dizendo o
   que fazer. Isso é garantia, não defeito: sem ela, aplicar o arquivo como está no repositório deixaria
   `convite_clique` vazia com aparência de migrada.

### 2.6 Passo 5. A conferência depois, e o que ela tem que provar

| Conferência | Como se faz | O que reprova |
|---|---|---|
| Nada nasceu em `public` | Listar as tabelas do schema `public` e comparar com as onze da inspeção | Qualquer tabela nova em `public` |
| Nenhum nome no plural em `experiencia` | Busca por nome de tabela do schema | Um plural. `mesa_atendida_dia` foi o último que sobrava, e com ele fora isto é invariante conferível |
| O papel da aplicação não escreve fora do schema | `INSERT` numa tabela fiscal com a credencial da aplicação | O `INSERT` **passar**. Ele tem que falhar, e isso é critério de aceite |
| RLS em todas as 26 | `get_advisors` do Supabase, mais uma consulta ao catálogo | Uma tabela com RLS desligado |
| O corte do dia | Os cinco casos de borda da seção 4.6 da folha canônica, um por um | Quarta 00h40 não devolver terça |
| A chave de serviço fora do bundle | Buscar a chave no JavaScript servido, e `set role anon; select 1 from experiencia.resposta;` | Achar a chave, ou o `select` não devolver `permission denied` |
| O sistema fiscal intacto | As onze contagens de `public`, iguais às de antes da migração | Qualquer diferença. Nenhuma migration deste conjunto escreve em `public` |

### 2.7 O desfazer, e o que não se desfaz

O desfazer completo da primeira migração é uma linha, e ela é segura porque nenhuma das catorze migrations
altera `public`:

```sql
drop schema experiencia cascade;
-- mais o revoke das cinco tabelas de custo e o drop dos papéis, como está escrito no
-- cabeçalho de 20260817090000_cria_schema_experiencia.sql
```

**O que não se desfaz, e por isso a ordem é esta:**

- **Depois que a primeira resposta real entrar**, derrubar as tabelas de coleta apaga a série histórica, que
  é o ativo que o projeto existe para preservar. Daí em diante, correção é migration nova.
- **Depois que o primeiro consentimento entrar**, apagar `consentimento` destrói a prova que se pede numa
  fiscalização.
- **Depois de `qt-avaliacoes` pausado**, `convite_clique` é a única cópia das 74 linhas.

---

## 3. A migração das 74 linhas de `cliques_avaliacao`

### 3.1 O que as 74 linhas são, e o que elas não são

Origem: `public.cliques_avaliacao`, no projeto `qt-avaliacoes` (`helinoirdizwrluydkzp`, `us-east-1`), com
RLS habilitado. Colunas: `id` bigint identity, `garcom` text, `criado_em` timestamptz, `user_agent` text
nullable, `referrer` text nullable.

**Não existe coluna de nota, de comentário, de mesa nem de comanda.** Portanto isto não é pesquisa de
satisfação: é medição de clique num convite. É o **único** dado histórico a migrar (`N40`), e não existe
quarto ativo: a ponte de coleta saiu do escopo com `D1`, e `pizzapp_receitas` (8 linhas) é de outro
produto, contexto de curso, e não se migra.

A consequência de leitura, que vale mais que a migração em si: as 74 linhas servem de linha de base de
**volume de convite aceito**, nunca de previsão de conversão da pesquisa nova. **A conversão do gesto
reaproveitado é DESCONHECIDA** (`D6`), e o painel mostra a série antiga separada da nova, rotulada
`convite`, nunca somada às respostas.

### 3.2 O mapeamento campo a campo

Destino: `experiencia.convite_clique`.

| Origem, `public.cliques_avaliacao` | Tipo | Destino, `experiencia.convite_clique` | Tipo | Regra |
|---|---|---|---|---|
| `id` | `bigint` identity | `id_origem` | `bigint` | **Preservado, e `UNIQUE`.** Existe para uma coisa só, e ela é obrigatória: conferir 74 na origem contra 74 no destino, linha a linha, antes de pausar o projeto |
| (não existe) | | `id` | `uuid` | Novo, `gen_random_uuid()`. Toda tabela do schema tem `id uuid` como chave primária, e **nenhum identificador vindo de fora é chave primária** |
| `garcom` | `text`, texto livre | `garcom` | `text` | **Cru, não normalizado, exatamente como está.** Não normaliza e não sobrevive a homônimo, e é por isso que ele não é a identidade |
| `garcom` | `text` | `garcom_id` | `uuid` nulo | **Resolvido** contra `garcom`, por comparação sem espaço e sem caixa. Nome que não casa fica nulo, e a linha continua migrada |
| `criado_em` | `timestamptz` | `criado_em` | `timestamptz` | **Preservado da origem, e não `now()`.** É a única exceção do schema ao significado de `criado_em` fixado na seção 3.2 da folha canônica, e ela é ordenada pela própria folha, que manda preservar `criado_em` das 74 linhas |
| (não existe) | | `migrado_em` | `timestamptz` | Novo, `now()`. É ele que guarda o instante da migração, que é o que `criado_em` guardaria em qualquer outra tabela |
| `user_agent` | `text` nulo | `user_agent` | `text` nulo | Preservado **apenas nestas linhas históricas** |
| `referrer` | `text` nulo | `referrer` | `text` nulo | idem |

**A segunda metade da migração:** a lista de valores distintos de `garcom` vira semente da tabela `garcom`,
com `ativo = false` e PIN provisório. Não há como inventar o PIN real de ninguém, e garçom inativo com PIN
não numérico **nunca casa com digitação na `T0`**, então nenhuma resposta nova é atribuída por acidente. O
proprietário edita nome, PIN e `ativo` na tela de administração, e só então a atribuição passa a valer.

### 3.3 Os campos sem destino, e o que se faz com cada um

| Caso | O que se faz | Por quê |
|---|---|---|
| **Nada da origem fica sem destino** | As cinco colunas da origem estão mapeadas, e duas colunas novas aparecem no destino | Interpretar na exportação é como se perde a única cópia de um histórico. O script transcreve, não interpreta |
| **Nenhum campo da origem tem destino em `resposta`** | Nada é gravado em `resposta` nem em nenhuma filha dela | Não existe nota, comentário, mesa nem comanda na origem. Migrar clique para dentro de `resposta` inflaria a contagem de respostas com um gesto diferente, e o painel passaria a mentir por construção |
| **`user_agent` e `referrer` nas linhas novas** | **Não existem.** Nenhuma coluna de `user_agent` em `resposta` | No tablet próprio eles não informam nada e são superfície de dado sem uso. Isso é decisão de desenho, e é o oposto de `fingerprinting` do celular do cliente, que é expressão proibida |
| **`garcom` como identidade permanente** | Descartado como identidade. Preservado como texto | Texto livre não normaliza. A identidade é `garcom_id`, e o que foi digitado fica em `garcom_pin_digitado` |
| **`id` bigint como chave** | Descartado como chave primária, preservado em `id_origem` | Trocar de origem precisa custar um adaptador, nunca a reescrita do histórico |
| **`pizzapp_receitas`, 8 linhas** | **Não se migra.** Nenhuma referência a ela no schema novo | É de outro produto, ligado à marca pessoal do pizzaiolo, e não tem relação com experiência do cliente |

### 3.4 O passo que falta, e ele é um arquivo

Os dois projetos estão em regiões diferentes e **não existe conexão entre eles**: nenhum `SELECT` da
migration alcança `qt-avaliacoes`. As 74 linhas entram como literais, embutidas no bloco marcado da
migration de semente por `scripts/exporta_cliques_avaliacao.mjs`, que lê a origem por REST com chave de
leitura e escreve os `insert`, um por linha.

**Esse script ainda não existe no repositório.** É a única peça que separa a migração de estar pronta, e
sem ele a migration de semente falha de propósito, com a mensagem `As 74 linhas nao foram embutidas neste
arquivo`. O ensaio local **testa essa falha**, o que é o inverso do normal: ali a migration **tem** de
falhar, e com a mensagem certa.

### 3.5 Como se confirma integridade

A conferência está dentro da própria migration, num bloco que derruba a transação inteira se algo não
bater. Quatro travas, em ordem:

| Trava | O que ela dispara | Por que existe |
|---|---|---|
| Bloco gerado vazio | Exceção dizendo para rodar o script de exportação | Aplicar vazio deixaria `convite_clique` vazia **com aparência de migrada**, que é o pior resultado possível |
| Contagem embutida diferente de **74** | Exceção nomeando o número encontrado | `N40` diz 74. Se vier outro número, ou a origem mudou depois de 13/08/2026, ou a exportação truncou. Nos dois casos se confere antes de seguir |
| Contagem do destino diferente da origem | Exceção com os dois números e a frase `Nao pausar qt-avaliacoes` | É a quarta condição inegociável de `D2`, escrita no lugar onde ela é executada |
| Reaplicação | `on conflict (id_origem) do nothing`, e o PIN provisório deslocado pela contagem já existente | Reaplicar não dobra as 74 linhas nem colide com um `provisorio-1` gravado na primeira passada |

Além da contagem, a migration imprime `criado_em` **mínimo e máximo** e o número de linhas sem `garcom_id`
resolvido. A contagem sozinha não prova que nada foi truncado no meio da série; os dois extremos provam.

**A conferência manual que fecha o ciclo, e ela é humana:** abrir a origem em `qt-avaliacoes`, ler as três
mesmas medidas (contagem, mínimo e máximo de `criado_em`) e comparar com o que a migration imprimiu. As
duas leituras ficam registradas em `docs/`, lado a lado, com data.

### 3.6 O critério para pausar o `qt-avaliacoes`

Cinco condições, todas obrigatórias, e a ordem é a ordem:

1. **O `pg_dump` do projeto `NFe e Financeiro` feito, guardado fora do Supabase e confirmado restaurável**
   pelo procedimento da seção 2.3. Condição 3 de `D2`.
2. **As 74 linhas migradas**, com a contagem, o mínimo e o máximo de `criado_em` conferidos **na origem e no
   destino**, e as duas leituras registradas em `docs/`. Condição 4 de `D2`.
3. **A semente de `garcom` conferida:** todo valor distinto de `garcom` das 74 linhas tem uma linha em
   `garcom`, e nenhuma delas está `ativo = true` com PIN provisório.
4. **Um `pg_dump` do próprio `qt-avaliacoes`**, cifrado com `age` e guardado junto do dump do projeto
   fiscal. Ele custa minutos e é a única forma de a pausa ser reversível se o Supabase mudar de política
   sobre projeto pausado, o que é **NÃO VERIFICADO**.
5. **Nenhum sistema apontando para lá.** `pizzapp_receitas` (8 linhas) vive nesse projeto e é de outro
   produto. Pausar o projeto para o QT **para também o QT PizzApp**, e isso precisa ser decidido pelo
   proprietário antes da pausa, não descoberto depois. **Esta condição não está escrita em nenhum documento
   anterior, e é o motivo de ela aparecer aqui.**

O ganho, para ficar claro o que se compra: o segundo slot ativo da organização, que permite trazer `Fichas
Sensoriais` de volta do estado inativo.

---

## 4. Provisionamento dos 5 tablets

São **5 aparelhos, 4 em uso e 1 de reserva** (`N13`, `D5`), e **5 licenças Fully Kiosk PLUS a 8,90 EUR cada,
pagamento único, 44,50 EUR no total** (`N14`). Preço do tablet em BRL: **NÃO VERIFICADO**, para cotar no
ato, com a única referência independente sendo cerca de 180 EUR por unidade (`N15`).

### 4.1 O checklist de compra na loja, no Paraguai

**Verificar no aparelho, na loja, antes de pagar.** Peça para ligar e olhe você mesmo, item por item:

1. **Configurações > Sobre o tablet > Versão do Android.** Precisa ser **13 ou superior**. **Olhe na tela do
   aparelho, não na caixa e não na palavra do vendedor.** É o item que mais separa um tablet que dura três
   anos de um que quebra o PWA no ano que vem, porque é dele que dependem o Chrome e o WebView atualizados,
   e é deles que dependem o service worker e o `IndexedDB` onde a fila local vive.
2. **RAM real em Configurações, não na caixa.** Mínimo **4 GB**. Abaixo disso o navegador é morto em
   segundo plano e o app recarrega no meio da resposta.
3. **Armazenamento: 64 GB.** A folga é irrelevante para o app, que pesa kilobytes, e serve para outra
   coisa: despejo de dados por pressão de disco apaga o origin inteiro de uma vez, e disco folgado é a
   prevenção mais barata contra a única falha de coleta sem conserto.
4. **Play Store > Configurações > Sobre > Certificação do Play Protect.** Precisa dizer que o dispositivo é
   **certificado**. Aparelho não certificado dá problema para instalar e atualizar o Chrome, e é o risco
   típico de marca desconhecida no mercado cinza.
5. **Fixação de app existe no menu?** Configurações > Segurança > Fixação de app. **Se o fabricante removeu,
   o plano gratuito de quiosque morre ali**, e com ele a etapa 8 da seção 4.3.
6. **Fonte de 100 a 240 V.** O carregador tem de servir na tomada daqui. Está escrito em letra miúda na
   própria fonte, e é onde se olha.
7. **Tela: toque nos cantos e nas bordas.** É o defeito mais comum e o mais difícil de resolver depois.
8. **Tela de 10 a 11 polegadas.** O cliente lê sentado, com o aparelho na mesa. Oito polegadas funciona e é
   apertado para os onze botões de nota lado a lado, em duas fileiras de 6 e 5, com **60 a 80 px de lado**.

**O que evitar, e isto é julgamento de engenharia, não fonte publicada:**

- **Android Go em qualquer aparelho.** A própria Fully documenta que derivados como Android Go, **Fire OS**
  e **Chrome OS** podem ter conjunto de recursos restrito ou problemas sérios, e a RAM desses aparelhos não
  sustenta o navegador.
- **Fire OS e Chrome OS**, pelo mesmo texto da Fully. Nenhum dos dois é Android de verdade para este uso.
- **Marca que você nunca viu**, mesmo com especificação boa no papel. Sem certificação do Play e sem
  atualização, o tablet é descartável.
- **Modelo de 2 GB de RAM**, por mais barato que esteja.
- **Contar com garantia.** Compra fora do Brasil não tem rede autorizada aqui. Trate os cinco aparelhos como
  consumíveis, e é mais um argumento para levar todos na mesma viagem.
- **Regras de bagagem e cota do viajante: NÃO VERIFICADAS** neste documento. Confira na Receita Federal
  antes de viajar, porque isso é sobre dinheiro e não sobre tecnologia.

**O que se compra junto:** 4 suportes de mesa com chave e cabo de segurança, e 1 estação de carregamento de
cinco portas. Os dois preços são **NÃO PESQUISADO**. Os suportes existem porque cinco aparelhos são cinco
superfícies de perda física, e a estação existe porque carregar cinco aparelhos entra na rotina de
fechamento de caixa, e aparelho descarregado é indistinguível de aparelho quebrado sem heartbeat por
dispositivo.

### 4.2 Passo a passo, por aparelho

Treze passos, na ordem, um aparelho de cada vez. A ordem entre o passo 8 e o passo 9 não é preferência: é a
seção 4.4.

1. **Carregar até 100%** e conferir que o aparelho carrega com a fonte que veio dele, na tomada da casa.
2. **Ligar, escolher português, conectar no Wi-Fi da casa.** Nunca no Wi-Fi de visitante, que costuma ter
   portal e expiração.
3. **Entrar com a conta Google da casa, nunca com a conta pessoal do proprietário.** Ela existe para uma
   coisa só: atualizar o Chrome e o WebView pela Play Store. Por qual caminho a licença Fully Kiosk PLUS é
   comprada (pela Play Store ou pelo site do fabricante) é **NÃO VERIFICADO**, e o preço de 8,90 EUR por
   aparelho, pagamento único, é o mesmo nos dois casos.
4. **Reconferir na tela, agora com calma, os itens 1, 2, 3 e 4 do checklist de loja.** Versão do Android,
   RAM, armazenamento, certificação do Play Protect. Aparelho que reprovar aqui não recebe licença e não
   entra em serviço.
5. **Atualizar o Chrome e o Android System WebView pela Play Store, e só então testar o PWA.** WebView
   velho quebra service worker e `IndexedDB`, e é a causa de falha mais provável num aparelho de entrada.
6. **Desligar tudo que interrompe o cliente:** notificações de todos os aplicativos, som do sistema,
   vibração, rotação automática (travar na orientação que o PWA usa), economia de bateria agressiva para o
   navegador, e atualização automática de aplicativo no horário de serviço. Deixar a tela acordada enquanto
   carrega. Nada disso é preciosismo: o tablet **não emite som e não vibra em nenhum momento do fluxo**, e
   uma notificação do sistema em primeiro plano reprova o aceite.
7. **Abrir o PWA no Chrome, na URL do quiosque, e instalar na tela inicial.** Conferir que ele abre em tela
   cheia, sem barra do navegador, e que o contador `X respostas aguardando envio` aparece na `T0`, **mesmo
   quando é zero**.
8. **Ativar a fixação de tela nativa do Android** (Configurações > Segurança > Fixação de app), fixar o PWA,
   e conferir que sair do app **exige o PIN do aparelho**. Este passo é gratuito, imediato, e é o que prova
   que o aparelho serve.
9. **Só agora instalar e licenciar o Fully Kiosk PLUS**, 8,90 EUR, pagamento único, e configurar: URL
   inicial, **boot on start**, bloqueio da barra de status, e o PIN de configuração do quiosque (`S12`), que
   vive no gerenciador de senhas do proprietário mais um cartão no cofre.
10. **Registrar o aparelho em `dispositivo`**, pela aba de administração do painel: `apelido` e `uso`
    (`em_uso` ou `reserva`). Nada de `insert` à mão.
11. **Etiquetar o aparelho fisicamente com o mesmo apelido**, em etiqueta que não descole. O e-mail das 16h
    nomeia o aparelho pelo apelido, e etiqueta é o que liga o nome do e-mail ao objeto na mão de quem vai
    consertar.
12. **Prender no suporte com chave e cabo** (os 4 em uso) ou **guardar carregado na estação** (a reserva).
13. **Rodar o teste de aceite de aparelho da seção 4.5, inteiro.** Aparelho que não passa nos oito itens não
    entra em serviço.

### 4.3 Os apelidos, e o registro em `dispositivo`

`dispositivo` tem `apelido`, `uso`, `ultimo_sinal_em`, `fila_pendente`, `versao_app`, `criado_em` e
`removido_em`. A folha canônica não fixa valor de `apelido`, então esta é uma **proposta de valor**, marcada
como **nome novo, não consta na folha canônica**:

| `apelido` | `uso` | Etiqueta física |
|---|---|---|
| `aparelho_1` | `em_uso` | aparelho 1 |
| `aparelho_2` | `em_uso` | aparelho 2 |
| `aparelho_3` | `em_uso` | aparelho 3 |
| `aparelho_4` | `em_uso` | aparelho 4 |
| `aparelho_reserva` | `reserva` | reserva |

Três razões para o apelido ser número e não lugar: o aparelho circula com o garçom e não fica num ponto
fixo, então `salao` ou `varanda` mentiria em uma semana; `T1` a `T4` colidiria com o nome das telas do
questionário, e ler `T1 está mudo` num e-mail sobre a tela da nota é o tipo de confusão que custa uma hora;
e número casa com etiqueta física, que é o que a pessoa tem na mão.

**Troca de aparelho é duas linhas, e as duas importam:** o aparelho novo entra com `uso = em_uso`, e o morto
recebe `removido_em`. **Nunca se apaga a linha**, porque as respostas antigas continuam apontando para ela.

### 4.4 Por que a fixação nativa vem antes da licença paga

Elas não são alternativas, são etapas, e a ordem compra duas coisas:

1. **A fixação nativa é o teste do aparelho.** Ela é gratuita, está no item 5 do checklist de loja, e se o
   fabricante a removeu do menu, o aparelho não serve. Descobrir isso **antes** de pagar 8,90 EUR e antes de
   colocar o aparelho em serviço é o objetivo.
2. **A licença paga compra uma tarefa humana a menos, não uma trava melhor.** O que ela adiciona é o **boot
   on start**: o aparelho reabre o app sozinho depois de reiniciar. Sem isso, alguém reabre e refixa o app
   em **cinco** aparelhos a cada queda de energia e a cada atualização de sistema, e é exatamente o tipo de
   tarefa que ninguém faz. Trocar uma tarefa humana recorrente por um pagamento único é o melhor negócio
   disponível neste projeto, e com cinco aparelhos a licença deixou de ser conveniência e passou a ser
   necessidade (`D5`).

A fixação nativa continua ligada depois da licença. Ela não bloqueia notificação nem volume, e é por isso
que o passo 6 existe.

### 4.5 O teste que comprova que o aparelho está pronto

Oito itens, e o aparelho entra em serviço quando os oito passam. Tempo estimado: 15 minutos por aparelho.

| # | O que se faz | O que tem de acontecer |
|---|---|---|
| 1 | Desligar o Wi-Fi e responder **três** vezes, do começo ao fim | As três são aceitas, o cliente vê a `T7` normal, **sem nenhuma mensagem de erro**, e o contador da `T0` mostra três aguardando envio |
| 2 | Religar o Wi-Fi e não tocar em nada | As três chegam ao banco em menos de **2 minutos**, sem ação humana, e o contador volta a zero |
| 3 | Reiniciar o aparelho pelo botão, e não tocar em mais nada | O PWA reabre **sozinho** na `T0`, fixado. É isto que a licença paga compra, e é o único item que a fixação nativa não entrega |
| 4 | Tentar sair do app: gesto de início, de recentes, barra de status, botão de voltar | Não sai. Sair exige o PIN, e o cliente na mesa não alcança outra aba |
| 5 | Dar **nota 2** no aparelho | O aparelho **não emite som, não vibra e não muda de aparência**, e se comporta exatamente como com nota 10. E o alerta chega no aparelho do gerente, **bloqueado e na tela inicial**, em menos de **30 segundos** |
| 6 | Deixar o aparelho parado no meio do fluxo | O timeout de **45 segundos** reseta, com contagem visível nos **15 finais**, e a nota já dada é gravada |
| 7 | Percorrer as telas, medindo | Transição abaixo de **2 segundos**, **zero rolagem** em qualquer ponto, menor alvo de toque de **44 x 44 px**, botões de nota de **60 a 80 px** |
| 8 | Esperar até uma hora e abrir `/painel/saude` | O apelido certo aparece com `ultimo_sinal_em` recente e `versao_app` preenchida. Aparelho que não aparece aqui está mudo, e mudo é invisível no agregado quando os outros três coletam |

Um teste que **não** é por aparelho e vale a pena registrar junto: desligar um aparelho por um dia inteiro e
conferir que o aviso chega, nomeando o aparelho e a hora do último sinal, no e-mail do dia seguinte. É a
prova de que o heartbeat de **24 horas** funciona, e ela só se faz uma vez.

---

## 5. Runbook de operação

**Para quem não programa.** Uma página por situação. Nenhuma delas pede escrever código, e onde uma pede
abrir uma tela, a tela está nomeada.

Três coisas para ler antes de qualquer página, porque elas evitam a maior parte dos erros:

- **A coleta quase nunca é o problema.** Os aparelhos guardam a resposta dentro deles e a mandam sozinhos
  quando dá. Se algo quebrou, provavelmente foi o e-mail, o banco ou uma rotina, e **nada disso perde
  resposta**.
- **Um dia sem e-mail não é incidente. Dois dias seguidos é.** Essa é a regra única do sistema (`N42`).
- **Não mexa nos tablets para resolver problema de e-mail, de painel ou de banco.** Eles são a parte que
  está funcionando.

### 5.1 O e-mail das 16h não chegou hoje

**Sintoma.** Passou das 16h e o e-mail do dia não está na caixa. O painel abre normalmente, os tablets estão
coletando.

**Causa provável, em ordem de probabilidade.**

1. O e-mail caiu na pasta de spam. É a causa mais comum e a mais barata.
2. O provedor de e-mail (Resend) falhou no envio, ou a cota do dia estourou. O digest usa **5 e-mails por
   dia** de um limite de **100 por dia** e **3.000 por mês**, então cota estourada é improvável e possível.
3. A rotina do digest não rodou.
4. Os registros de DNS do subdomínio (SPF e DKIM) estão errados, e o e-mail está sendo recusado ou
   silenciosamente descartado.

**O que fazer, na ordem.**

1. **Abrir a pasta de spam e procurar.** Se estiver lá, marcar como "não é spam" e adicionar o remetente aos
   contatos. Isso resolve o caso e não resolve a causa: avise que o SPF e o DKIM precisam ser conferidos.
2. **Conferir se a casa estava fechada.** O e-mail sai **todo dia, inclusive segunda**. Em dia fechado ele
   diz `casa fechada`, e não deixa de sair.
3. **Abrir `/painel/saude` no celular** e olhar a última linha de `cron_digest_16h`:
   - **Consulta em `sucesso` e envio em `erro`:** é entrega de e-mail. O dado do dia está no banco, nada se
     perdeu, e a próxima execução tenta de novo sozinha.
   - **Nenhuma linha de hoje:** a rotina não rodou. Vá para a página 5.2 se isso repetir amanhã.
   - **As duas em `sucesso`:** o e-mail saiu e não chegou. É spam ou DNS.
4. **Não fazer mais nada hoje.** O dado do dia continua no banco, o painel mostra o mesmo número, e a
   próxima execução tenta de novo. Refazer o envio à mão não é procedimento deste sistema.

**Quando pedir ajuda.** Não hoje, salvo se o painel também não abrir, e nesse caso vá direto para a página
5.6. Se amanhã o e-mail também não chegar, a página é a 5.2 e a ajuda passa a ser imediata.

### 5.2 O e-mail das 16h não chegou dois dias seguidos

**Sintoma.** Dois dias, um atrás do outro, sem o e-mail das 16h, spam já conferido nos dois.

**Isto é o alarme do sistema.** Não existe outro, e é de propósito: alarme que exige alguém abrir uma tela
não é alarme. **Algo quebrou.**

**Causa provável, e cada uma tem uma assinatura diferente.**

| Assinatura | Causa | Onde ir |
|---|---|---|
| O painel **não abre** | O banco foi pausado por inatividade, ou a organização foi restrita com HTTP 402 | Página 5.6 |
| Chegou no seu e-mail um aviso automático do GitHub dizendo que um workflow falhou | O backup também parou. As duas coisas juntas são a assinatura da pausa do banco | Página 5.6 |
| O painel abre e mostra número de ontem, e **não** houve aviso do GitHub | O banco está vivo. Quem caiu foi a rotina, ou seja o Worker do Cloudflare | Passo 3 abaixo |
| O painel abre, `/painel/saude` mostra consulta em `sucesso` e envio em `erro` nos dois dias | É entrega de e-mail: chave do provedor, cota, ou SPF e DKIM | Passo 4 abaixo |

**O que fazer, na ordem.**

1. **Tentar abrir o painel no celular.** Esta é a pergunta que separa problema de banco de problema de
   rotina, e sem ela os passos seguintes são chute.
2. **Procurar no seu e-mail o aviso automático de workflow falho do GitHub.** Ele vem de outra plataforma, e
   é justamente por isso que serve: se o Cloudflare inteiro cair, o alarme dele cai junto, e esse aviso é o
   único sinal que sobra.
3. **Se o painel abre e não houve aviso do GitHub:** o problema é o Worker de rotina. Isso não se conserta
   sem quem construiu o sistema. **Pedir ajuda agora.** Enquanto isso, a coleta continua inteira e nada se
   perde: quando a rotina voltar, o digest do dia seguinte sai.
4. **Se é entrega de e-mail:** conferir a cota do dia no painel do provedor e os registros SPF e DKIM do
   subdomínio. Os dois são trabalho de uma vez, e são a diferença entre adoção e abandono na segunda semana.
5. **Não mexer nos tablets.** Eles estão coletando, e a fila local segura o que não sobe.

**Quando pedir ajuda.** **Imediatamente**, em dois casos: se o painel não abre (porque o sistema fiscal pode
estar afetado no mesmo evento) e se o passo 3 der Worker de rotina. Não existe contrato de suporte: quem
ajuda é o segundo administrador, e depois dele quem construiu o sistema.

### 5.3 Um tablet parou de responder

**Sintoma.** Uma linha em destaque no e-mail das 16h nomeia um aparelho e a hora do último sinal, acima de
**24 horas**. Ou alguém percebeu no salão que um aparelho está com a tela morta, ou fora do app, ou o
contador da `T0` está travado com fila pendente.

**Por que isto tem alarme próprio.** Com quatro aparelhos em uso, o aparelho mudo é **invisível no
agregado**: os outros três continuam coletando e o total do dia parece normal. É por isso que o e-mail lista
**cada aparelho pelo apelido, com a hora do último sinal**.

**Causa provável.**

| Sintoma fino | Causa |
|---|---|
| Tela apagada, não liga | Bateria, ou aparelho quebrado, ou furtado |
| Ligado, mas fora do app | Fixação de tela perdida, ou o quiosque não reabriu depois de reiniciar |
| No app, mas o contador de fila só cresce | Wi-Fi do aparelho caído, ou o Worker de escrita fora |
| No app, contador em zero, e mesmo assim sem sinal no painel | O aparelho está numa rede que não sai, ou o registro em `dispositivo` está com o apelido errado |

**O que fazer, na ordem.**

1. **Pegar o aparelho na mão.** Este diagnóstico não se faz de longe.
2. **Se está descarregado:** carregar, e revisar a rotina de fechamento. Carregar cinco aparelhos é gesto de
   fechamento de caixa, não tarefa de sistema, e aparelho descarregado é indistinguível de aparelho quebrado
   sem o heartbeat.
3. **Se está ligado e fora do app:** reabrir o app e reativar a fixação de tela. A licença paga reabre depois
   de reiniciar, então isso repetindo é sinal de que a licença não está configurada com **boot on start** no
   aparelho.
4. **Se o contador de fila está alto:** conferir o Wi-Fi do aparelho. Se o Wi-Fi está bom e a fila não
   desce, o problema é o Worker de escrita, e a coleta continua funcionando, porque a resposta é aceita no
   aparelho e não no servidor.
5. **Se o aparelho morreu de vez:** **pôr o de reserva em serviço**, registrar a troca na aba de
   administração (o novo com `uso = em_uso`, o morto com `removido_em` preenchido), e conferir no e-mail do
   dia seguinte que o sinal voltou.
6. **Aceitar a perda, se houver.** A fila pendente do aparelho morto pode ser perda definitiva. É a única
   falha de coleta sem conserto do desenho, e as três prevenções (espelho em `localStorage`, armazenamento
   persistente pedido na instalação, contador visível na `T0`) existem por isso.

**Quando pedir ajuda.** Se o aparelho volta a sair do quiosque mais de uma vez na mesma semana, porque aí é
configuração e não acidente. E se o contador de fila não desce com o Wi-Fi bom, porque aí é o Worker.

### 5.4 A importação do R3 falhou

**Sintoma.** O bloco 7 do e-mail não aparece, ou o e-mail traz a cobrança de arquivo ausente por **2 dias
operacionais**. Em `/painel/saude`, `execucao_importacao` com `status = erro` e a mensagem.

**Causa provável.**

1. **Ninguém exportou o R3** para a pasta do Drive. É a causa mais comum, e não é falha de software.
2. **O layout da planilha mudou** e o parser não reconhece mais as colunas.
3. **A credencial da conta de serviço do Drive** foi revogada ou expirou.
4. **O arquivo é outro relatório**, ou de outro mês.

**O que fazer, na ordem.**

1. **Olhar a mensagem de erro em `/painel/saude`.** Ela diz qual das quatro é.
2. **Se foi arquivo ausente:** exportar o R3 e usar o **botão de importar planilha** em `/painel/importar`,
   que funciona no celular, com o arquivo vindo do compartilhamento do Drive ou do e-mail. Ele usa
   exatamente o mesmo parser do automático.
3. **Conferir a prévia antes de gravar.** A tela mostra quantas linhas e quais datas foram reconhecidas, e
   pede confirmação. **Nada grava sem essa confirmação**, e é essa prévia que impede importar o mês errado.
4. **Reimportar sem medo.** Reimportar o mesmo arquivo não duplica linha nenhuma, e reimportar um dia já
   importado substitui o dia por inteiro, com registro de quem importou e quando.
5. **Se foi layout:** o arquivo bruto está guardado na própria linha de `execucao_importacao`, antes de ter
   sido interpretado. Isso permite reprocessar o dia depois de corrigir o parser, e é por isso que o arquivo
   é salvo antes e não depois. Corrigir o parser é trabalho de quem programa.

**O que não acontece, e é bom saber:** falha de importação **não apaga** o dado do dia anterior, e o painel
**não mostra número velho como se fosse novo**. Dia sem importação aparece como lacuna explícita, nunca como
zero.

**Quando pedir ajuda.** Se a mensagem falar de layout ou de coluna que não existe, porque é código. E se a
credencial do Drive precisar ser trocada, porque envolve gerar uma conta de serviço nova.

### 5.5 O painel está fora do ar

**Sintoma.** O painel não abre no celular, ou abre em branco, ou pede login e não entra.

**Primeiro, separar três coisas diferentes.**

| O que acontece | Onde está o problema |
|---|---|
| A página nem carrega, dá erro de rede | O Cloudflare Pages, ou a internet de quem está olhando |
| A página carrega, o desenho aparece, e nenhum número aparece | O banco. Vá para a página 5.6 |
| A página carrega e o login não entra | A autenticação, ou a senha, ou o 2FA |

**O que fazer, na ordem.**

1. **Tentar em outra rede** (4G se estava no Wi-Fi, e o contrário). Metade dos casos morre aqui.
2. **Tentar no aparelho de outra pessoa.** Se abre, o problema é do aparelho e não do sistema.
3. **Se o desenho aparece sem número:** é o banco, e a página é a 5.6.
4. **Se o login não entra:** o segundo administrador tenta com a credencial dele. Existem **exatamente duas**
   contas de administrador, com 2FA nas duas, e essa redundância é a razão de serem duas. Nenhuma senha é
   compartilhada e não existe conta genérica de administração.

**O que continua funcionando enquanto o painel está fora, e isto é o ponto importante:** a coleta nos cinco
aparelhos, a gravação da resposta, o alerta ao gerente, o e-mail das 16h e o backup. O painel é **somente
leitura**. Ele fora do ar é inconveniente, não é incidente.

**Quando pedir ajuda.** Se os passos 1 e 2 não resolverem e o desenho da página não carregar, porque aí é
deploy. E imediatamente se o login não entrar em nenhuma das duas contas.

### 5.6 O banco foi pausado

**Sintoma.** O painel abre e nenhum número aparece. O e-mail das 16h não chegou. Chegou um aviso automático
do GitHub dizendo que um workflow falhou. **As três coisas juntas são a assinatura exata da pausa.**

**Causa.** Duas, e elas se distinguem por uma leitura no painel do Supabase.

1. **Pausa por inatividade.** O plano gratuito pausa o projeto após **1 semana** sem atividade. Não deveria
   acontecer, porque duas plataformas diferentes escrevem no banco em cadências diferentes: o digest todo
   dia e o backup duas vezes por semana. Se aconteceu, as duas pararam, e é isso que o aviso do GitHub está
   dizendo.
2. **Restrição de uso da organização, com HTTP 402 em toda a API.** Aqui a leitura é outra e mais grave:
   **o sistema fiscal cai junto**, porque a restrição vale para todos os projetos da organização.

**O que fazer, na ordem.**

1. **Entrar no painel do Supabase** com uma das duas contas de administrador.
2. **Ler o estado do projeto `NFe e Financeiro`.** Se diz pausado, é o caso 1. Se as chamadas voltam 402, é o
   caso 2.
3. **No caso 1: despausar pelo painel.** É a falha mais provável do desenho e **a única que não perde
   dado**, porque a fila local dos aparelhos segurou as respostas. Depois de despausar, conferir no dia
   seguinte que o e-mail das 16h chegou.
4. **Entender por que aconteceu, e isto é a metade que se esquece:** projeto pausado quer dizer que **o
   backup também parou**, porque as duas execuções semanais existem justamente para isso. É o mesmo
   problema, e conferir o backup depois de despausar é parte do conserto.
5. **No caso 2: tratar como incidente do projeto inteiro, não da pesquisa.** Chamar o segundo administrador
   antes de mexer em qualquer coisa. O sistema fiscal da casa está no mesmo projeto.

**Enquanto o banco está fora:** os cinco aparelhos aceitam resposta, guardam na fila e agradecem o cliente
normalmente. Nada na nuvem consegue derrubar a coleta, porque a coleta não espera resposta da nuvem.

**Quando pedir ajuda.** **Imediatamente no caso 2.** No caso 1, só se despausar não resolver, ou se voltar a
acontecer, porque aí a causa é a parada das duas rotinas e não a pausa.

---

## 6. Os seis deveres humanos recorrentes

Eram sete até `D3`, que tirou daqui a tarefa de abrir o Portal do Parceiro do iFood toda semana. **São seis,
não sete**, e a leitura do Portal fica sendo o que o proprietário já faz por conta própria.

**A coluna de dono é proposta, não decidida.** Quem executa cada uma, com nome, é pendência do proprietário
e está na seção 11 da folha canônica. **Dever sem dono nomeado no go-live é dever cortado**, e o corte fica
escrito ao lado do indicador que ele deixa de sustentar.

| Dever | Frequência | Dono proposto | O que acontece se ninguém fizer |
|---|---|---|---|
| **Exportar o R3 para a pasta do Drive** | Diária | Proprietário, na mesma rotina em que já exporta o R3 para a análise de CMV. Se esse hábito já existe é **NÃO VERIFICADO** | O bloco 7 do e-mail não aparece e o cruzamento satisfação x faturamento some, que é o terceiro obrigatório da primeira versão. **Tem cobrança:** ausência de arquivo novo por **2 dias operacionais** vira linha no e-mail das 16h |
| **Informar `mesa_atendida_dia`** | Diária | Gerente de turno, no fechamento do caixa, num campo único no painel | O painel escreve `denominador ausente` e não mostra percentual nenhum. Sem denominador não existe conversão, e "coletar mais que hoje" deixa de ser mensurável, que é o critério de sucesso nº 2. **Tem cobrança:** campo vazio por **3 dias** vira linha no e-mail |
| **Trocar as 2 a 4 perguntas em foco** | Mensal | Proprietário, na tela de administração, sem deploy | O banco rotacionado congela nas mesmas perguntas, as impressões deixam de se concentrar onde interessa e a pesquisa para de se renovar. Não quebra nada, **não tem cobrança possível**, e é a mais fácil de deixar cair |
| **Anotar a nota de 4 pizzarias comparáveis no Google** | Trimestral, cerca de 20 minutos | Proprietário ou gerência | O substituto do benchmark, que é irreplicável em software, desaparece. Como **não existe benchmark de NPS de pizzaria verificável**, essa anotação é a única referência externa do projeto. **Sem cobrança** |
| **Testar a restauração do dump em banco vazio** | **Uma vez antes do go-live é o piso, uma por trimestre é o recomendado por cima.** A divergência entre as duas leituras está declarada de propósito na folha canônica | Proprietário ou o segundo administrador | Backup não testado não é backup, e o plano gratuito do Supabase não tem backup nenhum. **É a única falha do sistema sem sintoma antes da hora em que ela importa.** Sem dono nomeado, a linha honesta a escrever é: restauração única, e o backup fica sem verificação a partir do segundo trimestre |
| **Manter a ficha técnica atualizada para o CMV não derivar** (entrega **Preencher `pratos` e `prato_ingredientes`**, na **M3 Recorrência**) | Contínua, a cada mudança de receita ou de preço | Proprietário, nas skills, que é onde a ficha técnica vive por instrução do briefing | O diferencial nº 1 passa a cruzar satisfação com **custo velho**, que é pior que não cruzar, porque tem aparência de número certo. **Sem cobrança** |

**Duas leituras honestas desta tabela.**

1. **Quatro dos seis deveres não têm alarme possível.** Só os dois diários entram no e-mail das 16h como
   cobrança, porque só eles têm um sinal que o sistema consegue observar: arquivo que não chegou, campo que
   não foi preenchido.
2. **O sistema roda sozinho, o painel completo não.** O que sobrevive sem nenhum dos seis é a coleta, o
   alerta ao gerente, a distribuição em três faixas, o corte por garçom e o e-mail das 16h. O que morre é a
   conversão, o cruzamento com faturamento e a referência externa.

---

## 7. Definição de pronto do MVP

Lista fechada. **Cumprida inteira, autoriza devolver o tablet locado e cancelar a mensalidade.** Nenhum item
é opcional, e nenhum item novo entra aqui sem sair outro.

### 7.1 Os vinte itens do piso de aceite, com o aceite objetivo

Esta é a lista do piso da seção 4 de [`01-grid-comparativo.md`](../pesquisa/etapa-3/01-grid-comparativo.md),
com o aceite reescrito no vocabulário da folha canônica. **Não existe piso menor de quatro itens**, porque
não existe cancelamento antecipado.

| # | Aceite verificável | Entrega que o satisfaz |
|---|---|---|
| `P1` | **Duas noites completas** de operação, com o tablet passando por 20 mesas e **nenhuma saída acidental** da tela de pesquisa | **PWA de quiosque, telas `T0` a `T7`, em português e inglês**, M1 |
| `P2` | O QR na conta abre a pesquisa em **três celulares diferentes**, incluindo um iPhone antigo, em menos de 3 segundos em 4G | **Reimpressão dos QR por garçom apontando para o PWA próprio**, M1 |
| `P3` | Uma resposta enviada com **a nota e nada mais** é aceita, contada como completa e aparece no painel. Escala 0 a 10, nunca 1 a 10, nunca 1 a 5 | **PWA de quiosque**, M1 |
| `P4` | Um fluxo completo **sem digitar nome, e-mail ou telefone**, e nenhum campo de identificação antes da `T6` | **PWA de quiosque**, M1 |
| `P5` | Um leitor externo reconfere a contagem do painel com uma consulta e chega ao mesmo valor. Corte primário é **fator**, não dimensão | **Painel de leitura**, M1 |
| `P6` | Um comentário com elogio e reclamação na mesma frase gera **duas classificações**, não uma média | **Módulo único de LLM**, **M2** |
| `P7` | Três atendimentos seguidos aparecem no garçom correto, e cadastrar um extra novo leva **menos de 1 minuto** | **Antifraude e PIN tratado como dado da resposta**, M1 |
| `P8` | O painel mostra **tentativas, respostas e a taxa** no mesmo lugar e no mesmo período, com os dois números visíveis, nunca só o percentual | **Painel de leitura**, M1 |
| `P9` | O e-mail chega em **três caixas diferentes em dois dias consecutivos**, com cortes diferentes para cozinha e salão | **Digest das 16h**, **M2** |
| `P10` | Uma nota 4 lançada às 21h chega ao aparelho do gerente em menos de **30 segundos**, com mesa e horário | **Alerta ao gerente**, M1 |
| `P11` | O proprietário abre no celular, no meio do salão, e lê NPS, distribuição e comentários do dia **sem zoom**, em menos de 3 segundos | **Painel de leitura**, M1 |
| `P12` | A pergunta "como estava em maio" respondida por filtro de data ou exportação em **menos de 2 minutos** | **Painel de leitura**, M1 |
| `P13` | Um arquivo baixado abre no Excel, em português, **sem quebrar acento e sem quebrar separador** | **Painel de leitura**, M1 |
| `P14` | Proprietário e sócio entram com credenciais próprias, **2FA nas duas**, nenhuma senha compartilhada | **Base de clientes com consentimento, dois administradores com 2FA e registro de tratamento**, M1 |
| `P15` | Segunda resposta da mesma mesa, no mesmo dia operacional, dentro de **20 minutos**, aceita, agradecida e gravada com `suspeita = true`, fora dos indicadores. Suspeitas **abaixo de 3% e estável** | **Antifraude e PIN tratado como dado da resposta**, M1 |
| `P16` | Um fluxo completo em **inglês**, com os mesmos campos, e o botão `EN` de no mínimo 44 px em 100% das telas | **PWA de quiosque**, M1 |
| `P17` | Um contato deixado na `T6` chega à base com **data, hora e versão do texto aceito** | **Base de clientes com consentimento**, M1 |
| `P18` | O aviso visível na tela de coleta, o link de exclusão respondendo, e `cron_retencao` com **um registro de execução** | **LGPD do produto** e **`cron_retencao`**, M1 |
| `P19` | **Dois arquivos de dump de semanas diferentes**, restauráveis, e o projeto sem pausa por inatividade | **`backup_semanal` por GitHub Actions**, M1 |
| `P20` | Uma resposta registrada à **0h30 de sábado** aparece no dia operacional de **sexta**, no painel e no e-mail | **Modelo de dados com dois grãos, `dia_operacional` com corte às 6h e idempotência por UUID do cliente**, M1 |

**Dezoito são paridade estrita**, `P19` é paridade de responsabilidade (o que o fornecedor fazia por baixo do
pano e passa a ser da casa) e `P20` é o único item de correção, porque construir errado de novo custaria mais
que fazer certo na primeira vez.

**Dois dos vinte vêm da M2.** É a contradição de ordem da seção 1.5, e ela é o motivo pelo qual o
cancelamento é a última entrega executada do projeto.

### 7.2 O que o piso não cobre, e a definição de pronto exige

O piso é sobre paridade com o fornecedor. Estes itens vêm de `D2`, `D5`, `D7` e da restrição de manutenção
zero, e nenhum deles aparece no piso porque o fornecedor nunca os prometeu.

**Sobrevivência do dado**

- [ ] Schema `experiencia` criado por **migration versionada**, dentro de `NFe e Financeiro`, em
      `sa-east-1`, com o **`pg_dump` anterior guardado fora do Supabase e confirmado restaurável** (seção 2).
- [ ] Papel da aplicação **sem escrita fora do schema**, confirmado por tentativa de `INSERT` numa tabela
      fiscal **que falha**.
- [ ] RLS habilitado em **todas** as tabelas, `get_advisors` sem alerta em aberto, chave de serviço **ausente
      do bundle publicado**.
- [ ] `backup_semanal` rodando **domingo e quarta**, e **restaurado com sucesso num banco vazio pelo menos
      uma vez**, pelo procedimento da seção 8. **Nenhuma rotina `cron_keepalive` existe.**
- [ ] Keep-alive gravando **todos os dias, inclusive segunda**, com a consulta separada do envio de e-mail.
- [ ] Destino do dump semanal **nomeado no README**, com cifra, retenção de 8 semanas e acesso restrito aos
      dois administradores.
- [ ] Busca no repositório por `criado_em::date` e `date(criado_em)` volta **zero ocorrência** fora de
      `fn_dia_operacional`.

**Hardware e coleta**

- [ ] Os **5 tablets** provisionados pelos treze passos da seção 4.2, com os **4 de uso registrados em
      `dispositivo`** e o **de reserva carregado e provisionado**.
- [ ] Os **8 itens do teste de aceite de aparelho** (seção 4.5) passando nos cinco.
- [ ] **5 licenças Fully Kiosk PLUS** pagas, com **boot on start** configurado em cada aparelho.
- [ ] Três respostas gravadas com o Wi-Fi desligado e entregues sozinhas ao religar, **sem duplicar em 5
      reenvios do mesmo `id`**.
- [ ] Nenhum som, nenhuma vibração e nenhuma mudança de tela em função da nota, conferido com uma nota 2.

**Relatório, alerta e IA**

- [ ] Quatro endereços cadastrados, **um por papel**, cada um recebendo só o seu corte, conferido em envio
      real.
- [ ] Alerta testado **no aparelho do gerente de turno, bloqueado e na tela inicial**, com push e som, dentro
      dos 30 segundos. Se a casa recusar aparelho com push em serviço, isso fica **registrado** e o alerta
      com o cliente ainda na mesa passa a ser Fase 3.
- [ ] **Digest saindo completo com a chave da IA apagada**, com os comentários sem categoria e com aviso.
- [ ] Regras de ronda escritas **no README e no corpo do alerta**.

**Dado unificado**

- [ ] `watcher_drive` importando o R3 e o **botão de importar planilha funcionando no celular**, com o mesmo
      parser.
- [ ] Reimportar o mesmo arquivo **5 vezes** sem duplicar faturamento.
- [ ] `item_cardapio` conferido contra **um arquivo R3 exportado à mão**, de um mês qualquer. Item ativo sem
      venda no período fica como `sem venda no período`, e **isso não reprova**.

**LGPD**

- [ ] `/privacidade` publicada, com os artigos da LGPD **conferidos contra o texto da lei antes de
      publicar**.
- [ ] Duas caixas de consentimento, **nenhuma pré-marcada**, com data, hora e versão gravadas.
- [ ] Retenção de **12 meses contados da última visita** escrita na página e igual à configuração, com a
      resposta da pesquisa **mantida indefinidamente, desvinculada do contato**.
- [ ] `cron_retencao` testado: cliente antigo anonimizado, resposta preservada, e a **varredura de padrão**
      (telefone, e-mail, CPF) rodando sobre o comentário aberto.
- [ ] Teste do payload da IA **reprovando telefone e e-mail**.
- [ ] Registro de uma página das operações de tratamento em `docs/`.

**Migração e transição**

- [ ] **74 linhas** migradas e conferidas por contagem, mínimo e máximo de `criado_em`, com a lista de
      garçons virando semente de `garcom`.
- [ ] Um QR por garçom ativo, reimpresso, testado em celular real.
- [ ] Resposta do proprietário sobre para onde os QR antigos apontavam. **Respondida por `D6`:** apontam
      direto para o Google, sem nota no caminho, e portanto não há review gating a desligar.
- [ ] Pedido de exportação e de eliminação **enviado por escrito** ao fornecedor atual, com a resposta
      arquivada em `docs/`.
- [ ] Decisão registrada sobre histórico: migrar os últimos meses ou nenhum. A recomendação é **nenhum**,
      porque com a API do fornecedor (janela de 4 dias por requisição, 50 registros por página) não é fácil, e
      o critério do briefing é migrar só se for fácil.
- [ ] **Ensaio de aceite de três noites de serviço real**, coletando de verdade, com o e-mail das 16h saindo
      nos três dias seguintes. Não é operação em paralelo de dois fornecedores: é teste de aceite, e acontece
      **antes** do e-mail de cancelamento.

**Governança humana**

- [ ] **README com a regra única de operação**, textualmente: se o e-mail das 16h não chegar dois dias
      seguidos, algo quebrou.
- [ ] **Os seis deveres humanos recorrentes escritos no README, cada um com dono nomeado pelo
      proprietário.** Dever sem dono nomeado no go-live é dever cortado, e o corte fica escrito ao lado do
      indicador que ele deixa de sustentar.
- [ ] **Quem responde quando o e-mail não chega dois dias seguidos, nomeado.** É a outra metade da mesma
      pendência, e é o que decide se a restrição "ninguém vai manter" é premissa ou ficção.

### 7.3 A linha que autoriza

**Quando os vinte itens do piso e todos os itens da seção 7.2 estiverem marcados**, e não antes, a entrega
**Cancelar a mensalidade e devolver o tablet locado** pode ser executada. Nessa ordem: primeiro o pedido de
exportação e eliminação já arquivado, depois o e-mail de cancelamento, depois a devolução do aparelho
locado.

**É a única entrega irreversível do projeto.** Não há multa e não há fidelidade, o que torna a conversa de
graça, mas depois do cancelamento a alavanca sobre o fornecedor desaparece, e é por isso que o pedido por
escrito vai antes.

### 7.4 O que a definição de pronto deliberadamente não exige

Convite ao Google, cupom, leitura de avaliação pública, campanha automática, aniversário, ticket de
recuperação com dono e prazo, WhatsApp, previsão de recompra, conversa com os dados em texto livre, matriz de
engenharia de cardápio, cruzamento com CMV, integração com o CRM de reservas, Raspberry Pi e leitura direta
do banco do PDV.

Nada disso bloqueia o cancelamento, e cada um adicionaria peça móvel na versão em que menos se pode ter
isso. O cruzamento com CMV é o diferencial mais defensável do projeto e continua na **M3 Recorrência**, com
uma diferença que a inspeção trouxe: ele deixou de depender de construir estrutura de custo e passou a
depender de **preencher** a que já existe.

---

## 8. O teste de restauração do backup

**Por que ele é a única forma de descobrir o problema antes da hora em que ele importa.** A chave privada
`age` não existe em plataforma nenhuma: ela vive no gerenciador de senhas do proprietário e numa cópia
impressa no cofre do restaurante. Perdida, **nenhum backup é recuperável**, e essa falha **não tem sintoma
prévio**. O runner escreve backup e não consegue ler nenhum, nem os que ele mesmo escreveu, que é exatamente
a propriedade desejada e exatamente o motivo de o teste ser humano.

### 8.1 Como se faz, em nove passos

Da máquina do proprietário, nunca de um runner, porque a chave privada não pode existir em plataforma
nenhuma.

1. **Listar o bucket** e escolher **o objeto mais recente**. Se não houver objeto das duas últimas semanas,
   pare: o problema é o `backup_semanal`, e a página do runbook é a 5.2.
2. **Baixar o objeto `.dump.age`.** A credencial do B2 do runner não serve aqui: ela tem `writeFiles` e
   `listBuckets`, **sem `readFiles`**, de propósito. O download usa a credencial da conta.
3. **Decifrar com a chave privada `age`.** Se este passo falhar, o teste já encontrou a falha mais grave
   possível, e ainda dá tempo de gerar par novo antes de o próximo objeto entrar.
4. **Subir um Postgres 17 vazio, local, em contêiner.** Nunca no Supabase, e nunca por cima de nada.
5. **Rodar `sql/papeis.sql` antes do `pg_restore`.** O dump é feito com `--no-owner --no-privileges`, então
   ele traz as **políticas** e não traz os **privilégios**. Restaurar sem criar os cinco papéis antes falha
   por papel inexistente, ou restaura um schema sem acesso nenhum. **Este arquivo ainda não existe no
   repositório**, e está declarado como pendência na seção 9 de
   [`03-seguranca-e-lgpd.md`](03-seguranca-e-lgpd.md).
6. **`pg_restore` no banco vazio**, lendo a saída inteira. Aviso é aviso, erro reprova.
7. **Contar linha por tabela e comparar com a origem.** Vinte e seis contagens, lado a lado. Este é o
   critério, e a seção 8.3 explica por que ele é obrigatório e não zelo.
8. **Rodar os cinco casos de borda de `fn_dia_operacional`** no banco restaurado: quarta 00h40 devolve terça,
   sábado 23h50 devolve sábado, domingo 05h59 devolve sábado, domingo 06h00 devolve domingo, segunda 01h20
   devolve domingo. Restaurar a tabela e perder a função é uma falha possível, e ela é silenciosa.
9. **Registrar em `docs/`**: data, quem restaurou, qual objeto, quanto tempo levou, as vinte e seis
   contagens, e o resultado dos cinco casos de borda. **O tempo é o dado mais útil dessa nota**, porque é o
   que alguém vai precisar saber no dia em que a restauração for de verdade.

### 8.2 Com que frequência

**Aqui existe uma divergência declarada de propósito, e ela não é erro.** Está registrada na regra 4 de
desempate da seção 10 da folha canônica, e fica escrita nos dois lados:

| Leitura | O que ela diz | Status |
|---|---|---|
| Piso | **Uma restauração antes do go-live**, sem a qual o MVP não é declarado pronto | **Obrigatório.** Está na definição de pronto da seção 7.2 |
| Recomendado por cima | **Uma por trimestre**, em regime permanente | **Depende de dono nomeado.** É o quinto dos seis deveres da seção 6 |

**A linha honesta, enquanto ninguém for nomeado:** restauração única antes do go-live, e o backup fica sem
verificação a partir do segundo trimestre. Escrever isso é melhor que escrever "trimestral" e ter um
trimestral que não acontece, porque o segundo produz a ilusão de cobertura.

### 8.3 O critério de sucesso

Cinco condições, e as cinco têm de valer ao mesmo tempo:

1. **O `age` decifrou.** Sem isso nada mais importa.
2. **`pg_restore` terminou sem erro**, com os papéis criados antes.
3. **As vinte e seis contagens de linha batem com a origem.** Não é conferência de zelo: como o papel
   `experiencia_dump` **não é dono** das tabelas e RLS está habilitado, `pg_dump` precisa rodar com
   `--enable-row-security`, e nesse modo **ele dumpa apenas o que as políticas deixam ver**. Hoje todas as
   políticas de leitura desse papel são `using (true)` e o conjunto é completo. Uma política futura com
   predicado real produziria um **backup parcial que parece bem-sucedido**, que é exatamente a falha
   silenciosa que este projeto existe para não ter. A alternativa, dar `BYPASSRLS` ao papel de dump, exige
   privilégio que o plano gerenciado talvez não conceda: **NÃO VERIFICADO**.
4. **Os cinco casos de borda de `fn_dia_operacional` batem.** Prova que a função veio junto, e não só as
   tabelas.
5. **O tamanho do objeto é plausível.** O workflow já reprova dump abaixo de **4096 bytes**, porque dump
   minúsculo quase sempre é conexão que abriu e não trouxe nada, o que é pior que falhar: passaria por
   sucesso, e o backup do domingo seguinte apagaria a lembrança de que existiu um bom.

**O que reprova o teste, dito com clareza:** qualquer contagem diferente, qualquer erro do `pg_restore`,
qualquer caso de borda errado, ou o `age` não decifrar. Teste reprovado é incidente, e o conserto vem antes
do go-live.

---

## 9. O que fica escrito no README

O README já existe e já traz a maior parte disto. Esta seção é o texto que **tem** de estar lá, com o que já
está marcado como tal e o que falta marcado como falta. **Nada aqui é opcional: cada bloco corresponde a um
item da definição de pronto.**

### 9.1 As duas regras de operação, no topo, antes de qualquer coisa técnica

**Já está no README, e o texto é este:**

> ## As duas regras de operação
>
> Estas duas frases são o manual inteiro. Todo o resto é detalhe.
>
> ### 1. O e-mail das 16h é o batimento cardíaco
>
> Ele chega todo dia às 16h e cobre a noite anterior fechada. Ele é três coisas ao mesmo tempo: o relatório,
> o que mantém o banco acordado, e o único alarme do sistema.
>
> > **Se o e-mail das 16h não chegar dois dias seguidos, algo quebrou.**
>
> Não existe monitoramento além disso, e é de propósito: alarme que ninguém lê não é alarme. O que fazer
> quando ele não chega está em `docs/arquitetura/05-implantacao-e-operacao.md`, no runbook, escrito para quem
> não programa.
>
> ### 2. Vercel Hobby é proibido neste projeto
>
> Não por limite técnico. A documentação oficial do plano Hobby diz que ele é restrito a *"non-commercial,
> personal use only"*, e um sistema rodando dentro de um restaurante é **uso comercial**. O deploy é
> **Cloudflare Pages** e **Cloudflare Workers**, que permitem uso comercial no plano gratuito e ainda dão
> cron com precisão de minuto, contra mais ou menos 59 minutos do concorrente.

A regra do batimento cardíaco é `N42` e é a única regra de operação do sistema. A proibição do Vercel Hobby
tem dois motivos independentes, e o contratual é o que decide: **subir este projeto no Vercel Hobby "só para
testar" é violação de termos, e é o erro mais fácil de cometer**. O segundo motivo é técnico e sozinho já
bastaria: um relatório agendado para as 16h chegando 16h59 transforma "leia antes de abrir" em "leia enquanto
abre", com a casa abrindo às 17h no sábado e no domingo.

### 9.2 O PIN não é segurança

**Já está no README.** O texto que fica:

> **O PIN do garçom não é autenticação, é dado da resposta.** Ele atribui atendimento e não protege nada.
> A resposta pode ser gravada offline e enviada horas depois, então não existe validação no momento do toque:
> o PIN digitado é preservado cru, e a resolução acontece no servidor. PIN que não casa grava
> `garcom_reconhecido = false`, e a resposta **entra** nos indicadores gerais e **não** entra no corte por
> garçom.

### 9.3 As regras de ronda

**Falta no README, e é item da definição de pronto.** Texto a acrescentar, e ele viaja também no corpo de
todo alerta:

> ## As regras de ronda, para o alerta não matar o anonimato
>
> O alerta de nota baixa existe para recuperar o cliente enquanto ele ainda está sentado. Ele também é a
> maneira mais fácil de ensinar a mesa inteira que a pesquisa não é anônima, e o anonimato é o que sustenta
> o volume. Três regras, e as três são de operação, não de software:
>
> 1. **O gerente nunca menciona a pesquisa nem a nota.** Ele passa na mesa, pergunta como está, resolve.
> 2. **A ronda é hábito visível em mesas aleatórias, não só nas de nota baixa.** Se a única mesa visitada na
>    noite foi a que deu nota baixa, a regra foi quebrada.
> 3. **O garçom entrega o QR do Google para todas as mesas, com a mesma frase, sempre.** *"Se quiser deixar
>    sua avaliação no Google, o QR está aqui."* Entregar e sair. Escolher a quem entregar reconstrói na mão
>    exatamente o que o Google proíbe, mesmo com o QR sendo tecnicamente incondicional. **É a armadilha mais
>    grave de todo o desenho.**

### 9.4 Os seis deveres humanos recorrentes, com dono nomeado

**Falta no README, e é item da definição de pronto.** A tabela da seção 6 deste documento vai para lá
inteira, com uma diferença que é o ponto: **a coluna de dono deixa de ser "proposto" e passa a ter nome de
pessoa**, preenchido pelo proprietário. E a frase que acompanha:

> **Dever sem dono nomeado é dever cortado.** Cortar um deles não quebra o sistema: quebra um indicador, e o
> indicador que cai está escrito ao lado. Quatro dos seis não têm alarme possível, e só os dois diários
> aparecem como cobrança no e-mail das 16h.

### 9.5 O destino do dump semanal, nomeado

**Falta no README, e é item da definição de pronto.** O que fica escrito:

> ## Onde vive o backup
>
> **Bucket privado no Backblaze B2**, nome do bucket: **NÃO VERIFICADO**, pendência do proprietário, e é ele
> que preenche a variável `B2_BUCKET` do repositório. Objetos `.dump.age`, cifrados com `age` **assimétrico**.
> Retenção de **8 semanas**, por lifecycle do próprio bucket (`daysFromUploadingToHiding = 56`,
> `daysFromHidingToDeleting = 1`), configurada uma vez e nunca mais tocada. Acesso restrito aos dois
> administradores.
>
> A chave **pública** `age` vive no repositório, como variable. A chave **privada** nunca entra no GitHub, em
> nenhuma forma: gerenciador de senhas do proprietário e **uma cópia impressa em papel no cofre do
> restaurante**. Sem ela, nenhum backup é recuperável, e não existe reanimação. É o único ponto do sistema
> que depende de disciplina humana, e é por isso que tem cópia em papel.

### 9.6 A ordem antes da primeira migration

**Já está no README**, e este documento a detalha na seção 2. O texto que fica, com uma correção:

> ## Antes de aplicar a primeira migration
>
> 1. **`pg_dump` do projeto `NFe e Financeiro`, confirmado restaurável.** Este projeto contém o sistema
>    fiscal da casa. Dump que ninguém testou não é backup, e "confirmado restaurável" quer dizer restaurado
>    num Postgres 17 vazio com **as onze contagens de linha de `public` conferidas contra a origem**.
> 2. Conta no Backblaze B2 criada, bucket privado com lifecycle de 56 dias, par de chaves `age` gerado.
> 3. Crítica adversarial da Etapa 4 sem achado de severidade alta em aberto.
>
> Toda estrutura entra por **migration versionada**. Migration aplicada nunca é editada: correção é migration
> nova. Nada de DDL ad hoc pelo painel do Supabase.

A correção é a segunda metade do item 1: o README diz "confirmado restaurável" sem dizer o que isso significa,
e sem o critério de contagem a frase é intenção. O critério está na seção 2.3 deste documento.

### 9.7 O que o README **não** deve dizer

- **Nada sobre meta, ranking, semáforo ou bônus por nota.** É proibido por `D8`, por dois motivos
  independentes: contamina o dado e é proibido por texto oficial do Google. O README já traz essa proibição
  com os dois motivos, e ela fica.
- **Nenhuma promessa de anonimato absoluto.** Em mesa com comanda individual a resposta pode ser associável
  ao atendimento, e o aviso de privacidade diz isso.
- **Nenhum preço refutado.** Nem parcela mensal atribuída à alternativa de mercado, nem faixa em reais para o
  tablet, nem preço de licença de quiosque diferente de 8,90 EUR.
- **Nenhum caminho de deploy alternativo "só para testar".** Ver a seção 9.1.

---

## 10. Divergências com o que já existe, e quem está errado

Sete, e cada uma diz qual dos lados se corrige. **Nenhuma inventa uma terceira versão.**

| # | Divergência | Quem está errado, e por quê | Correção |
|---|---|---|---|
| **DI1** | `.github/workflows/backup.yml` faz `pg_dump` do **banco inteiro**, sem `--schema=experiencia` | **O workflow está errado**, e a razão não é de tamanho: dumpar o banco inteiro leva `notas`, `itens_nota` e `fornecedores` para um bucket fora do Brasil, sem finalidade declarada e sem base legal para essa localização. É a mesma correção que `DV3` de [`03-seguranca-e-lgpd.md`](03-seguranca-e-lgpd.md) já registrou | Acrescentar `--schema=experiencia` ao comando. O dump do projeto inteiro continua existindo e é **outro**: é a condição 3 de `D2`, manual, da máquina do proprietário, guardado offline com ele (seção 2.2) |
| **DI2** | O mesmo workflow não passa `--enable-row-security` | **O workflow está errado.** O papel `experiencia_dump` não é dono das tabelas e RLS está habilitado nas 26, então sem essa opção o `pg_dump` **falha**, e o job vai morrer no primeiro domingo | Acrescentar `--enable-row-security`, e com ele o critério de aceite da seção 8.3: **conferência de contagem de linha por tabela** entre origem e restauração, porque nesse modo o dump traz apenas o que as políticas deixam ver |
| **DI3** | O passo `Tocar o banco, que e o keep-alive` do workflow faz `select 1`, que é **leitura** | **O workflow está errado.** A folha canônica diz que **toda rotina grava uma linha em `execucao_rotina`**, e `ADR-10` diz que quem segura o banco acordado entre a criação do schema e a entrada do digest é **a escrita** do próprio `backup_semanal`. Um `select 1` não é escrita, e a ausência de dump por 2 semanas em `/painel/saude` não tem de onde ser lida | Trocar por um `insert` em `experiencia.execucao_rotina` com `rotina = 'backup_semanal'`, `status` e `erro`, mantendo o passo **separado** do dump, com `if: always()`, que é o que impede a falha de envio de derrubar o keep-alive |
| **DI4** | O nome da entrega de compra de hardware, em `04-cortar-e-backlog.md`, traz a quantidade revogada: ele cita duas unidades de tablet e duas de licença | **O nome da entrega está errado**, e por dois níveis: `D5` fechou em **5 tablets e 5 licenças**, e a folha canônica lista a expressão de duas unidades entre as **expressões proibidas** da seção 9.1. Referenciar a entrega pelo nome literal seria escrever uma expressão proibida | O nome usado neste documento é **Comprar os tablets e as licenças Fully Kiosk PLUS, mais suporte de mesa com chave**, e a edição do nome em `04-cortar-e-backlog.md` é pendência. O mesmo vale para a linha `Dois tablets em operação, não um` da definição de pronto de `02-replicar.md`, que a linha seguinte do próprio documento já contradiz com os 5 de `D5` |
| **DI5** | A entrega **Cancelar a mensalidade e devolver o tablet locado** está rotulada **M1**, e dois itens do piso que ela cobra vêm da **M2** | **O rótulo de marco se corrige**, não o piso. `D1` é nível 1 e diz que o piso alto vale e que o cancelamento acontece contra ele | A ordem vence o rótulo: o cancelamento é a última entrega executada. Ver a seção 1.5 |
| **DI6** | `scripts/ensaio.sh --dados` chama `scripts/ensaio-dados.sql`, que **não existe** no repositório | **O script está adiantado**, não errado: ele descreve um passo que ainda falta. Sem o arquivo, `--dados` falha | Escrever `scripts/ensaio-dados.sql` com dados **inventados**, escolhidos para o custo por prato dar um número conferível à mão. Nenhum dado real de cliente entra em banco de ensaio |
| **DI7** | A migration de semente depende de `scripts/exporta_cliques_avaliacao.mjs`, que **não existe** | Mesma leitura de `DI6`: é a peça que falta, e a migration **falha de propósito** enquanto ela faltar, com a mensagem dizendo o que fazer | Escrever o script. Ele lê a origem por REST com chave de leitura e **transcreve**, sem interpretar nada (seção 3.4) |

**Duas coisas que este documento confere e encontra corretas, e vale registrar porque a conferência foi
feita:**

- **`wrangler.toml` tem exatamente os quatro Cron Triggers**, nas expressões UTC da seção 5.1 da folha
  canônica (`*/30 * * * *`, `0 10 * * *`, `0 19 * * *`, `0 8 1 * *`), com o comentário dizendo que o quinto
  slot fica livre e **não é para keep-alive**. Está certo.
- **`src/comum/dia-operacional.ts` é espelho fiel de `fn_dia_operacional`**, com o corte às 6h literal, e
  `src/comum/nps.ts` aplica a faixa de 95% como **1,96 vezes o erro padrão** com `N06` a `N08` conferidos.
  Os dois casam com a folha canônica, e é deles que a seção 8.1 tira os cinco casos de borda do teste de
  restauração.

---

## 11. Nomes novos usados neste documento

Um só, e ele é valor de dado, não nome de objeto do banco.

| Nome | O que é | Onde este documento o usa | Nota |
|---|---|---|---|
| `aparelho_1`, `aparelho_2`, `aparelho_3`, `aparelho_4`, `aparelho_reserva` | Os cinco valores propostos para `dispositivo.apelido` | Seção 4.3 e 4.5 | **Nome novo, não consta na folha canônica.** A folha fixa a coluna `apelido` e não fixa valor. Seguem a convenção da seção 8 (português sem acento, snake_case) e não colidem com `T1` a `T7`, que são nomes de tela |

**Nomes que este documento usa e que já estão declarados em outro lugar**, repetidos aqui só para que a busca
os encontre: `fn_registra_sinal` e `experiencia_ensaio` (seção 9 de [`01-arquitetura.md`](01-arquitetura.md)),
e `experiencia_dono`, `experiencia_rotina`, `experiencia_dump` e `exportacao_cliente` (seção 9 de
[`03-seguranca-e-lgpd.md`](03-seguranca-e-lgpd.md)). **Todos precisam entrar na folha canônica antes de
aparecer em SQL aplicado**, e as duas migrations que os criam ainda não existem: as catorze que estão no
repositório criam apenas `experiencia_app` e `experiencia_leitura`.
