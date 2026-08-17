-- =============================================================================
-- 20260817092000_cria_tabelas_cadastro.sql
--
-- O QUE FAZ
--   Cria as nove tabelas do Bloco B da folha canonica (cadastro): `garcom`, `mesa`,
--   `dispositivo`, `item_cardapio`, `pergunta_banco`, `destinatario`,
--   `mesa_atendida_dia`, `calendario_operacao` e `configuracao`. Cria os indices de
--   cada uma e semeia `configuracao` com as chaves que o sistema le.
--
--   Vem antes das tabelas de coleta porque `resposta` e `tentativa` apontam para
--   `garcom`, `mesa` e `dispositivo`, e `resposta_item` aponta para `item_cardapio`.
--
-- O QUE ASSUME
--   1. Toda tabela tem `id uuid` como chave primaria (secao 3.1 da folha canonica),
--      inclusive as de grao diario. Nessas, o grao e garantido por UNIQUE em
--      `dia_operacional`, e nao pela chave primaria. Isso mantem a regra do `id`
--      valida em todas as 26 tabelas, sem excecao a decorar.
--   2. Nenhum identificador vindo do PDV e chave primaria (secao 8, regra 3):
--      `produto_id_pdv` e atributo de juncao, e `item_cardapio.id` e do QT.
--   3. `mesa.capacidade` fica nula. A capacidade individual das 22 mesas e
--      NAO VERIFICADO (N45), e coluna nula e melhor que numero inventado.
--   4. O banco de 20 perguntas NAO e semeado aqui. A fonte unica dele e
--      src/coleta/questionario.ts, e a semente entra por script idempotente
--      (upsert por `numero`). Duas copias literais da mesma lista, uma em TypeScript
--      e outra em SQL, e o jeito conhecido de elas divergirem.
--
-- COMO SE DESFAZ
--   drop table if exists experiencia.configuracao, experiencia.calendario_operacao,
--     experiencia.mesa_atendida_dia, experiencia.destinatario,
--     experiencia.pergunta_banco, experiencia.item_cardapio,
--     experiencia.dispositivo, experiencia.mesa, experiencia.garcom;
--   Roda so antes da migration de coleta. Depois dela, as chaves estrangeiras
--   exigem `cascade`, e `cascade` aqui apagaria resposta. Nao use `cascade`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- garcom (F49, F50). Extra entra e sai sem apagar historico.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.garcom (
  id           uuid        primary key default gen_random_uuid(),
  nome         text        not null,
  pin          text        not null,
  ativo        boolean     not null default true,
  criado_em    timestamptz not null default now(),
  removido_em  timestamptz null,
  constraint garcom_nome_nao_vazio check (btrim(nome) <> ''),
  constraint garcom_pin_nao_vazio  check (btrim(pin) <> ''),
  -- Remover garcom preenche removido_em e desliga ativo. Ativo com removido_em e
  -- estado impossivel, e estado impossivel que o banco aceita vira relatorio errado.
  constraint garcom_removido_nao_ativo check (removido_em is null or ativo = false)
);

