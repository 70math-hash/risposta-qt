-- =============================================================================
-- 20260817097000_cria_tabela_convite_clique.sql
--
-- O QUE FAZ
--   Cria `convite_clique`, a vigesima sexta e ultima tabela do schema (Bloco G da
--   folha canonica, historico migrado). Cria so a ESTRUTURA. As 74 linhas entram na
--   ultima migration, `20260817103000_semeia_convite_clique.sql`, depois do dump.
--
-- O QUE ASSUME
--   1. `criado_em` aqui e o carimbo PRESERVADO da origem, e nao o instante em que o
--      servidor gravou a linha. E a unica excecao no schema ao significado de
--      `criado_em` fixado na secao 3.2, e ela e ordenada pela propria folha canonica,
--      que manda preservar `criado_em` das 74 linhas (secao 2.2, Bloco G). Quem guarda
--      o instante da migracao e `migrado_em`.
--   2. `id_origem` guarda o `id bigint` do projeto `qt-avaliacoes`. Ele existe para uma
--      coisa so, e ela e obrigatoria: conferir 74 na origem contra 74 no destino, linha
--      a linha, antes de pausar o projeto de origem (condicao 4 de D2).
--   3. `user_agent` e `referrer` sao preservados APENAS nestas linhas historicas. Nao
--      existe coluna de `user_agent` em `resposta`: no tablet proprio ela nao informa
--      nada e e superficie de dado sem uso (02-replicar, secao 4.1).
--   4. Estas 74 linhas medem CLIQUE EM CONVITE, nao resposta de pesquisa. Elas nunca
--      se somam as respostas, e o painel de coleta as mostra em serie separada,
--      rotulada `convite`. A conversao do gesto reaproveitado e DESCONHECIDA (D6).
--
-- COMO SE DESFAZ
--   drop table if exists experiencia.convite_clique;
--   So e seguro enquanto `qt-avaliacoes` (`helinoirdizwrluydkzp`, `us-east-1`) nao
--   estiver pausado. Depois disso, esta tabela e a unica copia do dado.
-- =============================================================================

create table if not exists experiencia.convite_clique (
  id          uuid        primary key default gen_random_uuid(),
  id_origem   bigint      not null,
  garcom      text        not null,
  garcom_id   uuid        null references experiencia.garcom (id),
  criado_em   timestamptz not null,
  user_agent  text        null,
  referrer    text        null,
  migrado_em  timestamptz not null default now(),
  -- A conferencia de integridade depende de o id da origem ser unico aqui. Sem isto,
  -- reaplicar a migracao dobraria as 74 linhas e ninguem notaria.
  constraint convite_clique_id_origem_uq unique (id_origem)
  -- NAO existe CHECK de `garcom` nao vazio nesta tabela, e a ausencia e deliberada.
  --
  -- Havia um, `check (btrim(garcom) <> '')`, copiado das tabelas que a aplicacao escreve. Nelas
  -- ele esta certo: cadeia vazia apareceria em toda exportacao como se fosse um valor digitado.
  -- Aqui ele estava errado, e a diferenca so apareceu quando o caminho FELIZ da migration foi
  -- executado de verdade, com dado que tem a forma do dado da origem.
  --
  -- `public.cliques_avaliacao.garcom` e texto livre de um formulario que nao exigia
  -- preenchimento. Linha com `garcom` em branco e um FATO da origem, e a folha canonica manda
  -- preservar esse campo "cru, nao normalizado". Com o CHECK, uma unica linha em branco entre as
  -- 74 derruba a migration inteira — e essa migration e o unico caminho para a unica copia desse
  -- historico, porque `qt-avaliacoes` e pausado depois dela.
  --
  -- As tres saidas possiveis eram: descartar a linha (perde historico), trocar o vazio por um
  -- marcador tipo `(sem garcom)` (inventa dado que a origem nao tem), ou aceitar o vazio como o
  -- valor que ele e. As duas primeiras sao interpretar durante a migracao, que e exatamente o
  -- que o script de exportacao tem escrito que nao faz.
  --
  -- O que protege a leitura no lugar do CHECK: `garcom_id` fica nulo nessas linhas, porque nome
  -- em branco nao casa com garcom nenhum, e a conferencia no fim da migration de semente imprime
  -- quantas linhas ficaram sem garcom resolvido.
);

comment on table experiencia.convite_clique is
  'As 74 linhas de public.cliques_avaliacao do projeto qt-avaliacoes (N40), unico dado '
  'historico a migrar. Um clique em convite, do historico. Nao tem nota, nao tem '
  'comentario, nao tem mesa e nao tem comanda: nao e pesquisa de satisfacao.';
comment on column experiencia.convite_clique.criado_em is
  'PRESERVADO da origem, e nao `now()`. Excecao ordenada pela folha canonica.';
comment on column experiencia.convite_clique.garcom is
  'O texto livre da origem, cru, nao normalizado. Fica como esta porque nao normaliza e '
  'nao sobrevive a homonimo. A identidade e `garcom_id`.';

-- Indice: a serie de cliques por dia, que e a linha de base de volume de convite
-- aceito, mostrada separada da nova em /painel/coleta.
create index if not exists convite_clique_criado_em_idx on experiencia.convite_clique (criado_em);
-- Indice: distribuicao por garcom, que e a outra metade da leitura de linha de base.
create index if not exists convite_clique_garcom_idx
  on experiencia.convite_clique (garcom_id) where garcom_id is not null;

-- Sem DELETE e sem UPDATE: historico migrado nao se edita. O unico UPDATE previsto
-- seria preencher `garcom_id` depois, e ele acontece dentro da propria migration de
-- semente, que roda como `postgres` e nao como `experiencia_app`.
grant select, insert on experiencia.convite_clique to experiencia_app;
grant select         on experiencia.convite_clique to experiencia_leitura;
