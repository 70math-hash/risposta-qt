-- =============================================================================
-- sql/papeis.sql — os papeis do banco, fora do `pg_dump`.
--
-- POR QUE ESTE ARQUIVO EXISTE, E POR QUE ELE E O PRIMEIRO A RODAR NUMA RESTAURACAO
--   Papel no Postgres e objeto do CLUSTER, e nao do banco. `pg_dump` despeja UM BANCO, entao ele
--   nao leva papel nenhum: leva os `GRANT` que citam os papeis, e falha ao aplica-los se os papeis
--   nao existirem antes.
--
--   A consequencia pratica, no dia em que ela importa: quem restaura o backup num Postgres novo ve
--   `role "experiencia_app" does not exist`, uma linha por `GRANT`, dezenas de vezes. O dado
--   restaura e as permissoes nao, ou a restauracao para no meio. Ninguem descobre isso ensaiando o
--   backup — descobre-se precisando dele.
--
--   `05-implantacao` cita este arquivo como pre-requisito da restauracao desde a primeira versao, e
--   ele nao existia no repositorio (achado da critica adversarial: "os quatro arquivos citados e
--   ausentes"). Um documento que aponta para um arquivo que nao existe e pior que um documento
--   omisso, porque quem o le acha que o problema esta resolvido.
--
-- ORDEM DE RESTAURACAO
--   1. Criar o banco vazio.
--   2. psql -f sql/papeis.sql            <- ESTE ARQUIVO
--   3. psql -f backup.sql                (o pg_dump)
--   4. Conferir com o bloco final deste arquivo, rodado DE NOVO depois do passo 3.
--
-- ONDE ELE NAO E NECESSARIO
--   Num projeto Supabase novo, `anon`, `authenticated`, `service_role` e `authenticator` ja vem
--   criados pela plataforma, e as migrations criam `experiencia_app` e `experiencia_leitura`. Este
--   arquivo e para o caso de restaurar num Postgres CRU — que e exatamente o caso que o backup
--   existe para cobrir, porque se o Supabase estivesse de pe nao haveria o que restaurar.
--
-- IDEMPOTENTE
--   Rodar duas vezes nao muda nada e nao levanta erro. Papel que ja existe e mantido como esta.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Os dois papeis do projeto.
--
-- `nologin` nos dois, e isso e desenho e nao economia: nenhum dos dois e um caminho de entrada. Eles
-- sao ASSUMIDOS por quem ja entrou (`set role`, ou o `set local role` que o PostgREST faz a partir
-- do `role` do JWT). Um papel de projeto com `LOGIN` transformaria o vazamento do nome do papel em
-- meio caminho para uma senha.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'experiencia_app') then
    create role experiencia_app nologin;
    raise notice 'criado: experiencia_app';
  else
    raise notice 'ja existia: experiencia_app';
  end if;

  if not exists (select 1 from pg_roles where rolname = 'experiencia_leitura') then
    create role experiencia_leitura nologin;
    raise notice 'criado: experiencia_leitura';
  else
    raise notice 'ja existia: experiencia_leitura';
  end if;

  -- Garante o `nologin` mesmo em papel preexistente: uma restauracao anterior mal feita pode ter
  -- deixado o papel com LOGIN, e o arquivo tem de convergir para o estado certo, e nao so criar.
  execute 'alter role experiencia_app nologin';
  execute 'alter role experiencia_leitura nologin';
end
$$;