-- PIN unico entre os garcons vivos. A regra de F49 ("PIN reutilizado por pessoa
-- diferente e bloqueado enquanto o anterior tiver resposta no trimestre corrente")
-- nao cabe em constraint, porque depende de janela movel: ela vive na tela de
-- administracao. Este indice garante a metade que da para garantir.
create unique index if not exists garcom_pin_ativo_uq
  on experiencia.garcom (pin) where removido_em is null;

comment on table  experiencia.garcom is 'Um garcom. O PIN atribui atendimento, nunca autentica (ADR-06).';
comment on column experiencia.garcom.pin is 'PIN do cadastro. Nunca hash, nunca no tablet.';

-- -----------------------------------------------------------------------------
-- mesa. E o que permite deduzir a area a partir da mesa, em vez de perguntar ao
-- cliente. Mesa fisica nao sai de servico, entao nao tem `removido_em`.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.mesa (
  id          uuid        primary key default gen_random_uuid(),
  numero      text        not null,
  area        text        not null,
  capacidade  smallint    null,
  criado_em   timestamptz not null default now(),
  constraint mesa_area_dominio  check (area in ('salao','varanda')),
  constraint mesa_capacidade_positiva check (capacidade is null or capacidade > 0)
);

-- A resolucao de `mesa_digitada` compara sem espaco e sem caixa. O indice funcional
-- e o que faz `12`, ` 12` e `12 ` resolverem para a mesma mesa, e o que impede
-- cadastrar as duas.
create unique index if not exists mesa_numero_uq
  on experiencia.mesa (upper(btrim(numero)));

comment on column experiencia.mesa.capacidade is
  'NAO VERIFICADO. Pendencia do proprietario (N45, P5). Fica nula ate a resposta.';

-- -----------------------------------------------------------------------------
-- dispositivo (D5, F08). Os 5 tablets, 4 em uso e 1 de reserva. As colunas de sinal
-- vivem aqui: heartbeat_dispositivo e nome revogado (secao 9.2).
-- -----------------------------------------------------------------------------
create table if not exists experiencia.dispositivo (
  id              uuid        primary key default gen_random_uuid(),
  apelido         text        not null,
  uso             text        not null,
  ultimo_sinal_em timestamptz null,
  fila_pendente   integer     not null default 0,
  versao_app      text        null,
  criado_em       timestamptz not null default now(),
  removido_em     timestamptz null,
  constraint dispositivo_uso_dominio check (uso in ('em_uso','reserva')),
  constraint dispositivo_fila_nao_negativa check (fila_pendente >= 0)
);

create unique index if not exists dispositivo_apelido_uq
  on experiencia.dispositivo (apelido) where removido_em is null;

comment on column experiencia.dispositivo.ultimo_sinal_em is
  'O heartbeat. Acima de 24h sem contato, o e-mail das 16h nomeia o aparelho (N31).';

-- -----------------------------------------------------------------------------
-- item_cardapio (F42). O catalogo, com as duas chaves de juncao: `produto_id_pdv`
-- para o R3 e `prato_id` para a ficha tecnica.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.item_cardapio (
  id                uuid        primary key default gen_random_uuid(),
  nome_pt           text        not null,
  nome_en           text        not null,
  grupo             text        not null,
  ativo             boolean     not null default true,
  produto_id_pdv    text        null,
  produto_nome_norm text        null,
  prato_id          uuid        null,
  criado_em         timestamptz not null default now(),
  removido_em       timestamptz null,
  constraint item_cardapio_grupo_dominio check (grupo in ('pizza','entrada','sobremesa')),
  -- Cadastro de item nao salva sem os dois idiomas (criterio de aceite de F14).
  constraint item_cardapio_dois_idiomas check (btrim(nome_pt) <> '' and btrim(nome_en) <> ''),
  -- `produto_nome_norm` e no formato do R3: maiusculas, sem acento.
  constraint item_cardapio_norm_maiusculo
    check (produto_nome_norm is null or produto_nome_norm = upper(produto_nome_norm)),
  constraint item_cardapio_removido_nao_ativo check (removido_em is null or ativo = false)
);

create unique index if not exists item_cardapio_produto_id_pdv_uq
  on experiencia.item_cardapio (produto_id_pdv) where produto_id_pdv is not null;
create index if not exists item_cardapio_produto_nome_norm_idx
  on experiencia.item_cardapio (produto_nome_norm);
create index if not exists item_cardapio_ativo_idx
  on experiencia.item_cardapio (grupo) where ativo = true;

comment on column experiencia.item_cardapio.prato_id is
  'Chave estrangeira LOGICA para public.pratos.id, sem constraint: schema experiencia '
  'nao cria dependencia estrutural no schema fiscal. Aceita nulo e fica nulo enquanto '
  'a ficha tecnica nao existir (pratos tem 1 linha, prato_ingredientes tem 0).';

-- -----------------------------------------------------------------------------
-- pergunta_banco (F11). Doze ativas no arranque, teto de 20 (N19).
-- -----------------------------------------------------------------------------
create table if not exists experiencia.pergunta_banco (
  id             uuid        primary key default gen_random_uuid(),
  numero         smallint    not null,
  texto_pt       text        not null,
  texto_en       text        not null,
  opcoes         jsonb       not null,
  dimensao       text        not null,
  fator          text        null,
  peso           text        not null,
  ativa          boolean     not null default false,
  em_foco        boolean     not null default false,
  em_foco_desde  date        null,
  temporaria     boolean     not null default false,
  sai_quando     text        not null default 'nunca',
  criado_em      timestamptz not null default now(),
  constraint pergunta_banco_dimensao_dominio check (dimensao in (
    'comida','bebida','tempo','atendimento','precisao_pedido',
    'ambiente','limpeza','preco_valor','item_consumido')),
  constraint pergunta_banco_fator_valido check (experiencia.fn_fator_valido(dimensao, fator)),
  constraint pergunta_banco_peso_dominio check (peso in ('alto','medio','baixo')),
  -- Pergunta em foco sem data e uma pergunta que nunca sai de foco, porque o digest
  -- nao consegue dizer ha quantos meses o foco nao muda.
  constraint pergunta_banco_foco_tem_data check (em_foco = false or em_foco_desde is not null),
  constraint pergunta_banco_opcoes_array check (jsonb_typeof(opcoes) = 'array'),
  constraint pergunta_banco_dois_idiomas check (btrim(texto_pt) <> '' and btrim(texto_en) <> '')
);

create unique index if not exists pergunta_banco_numero_uq on experiencia.pergunta_banco (numero);
create index if not exists pergunta_banco_ativa_idx
  on experiencia.pergunta_banco (dimensao) where ativa = true;

comment on column experiencia.pergunta_banco.temporaria is
  'Redundante com sai_quando <> ''nunca'', e fica porque src/coleta/questionario.ts ja '
  'tem os dois campos. Se um dia divergirem, `sai_quando` vence: e o nome que F11 traz.';
comment on column experiencia.pergunta_banco.opcoes is
  'Array jsonb de {pt, en}. A ordem e estavel e nao se reordena em pergunta ativa, '
  'porque resposta_pergunta_sorteada.opcao_indice aponta para a posicao.';

-- -----------------------------------------------------------------------------
-- destinatario (F29). E-mail e papel de quem recebe o digest das 16h.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.destinatario (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null,
  papel       text        not null,
  ativo       boolean     not null default true,
  criado_em   timestamptz not null default now(),
  removido_em timestamptz null,
  constraint destinatario_papel_dominio
    check (papel in ('proprietario','gerencia','cozinha','salao')),
  constraint destinatario_email_plausivel check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

-- UNIQUE no e-mail, e nao no par (email, papel): e o que garante o criterio de aceite
-- de F29, "nenhum endereco recebe dois e-mails no mesmo dia".
create unique index if not exists destinatario_email_uq
  on experiencia.destinatario (email) where removido_em is null;

-- -----------------------------------------------------------------------------
-- mesa_atendida_dia (F05). Grao de UM DIA OPERACIONAL, com um numero so, porque quem
-- preenche e o gerente no fechamento e um campo por garcom multiplicaria a tarefa
-- humana por quatro (secao 2.5 da folha canonica).
-- -----------------------------------------------------------------------------
create table if not exists experiencia.mesa_atendida_dia (
  id              uuid        primary key default gen_random_uuid(),
  dia_operacional date        not null,
  mesas           smallint    not null,
  criado_em       timestamptz not null default now(),
  constraint mesa_atendida_dia_mesas_plausivel check (mesas >= 0 and mesas <= 22)
);

create unique index if not exists mesa_atendida_dia_dia_uq
  on experiencia.mesa_atendida_dia (dia_operacional);

comment on constraint mesa_atendida_dia_mesas_plausivel on experiencia.mesa_atendida_dia is
  'Teto de 22, que e o numero de mesas da casa (N38: 16 no salao e 6 na varanda). '
  'Mesa juntada e atendida uma vez, entao 23 e erro de digitacao, nao noite cheia.';

-- -----------------------------------------------------------------------------
-- calendario_operacao. So a EXCECAO ao padrao semanal. Em mes normal ninguem
-- preenche nada, porque o padrao vem de `fn_casa_abre`.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.calendario_operacao (
  id              uuid        primary key default gen_random_uuid(),
  dia_operacional date        not null,
  abre            boolean     not null,
  motivo          text        not null,
  criado_em       timestamptz not null default now(),
  constraint calendario_operacao_motivo_nao_vazio check (btrim(motivo) <> '')
);

create unique index if not exists calendario_operacao_dia_uq
  on experiencia.calendario_operacao (dia_operacional);

comment on table experiencia.calendario_operacao is
  'Excecao ao padrao semanal: feriado, fechamento extraordinario, abertura extra. '
  'Uma linha aqui sobrepoe o padrao dentro de fn_casa_abre. `motivo` e obrigatorio '
  'porque excecao sem motivo escrito viaja anos sem ninguem saber por que existe.';

-- -----------------------------------------------------------------------------
-- configuracao. Parametro de negocio editavel sem deploy.
-- O corte das 6h NAO esta aqui, e a razao esta na secao 4.5 da folha canonica.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.configuracao (
  id            uuid        primary key default gen_random_uuid(),
  chave         text        not null,
  valor         text        not null,
  descricao     text        not null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint configuracao_chave_snake check (chave ~ '^[a-z][a-z0-9_]*$')
);

create unique index if not exists configuracao_chave_uq on experiencia.configuracao (chave);

-- A semente entra junto da tabela de proposito: tabela de configuracao vazia e um
-- sistema que le nulo e decide sozinho. Idempotente por `on conflict do nothing`,
-- entao reaplicar nunca sobrescreve um valor que o proprietario editou.
insert into experiencia.configuracao (chave, valor, descricao) values
  ('retencao_meses',                 '12',
   'N10, D4. Meses contados da ultima visita para anonimizar dado pessoal.'),
  ('janela_duplicidade_minutos',     '20',
   'N27. Segunda resposta da mesma mesa dentro da janela entra com suspeita = true.'),
  ('teto_respostas_dispositivo_dia', '30',
   'N28. Acima disso, linha de aviso no e-mail das 16h. Nao bloqueia gravacao.'),
  ('atraso_alerta_minutos',          '20',
   'N30. Resposta que chegou com mais atraso que isso vai marcada como atrasada.'),
  ('n_minimo_proporcao',             '20',
   'N32. Abaixo disso a tela escreve `amostra insuficiente, n=x`.'),
  ('limiar_pulo_tela_pct',           '60',
   'N36. Acima disso a tela e candidata a reescrita.'),
  ('provedor_llm',                   'groq',
   'N04, ADR-07. Escolhido por contrato de privacidade, nao por limite.'),
  ('modelo_classificacao',           'llama-3.1-8b-instant',
   'N04. Classificacao frase por frase, cerca de 2 chamadas por dia (N01).'),
  ('modelo_redacao',                 'llama-3.3-70b-versatile',
   'N04. Redacao do diagnostico do digest, 1 chamada por dia (N02).'),
  ('versao_prompt',                  'v1',
   'Gravada em toda linha de classificacao_texto. Sem ela, um mes nao compara com outro.'),
  ('versao_questionario',            '1.0.0',
   'VERSAO_QUESTIONARIO de src/coleta/questionario.ts. Gravada em toda resposta.'),
  ('email_alerta_gerente',           '',
   'F24. Endereco dedicado do alerta de detrator, com push e som no aparelho do '
   'gerente. VAZIO DE PROPOSITO: preencher antes do go-live. Com valor vazio o Worker '
   'nao envia e grava erro em execucao_rotina, em vez de mandar para lugar nenhum.'),
  ('url_google',                     '',
   'F51. Link para o perfil do Google. Dois links no painel, e nada mais.'),
  ('url_ifood',                      '',
   'F51. Link para o Portal do Parceiro do iFood. Nenhuma API, nem no MVP nem na Fase 2 (D3).')
on conflict (chave) do nothing;

-- -----------------------------------------------------------------------------
-- Grants explicitos. `experiencia_app` nao apaga cadastro: sem DELETE em nenhuma
-- destas nove tabelas. Saida de garcom, de aparelho ou de item e `removido_em`.
-- -----------------------------------------------------------------------------
grant select, insert, update on
  experiencia.garcom, experiencia.mesa, experiencia.dispositivo,
  experiencia.item_cardapio, experiencia.pergunta_banco, experiencia.destinatario,
  experiencia.mesa_atendida_dia, experiencia.calendario_operacao, experiencia.configuracao
to experiencia_app;

grant select on
  experiencia.garcom, experiencia.mesa, experiencia.dispositivo,
  experiencia.item_cardapio, experiencia.pergunta_banco, experiencia.destinatario,
  experiencia.mesa_atendida_dia, experiencia.calendario_operacao, experiencia.configuracao
to experiencia_leitura;
