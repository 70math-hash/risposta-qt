-- =============================================================================
-- 20260817103000_semeia_convite_clique.sql
--
-- O QUE FAZ
--   Migra as 74 linhas de `public.cliques_avaliacao` do projeto `qt-avaliacoes`
--   (`helinoirdizwrluydkzp`, `us-east-1`) para `experiencia.convite_clique`, cria a
--   semente da tabela `garcom` a partir dos valores distintos de `garcom`, liga uma
--   coisa na outra e CONFERE que chegaram 74. E a ultima migration do conjunto, de
--   proposito: e a unica que move dado, e ela roda depois de estrutura, funcoes, views
--   e RLS estarem no lugar.
--
--   MAPEAMENTO CAMPO A CAMPO
--   ------------------------------------------------------------------------------
--   origem: public.cliques_avaliacao   ->  destino: experiencia.convite_clique
--   ------------------------------------------------------------------------------
--   id          bigint identity        ->  id_origem   bigint  (preservado, UNIQUE)
--                                      ->  id          uuid    (novo, gen_random_uuid)
--   garcom      text (texto livre)     ->  garcom      text    (cru, nao normalizado)
--                                      ->  garcom_id   uuid    (resolvido, pode ser nulo)
--   criado_em   timestamptz            ->  criado_em   timestamptz (PRESERVADO)
--                                      ->  migrado_em  timestamptz (now(), novo)
--   user_agent  text nullable          ->  user_agent  text    (preservado)
--   referrer    text nullable          ->  referrer    text    (preservado)
--   ------------------------------------------------------------------------------
--   Nao existe coluna de nota, de comentario, de mesa nem de comanda na origem, entao
--   nao existe campo nenhum a mapear para `resposta`. Estas 74 linhas medem CLIQUE EM
--   CONVITE, e nao resposta de pesquisa, e nunca se somam as respostas (D6).
--
-- O QUE ASSUME
--   1. O `pg_dump` do projeto `NFe e Financeiro` ja foi feito e esta guardado fora do
--      Supabase (condicao 3 de D2). A migracao acontece DEPOIS do dump.
--   2. Os dois projetos estao em regioes diferentes e nao existe conexao entre eles:
--      nenhum `SELECT` deste arquivo alcanca `qt-avaliacoes`. As 74 linhas entram como
--      literais, embutidas no bloco marcado abaixo por
--      `scripts/exporta_cliques_avaliacao.mjs`, que le a origem por REST e escreve os
--      INSERT nesta tabela temporaria.
--   3. Aplicar este arquivo COMO ELE ESTA NO REPOSITORIO falha de proposito, com a
--      mensagem dizendo o que fazer. Isso e melhor que aplicar em silencio e deixar a
--      tabela vazia parecendo migrada.
--   4. Os PIN da semente de `garcom` sao PROVISORIOS e as linhas nascem com
--      `ativo = false`. Nao ha como inventar o PIN real de ninguem, e garcom inativo com
--      PIN nao numerico nunca casa com digitacao na T0, entao nenhuma resposta nova sera
--      atribuida por acidente. O proprietario edita nome, PIN e `ativo` na tela de
--      administracao, e so entao a atribuicao passa a valer (F49).
--   5. `qt-avaliacoes` so e pausado DEPOIS de conferida a integridade das 74 linhas
--      (condicao 4 de D2). A conferencia esta no fim deste arquivo e derruba a migration
--      se o numero nao for 74.
--
-- COMO SE DESFAZ
--   delete from experiencia.convite_clique;
--   delete from experiencia.garcom where pin like 'provisorio-%';
--   Seguro enquanto `qt-avaliacoes` estiver ativo, porque a origem continua existindo.
--   Depois de pausado o projeto de origem, esta tabela e a unica copia do dado, e o
--   desfazer passa a ser perda definitiva.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- -----------------------------------------------------------------------------
-- TRANSACAO EXPLICITA, e ela nao e enfeite.
--
-- A area de pouso abaixo e `temporary ... on commit drop`. Em autocommit, cada statement
-- e sua propria transacao, entao a tabela seria destruida imediatamente depois de criada e
-- o `insert` seguinte falharia com "relation does not exist". Descoberto rodando as
-- migrations num Postgres de ensaio: sem este `begin`, esta migration nunca funciona, nem
-- depois de o script de exportacao preencher as 74 linhas.
--
-- Com `begin`/`commit`, ela funciona tanto no runner do Supabase (que envolve o arquivo em
-- transacao) quanto em `psql` puro, e nao depende do comportamento do runner.
-- -----------------------------------------------------------------------------
begin;

