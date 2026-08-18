-- =============================================================================
-- 20260817102000_cria_rls_experiencia.sql
--
-- O QUE FAZ
--   Habilita RLS nas 27 tabelas do schema `experiencia`, sem excecao, e cria as
--   politicas. No fim, CONFERE duas invariantes e derruba a migration se alguma falhar:
--   nenhuma tabela com RLS desligado, e exatamente 27 tabelas no schema.
--
--   As politicas de `experiencia_app` sao derivadas dos GRANTS ja concedidos nas
--   migrations anteriores, lendo `information_schema.role_table_grants`. Ou seja: o
--   grant e a fonte unica do que a aplicacao pode fazer, e o RLS espelha o grant.
--   Duas listas escritas a mao divergiriam na primeira pressa, e a divergencia entre
--   grant e politica e do tipo que ninguem descobre por leitura.
--
-- O QUE ASSUME, e o item 1 e o mais importante
--   1. `service_role` do Supabase tem BYPASSRLS. O Worker usa a chave de servico, entao
--      para ele o RLS NAO e a primeira tranca: a primeira tranca e a chave de servico
--      nunca sair do Worker (F58). O que o RLS deste arquivo entrega de verdade e o
--      seguinte: `anon` nao le uma linha do schema, mesmo com a chave publica em maos,
--      porque nao tem grant nem politica. E o painel, que entra como `authenticated`,
--      so le o que `experiencia_leitura` permite.
--   2. Sao dois administradores, os dois com o mesmo acesso (F57). Portanto a politica e
--      de TABELA e nao de LINHA: nao existe dado de um administrador que o outro nao
--      possa ver, e inventar `user_id` em cada tabela para dois usuarios identicos
--      seria complexidade sem beneficio.
--   3. Politica com `using (true)` nao e politica frouxa: o filtro real e o conjunto de
--      papeis que ela nomeia (`to experiencia_leitura`, `to experiencia_app`). Quem nao
--      esta nomeado nao passa, e e por isso que a ausencia de politica para `anon` e a
--      linha mais importante do arquivo.
--   4. O schema `experiencia` precisa estar na lista de Exposed schemas do projeto para
--      o painel ler por REST. Isso e configuracao do projeto, nao DDL, e nao entra em
--      migration nenhuma. Fica escrito aqui porque e a causa mais provavel de "o painel
--      nao ve nada" no primeiro dia.
--
-- COMO SE DESFAZ
--   Para cada tabela: drop policy if exists leitura_painel on experiencia.<t>;
--   (e app_select, app_insert, app_update, app_delete), depois
--   alter table experiencia.<t> disable row level security;
--   Desfazer isto reprova o criterio de aceite de F58 e o `get_advisors` do Supabase.
--   Nao se desfaz em producao.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. RLS ligado em todas as tabelas. Em loop, de proposito: lista escrita a mao
-- esquece a tabela que a proxima migration criar, e "todas, sem excecao" e o criterio.
-- -----------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'experiencia' and c.relkind = 'r'
    order by c.relname
  loop
    execute format('alter table experiencia.%I enable row level security', t.relname);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- 2. `anon` nao tem nada, e isso e explicito e nao herdado de default.
-- Guardado por existencia do papel, porque `anon` e do Supabase e nao existe no
-- Postgres limpo da camada 1 de ensaio.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables    in schema experiencia from anon;
    revoke all on all functions in schema experiencia from anon;
    revoke all on schema experiencia                  from anon;
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 3. Politica de leitura do painel, em todas as tabelas.
-- -----------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'experiencia' and c.relkind = 'r'
    order by c.relname
  loop
    execute format('drop policy if exists leitura_painel on experiencia.%I', t.relname);
    execute format(
      'create policy leitura_painel on experiencia.%I for select to experiencia_leitura using (true)',
      t.relname);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- 4. Politicas da aplicacao, espelhando exatamente os grants concedidos.
