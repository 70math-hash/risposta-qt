-- =============================================================================
-- 20260817099000_cria_views_painel.sql
--
-- O QUE FAZ
--   Cria as dezoito views da secao 6.2 da folha canonica, menos `vw_custo_prato`, que
--   tem migration propria porque e a unica que le fora do schema.
--
-- O QUE ASSUME
--   1. Toda view nasce com `security_invoker = true`. Sem isso a view roda com os
--      privilegios do dono e passa por cima do RLS das tabelas de baixo, o que
--      transformaria a proxima migration (RLS) em decoracao.
--   2. Resposta com `suspeita = true` NAO entra em indicador nenhum (F04). Ela e
--      contada em separado, e so em `vw_coleta_dia`. Esta regra vale nas dezoito views
--      e esta escrita uma vez aqui para nao ser esquecida em uma delas.
--   3. Resposta com `garcom_reconhecido = false` ENTRA nos indicadores gerais e NAO
--      entra no corte por garcom (ADR-06).
--   4. `n` sai ao lado de todo numero, e proporcao com `n` abaixo de 20 sai como texto
--      `amostra insuficiente, n=x` na coluna `aviso`, com a coluna numerica nula
--      (N32). Numero nulo com aviso escrito e melhor que percentual sobre 3 respostas.
--   5. A formula do NPS e do erro padrao e a de N05, identica a de src/comum/nps.ts.
--      Painel e digest leem a view, e nenhum dos dois recalcula. Duas implementacoes da
--      mesma formula divergem no arredondamento e ninguem descobre.
--   6. Toda janela sai de `dia_operacional`, nunca de data civil. `criado_em::date` e
--      `date(criado_em)` sao expressoes proibidas (secao 4.7) e nao aparecem aqui.
--   7. Semana operacional e a semana ISO (segunda a domingo), que contem exatamente um
--      dia de casa fechada. `vw_semana_detrator` conta os dias abertos de cada semana
--      para que semana curta nao seja comparada com semana cheia (F27).
--
-- COMO SE DESFAZ
--   drop view if exists experiencia.vw_saude_rotina, ... (as dezoito, em qualquer ordem,
--   porque nenhuma depende de outra).
--   Trocar coluna de view exige `drop view` antes do `create`, e isso e migration nova:
--   `create or replace view` nao muda lista de colunas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- vw_hoje. /painel. Grao: um dia operacional.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_hoje with (security_invoker = true) as
with dias as (
  select dia_operacional from experiencia.resposta
  union
  select dia_operacional from experiencia.mesa_atendida_dia
  union
  select dia_operacional from experiencia.calendario_operacao
),
resp as (
  select dia_operacional,
         count(*) filter (where suspeita = false)                            as respostas,
         count(*) filter (where suspeita = false and faixa = 'detrator')     as detratores,
         count(*) filter (where suspeita = false and faixa = 'neutro')       as neutros,
         count(*) filter (where suspeita = false and faixa = 'promotor')     as promotores,
         count(*) filter (where suspeita = true)                            as suspeitas
  from experiencia.resposta
  group by 1
)
select d.dia_operacional,
       experiencia.fn_casa_abre(d.dia_operacional)   as casa_abre,
       coalesce(r.respostas, 0)::int                 as respostas,
       coalesce(r.detratores, 0)::int                as detratores,
       coalesce(r.neutros, 0)::int                   as neutros,
       coalesce(r.promotores, 0)::int                as promotores,
       coalesce(r.suspeitas, 0)::int                 as suspeitas,
       m.mesas                                       as mesas_atendidas,
       case when m.mesas is null or m.mesas = 0 then null
            else round(coalesce(r.respostas, 0)::numeric * 100 / m.mesas, 1)
       end                                           as conversao_pct,
       case when m.mesas is null then 'denominador ausente'
            when not experiencia.fn_casa_abre(d.dia_operacional) then 'casa fechada'
            when coalesce(r.respostas, 0) = 0 then 'nenhuma resposta coletada'
            else null
       end                                           as aviso
from dias d
left join resp r using (dia_operacional)
left join experiencia.mesa_atendida_dia m using (dia_operacional);

comment on view experiencia.vw_hoje is
  'A tela `hoje` cabe numa dobra de celular: respostas, conversao, detratores, '
  'promotores. `aviso` distingue as tres ausencias que nao podem ser confundidas: '
  'denominador ausente, casa fechada e nenhuma resposta coletada (F32).';

-- -----------------------------------------------------------------------------
-- vw_distribuicao_faixa_dia. /painel. Grao: uma faixa por dia operacional.
-- Cruza dia com faixa para que a faixa sem nenhuma resposta apareca como zero, e nao
-- desapareca do grafico.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_distribuicao_faixa_dia with (security_invoker = true) as
select d.dia_operacional,
       f.faixa,
       count(r.id)::int as respostas
