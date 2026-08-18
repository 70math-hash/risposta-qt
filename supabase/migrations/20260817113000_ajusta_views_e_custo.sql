-- =============================================================================
-- 20260817113000_ajusta_views_e_custo.sql
--
-- Quatro correcoes da critica adversarial da Etapa 4: A12, A17, A25, A26, mais A27.
-- =============================================================================

-- =============================================================================
-- A12. `vw_saude_rotina` voltou a devolver a tabela inteira
--
-- A folha define a view sobre as ULTIMAS 30 execucoes de cada rotina. A migration que acrescentou
-- `contagens` recriou a view e perdeu o corte. Com `watcher_drive` rodando a cada 30 minutos, sao
-- cerca de 17.500 linhas por ano, lidas a cada abertura de `/painel/saude` — contra um teto de 3
-- segundos em 4G, num celular, no salao.
--
-- O corte e por (rotina, passo) e nao so por rotina: o digest grava `consulta` e `envio`
-- separados, e cortar por rotina esconderia metade da historia de um deles.
-- =============================================================================
create or replace view experiencia.vw_saude_rotina with (security_invoker = true) as
with ordenado as (
  select er.*,
         row_number() over (
           partition by er.rotina, coalesce(er.passo, '')
           order by er.iniciado_em desc
         ) as rn
  from experiencia.execucao_rotina er
)
select o.id,
       o.rotina,
       o.passo,
       o.iniciado_em,
       o.terminado_em,
       o.status,
       o.respostas_no_periodo,
       o.email_enviado,
       o.destinatarios,
       o.linhas_anonimizadas,
       o.mascaramentos,
       o.erro,
       round(extract(epoch from (o.terminado_em - o.iniciado_em))::numeric, 1) as duracao_s,
       o.contagens
from ordenado o
where o.rn <= 30
order by o.iniciado_em desc;

comment on view experiencia.vw_saude_rotina is
  'As ultimas 30 execucoes de CADA rotina, mais recente primeiro. O corte e por (rotina, passo) '
  'porque o digest grava `consulta` e `envio` separados. Sem o corte, um ano de watcher_drive sao '
  '~17.500 linhas lidas a cada abertura da aba, contra o teto de 3 segundos em 4G.';

grant select on experiencia.vw_saude_rotina to experiencia_app, experiencia_leitura;

-- =============================================================================
-- A17. `vw_item_trimestre` dizia "sem venda no periodo" para item que vendeu
--
-- Dois defeitos na mesma view:
--
--   1. O trimestre saia so de `recl` (reclamacoes). Item SEM reclamacao no periodo ficava com
--      `trimestre` nulo, a juncao com vendas nunca casava, `unidades_vendidas` saia nula e o aviso
--      escrevia `sem venda no periodo` para um item que vendeu bem. Afirmacao falsa na tela, e
--      justamente sobre o item que esta indo bem.
--
--   2. A media saia de `avg(reclamacoes)` sobre os itens QUE TIVERAM reclamacao. Isso e a media
--      dos reclamados, e nao a media do cardapio: com 3 itens reclamados entre 40, a media vinha
--      cerca de 13 vezes maior que a verdadeira, e todo item parecia estar abaixo dela.
-- =============================================================================
drop view if exists experiencia.vw_item_trimestre;

