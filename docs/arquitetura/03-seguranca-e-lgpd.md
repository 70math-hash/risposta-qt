# Segurança e LGPD

**Data:** 17/08/2026 · **Escopo:** desenho, não execução. **Nenhuma migration foi aplicada e nenhum DDL foi
executado para escrever este documento.** Todo o SQL daqui é texto inerte até que a condição 3 de `D2` (o
`pg_dump` de `NFe e Financeiro` guardado fora do Supabase) esteja cumprida, e o destino desse dump ainda não
existe.

**Precedência:** este documento é nível 5 da tabela da seção 10 de [`00-canonico.md`](00-canonico.md). Ele não
renomeia nada da folha canônica. Onde precisou de um nome que a folha não tem, o nome está marcado com a nota
**nome novo, não consta na folha canônica** e listado na seção 10.

**A pergunta que este documento responde:** qual é a segurança proporcional a uma pizzaria de uma unidade, com
dois administradores, 22 mesas, cerca de 150 respostas por mês e **ninguém para manter o sistema depois de
pronto**. Toda decisão abaixo foi julgada contra essa última restrição, e o inimigo declarado continua sendo a
peça que quebra em silêncio. Segurança que exige alguém olhando uma tela não existe, porque ninguém vai olhar.

---

## 1. Modelo de ameaça proporcional

### 1.1 Os seis adversários plausíveis

Cada linha traz o que a pessoa consegue de fato, não o que ela conseguiria em teoria, e o controle que responde
por ela. A coluna do controle aponta para a seção que o detalha.

| # | Adversário | O que ele tem na mão | O que ele quer | O que o desenho faz | Onde está |
|---|---|---|---|---|---|
| **A1** | **Curioso interno**: garçom fixo, extra da semana, gerente de turno | Acesso físico ao tablet durante o serviço, e vê o PIN sendo digitado na `T0` porque isso acontece em pé, na frente da mesa | Saber quem reclamou, e ver a nota que a mesa dele deu | A `T7` não mostra nada da resposta e reseta em **8 segundos** (`N18`); o estado é resetado entre clientes; o tablet não emite som nem vibração e não muda de aparência em função da nota (`F26`); o aparelho não tem tela nenhuma de histórico e não lê a base de clientes | Seções 3.3 e 4 |
| **A2** | **Ex-funcionário**: garçom desligado, ex-gerente, e também quem construiu o sistema | PIN que ele já sabia, QR impresso que ele levou, e possivelmente um e-mail ainda ativo em `destinatario` | Continuar recebendo o digest, ou atribuir resposta a si mesmo | `garcom.removido_em` tira o PIN do corte sem apagar histórico (`F49`); PIN de garçom removido grava `garcom_reconhecido = false` (`F50`); remover destinatário é uma tela e leva menos de **1 minuto** (`F29`); nenhuma credencial de banco jamais existiu no aparelho nem na mão da equipe | Seções 2, 4 e 5 |
| **A3** | **Varredura automatizada**: bot que procura chave de Supabase em bundle publicado, `.env` exposto, endpoint aberto e repositório com segredo | Nada além do que a internet publica. **É o adversário mais provável do projeto, por volume, e o único que age todos os dias** | Qualquer banco que responda sem autenticação | A única chave no bundle publicado é a chave publicável (`anon`), e ela **não tem `USAGE` no schema `experiencia`**, portanto lê zero linha das 26 tabelas; `EXECUTE` de toda função é revogado de `public`; nenhum endpoint de escrita aceita requisição sem passar por `fn_grava_resposta`; não existe webhook de entrada em nenhum ponto do sistema | Seções 3.2 e 3.3 |
| **A4** | **Credencial vazada em repositório**: chave colada num commit, num print, num canal de conversa | O que aquela credencial abre, e nada mais | Ler a base de clientes, escrever lixo, ou apagar | Cada credencial tem escopo mínimo e nenhuma serve duas funções (seção 5); a chave do B2 escreve e **não lê nem apaga** (`D7`); a chave privada `age` **não existe em plataforma nenhuma**, então o pacote cifrado que vazar continua fechado; `.gitignore` e `.env.example` com valores vazios já estão no repositório | Seção 5 |
| **A5** | **Erro de operação**: consulta errada, `DELETE` sem `WHERE`, import do arquivo errado, retenção apagando mais do que devia, planilha de clientes indo para grupo de WhatsApp | Credencial legítima e boa intenção. **É a causa mais provável de perda real de dado neste sistema** | Nada. É acidente | Nenhum papel tem `DELETE` em 24 das 26 tabelas (seção 3.4); a retenção é `UPDATE` para nulo e nunca `DELETE` (`F48`); o arquivo bruto do R3 fica guardado antes de ser interpretado, então o import errado é refazível (ADR-12); `backup_semanal` roda **domingo e quarta**; a exportação de clientes fica registrada | Seções 3.4 e 6.9 |
| **A6** | **Tablet perdido, furtado ou esquecido**, com fila pendente dentro | O aparelho, e o que estiver em `fila_resposta` naquele momento | Nada, na maioria dos casos. O valor de revenda é o aparelho | Trava de tela no aparelho, modo quiosque com licença Fully Kiosk PLUS, suporte com chave nos pontos fixos (`D5`), e a regra de não usar conta pessoal de Google no tablet, para o `IndexedDB` não sincronizar para nenhum lugar. **O que sobra está declarado em 1.3** | Seções 1.3 e 6.10 |

### 1.2 Quem explicitamente NÃO é adversário deste sistema

Escrito para que ninguém gaste esforço aqui, e para que quem quiser gastar tenha que argumentar contra um
motivo escrito.

| Não é adversário | Por que não |
|---|---|
| **Atacante dirigido, com tempo e dinheiro** | Não existe motivo econômico. O ativo mais valioso do banco é uma lista de algumas centenas de nomes com WhatsApp de gente que come pizza no Jardins, e o histórico de notas de uma casa de 22 mesas. Nada disso paga uma operação dirigida |
| **Ator estatal, APT, exploração de dia zero** | Defender-se disso exigiria orçamento, equipe e vigilância contínua, ou seja as três coisas que este projeto não tem por definição |
| **Ransomware direcionado** | O modelo de negócio do ransomware é a operação parada. Aqui a coleta sobrevive dentro do aparelho e o pior caso é reimportar um dump de até 3 dias e meio de idade. Ficar sem sistema por uma noite não fecha a casa |
| **Concorrente fazendo espionagem** | Uma pizzaria comparável descobre o cardápio, o preço e a fila do QT andando até a porta. Não existe segredo comercial dentro deste banco que valha uma invasão |
| **Insider com credencial de banco** | Existem exatamente **2** contas de administrador, e as duas são dos donos do negócio (`F57`). Defender o dono do dono é teatro |
| **O provedor de LLM lendo comentário para competir** | O que vai para o LLM não tem identificador e não tem valor fora do contexto (seção 8). O risco real do provedor é de política e de contrato, e está tratado em ADR-07, não aqui |
| **O cliente tentando fraudar a própria nota** | Ele não ganha nada. Não existe cupom, prêmio, sorteio nem convite ao Google em nenhuma tela (`D6`, `D8`). Sem incentivo não existe fraude do cliente |

**O que mudaria este modelo de ameaça, e é o único gatilho para reabri-lo:** ceder a suíte a amigos do setor,
como o briefing admite no máximo. No dia em que existir uma segunda casa lendo o mesmo banco, aparecem isolamento
entre inquilinos, credencial por cliente e responsabilidade de operador sob LGPD, e este documento inteiro precisa
ser reescrito. **Enquanto for uma casa, é uma casa.**

### 1.3 As três exposições que ficam aceitas, com o nome delas

Fingir que não existem seria a pior parte deste documento.

1. **O PIN do garçom é público de fato.** Ele é digitado em pé, na frente do cliente, num aparelho compartilhado.
   Isso é aceito porque o PIN não protege nada: ele atribui atendimento (seção 4). Se algum dia ele autenticasse
   algo, esta linha viraria a falha mais grave do sistema.
2. **A fila pendente no tablet contém resposta em claro, inclusive contato, enquanto não subir.** São até 5
   aparelhos, cada um com a própria fila (`fila_resposta` em `IndexedDB` mais espelho em `localStorage`). Na
   prática a fila é vazia quase sempre, porque a internet do salão é estável e o envio é imediato. Aceito com
   três condições operacionais: trava de tela no aparelho, modo quiosque ativo, e **nenhuma conta pessoal de
   Google logada no tablet**, para que o armazenamento do navegador não seja sincronizado para fora da casa.
   Tablet furtado com fila pendente é tratado como possível incidente, e o caminho está em 6.10.
3. **Não existe cópia do banco de produção com dado real em ambiente nenhum** (seção 7.1 de
   [`01-arquitetura.md`](01-arquitetura.md)). É bom para LGPD e ruim para depurar, e as duas metades são
   verdadeiras. A consequência de segurança é positiva e fica registrada: não há um segundo lugar de onde a base
   de clientes possa vazar.

---

## 2. Papéis e permissões

### 2.1 Os cinco papéis do banco, e os três que o Supabase já traz

A folha canônica fixa dois papéis (`experiencia_app` e `experiencia_leitura`, seção 6.5). Este documento propõe
mais três, porque dois não conseguem expressar escopo mínimo: o Worker de escrita está na internet e o Worker de
rotina não, e quem tira o dump não precisa poder escrever. **Os três nomes novos estão na seção 10 e precisam
entrar na folha canônica antes de aparecer em SQL aplicado.**

| Papel | Quem o usa | O que pode | O que **não** pode, e é o ponto | `LOGIN` |
|---|---|---|---|---|
| `experiencia_dono` **(nome novo)** | Ninguém. É o dono do schema, das 26 tabelas, das views e das funções. Só é alcançado **por dentro** de uma função `security definer` | Tudo dentro de `experiencia`. `SELECT` nas cinco tabelas de custo em `public` | **Nenhum `INSERT`, `UPDATE`, `DELETE` ou `TRUNCATE` em `public`.** É isto que transforma a condição 1 de `D2` em fato do banco em vez de promessa: mesmo um erro dentro de `fn_grava_resposta` não consegue escrever no sistema fiscal | não |
| `experiencia_app` (folha canônica) | **Worker de escrita**, o componente que a internet alcança | `EXECUTE` em exatamente **três** funções: `fn_grava_resposta`, `fn_registra_sinal`, `fn_sorteia_pergunta`. `SELECT` em exatamente **três** tabelas, filtrado por RLS: `item_cardapio` (ativo), `pergunta_banco` (ativa), `consentimento_texto` (vigente). `SELECT` e `UPDATE (enviado_em)` em `alerta_detrator`, só nas linhas ainda não enviadas | Não lê `cliente`, não lê `garcom`, não lê `mesa`, não lê `resposta`, não lê `destinatario`, não lê `configuracao`, não escreve em tabela nenhuma diretamente e não apaga nada em lugar nenhum | não |
| `experiencia_rotina` **(nome novo)** | **Worker de rotina** (as quatro rotinas do Cloudflare) e o caminho de importação manual | Ver a matriz da seção 3.3, tabela por tabela. Em resumo: leitura ampla do dado de pesquisa, escrita em `venda_produto_dia`, `execucao_importacao`, `execucao_rotina` e `classificacao_texto`, e a anonimização em `cliente` | **Não lê a base de clientes.** Tem `UPDATE` nas colunas pessoais de `cliente` e `SELECT` apenas em `id`, `ultima_visita_em` e `anonimizado_em`. Ou seja, ele apaga dado pessoal sem nunca poder ler dado pessoal. Também não lê `garcom.pin` | não |
| `experiencia_leitura` (folha canônica) | **Painel**, pelos dois administradores autenticados. Concedido a `authenticated` por herança de papel | `SELECT` nas 26 tabelas e nas views. `INSERT` e `UPDATE` nas tabelas de cadastro. `INSERT` em `consentimento_texto`. `UPDATE` em `cliente` e `exclusao_pedido` para atender pedido de titular | Não apaga nada, com **uma** exceção nomeada (`classificacao_texto`, seção 3.4). Não escreve em `resposta` nem em nenhuma filha dela: **resposta de cliente não se edita, nunca** | não |
| `experiencia_dump` **(nome novo)** | `backup_semanal`, no GitHub Actions | `SELECT` nas 26 tabelas. `INSERT` em `execucao_rotina`, que é a escrita do keep-alive | Não lê `public`, não escreve em mais nada, não apaga nada. É a credencial de menor poder que ainda consegue produzir um backup completo | **sim**, com senha em segredo do repositório |
| `anon` (Supabase) | A chave publicável que está no bundle publicado do PWA e do painel | **Nada dentro de `experiencia`.** Sem `USAGE` no schema, sem `GRANT` em tabela, sem `EXECUTE` em função | Tudo. E é isso que faz a chave no bundle ser inofensiva: ela serve para o login e para nada mais | via chave |
| `authenticated` (Supabase) | Sessão de administrador logado pelo Supabase Auth, com 2FA | Herda `experiencia_leitura` por `grant experiencia_leitura to authenticated` | **Depende de o autocadastro estar desligado.** Ver 2.3, que é a condição mais frágil de todo o desenho | via JWT |
| `service_role` (Supabase) | **Nada nosso.** É a chave de serviço do projeto, e ela é a mesma do sistema fiscal que mora no mesmo projeto | O que o sistema fiscal precisa, em `public` | Depois da migration de papéis, **nada em `experiencia`**: privilégio revogado tabela por tabela e `USAGE` do schema revogado | via chave |

### 2.2 Nenhum papel da pesquisa escreve fora do schema `experiencia`

Esta é a condição 1 de `D2`, e ela é verificável em três níveis, do mais fraco para o mais forte:

1. **Nenhum papel da pesquisa recebe `INSERT`, `UPDATE`, `DELETE` ou `TRUNCATE` em `public`.** Só `SELECT`, e só
   nas cinco tabelas de custo (`pratos`, `prato_ingredientes`, `insumos_master`, `historico_precos`,
   `producao_ingredientes`).
2. **O revoke é explícito e vem depois do grant**, na mesma migration, para que a ausência de privilégio não
   dependa do default de ninguém.
3. **As funções `security definer` rodam como `experiencia_dono`, que também não tem escrita em `public`.** É o
   nível que fecha o buraco real: sem ele, um erro dentro de uma função escreveria no sistema fiscal com o
   privilégio do dono da função.

```sql
-- Leitura, e só leitura, nas cinco tabelas de custo. Nada mais de public.
grant usage on schema public to experiencia_dono, experiencia_leitura;
grant select on public.pratos, public.prato_ingredientes, public.insumos_master,
                public.historico_precos, public.producao_ingredientes
  to experiencia_dono, experiencia_leitura;

-- O revoke que transforma a regra em fato. Explicito, e depois do grant.
revoke insert, update, delete, truncate on all tables in schema public from
  experiencia_dono, experiencia_app, experiencia_rotina, experiencia_leitura, experiencia_dump;
revoke create on schema public from
  experiencia_dono, experiencia_app, experiencia_rotina, experiencia_leitura, experiencia_dump;
```

**Critério de aceite, e ele reprova a entrega se falhar.** Cobrado na entrega **Schema `experiencia` criado por
migration versionada, com RLS e papel sem escrita fora do schema**, na **M1 Coleta própria**, e é o mesmo
critério de `F55` e da seção 6.5 da folha canônica:

```sql
-- Teste 1. A tentativa de INSERT em tabela fiscal tem de falhar, com os cinco papeis.
do $$
declare p text;
begin
  foreach p in array array['experiencia_app','experiencia_rotina','experiencia_leitura',
                           'experiencia_dump','experiencia_dono']
  loop
    begin
      execute format('set local role %I', p);
      execute $q$insert into public.pratos (nome, categoria) values ('teste rls', 'PIZZAS')$q$;
      reset role;
      raise exception 'REPROVADO: % conseguiu escrever em public.pratos', p;
    exception when insufficient_privilege then
      reset role;
      raise notice 'ok: % nao escreve em public.pratos', p;
    end;
  end loop;
end $$;
```

O teste roda dentro de uma transação que termina em `rollback`, na camada 1 de ambientes (banco local em
contêiner, seção 7.2 de [`01-arquitetura.md`](01-arquitetura.md)), e depois uma vez contra
`NFe e Financeiro` **depois** do `pg_dump`, nunca antes.

Duas conferências de busca, que qualquer pessoa refaz em dez segundos e que entram na definição de pronto:

- Busca por `insert into public.` e `update public.` no repositório volta **zero** ocorrência.
- Busca por `service_role` e por `SUPABASE_SERVICE_KEY` no repositório volta ocorrência apenas nesta seção, na
  seção 5 e na seção 9 deste documento. Ver a divergência **DV1** da seção 9: hoje o `.env.example` ainda nomeia
  `SUPABASE_SERVICE_KEY` como credencial do Worker, e isso está errado.

