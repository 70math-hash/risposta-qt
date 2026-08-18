-- =============================================================================
-- A24. A linha que nao esta em nenhum dos dois tipos
--
-- O DOCUMENTO SE CONTRADIZ, E NAO DA PARA RESOLVER LENDO O DOCUMENTO
--   `12-schema-custo-inspecao.md` diz `insumos_master` com 131 linhas e, tres paragrafos antes, diz
--   `tipo` com 129 `comercial` mais 1 `producao_interna`. 129 + 1 = 130. Uma linha nao esta em
--   nenhum dos dois valores, e `tipo` e NOT NULL. Ou a contagem de linhas esta errada, ou existe um
--   terceiro valor de `tipo` que ninguem enumerou.
--
--   A resposta esta no projeto `NFe e Financeiro`, que este repositorio le e nao escreve, e que
--   nenhuma migration daqui pode consultar em tempo de escrita. Entao a correcao NAO e descobrir o
--   numero: e parar de depender dele.
--
-- O QUE ESTAVA ERRADO, E E PIOR DO QUE A CRITICA DESCREVEU
--   As duas metades da recursao usavam predicados DIFERENTES para a mesma pergunta:
--
--     `arvore` descia por    `imp.tipo = 'producao_interna'`     — um ROTULO
--     `folha`  parava por    `not exists (producao_ingredientes)` — um FATO
--
--   Enquanto todo insumo com lista propria for `producao_interna`, os dois coincidem. Um insumo com
--   lista propria e `tipo` qualquer outro cai no vao entre eles:
--
--     - `arvore` nao desce nele, entao os ingredientes dele nunca entram na conta;
--     - `folha` tambem nao o aceita, porque ele TEM lista, entao ele proprio nao entra na conta.
--
--   O no SOME. Nao entra em `insumos_contados`, nao entra em `insumos_sem_preco`, nao entra em
--   `insumos_sem_rendimento`, nao aciona `custo_ausente`. O prato sai com custo menor, completo e
--   plausivel. A critica previu custo subestimado; o que existia era custo subestimado E silencioso,
--   que e o modo de falha que o ADR-04 nomeia como o pior de todos.
--
-- A CORRECAO: UM UNICO PREDICADO, E ELE E O FATO
--   A recursao passa a descer por `exists (select 1 from producao_ingredientes where producao_id =
--   ...)`, exatamente o mesmo teste que `folha` usa para parar. Sendo o mesmo predicado, o vao deixa
--   de existir POR CONSTRUCAO: todo no ou tem lista e e descido, ou nao tem e e folha. Nao ha
--   terceiro estado, e nao importa quantos valores de `tipo` existam.
--
--   Um insumo com lista propria e sem `rendimento` agora cai em `insumos_sem_rendimento`, que ja
--   zera o custo e escreve o motivo na tela. Ou seja: o caso que sumia em silencio passa a ser um
--   buraco declarado.
--
-- E A PERGUNTA DE A24 VIRA UMA CONSULTA, EM VEZ DE UMA NOTA DE RODAPE
--   `vw_custo_insumo_suspeito` responde, contra o banco de verdade e a qualquer momento, o que o
--   documento nao consegue: quantos valores de `tipo` existem, e onde rotulo e fato discordam. Se a
--   131a linha for um terceiro `tipo`, ela aparece ali com nome e contagem. Se rotulo e fato
--   discordarem, aparece tambem — e agora isso e um aviso, nao um erro de calculo.
-- =============================================================================

drop view if exists experiencia.vw_custo_prato;