create view experiencia.vw_item_trimestre with (security_invoker = true) as
with recl as (
  select ri.item_cardapio_id,
         date_trunc('quarter', r.dia_operacional)::date as trimestre,
         count(*)::int as reclamacoes
  from experiencia.resposta r
  join experiencia.resposta_item ri on ri.resposta_id = r.id
  where r.suspeita = false and ri.item_cardapio_id is not null
  group by 1, 2
),
vendas as (
  select v.item_cardapio_id,
         date_trunc('quarter', v.dia_operacional)::date as trimestre,
         sum(v.unidades) as unidades
  from experiencia.venda_produto_dia v
  where v.item_cardapio_id is not null
  group by 1, 2
),
-- A grade sai da UNIAO dos trimestres dos dois lados, cruzada com os itens. Sem isso, item sem
-- reclamacao no periodo simplesmente nao existia na tela.
trimestres as (
  select trimestre from recl
  union
  select trimestre from vendas
),
grade as (
  select ic.id as item_cardapio_id, t.trimestre
  from experiencia.item_cardapio ic
  cross join trimestres t
  where ic.removido_em is null
),
-- A media do CARDAPIO: o total de reclamacoes dividido pelo numero de itens ativos, e nao pela
-- quantidade de itens que tiveram reclamacao. A segunda forma faz todo item parecer abaixo da media.
media as (
  select r.trimestre,
         round(
           sum(r.reclamacoes)::numeric
           / nullif((select count(*) from experiencia.item_cardapio
                     where removido_em is null and ativo = true), 0),
           2) as media_reclamacoes_cardapio
  from recl r
  group by 1
)
select g.item_cardapio_id,
       ic.nome_pt,
       ic.grupo,
       ic.ativo,
       g.trimestre,
       coalesce(r.reclamacoes, 0)                        as reclamacoes,
       m.media_reclamacoes_cardapio,
       v.unidades                                        as unidades_vendidas,
       case when v.unidades is not null and v.unidades > 0
            then round(coalesce(r.reclamacoes, 0)::numeric * 100 / v.unidades, 2)
            else null end                                as reclamacoes_por_100,
       -- Sinalizado exige as duas coisas: 3 reclamacoes E 30 unidades vendidas no trimestre.
       -- Abaixo disso e ruido, e apontar ruido gasta a atencao que o sinal verdadeiro precisa.
       (coalesce(r.reclamacoes, 0) >= 3 and coalesce(v.unidades, 0) >= 30) as sinalizado,
       case
         when v.unidades is null
           then 'sem venda importada neste trimestre: nao ha denominador'
         when v.unidades < 30
           then 'menos de 30 unidades vendidas: a taxa por 100 nao e confiavel'
         when coalesce(r.reclamacoes, 0) < 3
           then 'menos de 3 reclamacoes: abaixo do limiar de sinalizacao'
         else null
       end                                               as aviso
from grade g
join experiencia.item_cardapio ic on ic.id = g.item_cardapio_id
left join recl r on r.item_cardapio_id = g.item_cardapio_id and r.trimestre = g.trimestre
left join vendas v on v.item_cardapio_id = g.item_cardapio_id and v.trimestre = g.trimestre
left join media m on m.trimestre = g.trimestre
order by g.trimestre desc, coalesce(r.reclamacoes, 0) desc, ic.nome_pt;

comment on view experiencia.vw_item_trimestre is
  'Reclamacoes por item no trimestre, com a media do CARDAPIO ao lado. A grade sai da uniao dos '
  'trimestres de reclamacao e de venda: sem isso, item sem reclamacao sumia da tela e o aviso '
  'escrevia `sem venda` para item que vendeu. A media divide pelo numero de itens ATIVOS, e nao '
  'pelos que tiveram reclamacao, que fazia todo item parecer abaixo dela.';

grant select on experiencia.vw_item_trimestre to experiencia_app, experiencia_leitura;

-- =============================================================================
-- A27. O CHECK confundia mesa fisica com mesa atendida
--
-- `mesas <= 22` tratava o numero de mesas ATENDIDAS como se fosse o numero de mesas FISICAS. A casa
-- serve das 18h as 23h e uma mesa fisica atende duas festas na mesma noite: 25 mesas atendidas e
-- noite cheia, e nao erro de digitacao. O CHECK recusava a informacao, e o gerente nao conseguia
-- fechar o dever diario — que e o denominador do critério de sucesso numero 2.
--
-- O teto novo so pega erro de digitacao de fato (22 mesas com giro de menos de 3). A plausibilidade
-- vira pergunta na tela, e nao recusa no banco: banco que recusa dado verdadeiro faz o humano
-- desistir da tarefa, e a tarefa e diaria.
-- =============================================================================
alter table experiencia.mesa_atendida_dia
  drop constraint if exists mesa_atendida_dia_mesas_plausivel;

alter table experiencia.mesa_atendida_dia
  add constraint mesa_atendida_dia_mesas_plausivel check (mesas >= 0 and mesas <= 60);