### 2.3 A condição frágil, escrita em destaque porque é a única que abre tudo de uma vez

`grant experiencia_leitura to authenticated` significa que **qualquer sessão autenticada é administradora**. Isso
é proporcional a duas contas de dono, e é indefensável se qualquer pessoa puder criar uma conta.

**Portanto, três configurações do Supabase Auth deixam de ser preferência e passam a ser requisito de aceite:**

- **Autocadastro desligado** (`Enable email signup` desligado, ou equivalente vigente no painel). As duas contas
  são criadas à mão, uma vez.
- **2FA ligado nas duas contas**, conferido na tela de conta (`F57`).
- **Nenhum provedor de login social habilitado**, porque cada um é uma porta de criação de conta.

```
Teste de aceite, feito de fora, sem credencial:
  chamar o endpoint publico de signup do projeto com a chave publicavel
  e um e-mail qualquer. Espera-se recusa. Se criar conta, o painel inteiro
  esta aberto para quem tiver a chave do bundle, que e publica por desenho.
```

A alternativa que este documento **recusa** é uma tabela de administradores com política por `auth.uid()`. Ela
criaria uma 27ª tabela, um cadastro para manter e um bootstrap circular (quem cadastra o primeiro administrador),
para proteger contra um adversário que a seção 1.2 já descartou. Duas contas e o autocadastro desligado resolvem o
mesmo problema sem nenhuma peça nova.

### 2.4 Como cada componente prova quem é

| Componente | Credencial que ele apresenta | Como o Postgres decide o papel |
|---|---|---|
| PWA de quiosque nos 5 tablets | Nenhuma credencial de banco. **Fala só com o Cloudflare** | Não fala com o Postgres. Nunca |
| Worker de escrita | JWT assinado por ele, com `role: experiencia_app`, contra o endpoint RPC do PostgREST | O PostgREST troca para o papel do JWT, o que exige `grant experiencia_app to authenticator` |
| Worker de rotina | Mesmo mecanismo, com `role: experiencia_rotina` | idem |
| Painel | JWT do Supabase Auth, com `role: authenticated` | `authenticated` herda `experiencia_leitura` |
| `backup_semanal` | String de conexão Postgres com o papel `experiencia_dump` | Conexão direta, é o único componente que fala Postgres sem PostgREST |
| Migration | String de conexão do papel de migração (`postgres`), da máquina de quem aplica | Fora do caminho de execução do sistema |

**Duas coisas a conferir antes de escrever a migration, e as duas são `NÃO VERIFICADO`:**

1. Se o projeto `NFe e Financeiro` permite `grant experiencia_app to authenticator` e se o PostgREST hospedado
   aceita papel customizado no claim `role`: **NÃO VERIFICADO.** É a mecânica documentada do PostgREST, e não foi
   testada neste projeto.
2. Se o projeto ainda expõe um segredo HS256 para assinar JWT próprio, ou se já migrou para chave assimétrica:
   **NÃO VERIFICADO.**

**Se qualquer uma das duas falhar, o caminho de reserva já está escolhido:** os dois Workers passam a falar
Postgres por conexão direta, com `experiencia_app` e `experiencia_rotina` recebendo `LOGIN` e senha em segredo de
plataforma. Custa uma dependência de socket no Worker e não muda nenhuma política desta seção, porque as políticas
são escritas contra o papel, não contra o transporte. **O que não é caminho de reserva é usar a chave de serviço:**
ela ignora RLS, é a mesma credencial do sistema fiscal, e com ela o critério de aceite de 2.2 falha por construção.

---

## 3. As políticas de RLS, tabela por tabela

### 3.1 As seis regras que geram todas as políticas

Lê-se isto uma vez e as 26 tabelas ficam previsíveis.

1. **RLS habilitado em todas as 26, sem exceção** (folha canônica, seção 6.5). Habilitado e **não** forçado: o
   dono precisa passar por cima, porque é ele que executa as funções de escrita.
2. **Privilégio primeiro, política depois.** Política sem `GRANT` não dá acesso, e `GRANT` sem política não dá
   acesso. As duas camadas são escritas juntas, por tabela, para que quem audita uma tabela veja tudo dela num só
   lugar.
3. **`anon` não aparece em nenhuma política, e é de propósito.** Ele não tem `USAGE` no schema. Duas camadas de
   negativa, e nenhuma linha de SQL dizendo "nega para anon", porque negativa por ausência não pode ser removida
   por engano numa migration futura.
4. **Tabela nova nasce invisível.** Não existe `alter default privileges` concedendo nada em `experiencia`. A
   migration que cria uma tabela é a mesma que dá o mínimo a ela, ou a tabela não é lida por ninguém.
5. **Escrita de cliente entra só por função.** `resposta` e as seis filhas dela, mais `cliente`, `consentimento`,
   `tentativa` e `alerta_detrator`, não têm `INSERT` para papel nenhum. Quem insere é `fn_grava_resposta`,
   rodando como `experiencia_dono`.
6. **`DELETE` não existe, com duas exceções nomeadas** (seção 3.4).

### 3.2 O preâmbulo, que precede as 26

Este bloco é a primeira metade da migration proposta
`supabase/migrations/AAAAMMDDHHMMSS_cria_papeis_e_politicas_rls.sql` (o carimbo de hora em UTC entra quando o
arquivo for criado, e **o arquivo ainda não existe**).

```sql
-- ---------------------------------------------------------------------------
-- Papeis. Nenhum tem LOGIN, exceto experiencia_dump.
-- ---------------------------------------------------------------------------
create role experiencia_dono    nologin;
create role experiencia_app     nologin;
create role experiencia_rotina  nologin;
create role experiencia_leitura nologin;
create role experiencia_dump    login password :'senha_dump';   -- vem de variavel, nunca literal

alter schema experiencia owner to experiencia_dono;

-- ---------------------------------------------------------------------------
-- Alcance do schema. anon nunca entra aqui.
-- ---------------------------------------------------------------------------
revoke all on schema experiencia from public;
revoke all on schema experiencia from anon, service_role;
grant usage on schema experiencia
  to experiencia_dono, experiencia_app, experiencia_rotina, experiencia_leitura, experiencia_dump;

-- O painel entra por heranca de papel: politica escrita para experiencia_leitura
-- vale para a sessao autenticada, porque RLS respeita pertencimento de papel.
grant experiencia_leitura to authenticated;

-- Necessario para o PostgREST trocar de papel a partir do JWT dos Workers.
-- Ver 2.4: se o projeto nao permitir, os Workers passam a conexao direta.
grant experiencia_app     to authenticator;
grant experiencia_rotina  to authenticator;

-- ---------------------------------------------------------------------------
-- O revoke mais importante do arquivo. Funcao nasce com EXECUTE para PUBLIC,
-- e PUBLIC inclui anon. Sem este bloco, o resto do documento nao vale nada.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema experiencia from public;
alter default privileges for role experiencia_dono in schema experiencia
  revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- Nenhum privilegio automatico para tabela futura. Tabela nova nasce invisivel.
-- ---------------------------------------------------------------------------
revoke all on all tables    in schema experiencia from anon, service_role;
revoke all on all sequences in schema experiencia from anon, service_role;

-- ---------------------------------------------------------------------------
-- As tres funcoes que o PWA alcanca, e as tres auxiliares que o resto usa.
-- ---------------------------------------------------------------------------
grant execute on function experiencia.fn_grava_resposta(jsonb)        to experiencia_app;
grant execute on function experiencia.fn_registra_sinal(jsonb)       to experiencia_app;
grant execute on function experiencia.fn_sorteia_pergunta(uuid,text) to experiencia_app;

grant execute on function experiencia.fn_dia_operacional(timestamptz)
  to experiencia_app, experiencia_rotina, experiencia_leitura;
grant execute on function experiencia.fn_faixa_nps(smallint)
  to experiencia_rotina, experiencia_leitura;
grant execute on function experiencia.fn_casa_abre(date)
  to experiencia_rotina, experiencia_leitura;
```

**As views.** As 25 views `vw_` são de `experiencia_dono` e ficam com o comportamento padrão do Postgres
(`security_invoker = false`), ou seja executam com o privilégio do dono. Isso é deliberado e tem uma consequência
que precisa estar escrita: **quem tem `SELECT` numa view lê o agregado sem precisar de acesso às tabelas de
base.** É o que permite ao Worker de rotina montar o digest lendo agregados, sem receber `SELECT` em `cliente`.

```sql
grant select on all tables in schema experiencia to experiencia_leitura;  -- inclui as 25 views
-- O Worker de rotina recebe view por view, e nao em bloco, porque o digest
-- nao precisa de vw_exportacao_cliente e nunca vai precisar.
grant select on experiencia.vw_hoje, experiencia.vw_distribuicao_faixa_dia,
                experiencia.vw_nps_janela, experiencia.vw_semana_detrator,
                experiencia.vw_dia_semana, experiencia.vw_fator_contagem,
                experiencia.vw_coleta_dia, experiencia.vw_pergunta_desempenho,
                experiencia.vw_venda_dia, experiencia.vw_satisfacao_venda_dia,
                experiencia.vw_alerta_incidente, experiencia.vw_dispositivo_sinal,
                experiencia.vw_saude_rotina
  to experiencia_rotina;
```

**Uma honestidade sobre o que RLS não faz aqui.** `fn_grava_resposta` roda como `experiencia_dono`, que é o dono
das tabelas, e portanto **passa por cima de toda política desta seção**. Isso não é brecha, é o desenho: se a
função respeitasse RLS, ela precisaria de política de `INSERT` para o papel do tablet, e essa política é
exatamente o que não se quer que exista. A consequência é que **o corpo da função é a única regra de escrita do
caminho da resposta**, e é por isso que ele vive numa migration versionada e é revisado como código de segurança,
não como código de aplicação.

### 3.3 As 26 tabelas

Formato fixo por tabela: o SQL completo (privilégio mais política), quem passa, quem não passa, e o teste que
comprova. Todos os testes rodam dentro de `begin; ... rollback;` e vivem no arquivo `sql/teste_rls.sql`, que
**ainda não existe**.

#### Bloco A. Coleta

**1. `resposta`**

```sql
alter table experiencia.resposta enable row level security;
grant select on experiencia.resposta to experiencia_leitura, experiencia_rotina, experiencia_dump;
create policy resposta_leitura on experiencia.resposta
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
```

- **Passa:** administrador (painel e consulta à mão), Worker de rotina (classificador, digest, retenção),
  `experiencia_dump`.
- **Não passa:** `anon` (sem `USAGE`), `service_role` (revogado), `experiencia_app` (**sem `GRANT` nenhum**, e é
  o ponto: a credencial que a internet alcança não lê nem a própria resposta que acabou de gravar). Ninguém tem
  `INSERT`, `UPDATE` ou `DELETE`: a linha entra por `fn_grava_resposta` e nunca é editada.
- **Teste:** `set local role experiencia_app; select count(*) from experiencia.resposta;` espera
  `permission denied`. E `set local role experiencia_leitura; update experiencia.resposta set nota = 10;` espera
  `permission denied`.

**2. `resposta_opcao` · 3. `resposta_item` · 5. `resposta_pergunta_sorteada` · 6. `tela_evento` · 7. `tentativa`**

As cinco têm exatamente a política de `resposta`, e por isso aparecem juntas. Repetir cinco blocos idênticos é
como se introduz divergência entre eles.

```sql
alter table experiencia.resposta_opcao              enable row level security;
alter table experiencia.resposta_item               enable row level security;
alter table experiencia.resposta_pergunta_sorteada  enable row level security;
alter table experiencia.tela_evento                 enable row level security;
alter table experiencia.tentativa                   enable row level security;

grant select on experiencia.resposta_opcao, experiencia.resposta_item,
                experiencia.resposta_pergunta_sorteada, experiencia.tela_evento,
                experiencia.tentativa
  to experiencia_leitura, experiencia_rotina, experiencia_dump;

create policy resposta_opcao_leitura on experiencia.resposta_opcao
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy resposta_item_leitura on experiencia.resposta_item
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy resposta_pergunta_sorteada_leitura on experiencia.resposta_pergunta_sorteada
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy tela_evento_leitura on experiencia.tela_evento
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy tentativa_leitura on experiencia.tentativa
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
```

- **Passa:** administrador, Worker de rotina, dump.
- **Não passa:** `anon`, `service_role`, `experiencia_app`. Nenhum papel escreve: as cinco são preenchidas por
  `fn_grava_resposta`. **`tentativa` inclui a recusa registrada na `T0`**, e ela entra pela mesma função, com
  `desfecho = recusou` e sem nota (ver a divergência **DV5** da seção 9).
- **Teste:** para cada uma, `set local role experiencia_app; select 1 from <tabela> limit 1;` espera
  `permission denied`. E, com o papel de rotina, `insert` espera `permission denied`.

**4. `resposta_texto`**

A única filha de `resposta` que recebe escrita de rotina, porque a varredura de padrão de `D4` mascara o trecho
com telefone, e-mail ou CPF dentro do texto livre.

```sql
alter table experiencia.resposta_texto enable row level security;
grant select on experiencia.resposta_texto
  to experiencia_leitura, experiencia_rotina, experiencia_dump;
grant update (texto_cru) on experiencia.resposta_texto to experiencia_rotina;

create policy resposta_texto_leitura on experiencia.resposta_texto
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy resposta_texto_mascara on experiencia.resposta_texto
  for update to experiencia_rotina using (true) with check (true);
```

- **Passa:** administrador e dump em leitura. Worker de rotina em leitura e em `UPDATE` **de uma coluna só**.
- **Não passa:** `experiencia_app`, `anon`, `service_role`. E ninguém tem `DELETE`: o comentário do cliente não
  se apaga, ele se mascara, e a contagem de mascaramentos vai para `execucao_rotina` (`F48`).
- **Teste:** `set local role experiencia_rotina; update experiencia.resposta_texto set resposta_id = gen_random_uuid();`
  espera `permission denied` (privilégio de coluna), enquanto `update ... set texto_cru = 'x'` passa.

#### Bloco B. Cadastro

**8. `garcom`**

A tabela mais sensível do bloco, porque tem a coluna `pin`. O privilégio de coluna é o que impede que o Worker de
rotina, que só precisa do nome para escrever o digest, possa listar PIN.

```sql
alter table experiencia.garcom enable row level security;
grant select                          on experiencia.garcom to experiencia_leitura, experiencia_dump;
grant insert, update                  on experiencia.garcom to experiencia_leitura;
grant select (id, nome, ativo, criado_em, removido_em)
                                      on experiencia.garcom to experiencia_rotina;

create policy garcom_leitura on experiencia.garcom
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy garcom_cadastro_insere on experiencia.garcom
  for insert to experiencia_leitura with check (true);
create policy garcom_cadastro_altera on experiencia.garcom
  for update to experiencia_leitura using (true) with check (true);
```

- **Passa:** administrador em tudo menos apagar. Worker de rotina só nas cinco colunas listadas. Dump em tudo,
  porque backup sem `pin` não restaura o cadastro.
- **Não passa:** `experiencia_app`. **Este é o ponto mais importante desta seção inteira:** a credencial que
  atende a internet não tem uma linha de privilégio sobre `garcom`, portanto **não existe caminho de enumeração
  de PIN**, nem com a credencial vazada. A resolução do PIN acontece dentro de `fn_grava_resposta`, como
  `experiencia_dono`. Ninguém tem `DELETE`: garçom sai com `removido_em` (`F49`).
- **Teste:** `set local role experiencia_rotina; select pin from experiencia.garcom;` espera `permission denied`.
  `set local role experiencia_app; select * from experiencia.garcom;` espera `permission denied`.
  `set local role experiencia_leitura; delete from experiencia.garcom;` espera `permission denied`.

**9. `mesa` · 10. `dispositivo` · 14. `mesa_atendida_dia` · 15. `calendario_operacao`**

Cadastro que o administrador mantém e o resto do sistema lê. `dispositivo` só é escrito pelo administrador (troca
do tablet de reserva, `removido_em`) e por `fn_registra_sinal` como dono, nunca pelo papel do Worker.

