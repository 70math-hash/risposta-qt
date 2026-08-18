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
-- SEM transacao explicita, e a area de pouso e `temporary` SEM `on commit drop`.
--
-- A versao anterior deste arquivo tinha `begin`/`commit` explicitos, porque a area de pouso era
-- `temporary ... on commit drop` e em autocommit ela morria antes do `insert` seguinte.
--
-- O par funcionava, e tinha um efeito colateral que so aparece no runner do Supabase: ele ja
-- envolve o arquivo inteiro numa transacao, e o `commit` daqui FECHA a transacao dele. A partir
-- dali, a atomicidade do conjunto de migrations deixa de valer — se algo falhasse depois deste
-- arquivo, o que veio antes ficaria aplicado.
--
-- `temporary` sem `on commit drop` resolve os dois: a tabela vive ate o fim da SESSAO, o que cobre
-- o arquivo inteiro em autocommit e dentro de transacao, e nada aqui mexe no controle de transacao
-- de quem chamou. A tabela some quando a sessao termina, que e o que se queria.
--
-- Achado pela critica adversarial da Etapa 4 (A37).

-- 1. A area de pouso. Temporaria e `on commit drop`: o schema tem 26 tabelas e nao
-- ganha uma vigesima setima para guardar dado de passagem.
-- -----------------------------------------------------------------------------
create temporary table origem_cliques_avaliacao (
  id          bigint      primary key,
  garcom      text        not null,
  criado_em   timestamptz not null,
  user_agent  text        null,
  referrer    text        null
);

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
--
-- A JUNCAO POR NOME NAO E POR CHAVE UNICA, E ISSO TINHA DUAS CONSEQUENCIAS (A38)
--   `lower(btrim(nome))` nao tem indice unico, e nao pode ter: duas pessoas chamadas Joao
--   trabalhando na mesma casa e normal, e um `unique` ali recusaria o cadastro da segunda.
--
--   O `left join` simples multiplicava a linha da origem por quantos homonimos houvesse, e o
--   `on conflict (id_origem) do nothing` engolia a multiplicacao: a PRIMEIRA linha que chegasse
--   vencia, e as demais sumiam sem erro. O clique ficava atribuido a um Joao ARBITRARIO — o que a
--   ordem fisica do plano de execucao decidisse naquele dia — e a conferencia de 74 do passo 4
--   continuava passando, porque o total nao muda.
--
--   Atribuicao arbitraria e pior que atribuicao ausente. Nula, a tela de administracao mostra o
--   texto cru e um humano resolve. Arbitraria, ela parece resolvida, entra em contagem por garcom,
--   e ninguem tem motivo para conferir.
--
-- O QUE PASSA A ACONTECER
--   `lateral` com `limit 1`, entao a origem nunca multiplica. E a resolucao so acontece quando o
--   nome identifica UMA pessoa: com homonimo, `garcom_id` fica NULO de proposito, e o passo 4
--   conta e nomeia esses casos. O texto cru continua em `convite_clique.garcom` nos dois casos,
--   entao nada se perde — o que muda e o sistema parar de afirmar o que nao sabe.
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
left join lateral (
  select gg.id
  from experiencia.garcom gg
  where lower(btrim(gg.nome)) = lower(btrim(o.garcom))
    -- Homonimo: nenhuma escolha aqui e defensavel, entao nao se escolhe. Fica nulo, e o passo 4
    -- avisa com os nomes.
    and (select count(*) from experiencia.garcom h
         where lower(btrim(h.nome)) = lower(btrim(o.garcom))) = 1
  limit 1
) g on true
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
  v_nome     text;
  v_quantos  integer;
  v_ambiguos integer := 0;
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

  -- A38: os nomes que aparecem em mais de um cadastro. Sao a razao de algumas linhas ficarem sem
  -- garcom resolvido, e sem esta lista o numero acima seria um enigma. Nao derruba a migration:
  -- homonimo e fato da casa, e o clique de um Joao entre dois Joaos e ambiguidade da ORIGEM, que
  -- nenhuma consulta desfaz. O que se pode fazer e dizer quais sao, para o proprietario resolver na
  -- tela de administracao com o que ele sabe e o banco nao.
  for v_nome, v_quantos in
    select lower(btrim(g.nome)), count(*)
    from experiencia.garcom g
    where exists (select 1 from experiencia.convite_clique c
                  where lower(btrim(c.garcom)) = lower(btrim(g.nome)))
    group by 1
    having count(*) > 1
    order by 1
  loop
    v_ambiguos := v_ambiguos + 1;
    raise notice 'AMBIGUO: `%` tem % cadastros de garcom, e os cliques com esse nome ficaram SEM '
                 'atribuicao de proposito. Escolher um seria arbitrario, e arbitrario num painel '
                 'por garcom nao parece erro.', v_nome, v_quantos;
  end loop;

  if v_ambiguos > 0 then
    raise notice '% nome(s) ambiguo(s). Resolver em /painel/admin, onde o texto cru de cada clique '
                 'continua visivel.', v_ambiguos;
  end if;

  raise notice 'Proximo passo: conferir estes numeros contra a origem em qt-avaliacoes ANTES de pausar o projeto.';
end
$$;

-- A area de pouso e descartada ao fim da SESSAO. `drop` explicito aqui para o arquivo poder ser
-- reaplicado na mesma sessao de `psql` sem esbarrar na tabela da passada anterior.
drop table if exists origem_cliques_avaliacao;