comment on constraint mesa_atendida_dia_mesas_plausivel on experiencia.mesa_atendida_dia is
  'Teto de 60, e nao de 22: 22 e o numero de mesas FISICAS, e com giro numa noite de 5 horas uma '
  'mesa atende mais de uma festa. O teto antigo recusava noite cheia como erro de digitacao, e '
  'banco que recusa dado verdadeiro faz o humano desistir de uma tarefa diaria.';

-- =============================================================================
-- A25 e A26. Duas coisas que o custo fazia em silencio.
--
-- A25. O GUARDA DE CICLO PODAVA INSUMO LEGITIMO
--   `not (pg.insumo_master_id = any (a.visitados))` protege contra ciclo (massa que leva massa), e
--   precisa existir. Mas ele e por CAMINHO, entao poda tambem o insumo legitimamente usado duas
--   vezes em profundidades diferentes do mesmo ramo — mucarela no molho e mucarela dentro da base
--   do molho, que numa pizzaria e comum.
--
--   O no podado nao entrava em `insumos_truncados` nem em contagem nenhuma: o custo saia MENOR e
--   plausivel, sem nada dizendo que faltou pedaco. Custo subestimado com aparencia de certo e o
--   pior resultado possivel num painel de margem — ele nao parece erro, parece um prato lucrativo.
--
--   Agora o ramo podado EMITE uma linha marcada, que nao entra na soma e entra na contagem. E
--   `custo_ausente` passa a ser verdadeiro quando ha poda, pela mesma regra de sempre: buraco na
--   ficha produz custo AUSENTE, e nunca um custo menor que passa por certo.
--
-- A26. DUAS NOTAS NA MESMA DATA, DESEMPATE POR uuid
--   O preco vigente saia de `order by hp.data desc, hp.id limit 1`. `historico_precos` tem
--   `fornecedor_id` e `nota_id`, entao duas notas do mesmo insumo na mesma data sao NORMAIS — duas
--   compras, dois fornecedores. Desempatar por `uuid` e arbitrario: o custo do prato passava a
--   depender de qual identificador saiu maior, e nada na tela dizia isso.
--
--   A regra passa a ser a MEDIA das linhas da ultima data com preco, e ela e uma PREMISSA
--   DECLARADA, como as outras tres: se a casa comprou 10 kg a R$ 30 e 2 kg a R$ 40 no mesmo dia, a
--   media simples nao e a media ponderada, e a ponderada exigiria a quantidade da nota, que
--   `historico_precos` nao tem. A media simples e defensavel e o desempate por uuid nao era.
--   Entra em `nota_premissa`, que a tela ja mostra.
-- =============================================================================
-- `drop` antes de criar: `insumos_em_ciclo` entra no meio da lista, e `create or replace view`
-- recusa mudar ordem de coluna. Sem `cascade`, para o drop falhar dizendo quem depende, se alguem
-- passar a depender dela.
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

  -- Nivel 2 e seguintes: insumo `producao_interna` leva a propria lista.
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
  join public.insumos_master imp
    on imp.id = a.insumo_master_id and imp.tipo = 'producao_interna'
  join public.producao_ingredientes pg on pg.producao_id = imp.id
  join public.insumos_master imf on imf.id = pg.insumo_master_id
  -- O teto de nivel continua sendo poda de verdade, e ele SO e alcancado depois de 5 niveis. O
  -- `not podado` impede que um ramo ja marcado continue descendo para sempre.
  where a.nivel < 5 and not a.podado
),

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
           -- A MEDIA das linhas da ultima data com preco, e nao a primeira por uuid. Ver A26 no
           -- cabecalho: duas notas na mesma data sao normais, e o desempate por uuid era arbitrario.
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
  'modo somente leitura. Ramo em ciclo e CONTADO e produz custo ausente, em vez de sumir e deixar o '
  'custo menor. Preco de uma data com mais de uma nota e a media simples daquelas notas, e isso e '
  'premissa declarada: ponderar exigiria a quantidade, que historico_precos nao tem.';

grant select on experiencia.vw_custo_prato to experiencia_app, experiencia_leitura;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select on experiencia.vw_custo_prato, experiencia.vw_item_trimestre, '
            'experiencia.vw_saude_rotina to authenticated';
  end if;
end
$$;
