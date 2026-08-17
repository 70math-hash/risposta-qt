-- =============================================================================
-- 20260817100000_cria_view_custo_prato.sql
--
-- O QUE FAZ
--   Cria `vw_custo_prato`, a unica view do schema que le fora dele. Resolve a lista de
--   materiais com `WITH RECURSIVE`, porque insumo de tipo `producao_interna` tem lista
--   propria e soma plana de `prato_ingredientes` da numero errado (expressao proibida,
--   secao 9.3 da folha canonica). Resolve o preco vigente numa data de referencia por
--   `historico_precos.data`, com `insumos_master.preco_unitario_fixo` como reserva, e
--   aplica o fator de rendimento.
--
-- O QUE ASSUME, e este bloco e o mais importante do arquivo
--   A semantica de `rn`, `rendimento` e `rn_override` e a precedencia entre eles e
--   **NAO VERIFICADO** (N46, pendencia do proprietario). O que segue e PREMISSA
--   DECLARADA, nunca fato:
--
--   P1. `insumos_master.rn` e fator de rendimento no intervalo (0,1]: a quantidade
--       liquida comprada e `quantidade / rn`. Dividir e nao multiplicar e a premissa.
--   P2. `rn_override` da linha, quando nao nulo, SUBSTITUI o `rn` do insumo. Esta
--       metade nao e premissa: esta escrita em docs/pesquisa/dados/12-schema-custo-
--       inspecao.md, que e fato verificado do ambiente e vence texto.
--   P3. `insumos_master.rendimento`, para insumo de tipo `producao_interna`, e o
--       RENDIMENTO DO LOTE na unidade padrao do insumo. Logo, as quantidades da
--       sub-receita sao divididas por ele para virar custo por unidade da sub-receita.
--
--   O QUE MUDA SE A PREMISSA ESTIVER ERRADA:
--     - Se `rn` for multiplicador em vez de divisor, o custo sai errado por um fator de
--       1/rn^2 em relacao ao verdadeiro, e o erro COMPOE a cada nivel. Com rn = 0,8 o
--       custo de um nivel sai cerca de 56% acima do real.
--     - Se `rendimento` for a mesma coisa que `rn`, a sub-receita e dividida duas vezes
--       e o custo da pizza DESABA para perto de zero, que e o pior caso possivel:
--       margem excelente, aparencia de numero certo, decisao de cardapio errada.
--     - Se a precedencia for a inversa (o `rn` do insumo vencendo o `rn_override` da
--       linha), so as linhas com override mudam, e a diferenca e silenciosa.
--   Por isso a view devolve a coluna `premissa_conferida`, sempre `false`, e o painel
--   escreve que o numero nao esta conferido enquanto o proprietario nao confirmar.
--
--   Mais tres coisas que este arquivo assume:
--   1. Divisao por zero nunca acontece: todo divisor passa por `nullif(x, 0)`, entao
--      divisor zero produz NULL, e NULL produz custo AUSENTE. Custo zero por dado
--      faltante e pior que custo ausente, porque tem aparencia de certo.
--   2. `sum()` do SQL IGNORA NULL, nao propaga. Isso significa que um insumo sem preco
--      sairia da soma em silencio e o custo do prato ficaria MENOR e plausivel. E o modo
--      de falha mais perigoso desta view, e a defesa e explicita: as linhas sem preco e
--      sem rendimento sao CONTADAS, e o custo total e forcado a NULL quando a contagem
--      nao e zero.
--   3. Hoje `pratos` tem 1 linha e `prato_ingredientes` tem 0. A view devolve, para
--      cada prato, uma linha com `custo_total` nulo e `motivo_incompleto` =
--      `ficha tecnica ausente`. O painel escreve isso, e nunca custo zero.
--
-- COMO SE DESFAZ
--   drop view if exists experiencia.vw_custo_prato;
--   Nada em `public` e alterado nem lido em escrita por este arquivo. Derrubar a view
--   nao toca em uma linha do sistema fiscal.
-- =============================================================================

