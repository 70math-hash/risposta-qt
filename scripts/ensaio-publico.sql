-- =============================================================================
-- scripts/ensaio-publico.sql
--
-- O QUE FAZ
--   Recria, num Postgres local, a estrutura das cinco tabelas de custo que JA EXISTEM
--   em `public` no projeto `NFe e Financeiro`, mais os tres papeis que o Supabase cria
--   por conta (`anon`, `authenticated`, `service_role`).
--
-- POR QUE EXISTE
--   As migrations de `experiencia` leem `public.pratos`, `public.prato_ingredientes`,
--   `public.insumos_master`, `public.historico_precos` e `public.producao_ingredientes`.
--   Sem elas, `vw_custo_prato` nao compila e as migrations passam com falso verde. Rodar
--   as migrations de verdade contra este banco de ensaio foi o que achou dois erros que
--   teriam explodido em producao: `round(double precision, int)` que nao existe, e uma
--   tabela `on commit drop` destruida por autocommit antes do `insert` seguinte.
--
--   A estrutura vem de `docs/pesquisa/dados/12-schema-custo-inspecao.md`, lida em
--   14/08/2026 por `information_schema`. NAO e palpite: e a forma real, coluna por coluna.
--   Se a origem mudar, este arquivo tem de mudar junto, senao o ensaio deixa de valer.
--
-- O QUE NAO FAZ
--   Nao toca em nenhum projeto Supabase. Nao contem dado real: as linhas semeadas mais
--   abaixo (em `ensaio-dados.sql`) sao inventadas e escolhidas para o custo dar um numero
--   conferivel a mao.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Os tres papeis do Supabase, recriados A CADA EXECUCAO, com os atributos exatos com
-- que o Supabase os cria:
--
--   create role anon           nologin noinherit;
--   create role authenticated  nologin noinherit;
--   create role service_role   nologin noinherit bypassrls;
--
-- O `noinherit` NAO e detalhe. Papel no Postgres so herda privilegio de um papel do qual e
-- membro se for `inherit`, e desde o Postgres 16 a opcao e gravada NO MOMENTO DO GRANT, a
-- partir do `rolinherit` que o membro tinha ali. A consequencia: se
-- `grant experiencia_leitura to authenticated` rodar contra um `authenticated` que ja e
-- `noinherit` (que e o caso num projeto Supabase de verdade), o painel entra pelo PostgREST
-- como `authenticated`, nao herda nada de `experiencia_leitura`, e nao le UMA linha.
--
-- Papel e objeto do CLUSTER e nao do banco, entao ele sobrevive ao `drop database` do
-- ensaio. Sem este `drop role`, o ensaio herda o papel da execucao anterior, com o
-- `rolinherit` que ele tinha entao, e deixa de reproduzir um projeto novo justamente na
-- propriedade que decide se o painel funciona.
-- -----------------------------------------------------------------------------
-- `experiencia_app`, `experiencia_leitura` e `authenticator` entram na mesma lista, e pelo mesmo
-- motivo com uma consequencia a mais: `sql/papeis.sql`, que e o primeiro passo de uma restauracao,
-- so exercita o ramo de CRIACAO se os papeis nao existirem. Herdando-os da execucao anterior, o
-- ensaio rodava sempre o ramo "ja existia", e o caminho que importa no dia do backup — Postgres
-- cru, papel nenhum — nunca era percorrido.
do $$
declare p text;
begin
  foreach p in array array['anon','authenticated','service_role',
                           'experiencia_app','experiencia_leitura','authenticator'] loop
    if exists (select 1 from pg_roles where rolname = p) then
      execute format('reassign owned by %I to postgres', p);
      execute format('drop owned by %I', p);
      execute format('drop role %I', p);
    end if;
  end loop;
end
$$;

create role anon          nologin noinherit;
create role authenticated nologin noinherit;
create role service_role  nologin noinherit bypassrls;

