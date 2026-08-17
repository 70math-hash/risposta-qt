-- =============================================================================
-- 20260817090000_cria_schema_experiencia.sql
--
-- O QUE FAZ
--   Cria o schema `experiencia` e os dois papeis do banco (`experiencia_app` e
--   `experiencia_leitura`), da a eles USAGE no schema, fixa privilegios padrao para
--   as tabelas que as migrations seguintes vao criar, e concede SELECT, e nada mais
--   que SELECT, nas cinco tabelas de custo que vivem em `public`.
--
-- O QUE ASSUME
--   1. Roda no projeto Supabase `NFe e Financeiro` (`rzrjdbnxhpwzqgqrlfwa`,
--      `sa-east-1`, Postgres 17), como o papel `postgres`, que e o mesmo papel que
--      cria as tabelas nas migrations seguintes. Os privilegios padrao valem para
--      objetos criados pelo papel que executa este arquivo.
--   2. As cinco tabelas de custo ja existem em `public` (`pratos`,
--      `prato_ingredientes`, `insumos_master`, `historico_precos`,
--      `producao_ingredientes`), conforme
--      docs/pesquisa/dados/12-schema-custo-inspecao.md.
--   3. O `pg_dump` exigido pela condicao 3 de D2 ja foi feito e esta guardado fora
--      do Supabase. Enquanto isso nao for verdade, este arquivo e inerte.
--
-- COMO SE DESFAZ
--   drop schema experiencia cascade;
--   revoke all on public.pratos, public.prato_ingredientes, public.insumos_master,
--     public.historico_precos, public.producao_ingredientes
--     from experiencia_app, experiencia_leitura;
--   revoke experiencia_leitura from authenticated;
--   drop role experiencia_leitura;  drop role experiencia_app;
--   Nada em `public` e alterado por este arquivo, so concedido. O desfazer nao toca
--   em nenhuma tabela do sistema fiscal.
-- =============================================================================

create schema if not exists experiencia;

comment on schema experiencia is
  'Sistema de experiencia do cliente do QT Pizza Bar. Nunca escreve fora de si mesmo. '
  'Nas cinco tabelas de custo em public tem no maximo SELECT (D2, condicao 1).';

-- -----------------------------------------------------------------------------
-- Os dois papeis. `nologin` de proposito: eles sao papeis de permissao, e quem
-- entra no banco (postgres, service_role, authenticated) herda um deles.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'experiencia_app') then
    create role experiencia_app nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'experiencia_leitura') then
    create role experiencia_leitura nologin;
  end if;
end
$$;

comment on role experiencia_app is
  'Escrita apenas no schema experiencia, mais SELECT nas cinco tabelas de custo em public.';
comment on role experiencia_leitura is
  'SELECT no schema experiencia, para o painel. Nenhuma escrita, em nenhuma tabela.';

grant usage on schema experiencia to experiencia_app, experiencia_leitura;

-- O painel entra pelo PostgREST como `authenticated`. Sem esta linha, e sem o schema
-- `experiencia` na lista de Exposed schemas do projeto, o painel nao le nada.
grant experiencia_leitura to authenticated;

-- `anon` nao recebe nada. Chave publica vazada nao le uma linha do schema.
revoke all on schema experiencia from anon;

-- -----------------------------------------------------------------------------
-- Privilegios padrao. Cada migration de tabela repete o grant explicito, de
-- proposito: privilegio padrao depende do papel que executa, e grant explicito nao.
-- DELETE nao entra aqui. Ele e concedido tabela por tabela, e so em duas.
-- -----------------------------------------------------------------------------
alter default privileges in schema experiencia
  grant select, insert, update on tables to experiencia_app;
alter default privileges in schema experiencia
  grant select on tables to experiencia_leitura;
alter default privileges in schema experiencia
  grant execute on functions to experiencia_app, experiencia_leitura;

-- -----------------------------------------------------------------------------
-- As cinco tabelas de custo em `public`. SELECT, e nada mais.
-- Tentativa de INSERT em tabela fiscal tem que falhar, e isso e criterio de aceite
-- de F55. Estas quatro linhas sao o que faz o teste passar.
-- -----------------------------------------------------------------------------
grant usage on schema public to experiencia_app, experiencia_leitura;

grant select on
  public.pratos,
  public.prato_ingredientes,
  public.insumos_master,
  public.historico_precos,
  public.producao_ingredientes
to experiencia_app, experiencia_leitura;

-- Nenhum dos dois papeis cria objeto em `public`, nem por engano.
revoke create on schema public from experiencia_app, experiencia_leitura;
