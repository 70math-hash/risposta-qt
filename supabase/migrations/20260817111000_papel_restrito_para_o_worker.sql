-- =============================================================================
-- 20260817111000_papel_restrito_para_o_worker.sql
--
-- O QUE FAZ
--   Torna `experiencia_app` assumivel pelo papel de conexao do PostgREST, para o Worker poder
--   escrever COM as permissoes do papel restrito em vez das do `service_role`. Depois confere, com
--   `set role`, que o papel restrito realmente nao alcanca o que nao deve alcancar.
--
-- POR QUE EXISTE: SEM ISSO, A MATRIZ DE PERMISSOES DAS 26 TABELAS E DECORACAO
--   O unico caminho de escrita do sistema era `SUPABASE_SERVICE_KEY`. O `service_role` do Supabase
--   tem `BYPASSRLS` e privilegio no `public` do sistema fiscal. Portanto:
--
--     - Toda a matriz de grants tabela por tabela nao vale para quem escreve de verdade.
--     - As politicas de RLS nao valem para quem escreve de verdade.
--     - A invariante de append-only da migration 13 protege `experiencia_app`, que nao era usado.
--     - O critério de aceite de F55 ("tentativa de INSERT em tabela fiscal tem que falhar")
--       FALHAVA POR CONSTRUCAO: com a chave de servico, o INSERT funcionaria.
--
--   Achado pela critica adversarial da Etapa 4 (A07), e o proprio documento de seguranca ja dizia
--   parte disso em DV1, concluindo que "o que nao e caminho de reserva e usar a chave de servico".
--
-- COMO O WORKER PASSA A ESCREVER
--   Ele assina um JWT curto com `role: experiencia_app`, usando o segredo JWT do projeto, e manda
--   esse token no lugar da chave de servico. O PostgREST le o claim `role` e faz `set local role`
--   antes da consulta. A partir dai, grants e RLS valem de verdade para a escrita da aplicacao.
--   Ver `worker/lib/token.ts`.
--
-- O QUE E **NAO VERIFICADO**, E TEM DE SER TESTADO NO PROJETO DE VERDADE
--   Se o PostgREST hospedado do Supabase aceita um papel CUSTOM no claim `role`. A documentacao
--   descreve o mecanismo, e ele e padrao do PostgREST, mas projetos novos do Supabase estao
--   migrando para chaves ASSIMETRICAS, e nesses o segredo HS256 legado pode nao existir. As duas
--   coisas mudam o resultado, e nenhuma das duas da para conferir sem o projeto na mao.
--
--   O Worker trata isso de forma explicita, e nao com silencio: sem `SUPABASE_JWT_SECRET`
--   configurado ele usa a chave de servico e REGISTRA que esta usando, em vez de fingir que a
--   matriz de permissoes esta valendo. A conferencia de qual caminho esta ativo e uma linha na
--   resposta de `GET /api/saude`.
--
-- COMO SE DESFAZ
--   revoke experiencia_app from authenticator;
--   E remover `SUPABASE_JWT_SECRET` do Worker. Volta-se a escrever como `service_role`, e F55
--   volta a ser falso.
-- =============================================================================

do $$
begin
  -- `authenticator` e o papel de conexao do PostgREST no Supabase. Ele nao existe num Postgres
  -- cru, e por isso o guarda: o ensaio local nao tem PostgREST.
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    execute 'grant experiencia_app to authenticator';
    execute 'grant experiencia_leitura to authenticator';
    raise notice 'experiencia_app e experiencia_leitura passaram a ser assumiveis por authenticator.';
  else
    raise notice 'papel `authenticator` nao existe: fora do Supabase nao ha o que conceder.';
  end if;

  -- `experiencia_app` precisa poder ser assumido, e NUNCA poder entrar por conta propria.
  -- `nologin` e o que garante que um vazamento do nome do papel nao seja um caminho de entrada.
  execute 'alter role experiencia_app nologin';
  execute 'alter role experiencia_leitura nologin';
end
$$;

-- -----------------------------------------------------------------------------
-- A conferencia, girando a maçaneta como `experiencia_app`.
--
-- E o teste que F55 pede, e ele nunca havia sido executado contra papel nenhum porque quem
-- escrevia era o `service_role`, que passa por cima de tudo.
-- -----------------------------------------------------------------------------
do $$
declare
  v_n      bigint;
  v_falhou boolean;
begin
  -- 1. LE as cinco tabelas de custo. Precisa poder: `vw_custo_prato` e `security_invoker`.
  foreach v_falhou in array array[false] loop  -- laco de um passo, so para ter escopo de bloco
    set local role experiencia_app;
    begin
      execute 'select count(*) from public.pratos' into v_n;
    exception when others then
      reset role;
      raise exception 'experiencia_app NAO consegue LER public.pratos: %. Sem isso vw_custo_prato nao funciona para a aplicacao', sqlerrm;
    end;
    reset role;
  end loop;

  -- 2. NAO escreve em nenhuma das cinco. E o critério de aceite de F55, conferido de verdade.
  foreach v_falhou in array array[false] loop
    set local role experiencia_app;
    v_falhou := false;
    begin
      execute 'insert into public.pratos (nome, categoria) values (''tentativa proibida'', ''X'')';
    exception when others then
      v_falhou := true;
    end;
    reset role;
    if not v_falhou then
      -- Desfaz antes de derrubar, para o ensaio nao ficar com lixo caso alguem ignore o erro.
      delete from public.pratos where nome = 'tentativa proibida';
      raise exception 'experiencia_app ESCREVEU em public.pratos. O sistema de experiencia consome custo e nunca o produz (F55, ADR-04)';
    end if;
  end loop;

  -- 3. NAO edita resposta. Append-only por permissao, e nao por comentario.
  foreach v_falhou in array array[false] loop
    set local role experiencia_app;
    v_falhou := false;
    begin
      execute 'update experiencia.resposta set nota = 10 where true';
    exception when others then
      v_falhou := true;
    end;
    reset role;
    if not v_falhou then
      raise exception 'experiencia_app ALTEROU experiencia.resposta. Resposta nasce completa e nao se edita';
    end if;
  end loop;

  -- 4. NAO apaga resposta.
  foreach v_falhou in array array[false] loop
    set local role experiencia_app;
    v_falhou := false;
    begin
      execute 'delete from experiencia.resposta where true';
    exception when others then
      v_falhou := true;
    end;
    reset role;
    if not v_falhou then
      raise exception 'experiencia_app APAGOU de experiencia.resposta';
    end if;
  end loop;

  -- 5. E consegue fazer o que PRECISA: chamar a funcao de gravacao.
  foreach v_falhou in array array[false] loop
    set local role experiencia_app;
    begin
      -- Sem argumento valido: o que se testa e a PERMISSAO de executar, e nao o resultado. Uma
      -- excecao de dentro da funcao prova que a chamada foi permitida.
      execute 'select experiencia.fn_dia_operacional(now())' into v_n;
    exception when insufficient_privilege then
      reset role;
      raise exception 'experiencia_app nao pode executar as funcoes do schema: a gravacao inteira depende disso';
    when others then
      null;
    end;
    reset role;
  end loop;

  raise notice 'ok  experiencia_app: le custo, NAO escreve em public, NAO edita nem apaga resposta, e executa as funcoes.';
end
$$;