-- 1. A area de pouso. Temporaria e `on commit drop`: o schema tem 26 tabelas e nao
-- ganha uma vigesima setima para guardar dado de passagem.
-- -----------------------------------------------------------------------------
create temporary table origem_cliques_avaliacao (
  id          bigint      primary key,
  garcom      text        not null,
  criado_em   timestamptz not null,
  user_agent  text        null,
  referrer    text        null
) on commit drop;

-- >>> INICIO DO BLOCO GERADO
--
-- `scripts/exporta_cliques_avaliacao.mjs` substitui esta linha por 74 comandos
-- `insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer)
--  values (...);`, um por linha da origem, com os valores literais.
--
-- O script le `public.cliques_avaliacao` do projeto qt-avaliacoes por REST, com chave de
-- leitura, e nao interpreta nada: ele transcreve. Interpretar na exportacao e como se
-- perde a unica copia de um historico.
--
-- >>> FIM DO BLOCO GERADO

-- -----------------------------------------------------------------------------
-- 2. A semente de `garcom`, a partir dos valores distintos do texto livre.
-- `ativo = false` e PIN provisorio. Ver "O QUE ASSUME", item 4.
-- -----------------------------------------------------------------------------
insert into experiencia.garcom (nome, pin, ativo)
select o.garcom,
       -- O deslocamento pela contagem ja existente e o que faz reaplicar nao colidir com
       -- um `provisorio-1` gravado na primeira passada.
       'provisorio-' || (
         (select count(*) from experiencia.garcom where pin like 'provisorio-%')
         + row_number() over (order by lower(btrim(o.garcom)))
       ),
       false
from (select distinct btrim(garcom) as garcom from origem_cliques_avaliacao) o
where btrim(o.garcom) <> ''
  and not exists (
    select 1 from experiencia.garcom g
    where lower(btrim(g.nome)) = lower(btrim(o.garcom))
  );

-- -----------------------------------------------------------------------------
-- 3. As 74 linhas, com `criado_em` preservado.
-- Idempotente pelo UNIQUE em `id_origem`: reaplicar nao dobra nada.
-- -----------------------------------------------------------------------------
insert into experiencia.convite_clique (
  id_origem, garcom, garcom_id, criado_em, user_agent, referrer)
select o.id,
       o.garcom,
       g.id,
       o.criado_em,
       o.user_agent,
       o.referrer
from origem_cliques_avaliacao o
left join experiencia.garcom g on lower(btrim(g.nome)) = lower(btrim(o.garcom))
on conflict (id_origem) do nothing;

-- -----------------------------------------------------------------------------
-- 4. A conferencia de integridade, que e a quarta condicao inegociavel de D2.
-- Contagem, e tambem o `criado_em` minimo e maximo, que e o que prova que nenhuma
-- linha foi truncada no meio da serie.
-- -----------------------------------------------------------------------------
do $$
declare
  v_origem   integer;
  v_destino  integer;
  v_sem_garcom integer;
  v_min      timestamptz;
  v_max      timestamptz;
begin
  select count(*) into v_origem  from origem_cliques_avaliacao;
  select count(*), min(criado_em), max(criado_em) into v_destino, v_min, v_max
  from experiencia.convite_clique;

  if v_origem = 0 then
    raise exception
      'As 74 linhas nao foram embutidas neste arquivo. Rode scripts/exporta_cliques_avaliacao.mjs '
      'para preencher o BLOCO GERADO antes de aplicar. Aplicar vazio deixaria convite_clique '
      'vazia com aparencia de migrada, e por isso esta migration falha de proposito.';
  end if;

  if v_origem <> 74 then
    raise exception
      'N40 diz 74 linhas em cliques_avaliacao, e o bloco gerado trouxe %. Ou a origem mudou '
      'depois de 13/08/2026, ou a exportacao truncou. Conferir antes de seguir.', v_origem;
  end if;

  if v_destino <> v_origem then
    raise exception 'origem tem % linhas e destino tem %. Nao pausar qt-avaliacoes', v_origem, v_destino;
  end if;

  select count(*) into v_sem_garcom from experiencia.convite_clique where garcom_id is null;

  raise notice 'convite_clique: % linhas migradas, de % a %. Linhas sem garcom resolvido: %.',
    v_destino, v_min, v_max, v_sem_garcom;
  raise notice 'Proximo passo: conferir estes numeros contra a origem em qt-avaliacoes ANTES de pausar o projeto.';
end
$$;

commit;