from (select distinct dia_operacional from experiencia.resposta) d
cross join (values ('detrator'::text), ('neutro'), ('promotor')) as f(faixa)
left join experiencia.resposta r
       on r.dia_operacional = d.dia_operacional
      and r.faixa = f.faixa
      and r.suspeita = false
group by 1, 2;

-- -----------------------------------------------------------------------------
-- vw_nps_janela. /painel/tendencia. Grao: uma janela de datas.
-- Formula N05: erro padrao = raiz((p_promotores + p_detratores - NPS^2) / n), faixa de
-- 95% = 1,96 x erro padrao. Diferenca minima detectavel = faixa x raiz(2) (N09).
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_nps_janela with (security_invoker = true) as
with base as (
  select dia_operacional, faixa
  from experiencia.resposta
  where suspeita = false
),
expandido as (
  select j.janela, j.inicio, j.fim, b.faixa
  from base b
  cross join lateral (values
    ('dia'::text,     b.dia_operacional, b.dia_operacional),
    ('semana',        date_trunc('week',  b.dia_operacional)::date,
                      (date_trunc('week',  b.dia_operacional) + interval '6 days')::date),
    ('mes',           date_trunc('month', b.dia_operacional)::date,
                      (date_trunc('month', b.dia_operacional) + interval '1 month' - interval '1 day')::date),
    ('trimestre',     date_trunc('quarter', b.dia_operacional)::date,
                      (date_trunc('quarter', b.dia_operacional) + interval '3 months' - interval '1 day')::date)
  ) as j(janela, inicio, fim)
),
agregado as (
  select janela, inicio, fim,
         count(*)::int                                   as n,
         count(*) filter (where faixa = 'promotor')::int  as promotores,
         count(*) filter (where faixa = 'neutro')::int    as neutros,
         count(*) filter (where faixa = 'detrator')::int  as detratores
  from expandido
  group by 1, 2, 3
),
calculado as (
  select a.*,
         (a.promotores - a.detratores)::numeric / a.n as nps_fracao,
         sqrt(
           greatest(
             (a.promotores::numeric / a.n)
             + (a.detratores::numeric / a.n)
             - power((a.promotores - a.detratores)::numeric / a.n, 2),
             0
           ) / a.n
         ) * 100 as erro_padrao
  from agregado a
)
-- `round(double precision, int)` NAO EXISTE no Postgres: round com casas decimais so tem versao
-- para numeric. Daqui vem os casts.
--
-- MAS o comentario anterior aqui estava errado, e a correcao vale ser registrada porque a versao
-- errada era mais convincente que a certa. Ele dizia "`sqrt()` devolve double precision", o que e
-- verdade para `sqrt(2)` (argumento inteiro, que resolve para a versao double) e FALSO para
-- `sqrt(<numeric>)`, que devolve numeric. Conferido: `pg_typeof(sqrt(0.5::numeric))` e `numeric`.
--
-- Portanto o unico cast que a criacao da view exige e o da ultima linha, por causa do `sqrt(2)`. Os
-- outros tres sao inocuos, e ficam de proposito: eles dizem, em cada linha, que ali se arredonda um
-- numeric — o que e a informacao util para quem editar isto depois.
--
-- O erro original (`round(double precision, int)`) foi encontrado rodando as migrations num
-- Postgres de ensaio, e isso continua verdade. O que nao era verdade e o motivo que eu escrevi.
select janela, inicio, fim, n, promotores, neutros, detratores,
       round((nps_fracao * 100)::numeric, 1)             as nps,
       round(erro_padrao::numeric, 1)                    as erro_padrao,
       round((1.96 * erro_padrao)::numeric, 1)           as faixa_95,
       round((1.96 * erro_padrao * sqrt(2))::numeric, 1) as diferenca_minima_detectavel,
       (n >= 20)                               as amostra_suficiente,
       case when n < 20 then 'amostra insuficiente, n=' || n else null end as aviso
from calculado;

comment on view experiencia.vw_nps_janela is
  'Nenhum NPS aparece sem n e sem faixa. A seta de tendencia nao aparece quando a '
  'diferenca e menor que diferenca_minima_detectavel (F17, F31).';