create view experiencia.vw_custo_prato with (security_invoker = true) as
with recursive arvore as (
  select pi.prato_id,
         pi.insumo_master_id,
         (pi.quantidade / nullif(coalesce(pi.rn_override, im.rn), 0))::numeric as qtd_efetiva,
         1                             as nivel,
         array[pi.insumo_master_id]    as visitados,
         false                         as podado
  from public.prato_ingredientes pi
  join public.insumos_master im on im.id = pi.insumo_master_id

  union all

  -- Nivel 2 e seguintes: desce em quem TEM lista propria, e nao em quem esta ROTULADO como tendo.
  -- O `join` com `producao_ingredientes` ja e o proprio teste de existencia: se nao ha linha, nao ha
  -- descida. `imp` entra so pelo `rendimento`, sem filtrar por `tipo`.
  select a.prato_id,
         pg.insumo_master_id,
         case when pg.insumo_master_id = any (a.visitados)
              then null
              else (a.qtd_efetiva
                    * (pg.quantidade / nullif(coalesce(pg.rn_override, imf.rn), 0))
                    / nullif(imp.rendimento, 0))::numeric
         end,
         a.nivel + 1,
         a.visitados || pg.insumo_master_id,
         -- O ramo repetido EMITE a linha marcada em vez de sumir. Antes ele era podado no `where`,
         -- e o no desaparecia sem entrar em contagem nenhuma: o custo saia menor e plausivel.
         pg.insumo_master_id = any (a.visitados)
  from arvore a
  join public.producao_ingredientes pg on pg.producao_id = a.insumo_master_id
  join public.insumos_master imp on imp.id = a.insumo_master_id
  join public.insumos_master imf on imf.id = pg.insumo_master_id
  -- O teto de nivel continua sendo poda de verdade, e ele SO e alcancado depois de 5 niveis. O
  -- `not podado` impede que um ramo ja marcado continue descendo para sempre.
  where a.nivel < 5 and not a.podado
),

-- Identica a versao anterior, e agora e o MESMO teste que a recursao usa para descer. Esta simetria
-- e a correcao inteira: `arvore` desce exatamente em quem `folha` recusa como folha.
folha as (
  select a.prato_id,
         a.insumo_master_id,
         a.qtd_efetiva,
         a.nivel,
         a.podado,
         (a.nivel >= 5
          and exists (select 1 from public.producao_ingredientes pg
                      where pg.producao_id = a.insumo_master_id)) as truncado
  from arvore a
  where a.podado
     or not exists (select 1 from public.producao_ingredientes pg
                    where pg.producao_id = a.insumo_master_id)
     or a.nivel >= 5
),

datas as (
  select f.prato_id, hp.data as data_referencia
  from folha f
  join public.historico_precos hp on hp.insumo_master_id = f.insumo_master_id
  where hp.valor_unit_normalizado is not null
  union
  select p.id, current_date from public.pratos p
),

preco as (
  select d.prato_id,
         d.data_referencia,
         f.insumo_master_id,
         f.qtd_efetiva,
         f.nivel,
         f.truncado,
         f.podado,
         im.nome_qt,
         im.tipo,
         coalesce(
           -- A MEDIA das linhas da ultima data com preco, e nao a primeira por uuid. Ver A26: duas
           -- notas na mesma data sao normais, e o desempate por uuid era arbitrario.
           (select avg(hp.valor_unit_normalizado)
            from public.historico_precos hp
            where hp.insumo_master_id = f.insumo_master_id
              and hp.valor_unit_normalizado is not null
              and hp.data = (
                select max(hp2.data)
                from public.historico_precos hp2
                where hp2.insumo_master_id = f.insumo_master_id
                  and hp2.data <= d.data_referencia
                  and hp2.valor_unit_normalizado is not null
              )),
           im.preco_unitario_fixo
         ) as preco_unitario
  from datas d
  join folha f on f.prato_id = d.prato_id
  join public.insumos_master im on im.id = f.insumo_master_id
),