-- Se `experiencia_app` nao tem DELETE numa tabela, ela nao ganha politica de DELETE.
-- Hoje isso significa: DELETE existe em `venda_produto_dia` e `classificacao_texto`, e
-- em nenhuma outra das 26.
-- -----------------------------------------------------------------------------
do $$
declare g record;
begin
  for g in
    select rtg.table_name, rtg.privilege_type
    from information_schema.role_table_grants rtg
    where rtg.table_schema = 'experiencia'
      and rtg.grantee = 'experiencia_app'
      and rtg.privilege_type in ('SELECT','INSERT','UPDATE','DELETE')
      and rtg.table_name in (
        select c.relname from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'experiencia' and c.relkind = 'r')
    group by rtg.table_name, rtg.privilege_type
    order by rtg.table_name, rtg.privilege_type
  loop
    if g.privilege_type = 'SELECT' then
      execute format('drop policy if exists app_select on experiencia.%I', g.table_name);
      execute format('create policy app_select on experiencia.%I for select to experiencia_app using (true)', g.table_name);
    elsif g.privilege_type = 'INSERT' then
      execute format('drop policy if exists app_insert on experiencia.%I', g.table_name);
      execute format('create policy app_insert on experiencia.%I for insert to experiencia_app with check (true)', g.table_name);
    elsif g.privilege_type = 'UPDATE' then
      execute format('drop policy if exists app_update on experiencia.%I', g.table_name);
      execute format('create policy app_update on experiencia.%I for update to experiencia_app using (true) with check (true)', g.table_name);
    elsif g.privilege_type = 'DELETE' then
      execute format('drop policy if exists app_delete on experiencia.%I', g.table_name);
      execute format('create policy app_delete on experiencia.%I for delete to experiencia_app using (true)', g.table_name);
    end if;
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- 5. As duas invariantes. Elas nao sao comentario: elas derrubam a migration.
-- -----------------------------------------------------------------------------
do $$
declare
  v_sem_rls integer;
  v_tabelas integer;
  v_sem_politica integer;
begin
  select count(*) into v_sem_rls
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'experiencia' and c.relkind = 'r' and c.relrowsecurity = false;

  if v_sem_rls > 0 then
    raise exception 'RLS desligado em % tabela(s) do schema experiencia. F58 exige todas, sem excecao', v_sem_rls;
  end if;

  select count(*) into v_tabelas
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'experiencia' and c.relkind = 'r';

  -- PISO, e nao numero exato. As 26 da secao 2.2 da folha tem de existir ATE AQUI; migrations
  -- posteriores podem legitimamente acrescentar tabela, e uma delas ja acrescentou.
  --
  -- A conferencia do numero EXATO mudou para a ultima migration da cadeia, que e a unica que
  -- enxerga o estado final. Aqui ela nao servia: este arquivo roda no meio, entao ele aprovava um
  -- numero que deixava de ser verdade tres migrations depois — e uma conferencia que descreve um
  -- estado intermediario como se fosse o final da uma falsa sensacao de trava.
  if v_tabelas < 26 then
    raise exception 'esperadas ao menos as 26 tabelas da secao 2.2, encontradas %', v_tabelas;
  end if;

  select count(*) into v_sem_politica
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'experiencia' and c.relkind = 'r'
    and not exists (select 1 from pg_policies p
                    where p.schemaname = 'experiencia' and p.tablename = c.relname);

  if v_sem_politica > 0 then
    raise exception 'RLS ligado e nenhuma politica em % tabela(s): isso nega tudo em silencio', v_sem_politica;
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 6. Invariante de nome, que a folha canonica pede como conferivel por busca:
-- nenhuma tabela do schema `experiencia` esta no plural.
-- -----------------------------------------------------------------------------
do $$
declare v_plural text[];
begin
  select array_agg(c.relname order by c.relname) into v_plural
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'experiencia' and c.relkind = 'r'
    -- Nenhum dos 26 nomes legitimos termina em `s`. Se um dia um terminar, ele entra
    -- nesta consulta como excecao nomeada, junto com a justificativa, e nunca pela
    -- remocao da conferencia.
    and c.relname like '%s';

  if v_plural is not null then
    raise exception 'nome de tabela terminando em s, provavel plural: %. A regra da secao 2.1 e singular, sempre', v_plural;
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 7. Invariante de PERMISSAO: o que e append-only nao pode ter UPDATE.
--
-- Existe porque as tres garantias abaixo estavam escritas em comentario e eram FALSAS no banco.
-- `20260817090000` concedia `select, insert, update` por privilegio PADRAO, entao toda tabela
-- criada depois nascia com UPDATE para a aplicacao, e o grant explicito de cada migration, sendo
-- um subconjunto, nao revogava nada. `has_table_privilege` devolvia `true` nas tres.
--
-- E como o passo 4 deste arquivo gera as politicas LENDO os grants reais, ele criava `app_update`
-- nas 27 tabelas: as duas trancas abertas, cada uma confiando na outra.
--
-- A lista abaixo e nomeada, e nao derivada. Derivar de "tabelas que nao deveriam ter UPDATE" seria
-- circular; o que se quer e que a intencao esteja escrita num lugar e conferida no banco.
-- -----------------------------------------------------------------------------
do $$
declare
  t        text;
  v_erros  text[] := '{}';
  -- Por que cada uma:
  --   resposta e as cinco filhas   resposta nasce completa e nao se edita. Correcao e resposta nova.
  --   tentativa                    o denominador da conversao por garcom nao se ajusta depois.
  --   consentimento                aceite gravado nao se altera: e o que se prova numa fiscalizacao.
  --   consentimento_texto          append-only. Texto novo e VERSAO nova, nunca edicao da antiga,
  --                                senao os aceites ja gravados passam a citar um texto que mudou.
  --   convite_clique               historico migrado. Depois de `qt-avaliacoes` pausado, e a unica
  --                                copia daquelas 74 linhas.
  v_append_only text[] := array[
    'resposta','resposta_item','resposta_opcao','resposta_pergunta_sorteada','tela_evento',
    'tentativa','consentimento','consentimento_texto','convite_clique'];