-- -----------------------------------------------------------------------------
-- vw_semana_detrator. /painel/tendencia. Grao: uma semana operacional.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_semana_detrator with (security_invoker = true) as
with semanas as (
  select distinct date_trunc('week', dia_operacional)::date as semana
  from experiencia.resposta
  where suspeita = false
),
contagem as (
  select date_trunc('week', dia_operacional)::date as semana,
         count(*) filter (where faixa = 'detrator')::int as detratores,
         count(*)::int as respostas
  from experiencia.resposta
  where suspeita = false
  group by 1
),
abertos as (
  select s.semana,
         (select count(*)
          from generate_series(s.semana, s.semana + 6, interval '1 day') g
          where experiencia.fn_casa_abre(g::date))::int as dias_abertos
  from semanas s
)
select c.semana,
       c.detratores,
       c.respostas,
       a.dias_abertos,
       lag(c.detratores) over (order by c.semana)   as detratores_semana_anterior,
       lag(a.dias_abertos) over (order by c.semana) as dias_abertos_semana_anterior,
       -- Alerta de queda de tendencia (F27, N44): dispara com 3 ou mais detratores
       -- acima da semana anterior, e SO quando as duas semanas tem o mesmo numero de
       -- dias abertos. Semana curta por feriado nao dispara nada.
       (c.detratores - coalesce(lag(c.detratores) over (order by c.semana), c.detratores) >= 3
        and a.dias_abertos = lag(a.dias_abertos) over (order by c.semana)) as alerta_queda,
       (a.dias_abertos <> coalesce(lag(a.dias_abertos) over (order by c.semana), a.dias_abertos))
                                                     as semana_incomparavel
from contagem c
join abertos a using (semana);

-- -----------------------------------------------------------------------------
-- vw_dia_semana. /painel/tendencia. Este sabado contra a media dos ultimos 4 sabados,
-- com os dois n. Segunda nao aparece, porque a casa fecha e nao ha linha.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_dia_semana with (security_invoker = true) as
with dia as (
  select dia_operacional,
         extract(isodow from dia_operacional)::int as dia_semana,
         count(*)::int                                  as respostas,
         count(*) filter (where faixa = 'detrator')::int as detratores,
         count(*) filter (where faixa = 'promotor')::int as promotores
  from experiencia.resposta
  where suspeita = false
  group by 1, 2
)
select dia_operacional,
       dia_semana,
       respostas                        as n_dia,
       detratores,
       promotores,
       round(avg(respostas)  over w, 1) as media_respostas_4,
       round(avg(detratores) over w, 1) as media_detratores_4,
       coalesce(sum(respostas) over w, 0)::int as n_4,
       count(*) over w                  as ocorrencias_comparadas,
       case when count(*) over w = 0 then 'primeira ocorrencia, sem base de comparacao'
            else null end               as aviso
from dia
window w as (partition by dia_semana order by dia_operacional rows between 4 preceding and 1 preceding);

comment on view experiencia.vw_dia_semana is
  'Com 8 respostas por sabado a comparacao e em CONTAGEM, com o n ao lado (F21). '
  'A leitura em proporcao so aparece na janela trimestral, em vw_nps_janela.';

-- -----------------------------------------------------------------------------
-- vw_fator_contagem. /painel. Grao: um fator por janela, por origem.
--
-- `origem` refina o grao que a folha canonica declara, e o motivo e aritmetico: somar
-- uma opcao marcada na tela com uma frase classificada pela IA conta DUAS VEZES a
-- mesma reclamacao. Com a coluna, o painel escolhe uma origem ou mostra as duas lado a
-- lado, e nunca soma por acidente.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_fator_contagem with (security_invoker = true) as
with base as (
  select r.dia_operacional, 'opcao'::text as origem, ro.dimensao, ro.fator
  from experiencia.resposta r
  join experiencia.resposta_opcao ro on ro.resposta_id = r.id
  where r.suspeita = false
  union all
  select r.dia_operacional, 'classificacao'::text, ct.dimensao, ct.fator
  from experiencia.resposta r
  join experiencia.classificacao_texto ct on ct.resposta_id = r.id
  where r.suspeita = false
),
expandido as (
  select j.janela, j.inicio, j.fim, b.origem, b.dimensao, b.fator
  from base b
  cross join lateral (values
    ('dia'::text,  b.dia_operacional, b.dia_operacional),
    ('semana',     date_trunc('week',  b.dia_operacional)::date,
                   (date_trunc('week',  b.dia_operacional) + interval '6 days')::date),
    ('mes',        date_trunc('month', b.dia_operacional)::date,
                   (date_trunc('month', b.dia_operacional) + interval '1 month' - interval '1 day')::date),
    ('trimestre',  date_trunc('quarter', b.dia_operacional)::date,
                   (date_trunc('quarter', b.dia_operacional) + interval '3 months' - interval '1 day')::date)
  ) as j(janela, inicio, fim)
)
select janela, inicio, fim, origem, dimensao, fator, count(*)::int as mencoes
from expandido
group by 1, 2, 3, 4, 5, 6;

comment on view experiencia.vw_fator_contagem is
  'Contagem absoluta, nunca nota por dimensao. `Atendimento: 4,1` nao existe neste '
  'sistema; `recepcao 3, conhecimento_cardapio 5, despedida 1` existe (F19).';