create or replace view experiencia.vw_custo_prato with (security_invoker = true) as
with recursive arvore as (
  -- Nivel 1: o prato leva insumos. `quantidade` e a gramagem da ficha tecnica.
  select pi.prato_id,
         pi.insumo_master_id,
         (pi.quantidade / nullif(coalesce(pi.rn_override, im.rn), 0))::numeric as qtd_efetiva,
         1                             as nivel,
         array[pi.insumo_master_id]    as visitados
  from public.prato_ingredientes pi
  join public.insumos_master im on im.id = pi.insumo_master_id

  union all

  -- Nivel 2 e seguintes: insumo de tipo `producao_interna` leva a propria lista.
  -- `producao_ingredientes.producao_id` aponta para `insumos_master.id`, e nao para uma
  -- tabela de producoes, e e esse detalhe que obriga a recursao.
  select a.prato_id,
         pg.insumo_master_id,
         (a.qtd_efetiva
            * (pg.quantidade / nullif(coalesce(pg.rn_override, imf.rn), 0))
            / nullif(imp.rendimento, 0))::numeric,
         a.nivel + 1,
         a.visitados || pg.insumo_master_id
  from arvore a
  join public.insumos_master imp
    on imp.id = a.insumo_master_id and imp.tipo = 'producao_interna'
  join public.producao_ingredientes pg on pg.producao_id = imp.id
  join public.insumos_master imf on imf.id = pg.insumo_master_id
  -- Duas travas de recursao. `visitados` impede ciclo (massa que leva massa), e o teto
  -- de nivel impede loop por caminho longo. A estrutura de hoje tem dois niveis; o teto
  -- de 5 da folga e o corte fica SINALIZADO em vez de silencioso.
  where a.nivel < 5
    and not (pg.insumo_master_id = any (a.visitados))
),

-- Folha e o no que nao tem lista propria: insumo `comercial`, ou `producao_interna` sem
-- nenhuma linha em `producao_ingredientes`, que e um beco sem saida e precisa ser
-- contado como tal. O no que bateu no teto de nivel tambem entra, marcado.
folha as (
  select a.prato_id,
         a.insumo_master_id,
         a.qtd_efetiva,
         a.nivel,
         (a.nivel >= 5
          and exists (select 1 from public.producao_ingredientes pg
                      where pg.producao_id = a.insumo_master_id)) as truncado
  from arvore a
  where not exists (select 1 from public.producao_ingredientes pg
                    where pg.producao_id = a.insumo_master_id)
     or a.nivel >= 5
),

-- As datas de referencia de um prato sao as datas em que o preco de algum insumo da
-- arvore dele mudou, mais hoje. Isso e o que faz o custo ser uma funcao em degraus e
-- permite comparar a satisfacao de um trimestre com o custo DAQUELE trimestre, e nao
-- com o custo de hoje. Prato sem ficha tecnica aparece com a linha de hoje e custo nulo.
datas as (
  select f.prato_id, hp.data as data_referencia
  from folha f
  join public.historico_precos hp on hp.insumo_master_id = f.insumo_master_id
  where hp.valor_unit_normalizado is not null
  union
  select p.id, current_date from public.pratos p
),

-- Preco vigente na data: o ultimo `valor_unit_normalizado` com `data <= referencia`,
-- e `preco_unitario_fixo` como RESERVA (so 1 dos 131 insumos tem esse valor).
preco as (
  select d.prato_id,
         d.data_referencia,
         f.insumo_master_id,
         f.qtd_efetiva,
         f.nivel,
         f.truncado,
         im.nome_qt,
         im.tipo,
         coalesce(
           (select hp.valor_unit_normalizado
            from public.historico_precos hp
            where hp.insumo_master_id = f.insumo_master_id
              and hp.data <= d.data_referencia
              and hp.valor_unit_normalizado is not null
            order by hp.data desc, hp.id
            limit 1),
           im.preco_unitario_fixo
         ) as preco_unitario
  from datas d
  join folha f on f.prato_id = d.prato_id
  join public.insumos_master im on im.id = f.insumo_master_id
),

agregado as (
  select prato_id,
         data_referencia,
         count(*)::int                                        as insumos_contados,
         count(*) filter (where preco_unitario is null)::int   as insumos_sem_preco,
         count(*) filter (where qtd_efetiva is null)::int      as insumos_sem_rendimento,
         count(*) filter (where truncado)::int                 as insumos_truncados,
         max(nivel)::int                                       as nivel_maximo,
         -- Esta soma IGNORA NULL. Ela nao e a resposta: e insumo para a decisao abaixo.
         sum(qtd_efetiva * preco_unitario)                     as custo_somado
  from preco
  group by 1, 2
),