agregado as (
  select prato_id,
         data_referencia,
         count(*)::int                                              as insumos_contados,
         count(*) filter (where preco_unitario is null and not podado)::int as insumos_sem_preco,
         count(*) filter (where qtd_efetiva is null and not podado)::int    as insumos_sem_rendimento,
         count(*) filter (where truncado)::int                       as insumos_truncados,
         count(*) filter (where podado)::int                         as insumos_em_ciclo,
         max(nivel)::int                                             as nivel_maximo,
         sum(qtd_efetiva * preco_unitario) filter (where not podado) as custo_somado
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
         coalesce(a.insumos_em_ciclo, 0)           as insumos_em_ciclo,
         a.nivel_maximo,
         case
           when a.prato_id is null              then null
           when a.insumos_contados = 0          then null
           when a.insumos_sem_preco > 0         then null
           when a.insumos_sem_rendimento > 0    then null
           when a.insumos_truncados > 0         then null
           -- Ramo em ciclo tambem produz custo AUSENTE. Antes ele sumia e o custo saia menor.
           when a.insumos_em_ciclo > 0          then null
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
           when a.insumos_em_ciclo > 0
             then a.insumos_em_ciclo || ' insumo(s) aparecem duas vezes no mesmo ramo: o calculo '
                  'parou ali para nao entrar em ciclo, e o custo ficaria menor que o real'
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
       insumos_em_ciclo,
       nivel_maximo,
       (custo_total is null) as custo_ausente,
       motivo_incompleto,
       false as premissa_conferida,
       'NAO VERIFICADO: semantica de rn, rendimento e rn_override (N46); e o preco de uma data com '
       'mais de uma nota e a MEDIA SIMPLES das notas daquela data, porque historico_precos nao tem '
       'a quantidade que permitiria ponderar'::text as nota_premissa
from resolvido;

comment on view experiencia.vw_custo_prato is
  'Custo por prato numa data de referencia, com WITH RECURSIVE, lendo as cinco tabelas de custo em '
  'modo somente leitura. A recursao desce em quem TEM lista propria em producao_ingredientes, e nao '
  'em quem esta rotulado como producao_interna: e o mesmo predicado que decide folha, entao nenhum '
  'insumo cai entre os dois e some da conta. Ramo em ciclo e CONTADO e produz custo ausente. Preco '
  'de uma data com mais de uma nota e a media simples daquelas notas, e isso e premissa declarada.';

grant select on experiencia.vw_custo_prato to experiencia_app, experiencia_leitura;


-- =============================================================================
-- A pergunta de A24, respondida pelo banco em vez de pelo documento
--
-- Uma linha por valor de `tipo` que existe de verdade, com a contagem, e com o numero de insumos em
-- que rotulo e fato discordam nos dois sentidos. E a consulta que a critica pediu ("select tipo,
-- count(*) from insumos_master group by 1"), transformada em view para que a resposta apareca na
-- tela de custo em vez de viver numa conversa.
--
-- `desce_e_nao_deveria` nao e mais um erro de calculo depois da correcao acima — o custo esta certo
-- nos dois casos. Continua sendo um aviso de CADASTRO: alguem rotulou errado, ou montou lista para
-- um insumo comprado.
-- =============================================================================
create view experiencia.vw_custo_insumo_suspeito with (security_invoker = true) as
select im.tipo,
       count(*)::int as insumos,
       count(*) filter (
         where exists (select 1 from public.producao_ingredientes pg where pg.producao_id = im.id)
       )::int as com_lista_propria,
       count(*) filter (
         where im.tipo = 'producao_interna'
           and not exists (select 1 from public.producao_ingredientes pg where pg.producao_id = im.id)
       )::int as rotulado_producao_sem_lista,
       count(*) filter (
         where im.tipo is distinct from 'producao_interna'
           and exists (select 1 from public.producao_ingredientes pg where pg.producao_id = im.id)
       )::int as com_lista_e_outro_rotulo,
       (im.tipo not in ('comercial', 'producao_interna')) as tipo_fora_do_documentado
from public.insumos_master im
group by im.tipo
order by count(*) desc, im.tipo;

comment on view experiencia.vw_custo_insumo_suspeito is
  'Quantos valores de tipo existem em insumos_master, e onde o rotulo discorda do fato de ter lista '
  'propria. Existe porque a inspecao de 14/08/2026 registrou 131 linhas e 129+1 por tipo, e a linha '
  'que falta so pode ser respondida contra o banco. tipo_fora_do_documentado marca o terceiro valor, '
  'se houver.';

grant select on experiencia.vw_custo_insumo_suspeito to experiencia_app, experiencia_leitura;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select on experiencia.vw_custo_prato, experiencia.vw_custo_insumo_suspeito '
            'to authenticated';
  end if;
end
$$;


-- =============================================================================
-- O invariante de estado final, atualizado junto
--
-- A migration 115000 fixa "30 views" e falha se o numero mudar. Isso e proposital: view nova sem
-- decisao consciente e o comeco de uma folha canonica desatualizada. A decisao esta acima, entao o
-- numero sobe para 31 aqui, no mesmo arquivo que criou a view.
-- =============================================================================
do $$
declare
  v_views int;
begin
  select count(*) into v_views
  from pg_views where schemaname = 'experiencia';

  if v_views <> 31 then
    raise exception 'esperadas 31 views em experiencia (as 30 anteriores mais '
                    'vw_custo_insumo_suspeito), encontradas %', v_views;
  end if;

  raise notice 'ok  estado final: 31 views, e a recursao de custo desce por fato e nao por rotulo.';
end
$$;
