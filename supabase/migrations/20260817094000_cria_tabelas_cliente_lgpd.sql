-- =============================================================================
-- 20260817094000_cria_tabelas_cliente_lgpd.sql
--
-- O QUE FAZ
--   Cria as quatro tabelas do Bloco C da folha canonica: `consentimento_texto`,
--   `cliente`, `consentimento` e `exclusao_pedido`, com os indices que a rotina
--   `cron_retencao` e a cobranca de pedido aberto usam.
--
--   `consentimento_texto` vem primeiro dentro do arquivo porque
--   `consentimento.versao_texto` aponta para `consentimento_texto.versao`.
--
-- O QUE ASSUME
--   1. Sem `consentimento` gravado nao existe linha em `cliente` (F43). A ordem de
--      escrita e: resposta, consentimento_texto vigente lido, consentimento, cliente.
--      Quem garante a ordem e `fn_grava_resposta`, numa transacao.
--   2. `consentimento_texto` e append-only. Isso NAO e garantido por trigger, e sim
--      por permissao: `experiencia_app` recebe SELECT e INSERT, e nunca UPDATE nem
--      DELETE. Trigger seria uma peca a mais para quebrar em silencio; permissao
--      ausente nao quebra.
--   3. Anonimizar e UPDATE para nulo, nunca DELETE (F48). Por isso `cliente` recebe
--      UPDATE e nao recebe DELETE, e por isso as colunas pessoais aceitam nulo.
--   4. Contato duplicado (mesmo WhatsApp ou mesmo e-mail) atualiza `ultima_visita_em`
--      em vez de criar segunda linha (F43). Os dois indices unicos parciais sao o que
--      faz o upsert ter onde se apoiar.
--
-- COMO SE DESFAZ
--   drop table if exists experiencia.exclusao_pedido, experiencia.consentimento,
--     experiencia.cliente, experiencia.consentimento_texto;
--   Apagar `consentimento` destroi a prova de consentimento, que e o que se pede numa
--   fiscalizacao. Fora de banco de ensaio, nao se desfaz.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- consentimento_texto (F44, F45). Uma versao do texto de consentimento.
-- Append-only: editar cria versao nova.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.consentimento_texto (
  id          uuid        primary key default gen_random_uuid(),
  versao      text        not null,
  texto       text        not null,
  vigente_de  timestamptz not null,
  criado_em   timestamptz not null default now(),
  constraint consentimento_texto_versao_uq unique (versao),
  constraint consentimento_texto_nao_vazio check (btrim(texto) <> ''),
  constraint consentimento_texto_versao_snake check (versao ~ '^[a-z0-9][a-z0-9._-]*$')
);

comment on table experiencia.consentimento_texto is
  'Append-only por permissao, nao por trigger. Nenhuma resposta e aceita sem uma versao '
  'vigente, e a versao gravada em consentimento e a que foi EXIBIDA, mesmo que o texto '
  'tenha mudado enquanto o aparelho estava sem rede (01-arquitetura, secao 2.3).';

-- Indice: a versao vigente, que o pacote servido ao tablet le a cada abertura.
create index if not exists consentimento_texto_vigente_idx
  on experiencia.consentimento_texto (vigente_de desc);

-- -----------------------------------------------------------------------------
-- cliente (F43, F46, F48). Um cliente identificado.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.cliente (
  id                uuid        primary key default gen_random_uuid(),
  nome              text        null,
  email             text        null,
  whatsapp          text        null,
  nascimento        date        null,
  origem            text        not null default 'pesquisa',
  ultima_visita_em  timestamptz not null,
  anonimizado_em    timestamptz null,
  criado_em         timestamptz not null default now(),
  constraint cliente_origem_dominio check (origem in ('pesquisa')),
  -- Cliente sem nenhuma forma de contato e linha sem finalidade: se o cliente marcou
  -- a caixa e nao preencheu nada, nao se cria linha nenhuma (F45). Depois de
  -- anonimizado, todas as colunas pessoais ficam nulas, e ai a regra se inverte.
  constraint cliente_tem_contato_ou_esta_anonimizado
    check (anonimizado_em is not null or email is not null or whatsapp is not null),
  -- Prova de que a retencao rodou: anonimizado quer dizer sem nenhum dado pessoal.
  constraint cliente_anonimizado_sem_dado_pessoal
    check (anonimizado_em is null
           or (nome is null and email is null and whatsapp is null and nascimento is null)),
  constraint cliente_email_plausivel
    check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- Piso de plausibilidade. O teto ("nascimento no futuro") NAO cabe em CHECK, porque
  -- CHECK so aceita expressao `immutable` e `current_date` nao e: essa validacao vive
  -- no formulario. Fica escrito para ninguem tentar e concluir que o Postgres quebrou.
  constraint cliente_nascimento_plausivel
    check (nascimento is null or nascimento > date '1900-01-01')
);