resolvido as (
  select p.id                    as prato_id,
         p.nome                  as prato_nome,
         p.categoria,
         p.id_altec,
         p.preco_venda,
         p.cmv_meta,
         p.ativo,
         coalesce(a.data_referencia, current_date) as data_referencia,
         coalesce(a.insumos_contados, 0)           as insumos_contados,
         coalesce(a.insumos_sem_preco, 0)          as insumos_sem_preco,
         coalesce(a.insumos_sem_rendimento, 0)     as insumos_sem_rendimento,
         coalesce(a.insumos_truncados, 0)          as insumos_truncados,
         a.nivel_maximo,
         -- A reintroducao explicita do NULL. Qualquer buraco na ficha tecnica produz
         -- custo AUSENTE, e nunca um custo menor que passa por certo.
         case
           when a.prato_id is null              then null
           when a.insumos_contados = 0          then null
           when a.insumos_sem_preco > 0         then null
           when a.insumos_sem_rendimento > 0    then null
           when a.insumos_truncados > 0         then null
           else round(a.custo_somado, 4)
         end as custo_total,
         case
           when a.prato_id is null or a.insumos_contados = 0
             then 'ficha tecnica ausente'
           when a.insumos_sem_rendimento > 0
             then 'rendimento nulo ou zero em ' || a.insumos_sem_rendimento || ' insumo(s)'
           when a.insumos_sem_preco > 0
             then 'sem preco em ' || a.insumos_sem_preco || ' insumo(s) nesta data'
           when a.insumos_truncados > 0
             then 'lista de materiais mais profunda que 5 niveis, calculo interrompido'
           else null
         end as motivo_incompleto
  from public.pratos p
  left join agregado a on a.prato_id = p.id
)
select prato_id,
       prato_nome,
       categoria,
       id_altec,
       ativo,
       data_referencia,
       -- A proxima data em que o custo muda. Nulo quer dizer "vigente ate hoje", e e o
       -- que permite ler o custo de uma data X com um filtro simples:
       --   where data_referencia <= X and (vigente_ate is null or vigente_ate > X)
       lead(data_referencia) over (partition by prato_id order by data_referencia) as vigente_ate,
       custo_total,
       preco_venda,
       cmv_meta,
       case when custo_total is null or preco_venda is null or preco_venda = 0 then null
            else round(custo_total * 100 / preco_venda, 1) end as cmv_pct,
       case when custo_total is null or preco_venda is null then null
            else round(preco_venda - custo_total, 4) end as margem_bruta,
       case when custo_total is null or preco_venda is null or preco_venda = 0 or cmv_meta is null
            then null
            else round(custo_total * 100 / preco_venda - cmv_meta, 1) end as desvio_do_cmv_meta,
       insumos_contados,
       insumos_sem_preco,
       insumos_sem_rendimento,
       insumos_truncados,
       nivel_maximo,
       (custo_total is null) as custo_ausente,
       motivo_incompleto,
       -- Sempre falso, e de proposito. N46: a semantica de rn, rendimento e rn_override
       -- e NAO VERIFICADO. A coluna existe para que nenhuma tela e nenhuma exportacao
       -- consigam esquecer de dizer isso a quem le.
       false as premissa_conferida,
       'NAO VERIFICADO: semantica de rn, rendimento e rn_override (N46)'::text as nota_premissa
from resolvido;

comment on view experiencia.vw_custo_prato is
  'Custo por prato numa data de referencia, com WITH RECURSIVE, lendo as cinco tabelas '
  'de custo em modo somente leitura. O sistema de experiencia CONSOME custo e nunca o '
  'produz: nao existe copia de custo, nao existe rotina de sincronizacao e nao existe '
  'calculo de CMV duplicado (ADR-04). Enquanto pratos tiver 1 linha e '
  'prato_ingredientes tiver 0, toda linha sai com custo_total nulo e '
  'motivo_incompleto = `ficha tecnica ausente`.';

grant select on experiencia.vw_custo_prato to experiencia_app, experiencia_leitura;