-- -----------------------------------------------------------------------------
-- vw_garcom_trimestre. /painel/garcons. Grao: um garcom por trimestre.
-- Sem meta, sem ranking, sem semaforo (D8). Nota e conversao, com n obrigatorio.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_garcom_trimestre with (security_invoker = true) as
with resp as (
  select r.garcom_id,
         date_trunc('quarter', r.dia_operacional)::date as trimestre,
         count(*)::int                                  as n,
         -- Numerador da conversao: SO o canal tablet, porque `tentativa` so existe no
         -- tablet. Somar as respostas de QR sobre um denominador que nao as conta produziria
         -- conversao acima de 100%, que e o tipo de numero que ninguem confere duas vezes.
         count(*) filter (where r.canal = 'tablet')::int    as n_tablet,
         count(*) filter (where r.faixa = 'promotor')::int  as promotores,
         count(*) filter (where r.faixa = 'neutro')::int    as neutros,
         count(*) filter (where r.faixa = 'detrator')::int  as detratores
  from experiencia.resposta r
  where r.suspeita = false and r.garcom_reconhecido = true
  group by 1, 2
),
tent as (
  select t.garcom_id,
         date_trunc('quarter', t.dia_operacional)::date as trimestre,
         count(*)::int                                  as tentativas,
         count(*) filter (where t.desfecho = 'recusou')::int as recusas
  from experiencia.tentativa t
  where t.garcom_reconhecido = true
  group by 1, 2
),
-- A dimensao (garcom, trimestre) sai da UNIAO dos dois lados, e nao de um deles. Sem
-- isso, o garcom que abordou mesas e nao trouxe resposta nenhuma desapareceria da tela,
-- que e exatamente o caso que a conversao existe para mostrar.
grade as (
  select garcom_id, trimestre from resp
  union
  select garcom_id, trimestre from tent
)
select g.id            as garcom_id,
       g.nome,
       g.ativo,
       gr.trimestre,
       coalesce(resp.n, 0)          as n,
       coalesce(resp.n_tablet, 0)   as n_tablet,
       coalesce(resp.promotores, 0) as promotores,
       coalesce(resp.neutros, 0)    as neutros,
       coalesce(resp.detratores, 0) as detratores,
       case when coalesce(resp.n, 0) >= 20
            then round((resp.promotores - resp.detratores)::numeric * 100 / resp.n, 1)
            else null end           as nps,
       coalesce(tent.tentativas, 0) as tentativas,
       coalesce(tent.recusas, 0)    as recusas,
       case when coalesce(tent.tentativas, 0) >= 20
            then round(coalesce(resp.n_tablet, 0)::numeric * 100 / tent.tentativas, 1)
            else null end           as conversao_pct,
       case when coalesce(resp.n, 0) < 20
            then 'amostra insuficiente, n=' || coalesce(resp.n, 0)
            else null end           as aviso
from grade gr
join experiencia.garcom g on g.id = gr.garcom_id
left join resp on resp.garcom_id = gr.garcom_id and resp.trimestre = gr.trimestre
left join tent on tent.garcom_id = gr.garcom_id and tent.trimestre = gr.trimestre;

comment on view experiencia.vw_garcom_trimestre is
  'Janela trimestral, e n minimo de 20 (N32). Garcom removido continua aqui com o '
  'historico dele: remover preenche removido_em e nao reatribui nada (F49). A conversao '
  'so existe no canal tablet, porque o QR nao passa pela T0 e nao gera tentativa.';

-- -----------------------------------------------------------------------------
-- vw_item_trimestre. /painel/pratos. Grao: um item por trimestre.
-- Reclamacoes do item e a media de reclamacoes por item do cardapio, lado a lado (F22).
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_item_trimestre with (security_invoker = true) as
with recl as (
  select ri.item_cardapio_id,
         date_trunc('quarter', r.dia_operacional)::date as trimestre,
         count(*)::int as reclamacoes
  from experiencia.resposta r
  join experiencia.resposta_item ri on ri.resposta_id = r.id
  where r.suspeita = false and ri.item_cardapio_id is not null
  group by 1, 2
),
media as (
  select trimestre, round(avg(reclamacoes), 2) as media_reclamacoes_cardapio
  from recl
  group by 1
),
vendas as (
  select v.item_cardapio_id,
         date_trunc('quarter', v.dia_operacional)::date as trimestre,
         sum(v.unidades) as unidades_vendidas
  from experiencia.venda_produto_dia v
  where v.item_cardapio_id is not null
  group by 1, 2
)
select i.id as item_cardapio_id,
       i.nome_pt,
       i.grupo,
       i.ativo,
       recl.trimestre,
       coalesce(recl.reclamacoes, 0) as reclamacoes,
       media.media_reclamacoes_cardapio,
       vendas.unidades_vendidas,
       -- N33: minimo de 3 eventos de reclamacao E 30 unidades vendidas no trimestre.
       -- Sem venda importada, `unidades_vendidas` e nulo e nada e sinalizado, o que e o
       -- comportamento certo: lacuna explicita, nunca zero.
       (coalesce(recl.reclamacoes, 0) >= 3 and coalesce(vendas.unidades_vendidas, 0) >= 30) as sinalizado,
       case when vendas.unidades_vendidas is null then 'sem venda no periodo' else null end as aviso
