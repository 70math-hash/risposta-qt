-- =============================================================================
-- 20260817093000_cria_tabelas_coleta.sql
--
-- O QUE FAZ
--   Cria as sete tabelas do Bloco A da folha canonica (coleta): `resposta`,
--   `resposta_opcao`, `resposta_item`, `resposta_texto`,
--   `resposta_pergunta_sorteada`, `tela_evento` e `tentativa`, com as duas colunas
--   geradas de `resposta` (`dia_operacional` e `faixa`) e os indices de cada uma.
--
-- O QUE ASSUME
--   1. `resposta.id` e o UUID v4 GERADO NO CLIENTE, e nao tem default. E ele que da
--      idempotencia: reenvio do mesmo id nao cria segunda linha. Se um dia alguem
--      puser `default gen_random_uuid()` aqui, a idempotencia morre em silencio, e e
--      por isso que o default nao existe.
--   2. `respondido_em` chega ja resolvido por `fn_grava_resposta` (regra das 48h da
--      secao 3.2). A coluna gerada `dia_operacional` sai dele, nunca de `criado_em`.
--   3. `mesa_digitada` e `garcom_pin_digitado` aceitam nulo em `resposta`, e o CHECK exige
--      os dois so no canal `tablet`. O PIN vem da T0, e a T0 so existe no tablet: resposta
--      por QR no celular do cliente nao passa pela T0. Exigir PIN de toda resposta
--      rejeitaria o canal `qr` inteiro, que a folha canonica define na secao 3.3. O
--      criterio de F04 ("toda resposta carrega PIN") descreve a T0, e a T0 continua nao
--      deixando passar campo vazio. Guardar cadeia vazia em vez de nulo seria nulo com
--      passos extras, e passa a parecer PIN digitado em toda exportacao.
--   4. Nao existe coluna de duracao em `resposta`. A duracao sai da diferenca entre
--      carimbos de `tela_evento` do MESMO dispositivo, e guardar o total em `resposta`
--      criaria uma segunda fonte para o mesmo numero.
--   5. Nao existe `cliente_id` em `resposta`. O elo entre resposta e cliente existe
--      apenas atraves de `consentimento`, que e exatamente onde a LGPD quer que ele
--      esteja: o elo E o consentimento.
--
-- COMO SE DESFAZ
--   drop table if exists experiencia.tentativa, experiencia.tela_evento,
--     experiencia.resposta_pergunta_sorteada, experiencia.resposta_texto,
--     experiencia.resposta_item, experiencia.resposta_opcao, experiencia.resposta;
--   Isto apaga a serie historica inteira, que e o ativo que o projeto existe para
--   preservar. Fora de um banco de ensaio, nao se desfaz: corrige-se com migration
--   nova.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- resposta. A tabela central. Uma linha e uma resposta enviada por um cliente.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.resposta (
  -- Sem default, de proposito. Ver "O QUE ASSUME", item 1.
  id                   uuid        primary key,
  criado_em            timestamptz not null default now(),
  criado_em_cliente    timestamptz null,
  respondido_em        timestamptz not null,
  dia_operacional      date generated always as
                         (experiencia.fn_dia_operacional(respondido_em)) stored,
  nota                 smallint    not null,
  faixa                text generated always as
                         (experiencia.fn_faixa_nps(nota)) stored,
  canal                text        not null,
  dispositivo_id       uuid        null references experiencia.dispositivo (id),
  mesa_digitada        text        null,
  mesa_id              uuid        null references experiencia.mesa (id),
  garcom_pin_digitado  text        null,
  garcom_id            uuid        null references experiencia.garcom (id),
  garcom_reconhecido   boolean     not null default false,
  idioma               text        not null,
  suspeita             boolean     not null default false,
  suspeita_motivo      text        null,
  versao_app           text        null,
  versao_questionario  text        not null,
  constraint resposta_nota_0_a_10   check (nota between 0 and 10),
  constraint resposta_canal_dominio check (canal in ('tablet','qr')),
  constraint resposta_idioma_dominio check (idioma in ('pt','en')),
  -- `suspeita_motivo` e nulo quando `suspeita = false`, e obrigatorio quando true:
  -- marca sem motivo escrito e uma marca que ninguem sabe interpretar depois.
  constraint resposta_suspeita_tem_motivo
    check ((suspeita = false and suspeita_motivo is null)
        or (suspeita = true  and suspeita_motivo is not null)),
  -- PIN reconhecido exige garcom resolvido, e vice-versa. Os dois estados cruzados
  -- sao impossiveis e nao entram.
  constraint resposta_reconhecido_tem_garcom
    check ((garcom_reconhecido = true  and garcom_id is not null)
        or (garcom_reconhecido = false and garcom_id is null)),
  -- Canal `tablet` sem aparelho e resposta que nao da para atribuir a ponto de coleta,
  -- e o corte por aparelho e o que distingue "equipe ignora o ponto" de "ponto
  -- quebrado" (D5). Canal `qr` fica sem aparelho, que e o esperado.
  constraint resposta_tablet_tem_dispositivo
    check (canal <> 'tablet' or dispositivo_id is not null),
  -- O PIN e obrigatorio no tablet e ausente no QR. Ver "O QUE ASSUME", item 3.
  constraint resposta_tablet_tem_pin
    check (canal <> 'tablet'
           or (garcom_pin_digitado is not null and btrim(garcom_pin_digitado) <> '')),
  -- Cadeia vazia nunca entra: ou tem PIN, ou e nulo.
  constraint resposta_pin_nao_vazio
    check (garcom_pin_digitado is null or btrim(garcom_pin_digitado) <> '')
);

