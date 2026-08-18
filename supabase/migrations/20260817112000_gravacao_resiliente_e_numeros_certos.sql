-- =============================================================================
-- 20260817112000_gravacao_resiliente_e_numeros_certos.sql
--
-- O QUE FAZ
--   Cinco correcoes achadas pela critica adversarial da Etapa 4 (A13, A16, A18, A19, A28). A do
--   meio, A19, e estrutural: ela faz uma filha malformada deixar de custar a resposta inteira.
--
-- =============================================================================
-- A19. A NOTA NAO SE PERDE POR CAUSA DE UMA FILHA
-- =============================================================================
--   Tres dos quatro erros mais graves deste projeto tiveram a MESMA forma: um valor que o codigo
--   escreve e o banco recusa, numa tabela filha inserida dentro de `fn_grava_resposta`. Como e a
--   mesma transacao, a filha recusada derrubava a RESPOSTA INTEIRA.
--
--     A01  `tela_evento.tela` aceitava `T3`/`T4` e o codigo escrevia `ROT1`/`ROT2`  (~85% de tudo)
--     A02  `resposta_opcao.tela` recusava `ROT1`, que o codigo escrevia
--     A04  `consentimento.versao_texto` sem a versao semeada                        (100% de tudo)
--
--   Os tres foram consertados um a um. Isto conserta a CLASSE: a partir daqui, uma filha que o
--   banco recusa e registrada e descartada, e a resposta entra.
--
--   A HIERARQUIA E DELIBERADA. A nota e o unico dado obrigatorio do sistema — a T1 e a unica tela
--   que nao se pula. Opcao marcada, item apontado, carimbo de tela e consentimento sao valiosos e
--   NENHUM deles vale a nota. Perder uma opcao e perder um detalhe; perder a resposta e perder o
--   cliente que parou para responder.
--
--   E O DESCARTE NAO E SILENCIOSO, que e a diferenca entre isto e engolir erro: cada filha recusada
--   entra em `resposta.diagnostico`, com a mensagem do banco, e `vw_gravacao_diagnostico` conta as
--   recusas por tipo. Uma tela quebrada aparece como uma linha subindo, e nao como um numero que
--   nunca mais volta.
--
--   O QUE NAO E PROTEGIDO ASSIM: a propria linha de `resposta`. Se ela nao entra, nao ha o que
--   preservar, e o erro sobe para o Worker, que devolve 502, e a fila do tablet retenta. Isso e
--   certo: falha de gravacao da resposta e um problema que TEM de aparecer.
-- =============================================================================

alter table experiencia.resposta
  add column if not exists diagnostico jsonb null;

comment on column experiencia.resposta.diagnostico is
  'As filhas que o banco recusou nesta gravacao, com a mensagem de erro. Nulo e o caso normal. '
  'Existe porque filha recusada derrubava a resposta inteira, e a nota e o unico dado que nao pode '
  'ser perdido: agora a filha e descartada, registrada aqui, e a resposta entra.';

-- =============================================================================
-- A28. `on conflict` que nunca disparava
--
-- `unique (resposta_id, grupo, item_cardapio_id)` nao impede duplicata quando `item_cardapio_id` e
-- NULO, porque em UNIQUE os nulos sao distintos entre si. E ele e nulo JUSTAMENTE nos dois casos
-- mais comuns: `prefiro nao dizer` e o grupo `mais_de_um`. Portanto o `on conflict` de
-- `fn_grava_resposta` nunca disparava nesses casos, e um payload com repeticao gravava duas linhas
-- — dobrando a reclamacao daquele item na contagem.
-- =============================================================================
alter table experiencia.resposta_item
  drop constraint if exists resposta_item_uq;

alter table experiencia.resposta_item
  add constraint resposta_item_uq
  unique nulls not distinct (resposta_id, grupo, item_cardapio_id);

comment on constraint resposta_item_uq on experiencia.resposta_item is
  '`nulls not distinct` porque `item_cardapio_id` e nulo em `prefiro nao dizer` e em `mais_de_um`, '
  'e com a regra padrao de UNIQUE dois nulos nao colidem: o `on conflict` da gravacao nunca '
  'disparava e a mesma reclamacao entrava duas vezes.';