from experiencia.item_cardapio i
left join recl   on recl.item_cardapio_id = i.id
left join media  on media.trimestre = recl.trimestre
left join vendas on vendas.item_cardapio_id = i.id and vendas.trimestre = recl.trimestre;

comment on view experiencia.vw_item_trimestre is
  'O eixo e EVENTO DE RECLAMACAO de quem deu nota baixa, e nao nota media do prato, '
  'porque prato a prato so e perguntado em nota baixa (F13, F22). A tela escreve isso.';

-- -----------------------------------------------------------------------------
-- vw_coleta_dia. /painel/coleta. Grao: um dia operacional.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_coleta_dia with (security_invoker = true) as
with resp as (
  select dia_operacional,
         count(*) filter (where suspeita = false)::int              as respostas,
         count(*) filter (where suspeita = true)::int               as suspeitas,
         count(*) filter (where garcom_reconhecido = false)::int    as pin_nao_reconhecido,
         count(*) filter (where canal = 'tablet')::int              as respostas_tablet,
         count(*) filter (where canal = 'qr')::int                  as respostas_qr,
         -- Numerador da conversao por tentativa: tablet e nao suspeita. Ver a nota de
         -- vw_garcom_trimestre: `tentativa` so existe no tablet.
         count(*) filter (where canal = 'tablet' and suspeita = false)::int as respostas_tablet_validas
  from experiencia.resposta
  group by 1
),
por_dispositivo as (
  select x.dia_operacional,
         jsonb_object_agg(coalesce(d.apelido, 'sem aparelho'), x.n) as respostas_por_dispositivo,
         max(x.n)::int as maior_por_dispositivo
  from (select dia_operacional, dispositivo_id, count(*)::int as n
        from experiencia.resposta group by 1, 2) x
  left join experiencia.dispositivo d on d.id = x.dispositivo_id
  group by 1
),
tent as (
  select dia_operacional, count(*)::int as tentativas,
         count(*) filter (where desfecho = 'recusou')::int as recusas
  from experiencia.tentativa group by 1
)
select r.dia_operacional,
       experiencia.fn_casa_abre(r.dia_operacional) as casa_abre,
       r.respostas,
       m.mesas as mesas_atendidas,
       case when m.mesas is null or m.mesas = 0 then null
            else round(r.respostas::numeric * 100 / m.mesas, 1) end as conversao_casa_pct,
       t.tentativas,
       t.recusas,
       case when coalesce(t.tentativas, 0) = 0 then null
            else round(r.respostas_tablet_validas::numeric * 100 / t.tentativas, 1)
       end as conversao_tentativa_pct,
       r.suspeitas,
       case when r.respostas + r.suspeitas = 0 then null
            else round(r.suspeitas::numeric * 100 / (r.respostas + r.suspeitas), 1) end as suspeitas_pct,
       r.pin_nao_reconhecido,
       (r.pin_nao_reconhecido > 3) as pin_acima_do_limiar,
       r.respostas_tablet,
       r.respostas_qr,
       d.respostas_por_dispositivo,
       d.maior_por_dispositivo,
       (d.maior_por_dispositivo > 30) as dispositivo_acima_do_teto,
       case when m.mesas is null then 'denominador ausente' else null end as aviso
from resp r
left join por_dispositivo d using (dia_operacional)
left join tent t using (dia_operacional)
left join experiencia.mesa_atendida_dia m using (dia_operacional);

comment on view experiencia.vw_coleta_dia is
  'Duas conversoes, com nomes diferentes de proposito (secao 2.5 da folha canonica): a '
  'da CASA usa mesa_atendida_dia.mesas, e a por TENTATIVA usa a tabela tentativa. '
  'A tela escreve qual esta usando. `suspeitas_pct` e a metrica unica da trava de '
  'fraude, com alvo abaixo de 3% e estavel (N29).';

-- -----------------------------------------------------------------------------
-- vw_tela_pulo. /painel/coleta. Grao: uma tela por mes.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_tela_pulo with (security_invoker = true) as
select date_trunc('month', r.dia_operacional)::date as mes,
       te.tela,
       count(*)::int                              as exibicoes,
       count(*) filter (where te.pulou)::int      as pulos,
       round(count(*) filter (where te.pulou)::numeric * 100 / count(*), 1) as pulo_pct,
       (count(*) filter (where te.pulou)::numeric * 100 / count(*) > 60) as candidata_reescrita
from experiencia.resposta r
join experiencia.tela_evento te on te.resposta_id = r.id
where r.suspeita = false
group by 1, 2;

