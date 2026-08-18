-- =============================================================================
-- sql/teste_rls.sql — a matriz de permissoes, girando a maçaneta.
--
-- POR QUE ESTE ARQUIVO EXISTE
--   `03-seguranca-e-lgpd.md`, secao 3.3, declara para cada tabela quem passa e quem nao passa, e
--   termina cada bloco com "Teste:". Os testes estavam escritos em prosa, e o documento dizia, sobre
--   este arquivo, que ele "ainda nao existe". Uma matriz de permissoes conferida por leitura nao e
--   uma matriz conferida: quem le confirma o que esperava ver.
--
--   O caso concreto que justifica o arquivo aconteceu durante a construcao: `authenticated` e
--   NOINHERIT no Supabase, entao o `grant experiencia_leitura to authenticated` nao dava leitura
--   nenhuma ao painel. Toda aba morreria com "permission denied for schema experiencia". Nenhuma
--   leitura de documento pegou isso — nem a leitura do SQL, que estava certo. So girar a maçaneta
--   pega.
--
-- COMO RODAR
--   sudo -u postgres psql -v ON_ERROR_STOP=1 -d qt_ensaio -f sql/teste_rls.sql
--
--   Roda tambem, e automaticamente, dentro de `scripts/ensaio.sh --dados`.
--
-- `begin; ... rollback;`
--   O arquivo inteiro vive numa transacao desfeita, como o documento manda. Nenhum teste daqui
--   deixa rastro, e rodar contra um banco com dado nao muda nada nele. Os `set local role` tambem
--   morrem com a transacao, entao nao ha risco de a sessao ficar com papel trocado.
--
-- O QUE ELE CONFERE, E O QUE NAO
--   Confere PERMISSAO: quem le, quem escreve, quem nao alcanca. Nao confere conteudo de politica
--   por linha, porque nao existe nenhuma: todas as politicas do projeto sao `using (true)`, e a
--   fronteira e o GRANT, nao o predicado. Se um dia entrar politica com predicado, ela ganha caso
--   proprio aqui.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Auxiliar: roda um comando como um papel e diz se ele foi RECUSADO.
--
-- `set local role` dentro de bloco com `exception` e o unico jeito de testar negacao sem derrubar
-- o arquivo: o `exception when insufficient_privilege` transforma a recusa esperada em `true`.
--
-- Erro que NAO seja de privilegio e repropagado, e isso importa: um teste que engula qualquer erro
-- passaria por tabela inexistente, por coluna errada e por sintaxe quebrada, e diria "recusado" com
-- confianca. Recusa por motivo errado nao e a recusa que se queria provar.
-- -----------------------------------------------------------------------------
create or replace function pg_temp.recusado(p_papel text, p_sql text) returns boolean as $$
begin
  execute format('set local role %I', p_papel);
  begin
    execute p_sql;
    execute 'reset role';
    return false;
  exception
    when insufficient_privilege then
      execute 'reset role';
      return true;
    when others then
      execute 'reset role';
      raise exception 'teste de `%` como `%` falhou por motivo DIFERENTE de privilegio: % (%). '
                      'Recusa por motivo errado nao prova a permissao.',
                      p_sql, p_papel, sqlerrm, sqlstate;
  end;
end
$$ language plpgsql;

create or replace function pg_temp.permitido(p_papel text, p_sql text) returns boolean as $$
begin
  execute format('set local role %I', p_papel);
  begin
    execute p_sql;
    execute 'reset role';
    return true;
  exception when others then
    execute 'reset role';
    raise notice '  (`%` como `%` falhou: %)', p_sql, p_papel, sqlerrm;
    return false;
  end;
end
$$ language plpgsql;