-- =============================================================================
-- A18. A amostragem por peso, com UMA chave
--
-- `random()` era chamada DUAS vezes e independentemente: uma no `order by` do `row_number()` e
-- outra como `chave`. Entao o vencedor de cada dimensao saia de um sorteio e a ordenacao final de
-- outro, e a amostragem por peso (Efraimidis-Spirakis) deixava de valer: o peso influenciava quem
-- ganhava a dimensao e depois era jogado fora na escolha das melhores.
-- =============================================================================
create or replace function experiencia.fn_sorteia_pergunta(
  p_resposta_id   uuid,
  p_mesa_digitada text
)
returns setof uuid
language plpgsql
volatile
as $$
declare
  v_nota      smallint;
  v_quantas   integer;
  v_dia       date := experiencia.fn_dia_operacional(now());
begin
  select r.nota into v_nota from experiencia.resposta r where r.id = p_resposta_id;

  -- Regra 1, pela faixa: promotor 2, neutro 1, detrator 0.
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
    select pb.id,
           pb.dimensao,
           pb.em_foco,
           case pb.peso when 'alto' then 4.0 when 'medio' then 2.0 else 1.0 end as w
    from experiencia.pergunta_banco pb
    where pb.ativa = true
      -- Regra 3: suprime a dimensao ja coberta pela ramificacao de nota baixa.
      and not exists (
        select 1 from experiencia.resposta_opcao ro
        where ro.resposta_id = p_resposta_id
          and ro.dimensao = pb.dimensao
      )
      -- Regra 6: nao repete na mesma mesa na mesma noite.
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
    select sum(w) filter (where em_foco)     as w_foco,
           sum(w) filter (where not em_foco) as w_resto
    from ativas
  ),
  pesada as (
    -- Regra 4: o fator de foco iguala o peso total das em foco ao das demais. Isso da
    -- APROXIMADAMENTE metade das impressoes as perguntas em foco, e nao exatamente: a
    -- deduplicacao por dimensao (regra 2) e a supressao da regra 3 mudam o conjunto a cada
    -- resposta, e nenhum peso fixo sobrevive a isso como igualdade exata. O comentario anterior
    -- dizia "exatamente 50%", e era falso.
    select a.id,
           a.dimensao,
           a.w * case
                   when a.em_foco and coalesce(s.w_foco, 0) > 0
                     then coalesce(s.w_resto, 0) / s.w_foco
                   else 1
                 end as peso_final
    from ativas a cross join soma s
  ),
  -- A CHAVE, calculada UMA VEZ por pergunta. Antes eram duas chamadas independentes de `random()`,
  -- e com isso o peso decidia quem ganhava a dimensao e era descartado na escolha final.
  chaves as (
    select id, dimensao, random() ^ (1.0 / greatest(peso_final, 0.0001)) as chave
    from pesada
  ),
  sorteada as (
    select id,
           dimensao,
           chave,
           row_number() over (partition by dimensao order by chave desc) as rn_dimensao
    from chaves
  )
  -- Regra 2: uma por dimensao, e so entao as `v_quantas` melhores chaves. A MESMA chave nos dois
  -- passos, que e o que faz a amostragem por peso valer.
  select id from sorteada where rn_dimensao = 1 order by chave desc limit v_quantas;
end
$$;

comment on function experiencia.fn_sorteia_pergunta(uuid, text) is
  'As sete regras de sorteio do banco de perguntas. A chave de amostragem por peso e calculada UMA '
  'vez e usada nos dois passos: com duas chamadas de random(), o peso decidia a dimensao e era '
  'jogado fora na escolha final.';

grant execute on function experiencia.fn_sorteia_pergunta(uuid, text) to experiencia_app;

-- =============================================================================
-- A13. PIN nao reconhecido contava resposta de QR
--
-- Resposta por QR nao passa pela T0, nao tem PIN, e nasce com `garcom_reconhecido = false`. A
-- contagem somava essas, entao com 4 respostas de QR num dia o limiar disparava e o digest cobrava
-- um problema que nao existe. Alarme falso no UNICO alarme do sistema e o jeito mais rapido de
-- matar a credibilidade dele.
--
-- A16. `vw_hoje` mostrava o dia corrente com contagem parcial
--
-- A folha define a view sobre o dia operacional FECHADO. Ela nao filtrava nada, entao o dia em
-- coleta aparecia com contagem parcial e `conversao_pct` sobre um denominador cheio: numero
-- plausivel e errado, que e o risco nomeado no ADR-05.
--
-- A coluna `fechado` e melhor que o filtro: preserva a leitura do dia corrente com rotulo honesto,
-- em vez de esconder o dia de hoje de quem esta olhando durante o expediente.
-- =============================================================================
-- `drop` antes de criar, e nao `create or replace`: a coluna `fechado` entra no MEIO da lista, e
-- `create or replace view` recusa mudar nome ou ordem de coluna existente. Sem `cascade`, de
-- proposito: se algo passar a depender destas views, o `drop` falha e diz o que depende, em vez de
-- derrubar o dependente em silencio.
drop view if exists experiencia.vw_hoje;