```sql
alter table experiencia.mesa                enable row level security;
alter table experiencia.dispositivo         enable row level security;
alter table experiencia.mesa_atendida_dia   enable row level security;
alter table experiencia.calendario_operacao enable row level security;

grant select         on experiencia.mesa, experiencia.dispositivo,
                        experiencia.mesa_atendida_dia, experiencia.calendario_operacao
  to experiencia_leitura, experiencia_rotina, experiencia_dump;
grant insert, update on experiencia.mesa, experiencia.dispositivo,
                        experiencia.mesa_atendida_dia, experiencia.calendario_operacao
  to experiencia_leitura;

create policy mesa_leitura on experiencia.mesa
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy mesa_insere on experiencia.mesa for insert to experiencia_leitura with check (true);
create policy mesa_altera on experiencia.mesa for update to experiencia_leitura using (true) with check (true);

create policy dispositivo_leitura on experiencia.dispositivo
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy dispositivo_insere on experiencia.dispositivo for insert to experiencia_leitura with check (true);
create policy dispositivo_altera on experiencia.dispositivo for update to experiencia_leitura using (true) with check (true);

create policy mesa_atendida_dia_leitura on experiencia.mesa_atendida_dia
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy mesa_atendida_dia_insere on experiencia.mesa_atendida_dia for insert to experiencia_leitura with check (true);
create policy mesa_atendida_dia_altera on experiencia.mesa_atendida_dia for update to experiencia_leitura using (true) with check (true);

create policy calendario_operacao_leitura on experiencia.calendario_operacao
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy calendario_operacao_insere on experiencia.calendario_operacao for insert to experiencia_leitura with check (true);
create policy calendario_operacao_altera on experiencia.calendario_operacao for update to experiencia_leitura using (true) with check (true);
```

- **Passa:** administrador para manter, rotina e dump para ler.
- **Não passa:** `experiencia_app`. O tablet não lista mesas: o garçom digita o número e o servidor resolve, e
  mesa não reconhecida é `mesa_id is null`. **Sem `SELECT` em `mesa`, a credencial do Worker não descobre quantas
  mesas a casa tem nem quais existem.** Ninguém tem `DELETE`.
- **Teste:** `set local role experiencia_app; select * from experiencia.mesa;` espera `permission denied`. E o
  preenchimento de `mesa_atendida_dia` pelo gerente é testado logado no painel, gravando um dia e conferindo que
  `vw_coleta_dia` passa a mostrar percentual em vez de `denominador ausente`.

**11. `item_cardapio`**

Primeira das três tabelas que o Worker de escrita lê, porque a `T3C2` precisa da lista de itens. RLS filtra por
`ativo`, então o pacote servido ao tablet não pode conter item fora do cardápio nem por erro de consulta.

```sql
alter table experiencia.item_cardapio enable row level security;
grant select         on experiencia.item_cardapio
  to experiencia_app, experiencia_leitura, experiencia_rotina, experiencia_dump;
grant insert, update on experiencia.item_cardapio to experiencia_leitura;

create policy item_cardapio_leitura on experiencia.item_cardapio
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy item_cardapio_leitura_app on experiencia.item_cardapio
  for select to experiencia_app using (ativo and removido_em is null);
create policy item_cardapio_insere on experiencia.item_cardapio
  for insert to experiencia_leitura with check (true);
create policy item_cardapio_altera on experiencia.item_cardapio
  for update to experiencia_leitura using (true) with check (true);
```

- **Passa:** `experiencia_app` só nos itens ativos e não removidos. Administrador, rotina e dump em tudo.
- **Não passa:** `anon`, `service_role`. `experiencia_app` não vê item inativo, não vê `removido_em` preenchido e
  não escreve. O que ele lê é público de fato: está impresso no cardápio da casa.
- **Teste:** desativar um item pelo painel, chamar o pacote de coleta pelo Worker e conferir que o item não vem.
  `set local role experiencia_app; update experiencia.item_cardapio set ativo = false;` espera
  `permission denied`.

**12. `pergunta_banco`**

Atenção ao nome da coluna: em `pergunta_banco` o booleano é **`ativa`**, e não `ativo` (folha canônica, seção
2.2).

```sql
alter table experiencia.pergunta_banco enable row level security;
grant select         on experiencia.pergunta_banco
  to experiencia_app, experiencia_leitura, experiencia_rotina, experiencia_dump;
grant insert, update on experiencia.pergunta_banco to experiencia_leitura;

create policy pergunta_banco_leitura on experiencia.pergunta_banco
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy pergunta_banco_leitura_app on experiencia.pergunta_banco
  for select to experiencia_app using (ativa);
create policy pergunta_banco_insere on experiencia.pergunta_banco
  for insert to experiencia_leitura with check (true);
create policy pergunta_banco_altera on experiencia.pergunta_banco
  for update to experiencia_leitura using (true) with check (true);
```

- **Passa:** `experiencia_app` só nas ativas, que é o texto que o cliente vê de qualquer jeito. Administrador
  troca as 2 a 4 perguntas em foco sem deploy (`N20`).
- **Não passa:** `anon`, `service_role`, e o Worker de escrita não vê pergunta inativa, não altera peso nem foco.
- **Teste:** marcar uma pergunta como `ativa = false` e conferir que `fn_sorteia_pergunta` deixa de devolvê-la e
  que o pacote não traz o texto dela.

**13. `destinatario`**

Guarda e-mail de pessoas da equipe, o que é dado pessoal de colaborador. Por isso o Worker de escrita não a
alcança e o Worker de rotina só vê quem está ativo.

```sql
alter table experiencia.destinatario enable row level security;
grant select         on experiencia.destinatario to experiencia_leitura, experiencia_rotina, experiencia_dump;
grant insert, update on experiencia.destinatario to experiencia_leitura;

create policy destinatario_leitura on experiencia.destinatario
  for select to experiencia_leitura, experiencia_dump using (true);
create policy destinatario_leitura_rotina on experiencia.destinatario
  for select to experiencia_rotina using (ativo);
create policy destinatario_insere on experiencia.destinatario
  for insert to experiencia_leitura with check (true);
create policy destinatario_altera on experiencia.destinatario
  for update to experiencia_leitura using (true) with check (true);
```

- **Passa:** administrador para manter a lista, rotina para enviar o digest apenas a quem está ativo, dump para
  o backup.
- **Não passa:** `experiencia_app`, `anon`, `service_role`. Ninguém tem `DELETE`: destinatário sai com
  `ativo = false`, e é isso que permite responder "quem recebeu o quê" meses depois (`F29`).
- **Teste:** desativar um endereço e conferir, na próxima execução, que ele não aparece na lista gravada em
  `execucao_rotina`.

**16. `configuracao`**

```sql
alter table experiencia.configuracao enable row level security;
grant select  on experiencia.configuracao to experiencia_leitura, experiencia_rotina, experiencia_dump;
grant update  on experiencia.configuracao to experiencia_leitura;

create policy configuracao_leitura on experiencia.configuracao
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy configuracao_altera on experiencia.configuracao
  for update to experiencia_leitura using (true) with check (true);
```

- **Passa:** administrador lê e altera parâmetro de negócio sem deploy. Rotina lê provedor e modelo de LLM,
  prazos e limiares. Dump lê.
- **Não passa:** `experiencia_app` (o corte de 20 minutos e o teto de 30 por dispositivo são lidos **dentro** de
  `fn_grava_resposta`), `anon`, `service_role`. Ninguém tem `INSERT` nem `DELETE`: parâmetro novo entra por
  migration, junto do código que o lê, senão ele existe sem ninguém consumindo.
- **Regra que vale como proibição:** **nenhum segredo entra em `configuracao`, nunca.** Chave de API, senha e
  string de conexão vivem em segredo de plataforma (seção 5). `configuracao` guarda parâmetro de negócio, e é
  legível por três papéis e pelo dump.
- **Teste:** busca no repositório por `configuracao` e conferência de que nenhuma chave é lida de lá. E
  `set local role experiencia_rotina; update experiencia.configuracao set ...;` espera `permission denied`.

#### Bloco C. Cliente e LGPD

**17. `cliente`**

A tabela que justifica o documento inteiro. Nome, e-mail, WhatsApp e nascimento.

```sql
alter table experiencia.cliente enable row level security;
grant select on experiencia.cliente to experiencia_leitura, experiencia_dump;
grant update on experiencia.cliente to experiencia_leitura;

-- O papel de rotina anonimiza sem nunca poder ler dado pessoal.
grant select (id, ultima_visita_em, anonimizado_em) on experiencia.cliente to experiencia_rotina;
grant update (nome, email, whatsapp, nascimento, anonimizado_em)
                                                   on experiencia.cliente to experiencia_rotina;

create policy cliente_leitura on experiencia.cliente
  for select to experiencia_leitura, experiencia_dump using (true);
create policy cliente_leitura_rotina on experiencia.cliente
  for select to experiencia_rotina using (anonimizado_em is null);
create policy cliente_anonimiza on experiencia.cliente
  for update to experiencia_rotina using (anonimizado_em is null) with check (true);
create policy cliente_atende_titular on experiencia.cliente
  for update to experiencia_leitura using (true) with check (true);
```

- **Passa:** administrador (painel de clientes, exportação, atendimento de pedido de titular), dump. Worker de
  rotina apenas para achar quem passou de 12 meses da última visita e apagar as quatro colunas pessoais.
- **Não passa:** `experiencia_app`, `anon`, `service_role`. **A folha canônica exige que o tablet não leia a base
  de clientes, e aqui isso é privilégio ausente, não promessa de código.** Ninguém tem `INSERT` (a linha nasce
  dentro de `fn_grava_resposta`, junto do consentimento) e **ninguém tem `DELETE`**: a exclusão do titular é
  `UPDATE` para nulo mais `anonimizado_em`, o que preserva a resposta desvinculada (`D4`, `N11`).
- **Teste, e este entra na definição de pronto:** `set local role experiencia_rotina; select nome from experiencia.cliente;`
  espera `permission denied`; `select id, ultima_visita_em from experiencia.cliente;` passa;
  `update experiencia.cliente set nome = null where ultima_visita_em < now() - interval '12 months';` passa.
  Depois, `set local role experiencia_app; select count(*) from experiencia.cliente;` espera `permission denied`.

**18. `consentimento`**

```sql
alter table experiencia.consentimento enable row level security;
grant select on experiencia.consentimento to experiencia_leitura, experiencia_rotina, experiencia_dump;

create policy consentimento_leitura on experiencia.consentimento
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
```

- **Passa:** leitura, para os três.
- **Não passa:** **ninguém escreve, altera ou apaga.** É a prova do consentimento, com `finalidade`, `aceito_em`
  e `versao_texto`, e prova que pode ser editada não é prova. A linha nasce em `fn_grava_resposta`, na mesma
  transação da resposta.
- **Teste:** `set local role experiencia_leitura; update experiencia.consentimento set aceito_em = now();` espera
  `permission denied`. E o teste de `F45`: consentir, mudar o texto, consentir de novo, e conferir que as duas
  linhas apontam para versões diferentes.

**19. `consentimento_texto`**

Append-only de verdade: `INSERT` para o administrador, e nenhum `UPDATE` para papel nenhum. Editar cria versão
nova, e isso deixa de ser regra de disciplina e passa a ser regra do banco.

```sql
alter table experiencia.consentimento_texto enable row level security;
grant select on experiencia.consentimento_texto
  to experiencia_app, experiencia_leitura, experiencia_rotina, experiencia_dump;
grant insert on experiencia.consentimento_texto to experiencia_leitura;

create policy consentimento_texto_leitura on experiencia.consentimento_texto
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy consentimento_texto_leitura_app on experiencia.consentimento_texto
  for select to experiencia_app using (vigente_de <= now());
create policy consentimento_texto_insere on experiencia.consentimento_texto
  for insert to experiencia_leitura with check (true);
```

- **Passa:** `experiencia_app` lê a versão já vigente, que é o texto que ele precisa exibir no tablet.
  Administrador publica versão nova.
- **Não passa:** `experiencia_app` **não vê versão com `vigente_de` no futuro**, o que permite preparar um texto
  novo sem que ele apareça no salão antes da hora. Ninguém tem `UPDATE` nem `DELETE`.
- **Teste:** inserir versão com `vigente_de = now() + interval '1 day'`, chamar o pacote pelo Worker e conferir
  que a versão exibida é a antiga. `set local role experiencia_leitura; update experiencia.consentimento_texto set texto = 'x';`
  espera `permission denied`.

**20. `exclusao_pedido`**

O caso curioso do bloco: o titular não tem login, então o pedido de exclusão é uma escrita **anônima**. A solução
é `INSERT` sem `SELECT`.

```sql
alter table experiencia.exclusao_pedido enable row level security;
grant insert         on experiencia.exclusao_pedido to experiencia_app;
grant select         on experiencia.exclusao_pedido to experiencia_leitura, experiencia_rotina, experiencia_dump;
grant update         on experiencia.exclusao_pedido to experiencia_leitura;

create policy exclusao_pedido_registra on experiencia.exclusao_pedido
  for insert to experiencia_app
  with check (atendido_em is null and resultado is null);
create policy exclusao_pedido_leitura on experiencia.exclusao_pedido
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy exclusao_pedido_atende on experiencia.exclusao_pedido
  for update to experiencia_leitura using (true) with check (true);
```

- **Passa:** qualquer titular, pela página `/privacidade`, através do Worker de escrita. Administrador para
  atender. Worker de rotina para cobrar no digest pedido aberto há mais de **7 dias** (`N43`).
- **Não passa:** `experiencia_app` **não lê nem uma linha**, portanto a credencial vazada não descobre quem pediu
  exclusão nem consegue enumerar pedidos. E o `with check` impede que quem escreve marque o próprio pedido como
  já atendido, que seria a forma barata de fazer um pedido desaparecer. Ninguém tem `DELETE`: o pedido atendido é
  a prova de cumprimento.
- **Teste:** `set local role experiencia_app; insert into experiencia.exclusao_pedido (contato_informado, pedido_em) values ('x@y.z', now());`
  passa; `select * from experiencia.exclusao_pedido;` espera `permission denied`;
  `insert ... (atendido_em) values (now());` espera violação de política.

#### Bloco D. IA na coleira

**21. `classificacao_texto`**

```sql
alter table experiencia.classificacao_texto enable row level security;
grant select, insert on experiencia.classificacao_texto to experiencia_rotina;
grant select, delete on experiencia.classificacao_texto to experiencia_leitura;
grant select         on experiencia.classificacao_texto to experiencia_dump;

create policy classificacao_texto_leitura on experiencia.classificacao_texto
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy classificacao_texto_insere on experiencia.classificacao_texto
  for insert to experiencia_rotina with check (true);
create policy classificacao_texto_refaz on experiencia.classificacao_texto
  for delete to experiencia_leitura using (true);
```

- **Passa:** Worker de rotina insere a saída do classificador. Administrador pode apagar para refazer do zero
  com `versao_prompt` nova.
- **Não passa:** `experiencia_app`, `anon`, `service_role`. E o Worker de rotina **não apaga**: um erro de
  classificação em lote não destrói a série, porque a única mão que apaga é humana e autenticada.
- **Por que o `DELETE` existe aqui:** é a única tabela declaradamente **derivada**, refazível a partir de
  `resposta_texto`, que ninguém pode apagar. Apagar o derivado é reversível; apagar a fonte não é.
- **Teste:** `set local role experiencia_rotina; delete from experiencia.classificacao_texto;` espera
  `permission denied`.

#### Bloco E. Dado do PDV

**22. `venda_produto_dia`**

```sql
alter table experiencia.venda_produto_dia enable row level security;
grant select, insert, update, delete on experiencia.venda_produto_dia to experiencia_rotina;
grant select                         on experiencia.venda_produto_dia to experiencia_leitura, experiencia_dump;

create policy venda_produto_dia_leitura on experiencia.venda_produto_dia
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy venda_produto_dia_insere on experiencia.venda_produto_dia
  for insert to experiencia_rotina with check (true);
create policy venda_produto_dia_altera on experiencia.venda_produto_dia
  for update to experiencia_rotina using (true) with check (true);
create policy venda_produto_dia_substitui on experiencia.venda_produto_dia
  for delete to experiencia_rotina using (true);
```

- **Passa:** Worker de rotina, porque reimportar um dia **substitui o dia por inteiro** (`F40`), e substituir
  exige apagar. Administrador e dump leem.
- **Não passa:** `experiencia_app`. Ver a divergência **DV2** da seção 9: a importação manual pode continuar
  disparada pelo painel, mas a credencial que escreve venda é `experiencia_rotina`, nunca a do caminho da
  resposta.
- **Por que o `DELETE` existe aqui:** cada linha é derivada do arquivo bruto guardado em `execucao_importacao`,
  que é append-only e que ninguém apaga. **Só se apaga o que pode ser refeito, e a fonte de refazer não se
  apaga.**
- **Teste:** reimportar o mesmo arquivo 5 vezes e conferir que o faturamento do dia não muda (`F39`). E
  `set local role experiencia_leitura; delete from experiencia.venda_produto_dia;` espera `permission denied`.

**23. `execucao_importacao`**

```sql
alter table experiencia.execucao_importacao enable row level security;
grant select, insert on experiencia.execucao_importacao to experiencia_rotina;
grant select         on experiencia.execucao_importacao to experiencia_leitura, experiencia_dump;

create policy execucao_importacao_leitura on experiencia.execucao_importacao
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy execucao_importacao_insere on experiencia.execucao_importacao
  for insert to experiencia_rotina with check (true);
```

