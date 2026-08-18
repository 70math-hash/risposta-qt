-- =============================================================================
-- 20260817114000_ajustes_finais_da_critica.sql
--
-- Os achados menores da critica adversarial da Etapa 4: A14, A31, A40, A45, A46.
-- Menores em severidade, e nao em consequencia: dois deles sao alarme falso, e alarme falso no
-- unico alarme do sistema e o jeito mais rapido de matar a credibilidade dele.
-- =============================================================================

-- =============================================================================
-- A14. Segundo alarme falso pela mesma raiz de A13
--
-- `maior_por_dispositivo` cobria o grupo de `dispositivo_id` NULO, rotulado "sem aparelho". Como
-- resposta por QR nao tem aparelho, 31 respostas de QR num dia faziam `dispositivo_acima_do_teto`
-- acusar um aparelho que nao existe.
-- =============================================================================
drop view if exists experiencia.vw_coleta_dia;

create view experiencia.vw_coleta_dia with (security_invoker = true) as
with resp as (
  select r.dia_operacional,
         count(*)::int                                                   as respostas,
         count(*) filter (where r.canal = 'tablet')::int                 as respostas_tablet,
         count(*) filter (where r.canal = 'qr')::int                     as respostas_qr,
         count(*) filter (where r.suspeita)::int                         as suspeitas,
         -- SO o canal `tablet` (A13): resposta por QR nao passa pela T0 e nao tem PIN.
         count(*) filter (where r.canal = 'tablet' and r.garcom_reconhecido = false)::int
                                                                          as pin_nao_reconhecido,
         count(distinct r.dispositivo_id) filter (where r.dispositivo_id is not null)::int
                                                                          as aparelhos
  from experiencia.resposta r
  group by 1
),
por_aparelho as (
  -- `where dispositivo_id is not null` (A14): sem isso, o grupo do nulo — que e o QR inteiro —
  -- entrava no maximo e acusava um aparelho que nao existe.
  select r.dia_operacional, r.dispositivo_id, count(*)::int as n
  from experiencia.resposta r
  where r.dispositivo_id is not null
  group by 1, 2
),
maior as (
  select dia_operacional,
         max(n)::int as maior_por_dispositivo,
         jsonb_object_agg(dispositivo_id::text, n) as respostas_por_dispositivo
  from por_aparelho
  group by 1
),
tent as (
  select t.dia_operacional,
         count(*)::int                                        as tentativas,
         count(*) filter (where t.desfecho = 'recusou')::int   as recusas
  from experiencia.tentativa t
  group by 1
),
dias as (
  select dia_operacional from resp
  union select dia_operacional from tent
  union select dia_operacional from experiencia.mesa_atendida_dia
)
select d.dia_operacional,
       experiencia.fn_casa_abre(d.dia_operacional)          as casa_abre,
       coalesce(r.respostas, 0)                             as respostas,
       m.mesas                                              as mesas_atendidas,
       case when m.mesas is not null and m.mesas > 0
            then round(coalesce(r.respostas, 0)::numeric * 100 / m.mesas, 1)
            else null end                                   as conversao_casa_pct,
       coalesce(t.tentativas, 0)                            as tentativas,
       coalesce(t.recusas, 0)                               as recusas,
       case when coalesce(t.tentativas, 0) > 0
            then round(coalesce(r.respostas_tablet, 0)::numeric * 100 / t.tentativas, 1)
            else null end                                   as conversao_tentativa_pct,
       coalesce(r.suspeitas, 0)                             as suspeitas,
       case when coalesce(r.respostas, 0) > 0
            then round(coalesce(r.suspeitas, 0)::numeric * 100 / r.respostas, 1)
            else null end                                   as suspeitas_pct,
       coalesce(r.pin_nao_reconhecido, 0)                   as pin_nao_reconhecido,
       (coalesce(r.pin_nao_reconhecido, 0) > 3)             as pin_acima_do_limiar,
       coalesce(r.respostas_tablet, 0)                      as respostas_tablet,
       coalesce(r.respostas_qr, 0)                          as respostas_qr,
       g.respostas_por_dispositivo,
       coalesce(g.maior_por_dispositivo, 0)                 as maior_por_dispositivo,
       -- Compara contra as respostas de TABLET, e nao contra o total: com QR no denominador, um dia
       -- de muito QR faria o tablet parecer minoritario e o teto nunca dispararia.
       (coalesce(r.aparelhos, 0) > 1
        and coalesce(r.respostas_tablet, 0) > 0
        and coalesce(g.maior_por_dispositivo, 0)::numeric / r.respostas_tablet > 0.7)
                                                            as dispositivo_acima_do_teto,
       case
         when m.mesas is null and experiencia.fn_casa_abre(d.dia_operacional)
           then 'mesas atendidas nao informadas: sem elas nao existe conversao da casa'
         when coalesce(r.respostas, 0) = 0 and coalesce(t.tentativas, 0) > 0
           then 'toda abordagem foi recusada neste dia'
         else null
       end                                                  as aviso
