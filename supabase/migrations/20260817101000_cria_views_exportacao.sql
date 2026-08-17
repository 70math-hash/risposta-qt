-- =============================================================================
-- 20260817101000_cria_views_exportacao.sql
--
-- O QUE FAZ
--   Cria as seis views da secao 6.3 da folha canonica: `vw_exportacao_resposta`,
--   `vw_exportacao_opcao`, `vw_exportacao_item`, `vw_exportacao_comentario`,
--   `vw_exportacao_cliente` e `vw_exportacao_venda`.
--
-- O QUE ASSUME
--   1. As seis tem grao de LINHA, e nao de agregado. A regra "toda linha agregada
--      exportada carrega o `n`" vale sem excecao para as views agregadas da secao 6.2,
--      que sao as que o painel exporta como resumo. Aqui, o `n` de uma linha e 1, e
--      inventar uma coluna `n = 1` seria ruido.
--   2. Nenhuma delas filtra `suspeita`: exportacao serve auditoria, e auditoria precisa
--      ver a linha marcada. A coluna `suspeita` vai no arquivo, com o motivo ao lado,
--      para quem le poder repetir o corte do painel.
--   3. Sem limite de janela de datas e sem paginacao obrigatoria: um ano inteiro em um
--      arquivo (F52). O limite, se aparecer, e do gerador de CSV, nunca da view.
--   4. `vw_exportacao_cliente` e dado pessoal saindo do sistema. Ela exige login de
--      administrador (RLS na migration seguinte) e o uso dela fica registrado.
--      ACHADO: F52 pede o registro em `execucao_rotina`, e o dominio de `rotina` tem
--      exatamente cinco valores, nenhum deles para exportacao. Ou entra um sexto valor
--      na folha canonica, ou o registro nao tem onde morar. Isso esta no documento de
--      modelo de dados como achado, e nao foi resolvido por invencao aqui.
--   5. O acento e o separador do CSV sao problema do gerador (UTF-8 com BOM e ponto e
--      virgula, para o Excel em portugues), e nao da view.
--
-- COMO SE DESFAZ
--   drop view if exists experiencia.vw_exportacao_resposta, ... (as seis).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- vw_exportacao_resposta. Respostas com nota, faixa, dia operacional, canal, garcom e
-- mesa. O garcom sai pelo NOME, e o PIN digitado sai cru ao lado, porque e ele que
-- explica uma atribuicao estranha.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_exportacao_resposta with (security_invoker = true) as
select r.id                    as resposta_id,
       r.dia_operacional,
       r.respondido_em,
       r.nota,
       r.faixa,
       r.canal,
       r.idioma,
       g.nome                  as garcom_nome,
       r.garcom_pin_digitado,
       r.garcom_reconhecido,
       m.numero                as mesa_numero,
       r.mesa_digitada,
       m.area                  as mesa_area,
       d.apelido               as dispositivo_apelido,
       r.suspeita,
       r.suspeita_motivo,
       r.versao_app,
       r.versao_questionario,
       r.criado_em,
       r.criado_em_cliente
from experiencia.resposta r
left join experiencia.garcom g      on g.id = r.garcom_id
left join experiencia.mesa m        on m.id = r.mesa_id
left join experiencia.dispositivo d on d.id = r.dispositivo_id;

-- -----------------------------------------------------------------------------
-- vw_exportacao_opcao. Opcoes marcadas, com dimensao e fator.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_exportacao_opcao with (security_invoker = true) as
select ro.resposta_id,
       r.dia_operacional,
       r.nota,
       r.faixa,
       ro.tela,
       ro.opcao_codigo,
       ro.dimensao,
       ro.fator,
       r.suspeita
from experiencia.resposta_opcao ro
join experiencia.resposta r on r.id = ro.resposta_id;

-- -----------------------------------------------------------------------------
-- vw_exportacao_item. Itens apontados, com fator.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_exportacao_item with (security_invoker = true) as
select ri.resposta_id,
       r.dia_operacional,
       r.nota,
       ri.grupo,
       ri.item_cardapio_id,
       i.nome_pt               as item_nome,
       i.produto_id_pdv,
       ri.fator,
       r.suspeita
from experiencia.resposta_item ri
join experiencia.resposta r on r.id = ri.resposta_id
left join experiencia.item_cardapio i on i.id = ri.item_cardapio_id;