-- -----------------------------------------------------------------------------
-- vw_duracao_semana. /painel/coleta. Grao: uma semana por tipo de caminho.
-- Duracao por diferenca entre carimbos do MESMO dispositivo, nunca contra a hora do
-- servidor. Negativa ou acima de 15 minutos entra como descarte, com a contagem visivel.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_duracao_semana with (security_invoker = true) as
with limites as (
  select te.resposta_id, min(te.entrou_em) as inicio, max(te.saiu_em) as fim
  from experiencia.tela_evento te
  where te.saiu_em is not null
  group by 1
),
com_contato as (
  select distinct resposta_id from experiencia.consentimento where finalidade = 'contato'
),
dur as (
  select r.id,
         r.dia_operacional,
         extract(epoch from (l.fim - l.inicio)) as duracao_s,
         (rt.resposta_id is not null or cc.resposta_id is not null) as com_digitacao
  from experiencia.resposta r
  join limites l on l.resposta_id = r.id
  left join experiencia.resposta_texto rt on rt.resposta_id = r.id
  left join com_contato cc on cc.resposta_id = r.id
  where r.suspeita = false
)
select date_trunc('week', dia_operacional)::date as semana,
       case when com_digitacao then 'com_digitacao' else 'sem_digitacao' end as tipo_caminho,
       count(*) filter (where duracao_s between 0 and 900)::int as n,
       count(*) filter (where duracao_s < 0 or duracao_s > 900)::int as descartadas,
       round((percentile_cont(0.5) within group (order by duracao_s)
              filter (where duracao_s between 0 and 900))::numeric, 1) as mediana_s,
       round((percentile_cont(0.9) within group (order by duracao_s)
              filter (where duracao_s between 0 and 900))::numeric, 1) as p90_s,
       -- N16: teto de 45 segundos, medido como p90 do caminho SEM digitacao. Quem
       -- escreve na aberta ou deixa contato estoura os 45 s por escolha propria, e isso
       -- nao e falha, e por isso os dois caminhos aparecem separados.
       ((percentile_cont(0.9) within group (order by duracao_s)
         filter (where duracao_s between 0 and 900)) > 45
        and not com_digitacao) as p90_acima_do_teto
from dur
group by 1, 2, com_digitacao;

-- -----------------------------------------------------------------------------
-- vw_pergunta_desempenho. /painel/coleta. Grao: uma pergunta por janela.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_pergunta_desempenho with (security_invoker = true) as
with base as (
  select r.dia_operacional, rps.pergunta_banco_id, rps.respondida
  from experiencia.resposta r
  join experiencia.resposta_pergunta_sorteada rps on rps.resposta_id = r.id
  where r.suspeita = false
),
expandido as (
  select j.janela, j.inicio, j.fim, b.pergunta_banco_id, b.respondida
  from base b
  cross join lateral (values
    ('mes'::text,  date_trunc('month', b.dia_operacional)::date,
                   (date_trunc('month', b.dia_operacional) + interval '1 month' - interval '1 day')::date),
    ('trimestre',  date_trunc('quarter', b.dia_operacional)::date,
                   (date_trunc('quarter', b.dia_operacional) + interval '3 months' - interval '1 day')::date)
  ) as j(janela, inicio, fim)
),
agregado as (
  select janela, inicio, fim, pergunta_banco_id,
         count(*)::int                                as sorteadas,
         count(*) filter (where respondida)::int      as respondidas
  from expandido
  group by 1, 2, 3, 4
)
select a.janela, a.inicio, a.fim,
       a.pergunta_banco_id,
       pb.numero,
       pb.texto_pt,
       pb.dimensao,
       pb.em_foco,
       pb.em_foco_desde,
       a.sorteadas,
       a.respondidas,
       case when a.sorteadas >= 20
            then round(a.respondidas::numeric * 100 / a.sorteadas, 1)
            else null end as respondidas_pct,
       case when a.sorteadas < 20 then 'amostra insuficiente, n=' || a.sorteadas else null end as aviso
from agregado a
join experiencia.pergunta_banco pb on pb.id = a.pergunta_banco_id;

comment on view experiencia.vw_pergunta_desempenho is
  'Sorteadas E respondidas, porque sem os dois a proporcao fica errada (F23). Com n '
  'abaixo de 20 mostra o n e nao mostra proporcao (N32).';