from dias d
left join resp r on r.dia_operacional = d.dia_operacional
left join tent t on t.dia_operacional = d.dia_operacional
left join maior g on g.dia_operacional = d.dia_operacional
left join experiencia.mesa_atendida_dia m on m.dia_operacional = d.dia_operacional
order by d.dia_operacional desc;

comment on view experiencia.vw_coleta_dia is
  'A coleta por dia. Duas defesas contra alarme falso: `pin_nao_reconhecido` conta so o canal '
  'tablet, e o maximo por aparelho ignora o grupo sem aparelho, que e o QR inteiro. A dimensao de '
  'dia sai da uniao de resposta, tentativa e mesas atendidas.';

grant select on experiencia.vw_coleta_dia to experiencia_app, experiencia_leitura;

-- =============================================================================
-- A45. `vw_cliente_mes` agrupava por mes CIVIL num lado e por dia operacional no outro
--
-- A folha, secao 4.7, diz "todo corte de painel agrupa por `dia_operacional`, SEM EXCECAO". A
-- coluna de anonimizados usava `at time zone` sobre `anonimizado_em`, entao uma anonimizacao da
-- madrugada caia num mes e as respostas da mesma noite no outro.
-- =============================================================================
create or replace view experiencia.vw_cliente_mes with (security_invoker = true) as
with resp as (
  select date_trunc('month', r.dia_operacional)::date as mes,
         count(*)::int as respostas,
         count(distinct c.id)::int as contatos_deixados
  from experiencia.resposta r
  left join experiencia.consentimento co
    on co.resposta_id = r.id and co.finalidade = 'contato'
  left join experiencia.cliente c on c.id = co.cliente_id
  where r.suspeita = false
  group by 1
),
anon as (
  -- `fn_dia_operacional`, e nao `at time zone`: a anonimizacao roda no dia 1 as 5h da manha, que
  -- pelo corte das 6h ainda pertence ao ultimo dia do mes anterior. Com mes civil, ela caia num mes
  -- e as respostas da mesma noite no outro.
  select date_trunc('month', experiencia.fn_dia_operacional(c.anonimizado_em))::date as mes,
         count(*)::int as anonimizados_no_mes
  from experiencia.cliente c
  where c.anonimizado_em is not null
  group by 1
),
meses as (
  select mes from resp union select mes from anon
)
select m.mes,
       coalesce(r.respostas, 0)          as respostas,
       coalesce(r.contatos_deixados, 0)  as contatos_deixados,
       case when coalesce(r.respostas, 0) >= 20
            then round(coalesce(r.contatos_deixados, 0)::numeric * 100 / r.respostas, 1)
            else null end                as taxa_contato_pct,
       coalesce(a.anonimizados_no_mes, 0) as anonimizados_no_mes,
       case when coalesce(r.respostas, 0) < 20
            then 'amostra insuficiente, n=' || coalesce(r.respostas, 0)
            else null end                as aviso
from meses m
left join resp r on r.mes = m.mes
left join anon a on a.mes = m.mes
order by m.mes desc;