comment on table experiencia.resposta is
  'Uma resposta enviada por um cliente. `id` vem do cliente e da idempotencia.';
comment on column experiencia.resposta.respondido_em is
  'Instante canonico da resposta. Igual a criado_em_cliente quando a diferenca contra '
  'criado_em e de ate 48 horas, senao igual a criado_em. Resolvido em fn_grava_resposta.';
comment on column experiencia.resposta.dia_operacional is
  'Coluna GERADA. Corte as 6h. Toda consulta, todo grafico e todo e-mail agrupa por ela.';
comment on column experiencia.resposta.suspeita is
  'Marcacao, nunca rejeicao (F04). A resposta e aceita, agradecida e sai dos indicadores.';

-- Indice: agrupamento por dia operacional. Serve vw_hoje, vw_distribuicao_faixa_dia,
-- vw_nps_janela, vw_coleta_dia, vw_venda_dia, vw_satisfacao_venda_dia e o digest.
create index if not exists resposta_dia_operacional_idx
  on experiencia.resposta (dia_operacional);

-- Indice: distribuicao em tres faixas por dia, que e o indicador principal do painel.
create index if not exists resposta_dia_faixa_idx
  on experiencia.resposta (dia_operacional, faixa);

-- Indice: corte por garcom no trimestre (vw_garcom_trimestre). Parcial, porque
-- resposta com PIN nao reconhecido entra nos indicadores gerais e nao neste corte.
create index if not exists resposta_garcom_dia_idx
  on experiencia.resposta (garcom_id, dia_operacional) where garcom_reconhecido = true;

-- Indice: a janela de 20 minutos da mesma mesa, dentro de fn_grava_resposta. E o
-- unico indice que serve a uma ESCRITA, e e o que impede a trava de fraude de fazer
-- varredura de tabela em cada resposta gravada.
create index if not exists resposta_mesa_respondido_idx
  on experiencia.resposta (mesa_id, respondido_em) where mesa_id is not null;

-- Indice: respostas por dispositivo por dia (vw_coleta_dia, teto de 30 de N28).
create index if not exists resposta_dispositivo_dia_idx
  on experiencia.resposta (dispositivo_id, dia_operacional) where dispositivo_id is not null;

-- Indice: taxa de suspeitas, que e a metrica unica da trava de fraude (N29).
create index if not exists resposta_suspeita_idx
  on experiencia.resposta (dia_operacional) where suspeita = true;

-- Indice: detratores do dia, que e a fila do alerta e do bloco 2 do digest.
create index if not exists resposta_detrator_idx
  on experiencia.resposta (dia_operacional) where nota <= 6;