-- -----------------------------------------------------------------------------
-- 2. Os papeis da plataforma, SO se nao existirem.
--
-- Num Postgres cru eles nao existem, e sem eles os `GRANT` do dump falham. Num Supabase eles
-- existem e nao devem ser tocados — por isso cada um e criado so na ausencia.
--
-- `noinherit` NAO E DETALHE. No Supabase os tres sao `NOINHERIT`, e recria-los sem isso produz um
-- banco de restauracao que se comporta diferente do de producao: com heranca, `authenticated`
-- ganharia `experiencia_leitura` automaticamente e as telas funcionariam no ensaio e falhariam em
-- producao com "permission denied for schema experiencia". Esse erro exato ja aconteceu durante a
-- construcao, e levou tempo justamente porque o ensaio nao o reproduzia.
--
-- `bypassrls` em `service_role` tambem e da plataforma: sem ele, o Worker restaurado se comporta
-- diferente do de producao, e a diferenca aparece so nas politicas de RLS.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
    raise notice 'criado: anon (papel de plataforma, ausente num Postgres cru)';
  end if;

  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
    raise notice 'criado: authenticated';
  end if;

  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
    raise notice 'criado: service_role';
  end if;

  -- `authenticator` e o papel de CONEXAO do PostgREST, e e o unico com LOGIN. Ele nao tem
  -- privilegio proprio: tudo o que ele faz, faz assumindo um dos outros. Sem senha aqui de
  -- proposito — quem restaura define a dele, e senha em arquivo versionado e senha publicada.
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit;
    raise notice 'criado: authenticator SEM SENHA. Definir com: alter role authenticator password ...';
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 3. Quem pode assumir quem.
--
-- `authenticator` precisa poder virar os quatro. `authenticated` herda a leitura do projeto, que e
-- o que faz o painel enxergar o schema.
-- -----------------------------------------------------------------------------
do $$
begin
  execute 'grant experiencia_leitura to authenticated';

  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    execute 'grant anon, authenticated, service_role to authenticator';
    execute 'grant experiencia_app, experiencia_leitura to authenticator';
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 4. A conferencia.
--
-- Rodar este bloco DE NOVO depois de aplicar o dump e o que prova que a restauracao ficou
-- utilizavel. Antes do dump ele confere so a existencia dos papeis; depois, ele confere que os
-- privilegios do dump encontraram os papeis e coalram.
--
-- Ele LEVANTA ERRO em vez de avisar, porque restauracao meio feita e o pior estado possivel: o
-- sistema sobe, as telas abrem, e a falha aparece quando alguem tenta usar.
-- -----------------------------------------------------------------------------
do $$
declare
  v_falta text[] := array[]::text[];
  v_papel text;
  v_schema_existe boolean;
  v_tabelas int;
begin
  foreach v_papel in array array['experiencia_app', 'experiencia_leitura', 'anon',
                                 'authenticated', 'service_role'] loop
    if not exists (select 1 from pg_roles where rolname = v_papel) then
      v_falta := v_falta || v_papel;
    end if;
  end loop;

  if array_length(v_falta, 1) > 0 then
    raise exception 'papeis ausentes depois de rodar este arquivo: %', array_to_string(v_falta, ', ');
  end if;

  -- `authenticated` NAO pode herdar por conta propria: se ele estiver `INHERIT`, o banco de
  -- restauracao concede mais que o de producao, e o ensaio deixa de valer como ensaio.
  if exists (select 1 from pg_roles where rolname = 'authenticated' and rolinherit) then
    raise warning 'authenticated esta com INHERIT, e no Supabase ele e NOINHERIT. As permissoes '
                  'deste banco sao MAIS FROUXAS que as de producao, e um teste que passe aqui pode '
                  'falhar la com "permission denied for schema experiencia".';
  end if;

  select exists (select 1 from information_schema.schemata where schema_name = 'experiencia')
    into v_schema_existe;

  if not v_schema_existe then
    raise notice 'ok  os 5 papeis existem. O schema `experiencia` ainda nao: aplicar o dump agora, '
                 'e rodar este arquivo DE NOVO para a conferencia completa.';
    return;
  end if;

  -- Depois do dump: as permissoes do dump encontraram os papeis?
  select count(*) into v_tabelas
  from information_schema.role_table_grants
  where table_schema = 'experiencia' and grantee = 'experiencia_leitura' and privilege_type = 'SELECT';

  if v_tabelas = 0 then
    raise exception 'o schema `experiencia` existe e `experiencia_leitura` nao tem SELECT em tabela '
                    'nenhuma. O dump foi aplicado ANTES deste arquivo, e os GRANT dele falharam em '
                    'silencio. Recriar o banco e refazer na ordem: papeis, depois dump.';
  end if;

  raise notice 'ok  os 5 papeis existem e `experiencia_leitura` tem SELECT em % tabela(s) de '
               '`experiencia`. Restauracao utilizavel.', v_tabelas;
end
$$;