comment on view experiencia.vw_cliente_mes is
  'Contato por mes. O mes sai de `dia_operacional` nos TRES lados, inclusive na anonimizacao: a '
  'rotina roda as 5h do dia 1, que pelo corte das 6h ainda pertence ao mes anterior.';

grant select on experiencia.vw_cliente_mes to experiencia_app, experiencia_leitura;

-- =============================================================================
-- A46. `lag()` sobre semanas que TEM resposta, e nao sobre semanas de calendario
--
-- Duas semanas separadas por uma semana sem resposta viravam "semana anterior" uma da outra, e o
-- alerta de queda comparava periodos nao adjacentes. O guarda de `dias_abertos` iguais pegava parte
-- dos casos, e nao todos.
-- =============================================================================
create or replace view experiencia.vw_semana_detrator with (security_invoker = true) as
with base as (
  select date_trunc('week', r.dia_operacional)::date as semana,
         count(*) filter (where r.faixa = 'detrator')::int as detratores,
         count(*)::int                                     as respostas,
         count(distinct r.dia_operacional)::int            as dias_abertos
  from experiencia.resposta r
  where r.suspeita = false
  group by 1
),
-- A GRADE de semanas de calendario, do primeiro ao ultimo. Semana sem resposta passa a EXISTIR com
-- zero, e o `lag()` volta a ser de fato a semana anterior.
grade as (
  select generate_series(
           (select min(semana) from base),
           (select max(semana) from base),
           interval '7 days'
         )::date as semana
),
completo as (
  select g.semana,
         coalesce(b.detratores, 0)   as detratores,
         coalesce(b.respostas, 0)    as respostas,
         coalesce(b.dias_abertos, 0) as dias_abertos
  from grade g
  left join base b on b.semana = g.semana
)
select c.semana,
       c.detratores,
       c.respostas,
       c.dias_abertos,
       lag(c.detratores)   over (order by c.semana) as detratores_semana_anterior,
       lag(c.dias_abertos) over (order by c.semana) as dias_abertos_semana_anterior,
       -- Alerta so quando as duas semanas sao comparaveis: mesmo numero de dias abertos, e a
       -- anterior com pelo menos uma resposta.
       (c.detratores >= 2 * greatest(lag(c.detratores) over (order by c.semana), 1)
        and lag(c.dias_abertos) over (order by c.semana) = c.dias_abertos
        and coalesce(lag(c.respostas) over (order by c.semana), 0) > 0) as alerta_queda,
       (lag(c.dias_abertos) over (order by c.semana) is distinct from c.dias_abertos
        or coalesce(lag(c.respostas) over (order by c.semana), 0) = 0)  as semana_incomparavel
from completo c
order by c.semana desc;

comment on view experiencia.vw_semana_detrator is
  'Detratores por semana operacional. A grade e de semanas de CALENDARIO: sem ela, duas semanas '
  'separadas por uma semana sem resposta viravam vizinhas e o alerta comparava periodos nao '
  'adjacentes.';

grant select on experiencia.vw_semana_detrator to experiencia_app, experiencia_leitura;

-- =============================================================================
-- A40. A regra 6 do sorteio usava o relogio do SERVIDOR
--
-- `fn_sorteia_pergunta` calculava o dia com `now()`, enquanto o `dia_operacional` da resposta sai de
-- `respondido_em`. Numa resposta enviada da fila offline no dia seguinte, as duas noites divergem e
-- a regra "nao repetir na mesma mesa na mesma noite" olha para a noite errada.
--
-- O terceiro parametro tem DEFAULT, entao a assinatura de dois argumentos que a folha fixa continua
-- valendo e as chamadas existentes nao mudam.
-- =============================================================================
create or replace function experiencia.fn_sorteia_pergunta(
  p_resposta_id   uuid,
  p_mesa_digitada text,
  p_momento       timestamptz default now()
)
returns setof uuid
language plpgsql
volatile
as $$
declare
  v_nota      smallint;
  v_quantas   integer;
  v_dia       date;