-- -----------------------------------------------------------------------------
-- vw_venda_dia. /painel/tendencia. Grao: um dia operacional.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_venda_dia with (security_invoker = true) as
with dia as (
  select dia_operacional,
         sum(valor_liquido) as faturamento,
         sum(unidades)      as unidades
  from experiencia.venda_produto_dia
  group by 1
),
ranqueado as (
  select dia_operacional, produto_nome_norm, unidades, valor_liquido,
         row_number() over (partition by dia_operacional
                            order by unidades desc, produto_nome_norm) as rn
  from experiencia.venda_produto_dia
),
mais_vendidos as (
  select dia_operacional,
         jsonb_agg(jsonb_build_object('produto', produto_nome_norm,
                                      'unidades', unidades,
                                      'valor_liquido', valor_liquido)
                   order by rn) filter (where rn <= 2) as produtos_mais_vendidos
  from ranqueado
  group by 1
)
select d.dia_operacional,
       d.faturamento,
       d.unidades,
       m.mesas as mesas_atendidas,
       -- Ticket medio POR MESA ATENDIDA, e nao por comanda: o R3 trazer comanda e
       -- DESCONHECIDO e nada aqui pode esperar por isso (secao 9.3). O nome da coluna
       -- diz o denominador, para ninguem ler como ticket por pessoa.
       case when m.mesas is null or m.mesas = 0 then null
            else round(d.faturamento / m.mesas, 2) end as ticket_medio_por_mesa,
       v.produtos_mais_vendidos,
       case when m.mesas is null then 'denominador ausente' else null end as aviso
from dia d
left join mais_vendidos v using (dia_operacional)
left join experiencia.mesa_atendida_dia m using (dia_operacional);

-- -----------------------------------------------------------------------------
-- vw_satisfacao_venda_dia. /painel/tendencia. Grao: um dia operacional.
-- A juncao e por dia_operacional, e a tela escreve isso. Dia sem importacao aparece
-- como LACUNA EXPLICITA, nunca como zero (F41).
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_satisfacao_venda_dia with (security_invoker = true) as
with dias as (
  select dia_operacional from experiencia.resposta
  union
  select dia_operacional from experiencia.venda_produto_dia
),
sat as (
  select dia_operacional,
         count(*) filter (where suspeita = false)::int              as respostas,
         count(*) filter (where suspeita = false and faixa = 'detrator')::int as detratores,
         count(*) filter (where suspeita = false and faixa = 'promotor')::int as promotores
  from experiencia.resposta
  group by 1
),
ven as (
  select dia_operacional, sum(valor_liquido) as faturamento, sum(unidades) as unidades
  from experiencia.venda_produto_dia
  group by 1
)
select d.dia_operacional,
       experiencia.fn_casa_abre(d.dia_operacional) as casa_abre,
       s.respostas as n,
       s.detratores,
       s.promotores,
       v.faturamento,
       v.unidades,
       m.mesas as mesas_atendidas,
       case when m.mesas is null or m.mesas = 0 or v.faturamento is null then null
            else round(v.faturamento / m.mesas, 2) end as ticket_medio_por_mesa,
       case when v.faturamento is null then 'sem faturamento importado para este dia'
            when s.respostas is null then 'nenhuma resposta coletada'
            else null end as aviso
from dias d
left join sat s using (dia_operacional)
left join ven v using (dia_operacional)
left join experiencia.mesa_atendida_dia m using (dia_operacional);

comment on view experiencia.vw_satisfacao_venda_dia is
  'Os dois numeros lado a lado, em tabela, com o n da pesquisa ao lado, e NENHUM '
  'grafico de dispersao com linha de tendencia: com ate 20 mesas por dia essa '
  'correlacao e ruido, e a tela diz isso em uma linha (F41).';

-- -----------------------------------------------------------------------------
-- vw_cliente_mes. /painel/clientes. Grao: um mes.
-- Contatos contados pelo dia operacional da RESPOSTA que os trouxe, e nao pelo
-- criado_em do cliente, para que numerador e denominador da taxa usem a mesma base.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_cliente_mes with (security_invoker = true) as
with resp as (
  select date_trunc('month', dia_operacional)::date as mes,
         count(*)::int as respostas
  from experiencia.resposta
  where suspeita = false
  group by 1
),
contato as (
  select date_trunc('month', r.dia_operacional)::date as mes,
         count(distinct c.cliente_id)::int as contatos_deixados
  from experiencia.consentimento c
  join experiencia.resposta r on r.id = c.resposta_id
  where c.finalidade = 'contato' and c.cliente_id is not null and r.suspeita = false
  group by 1
),
anon as (
  select date_trunc('month', anonimizado_em at time zone 'America/Sao_Paulo')::date as mes,
         count(*)::int as anonimizados
  from experiencia.cliente
  where anonimizado_em is not null
  group by 1
)
select r.mes,
       r.respostas,
       coalesce(c.contatos_deixados, 0) as contatos_deixados,
       case when r.respostas >= 20
            then round(coalesce(c.contatos_deixados, 0)::numeric * 100 / r.respostas, 1)
            else null end as taxa_contato_pct,
       coalesce(a.anonimizados, 0) as anonimizados_no_mes,
       case when r.respostas < 20 then 'amostra insuficiente, n=' || r.respostas else null end as aviso
from resp r
left join contato c using (mes)
left join anon a using (mes);