comment on column experiencia.cliente.nascimento is
  'Coluna `date` sem sufixo `_dia` de proposito: `_dia` e para data de agrupamento da '
  'operacao, e nascimento e atributo da pessoa. Precedente na propria folha canonica: '
  '`em_foco_desde` tambem e date sem sufixo (secao 3.2).';
comment on column experiencia.cliente.ultima_visita_em is
  'E dela que corre o prazo de 12 meses (N10, D4), renovado a cada nova visita.';

-- Indices unicos parciais: dedup de contato (F43). Parciais porque cliente
-- anonimizado tem tudo nulo e nao pode ocupar o e-mail de ninguem.
create unique index if not exists cliente_email_uq
  on experiencia.cliente (lower(email)) where email is not null and anonimizado_em is null;
create unique index if not exists cliente_whatsapp_uq
  on experiencia.cliente (regexp_replace(whatsapp, '[^0-9]', '', 'g'))
  where whatsapp is not null and anonimizado_em is null;

-- Indice: a varredura de cron_retencao, que procura quem passou de 12 meses.
create index if not exists cliente_retencao_idx
  on experiencia.cliente (ultima_visita_em) where anonimizado_em is null;

-- Indice: contatos por mes (vw_cliente_mes, taxa de contato de F43).
create index if not exists cliente_criado_em_idx on experiencia.cliente (criado_em);

-- -----------------------------------------------------------------------------
-- consentimento (F45). Um consentimento dado por uma finalidade.
-- E aqui, e so aqui, que resposta e cliente se ligam.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.consentimento (
  id            uuid        primary key default gen_random_uuid(),
  resposta_id   uuid        not null references experiencia.resposta (id),
  cliente_id    uuid        null references experiencia.cliente (id),
  finalidade    text        not null,
  aceito_em     timestamptz not null,
  versao_texto  text        not null references experiencia.consentimento_texto (versao),
  criado_em     timestamptz not null default now(),
  constraint consentimento_finalidade_dominio check (finalidade in ('pesquisa','contato')),
  constraint consentimento_uq unique (resposta_id, finalidade),
  -- Consentimento de `contato` sem cliente nao existe: a finalidade e justamente
  -- guardar o contato. O de `pesquisa` existe sozinho, e e o caso comum.
  constraint consentimento_contato_tem_cliente
    check (finalidade <> 'contato' or cliente_id is not null)
);

comment on table experiencia.consentimento is
  'Duas caixas separadas, nenhuma pre-marcada (F45). Promocao NAO esta no dominio: ela '
  'entra junto da primeira campanha, na Fase 2, por edicao da folha canonica e migration.';

create index if not exists consentimento_cliente_idx
  on experiencia.consentimento (cliente_id) where cliente_id is not null;

-- -----------------------------------------------------------------------------
-- exclusao_pedido (F47). Um pedido de titular.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.exclusao_pedido (
  id                uuid        primary key default gen_random_uuid(),
  contato_informado text        not null,
  cliente_id        uuid        null references experiencia.cliente (id),
  pedido_em         timestamptz not null default now(),
  atendido_em       timestamptz null,
  resultado         text        null,
  criado_em         timestamptz not null default now(),
  constraint exclusao_pedido_contato_nao_vazio check (btrim(contato_informado) <> ''),
  -- Atendido sem resultado escrito nao e prova de nada.
  constraint exclusao_pedido_atendido_tem_resultado
    check (atendido_em is null or (resultado is not null and btrim(resultado) <> '')),
  constraint exclusao_pedido_atendido_depois_do_pedido
    check (atendido_em is null or atendido_em >= pedido_em)
);

comment on column experiencia.exclusao_pedido.resultado is
  'Texto livre de proposito. A folha canonica nao fixa dominio para ele, e inventar uma '
  'lista fechada aqui seria por palavra na boca do proprietario num registro que tem '
  'valor legal. Quando o dominio existir, entra na folha primeiro.';

-- Indice: pedido aberto ha mais de 7 dias vira linha no e-mail das 16h (N43).
create index if not exists exclusao_pedido_aberto_idx
  on experiencia.exclusao_pedido (pedido_em) where atendido_em is null;

-- -----------------------------------------------------------------------------
-- Grants. `consentimento_texto` e `consentimento` sao append-only: SELECT e INSERT.
-- `cliente` recebe UPDATE porque anonimizar e UPDATE para nulo.
-- DELETE em nenhuma das quatro.
-- -----------------------------------------------------------------------------
grant select, insert         on experiencia.consentimento_texto to experiencia_app;
grant select, insert         on experiencia.consentimento       to experiencia_app;
grant select, insert, update on experiencia.cliente             to experiencia_app;
grant select, insert, update on experiencia.exclusao_pedido     to experiencia_app;

grant select on
  experiencia.consentimento_texto, experiencia.consentimento,
  experiencia.cliente, experiencia.exclusao_pedido
to experiencia_leitura;