-- -----------------------------------------------------------------------------
-- resposta_opcao. Uma opcao marcada em uma resposta.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.resposta_opcao (
  id            uuid        primary key default gen_random_uuid(),
  resposta_id   uuid        not null references experiencia.resposta (id),
  tela          text        not null,
  opcao_codigo  text        not null,
  dimensao      text        not null,
  fator         text        null,
  criado_em     timestamptz not null default now(),
  constraint resposta_opcao_tela_dominio check (tela in ('T2A','T2B','T2C','T3C','T3C3')),
  constraint resposta_opcao_dimensao_dominio check (dimensao in (
    'comida','bebida','tempo','atendimento','precisao_pedido',
    'ambiente','limpeza','preco_valor','item_consumido')),
  constraint resposta_opcao_fator_valido check (experiencia.fn_fator_valido(dimensao, fator)),
  -- A mesma opcao marcada duas vezes na mesma tela e reenvio malfeito, nao escolha.
  constraint resposta_opcao_uq unique (resposta_id, tela, opcao_codigo)
);

comment on column experiencia.resposta_opcao.opcao_codigo is
  'O codigo da opcao tocada (Opcao.codigo de src/coleta/questionario.ts). Existe porque '
  '"A pizza", "A entrada" e "A sobremesa" da T2A colapsam todas em dimensao comida sem '
  'fator, e sem o codigo o painel perde qual das tres foi marcada.';

create index if not exists resposta_opcao_resposta_idx on experiencia.resposta_opcao (resposta_id);
-- Indice: mencoes por dimensao e fator (vw_fator_contagem, blocos 3 a 5 do digest).
create index if not exists resposta_opcao_dimensao_fator_idx
  on experiencia.resposta_opcao (dimensao, fator);

-- -----------------------------------------------------------------------------
-- resposta_item (F13). O item apontado por detrator com causa comida.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.resposta_item (
  id                uuid        primary key default gen_random_uuid(),
  resposta_id       uuid        not null references experiencia.resposta (id),
  grupo             text        not null,
  item_cardapio_id  uuid        null references experiencia.item_cardapio (id),
  fator             text        null,
  criado_em         timestamptz not null default now(),
  constraint resposta_item_grupo_dominio
    check (grupo in ('pizza','entrada','sobremesa','mais_de_um')),
  -- Somente fatores de `comida`: esta tela so existe no caminho de comida.
  constraint resposta_item_fator_de_comida
    check (fator is null or experiencia.fn_fator_valido('comida', fator)),
  constraint resposta_item_uq unique (resposta_id, grupo, item_cardapio_id)
);

comment on column experiencia.resposta_item.item_cardapio_id is
  'Nulo quando o cliente escolheu `Prefiro nao dizer` ou o grupo `mais_de_um`. '
  'O nome do item NAO e copiado para ca: ele se le por juncao com item_cardapio, '
  'porque duas fontes do mesmo nome divergem (12-schema-custo-inspecao, secao 4).';

create index if not exists resposta_item_resposta_idx on experiencia.resposta_item (resposta_id);
-- Indice: reclamacoes por item no trimestre (vw_item_trimestre, F22).
create index if not exists resposta_item_item_idx
  on experiencia.resposta_item (item_cardapio_id) where item_cardapio_id is not null;

-- -----------------------------------------------------------------------------
-- resposta_texto (F12, F36, F48). Zero ou uma linha por resposta.
--
-- Sem coluna `idioma`: ele se le por juncao com `resposta.idioma` (secao 3.1 da folha
-- canonica). F12 pedia `idioma` aqui, e a folha vence por precedencia.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.resposta_texto (
  id            uuid        primary key default gen_random_uuid(),
  resposta_id   uuid        not null references experiencia.resposta (id),
  texto_cru     text        not null,
  mascarado_em  timestamptz null,
  criado_em     timestamptz not null default now(),
  constraint resposta_texto_nao_vazio check (btrim(texto_cru) <> ''),
  constraint resposta_texto_resposta_uq unique (resposta_id)
);

comment on column experiencia.resposta_texto.texto_cru is
  'O texto como o cliente escreveu. Nunca reescrito por pessoa nem pelo classificador. '
  'A UNICA escrita posterior permitida e a varredura de padrao de cron_retencao '
  '(D4, N11), que mascara telefone, e-mail e CPF e carimba mascarado_em. D1 a D8 vence '
  'a folha canonica, e e por isso que existe essa excecao ao "nunca reescrito".';
comment on column experiencia.resposta_texto.mascarado_em is
  'Prova de que a varredura rodou nesta linha. Nulo quer dizer nao varrida ainda.';