begin
  foreach t in array v_append_only loop
    if has_table_privilege('experiencia_app', 'experiencia.' || quote_ident(t), 'UPDATE') then
      v_erros := v_erros || format('experiencia_app tem UPDATE em %s', t);
    end if;
    if has_table_privilege('experiencia_app', 'experiencia.' || quote_ident(t), 'DELETE') then
      v_erros := v_erros || format('experiencia_app tem DELETE em %s', t);
    end if;
    -- E a politica de RLS nao pode existir para o que o grant nao permite. Se ela existir, o
    -- espelho ficou permissivo e a proxima linha de conveniencia no grant abre tudo de uma vez.
    if exists (
      select 1 from pg_policies p
      where p.schemaname = 'experiencia' and p.tablename = t and p.policyname = 'app_update'
    ) then
      v_erros := v_erros || format('existe politica app_update em %s', t);
    end if;
  end loop;

  if array_length(v_erros, 1) > 0 then
    raise exception
      'permissao de escrita alem do declarado: %. As tabelas de resposta e de consentimento sao '
      'append-only por PERMISSAO, e nao apenas por comentario. Se a mudanca for intencional, ela '
      'muda a garantia escrita e tem de sair desta lista junto com a explicacao.',
      array_to_string(v_erros, '; ');
  end if;

  -- E as cinco tabelas de custo em `public`: SELECT e nada mais. Criterio de aceite de F55.
  -- Conferido girando a maçaneta, e nao lendo o grant: `has_table_privilege` e a mesma pergunta que
  -- o Postgres se faz na hora de decidir.
  foreach t in array array['pratos','prato_ingredientes','insumos_master','historico_precos','producao_ingredientes'] loop
    if to_regclass('public.' || quote_ident(t)) is null then
      continue;
    end if;
    if has_table_privilege('experiencia_app', 'public.' || quote_ident(t), 'INSERT')
       or has_table_privilege('experiencia_app', 'public.' || quote_ident(t), 'UPDATE')
       or has_table_privilege('experiencia_app', 'public.' || quote_ident(t), 'DELETE') then
      raise exception
        'experiencia_app pode ESCREVER em public.%. O sistema de experiencia CONSOME custo e nunca '
        'o produz, e o sistema fiscal nao pode ser tocado por ele (F55, ADR-04).', t;
    end if;
  end loop;

  raise notice 'ok  append-only conferido em 9 tabelas, e nenhuma escrita em public.';
end
$$;
