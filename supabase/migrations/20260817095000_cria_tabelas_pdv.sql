-- =============================================================================
-- 20260817095000_cria_tabelas_pdv.sql
--
-- O QUE FAZ
--   Cria as duas tabelas do Bloco E da folha canonica: `execucao_importacao` e
--   `venda_produto_dia`, com a idempotencia por dia e a coluna de bytes que guarda o
--   arquivo bruto do R3.
--
--   `execucao_importacao` vem primeiro dentro do arquivo porque cada linha de venda
--   aponta para a execucao que a trouxe.
--
-- O QUE ASSUME
--   1. O arquivo bruto fica na propria linha de `execucao_importacao`, em coluna
--      `bytea`, e NAO em bucket de Storage (ADR-12). O tamanho esperado de um R3 e de
--      dezenas de KB, e o numero real e NAO VERIFICADO. Nao existe poda desses bytes
--      no MVP, e eles contam nos 500 MB do plano gratuito (N21).
--   2. `dia_operacional` aqui vem da DATA QUE O R3 INFORMA, sem deslocamento, porque o
--      corte do dia dentro do Altec e NAO VERIFICADO (secao 4.8 da folha canonica,
--      pergunta 4 do bloqueio A1). Se o Altec fechar o dia a meia-noite, uma venda de
--      00h30 cai no dia seguinte no R3 e a resposta da mesma mesa cai no dia anterior
--      na pesquisa. A divergencia possivel fica escrita aqui e na tela.
--   3. Reimportar um dia SUBSTITUI o dia por inteiro (F40). E por isso, e so por isso,
--      que `venda_produto_dia` e uma das duas tabelas com DELETE concedido.
--   4. A juncao com o PDV e por `dia_operacional`, e por nada mais. Comanda, mesa e
--      hora sao DESCONHECIDO no R3 e nada pode esperar por isso (secao 9.3).
--
-- COMO SE DESFAZ
--   drop table if exists experiencia.venda_produto_dia, experiencia.execucao_importacao;
--   Perde o arquivo bruto de todas as importacoes, que e o que permite reprocessar um
--   dia depois de corrigir o parser. Reimportavel se os arquivos ainda estiverem no
--   Drive.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- execucao_importacao (F39, F40, ADR-12). Uma execucao de importacao de arquivo.
-- Nome revogado: `import_execucao` (secao 9.2).
-- -----------------------------------------------------------------------------
create table if not exists experiencia.execucao_importacao (
  id             uuid        primary key default gen_random_uuid(),
  origem         text        not null,
  arquivo        text        not null,
  hash           text        not null,
  arquivo_bruto  bytea       not null,
  linhas         integer     null,
  dias_lidos     date[]      null,
  iniciado_em    timestamptz not null default now(),
  terminado_em   timestamptz null,
  status         text        not null,
  erro           text        null,
  importado_por  text        null,
  criado_em      timestamptz not null default now(),
  constraint execucao_importacao_origem_dominio check (origem in ('watcher_drive','painel')),
  constraint execucao_importacao_status_dominio check (status in ('sucesso','erro')),
  -- Status `erro` sem mensagem e um log que nao serve para nada. Nunca so um booleano.
  constraint execucao_importacao_erro_tem_mensagem
    check (status <> 'erro' or (erro is not null and btrim(erro) <> '')),
  constraint execucao_importacao_arquivo_nao_vazio check (length(arquivo_bruto) > 0),
  constraint execucao_importacao_terminou_depois check (terminado_em is null or terminado_em >= iniciado_em)
);

comment on column experiencia.execucao_importacao.arquivo_bruto is
  'O arquivo exato que chegou, gravado ANTES de ser interpretado. Sem ele, mudanca de '
  'layout do R3 e erro sem prova e reprocessamento impossivel (ADR-12).';
comment on column experiencia.execucao_importacao.hash is
  'Serve a deteccao de reimportacao, e NAO e unico de proposito: reimportar o mesmo '
  'arquivo pelo painel e um caminho legitimo de conserto (F40), e UNIQUE aqui '
  'transformaria conserto em erro.';