- **Passa:** rotina grava a tentativa com o arquivo bruto **antes** de interpretar. Administrador e dump leem.
- **Não passa:** ninguém altera e ninguém apaga, porque o arquivo bruto é a prova e a fonte de reprocessamento.
  `experiencia_app` não tem nada aqui.
- **Nota de LGPD, para não ser descoberta depois:** o arquivo bruto do R3 é dado de venda da casa, não dado
  pessoal de cliente, e por isso ele não entra na retenção de 12 meses. **Nenhuma exportação inclui a coluna de
  bytes**, porque isso levaria o arquivo do PDV para fora do sistema sem finalidade.
- **Teste:** `set local role experiencia_rotina; update experiencia.execucao_importacao set erro = null;` espera
  `permission denied`.

#### Bloco F. Operação e saúde

**24. `execucao_rotina`**

```sql
alter table experiencia.execucao_rotina enable row level security;
grant select, insert on experiencia.execucao_rotina to experiencia_rotina;
grant select, insert on experiencia.execucao_rotina to experiencia_dump;   -- a escrita do keep-alive
grant select         on experiencia.execucao_rotina to experiencia_leitura;

create policy execucao_rotina_leitura on experiencia.execucao_rotina
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy execucao_rotina_insere on experiencia.execucao_rotina
  for insert to experiencia_rotina with check (true);
create policy execucao_rotina_insere_backup on experiencia.execucao_rotina
  for insert to experiencia_dump with check (rotina = 'backup_semanal');
```

- **Passa:** Worker de rotina grava as quatro rotinas dele. `experiencia_dump` grava **só** a linha de
  `backup_semanal`, e a política prova isso: é a única escrita que a credencial do GitHub consegue fazer no banco
  inteiro. É também o keep-alive de `ADR-10`.
- **Não passa:** `experiencia_app`, `anon`, `service_role`. Ninguém altera e ninguém apaga: é o log que sobra
  quando o log do fornecedor expira (`F33`).
- **Divergência a resolver antes de escrever a política final:** `F52` exige que a exportação de clientes fique
  registrada em `execucao_rotina`, e a lista fechada de `rotina` na folha canônica tem **cinco** valores, nenhum
  deles de exportação. Ver **DV4** na seção 9. Enquanto a folha não receber o valor
  `exportacao_cliente` (**nome novo, não consta na folha canônica**), o `INSERT` para `experiencia_leitura` não
  existe e a exportação não fica registrada, o que é uma lacuna de LGPD declarada e não um esquecimento.
- **Teste:** `set local role experiencia_dump; insert into experiencia.execucao_rotina (rotina, iniciado_em, status) values ('cron_digest_16h', now(), 'sucesso');`
  espera violação de política, e a mesma linha com `backup_semanal` passa.

**25. `alerta_detrator`**

A política mais elegante do arquivo, e vale explicar por quê. O Worker de escrita precisa dos dados do alerta
para redigir o e-mail, e precisa marcar `enviado_em` depois. A política dá exatamente isso, e a própria escrita
dele tira a linha da vista dele.

```sql
alter table experiencia.alerta_detrator enable row level security;
grant select              on experiencia.alerta_detrator to experiencia_app;
grant update (enviado_em) on experiencia.alerta_detrator to experiencia_app;
grant select              on experiencia.alerta_detrator to experiencia_leitura, experiencia_rotina, experiencia_dump;
grant update              on experiencia.alerta_detrator to experiencia_leitura;

create policy alerta_detrator_fila_app on experiencia.alerta_detrator
  for select to experiencia_app using (enviado_em is null);
create policy alerta_detrator_marca_envio on experiencia.alerta_detrator
  for update to experiencia_app using (enviado_em is null) with check (true);
create policy alerta_detrator_leitura on experiencia.alerta_detrator
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
create policy alerta_detrator_contato on experiencia.alerta_detrator
  for update to experiencia_leitura using (true) with check (true);
```

- **Passa:** `experiencia_app` vê **só a fila do que ainda não foi enviado**, que em regime normal tem zero ou
  uma linha. Administrador marca "houve contato". Rotina lê para o bloco 2 do digest.
- **Não passa:** `experiencia_app` não vê nenhum alerta já enviado, portanto **não existe caminho para percorrer
  o histórico de detratores com a credencial do Worker**, e depois de marcar `enviado_em` a linha desaparece da
  visão dele. Ele também não altera mesa, nota nem fator, por privilégio de coluna. Ninguém apaga.
- **Teste:** gravar uma nota 3, conferir que `set local role experiencia_app; select count(*) from experiencia.alerta_detrator;`
  devolve 1; marcar `enviado_em`; repetir a contagem e conferir que devolve 0.

#### Bloco G. Histórico migrado

**26. `convite_clique`**

```sql
alter table experiencia.convite_clique enable row level security;
grant select on experiencia.convite_clique to experiencia_leitura, experiencia_rotina, experiencia_dump;

create policy convite_clique_leitura on experiencia.convite_clique
  for select to experiencia_leitura, experiencia_rotina, experiencia_dump using (true);
```

- **Passa:** leitura para os três. É a linha de base de volume das **74 linhas** de `cliques_avaliacao` (`N40`).
- **Não passa:** **nenhum papel escreve.** A tabela é preenchida uma vez, na entrega **Migrar as 74 linhas de
  `cliques_avaliacao` e semear a tabela `garcom`**, na **M1 Coleta própria**, pela credencial de migração, e
  depois disso não tem escritor em produção. Tabela de histórico que ninguém pode escrever não diverge da origem.
- **Teste:** contagem de 74 na origem e 74 no destino, mais `criado_em` mínimo e máximo iguais, e
  `set local role experiencia_rotina; insert into experiencia.convite_clique ...;` espera `permission denied`.

### 3.4 Os dois `DELETE` que existem, e as 24 tabelas que não têm nenhum

| Tabela | Quem apaga | Por que é seguro |
|---|---|---|
| `classificacao_texto` | `experiencia_leitura`, ou seja um dos dois administradores, à mão | Derivada. Refeita a partir de `resposta_texto`, que ninguém apaga |
| `venda_produto_dia` | `experiencia_rotina`, para substituir o dia na reimportação | Derivada. Refeita a partir do arquivo bruto em `execucao_importacao`, que ninguém apaga |

**Invariante conferível:** busca por `grant delete` na migration de papéis volta exatamente **duas** ocorrências,
e busca por `for delete` volta exatamente **duas** políticas. Qualquer terceira é regressão, e o motivo dela tem
de estar escrito nesta tabela antes de existir em SQL.

Isto é o controle mais forte do documento contra o adversário **A5** da seção 1.1, que é o mais provável de
todos: um erro de operação não consegue apagar resposta, cliente, consentimento, alerta, log nem histórico,
porque o privilégio não existe para papel nenhum.

### 3.5 A gravação pelo tablet sem usuário autenticado

Este é o caso difícil, e ele merece a explicação completa, porque é onde quase todo sistema de pesquisa em
quiosque abre um buraco.

**O problema.** O cliente não tem login e não vai ter. A resposta pode ser gravada sem rede e subir horas depois.
Alguma credencial precisa existir do lado de fora para que a linha entre no banco. Se essa credencial puder
`INSERT` direto nas tabelas, ela precisa de `INSERT` em sete tabelas ao mesmo tempo (`resposta`, quatro filhas,
`tentativa`, e às vezes `cliente`, `consentimento` e `alerta_detrator`), e uma credencial com esse alcance,
vazada, escreve dado falso em massa.

**A solução, em quatro peças.**

1. **O tablet não tem credencial de banco.** Ele fala com o Worker de escrita por HTTPS, e nada mais. É a segunda
   das cinco fronteiras de rede de [`01-arquitetura.md`](01-arquitetura.md).
2. **O Worker tem uma credencial que não sabe fazer quase nada.** `experiencia_app` tem `EXECUTE` em três funções
   e `SELECT` em três tabelas de conteúdo público, mais a fila de alerta não enviado. **Zero `INSERT`, zero
   `UPDATE` de tabela de dado, zero `DELETE`, zero leitura de pessoa.**
3. **`fn_grava_resposta` é a única porta, e ela é `security definer`.**

```sql
create or replace function experiencia.fn_grava_resposta(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = experiencia, pg_temp   -- obrigatorio, e nao e detalhe
as $$
declare
  v_id uuid := (payload ->> 'id')::uuid;
begin
  -- Corpo detalhado no documento de modelo de dados. O que importa aqui, e e regra
  -- de seguranca, nao de aplicacao:
  --
  --  1. Idempotencia por payload ->> 'id', que e o uuid v4 gerado no cliente.
  --     Reenvio do mesmo id nao cria segunda linha (F03).
  --  2. Resolve mesa_id contra mesa. Mesa desconhecida vira mesa_id is null,
  --     NUNCA erro, porque erro diferente por causa diferente e oraculo.
  --  3. Resolve garcom_id contra garcom. PIN que nao casa vira
  --     garcom_reconhecido = false, NUNCA erro, pelo mesmo motivo.
  --  4. Resolve respondido_em, de onde sai a coluna gerada dia_operacional.
  --  5. Marca suspeita = true na janela de 20 minutos da mesma mesa (N27).
  --  6. Grava cliente e consentimento na mesma transacao, quando houver T6.
  --  7. Grava alerta_detrator quando a nota for de 0 a 6 (N30).
  --  8. Grava tentativa, com desfecho respondeu ou recusou (ver DV5).
  --
  -- A funcao SEMPRE devolve v_id, tanto na insercao quanto no reenvio.
  return v_id;
end $$;

revoke execute on function experiencia.fn_grava_resposta(jsonb) from public;
grant  execute on function experiencia.fn_grava_resposta(jsonb) to experiencia_app;
```

4. **A função roda como `experiencia_dono`, que não escreve fora do schema.** Portanto o pior caso de um erro
   dentro dela é dado errado em `experiencia`, nunca uma linha no sistema fiscal.

**Por que isto não permite leitura.** A função devolve `uuid`, e o valor devolvido é **o mesmo que entrou**. Não
existe caminho de retorno para nome, PIN, mesa, nota alheia, comentário alheio nem contagem. `experiencia_app`
não tem `SELECT` em `resposta` nem em nenhuma filha, então nem a linha que ele mesmo acabou de gravar pode ser
lida de volta. A única leitura que ele tem é conteúdo que a casa já expõe no cardápio, na tela e no aviso de
privacidade.

**Por que isto não permite enumeração.** Cinco propriedades, e as cinco são deliberadas:

| O que alguém tentaria enumerar | Por que não consegue |
|---|---|
| **PIN de garçom**, chamando a função com PIN 0000, 0001, 0002 | A função **nunca erra por PIN inválido**. Ela grava `garcom_reconhecido = false` e devolve o mesmo `uuid` que devolveria com PIN certo. A resposta é indistinguível, então não existe sinal a medir. E a tentativa fica gravada em `resposta` com o PIN cru, ou seja **a varredura se autodenuncia**: a contagem de PIN não reconhecido acima de **3 no dia** vira linha no e-mail das 16h (`N43`) |
| **Número de mesa existente**, pelo mesmo método | Idem: mesa desconhecida vira `mesa_id is null`, sem erro e sem diferença de resposta. E `experiencia_app` não tem `SELECT` em `mesa` |
| **Existência de uma resposta**, mandando um `uuid` para ver se ele já existe | A função devolve o mesmo valor nos dois casos, inserção e reenvio. **Não existe oráculo de existência.** E adivinhar um `uuid` v4 não é um caminho |
| **A base de clientes** | Nenhum privilégio, em nenhuma coluna, em `cliente`. Nem `count(*)` |
| **O histórico de detratores** | `alerta_detrator` só mostra a fila não enviada, e a marcação de envio remove a linha da visão dele |

**O que a credencial vazada consegue, dito sem maquiagem.** Inserir resposta falsa e sinal de aparelho falso, até
o limite de invocação do Worker. Ou seja: **poluir a amostra, não vazar dado.** Isso é o mesmo que o adversário
**A1** consegue com o tablet na mão, e é exatamente o que a trava de fraude já mede: `suspeita` na janela de 20
minutos, teto de **30 respostas por dispositivo por dia** (`N28`), e a métrica única de **respostas suspeitas
abaixo de 3% e estável** (`N29`). Um pico de resposta falsa aparece nos três lugares no mesmo dia.

**O que se faz quando essa credencial vaza** está na seção 5.4, e a resposta curta é: rotação em minutos, sem
downtime de coleta, porque a fila local segura as respostas enquanto o Worker é reimplantado.

### 3.6 O sinal de vida do aparelho, pela mesma porta estreita

`fn_registra_sinal(jsonb) returns void` (**nome novo, não consta na folha canônica**, declarado na seção 9 de
[`01-arquitetura.md`](01-arquitetura.md)) recebe o mesmo tratamento: `security definer`, `set search_path`,
`EXECUTE` revogado de `public` e concedido só a `experiencia_app`, e ela toca **apenas** `ultimo_sinal_em`, a
fila pendente e `versao_app` em `dispositivo`. Devolve `void`, então não devolve nem confirmação de qual aparelho
existe. Aparelho desconhecido no payload não cria linha e não erra de forma distinguível: ele é ignorado, e a
ausência do sinal aparece em `vw_dispositivo_sinal` como aparelho mudo por mais de **24 horas** (`N31`), que é o
alarme que já existe.

---

## 4. Por que o PIN do garçom não é autenticação

### 4.1 O que ele é

`garcom_pin_digitado` é **coluna de dado da resposta**, gravada crua e preservada sempre, em `resposta` e em
`tentativa` (folha canônica, seção 3.1). A resolução acontece no servidor: `garcom_id` quando casa,
`garcom_reconhecido = false` quando não casa. A resposta com PIN não reconhecido **entra** nos indicadores gerais
e **não** entra no corte por garçom. Isto é `ADR-06` e `F50`, e aqui só se acrescenta a leitura de segurança.

**A frase que vai para o README, e ela é a mesma da folha canônica:** o PIN não protege nada, ele atribui
atendimento.

### 4.2 O que aconteceria se ele fosse tratado como autenticação

Sete consequências, e nenhuma delas é hipotética: todas são propriedades do arranjo físico da casa.

| Se o PIN autenticasse | O que quebraria |
|---|---|
| **A resposta offline não poderia ser aceita** | Validar credencial exige o servidor no momento do toque. Com a fila de `F03`, a resposta sobe horas depois. Restariam duas saídas, e as duas são piores: recusar a coleta sem rede, que mata o núcleo do sistema, ou aceitar sem validar, que é autenticação de fachada |
| **Um dígito errado jogaria dado no lixo** | Rejeitar resposta com PIN inválido descarta satisfação legítima por erro de digitação. `F50` recusa isso de propósito |
| **O PIN viraria segredo, e ele é digitado em pé na frente do cliente** | Ninguém consegue esconder quatro dígitos digitados num tablet que está sendo entregue. Um segredo que todo mundo vê não é segredo, e chamá-lo de segredo é o que produz falsa confiança |
| **Haveria material de ataque no componente mais exposto** | Guardar hash ou lista de PIN no tablet põe o material de ataque no aparelho que fica na mão do cliente, circula pelo salão e pode ser furtado, para comprar uma validação que a fila offline já impede de ser confiável |
| **O sistema passaria a afirmar quem atendeu** | Autenticação é afirmação de identidade. Com ela, "a mesa 7 foi atendida por Fulano" viraria fato do sistema, e não registro do que foi digitado. Numa casa que troca de extra toda semana, isso é afirmação que o sistema não pode sustentar |
| **A atribuição errada viraria acusação** | Combinado com `D8`, que proíbe meta, ranking e bônus por nota, a diferença entre registro e afirmação é a diferença entre conversa de desenvolvimento e punição de trabalhador com base em número errado |
| **O vazamento de PIN viraria incidente de segurança** | Como dado da resposta, PIN exposto é um campo de atribuição que precisa ser trocado. Como credencial, seria incidente com dever de comunicação. Trocar a natureza do campo cria uma obrigação legal que o desenho não precisa ter |

### 4.3 Como se impede fraude sem transformar o PIN em segredo

Nenhuma das sete travas abaixo depende de o PIN ser secreto. Elas medem **padrão**, não identidade, e é isso que
as torna à prova de PIN conhecido.

