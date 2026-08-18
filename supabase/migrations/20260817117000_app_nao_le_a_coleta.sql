-- =============================================================================
-- A credencial de escrita da coleta deixa de LER a coleta.
--
-- O QUE `03-seguranca-e-lgpd.md` PROMETE, E O QUE O BANCO FAZIA
--   A secao 3.3, no bloco de `resposta`, diz que quem NAO passa inclui:
--
--     "`experiencia_app` (**sem `GRANT` nenhum**, e e o ponto: a credencial que a internet
--      alcanca nao le nem a propria resposta que acabou de gravar)"
--
--   O banco discordava. `20260817093000` concede `select, insert` em `resposta`,
--   `resposta_opcao`, `resposta_item`, `resposta_pergunta_sorteada`, `tela_evento` e `tentativa`,
--   e `select, insert, update` em `resposta_texto`. Ou seja: a propriedade estava escrita como
--   fato, e nunca existiu.
--
--   Isso foi achado por `sql/teste_rls.sql` na primeira vez que ele rodou. Nenhuma leitura pegaria:
--   o documento estava coerente consigo mesmo, e o SQL tambem. So girar a maçaneta pega.
--
-- POR QUE A PROMESSA E MELHOR QUE O QUE EXISTIA, E POR QUE ELA CABE
--   `experiencia_app` e o papel que o Worker assume, e o Worker e a unica peca que a internet
--   alcanca com poder de escrita. Se essa credencial vazar, a diferenca entre "escreve coleta" e
--   "escreve E LE toda a coleta" e a diferenca entre um estrago que se apaga e um vazamento de
--   toda a serie historica da casa, incluindo os textos livres.
--
--   E ela cabe porque NADA precisa desses privilegios:
--
--     - a resposta e a tentativa entram por `fn_grava_resposta`, que e `security definer` e roda
--       com o privilegio do DONO, e nao do chamador;
--     - o mascaramento de `resposta_texto` acontece dentro de `fn_aplica_retencao`, tambem
--       `security definer`;
--     - o painel le por `experiencia_leitura`, que continua com `select` em tudo;
--     - o classificador le `vw_texto_a_classificar` e escreve `classificacao_texto`, e nenhuma
--       das duas esta nesta lista.
--
--   Conferido varrendo o Worker: as unicas tabelas que ele toca por REST sao `venda_produto_dia`,
--   `execucao_importacao`, `classificacao_texto`, `exclusao_pedido`, `alerta_detrator` e
--   `exportacao_registro`. Nenhuma tabela de coleta aparece.
--
-- O QUE ISTO **NAO** FAZ
--   Nao muda nada do caminho da resposta. Se mudasse, os 36 casos de `tests/worker-integracao.test.ts`
--   quebrariam — eles gravam resposta de verdade, por HTTP, contra Postgres de verdade.
--
-- COMO SE DESFAZ
--   grant select, insert on experiencia.resposta, experiencia.resposta_opcao,
--     experiencia.resposta_item, experiencia.resposta_pergunta_sorteada,
--     experiencia.tela_evento, experiencia.tentativa to experiencia_app;
--   grant select, insert, update on experiencia.resposta_texto to experiencia_app;
--   E reaplicar 20260817102000, para as politicas voltarem.
-- =============================================================================

revoke select, insert, update, delete on
  experiencia.resposta,
  experiencia.resposta_opcao,
  experiencia.resposta_item,
  experiencia.resposta_pergunta_sorteada,
  experiencia.resposta_texto,
  experiencia.tela_evento,
  experiencia.tentativa
from experiencia_app;

-- As politicas de `experiencia_app` nessas tabelas ficam sem uso assim que o grant sai — sem
-- privilegio, politica nao concede nada. Sao removidas mesmo assim: politica que nao pode valer e
-- uma afirmacao falsa no catalogo, e quem inspecionar `pg_policy` para entender a matriz vai ler
-- que a aplicacao tem um caminho de leitura que ela nao tem.
--
-- `leitura_painel` NAO e removida, e e ela que mantem a invariante de "toda tabela com politica".
do $$
declare t text;
begin
  foreach t in array array['resposta','resposta_opcao','resposta_item',
                           'resposta_pergunta_sorteada','resposta_texto','tela_evento','tentativa'] loop
    execute format('drop policy if exists app_select on experiencia.%I', t);
    execute format('drop policy if exists app_insert on experiencia.%I', t);
    execute format('drop policy if exists app_update on experiencia.%I', t);
    execute format('drop policy if exists app_delete on experiencia.%I', t);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- A conferencia, girando a maçaneta.
--
-- Dois lados, e os dois importam. Sem o segundo, revogar privilegio "passaria" por ter quebrado a
-- gravacao — que e a forma mais facil de tornar um sistema seguro e inutil.
-- -----------------------------------------------------------------------------
do $$
declare
  v_n      bigint;
  v_negou  boolean;
begin
  -- 1. `experiencia_app` NAO le mais a coleta.
  set local role experiencia_app;
  begin
    execute 'select count(*) from experiencia.resposta' into v_n;
    v_negou := false;
  exception when insufficient_privilege then
    v_negou := true;
  end;
  reset role;

  if not v_negou then
    raise exception 'experiencia_app continua LENDO experiencia.resposta depois do revoke.';
  end if;

  -- 2. E o dono continua lendo, o que prova que a tabela nao ficou inacessivel para todo mundo.
  execute 'select count(*) from experiencia.resposta' into v_n;

  -- 3. E a invariante das politicas continua valendo: nenhuma tabela ficou sem nenhuma.
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'experiencia' and c.relkind = 'r'
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
  ) then
    raise exception 'alguma tabela ficou sem politica nenhuma, e RLS ligado sem politica nega tudo '
                    'em silencio.';
  end if;

  raise notice 'ok  experiencia_app nao le mais a coleta, e toda tabela continua com politica.';
end
$$;