-- Indice: a fila de comentarios a classificar e a fila a mascarar.
create index if not exists resposta_texto_mascarar_idx
  on experiencia.resposta_texto (criado_em) where mascarado_em is null;

-- -----------------------------------------------------------------------------
-- resposta_pergunta_sorteada (F11, F23). Qual pergunta foi sorteada, se foi
-- respondida, e qual opcao o cliente marcou.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.resposta_pergunta_sorteada (
  id                uuid        primary key default gen_random_uuid(),
  resposta_id       uuid        not null references experiencia.resposta (id),
  pergunta_banco_id uuid        not null references experiencia.pergunta_banco (id),
  respondida        boolean     not null default false,
  opcao_indice      smallint    null,
  criado_em         timestamptz not null default now(),
  constraint resposta_pergunta_sorteada_uq unique (resposta_id, pergunta_banco_id),
  -- Respondida sem opcao marcada, ou opcao marcada sem respondida, sao os dois
  -- estados que fariam a proporcao do bloco 6 do digest mentir.
  constraint resposta_pergunta_sorteada_coerente
    check ((respondida = true  and opcao_indice is not null)
        or (respondida = false and opcao_indice is null)),
  constraint resposta_pergunta_sorteada_indice_nao_negativo
    check (opcao_indice is null or opcao_indice >= 0)
);

comment on column experiencia.resposta_pergunta_sorteada.opcao_indice is
  'Posicao 0-based da opcao escolhida em pergunta_banco.opcoes. ACHADO: nem a folha '
  'canonica nem F11 nomeiam coluna para a resposta da pergunta rotacionada, e sem ela o '
  'bloco 6 do digest ("a proporcao da pergunta em foco") nao tem de onde sair. Coluna '
  'nova, precisa entrar na folha. Guarda indice e nao texto porque texto quebraria na '
  'traducao; em troca, reordenar opcoes de pergunta ativa passa a ser proibido, e mudar '
  'opcao e pergunta nova.';

-- Indice: sorteadas e respondidas por pergunta (vw_pergunta_desempenho).
create index if not exists resposta_pergunta_sorteada_pergunta_idx
  on experiencia.resposta_pergunta_sorteada (pergunta_banco_id, respondida);

-- -----------------------------------------------------------------------------
-- tela_evento (F07, F23). Uma exibicao de tela em uma resposta.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.tela_evento (
  id          uuid        primary key default gen_random_uuid(),
  resposta_id uuid        not null references experiencia.resposta (id),
  tela        text        not null,
  entrou_em   timestamptz not null,
  saiu_em     timestamptz null,
  pulou       boolean     not null default false,
  criado_em   timestamptz not null default now(),
  -- A lista e EXATAMENTE o tipo `Passo` de src/coleta/questionario.ts, e
  -- `tests/contrato-telas.test.ts` confere as duas contra este CHECK.
  --
  -- `ROT1` e `ROT2`, e nao `T3` e `T4`. A versao anterior deste CHECK aceitava `T3` e `T4`,
  -- nomes que NENHUMA ponta do codigo escreve, e recusava `ROT1` e `ROT2`, que sao os que o
  -- quiosque grava. Como `tela_evento` e inserida DENTRO de `fn_grava_resposta`, na mesma
  -- transacao da resposta, a violacao de CHECK derrubava a RESPOSTA INTEIRA: promotor recebe 2
  -- perguntas rotacionadas e neutro 1, entao cerca de 85% de tudo que fosse coletado na primeira
  -- noite seria recusado, e a fila do tablet tentaria de novo para sempre.
  --
  -- A folha canonica nao fixa o dominio de `tela` (secao 3.3), entao a escolha e aqui, e fica
  -- registrada: `ROT1`/`ROT2` porque a tela E a primeira e a segunda pergunta rotacionada, e nao
  -- uma tela fixa. `T3` fixo seria mentira: o conteudo dele muda a cada resposta, por sorteio.
  -- Alem disso `vw_tela_pulo` mostra a taxa de pulo por nome de tela, e `ROT1` diz o que e.
  constraint tela_evento_tela_dominio check (tela in (
    'T0','T1','T2A','T2B','T2C','T3C','T3C1','T3C2','T3C3','ROT1','ROT2','T5','T6','T7')),
  constraint tela_evento_saida_depois_da_entrada
    check (saiu_em is null or saiu_em >= entrou_em)
);