comment on column experiencia.execucao_importacao.importado_por is
  'Quem importou, quando a origem e `painel` (F40). Texto e nao chave estrangeira para '
  'auth.users: o schema experiencia nao cria dependencia estrutural em schema de '
  'terceiro, pelo mesmo motivo de item_cardapio.prato_id.';

-- Indice: as ultimas execucoes em /painel/saude, e a cobranca de arquivo ausente por
-- 2 dias operacionais (N43).
create index if not exists execucao_importacao_iniciado_idx
  on experiencia.execucao_importacao (iniciado_em desc);
create index if not exists execucao_importacao_hash_idx on experiencia.execucao_importacao (hash);

-- -----------------------------------------------------------------------------
-- venda_produto_dia (F39, F41). Um produto em um dia operacional.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.venda_produto_dia (
  id                      uuid        primary key default gen_random_uuid(),
  dia_operacional         date        not null,
  produto_id_pdv          text        null,
  produto_nome_norm       text        not null,
  grupo                   text        null,
  unidades                numeric     not null,
  valor_liquido           numeric     not null,
  item_cardapio_id        uuid        null references experiencia.item_cardapio (id),
  execucao_importacao_id  uuid        not null references experiencia.execucao_importacao (id),
  importado_em            timestamptz not null default now(),
  criado_em               timestamptz not null default now(),
  constraint venda_produto_dia_norm_maiusculo
    check (produto_nome_norm = upper(produto_nome_norm) and btrim(produto_nome_norm) <> ''),
  constraint venda_produto_dia_unidades_nao_negativa check (unidades >= 0),
  -- Valor liquido negativo existe: estorno e cancelamento aparecem no R3. Nao se
  -- rejeita, mas fica dito para ninguem "consertar" isso depois.
  constraint venda_produto_dia_uq unique (dia_operacional, produto_nome_norm)
);

comment on table experiencia.venda_produto_dia is
  'A idempotencia e o UNIQUE (dia_operacional, produto_nome_norm): reimportar o mesmo '
  'arquivo 5 vezes nao duplica linha nenhuma e o faturamento do dia nao muda (F39). '
  'O par usa `produto_nome_norm` e nao `produto_id_pdv` porque o segundo pode vir nulo, '
  'e chave que aceita nulo nao trava duplicata.';
comment on column experiencia.venda_produto_dia.grupo is
  'Categoria do proprio R3, texto livre, e NAO o dominio fechado de item_cardapio. '
  'O R3 vende bebida, couvert e taxa, que nao sao pizza, entrada nem sobremesa.';
comment on column experiencia.venda_produto_dia.item_cardapio_id is
  'Resolvido por produto_id_pdv, e por produto_nome_norm como reserva. Fica nulo quando '
  'o produto vendido nao existe em item_cardapio, e essa lista vira linha no e-mail das '
  '16h, que e como o cardapio se cobra sozinho (F42).';

-- Indice: faturamento e ticket medio por dia (vw_venda_dia, vw_satisfacao_venda_dia).
create index if not exists venda_produto_dia_dia_idx on experiencia.venda_produto_dia (dia_operacional);
-- Indice: unidades vendidas por item no trimestre, que e a segunda metade de N33.
create index if not exists venda_produto_dia_item_idx
  on experiencia.venda_produto_dia (item_cardapio_id, dia_operacional)
  where item_cardapio_id is not null;
-- Indice: a resolucao pela chave preferida, na hora do import.
create index if not exists venda_produto_dia_produto_idx
  on experiencia.venda_produto_dia (produto_id_pdv) where produto_id_pdv is not null;
create index if not exists venda_produto_dia_execucao_idx
  on experiencia.venda_produto_dia (execucao_importacao_id);

-- -----------------------------------------------------------------------------
-- Grants. `venda_produto_dia` e uma das DUAS tabelas do schema com DELETE, porque
-- reimportar um dia substitui o dia por inteiro. A outra e `classificacao_texto`.
-- `execucao_importacao` nao recebe DELETE: e o log, e log que se apaga nao e log.
-- -----------------------------------------------------------------------------
grant select, insert, update          on experiencia.execucao_importacao to experiencia_app;
grant select, insert, update, delete  on experiencia.venda_produto_dia   to experiencia_app;

grant select on experiencia.execucao_importacao, experiencia.venda_produto_dia
to experiencia_leitura;