create view experiencia.vw_hoje with (security_invoker = true) as
with base as (
  select r.dia_operacional,
         count(*)::int                                              as respostas,
         count(*) filter (where r.faixa = 'detrator')::int           as detratores,
         count(*) filter (where r.faixa = 'neutro')::int             as neutros,
         count(*) filter (where r.faixa = 'promotor')::int           as promotores,
         count(*) filter (where r.suspeita)::int                     as suspeitas
  from experiencia.resposta r
  where r.suspeita = false
  group by 1
),
suspeitas as (
  select r.dia_operacional, count(*)::int as suspeitas
  from experiencia.resposta r
  where r.suspeita = true
  group by 1
)
select b.dia_operacional,
       experiencia.fn_casa_abre(b.dia_operacional)                   as casa_abre,
       -- O dia FECHOU? A tela e obrigada a ler isto: contagem parcial com aparencia de final e o
       -- risco nomeado no ADR-05.
       (b.dia_operacional < experiencia.fn_dia_operacional(now()))   as fechado,
       b.respostas,
       b.detratores,
       b.neutros,
       b.promotores,
       coalesce(s.suspeitas, 0)                                      as suspeitas,
       m.mesas                                                       as mesas_atendidas,
       case when m.mesas is not null and m.mesas > 0
            then round(b.respostas::numeric * 100 / m.mesas, 1)
            else null end                                            as conversao_pct,
       case
         when b.dia_operacional >= experiencia.fn_dia_operacional(now())
           then 'dia ainda em coleta: a contagem e parcial e a conversao nao vale'
         when b.respostas < 20
           then 'amostra insuficiente, n=' || b.respostas
         when m.mesas is null
           then 'mesas atendidas nao informadas: sem elas nao existe conversao'
         else null
       end                                                           as aviso
from base b
left join suspeitas s on s.dia_operacional = b.dia_operacional
left join experiencia.mesa_atendida_dia m on m.dia_operacional = b.dia_operacional
order by b.dia_operacional desc;

comment on view experiencia.vw_hoje is
  'O dia operacional em contagem. A coluna `fechado` diz se o dia terminou: sem ela, o dia em '
  'coleta aparecia com contagem parcial e conversao sobre denominador cheio, que e numero '
  'plausivel e errado (ADR-05).';

grant select on experiencia.vw_hoje to experiencia_app, experiencia_leitura;

drop view if exists experiencia.vw_coleta_dia;

