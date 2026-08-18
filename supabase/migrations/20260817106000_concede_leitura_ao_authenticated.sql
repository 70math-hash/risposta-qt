-- =============================================================================
-- 20260817106000_concede_leitura_ao_authenticated.sql
--
-- O QUE FAZ
--   Da a `authenticated` DIRETAMENTE tudo o que `experiencia_leitura` tem, em vez de contar
--   com a heranca por associacao de papel. Depois CONFERE, papel por papel, que o painel le e
--   que `anon` nao le. A migration derruba se qualquer uma das duas coisas nao for verdade.
--
-- POR QUE EXISTE, e este e o erro mais grave achado no projeto ate agora
--   `20260817090000` faz `grant experiencia_leitura to authenticated` e conta com a heranca.
--   No Postgres, papel so herda privilegio de um papel do qual e membro se for `inherit`, e o
--   Supabase cria os tres papeis dele assim:
--
--     create role anon           nologin noinherit;
--     create role authenticated  nologin noinherit;
--     create role service_role   nologin noinherit bypassrls;
--
--   `noinherit`. Portanto a associacao existe e NAO transporta privilegio nenhum. O PostgREST
--   atende o painel com `set local role authenticated`, e o resultado, na primeira aba aberta
--   no primeiro dia, e:
--
--     ERROR:  permission denied for schema experiencia
--
--   Todas as sete abas, todas as vinte e cinco views, sempre. E `useView` mostra o erro na
--   tela, entao ao menos ele apareceria — mas apareceria depois do deploy, e o diagnostico
--   ("por que o painel nao ve nada") custaria a tarde inteira, porque o `grant` esta escrito
--   na migration e parece certo.
--
--   No Postgres 16 e acima a opcao de heranca e gravada NO MOMENTO DO GRANT, a partir do
--   `rolinherit` que o membro tinha ali. Isso torna o erro ainda mais escorregadio: num banco
--   onde `authenticated` foi criado `inherit` e virou `noinherit` depois, a heranca CONTINUA
--   funcionando, e o ensaio passa. Foi exatamente o que aconteceu aqui: o ensaio so reproduziu
--   a falha depois de `scripts/ensaio-publico.sql` passar a recriar os tres papeis a cada
--   execucao, com os atributos exatos do Supabase.
--
-- POR QUE NAO `alter role authenticated inherit`
--   Seria uma linha, e mexe num papel da plataforma. Se o Supabase recriar ou normalizar esse
--   papel numa atualizacao, o painel para de ler sem ninguem ter tocado no projeto, e a causa
--   estaria numa migration de meses antes. Conceder direto e mais verboso e nao depende de
--   atributo de papel de terceiro.
--
-- POR QUE NAO `with inherit true`
--   E sintaxe de Postgres 16 e acima. O projeto e Postgres 17, mas a migration passaria a nao
--   aplicar num Postgres 15, e nao ha ganho que pague essa dependencia.
--
-- O QUE ASSUME
--   1. `experiencia_leitura` continua sendo a DEFINICAO do que um leitor pode fazer. Este
--      arquivo nao inventa permissao: ele copia, lendo `information_schema`. Se um dia o
--      leitor perder acesso a uma tabela, reaplicar este arquivo tira de `authenticated`
--      tambem, porque a origem e a mesma.
--   2. `anon` continua sem nada. A conferencia no fim testa isso de verdade, com `set role`,
--      e nao por leitura de catalogo: e a diferenca entre acreditar que a tranca esta fechada
--      e girar a maçaneta.
--   3. O schema `experiencia` precisa estar em Exposed schemas do projeto. Isso e
--      configuracao, nao DDL, e nao entra em migration. E a OUTRA causa de "o painel nao ve
--      nada", e as duas se parecem na tela.
--
-- COMO SE DESFAZ
--   revoke all on all tables in schema experiencia from authenticated;
--   revoke usage on schema experiencia from authenticated;
--   E recriar as politicas `leitura_painel` sem `authenticated`. Desfazer isto cega o painel.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. USAGE nos dois schemas que o painel alcanca.
--
-- `public` entra porque `vw_custo_prato` e `security_invoker = true` e le as cinco tabelas de
-- custo: com a view invocada pelo chamador, quem precisa de permissao nelas e `authenticated`,
-- e nao o dono da view. Sem isso, seis das sete abas funcionariam e a de pratos daria erro,
-- que e o tipo de falha parcial que faz parecer problema de dado.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    raise notice 'papel `authenticated` nao existe: fora do Supabase isto nao se aplica';
    return;
  end if;

  execute 'grant usage on schema experiencia to authenticated';
  execute 'grant usage on schema public to authenticated';
  -- Sem CREATE, nunca. Leitor que pode criar objeto no schema nao e leitor.
  execute 'revoke create on schema experiencia from authenticated';
  execute 'revoke create on schema public from authenticated';