| # | Trava | Número | O que ela pega |
|---|---|---|---|
| 1 | Janela de duplicidade por mesa | **20 minutos** no mesmo dia operacional, segunda resposta aceita, agradecida e gravada com `suspeita = true` (`N27`) | Resposta em série na mesma mesa, sem recusar a legítima de mesas juntadas com comandas individuais |
| 2 | Teto por aparelho | **30 respostas por dispositivo por dia**, e acima disso linha de aviso no e-mail das 16h (`N28`) | Volume fabricado num aparelho, numa casa de até 20 mesas por dia |
| 3 | Métrica única da trava | **suspeitas abaixo de 3% e estável** (`N29`) | O regime. Acima disso o que se investiga é a operação, não a trava |
| 4 | Conversão com denominador | respostas sobre `mesa_atendida_dia` para a casa, e respostas sobre `tentativa` para o garçom (folha canônica, seção 2.5) | Tanto quem não pede quanto quem pede demais. Razão anômala é o sinal de fabricação de volume |
| 5 | PIN não reconhecido | acima de **3 no dia** vira linha no digest (`N43`) | Varredura de PIN, extra usando PIN de outro, e QR impresso para PIN já removido |
| 6 | Corte por garçom trimestral com `n` mínimo de **20** (`N32`) | e a tela escreve `amostra insuficiente, n=x` | Impede que 2 respostas virem julgamento, o que é o que tornaria a fraude compensadora |
| 7 | **Nenhuma meta, ranking, semáforo ou bônus por nota** (`D8`) | Nenhum | **É a trava mais barata e mais eficaz de todas: ela remove o incentivo.** Sem prêmio por nota, fraudar nota não paga nada. E existe uma segunda razão independente, que é a proibição literal do Google |

**O que nenhuma trava barata pega, e fica escrito:** o garçom responder por si mesmo, com o tablet na mão, dentro
de todos os limites. O que o sistema faz é expor a razão respostas sobre mesas atendidas por garçom e por
aparelho, que é anômala quando alguém fabrica volume, e manter o corte trimestral com `n` mínimo para que o
número não seja usado como sentença. Fingir que a trava pega isso seria pior que declarar.

### 4.4 Uma consequência de LGPD que quase sempre escapa

`garcom_pin_digitado`, `garcom_id` e a nota atribuída são **dado pessoal de colaborador**, porque identificam uma
pessoa natural e permitem avaliar o trabalho dela. Três obrigações decorrem, e as três estão na seção 6:

- `colaborador` entra como **categoria de titular** no registro das operações de tratamento (seção 6.8).
- A base legal é **legítimo interesse** na gestão da operação, e a salvaguarda que sustenta o teste de
  proporcionalidade é justamente `D8`: sem meta, ranking ou bônus, o tratamento não produz efeito de punição
  automatizada.
- O colaborador tem os mesmos direitos de acesso e de correção, pelo mesmo canal do titular cliente (seção 6.7),
  e o corte por garçom é para conversa de desenvolvimento, o que precisa estar escrito na tela e no treinamento.

---

## 5. Segredos

### 5.1 A lista completa, sem exceção

Doze itens. A coluna da direita é a mais importante, porque credencial que ninguém sabe que existe é credencial
que ninguém troca.

| # | Segredo | Onde vive | Quem tem acesso | O que ele abre |
|---|---|---|---|---|
| **S1** | Chave **publicável** do Supabase (`VITE_SUPABASE_ANON_KEY`) e a URL do projeto | **No bundle publicado**, por desenho | Todo mundo. É pública | O login do painel, e **nada** dentro de `experiencia`. Sem `USAGE` no schema, lê zero linha |
| **S2** | Credencial do Worker de escrita, papel `experiencia_app` | Segredo do Cloudflare (`wrangler secret put`) | Quem tem acesso à conta do Cloudflare | Três funções e três tabelas de conteúdo público. Escrever resposta falsa, e nada mais (seção 3.5) |
| **S3** | Credencial do Worker de rotina, papel `experiencia_rotina` | Segredo do Cloudflare | idem | Escrita de venda, log, classificação, e a anonimização de `cliente`. **Não lê dado pessoal** |
| **S4** | `RESEND_API_KEY` | Segredo do Cloudflare | idem | Enviar e-mail como o domínio da casa. Vazada, permite phishing com o remetente da casa, que é o dano real dela |
| **S5** | `GROQ_API_KEY` | Segredo do Cloudflare | idem | Consumir a cota de LLM. Dano baixo: **menos de 0,1% da cota** é o uso normal (`N03`) |
| **S6** | `DRIVE_SA_JSON`, conta de serviço do Google | Segredo do Cloudflare | idem | Leitura de **uma** pasta do Drive, somente leitura. Nunca OAuth de usuário |
| **S7** | `SUPABASE_DB_URL`, string de conexão do papel `experiencia_dump` | Segredo do repositório no GitHub | Quem é administrador do repositório | `SELECT` nas 26 tabelas e uma linha em `execucao_rotina`. **É a credencial que lê a base de clientes inteira**, e é a mais valiosa que vive online |
| **S8** | `B2_KEY_ID` e `B2_APP_KEY` | Segredos do repositório no GitHub | idem | `writeFiles` e `listBuckets` num bucket, **sem `readFiles`, sem `deleteFiles`, sem expiração** (`D7`). Vazada, escreve lixo e não lê nem apaga backup |
| **S9** | `AGE_PUBLIC_KEY` | **Variable** do repositório, não segredo | Todo mundo com acesso ao repositório | Nada. Chave pública não é segredo |
| **S10** | **Chave privada `age`** | **Fora de todo sistema online.** Gerenciador de senhas do proprietário e **uma cópia impressa em papel no cofre do restaurante** | Proprietário, e o segundo administrador se o proprietário decidir | **Todos os backups, do primeiro ao último.** É o segredo mais poderoso do projeto e o único que não existe em plataforma nenhuma |
| **S11** | Senha e 2FA das **2 contas** de administrador do Supabase, e a senha do papel de migração (`postgres`) | Gerenciador de senhas de cada administrador | Proprietário e sócio, separadamente. **Nenhuma senha compartilhada e nenhuma conta genérica de admin** (`F57`) | O projeto inteiro, **inclusive o sistema fiscal**. É o maior raio de dano do sistema |
| **S12** | PIN de configuração do **Fully Kiosk** nos 5 tablets | Gerenciador de senhas do proprietário mais um cartão no cofre | Proprietário e gerente de turno | Sair do modo quiosque num aparelho. Vazado, um cliente curioso alcança o navegador e a fila local do aparelho (exposição 2 da seção 1.3) |

**O que não é segredo, e é declarado para ninguém tratar como tal:** o PIN do garçom (seção 4), a chave pública
`age`, a chave publicável do Supabase, o `ref` do projeto, os nomes de tabela e a URL do painel. Tratar uma
dessas como segredo é o caminho mais curto para não trocar as que são.

### 5.2 As quatro regras que valem para todos

1. **Nenhuma credencial serve duas funções.** Separar limita o estrago de um vazamento isolado (`D7`). O caso que
   este documento acrescenta é o mais importante: **a chave de serviço do Supabase não é usada por nada nosso**,
   porque ela é a mesma do sistema fiscal e ignora RLS. Ver **DV1** na seção 9.
2. **Nenhum segredo entra no repositório, em nenhuma forma.** `.gitignore` e um `.env.example` com valores vazios
   já estão no repositório, e é assim que fica. Segredo vive em segredo de plataforma: Cloudflare para o Worker,
   GitHub para o backup, gerenciador de senhas para o humano.
3. **Nenhum segredo entra em `configuracao`**, que é lida por três papéis e sai no dump (seção 3.3, tabela 16).
4. **A chave do B2 nunca tem expiração**, de propósito, porque chave com prazo faria o backup morrer calado
   (`D7`). É a única exceção deliberada à intuição de que credencial deve expirar, e ela existe porque a falha
   silenciosa é pior que a credencial longa.

### 5.3 O procedimento único de rotação, e o que fica de fora dele

Quatro passos, na ordem, e servem para S2 a S8:

1. **Gerar a credencial nova** na plataforma de origem, sem revogar a antiga ainda.
2. **Trocar o segredo** na plataforma que consome (`wrangler secret put`, ou Settings do repositório).
3. **Rodar a rotina à mão uma vez** e conferir a linha em `execucao_rotina` com `status = sucesso`.
4. **Só então revogar a antiga.** A ordem existe para que a rotação não vire indisponibilidade, e o passo 3 é o
   que separa "trocado" de "trocado e funcionando".

**Duas coisas ficam fora deste procedimento, e as duas são o motivo de a seção existir:**

- **S10, a chave privada `age`, não se rotaciona sem consequência.** Gerar par novo e trocar `AGE_PUBLIC_KEY`
  torna os backups futuros legíveis pela chave nova, e **os antigos continuam legíveis só pela antiga**. Portanto
  a chave antiga não se destrói: ela fica guardada até o último objeto cifrado com ela sair do bucket, o que
  acontece sozinho em **8 semanas** por lifecycle (`N12`). Guardar duas chaves por 8 semanas é o preço de
  rotacionar.
- **S11, as contas de administrador**, envolvem o sistema fiscal. Trocar a senha do papel de migração exige
  atualizar `SUPABASE_DB_URL` no GitHub, senão o backup morre no domingo seguinte. É o modo de falha número um
  de `backup_semanal`, e o `set -euo pipefail` mais o e-mail automático de workflow falho são o que o transformam
  em aviso em vez de silêncio.

### 5.4 O que fazer quando cada um vaza

| Segredo | Primeira ação, em minutos | O que se perde no caminho | Dano residual depois da rotação |
|---|---|---|---|
| **S1** | Nada. Não é vazamento | Nada | Nenhum, e se houver, o erro está nas políticas da seção 3, não na chave |
| **S2** | Rotacionar e reimplantar o Worker de escrita | **Nada.** A coleta continua dentro dos aparelhos e a fila sobe depois | Resposta falsa gravada antes da rotação. Identificar por `dispositivo_id` ausente ou por pico de `suspeita`, marcar as linhas e **não apagar**: elas ficam com `suspeita = true` e fora dos indicadores |
| **S3** | Rotacionar e reimplantar o Worker de rotina | O digest do dia, se a rotação passar das 16h | Venda ou classificação adulterada, refazível a partir do arquivo bruto e de `resposta_texto` |
| **S4** | Revogar a chave no Resend, gerar nova | Digest e alerta até a troca | **E-mail enviado como a casa.** Avisar os quatro destinatários e conferir a fila de envio do Resend no período |
| **S5** | Revogar no Groq | Classificação do dia. O digest sai completo, com `diagnóstico indisponível hoje` | Cota consumida. Nenhum dado exposto além do que a seção 8 permite enviar |
| **S6** | Revogar a conta de serviço no Google | Import automático até a troca. O botão de importar planilha continua funcionando | Leitura da pasta do Drive por quem vazou. Conferir o que estava na pasta |
| **S7** | **Rotacionar a senha de `experiencia_dump` imediatamente** | O backup da semana | **Este é o pior caso online: quem tem a string leu a base de clientes inteira.** Tratar como incidente pelo caminho da seção 6.10 |
| **S8** | Revogar a chave no B2 e gerar nova, presa ao mesmo bucket, com as mesmas duas capacidades | Nada, até o próximo domingo ou quarta | Lixo escrito no bucket. Não lê e não apaga backup. Remover os objetos estranhos com a credencial da conta |
| **S9** | Nada | Nada | Nenhum |
| **S10** | **Gerar par novo, trocar `AGE_PUBLIC_KEY`, e guardar a antiga em separado** | Nada de imediato | **Todo backup ainda no bucket passa a ser legível por quem tem a chave.** Não existe como desfazer. O que limita a exposição é o lifecycle de **56 dias mais 1**, que fecha a janela sozinho em 8 semanas, e é a segunda função dessa regra |
| **S11** | Trocar senha, revalidar 2FA, e conferir sessões ativas nas duas contas | Acesso ao painel do Supabase durante a troca | **O sistema fiscal está no mesmo projeto.** Tratar como incidente do projeto inteiro, não da pesquisa |
| **S12** | Trocar o PIN nos **5** aparelhos | Nada | Um aparelho pode ter saído do quiosque. Conferir a fila local e o histórico do navegador em cada um |

**A regra de ouro deste bloco, para um sistema sem mantenedor:** vazamento de credencial online custa uma
rotação de quatro passos e não custa dado. Vazamento de **S10** não custa rotação nenhuma e custa toda a série de
backups. É por isso que a chave privada `age` não pode estar em nenhum sistema online, em nenhuma forma, nem como
segredo de repositório, nem em nota de aplicativo, nem em anexo de e-mail, nem em conversa. **Duas cópias
offline, e nenhuma online.**

---

## 6. LGPD aplicada

Uma subseção por obrigação, e cada uma diz **o que o sistema faz de concreto**, com nome de tabela, coluna,
rotina e tela. Onde a obrigação exige uma decisão do proprietário, a decisão está marcada como pendência.

**Aviso que vale para as onze subseções, e para a seção 7:** os números de artigo citados aqui **precisam ser
conferidos contra o texto da lei antes de publicar qualquer coisa**. A apuração deste projeto **não conseguiu ler
o texto integral da Lei 13.709 porque o Planalto devolveu HTTP 503**, e as referências estão apoiadas em guias da
ANPD e em documentos anteriores deste repositório. Toda citação abaixo carrega a marca **número a conferir**.
Revisão jurídica é **opcional e recomendada**, e a seção 7.4 diz exatamente o que perguntar a um advogado em
menos de uma hora.

### 6.1 Quem é quem no tratamento

| Papel legal | Quem | O que isso obriga |
|---|---|---|
| **Controlador** | QT Pizza Bar, razão social e CNPJ **NÃO VERIFICADO**, pendência do proprietário | Decide finalidade e meio. É quem responde ao titular e à ANPD |
| **Operadores** | Supabase (banco, `sa-east-1`), Cloudflare (execução e hospedagem), Resend (e-mail), Groq (LLM), Google (pasta do Drive), Backblaze (bucket do backup), GitHub (execução do backup) | Tratam em nome do controlador. O que se registra de cada um é a finalidade e a região (seção 6.9) |
| **Encarregado** | O proprietário acumula o canal de contato. **Como agente de tratamento de pequeno porte, a designação formal de encarregado é dispensada, e o canal de comunicação continua obrigatório** (Res. CD/ANPD nº 2/2022, **número de artigo a conferir**) | Um endereço publicado em `/privacidade` que alguém lê. Ver a pendência da seção 6.7 |
| **Titulares** | **cliente** (quem responde e quem deixa contato) e **colaborador** (garçom, pela atribuição da resposta, seção 4.4) | Duas categorias no registro de operações, não uma |

### 6.2 Base legal por finalidade

Cada finalidade tem uma base, e nenhuma finalidade nova entra sem passar por esta tabela primeiro.

| Finalidade | Dado tratado | Base legal | O que o sistema faz de concreto |
|---|---|---|---|
| **Medir e melhorar o serviço** | nota, opções, item, comentário, mesa digitada, aparelho, idioma, tempos de tela | **Consentimento** do titular na tela (LGPD art. 7º, I, **número a conferir**), registrado em `consentimento` com `finalidade = 'pesquisa'` | Nenhuma resposta é aceita sem uma versão vigente de `consentimento_texto` (`F44`). O aceite grava `aceito_em` e `versao_texto` |
| **Responder quem pediu contato** | nome, e-mail, WhatsApp, nascimento | **Consentimento próprio e separado**, `finalidade = 'contato'` | Duas caixas, **nenhuma pré-marcada** (`F45`). Sem consentimento não existe linha em `cliente` |
| **Promoção e campanha** | os mesmos | **Não existe no MVP.** Exigiria consentimento próprio e destacado | A caixa não existe na tela. Ela entra junto com a primeira campanha, na **M3 Recorrência** |
| **Atribuir a resposta ao atendimento** | `garcom_pin_digitado`, `garcom_id`, `dispositivo_id`, `mesa_digitada` | **Legítimo interesse** na gestão da operação (art. 7º, IX, **número a conferir**) | A salvaguarda que sustenta a proporcionalidade é `D8`: nenhuma meta, ranking, semáforo ou bônus por nota, e corte trimestral com `n` mínimo de **20** |
| **Classificar o comentário por IA** | trecho do comentário, sem identificador | Mesma base da pesquisa. A IA é **operador**, e o que sai daqui está na seção 8 | Teste automatizado reprova payload que casa com padrão de telefone, e-mail, CPF ou `uuid` |
| **Guardar backup cifrado fora do Supabase** | o schema `experiencia` inteiro, inclusive `cliente` | **Legítimo interesse** em segurança da informação, como medida do art. 46 (**número a conferir**) | `age` assimétrico, chave privada fora de toda plataforma, retenção de **8 semanas** por lifecycle. E o destino entra nas categorias de compartilhamento do aviso (`F53`) |
| **Cumprir direito do titular** | `exclusao_pedido`, `anonimizado_em`, `atendido_em` | **Obrigação legal** | O pedido é gravado, o atendimento é datado, e pedido aberto há mais de **7 dias** vira linha no digest |