-- =============================================================================
-- BLOCO A. `anon` nao alcanca nada.
--
-- `anon` e o papel de quem chega sem sessao. A chave publica vai no pacote publicado, entao este
-- bloco e a fronteira entre "a internet" e o dado da casa. Ele e o mais importante do arquivo.
-- =============================================================================
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    raise notice 'pulado: papel `anon` nao existe (fora do Supabase)';
    return;
  end if;

  if not pg_temp.recusado('anon', 'select count(*) from experiencia.resposta') then
    raise exception 'A1: `anon` LE experiencia.resposta. A chave publica esta no pacote publicado, '
                    'entao isso e o dado da casa aberto na internet.';
  end if;

  if not pg_temp.recusado('anon', 'select count(*) from experiencia.cliente') then
    raise exception 'A2: `anon` LE experiencia.cliente, que e a tabela de dado pessoal.';
  end if;

  if not pg_temp.recusado('anon', 'select count(*) from experiencia.vw_hoje') then
    raise exception 'A3: `anon` LE uma view do painel.';
  end if;

  raise notice 'ok  A: `anon` nao le resposta, nem cliente, nem view';
end
$$;


-- =============================================================================
-- BLOCO B. `experiencia_leitura` le tudo e nao escreve nada.
--
-- E o papel do painel. Ler tudo e o trabalho dele; escrever qualquer coisa seria escrita a partir
-- de uma credencial que vive no navegador.
-- =============================================================================
do $$
declare v_n bigint;
begin
  if not pg_temp.permitido('experiencia_leitura', 'select count(*) from experiencia.resposta') then
    raise exception 'B1: `experiencia_leitura` NAO le experiencia.resposta, e o painel inteiro '
                    'depende disso. Foi exatamente o sintoma do NOINHERIT de `authenticated`.';
  end if;

  if not pg_temp.permitido('experiencia_leitura', 'select count(*) from experiencia.vw_hoje') then
    raise exception 'B2: `experiencia_leitura` NAO le vw_hoje.';
  end if;

  -- E as escritas, uma por verbo. `update` de nota e o caso do documento.
  if not pg_temp.recusado('experiencia_leitura', 'update experiencia.resposta set nota = 10') then
    raise exception 'B3: `experiencia_leitura` ESCREVE em resposta. Resposta nasce completa e nunca '
                    'se edita: corrigir uma resposta e coletar outra.';
  end if;

  if not pg_temp.recusado('experiencia_leitura',
      'insert into experiencia.garcom (nome, pin) values (''teste'', ''0000'')') then
    raise exception 'B4: `experiencia_leitura` INSERE em garcom.';
  end if;

  if not pg_temp.recusado('experiencia_leitura', 'delete from experiencia.resposta') then
    raise exception 'B5: `experiencia_leitura` APAGA resposta.';
  end if;

  raise notice 'ok  B: `experiencia_leitura` le resposta e view, e nao escreve por nenhum verbo';
end
$$;