begin
  -- O momento da RESPOSTA quando ela ja existe, e o parametro (que por omissao e agora) quando
  -- ainda nao: o sorteio normal acontece no meio do fluxo, antes da gravacao.
  select r.nota, r.respondido_em into v_nota, v_dia
  from experiencia.resposta r where r.id = p_resposta_id;
  v_dia := experiencia.fn_dia_operacional(coalesce(v_dia::timestamptz, p_momento));

  v_quantas := case
                 when v_nota is null then 2
                 when v_nota <= 6 then 0
                 when v_nota <= 8 then 1
                 else 2
               end;

  if v_quantas = 0 then
    return;
  end if;

  return query
  with ativas as (
    select pb.id, pb.dimensao, pb.em_foco,
           case pb.peso when 'alto' then 4.0 when 'medio' then 2.0 else 1.0 end as w
    from experiencia.pergunta_banco pb
    where pb.ativa = true
      and not exists (
        select 1 from experiencia.resposta_opcao ro
        where ro.resposta_id = p_resposta_id and ro.dimensao = pb.dimensao
      )
      and not exists (
        select 1
        from experiencia.resposta_pergunta_sorteada rps
        join experiencia.resposta r2 on r2.id = rps.resposta_id
        where rps.pergunta_banco_id = pb.id
          and r2.dia_operacional = v_dia
          and p_mesa_digitada is not null
          and upper(btrim(r2.mesa_digitada)) = upper(btrim(p_mesa_digitada))
      )
  ),
  soma as (
    select sum(w) filter (where em_foco) as w_foco, sum(w) filter (where not em_foco) as w_resto
    from ativas
  ),
  pesada as (
    select a.id, a.dimensao,
           a.w * case when a.em_foco and coalesce(s.w_foco, 0) > 0
                      then coalesce(s.w_resto, 0) / s.w_foco else 1 end as peso_final
    from ativas a cross join soma s
  ),
  chaves as (
    select id, dimensao, random() ^ (1.0 / greatest(peso_final, 0.0001)) as chave from pesada
  ),
  sorteada as (
    select id, dimensao, chave,
           row_number() over (partition by dimensao order by chave desc) as rn_dimensao
    from chaves
  )
  select id from sorteada where rn_dimensao = 1 order by chave desc limit v_quantas;
end
$$;

comment on function experiencia.fn_sorteia_pergunta(uuid, text, timestamptz) is
  'As sete regras de sorteio. O dia da regra 6 sai de `respondido_em` da resposta quando ela existe, '
  'e nao do relogio do servidor: numa resposta enviada da fila offline no dia seguinte, as duas '
  'noites divergem e a regra olharia para a noite errada.';

grant execute on function experiencia.fn_sorteia_pergunta(uuid, text, timestamptz) to experiencia_app;

-- A assinatura de dois argumentos sai, para nao existirem duas versoes divergentes da mesma regra.
drop function if exists experiencia.fn_sorteia_pergunta(uuid, text);

-- =============================================================================
-- A31. Cinco indices que nao servem consulta nenhuma
--
-- A regra do proprio documento e "cada indice existe por uma consulta nomeada". Estes cinco nao
-- tem: nenhuma view filtra `nota <= 6` (todas filtram `faixa = 'detrator'`), `count(*) filter` nao
-- usa indice parcial, e os outros tres servem ordenacoes que ninguem pede.
--
-- Indice sem consulta nao e neutro: ele custa em toda escrita, e no plano gratuito o que se paga em
-- escrita e o que sobra de espaco e de tempo.
-- =============================================================================
drop index if exists experiencia.resposta_detrator_idx;
drop index if exists experiencia.resposta_suspeita_idx;
drop index if exists experiencia.cliente_criado_em_idx;
drop index if exists experiencia.tela_evento_tela_idx;
drop index if exists experiencia.consentimento_aceito_idx;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select on experiencia.vw_coleta_dia, experiencia.vw_cliente_mes, '
            'experiencia.vw_semana_detrator to authenticated';
  end if;
end
$$;