**Duas afirmações que este documento recusa fazer, porque não se sustentam:** que a pesquisa é anônima e portanto
está fora da LGPD (não é, porque `T6` pode ligar contato à resposta, e mesa individual pode ser associável), e
que legítimo interesse cobre a base de clientes (não cobre: contato pedido ao titular sem consentimento próprio
seria coleta sem base para a finalidade declarada).

### 6.3 Consentimento com versão e horário

O que a fiscalização pede não é o aceite, é **a prova de qual texto foi aceito, quando**. O desenho entrega os
dois, e três detalhes fazem a diferença:

1. **`consentimento_texto` é append-only no banco**, e não por disciplina: a seção 3.3 não dá `UPDATE` nem
   `DELETE` a papel nenhum. Editar cria versão nova, e a versão antiga continua legível para sempre.
2. **`consentimento` também não tem escritor nem editor.** A linha nasce dentro de `fn_grava_resposta`, com
   `finalidade`, `aceito_em` e `versao_texto`, e nunca pode ser alterada depois.
3. **A versão gravada é a que foi exibida, mesmo offline.** Se o texto mudar enquanto o tablet estava sem rede,
   `versao_texto` aponta para a versão antiga, que é exatamente o que a prova exige (seção 2.3 de
   [`01-arquitetura.md`](01-arquitetura.md)).

**Nenhuma caixa é pré-marcada, e o botão `Pular` da `T6` tem o mesmo tamanho do botão de enviar** (`F46`), porque
consentimento obtido por desenho assimétrico de botão não é livre.

**Teste de aceite (`F45`):** consentir, publicar uma versão nova de texto, consentir de novo, e conferir que as
duas linhas de `consentimento` apontam para versões diferentes de `consentimento_texto`.

### 6.4 Minimização, dita pelo que **não** se coleta

Princípio da necessidade. A lista do que não entra é mais informativa que a do que entra.

| Não coletamos | Por quê |
|---|---|
| **CPF, RG, endereço, CEP** | Nenhuma finalidade declarada precisa. O fornecedor atual coleta CEP; nós não |
| **Endereço IP e `user_agent` de quem responde** | O `user_agent` sobrevive só nas **74 linhas** históricas de `convite_clique`, preservadas como veio (`N40`), e **não existe coluna de `user_agent` na resposta nova** (`F42` da seção 4.1 de `02-replicar.md`). IP não é gravado em lugar nenhum do schema |
| **`fingerprinting` do celular do cliente** | Tratamento oculto: o titular não pode se opor ao que não sabe que existe. Expressão proibida pela folha canônica. O aparelho identificado é **o da casa**, em `dispositivo` |
| **Geolocalização, áudio, imagem, vídeo** | Nenhuma finalidade |
| **Nota de sentimento de 0 a 100 e qualquer perfil comportamental** | Expressão proibida. Existem `polaridade` e `severidade`, que são categorias fechadas |
| **Comanda, item consumido de fato, valor da conta por mesa** | A junção com o PDV é por `dia_operacional`, e nada além dele. Junção por comanda é expressão proibida |
| **Idade, gênero, dado de saúde, restrição alimentar como dado de pessoa** | `precisao_pedido.restricao_alimentar` é **fator de falha do pedido**, não cadastro de restrição do titular. Se algum dia virar cadastro, é dado sensível (art. 11, **número a conferir**) e exige consentimento específico |
| **Lista comprada, enriquecimento de base, cruzamento com terceiro** | Nenhum |

**E a minimização positiva, que é a mais importante:** uma resposta com **só a nota** é gravada, contada como
completa e aparece em todos os indicadores (`F46`). O caminho padrão da pesquisa **não coleta dado pessoal
nenhum**.

### 6.5 Retenção, com a rotina que executa

| O que | Prazo | Quem executa | Prova de que rodou |
|---|---|---|---|
| Dado pessoal de cliente: `nome`, `email`, `whatsapp`, `nascimento` | **12 meses contados da última visita** (`D4`, `N10`) | `cron_retencao`, mensal, **dia 1, 05h** local, `0 8 1 * *` em UTC | `cliente.anonimizado_em` preenchido, e a contagem de linhas anonimizadas em `execucao_rotina`, visível em `/painel/saude` |
| Resposta da pesquisa: nota, opções, item, comentário, garçom, `dia_operacional` | **Indefinidamente, desvinculada do contato** (`N11`) | Ninguém apaga. Não existe `DELETE` para papel nenhum | A série continua completa, que é o ativo que o projeto existe para preservar |
| Comentário aberto, antes de ser tratado como dado não pessoal | **Varredura de padrão** (telefone, e-mail, CPF) na desvinculação, com o trecho mascarado | `cron_retencao`, pelo `UPDATE (texto_cru)` da seção 3.3 | Contagem de mascaramentos em `execucao_rotina` |
| Backup cifrado | **8 semanas**, `daysFromUploadingToHiding = 56` e `daysFromHidingToDeleting = 1` (`N12`) | Lifecycle do bucket, configurada uma vez, sem ninguém tocando depois | Contagem de objetos no bucket, e ausência de dump por **2 semanas** aparece em `/painel/saude` |
| `consentimento` e `exclusao_pedido` | Guardados como prova, sem prazo de descarte no MVP | Ninguém | Apagar a prova de consentimento seria apagar a defesa do controlador |
| Log de execução (`execucao_rotina`) e arquivo bruto do R3 (`execucao_importacao`) | Sem poda no MVP, e isso está declarado, não esquecido (ADR-12) | Ninguém | Contam nos **500 MB** do plano gratuito |

**A honestidade que quase todo aviso de privacidade omite, e que entra no nosso:** o titular anonimizado hoje
**continua existindo dentro dos dumps cifrados por até 8 semanas**, porque backup não se edita. O prazo real de
desaparecimento é 12 meses da última visita **mais até 8 semanas**, e isso está escrito no aviso completo (seção
7.2, item 6). Prometer exclusão imediata seria promessa que o desenho não cumpre.

### 6.6 Direito de acesso e de correção

| Direito | O caminho concreto do titular | O que o sistema faz |
|---|---|---|
| **Confirmação de tratamento e acesso** | `/privacidade`, formulário de pedido, ou o endereço publicado no aviso | O pedido entra em `exclusao_pedido`. A resposta é gerada da linha de `cliente` mais as respostas ligadas a ela, e entregue pelo mesmo contato que o titular deixou |
| **Correção de dado incompleto ou desatualizado** | Mesmo canal | `UPDATE` em `cliente` pelo administrador, que é o único papel com esse privilégio (seção 3.3, tabela 17). **A resposta da pesquisa não se corrige**, porque ela é declaração do titular no momento e alterá-la falsificaria a série |
| **Portabilidade e cópia** | Mesmo canal | `vw_exportacao_cliente` e as demais views de exportação, em CSV e Excel (`F52`) |
| **Revogação do consentimento** | Mesmo canal | Tratada como pedido de exclusão do contato, com a resposta preservada e desvinculada |
| **Oposição e revisão de decisão automatizada** | Mesmo canal | **Não existe decisão automatizada sobre pessoa neste sistema.** A IA classifica texto e redige parágrafo, e nada decide sobre cliente nem sobre colaborador. É `D8` que garante isso do lado do colaborador |

**Como se verifica a identidade de quem pede, sem criar cadastro para isso:** a resposta ao pedido vai **para o
contato que o titular deixou**, e nunca para um contato informado no pedido. Quem não deixou contato não tem dado
pessoal no sistema para acessar, e a resposta honesta é essa. É a verificação mais barata possível e não exige
guardar documento de ninguém.

### 6.7 Exclusão, com o caminho do titular escrito ponta a ponta

1. O titular abre `/privacidade`, pelo link do rodapé da `T6`, do aviso completo e do rodapé de todo e-mail
   enviado a cliente (no MVP não existe e-mail a cliente, então a página basta, `F47`).
2. Preenche o pedido. A escrita é anônima e entra por `experiencia_app`, com `INSERT` e **sem `SELECT`**
   (seção 3.3, tabela 20), gravando `contato_informado` e `pedido_em`.
3. O prazo está escrito na página. **Como agente de pequeno porte, o prazo é em dobro (Res. CD/ANPD nº 2/2022,
   art. 14, número a conferir) e a declaração simplificada pode ser fornecida em até 15 dias (art. 15, número a
   conferir).**
4. Pedido aberto há mais de **7 dias** vira linha no e-mail das 16h, para o proprietário (`N43`). É o que impede
   o pedido de morrer em silêncio, que é o modo de falha real desta obrigação.
5. O administrador atende: `UPDATE` em `cliente` apagando `nome`, `email`, `whatsapp` e `nascimento`, e
   preenchendo `anonimizado_em`. **A resposta da pesquisa é mantida, desvinculada.**
6. `atendido_em` e `resultado` são gravados em `exclusao_pedido`, e essa linha nunca é apagada, porque ela é a
   prova de cumprimento.

**Pendência que trava a publicação da página, e ela é do proprietário:** o endereço de contato de privacidade
depende do nome do produto e do subdomínio (`P6`), e a razão social e o CNPJ do controlador são
**NÃO VERIFICADO**. Sem os três, o aviso da seção 7 sai com marcador no lugar, e **aviso com marcador não vai
para o salão**.

### 6.8 Registro das operações de tratamento

Obrigação da Res. CD/ANPD nº 2/2022, **art. 9, número a conferir**. Uma página, num arquivo, fora do sistema
(`F59`).

- **Arquivo:** `docs/registro-tratamento.md` (**não existe ainda**), cobrado na entrega **Base de clientes com
  consentimento, dois administradores com 2FA e registro de tratamento**, na **M1 Coleta própria**.
- **Colunas obrigatórias:** finalidade, base legal, categorias de titular (**cliente** e **colaborador**),
  categorias de dado, com quem é compartilhado, país de destino, prazo de retenção, medidas de segurança.
- **Quando se revisa:** quando entra finalidade nova (campanha, WhatsApp, delivery, reservas), **não** por
  calendário. Revisão por calendário é a que fica velha em silêncio.
- **O que preenche as colunas sem trabalho novo:** as seções 6.2 (base legal), 6.4 (dado), 6.5 (retenção), 6.9
  (compartilhamento) e 2 e 3 (medidas de segurança) deste documento. O registro é uma consolidação, não uma
  apuração nova.
- **O log técnico é outro, e complementa:** `execucao_rotina` guarda a lista de destinatários de cada envio, o que
  permite responder "quem recebeu o quê" meses depois (`F29`), e é o log que sobra quando o do Resend expira em
  **30 dias** e o do Supabase em 1 dia.

### 6.9 Categorias de compartilhamento, com destino e região

Sete operadores, e a coluna da região é a que decide se existe transferência internacional.

| Com quem | O que sai | Onde fica | Região | Base e observação |
|---|---|---|---|---|
| **Supabase** (banco) | Tudo | `NFe e Financeiro`, `rzrjdbnxhpwzqgqrlfwa` | **`sa-east-1`, São Paulo** | Sem transferência internacional. É o ganho de `D2`, e **região não se troca depois de criada** |
| **Cloudflare** (execução do Worker e hospedagem do PWA e do painel) | Resposta em trânsito, e o pacote de coleta | Rede global, execução no ponto mais próximo | **Pode processar fora do Brasil.** Qual ponto atende São Paulo: **NÃO VERIFICADO** | Tratamento em trânsito, sem armazenamento próprio de dado pessoal do nosso lado |
| **Resend** (e-mail) | Digest das 16h e alerta de detrator, com mesa, hora, nota e fator. Endereço dos destinatários | Servidores do provedor | **Fora do Brasil** (**NÃO VERIFICADO** qual país) | Retenção de log de **30 dias** (`N23`). **O digest não leva nome, e-mail nem WhatsApp de cliente**, e essa é uma regra de conteúdo do template |
| **Groq** (LLM) | Trecho de comentário sem identificador, nota e faixa (seção 8) | Servidores do provedor | **Fora do Brasil** (**NÃO VERIFICADO** qual país) | Escolhido por contrato de privacidade: a cláusula proíbe usar entrada e saída para treino (ADR-07) |
| **Google** (pasta do Drive) | Nada nosso sai. **Entra** o arquivo do R3 | Conta do proprietário | Fora do Brasil | Conta de serviço, somente leitura, em **uma** pasta |
| **Backblaze B2** (bucket do backup) | **O schema `experiencia` inteiro, cifrado, inclusive `cliente`** | Bucket privado | **Fora do Brasil.** Qual região do bucket: **decisão pendente do proprietário**, e ela precisa ser consciente porque entra no aviso | **É o compartilhamento mais sensível do sistema.** Cifrado com `age`, chave privada fora de toda plataforma, retenção de 8 semanas |
| **GitHub** (execução do `backup_semanal`) | O dump passa pelo runner, em claro por segundos, e sai cifrado | Runner efêmero | Fora do Brasil | O `rm -f` do dump em claro é obrigatório, e o runner **não consegue ler nenhum backup**, nem os que ele mesmo escreveu (`D7`) |

**A regra que reduz esta tabela em uma linha, e que é uma correção ao comando publicado:** o `backup_semanal`
dumpa **`--schema=experiencia`**, e não o banco inteiro. Sem isso, o dump levaria `notas`, `itens_nota`,
`fornecedores` e o resto do sistema fiscal para um bucket fora do Brasil, o que é um compartilhamento sem
finalidade declarada e sem base legal para essa nova localização. Ver **DV3** na seção 9.

**Sobre transferência internacional.** As regras da ANPD para transferência internacional e as cláusulas-padrão
contratuais estão em resolução própria, cujo **número e data precisam ser conferidos**. O que este documento
afirma é o que ele consegue sustentar: as transferências existem, estão nomeadas na tabela acima, entram no aviso
de privacidade e no registro de operações, e a mais sensível delas (o backup) sai cifrada com chave que o destino
não possui, o que é a medida técnica que reduz o risco real dessa transferência a quase zero.

### 6.10 Incidente, e o que se faz nos primeiros 60 minutos

Não existe equipe de resposta, então o procedimento tem que caber numa página e ser executável por uma pessoa.

| Passo | O que fazer |
|---|---|
| 1 | **Conter.** Rotacionar a credencial envolvida pelo procedimento de 5.3, na ordem, sem revogar antes de trocar |
| 2 | **Registrar, mesmo sem saber a extensão.** Data, hora, o que se sabe, o que não se sabe, e quem agiu, num arquivo do repositório. Registro feito na hora vale mais que relatório perfeito depois |
| 3 | **Medir o alcance com o que já existe.** `execucao_rotina` diz o que rodou; `execucao_importacao` guarda o arquivo bruto; `alerta_detrator` e `resposta` têm carimbo de tempo. O que **não** existe é log de leitura por linha, e isso está declarado na seção 9 como fora de escopo |
| 4 | **Decidir sobre comunicação.** Incidente com risco relevante a titular exige comunicação à ANPD e ao titular (art. 48, **número a conferir**). Os dois casos que provavelmente disparam isso: vazamento de **S7** (a string do dump) e furto de tablet com fila pendente contendo contato |
| 5 | **Fechar com a correção estrutural**, não só com a rotação. Se o mesmo segredo podia estar em dois lugares, a correção é a regra 1 de 5.2 |

**A exposição residual honesta:** o sistema **não** tem registro de quem leu qual linha. Com dois administradores
e nenhum log de leitura, a resposta a "quem acessou a base de clientes" é "um dos dois, ou uma credencial
vazada". O único ponto instrumentado é a **exportação de clientes**, e ela depende da divergência **DV4** ser
resolvida antes de virar registro de verdade.

### 6.11 As duas honestidades que o aviso de privacidade é obrigado a dizer

Estão aqui porque são requisito de `F06`, `F25` e `F44`, e porque prometer o que o desenho não entrega é a falha
de LGPD mais comum em pesquisa de restaurante.

1. **O anonimato tem limite, e o limite é a mesa individual.** A resposta é anônima e o garçom não vê o que o
   cliente responde. Mas numa mesa com uma pessoa e uma comanda, a resposta pode ser associável ao atendimento
   pela mesa e pela hora. O aviso diz isso, em vez de prometer anonimato absoluto.
2. **Deixar contato liga a resposta ao titular, e isso é dito antes de pedir.** O rodapé da `T6`, que já está no
   código, é literal: `Sua nota já foi registrada. Se você deixar contato, ele fica ligado a esta resposta.`

---

## 7. O aviso de privacidade, por extenso

Quatro textos prontos: curto em português, curto em inglês, completo em português, completo em inglês. Os
marcadores entre colchetes são pendência do proprietário e **nenhum texto vai para o salão com marcador em pé**.

**Marcadores usados:** `[RAZÃO SOCIAL]`, `[CNPJ]` e `[ENDEREÇO]` são **NÃO VERIFICADO**; `[DOMÍNIO]` e o endereço
de privacidade dependem de `P6`; `[DATA]` e `[REGIÃO DO BUCKET]` entram na publicação.

### 7.1 Versão curta, a que cabe na tela do tablet