-- -----------------------------------------------------------------------------
-- vw_exportacao_comentario. Texto cru com a classificacao ao lado.
-- LEFT JOIN de proposito: comentario nao classificado aparece com as colunas de
-- classificacao nulas, e nunca desaparece do arquivo (F36).
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_exportacao_comentario with (security_invoker = true) as
select rt.resposta_id,
       r.dia_operacional,
       r.nota,
       r.faixa,
       r.idioma,
       rt.texto_cru,
       rt.mascarado_em,
       ct.frase_ordem,
       ct.frase,
       ct.dimensao,
       ct.fator,
       ct.polaridade,
       ct.severidade,
       ct.nomeia_pessoa,
       ct.modelo,
       ct.versao_prompt,
       ct.classificado_em,
       r.suspeita
from experiencia.resposta_texto rt
join experiencia.resposta r on r.id = rt.resposta_id
left join experiencia.classificacao_texto ct on ct.resposta_id = rt.resposta_id;

comment on view experiencia.vw_exportacao_comentario is
  'Uma linha por frase classificada, e uma linha com classificacao nula quando o '
  'comentario ainda nao foi classificado. O idioma vem por juncao com resposta, porque '
  'resposta_texto nao tem coluna de idioma (secao 3.1 da folha canonica).';

-- -----------------------------------------------------------------------------
-- vw_exportacao_cliente. Base de clientes. Dado pessoal saindo do sistema.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_exportacao_cliente with (security_invoker = true) as
select c.id                as cliente_id,
       c.nome,
       c.email,
       c.whatsapp,
       c.nascimento,
       c.origem,
       c.criado_em,
       c.ultima_visita_em,
       c.anonimizado_em,
       (c.anonimizado_em is not null) as anonimizado,
       count(cs.id) filter (where cs.finalidade = 'pesquisa')::int as consentimentos_pesquisa,
       count(cs.id) filter (where cs.finalidade = 'contato')::int  as consentimentos_contato,
       min(cs.aceito_em)    as primeiro_aceite_em,
       max(cs.aceito_em)    as ultimo_aceite_em,
       max(cs.versao_texto) as versao_texto_mais_recente
from experiencia.cliente c
left join experiencia.consentimento cs on cs.cliente_id = c.id
group by c.id, c.nome, c.email, c.whatsapp, c.nascimento, c.origem,
         c.criado_em, c.ultima_visita_em, c.anonimizado_em;

comment on view experiencia.vw_exportacao_cliente is
  'Exige login de administrador. Cliente anonimizado aparece com as colunas pessoais '
  'nulas e `anonimizado = true`, e nao desaparece: a linha e a prova de que a retencao '
  'rodou. As contagens de consentimento estao aqui porque sem elas o arquivo exportado '
  'nao carrega a base legal do dado que ele leva.';

-- -----------------------------------------------------------------------------
-- vw_exportacao_venda. Venda por produto e dia operacional.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_exportacao_venda with (security_invoker = true) as
select v.dia_operacional,
       v.produto_id_pdv,
       v.produto_nome_norm,
       v.grupo,
       v.unidades,
       v.valor_liquido,
       v.item_cardapio_id,
       i.nome_pt        as item_nome,
       i.grupo          as item_grupo,
       v.importado_em,
       e.arquivo        as arquivo_origem,
       e.origem         as importacao_origem
from experiencia.venda_produto_dia v
left join experiencia.item_cardapio i on i.id = v.item_cardapio_id
join experiencia.execucao_importacao e on e.id = v.execucao_importacao_id;

-- -----------------------------------------------------------------------------
-- Grants. As seis vao SO para `experiencia_leitura`, que e o papel do painel.
--
-- `experiencia_app` nao recebe nenhuma delas, e nao por seguranca: e porque ele nao
-- precisa. O digest le as views agregadas da secao 6.2, que ja carregam o `n`, e nunca
-- linha crua. Menos uma permissao concedida e menos uma superficie para explicar.
--
-- Onde a garantia de F58 ("o PWA nao le a base de clientes") mora de verdade: nao e
-- neste grant. `experiencia_app` e o mesmo papel do Worker de escrita e do Worker de
-- rotina, e `cron_retencao` precisa de UPDATE em `cliente`. A separacao real e de
-- ENDPOINT: o tablet nunca fala com o Supabase, so com o Worker, e o Worker nao expoe
-- nenhuma rota que devolva cliente (01-arquitetura, fronteira de rede 2). Isso e
-- limitacao declarada, e nao uma garantia que este arquivo entrega.
-- -----------------------------------------------------------------------------
grant select on
  experiencia.vw_exportacao_resposta, experiencia.vw_exportacao_opcao,
  experiencia.vw_exportacao_item, experiencia.vw_exportacao_comentario,
  experiencia.vw_exportacao_cliente, experiencia.vw_exportacao_venda
to experiencia_leitura;