-- `service_role` recebe TUDO em `public`, como no Supabase de verdade.
--
-- POR QUE ISTO PRECISA ESTAR AQUI
--   O caso mais importante de `tests/worker-integracao.test.ts` e o CONTRASTE: o mesmo `insert` que
--   `experiencia_app` tem de recusar precisa ser ACEITO como `service_role`. Sem ele, um teste de
--   negacao que recusa por qualquer motivo — coluna errada, tabela inexistente, substituto sem
--   `set role` — passa parecendo prova.
--
--   O contraste era vazio: a chave de servico do ensaio nao era um JWT, o substituto nao achava
--   papel e caia no pool cru, entao quem inseria era o SUPERUSUARIO. Com a chave virando JWT com
--   `role: service_role`, o papel passa a ser assumido de verdade — e ai ele precisa ter os
--   privilegios que o Supabase da a ele, senao o contraste inverte e passa a falhar por falta de
--   grant em vez de provar o que devia.
--
--   No Supabase, `public` e concedido a `anon`, `authenticated` e `service_role` por padrao, e
--   `service_role` ainda tem `bypassrls`. Modelar isso e o que torna o ensaio comparavel.
--   `alter default privileges` vem ANTES das tabelas de proposito: ele so vale para o que for
--   criado depois, e por quem o executou. O `grant ... on all tables` explicito fica no FIM do
--   arquivo, para pegar o que ja existe — os dois juntos cobrem as duas metades.
grant usage on schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- As cinco tabelas de custo, na forma inspecionada.
-- -----------------------------------------------------------------------------
create table if not exists public.insumos_master (
  id                   uuid primary key default gen_random_uuid(),
  codigo_qt            varchar     null,
  nome_qt              text        not null,
  categoria            text        null,
  unidade_padrao       text        null,
  ficha_tecnica_ref    text        null,
  estoque_minimo       numeric     null,
  estoque_atual        numeric     null,
  ativo                boolean     null default true,
  rn                   numeric     not null default 1,
  preco_unitario_fixo  numeric     null,
  tipo                 text        not null default 'comercial',
  codigo_producao      text        null,
  id_altec             text        null,
  rendimento           numeric     null,
  modo_preparo         text        null
);

create table if not exists public.pratos (
  id           uuid primary key default gen_random_uuid(),
  nome         text        not null,
  categoria    text        not null,
  id_altec     text        null,
  preco_venda  numeric     null,
  cmv_meta     numeric     null,
  observacao   text        null,
  ativo        boolean     null default true,
  created_at   timestamptz null default now()
);

create table if not exists public.prato_ingredientes (
  id                uuid primary key default gen_random_uuid(),
  prato_id          uuid    null references public.pratos(id),
  insumo_master_id  uuid    null references public.insumos_master(id),
  quantidade        numeric not null,
  rn_override       numeric null,
  ordem             integer null,
  observacao        text    null
);

create table if not exists public.producao_ingredientes (
  id                uuid primary key default gen_random_uuid(),
  producao_id       uuid    null references public.insumos_master(id),
  insumo_master_id  uuid    null references public.insumos_master(id),
  quantidade        numeric not null,
  rn_override       numeric null,
  ordem             integer null,
  observacao        text    null
);

create table if not exists public.fornecedores (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null
);

create table if not exists public.notas (
  id    uuid primary key default gen_random_uuid(),
  numero text null
);

create table if not exists public.historico_precos (
  id                     uuid primary key default gen_random_uuid(),
  insumo_master_id       uuid    null references public.insumos_master(id),
  fornecedor_id          uuid    null references public.fornecedores(id),
  nota_id                uuid    null references public.notas(id),
  data                   date    not null,
  valor_unit_normalizado numeric null,
  variacao_pct           numeric null
);

-- -----------------------------------------------------------------------------
-- E o fecho dos privilegios de `service_role`, agora que as tabelas existem.
-- Ver a explicacao no topo: sem isto o contraste de F55 nao contrasta.
-- -----------------------------------------------------------------------------
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