comment on view experiencia.vw_cliente_mes is
  'A taxa de contato opcional e DESCONHECIDA e nao tem benchmark: e medicao '
  'obrigatoria desde o dia 1, porque e ela que decide se o modulo de recompra existe '
  'algum dia (F43).';

-- -----------------------------------------------------------------------------
-- vw_alerta_incidente. /painel. Grao: um alerta.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_alerta_incidente with (security_invoker = true) as
select a.id,
       a.resposta_id,
       r.dia_operacional,
       r.respondido_em,
       r.mesa_digitada,
       a.nota,
       a.fator,
       a.canal,
       a.destinatario,
       a.enviado_em,
       round(extract(epoch from (a.enviado_em - r.respondido_em))::numeric, 0) as segundos_ate_envio,
       (a.enviado_em is not null
        and a.enviado_em - r.respondido_em <= interval '30 seconds') as dentro_dos_30_s,
       a.atrasado,
       a.contato_em,
       (a.contato_em is not null) as houve_contato,
       round(extract(epoch from (a.contato_em - r.respondido_em))::numeric / 60, 1) as minutos_ate_contato,
       a.erro
from experiencia.alerta_detrator a
join experiencia.resposta r on r.id = a.resposta_id;

comment on view experiencia.vw_alerta_incidente is
  'Um incidente por linha, com "houve contato" e quanto tempo levou (F24). Enquanto '
  'nenhuma tela escrever em alerta_detrator.contato_em, `houve_contato` sai sempre '
  'falso, e isso e achado registrado no modelo de dados, nao defeito da view.';

-- -----------------------------------------------------------------------------
-- vw_dispositivo_sinal. /painel/saude. Grao: um aparelho.
-- Cada aparelho pelo APELIDO, porque com quatro pontos coletando um aparelho mudo e
-- invisivel no agregado (D5).
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_dispositivo_sinal with (security_invoker = true) as
select d.id as dispositivo_id,
       d.apelido,
       d.uso,
       d.ultimo_sinal_em,
       round(extract(epoch from (now() - d.ultimo_sinal_em))::numeric / 3600, 1) as horas_sem_sinal,
       (d.ultimo_sinal_em is null or now() - d.ultimo_sinal_em > interval '24 hours') as mudo,
       d.fila_pendente,
       (d.fila_pendente > 5) as fila_alta,
       d.versao_app,
       (select count(*)
        from experiencia.resposta r
        where r.dispositivo_id = d.id
          and r.dia_operacional = experiencia.fn_dia_operacional(now()))::int as respostas_dia_corrente
from experiencia.dispositivo d
where d.removido_em is null;

comment on view experiencia.vw_dispositivo_sinal is
  'N31: aparelho sem contato por mais de 24 horas, ou fila pendente acima de 5 por mais '
  'de 2 horas. A parte "por mais de 2 horas" nao esta aqui: `dispositivo` guarda um '
  'estado, nao a serie do estado, entao quem mede a duracao e o digest, comparando duas '
  'leituras. Fica escrito para nao ser lido como esquecimento.';

-- -----------------------------------------------------------------------------
-- vw_saude_rotina. /painel/saude. Grao: uma execucao.
-- As ultimas 30 execucoes de cada rotina, e de cada passo, com hora e status.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_saude_rotina with (security_invoker = true) as
select id, rotina, passo, iniciado_em, terminado_em, status,
       respostas_no_periodo, email_enviado, destinatarios,
       linhas_anonimizadas, mascaramentos, erro,
       round(extract(epoch from (terminado_em - iniciado_em))::numeric, 1) as duracao_s
from (
  select er.*,
         row_number() over (partition by er.rotina, coalesce(er.passo, '')
                            order by er.iniciado_em desc) as rn
  from experiencia.execucao_rotina er
) x
where rn <= 30;

-- -----------------------------------------------------------------------------
-- Grants nas dezoito. `experiencia_app` tambem le, porque o digest e montado a partir
-- das mesmas views que o painel usa: um numero, uma definicao.
-- -----------------------------------------------------------------------------
grant select on
  experiencia.vw_hoje, experiencia.vw_distribuicao_faixa_dia, experiencia.vw_nps_janela,
  experiencia.vw_semana_detrator, experiencia.vw_dia_semana, experiencia.vw_fator_contagem,
  experiencia.vw_garcom_trimestre, experiencia.vw_item_trimestre, experiencia.vw_coleta_dia,
  experiencia.vw_tela_pulo, experiencia.vw_duracao_semana, experiencia.vw_pergunta_desempenho,
  experiencia.vw_venda_dia, experiencia.vw_satisfacao_venda_dia, experiencia.vw_cliente_mes,
  experiencia.vw_alerta_incidente, experiencia.vw_dispositivo_sinal, experiencia.vw_saude_rotina
to experiencia_app, experiencia_leitura;