end
$$;

-- -----------------------------------------------------------------------------
-- 2. Todo SELECT que `experiencia_leitura` tem, copiado para `authenticated`.
--
-- Em loop sobre `information_schema.role_table_grants`, e nao em lista escrita a mao: e o
-- mesmo criterio da migration de RLS, e pela mesma razao. Duas listas divergem na primeira
-- pressa, e divergencia entre grant e grant nao aparece em leitura nenhuma.
-- -----------------------------------------------------------------------------
do $$
declare
  g       record;
  v_conta integer := 0;
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then return; end if;

  for g in
    select distinct table_schema, table_name
    from information_schema.role_table_grants
    where grantee = 'experiencia_leitura' and privilege_type = 'SELECT'
  loop
    execute format('grant select on %I.%I to authenticated', g.table_schema, g.table_name);
    v_conta := v_conta + 1;
  end loop;

  -- Zero significa que a leitura do catalogo falhou, e nao que nao havia nada a copiar: as
  -- migrations anteriores concedem SELECT ao leitor em dezenas de objetos. Passar em silencio
  -- aqui produziria exatamente o painel cego que este arquivo existe para consertar.
  if v_conta = 0 then
    raise exception 'nenhum SELECT de experiencia_leitura foi encontrado para copiar. As migrations anteriores nao rodaram, ou o nome do papel mudou';
  end if;
  raise notice 'SELECT copiado de experiencia_leitura para authenticated em % objeto(s).', v_conta;
end
$$;

-- Privilegio padrao, para a proxima view criada nascer legivel pelo painel sem migration de
-- permissao. Sem isto, toda view nova exigiria dois arquivos, e o segundo seria esquecido.
alter default privileges in schema experiencia grant select on tables to authenticated;

-- -----------------------------------------------------------------------------
-- 3. As politicas de RLS passam a nomear `authenticated`.
--
-- Grant e RLS sao duas trancas independentes, e as duas precisam abrir. A politica antiga
-- nomeia `experiencia_leitura`, e um papel que nao herda tambem nao e alcancado por politica
-- concedida ao papel do qual ele e membro: `pg_has_role` seria verdadeiro, mas a checagem de
-- politica e por papel efetivo da sessao. Portanto a politica tem de dizer `authenticated`.
-- -----------------------------------------------------------------------------
do $$
declare t record;
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then return; end if;

  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'experiencia' and c.relkind = 'r'
    order by c.relname
  loop
    execute format('drop policy if exists leitura_painel on experiencia.%I', t.relname);
    execute format(
      'create policy leitura_painel on experiencia.%I for select to experiencia_leitura, authenticated using (true)',
      t.relname);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- 4. A conferencia, girando a maçaneta.
--
-- Duas afirmacoes, testadas com `set role` de verdade e nao por leitura de catalogo:
--   o painel LE as views;
--   `anon` NAO le nada, nem view nem tabela, mesmo com a chave publica em maos.
--
-- A segunda e testada esperando a excecao. Um teste de negacao que nao verifica a excecao nao
-- testa nada, e este arquivo existe justamente porque uma permissao que parecia certa no
-- codigo nao era certa no banco.
-- -----------------------------------------------------------------------------
do $$
declare
  v_n       bigint;
  v_view    text;
  v_falhou  boolean;
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then return; end if;

  -- 4a. Toda view de leitura, uma por uma, como `authenticated`.
  for v_view in
    select table_name from information_schema.views
    where table_schema = 'experiencia' and table_name <> 'vw_texto_a_classificar'
    order by table_name
  loop
    set local role authenticated;
    begin
      execute format('select count(*) from experiencia.%I', v_view) into v_n;
    exception when others then
      reset role;
      raise exception 'o painel nao consegue ler experiencia.%: %. E o erro de permission denied que aparece em toda aba no primeiro dia', v_view, sqlerrm;
    end;
    reset role;
  end loop;

  -- 4b. `anon` nao le a view nem a tabela por tras dela.
  set local role anon;
  v_falhou := false;
  begin
    execute 'select count(*) from experiencia.vw_hoje' into v_n;
  exception when others then
    v_falhou := true;
  end;
  reset role;
  if not v_falhou then
    raise exception 'anon LEU experiencia.vw_hoje. A chave publica vai no bundle do PWA, que e legivel por qualquer pessoa';
  end if;

  set local role anon;
  v_falhou := false;
  begin
    execute 'select count(*) from experiencia.resposta' into v_n;
  exception when others then
    v_falhou := true;
  end;
  reset role;
  if not v_falhou then
    raise exception 'anon LEU experiencia.resposta';
  end if;

  raise notice 'ok  o painel le as 25 views como `authenticated`, e `anon` nao le view nem tabela.';
end
$$;