Três linhas, no rodapé da `T6`, que é onde o dado pessoal é pedido, com link para o texto completo.

**Português**

```
Seus dados: [RAZÃO SOCIAL] (CNPJ [CNPJ]) usa sua nota e seu comentário para melhorar o
serviço, e o contato que você deixar apenas para responder você. Guardamos em serviços de
nuvem, com backup cifrado fora do Brasil, e apagamos seu contato 12 meses depois da sua
última visita. Seus direitos e a lista completa: [DOMÍNIO]/privacidade
```

**Inglês**

```
Your data: [RAZÃO SOCIAL] (tax ID [CNPJ]) uses your rating and comment to improve our
service, and any contact you leave only to reply to you. We store it with cloud providers,
with an encrypted backup outside Brazil, and we erase your contact 12 months after your
last visit. Your rights and the full list: [DOMÍNIO]/privacy
```

**Na `T1`, onde nada pessoal é coletado, o rodapé continua sendo o que já está no código**
(`Sua resposta é anônima. O garçom não vê o que você responde.` e a versão em inglês), **mais o link
`Como usamos seus dados`**, que hoje existe só na `T6` do arquivo `src/coleta/questionario.ts`. Ver **DV6** na
seção 9: isto é uma leitura declarada de `F44`, e o motivo é que um rodapé de três linhas que enumera seis
operadores não é informação, é ruído que ninguém lê e que come o teto de **45 segundos**.

### 7.2 Versão completa em português, para `/privacidade`

> **Aviso de privacidade da pesquisa de experiência**
> Versão 1.0, vigente desde [DATA]. Esta é a versão registrada em `consentimento_texto`, e o seu consentimento
> aponta para a versão que estava na tela quando você aceitou.
>
> **1. Quem trata seus dados.** [RAZÃO SOCIAL], CNPJ [CNPJ], [ENDEREÇO], é a controladora dos dados desta
> pesquisa. Para falar sobre privacidade, escreva para privacidade@[DOMÍNIO].
>
> **2. O que coletamos.** Sempre: a nota de 0 a 10. Opcionalmente, se você quiser: as opções que você marca, o
> item do cardápio que você aponta, o comentário que você escreve, e o contato que você deixa na última tela
> (nome, WhatsApp ou e-mail, e data de nascimento). Registramos também o número da mesa e o PIN que o garçom
> digita, qual tablet foi usado, o idioma e quanto tempo cada tela ficou aberta. **Uma resposta com só a nota é
> completa e conta igual às outras.**
>
> **3. Para que usamos, e com que base.** A nota, as opções e o comentário são usados para melhorar o serviço,
> com base no seu consentimento, dado na tela. O contato é usado apenas para responder você, com base num
> consentimento separado, que você dá marcando outra caixa. A mesa, o PIN do garçom e o tablet são usados para
> saber onde e como a experiência aconteceu, com base no legítimo interesse da casa em gerir a operação, e
> **nenhuma meta, ranking, prêmio ou bônus é calculado sobre a sua nota.** O backup cifrado existe para não
> perdermos seu histórico nem o seu pedido de exclusão.
>
> **4. Não usamos para promoção.** Hoje não enviamos campanha, oferta nem mensagem de aniversário. Se um dia
> passarmos a enviar, vamos pedir um consentimento novo e destacado, e você poderá recusar sem perder nada.
>
> **5. O que não coletamos.** Não pedimos CPF, documento, endereço nem CEP. Não usamos cookie de rastreio, não
> identificamos o seu celular, não guardamos o endereço IP nem o modelo do aparelho de quem responde pelo QR
> Code. Não gravamos áudio, imagem nem vídeo. Não compramos lista de contatos e não cruzamos seus dados com
> nenhuma base de terceiro.
>
> **6. Por quanto tempo guardamos.** Seu contato (nome, WhatsApp, e-mail e nascimento) é apagado
> automaticamente **12 meses depois da sua última visita**, por uma rotina que roda todo dia 1º. Sua resposta de
> pesquisa (nota, opções, item, comentário) é mantida por tempo indeterminado, **desvinculada do seu contato**,
> porque é o histórico que nos permite melhorar. Nossos backups são cifrados e apagados sozinhos em **8
> semanas**, então, sendo honesto com você: depois que seu contato é apagado, ele ainda pode existir dentro de um
> backup cifrado por até 8 semanas, e depois desaparece.
>
> **7. Com quem compartilhamos.** Com prestadores que fazem o sistema funcionar, e só para isso: o banco de
> dados fica no Brasil (São Paulo); a hospedagem e o processamento das telas são de um provedor de rede global; o
> envio de e-mail interno é feito por um provedor de e-mail; a leitura automática dos comentários é feita por um
> provedor de inteligência artificial, que recebe **apenas o texto do comentário e a nota, sem nenhum dado que
> identifique você**; e o backup cifrado fica num armazenamento em nuvem em [REGIÃO DO BUCKET]. Alguns desses
> prestadores estão fora do Brasil, o que caracteriza transferência internacional, e o backup sai daqui **cifrado
> com uma chave que o destino não possui**.
>
> **8. Sobre o comentário que você escreve.** O campo é livre, então escreva o que quiser. Só pedimos que evite
> escrever nome, telefone, e-mail ou CPF, seu ou de outra pessoa. Antes de tratarmos o comentário como dado não
> pessoal, passamos uma verificação automática que procura esses padrões e mascara o trecho.
>
> **9. Sobre o anonimato, com honestidade.** Sua resposta é anônima e o garçom não vê o que você respondeu, nem
> na hora nem depois. Mas se você estava sozinho, numa mesa individual e com uma comanda só, a sua resposta pode
> ser associável ao seu atendimento pela mesa e pela hora. Preferimos escrever isso a prometer um anonimato
> absoluto que o sistema não entrega.
>
> **10. Inteligência artificial.** Usamos um serviço de IA para separar os comentários por assunto e para
> escrever um resumo diário para a equipe. O que enviamos é **o texto do comentário, a nota e a faixa da nota**,
> sem nome, sem telefone, sem e-mail, sem número de mesa e sem qualquer identificador. Nenhuma decisão sobre você
> é tomada de forma automatizada.
>
> **11. Segurança.** O acesso ao sistema é restrito a duas contas de administrador, com verificação em duas
> etapas. Os tablets do salão ficam em modo quiosque e não guardam nenhuma senha do sistema. Os backups são
> cifrados antes de sair do nosso banco de dados, com uma chave que não fica guardada em nenhum serviço online.
>
> **12. Seus direitos.** Você pode pedir confirmação de que tratamos seus dados, acesso a eles, correção do que
> estiver errado, portabilidade, exclusão do seu contato e revogação do consentimento, a qualquer momento e sem
> custo. O caminho é [DOMÍNIO]/privacidade ou privacidade@[DOMÍNIO]. Respondemos pelo mesmo contato que você
> deixou. Como somos um agente de tratamento de pequeno porte, nosso prazo de resposta é o prazo dobrado previsto
> na regulamentação da ANPD, e podemos enviar uma declaração simplificada em até 15 dias. Se você não deixou
> contato, não temos nenhum dado pessoal seu para acessar ou apagar, e sua resposta já é anônima.
>
> **13. Menores de idade.** A pesquisa é entregue junto com a conta, a quem está pagando. Não perguntamos idade e
> não direcionamos nada a crianças. Se um responsável quiser apagar o dado de um menor, o canal é o mesmo do item
> 12.
>
> **14. Mudanças neste aviso.** Cada mudança cria uma versão nova, e as versões antigas ficam guardadas. O seu
> consentimento continua apontando para a versão que você viu.
>
> **15. Reclamação.** Se você não ficar satisfeito com a nossa resposta, pode procurar a Autoridade Nacional de
> Proteção de Dados (ANPD).

### 7.3 Versão completa em inglês, para `/privacy`

> **Privacy notice for our guest experience survey**
> Version 1.0, in force since [DATA]. This is the version recorded in `consentimento_texto`, and your consent
> points to the version that was on screen when you accepted it.
>
> **1. Who controls your data.** [RAZÃO SOCIAL], Brazilian tax ID (CNPJ) [CNPJ], [ENDEREÇO], is the controller
> of the data collected in this survey. For privacy matters, write to privacidade@[DOMÍNIO].
>
> **2. What we collect.** Always: your 0 to 10 rating. Optionally, only if you choose to: the options you tap,
> the menu item you point out, the comment you write, and the contact details you leave on the last screen (name,
> WhatsApp number or email, and date of birth). We also record the table number and the server PIN typed by your
> server, which tablet was used, the language and how long each screen stayed open. **A response with the rating
> alone is complete and counts the same as any other.**
>
> **3. Why we use it, and on what legal basis.** The rating, the options and the comment are used to improve our
> service, based on the consent you give on screen. Contact details are used only to reply to you, based on a
> separate consent that you give by ticking a second box. The table, the server PIN and the tablet are used to
> know where and how the experience happened, based on the restaurant's legitimate interest in running its
> operation, and **no target, ranking, prize or bonus is ever calculated from your rating.** The encrypted backup
> exists so that we do not lose your history or your deletion request.
>
> **4. We do not use it for marketing.** Today we send no campaigns, offers or birthday messages. If we ever do,
> we will ask for a new, separate and clearly highlighted consent, and you will be able to refuse without losing
> anything.
>
> **5. What we do not collect.** We do not ask for your national ID, any identity document, your address or
> postcode. We use no tracking cookies, we do not fingerprint your phone, and we do not store the IP address or
> the device model of people answering through the QR code. We record no audio, images or video. We buy no
> contact lists and we do not combine your data with any third party database.
>
> **6. How long we keep it.** Your contact details (name, WhatsApp, email and date of birth) are erased
> automatically **12 months after your last visit**, by a routine that runs on the 1st of every month. Your
> survey response (rating, options, item, comment) is kept indefinitely, **unlinked from your contact details**,
> because it is the history that lets us improve. Our backups are encrypted and delete themselves after **8
> weeks**, so, to be straight with you: after your contact details are erased, they may still exist inside an
> encrypted backup for up to 8 weeks, and then they are gone.
>
> **7. Who we share it with.** Only with providers that make the system work, and only for that: the database is
> hosted in Brazil (São Paulo); the screens are hosted and processed by a global network provider; internal
> emails are sent through an email provider; comments are sorted by an artificial intelligence provider, which
> receives **only the text of the comment and the rating, with nothing that identifies you**; and the encrypted
> backup is stored in cloud storage in [REGIÃO DO BUCKET]. Some of these providers are outside Brazil, which
> means an international transfer, and the backup leaves us **encrypted with a key the destination does not
> hold**.
>
> **8. About the comment you write.** The field is free text, so write whatever you want. We only ask that you
> avoid writing names, phone numbers, emails or national ID numbers, yours or anyone else's. Before we treat a
> comment as non personal data, we run an automatic check for those patterns and mask that part of the text.
>
> **9. About anonymity, honestly.** Your response is anonymous and your server does not see what you answered,
> neither at the time nor later. But if you were on your own, at a single table with a single bill, your response
> may be associable with your service through the table and the time. We would rather write that down than
> promise an absolute anonymity the system does not deliver.
>
> **10. Artificial intelligence.** We use an AI service to sort comments by topic and to write a short daily
> summary for the team. What we send is **the text of the comment, the rating and the rating band**, with no
> name, no phone number, no email, no table number and no identifier of any kind. No decision about you is made
> automatically.
>
> **11. Security.** Access to the system is restricted to two administrator accounts, both with two factor
> authentication. The tablets in the dining room run in kiosk mode and hold no system password. Backups are
> encrypted before they leave our database, with a key that is not stored in any online service.
>
> **12. Your rights.** You may ask for confirmation that we process your data, access to it, correction of
> anything wrong, portability, deletion of your contact details and withdrawal of consent, at any time and free
> of charge. The route is [DOMÍNIO]/privacy or privacidade@[DOMÍNIO]. We reply through the same contact you left
> with us. As a small scale processing agent under Brazilian law, our response deadline is the doubled deadline
> set out in the ANPD regulation, and we may send a simplified statement within 15 days. If you left no contact
> details, we hold no personal data of yours to access or erase, and your response is already anonymous.
>
> **13. Minors.** The survey is handed over with the bill, to whoever is paying. We do not ask for age and we
> direct nothing at children. If a parent or guardian wants a minor's data erased, the route is the same as in
> item 12.
>
> **14. Changes to this notice.** Every change creates a new version, and older versions are kept. Your consent
> keeps pointing to the version you saw.
>
> **15. Complaints.** If you are not satisfied with our answer, you may contact the Brazilian data protection
> authority (ANPD).

### 7.4 Revisão jurídica: opcional, recomendada, e o que exatamente perguntar

**Revisão jurídica é opcional e recomendada.** O texto acima é utilizável como está, e uma leitura por advogado
custa pouco e fecha três pontos que não se resolvem por pesquisa.

**Antes de publicar, o que precisa ser conferido, em ordem de risco:**

1. **Os números de artigo.** Todos os artigos citados neste documento e no aviso estão marcados com
   **número a conferir**, porque a apuração deste projeto **não conseguiu ler o texto integral da Lei 13.709: o
   Planalto devolveu HTTP 503**. As referências estão apoiadas em guias da ANPD e em documentos anteriores deste
   repositório, e isso é apoio, não verificação. Conferir contra o texto oficial da lei e da Res. CD/ANPD nº
   2/2022 é a primeira tarefa, e ela é gratuita.
2. **Razão social, CNPJ e endereço do controlador**, hoje **NÃO VERIFICADO**.
3. **O endereço de privacidade e o domínio**, que dependem de `P6`.
4. **A região do bucket do B2**, que é decisão do proprietário e entra no item 7 do aviso.
5. **Três perguntas para o advogado, se houver revisão:** o legítimo interesse na atribuição por garçom se
   sustenta com a salvaguarda de `D8`; a transferência internacional do backup cifrado exige cláusula-padrão
   contratual ou basta a medida técnica mais a informação no aviso; e a dispensa de designação formal de
   encarregado para agente de pequeno porte está corretamente aplicada.

Cobrado na entrega **LGPD do produto: aviso de três linhas, duas caixas com versão, contato opcional, link de
exclusão**, na **M1 Coleta própria**, cujo critério de aceite de `F44` já exige a conferência dos artigos **antes
de publicar**.

---

## 8. A regra de ouro do LLM

### 8.1 A regra, em uma linha

**Nenhum identificador direto sai deste sistema para um LLM, hoje ou com qualquer provedor futuro.** A regra é do
projeto, não do contrato do fornecedor, e vale igual se o provedor mudar (`F38`).

### 8.2 O que exatamente se envia

São **dois** payloads, com regras diferentes, e confundi-los é como se vaza dado.

**Payload 1, classificação, em `cron_classificador`, cerca de 2 chamadas por dia com teto de 10 (`N01`):**

```json
{
  "versao_prompt": "clf-1.0.0",
  "taxonomia": { "dimensoes": ["comida", "..."], "fatores": { "comida": ["sabor", "..."] } },
  "itens": [
    { "ref": 1, "texto": "A pizza estava otima mas a bebida demorou muito", "nota": 7, "faixa": "neutro", "idioma": "pt" },
    { "ref": 2, "texto": "Chamei o garcom tres vezes",                      "nota": 4, "faixa": "detrator", "idioma": "pt" }
  ]
}
```

- **`ref` é um índice sequencial dentro do lote, e nada mais.** Não é `resposta.id`, não é `uuid`, não é chave de
  nada. Ele existe e morre dentro da invocação.
- **Vai:** o texto do comentário já mascarado, a nota, a faixa, o idioma, a taxonomia fechada e a
  `versao_prompt`.
- **Não vai:** nome, e-mail, WhatsApp, nascimento, **número de mesa**, PIN, nome de garçom, `dispositivo_id`,
  `resposta.id`, `dia_operacional`, data, hora, e nenhum `uuid` do sistema.
- **Por que a mesa também não vai**, embora não seja identificador direto: mesa mais noite mais nota é um
  triplete que, com o cardápio na mão, aponta para uma pessoa. É o mesmo raciocínio que tirou `fingerprinting` do
  escopo.

**Payload 2, redação do diagnóstico, em `cron_digest_16h`, 1 chamada por dia (`N02`):**

- **Vai:** agregados **já calculados em SQL** (contagens por faixa, por fator, comparável do período anterior,
  os dois `n`) e citações **já classificadas**, com a mesma máscara aplicada.
- **Não vai:** a base, nenhuma linha crua, nenhuma aritmética a fazer. **A IA redige, ela não conta** (`F35`).
- **Consequência de segurança e de correção ao mesmo tempo:** o pior caso é uma frase mal escrita sobre números
  corretos, e um número que não esteja em nenhum bloco do e-mail é bug que reprova o aceite.

### 8.3 As quatro travas, e as duas primeiras são código