comment on table experiencia.tela_evento is
  'Sem UNIQUE em (resposta_id, tela) de proposito: a T1 tem botao de voltar (F10), '
  'e uma tela pode ser exibida duas vezes na mesma resposta. Duracao se calcula por '
  'diferenca entre carimbos do MESMO dispositivo, nunca contra a hora do servidor.';

create index if not exists tela_evento_resposta_idx on experiencia.tela_evento (resposta_id);
-- Indice: exibicoes e pulos por tela no mes (vw_tela_pulo, limiar de 60% de N36).
create index if not exists tela_evento_tela_idx on experiencia.tela_evento (tela, entrou_em);

-- -----------------------------------------------------------------------------
-- tentativa (F05). Uma abordagem de mesa: respondeu ou recusou.
-- E o DENOMINADOR da conversao POR GARCOM. O denominador da conversao DA CASA e
-- `mesa_atendida_dia.mesas`. Sao dois denominadores diferentes (secao 2.5).
-- -----------------------------------------------------------------------------
create table if not exists experiencia.tentativa (
  id                  uuid        primary key,
  criado_em           timestamptz not null default now(),
  criado_em_cliente   timestamptz null,
  dia_operacional     date        not null,
  desfecho            text        not null,
  canal               text        not null,
  dispositivo_id      uuid        null references experiencia.dispositivo (id),
  mesa_digitada       text        null,
  mesa_id             uuid        null references experiencia.mesa (id),
  garcom_pin_digitado text        not null,
  garcom_id           uuid        null references experiencia.garcom (id),
  garcom_reconhecido  boolean     not null default false,
  constraint tentativa_desfecho_dominio check (desfecho in ('respondeu','recusou')),
  constraint tentativa_canal_dominio check (canal in ('tablet','qr')),
  -- Aqui o PIN e obrigatorio e nao aceita cadeia vazia, porque tentativa SO nasce da T0,
  -- que so existe no tablet. O dominio de `canal` continua sendo o da folha canonica, e no
  -- MVP nenhuma linha de `qr` chega aqui: resposta de QR nao e abordagem de mesa.
  constraint tentativa_pin_nao_vazio check (btrim(garcom_pin_digitado) <> ''),
  constraint tentativa_reconhecido_tem_garcom
    check ((garcom_reconhecido = true  and garcom_id is not null)
        or (garcom_reconhecido = false and garcom_id is null))
);

comment on table experiencia.tentativa is
  'Grao: uma abordagem de mesa. `id` tambem vem do cliente, pela mesma razao de '
  'resposta: a recusa e enviada pela mesma fila e pode ser reenviada. Quando o '
  'desfecho e `respondeu`, o id e o MESMO da resposta, o que faz o par ser conferivel '
  'por igualdade e nao por juncao aproximada. `dia_operacional` e coluna comum aqui, '
  'gravada por fn_grava_resposta com o mesmo fn_dia_operacional que gera a de resposta.';

-- Indice: conversao do dia e por garcom.
create index if not exists tentativa_dia_idx on experiencia.tentativa (dia_operacional);
create index if not exists tentativa_garcom_dia_idx
  on experiencia.tentativa (garcom_id, dia_operacional) where garcom_reconhecido = true;

-- -----------------------------------------------------------------------------
-- Grants. Sem DELETE em nenhuma tabela de coleta, e sem UPDATE em `resposta`:
-- resposta nasce completa e nao se edita. `resposta_texto` recebe UPDATE porque a
-- varredura de cron_retencao mascara o texto e carimba mascarado_em.
-- -----------------------------------------------------------------------------
grant select, insert on
  experiencia.resposta, experiencia.resposta_opcao, experiencia.resposta_item,
  experiencia.resposta_pergunta_sorteada, experiencia.tela_evento, experiencia.tentativa
to experiencia_app;

grant select, insert, update on experiencia.resposta_texto to experiencia_app;

grant select on
  experiencia.resposta, experiencia.resposta_opcao, experiencia.resposta_item,
  experiencia.resposta_texto, experiencia.resposta_pergunta_sorteada,
  experiencia.tela_evento, experiencia.tentativa
to experiencia_leitura;