create view experiencia.vw_coleta_dia with (security_invoker = true) as
with resp as (
  select r.dia_operacional,
         count(*)::int                                                   as respostas,
         count(*) filter (where r.canal = 'tablet')::int                 as respostas_tablet,
         count(*) filter (where r.canal = 'qr')::int                     as respostas_qr,
         count(*) filter (where r.suspeita)::int                         as suspeitas,
         -- SO o canal `tablet`. Resposta por QR nao passa pela T0, nao tem PIN, e nasce com
         -- `garcom_reconhecido = false`: conta-la aqui fazia o limiar disparar num dia com 4
         -- respostas de QR, e o digest cobrava um problema que nao existe.
         count(*) filter (where r.canal = 'tablet' and r.garcom_reconhecido = false)::int
                                                                          as pin_nao_reconhecido,
         count(distinct r.dispositivo_id) filter (where r.dispositivo_id is not null)::int
                                                                          as aparelhos,
         jsonb_object_agg(coalesce(r.dispositivo_id::text, 'sem aparelho'), 1)
           filter (where r.dispositivo_id is not null)                    as respostas_por_dispositivo
  from experiencia.resposta r
  group by 1
),
por_aparelho as (
  select r.dia_operacional, r.dispositivo_id, count(*)::int as n
  from experiencia.resposta r
  where r.dispositivo_id is not null
  group by 1, 2
),
maior as (
  select dia_operacional, max(n)::int as maior_por_dispositivo
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
-- A dimensao de dia sai da UNIAO. Uma noite em que TODA abordagem foi recusada nao produz linha em
-- `resposta`, e sem a uniao esse dia desaparecia da tela — que e exatamente o dia que mais precisa
-- aparecer.
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
       r.respostas_por_dispositivo,
       coalesce(g.maior_por_dispositivo, 0)                 as maior_por_dispositivo,
       -- Um aparelho respondendo por mais de 70% do dia, com mais de um aparelho em uso, e sinal de
       -- que os outros estao desligados ou com endereco errado.
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
  'A coleta por dia. `pin_nao_reconhecido` conta SO o canal tablet: resposta por QR nao tem PIN e '
  'contava como nao reconhecida, disparando alarme falso. A dimensao de dia sai da uniao de '
  'resposta, tentativa e mesas atendidas, para a noite em que toda abordagem foi recusada aparecer.';

grant select on experiencia.vw_coleta_dia to experiencia_app, experiencia_leitura;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select on experiencia.vw_hoje, experiencia.vw_coleta_dia to authenticated';
  end if;
end
$$;

-- =============================================================================
-- A19. `fn_grava_resposta`, com cada filha protegida.
--
-- A resposta entra. Cada filha e tentada dentro do proprio bloco de excecao; a que o banco recusa e
-- REGISTRADA em `resposta.diagnostico` e descartada, e as outras seguem.
--
-- POR QUE ISTO NAO E ENGOLIR ERRO
--   Engolir erro e nao deixar rastro. Aqui cada recusa vira uma entrada com o tipo da filha, o
--   valor que falhou e a mensagem do banco, e `vw_gravacao_diagnostico` conta as recusas por tipo
--   nos ultimos dias. Uma tela quebrada vira uma linha subindo num painel, e nao um numero que
--   nunca mais volta.
--
-- A ORDEM DAS PRIORIDADES, escrita uma vez
--   1. A resposta (a nota). Se ela falhar, o erro SOBE: falha de gravacao da resposta tem de
--      aparecer, e a fila do tablet retenta.
--   2. Tudo o mais. Vale muito, e nao vale a nota.
-- =============================================================================
create or replace function experiencia.fn_grava_resposta(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = experiencia, public, pg_temp
as $$
declare
  v_id              uuid        := nullif(p->>'id','')::uuid;
  v_desfecho        text        := coalesce(nullif(p->>'desfecho',''), 'respondeu');
  v_agora           timestamptz := now();
  v_cliente_ts      timestamptz := nullif(p->>'criado_em_cliente','')::timestamptz;
  v_respondido      timestamptz;
  v_dia             date;
  v_canal           text        := coalesce(nullif(p->>'canal',''), 'tablet');
  v_dispositivo_id  uuid        := nullif(p->>'dispositivo_id','')::uuid;
  v_mesa_digitada   text        := nullif(btrim(coalesce(p->>'mesa_digitada','')), '');
  v_mesa_id         uuid;
  v_pin             text        := nullif(btrim(coalesce(p->>'garcom_pin_digitado','')), '');
  v_garcom_id       uuid;
  v_nota            smallint;
  v_janela          integer;
  v_atraso          integer;
  v_suspeita        boolean     := false;
  v_motivo          text        := null;
  v_gravado         uuid;
  v_cliente_id      uuid;
  v_destinatario    text;
  v_contato         jsonb       := p->'contato';
  v_fator           text;
  v_diag            jsonb       := '[]'::jsonb;
  r                 jsonb;
begin
  if v_id is null then
    raise exception 'fn_grava_resposta: payload sem `id`. A idempotencia depende do uuid v4 gerado no cliente';
  end if;
  if v_canal = 'tablet' and v_pin is null then
    raise exception 'fn_grava_resposta: resposta de tablet sem `garcom_pin_digitado`. A T0 nao deixa passar campo vazio (F04)';
  end if;

  if v_cliente_ts is not null
     and abs(extract(epoch from (v_agora - v_cliente_ts))) <= 48 * 3600 then
    v_respondido := v_cliente_ts;
  else
    v_respondido := v_agora;
  end if;
  v_dia := experiencia.fn_dia_operacional(v_respondido);

  if v_mesa_digitada is not null then
    select m.id into v_mesa_id
    from experiencia.mesa m
    where upper(btrim(m.numero)) = upper(v_mesa_digitada);
  end if;

  if v_pin is not null then
    select g.id into v_garcom_id
    from experiencia.garcom g
    where g.pin = v_pin and g.removido_em is null and g.ativo = true;
  end if;

  -- ---------------------------------------------------------------------------
  -- Caminho da recusa: uma linha em `tentativa`, e nada mais.
  -- ---------------------------------------------------------------------------
  if v_desfecho = 'recusou' then
    if v_pin is null then
      raise exception 'fn_grava_resposta: recusa sem `garcom_pin_digitado`. A recusa e registrada na T0, e a T0 exige PIN (F05)';
    end if;
    insert into experiencia.tentativa (
      id, criado_em_cliente, dia_operacional, desfecho, canal, dispositivo_id,
      mesa_digitada, mesa_id, garcom_pin_digitado, garcom_id, garcom_reconhecido)
    values (
      v_id, v_cliente_ts, v_dia, 'recusou', v_canal, v_dispositivo_id,
      v_mesa_digitada, v_mesa_id, v_pin, v_garcom_id, v_garcom_id is not null)
    on conflict (id) do nothing;
    return v_id;
  end if;

  -- ---------------------------------------------------------------------------
  -- A RESPOSTA. Esta NAO e protegida por bloco de excecao: se ela falhar, nao ha o que preservar,
  -- e o erro tem de subir para o Worker devolver 502 e a fila retentar.
  -- ---------------------------------------------------------------------------
  v_nota := (p->>'nota')::smallint;
  if v_nota is null then
    raise exception 'fn_grava_resposta: payload sem `nota`. A T1 e a unica tela obrigatoria';
  end if;

  select coalesce(max(c.valor)::integer, 20) into v_janela
  from experiencia.configuracao c where c.chave = 'janela_duplicidade_minutos';

  if v_mesa_id is not null then
    if exists (
      select 1 from experiencia.resposta r
      where r.mesa_id = v_mesa_id
        and r.id <> v_id
        and r.dia_operacional = v_dia
        and abs(extract(epoch from (r.respondido_em - v_respondido))) < v_janela * 60
    ) then
      v_suspeita := true;
      v_motivo := format('segunda resposta da mesa %s em menos de %s minutos', v_mesa_digitada, v_janela);
    end if;
  end if;

  insert into experiencia.resposta (
    id, criado_em_cliente, respondido_em, nota, canal, dispositivo_id,
    mesa_digitada, mesa_id, garcom_pin_digitado, garcom_id, garcom_reconhecido,
    idioma, suspeita, suspeita_motivo, versao_app, versao_questionario)
  values (
    v_id, v_cliente_ts, v_respondido, v_nota, v_canal, v_dispositivo_id,
    v_mesa_digitada, v_mesa_id, v_pin, v_garcom_id, v_garcom_id is not null,
    coalesce(nullif(p->>'idioma',''), 'pt'), v_suspeita, v_motivo,
    nullif(p->>'versao_app',''), coalesce(nullif(p->>'versao_questionario',''), 'desconhecida'))
  on conflict (id) do nothing
  returning id into v_gravado;

  if v_gravado is null then
    return v_id;
  end if;

  -- A tentativa de par, SO no canal `tablet`. Protegida: ela e o denominador da conversao por
  -- garcom, e vale muito, e nao vale a nota.
  if v_canal = 'tablet' then
    begin
      insert into experiencia.tentativa (
        id, criado_em_cliente, dia_operacional, desfecho, canal, dispositivo_id,
        mesa_digitada, mesa_id, garcom_pin_digitado, garcom_id, garcom_reconhecido)
      values (
        v_id, v_cliente_ts, v_dia, 'respondeu', v_canal, v_dispositivo_id,
        v_mesa_digitada, v_mesa_id, v_pin, v_garcom_id, v_garcom_id is not null)
      on conflict (id) do nothing;
    exception when others then
      v_diag := v_diag || jsonb_build_object('filha', 'tentativa', 'erro', sqlerrm);
    end;
  end if;

  for r in select jsonb_array_elements(coalesce(p->'opcoes', '[]'::jsonb)) loop
    begin
      insert into experiencia.resposta_opcao (resposta_id, tela, opcao_codigo, dimensao, fator)
      values (v_id, r->>'tela', r->>'opcao_codigo', r->>'dimensao', nullif(r->>'fator',''))
      on conflict (resposta_id, tela, opcao_codigo) do nothing;
    exception when others then
      v_diag := v_diag || jsonb_build_object(
        'filha', 'resposta_opcao', 'valor', r, 'erro', sqlerrm);
    end;
  end loop;

  for r in select jsonb_array_elements(coalesce(p->'itens', '[]'::jsonb)) loop
    begin
      insert into experiencia.resposta_item (resposta_id, grupo, item_cardapio_id, fator)
      values (v_id, r->>'grupo', nullif(r->>'item_cardapio_id','')::uuid, nullif(r->>'fator',''))
      on conflict (resposta_id, grupo, item_cardapio_id) do nothing;
    exception when others then
      v_diag := v_diag || jsonb_build_object('filha', 'resposta_item', 'valor', r, 'erro', sqlerrm);
    end;
  end loop;

  if nullif(btrim(coalesce(p#>>'{texto,texto_cru}','')), '') is not null then
    begin
      insert into experiencia.resposta_texto (resposta_id, texto_cru)
      values (v_id, btrim(p#>>'{texto,texto_cru}'))
      on conflict (resposta_id) do nothing;
    exception when others then
      v_diag := v_diag || jsonb_build_object('filha', 'resposta_texto', 'erro', sqlerrm);
    end;
  end if;

  for r in select jsonb_array_elements(coalesce(p->'sorteadas', '[]'::jsonb)) loop
    begin
      insert into experiencia.resposta_pergunta_sorteada (
        resposta_id, pergunta_banco_id, respondida, opcao_indice)
      values (
        v_id, (r->>'pergunta_banco_id')::uuid,
        coalesce((r->>'respondida')::boolean, false),
        nullif(r->>'opcao_indice','')::smallint)
      on conflict (resposta_id, pergunta_banco_id) do nothing;
    exception when others then
      v_diag := v_diag || jsonb_build_object(
        'filha', 'resposta_pergunta_sorteada', 'valor', r, 'erro', sqlerrm);
    end;
  end loop;

  for r in select jsonb_array_elements(coalesce(p->'telas', '[]'::jsonb)) loop
    begin
      insert into experiencia.tela_evento (resposta_id, tela, entrou_em, saiu_em, pulou)
      values (
        v_id, r->>'tela', (r->>'entrou_em')::timestamptz,
        nullif(r->>'saiu_em','')::timestamptz,
        coalesce((r->>'pulou')::boolean, false));
    exception when others then
      v_diag := v_diag || jsonb_build_object('filha', 'tela_evento', 'valor', r, 'erro', sqlerrm);
    end;
  end loop;

  -- Contato e consentimento. O bloco inteiro e protegido: sem consentimento gravado nao existe
  -- linha em `cliente` (F43), entao os dois caem ou entram juntos, e a resposta segue de pe.
  begin
    if v_contato is not null
       and (nullif(btrim(coalesce(v_contato->>'email','')),'') is not null
         or nullif(btrim(coalesce(v_contato->>'whatsapp','')),'') is not null) then

      select c.id into v_cliente_id
      from experiencia.cliente c
      where c.anonimizado_em is null
        and (
          (nullif(btrim(coalesce(v_contato->>'email','')),'') is not null
            and lower(c.email) = lower(btrim(v_contato->>'email')))
          or
          (nullif(btrim(coalesce(v_contato->>'whatsapp','')),'') is not null
            and regexp_replace(coalesce(c.whatsapp,''), '[^0-9]', '', 'g')
                = regexp_replace(v_contato->>'whatsapp', '[^0-9]', '', 'g'))
        )
      limit 1;

      if v_cliente_id is null then
        insert into experiencia.cliente (nome, email, whatsapp, nascimento, ultima_visita_em)
        values (
          nullif(btrim(coalesce(v_contato->>'nome','')),''),
          nullif(btrim(coalesce(v_contato->>'email','')),''),
          nullif(btrim(coalesce(v_contato->>'whatsapp','')),''),
          nullif(v_contato->>'nascimento','')::date,
          v_respondido)
        returning id into v_cliente_id;
      else
        update experiencia.cliente
        set ultima_visita_em = greatest(ultima_visita_em, v_respondido),
            nome       = coalesce(nullif(btrim(coalesce(v_contato->>'nome','')),''), nome),
            nascimento = coalesce(nullif(v_contato->>'nascimento','')::date, nascimento)
        where id = v_cliente_id;
      end if;
    end if;
  exception when others then
    v_cliente_id := null;
    v_diag := v_diag || jsonb_build_object('filha', 'cliente', 'erro', sqlerrm);
  end;

  for r in select jsonb_array_elements(coalesce(p->'consentimentos', '[]'::jsonb)) loop
    begin
      insert into experiencia.consentimento (
        resposta_id, cliente_id, finalidade, aceito_em, versao_texto)
      values (
        v_id,
        case when r->>'finalidade' = 'contato' then v_cliente_id else null end,
        r->>'finalidade',
        coalesce(nullif(r->>'aceito_em','')::timestamptz, v_respondido),
        r->>'versao_texto')
      on conflict (resposta_id, finalidade) do nothing;
    exception when others then
      v_diag := v_diag || jsonb_build_object(
        'filha', 'consentimento', 'valor', r, 'erro', sqlerrm);
    end;
  end loop;

  -- O alerta de detrator. Protegido tambem, mas com uma diferenca: se ele falhar, a resposta entra
  -- e o alerta some. Por isso a falha dele entra no diagnostico com destaque, e o bloco 2 do digest
  -- do dia seguinte le `alerta_detrator` por dia, entao um alerta faltando aparece la.
  if v_nota <= 6 then
    begin
      select coalesce(max(c.valor), '') into v_destinatario
      from experiencia.configuracao c where c.chave = 'email_alerta_gerente';

      select coalesce(max(c.valor)::integer, 20) into v_atraso
      from experiencia.configuracao c where c.chave = 'atraso_alerta_minutos';

      select ro.fator into v_fator
      from experiencia.resposta_opcao ro
      where ro.resposta_id = v_id and ro.fator is not null
      order by ro.criado_em
      limit 1;

      insert into experiencia.alerta_detrator (
        resposta_id, nota, fator, canal, destinatario, atrasado, erro)
      values (
        v_id, v_nota, v_fator, 'email',
        case when btrim(v_destinatario) = '' then 'nao-configurado' else v_destinatario end,
        (v_agora - v_respondido) > make_interval(mins => v_atraso),
        case when btrim(v_destinatario) = ''
             then 'configuracao.email_alerta_gerente vazia: alerta gravado e nao enviado'
             else null end)
      on conflict (resposta_id) do nothing;
    exception when others then
      v_diag := v_diag || jsonb_build_object('filha', 'alerta_detrator', 'erro', sqlerrm);
    end;
  end if;

  -- O diagnostico so e gravado quando houve recusa. Nulo e o caso normal, e `where diagnostico is
  -- not null` fica sendo uma consulta barata.
  if jsonb_array_length(v_diag) > 0 then
    update experiencia.resposta set diagnostico = v_diag where id = v_id;
  end if;

  return v_id;
end
$$;

comment on function experiencia.fn_grava_resposta(jsonb) is
  'O unico caminho de escrita do PWA para resposta. Idempotente pelo id do cliente. Cada filha e '
  'protegida por bloco de excecao: filha que o banco recusa e registrada em `resposta.diagnostico` '
  'e descartada, e a RESPOSTA ENTRA. A nota e o unico dado que nao pode ser perdido.';

grant execute on function experiencia.fn_grava_resposta(jsonb) to experiencia_app;

-- -----------------------------------------------------------------------------
-- E a leitura do diagnostico, porque descarte sem rastro e engolir erro.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_gravacao_diagnostico with (security_invoker = true) as
select r.dia_operacional,
       d.elemento->>'filha'                                   as filha,
       d.elemento->>'erro'                                    as erro,
       count(*)::int                                          as ocorrencias,
       min(r.respondido_em)                                   as primeira,
       max(r.respondido_em)                                   as ultima,
       (array_agg(r.id order by r.respondido_em desc))[1]     as exemplo_resposta_id
from experiencia.resposta r
cross join lateral jsonb_array_elements(r.diagnostico) as d(elemento)
where r.diagnostico is not null
group by 1, 2, 3
order by 1 desc, 4 desc;

comment on view experiencia.vw_gravacao_diagnostico is
  'As filhas recusadas na gravacao, por dia e por tipo. Existe para o descarte NAO ser silencioso: '
  'uma tela quebrada aparece como uma linha subindo aqui, em vez de um numero que nunca mais volta.';

grant select on experiencia.vw_gravacao_diagnostico to experiencia_app, experiencia_leitura;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select on experiencia.vw_gravacao_diagnostico to authenticated';
  end if;
end
$$;