-- =============================================================================
-- BLOCO C. `experiencia_app` escreve o que precisa, e SO isso.
--
-- E o papel do Worker. Ele grava resposta e le as tabelas de custo; ele nao pode ESCREVER no
-- sistema fiscal, e esse e o criterio de aceite de F55 — o unico que exige um papel de verdade
-- para ser conferido, porque `service_role` passa por cima de tudo e responderia "sim" a qualquer
-- pergunta.
-- =============================================================================
do $$
begin
  -- 1. LE as cinco tabelas de custo, que `vw_custo_prato` precisa por ser `security_invoker`.
  if not pg_temp.permitido('experiencia_app', 'select count(*) from public.pratos') then
    raise exception 'C1: `experiencia_app` nao LE public.pratos, e vw_custo_prato nao funciona '
                    'para a aplicacao.';
  end if;

  if not pg_temp.permitido('experiencia_app', 'select count(*) from public.insumos_master') then
    raise exception 'C2: `experiencia_app` nao LE public.insumos_master.';
  end if;

  -- 2. NAO escreve em nenhuma das cinco. O sistema fiscal e a fonte da verdade de outra pessoa.
  if not pg_temp.recusado('experiencia_app',
      'insert into public.pratos (nome, categoria) values (''x'', ''y'')') then
    raise exception 'C3: `experiencia_app` ESCREVE em public.pratos. O criterio de aceite de F55 e '
                    'exatamente que o sistema de experiencia LE o custo e nunca o altera.';
  end if;

  if not pg_temp.recusado('experiencia_app', 'delete from public.historico_precos') then
    raise exception 'C4: `experiencia_app` APAGA public.historico_precos, que e a serie de precos '
                    'reconstruida de 422 notas fiscais.';
  end if;

  -- 3. NAO le a resposta que ele mesmo gravou. E a assimetria declarada: a credencial que a
  -- internet alcanca escreve a coleta e nao a devolve.
  if not pg_temp.recusado('experiencia_app', 'select count(*) from experiencia.resposta') then
    raise exception 'C5: `experiencia_app` LE experiencia.resposta. A credencial de escrita da '
                    'coleta nao devolve a coleta: se ela vazar, ela nao e uma via de leitura.';
  end if;

  raise notice 'ok  C: `experiencia_app` le o custo, nao escreve no fiscal, e nao le resposta';
end
$$;


-- =============================================================================
-- BLOCO D. RLS esta LIGADO, e toda tabela tem politica.
--
-- RLS ligado sem politica nenhuma nega tudo, e RLS desligado com politica escrita nao nega nada.
-- Os dois erros sao silenciosos: o primeiro aparece como tela vazia, o segundo como nada.
-- =============================================================================
do $$
declare
  v_sem_rls      text[];
  v_sem_politica text[];
begin
  select coalesce(array_agg(c.relname order by c.relname), array[]::text[])
    into v_sem_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'experiencia' and c.relkind = 'r' and not c.relrowsecurity;

  if array_length(v_sem_rls, 1) > 0 then
    raise exception 'D1: tabelas sem RLS: %', array_to_string(v_sem_rls, ', ');
  end if;

  select coalesce(array_agg(c.relname order by c.relname), array[]::text[])
    into v_sem_politica
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'experiencia' and c.relkind = 'r'
    and not exists (select 1 from pg_policy p where p.polrelid = c.oid);

  if array_length(v_sem_politica, 1) > 0 then
    raise exception 'D2: tabelas com RLS e SEM politica (negam tudo, em silencio): %',
                    array_to_string(v_sem_politica, ', ');
  end if;

  raise notice 'ok  D: todas as tabelas de `experiencia` tem RLS ligado e ao menos uma politica';
end
$$;


-- =============================================================================
-- BLOCO E. As views nao contornam a matriz.
--
-- View comum roda com os privilegios de QUEM A CRIOU, e nao de quem a consulta. Uma view sobre
-- `resposta` criada pelo dono seria, para todos os efeitos, uma porta aberta que ignora tudo o que
-- os blocos acima provaram. `security_invoker = true` e o que fecha essa porta.
-- =============================================================================
do $$
declare
  v_frouxas text[];
begin
  select coalesce(array_agg(c.relname order by c.relname), array[]::text[])
    into v_frouxas
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'experiencia' and c.relkind = 'v'
    and coalesce((select option_value from pg_options_to_table(c.reloptions)
                  where option_name = 'security_invoker'), 'false') <> 'true';

  if array_length(v_frouxas, 1) > 0 then
    raise exception 'E1: views SEM `security_invoker`: %. Elas rodam com o privilegio de quem as '
                    'criou, e entregam a quem consulta um dado que a matriz nega.',
                    array_to_string(v_frouxas, ', ');
  end if;

  raise notice 'ok  E: todas as views sao `security_invoker`, e nao contornam a matriz';
end
$$;

do $$ begin raise notice ''; raise notice 'MATRIZ DE PERMISSOES CONFERIDA.'; end $$;

rollback;