1. **Máscara antes do envio.** Padrão de telefone brasileiro, e-mail, CPF **e `uuid`** são substituídos no texto
   que sai. O `uuid` entra na lista porque é o identificador interno que um bug de montagem colocaria no payload
   sem ninguém notar. **O texto original continua intacto em `resposta_texto`**, e é o mascaramento do payload,
   não do banco.
2. **Teste automatizado que reprova o payload.** Ele casa o corpo montado contra os quatro padrões e falha o
   build. É o segundo critério de aceite de `F38`, e roda mesmo com o provedor desligado.
3. **Módulo único.** Prompt, chamada e parser num arquivo só, com `provedor`, `modelo` e `versao_prompt` em
   `configuracao` (`F37`). Busca por `groq` no repositório volta ocorrência em **um** arquivo mais a variável de
   ambiente. Se a IA for chamada de outro lugar por pressa, a busca acusa em dez segundos.
4. **Log truncado do payload, por 30 dias**, para auditoria (`F38`). Ele guarda o que **saiu**, não o que estava
   no banco, e é a prova de que a regra foi cumprida.

### 8.4 Como a identidade é reconstituída depois

Em três passos, todos do nosso lado, e nenhum deles depende do provedor.

1. O módulo monta o lote e guarda **em memória, dentro da invocação**, o mapa `ref -> resposta_id`. Esse mapa
   nunca é serializado, nunca é gravado e nunca sai do Worker.
2. A saída volta em **JSON validado por schema**, com o mesmo `ref` em cada frase classificada. **JSON inválido é
   descartado inteiro**, e a resposta fica sem classificação, nunca com classificação parcial inventada (`F34`).
3. O Worker grava `classificacao_texto` com o `resposta_id` real vindo do mapa, mais `dimensao`, `fator`,
   `polaridade`, `severidade`, `nomeia_pessoa`, `modelo`, `versao_prompt` e `classificado_em`. **Valor fora das
   listas fechadas de `src/comum/dominio.ts` e da constraint do banco é rejeitado**, e o classificador não pode
   criar dimensão nem fator novos.

**A propriedade que isto compra, e é a razão da regra:** trocar de provedor de LLM amanhã não é incidente de dado
pessoal, é uma linha de `configuracao`. E se o provedor guardar tudo o que recebeu, o que ele tem é um punhado de
frases sobre pizza com uma nota ao lado, sem ninguém dentro.

**Uma exposição residual, dita porque é real:** o cliente pode escrever, no comentário, algo que identifique
alguém sem casar com nenhum padrão, como "o garçom alto de barba foi grosseiro". A máscara não pega isso, e
nenhuma máscara barata pega. O que o sistema faz é não agravar: `nomeia_pessoa = true` mantém o comentário fora
dos blocos de cozinha e de salão e o manda só ao proprietário (`F30`), e o comentário não classificado vai para o
destino mais restrito, que é o mesmo (`F36`).

---

## 9. Divergências com o que já existe, e quem está errado

Nove, e cada uma diz qual dos lados se corrige. Nenhuma inventa uma terceira versão.

| # | Divergência | Quem está errado, e por quê | Correção |
|---|---|---|---|
| **DV1** | `.env.example` nomeia **`SUPABASE_SERVICE_KEY`** como credencial do Worker, e `wrangler.toml` a lista entre os segredos | **O código está errado**, e a razão é dura: a chave de serviço **ignora RLS** e é **a mesma credencial do sistema fiscal** que mora no projeto. Com ela, o critério de aceite da folha canônica (`INSERT` em tabela fiscal tem de falhar) **falha por construção**, e um vazamento do segredo do Worker entrega o sistema fiscal junto | Trocar por credencial do papel `experiencia_app` no Worker de escrita e `experiencia_rotina` no Worker de rotina (seção 2.4). Os nomes de variável mudam na mesma passada, e `SUPABASE_SERVICE_KEY` sai de `.env.example` e do comentário de `wrangler.toml` |
| **DV2** | [`01-arquitetura.md`](01-arquitetura.md) põe a **importação manual** no Worker de escrita | **A linha do documento de arquitetura é a que se corrige.** Deixar o import ali obrigaria `experiencia_app`, que é a credencial que a internet alcança, a ganhar escrita em `venda_produto_dia` e `execucao_importacao` | A regra que manda é a da credencial: quem escreve venda é `experiencia_rotina`. Se isso mover o endpoint para o Worker de rotina, ele se move |
| **DV3** | O comando publicado em [`11-backup-e-politica-google.md`](../pesquisa/dados/11-backup-e-politica-google.md) faz `pg_dump` do **banco inteiro** | **O comando é o que se corrige**, e `F53` já diz que o dump é do schema `experiencia`. Dumpar o banco inteiro leva `notas`, `itens_nota` e `fornecedores` para um bucket fora do Brasil, sem finalidade declarada e sem base legal para essa localização | Acrescentar `--schema=experiencia`. O `pg_dump` **do projeto inteiro** continua existindo, e é outro: é a condição 3 de `D2`, manual, feito da máquina do proprietário e guardado com ele, não no bucket |
| **DV4** | `F52` manda registrar a exportação de clientes em `execucao_rotina`, e a lista fechada de `rotina` tem **cinco** valores, nenhum de exportação | **A folha canônica tem precedência sobre `F52` em nome**, então nada se inventa aqui | Acrescentar o valor `exportacao_cliente` à lista de `rotina` **na folha canônica primeiro** (**nome novo, não consta na folha canônica**). Enquanto isso não acontecer, o `INSERT` para `experiencia_leitura` em `execucao_rotina` não existe e a exportação **não fica registrada**, o que é lacuna declarada |
| **DV5** | A recusa registrada na `T0` precisa gravar `tentativa`, e nenhuma função declarada faz isso | Ninguém está errado: é lacuna. Criar uma função nova aqui gastaria um nome sem comprar nada | `fn_grava_resposta` aceita `desfecho = 'recusou'` sem nota e grava **só** a linha de `tentativa`. Continua verdadeira a frase de `01-arquitetura.md`: duas funções escrevem por conta do PWA, mais `fn_sorteia_pergunta`, que só lê |
| **DV6** | `F44` pede que o rodapé de **3 linhas** nomeie controlador, finalidade, dados, **categorias de compartilhamento**, retenção e canal de direitos, nas telas `T1` e `T6` | **`F44` está certo na exigência e impossível na forma.** Seis operadores em três linhas produzem um rodapé que ninguém lê e que come o teto de 45 segundos | O aviso de 3 linhas fica na `T6`, onde o dado pessoal é pedido (seção 7.1). A `T1` mantém o rodapé de anonimato que já está no código **mais o link** `Como usamos seus dados`, que hoje só existe na `T6` de `src/coleta/questionario.ts`. A enumeração completa fica a um toque, em `/privacidade` |
| **DV7** | `F53` exige o dump **cifrado com chave simétrica** | **`F53` está revogado neste ponto por `D7`**, que é nível 1 de precedência: chave simétrica faria o GitHub guardar o pacote e a chave que o abre no mesmo lugar | `age` assimétrico, chave pública no runner, privada fora de toda plataforma. É expressão proibida na folha canônica, seção 9.1 |
| **DV8** | `01-arquitetura.md`, seção 2.3, diz que o Worker serve **quatro** coisas ao tablet, entre elas a `versao_questionario` vigente | **O código está certo e o documento se corrige.** `src/coleta/questionario.ts` exporta `VERSAO_QUESTIONARIO = '1.0.0'` no próprio bundle, e é onde essa versão tem de viver: servida pelo banco, ela poderia discordar das telas que o bundle desenha, que é exatamente o tipo de divergência silenciosa que o projeto existe para evitar | São **três** coisas: `item_cardapio` ativo, texto das perguntas sorteadas e a versão vigente de `consentimento_texto`. Com isso, `experiencia_app` não precisa de acesso a `configuracao`, e a seção 3.3 fica mais estreita |
| **DV9** | `F58` cobra que a chave de serviço não esteja no bundle publicado | Ninguém está errado. Este documento vai além, e o registro é para o aceite | A **única** chave no bundle é a publicável, e ela não tem `USAGE` no schema `experiencia`. A conferência de `F58` passa a ser dupla: buscar a chave de serviço no JavaScript servido e **não achar**, e conferir que `set role anon; select 1 from experiencia.resposta;` devolve `permission denied` |

**Nomes novos usados neste documento**, todos seguindo a seção 8 da folha canônica e todos precisando entrar nela
antes de aparecer em SQL aplicado:

| Nome | O que é | Por que existe |
|---|---|---|
| `experiencia_dono` | Papel dono do schema, das 26 tabelas, das views e das funções. Sem `LOGIN`, alcançado só por dentro de função `security definer` | É o que transforma "nada da pesquisa escreve fora do schema" em fato do banco. Se as funções fossem de `postgres`, um erro dentro delas escreveria no sistema fiscal |
| `experiencia_rotina` | Papel do Worker de rotina e do caminho de importação | Separa a credencial que a internet alcança da credencial que escreve venda, log e anonimização. Dois papéis não expressam isso |
| `experiencia_dump` | Papel de `backup_semanal`: `SELECT` nas 26 tabelas e uma linha em `execucao_rotina` | É a menor credencial que ainda produz backup completo. Usar `experiencia_leitura` poria escrita de cadastro num segredo do GitHub |
| `exportacao_cliente` | Valor novo para a coluna `rotina` | Ver **DV4**. Sem ele, `F52` não tem onde registrar |

**Arquivos que este documento pressupõe e que ainda não existem:**
`supabase/migrations/AAAAMMDDHHMMSS_cria_papeis_e_politicas_rls.sql`, `sql/papeis.sql` (os cinco `create role`,
necessários **antes** de qualquer `pg_restore`, porque `--no-privileges` não leva `GRANT` e as políticas
referenciam papéis por nome), `sql/teste_rls.sql` e `docs/registro-tratamento.md`.

**Uma consequência de restauração que precisa estar escrita, porque é o tipo de coisa que se descobre na pior
hora:** o dump é feito com `--no-owner --no-privileges`, então a restauração traz as **políticas** mas não os
**privilégios**. Restaurar num banco vazio sem rodar `sql/papeis.sql` antes falha por papel inexistente, ou
restaura um schema sem acesso nenhum. Isso entra no roteiro da restauração cobrada na entrega **`backup_semanal`
por GitHub Actions, rodando domingo e quarta, com restauração testada e log de execução no banco**, na **M1
Coleta própria**.

**E um critério de aceite novo para a mesma entrega, que fecha um risco de backup silenciosamente incompleto:**
como `experiencia_dump` não é dono das tabelas e RLS está habilitado, `pg_dump` precisa rodar com
`--enable-row-security`, e nesse modo ele dumpa **apenas o que as políticas deixam ver**. Como todas as políticas
de leitura desse papel são `using (true)`, o conjunto é completo hoje. Para que continue completo amanhã, o
aceite passa a exigir **conferência de contagem de linhas por tabela entre a origem e a restauração**. Sem essa
conferência, uma política futura com predicado real produziria um backup parcial que parece bem-sucedido, que é
exatamente a falha silenciosa que este projeto existe para não ter. A alternativa, dar `BYPASSRLS` ao papel de
dump, exige privilégio que o plano gerenciado talvez não conceda: **NÃO VERIFICADO**.

---

## 10. O que fica fora de escopo por desproporção

Lista fechada, com o motivo ao lado, para que quem propuser um destes itens tenha que argumentar contra um motivo
escrito e não contra um esquecimento. **A coluna do gatilho é a que faz esta tabela envelhecer bem:** ela diz o
que precisaria mudar no mundo para o item entrar.

| Fora de escopo | Por que é desproporcional aqui | O que faria entrar |
|---|---|---|
| **WAF, proteção anti-DDoS configurada, regra de firewall própria** | O Cloudflare já está na frente por construção, e o volume normal é de dezenas de requisições por noite. Configurar regra própria é mais uma peça com estado para alguém esquecer | Um ataque real de volume, observado |
| **Registro de auditoria de leitura, linha por linha** | Exigiria trigger em 26 tabelas, uma tabela de log que cresce sem poda dentro de **500 MB**, e um leitor. Com **2** administradores, a resposta a "quem leu" já é "um dos dois" | Um terceiro perfil de acesso, ou uma segunda casa |
| **Cifragem de coluna com `pgcrypto` em `nome` e `whatsapp`** | A chave teria de viver perto do banco para o painel funcionar, e chave perto do dado cifrado protege contra pouca coisa. Já existe cifragem onde ela importa de verdade, que é o dado saindo do Supabase | Obrigação contratual ou setorial que exija cifragem em repouso por coluna |
| **HSM, KMS, cofre de segredos dedicado** | Cada um é uma conta nova que expira em silêncio, e este projeto tem **três** plataformas de segredo já em uso (Cloudflare, GitHub, gerenciador de senhas) | Nada previsível |
| **Rotação automática de credencial** | Automação que troca segredo é automação que pode quebrar a coleta às 3h da manhã sem ninguém para consertar. E `D7` exige explicitamente que a chave do B2 **não** expire | Nada. Este é um caso em que o correto é o manual |
| **Pentest, bug bounty, análise de vulnerabilidade contratada** | Custa dinheiro real contra o adversário da seção 1.2, que não existe. O que este projeto tem no lugar é `get_advisors` do Supabase rodado antes do go-live, sem alerta em aberto (`F58`), e a superfície de ataque de duas rotas de escrita | Ceder a suíte a terceiros |
| **ISO 27001, SOC 2, política de segurança formal** | Certificação é para quem vende software. Aqui é uso interno de uma casa | Comercialização |
| **VPN, lista de IP permitido para o painel** | O painel precisa abrir no celular do proprietário em 4G, em qualquer lugar. Lista de IP quebraria isso e a primeira solução seria desligá-la | Nada |
| **Autenticação multifator para o garçom, ou login por garçom** | Seção 4, ponto a ponto. O PIN não pode ser credencial num fluxo que grava offline num aparelho compartilhado | Nada. Entraria como erro |
| **MDM, gestão de frota, antivírus nos tablets** | Cinco aparelhos de uma casa, com licença Fully Kiosk PLUS que já garante a reabertura após reboot. MDM é contrato, console e mais uma senha | Mais de uma unidade |
| **`certificate pinning` no PWA** | O PWA é servido pelo Cloudflare e o navegador já valida a cadeia. Pinning quebra na rotação do certificado, calado, e derruba a coleta | Nada |
| **Sessão com expiração curta e reautenticação frequente no painel** | Duas contas de dono, com 2FA. Expiração curta produz irritação, e irritação produz senha anotada no balcão | Nada |
| **Segundo fornecedor de backup, ou terceira cópia** | O backup já está fora do fornecedor do banco, em conta separada, com chave que o destino não possui. Uma terceira cópia é uma terceira credencial e um terceiro lugar de vazamento | Perda comprovada de um backup, ou aviso de encerramento do B2 |
| **Monitoramento contínuo, alerta 24/7, painel de segurança** | ADR-05 fechou isso: o alarme do sistema é o e-mail das 16h, e a regra única é **se ele não chegar dois dias seguidos, algo quebrou** (`N42`). Tela que exige alguém abrindo não existe | Nada |
| **RIPD ou DPIA completo, encarregado designado formalmente** | Volume baixo, dado não sensível, finalidade estreita, e a regulamentação de agente de pequeno porte dispensa a designação formal (**número de artigo a conferir**). O que continua obrigatório, e existe, é o canal de contato publicado | Dado sensível, perfilamento, volume alto, ou finalidade nova de alto risco |
| **Anonimização diferencial, `k`-anonimato nos agregados** | O painel é lido por duas pessoas que já conhecem a casa inteira, e o `n` mínimo de **20** para proporção já evita a célula minúscula que reidentificaria alguém | Publicação externa de agregado |
| **Consentimento por camadas, gestor de consentimento, banner de cookie** | Não existe cookie de rastreio, não existe terceiro de publicidade e existem **duas** finalidades. Duas caixas resolvem, e um gestor de consentimento seria mais superfície que o consentimento | Publicidade ou terceiro de marketing |
| **Seguro cibernético, plano de continuidade formal** | O plano de continuidade real são cinco linhas: fila local no aparelho, dois dumps por semana, restauração testada, dois administradores e o e-mail das 16h. Formalizar isso num documento de vinte páginas não muda nenhuma delas | Nada |

**A linha que fecha a tabela, e o documento:** cada item acima protegeria contra alguma coisa. Nenhum deles
protege contra o que de fato vai acontecer neste sistema, que é ninguém olhar para ele por meses. O que responde
por isso são os controles que funcionam sem operador: privilégio ausente em vez de vigilância, `DELETE` que não
existe em 24 tabelas, política que fecha sozinha, chave que apaga o backup sozinha em 8 semanas, e um e-mail
diário cuja ausência é o único alarme.
