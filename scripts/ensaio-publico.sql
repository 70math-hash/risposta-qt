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
do $$
declare p text;
begin
  foreach p in array array['anon','authenticated','service_role'] loop
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
