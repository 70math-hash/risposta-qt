-- =============================================================================
-- 20260817098000_cria_funcoes_experiencia.sql
--
-- O QUE FAZ
--   Cria as quatro funcoes que dependem de tabela: `fn_casa_abre`,
--   `fn_sorteia_pergunta`, `fn_grava_resposta` e `fn_registra_sinal`. As tres
--   `immutable` (`fn_dia_operacional`, `fn_faixa_nps`, `fn_fator_valido`) ja existem
--   desde 20260817091000, porque coluna gerada e CHECK precisavam delas antes das
--   tabelas.
--
-- O QUE ASSUME
--   1. `fn_casa_abre` e `stable`, e nao `immutable`, porque le `calendario_operacao`.
--      E exatamente por isso que ela NAO pode virar coluna gerada, e e a mesma razao
--      pela qual o corte das 6h e literal dentro de `fn_dia_operacional` em vez de
--      parametro em `configuracao` (secao 4.5 da folha canonica).
--   2. `fn_grava_resposta` e o UNICO caminho de escrita do PWA para resposta, e
--      `fn_registra_sinal` o unico para o sinal do aparelho. O tablet nao tem INSERT
--      direto e nao le a base de clientes (ADR-11).
--   3. A idempotencia e o `id` uuid v4 gerado no cliente. Reenvio do mesmo id devolve
--      o mesmo id e nao toca em nada. Testado com 5 reenvios do mesmo payload (F03).
--   4. `fn_sorteia_pergunta` mantem a assinatura literal da folha canonica,
--      `(uuid, text) returns setof uuid`, lida como (resposta_id, mesa_digitada).
--      Com dois parametros so, a regra 3 das sete (suprimir a dimensao ja coberta pela
--      ramificacao de nota baixa) so tem entrada quando as opcoes ja estao gravadas.
--      Isso esta registrado como achado no documento de modelo de dados.
--
-- COMO SE DESFAZ
--   drop function if exists experiencia.fn_registra_sinal(jsonb);
--   drop function if exists experiencia.fn_grava_resposta(jsonb);
--   drop function if exists experiencia.fn_sorteia_pergunta(uuid, text);
--   drop function if exists experiencia.fn_casa_abre(date);
--   Derrubar `fn_grava_resposta` para a coleta inteira: sem ela o Worker nao tem para
--   onde escrever, e as respostas ficam em `fila_resposta` no aparelho.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- fn_casa_abre(date) returns boolean
--
-- Padrao semanal (fecha segunda) com `calendario_operacao` sobrepondo. E o que faz o
-- digest escrever `casa fechada` em vez de `nenhuma resposta coletada`. Sem isso, o
-- e-mail de terca acusaria falha de coleta na segunda, toda semana, para sempre, e o
-- alarme perderia credibilidade no segundo mes.
--
-- Espelhada em `casaAbrePadrao` de src/comum/dia-operacional.ts, que implementa SO o
-- padrao semanal, porque o front nao le tabela. A versao autoritativa e esta.
-- `extract(isodow)` devolve 1 para segunda-feira.
-- -----------------------------------------------------------------------------
create or replace function experiencia.fn_casa_abre(dia date)
returns boolean
language sql
stable
as $$
  select coalesce(
    (select c.abre from experiencia.calendario_operacao c where c.dia_operacional = dia),
    extract(isodow from dia) <> 1
  )
$$;

comment on function experiencia.fn_casa_abre(date) is
  'Padrao: ter a dom aberto, segunda fechada. Excecao em calendario_operacao sobrepoe. '
  'stable e nao immutable porque le tabela, e por isso nao serve a coluna gerada.';

-- -----------------------------------------------------------------------------
-- fn_sorteia_pergunta(uuid, text) returns setof uuid
--
-- As sete regras de sorteio, em codigo, nunca em planilha (F11):
--   1. no maximo 2 por resposta
--   2. nunca duas da mesma dimensao
--   3. suprimir a dimensao ja coberta pela ramificacao de nota baixa
--   4. sorteio por peso, com as perguntas em foco somando 50% das impressoes (N20)
--   5. gravar qual foi sorteada e qual foi respondida  <- quem grava e o chamador
--   6. nao repetir a mesma pergunta na mesma mesa na mesma noite
--   7. pergunta que o sistema pode responder sozinho sai do banco  <- `ativa = false`
--
-- `volatile` porque usa random(). A ordenacao `random() ^ (1/peso)` descendente e
-- amostragem por peso sem reposicao, e nao um `order by random()` com peso fingido.
-- -----------------------------------------------------------------------------
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

  -- Regra 1, pela faixa: promotor 2, neutro 1, detrator 0. Espelha
  -- `quantasRotacionadas` de src/coleta/questionario.ts.
  -- Quando a resposta ainda nao existe (o sorteio normal acontece no meio do fluxo,
  -- antes da gravacao), devolve o teto de 2 e quem chama corta pela faixa que tem em
  -- memoria. Isso e declarado, e nao um efeito colateral descoberto depois.
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
      -- Regra 3: suprime a dimensao ja coberta pela ramificacao, quando ela ja esta
      -- gravada. Sem linha em resposta_opcao, nao ha o que suprimir.
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
    -- Regra 4: o fator de foco iguala o peso total das em foco ao das demais, o que
    -- da exatamente 50% das impressoes para as em foco (N20).
    select a.id,
           a.dimensao,
           a.w * case
                   when a.em_foco and coalesce(s.w_foco, 0) > 0
                     then coalesce(s.w_resto, 0) / s.w_foco
                   else 1
                 end as peso_final
    from ativas a cross join soma s
  ),
  sorteada as (
    select id, dimensao, row_number() over (
             partition by dimensao
             order by random() ^ (1.0 / greatest(peso_final, 0.0001)) desc
           ) as rn_dimensao,
           random() ^ (1.0 / greatest(peso_final, 0.0001)) as chave
    from pesada
  )
  -- Regra 2: uma por dimensao, e so entao as `v_quantas` melhores chaves.
  select id from sorteada where rn_dimensao = 1 order by chave desc limit v_quantas;
end
$$;

comment on function experiencia.fn_sorteia_pergunta(uuid, text) is
  'As sete regras de sorteio do banco de perguntas. Assinatura literal da folha '
  'canonica, lida como (resposta_id, mesa_digitada).';

-- -----------------------------------------------------------------------------
-- fn_grava_resposta(jsonb) returns uuid
--
-- O unico caminho de escrita do PWA. Faz tudo numa transacao:
--   resolve mesa e garcom, resolve `respondido_em` pela regra das 48h, deixa a coluna
--   gerada produzir `dia_operacional`, marca `suspeita` na janela de 20 minutos, grava
--   as filhas, grava a `tentativa` de par, grava contato e consentimento quando houver,
--   e enfileira o alerta de detrator quando a nota e 0 a 6.
--
-- O payload aceita `desfecho = 'recusou'`, e nesse caso grava SO a `tentativa` e
-- devolve o id dela. Isso mantem verdadeira a regra "duas funcoes, e so duas, escrevem
-- por conta do PWA": a recusa registrada na T0 e o numerador da conversao por garcom e
-- nao tem para onde ir se nao for por aqui.
-- -----------------------------------------------------------------------------
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
  v_pin             text        := btrim(coalesce(p->>'garcom_pin_digitado',''));
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
  r                 jsonb;
begin
  if v_id is null then
    raise exception 'fn_grava_resposta: payload sem `id`. A idempotencia depende do uuid v4 gerado no cliente';
  end if;
  -- O PIN vem da T0, e a T0 so existe no tablet. Resposta por QR no celular do cliente nao
  -- passa pela T0 e nao tem PIN, e exigir um aqui rejeitaria o canal `qr` inteiro, que a folha
  -- canonica define na secao 3.3. Portanto a exigencia vale so para `tablet`.
  if v_canal = 'tablet' and v_pin = '' then
    raise exception 'fn_grava_resposta: resposta de tablet sem `garcom_pin_digitado`. A T0 nao deixa passar campo vazio (F04)';
  end if;

  -- respondido_em: o instante do toque quando ele e plausivel, o do servidor quando
  -- nao. Quarenta e oito horas e o limite da secao 3.2 da folha canonica.
  if v_cliente_ts is not null
     and abs(extract(epoch from (v_agora - v_cliente_ts))) <= 48 * 3600 then
    v_respondido := v_cliente_ts;
  else
    v_respondido := v_agora;
  end if;
  v_dia := experiencia.fn_dia_operacional(v_respondido);

  -- Resolucao de identidade, sempre no servidor. Mesa nao reconhecida fica nula, PIN
  -- que nao casa fica com garcom_reconhecido = false, e nos dois casos a resposta ENTRA
  -- nos indicadores gerais (ADR-06).
  if v_mesa_digitada is not null then
    select m.id into v_mesa_id
    from experiencia.mesa m
    where upper(btrim(m.numero)) = upper(v_mesa_digitada);
  end if;

  select g.id into v_garcom_id
  from experiencia.garcom g
  where g.pin = v_pin and g.removido_em is null and g.ativo = true;

  -- ---------------------------------------------------------------------------
  -- Caminho da recusa: uma linha em `tentativa`, e nada mais.
  -- ---------------------------------------------------------------------------
  if v_desfecho = 'recusou' then
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
  -- Caminho da resposta.
  -- ---------------------------------------------------------------------------
  v_nota := (p->>'nota')::smallint;
  if v_nota is null then
    raise exception 'fn_grava_resposta: payload sem `nota`. A T1 e a unica tela obrigatoria';
  end if;

  -- Trava de duplicidade por mesa (N27). A segunda resposta da mesma mesa dentro da
  -- janela e ACEITA, agradecida e marcada, nunca rejeitada: mesas juntadas com comandas
  -- individuais produzem respostas legitimas em sequencia (F04).
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

  -- Reenvio do mesmo id: devolve sucesso e nao toca em nada. O total do dia nao muda.
  if v_gravado is null then
    return v_id;
  end if;

  -- Tentativa de par, com o MESMO id da resposta, o que faz o par ser conferivel por
  -- igualdade. E o denominador da conversao por garcom.
  insert into experiencia.tentativa (
    id, criado_em_cliente, dia_operacional, desfecho, canal, dispositivo_id,
    mesa_digitada, mesa_id, garcom_pin_digitado, garcom_id, garcom_reconhecido)
  values (
    v_id, v_cliente_ts, v_dia, 'respondeu', v_canal, v_dispositivo_id,
    v_mesa_digitada, v_mesa_id, v_pin, v_garcom_id, v_garcom_id is not null)
  on conflict (id) do nothing;

  for r in select jsonb_array_elements(coalesce(p->'opcoes', '[]'::jsonb)) loop
    insert into experiencia.resposta_opcao (resposta_id, tela, opcao_codigo, dimensao, fator)
    values (v_id, r->>'tela', r->>'opcao_codigo', r->>'dimensao', nullif(r->>'fator',''))
    on conflict (resposta_id, tela, opcao_codigo) do nothing;
  end loop;

  for r in select jsonb_array_elements(coalesce(p->'itens', '[]'::jsonb)) loop
    insert into experiencia.resposta_item (resposta_id, grupo, item_cardapio_id, fator)
    values (v_id, r->>'grupo', nullif(r->>'item_cardapio_id','')::uuid, nullif(r->>'fator',''))
    on conflict (resposta_id, grupo, item_cardapio_id) do nothing;
  end loop;

  -- O texto cru e gravado na MESMA transacao da resposta, antes de qualquer chamada de
  -- IA (F36). Se o free tier mudar de politica, perde-se a analise, nunca o dado.
  if nullif(btrim(coalesce(p#>>'{texto,texto_cru}','')), '') is not null then
    insert into experiencia.resposta_texto (resposta_id, texto_cru)
    values (v_id, btrim(p#>>'{texto,texto_cru}'))
    on conflict (resposta_id) do nothing;
  end if;

  for r in select jsonb_array_elements(coalesce(p->'sorteadas', '[]'::jsonb)) loop
    insert into experiencia.resposta_pergunta_sorteada (
      resposta_id, pergunta_banco_id, respondida, opcao_indice)
    values (
      v_id, (r->>'pergunta_banco_id')::uuid,
      coalesce((r->>'respondida')::boolean, false),
      nullif(r->>'opcao_indice','')::smallint)
    on conflict (resposta_id, pergunta_banco_id) do nothing;
  end loop;

  for r in select jsonb_array_elements(coalesce(p->'telas', '[]'::jsonb)) loop
    insert into experiencia.tela_evento (resposta_id, tela, entrou_em, saiu_em, pulou)
    values (
      v_id, r->>'tela', (r->>'entrou_em')::timestamptz,
      nullif(r->>'saiu_em','')::timestamptz,
      coalesce((r->>'pulou')::boolean, false));
  end loop;

  -- ---------------------------------------------------------------------------
  -- Contato e consentimento. Sem consentimento gravado nao existe linha em `cliente`
  -- (F43), e cliente sem nenhum contato preenchido nao gera linha nenhuma (F45).
  -- ---------------------------------------------------------------------------
  if v_contato is not null
     and (nullif(btrim(coalesce(v_contato->>'email','')),'') is not null
       or nullif(btrim(coalesce(v_contato->>'whatsapp','')),'') is not null) then

    -- Contato duplicado atualiza `ultima_visita_em` em vez de criar segunda linha (F43).
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

  for r in select jsonb_array_elements(coalesce(p->'consentimentos', '[]'::jsonb)) loop
    insert into experiencia.consentimento (
      resposta_id, cliente_id, finalidade, aceito_em, versao_texto)
    values (
      v_id,
      case when r->>'finalidade' = 'contato' then v_cliente_id else null end,
      r->>'finalidade',
      coalesce(nullif(r->>'aceito_em','')::timestamptz, v_respondido),
      r->>'versao_texto')
    on conflict (resposta_id, finalidade) do nothing;
  end loop;

  -- ---------------------------------------------------------------------------
  -- Alerta de detrator (F24). Dispara na GRAVACAO, e nao em rotina. A funcao enfileira
  -- a linha; quem envia e o Worker de escrita, que depois carimba `enviado_em`.
  -- ---------------------------------------------------------------------------
  if v_nota <= 6 then
    select coalesce(max(c.valor), '') into v_destinatario
    from experiencia.configuracao c where c.chave = 'email_alerta_gerente';

    select coalesce(max(c.valor)::integer, 20) into v_atraso
    from experiencia.configuracao c where c.chave = 'atraso_alerta_minutos';

    -- O fator do alerta e o primeiro fator marcado na ramificacao, quando houver.
    select ro.fator into v_fator
    from experiencia.resposta_opcao ro
    where ro.resposta_id = v_id and ro.fator is not null
    order by ro.criado_em
    limit 1;

    insert into experiencia.alerta_detrator (
      resposta_id, nota, fator, canal, destinatario, atrasado, erro)
    values (
      v_id, v_nota, v_fator, 'email',
      -- Destinatario vazio nao impede a gravacao do alerta: o alerta perdido reaparece
      -- no bloco 2 do digest do dia seguinte. O que ele nao pode e desaparecer.
      case when btrim(v_destinatario) = '' then 'nao-configurado' else v_destinatario end,
      (v_agora - v_respondido) > make_interval(mins => v_atraso),
      case when btrim(v_destinatario) = ''
           then 'configuracao.email_alerta_gerente vazia: alerta gravado e nao enviado'
           else null end)
    on conflict (resposta_id) do nothing;
  end if;

  return v_id;
end
$$;

comment on function experiencia.fn_grava_resposta(jsonb) is
  'O unico caminho de escrita do PWA para resposta. Idempotente pelo id do cliente. '
  'Aceita desfecho `recusou`, e nesse caso grava so a tentativa.';

-- -----------------------------------------------------------------------------
-- fn_registra_sinal(jsonb) returns void
--
-- NOME NOVO, NAO CONSTA NA FOLHA CANONICA. Vem de 01-arquitetura, secoes 2.3 e ADR-11,
-- e ja esta declarado la. Existe porque o heartbeat e uma escrita SEM resposta
-- associada, e portanto nao cabe em `fn_grava_resposta`. Escopo minimo: toca so as
-- colunas de sinal de `dispositivo`.
-- -----------------------------------------------------------------------------
create or replace function experiencia.fn_registra_sinal(p jsonb)
returns void
language plpgsql
security definer
set search_path = experiencia, public, pg_temp
as $$
declare
  v_id uuid := nullif(p->>'dispositivo_id','')::uuid;
begin
  if v_id is null then
    raise exception 'fn_registra_sinal: payload sem `dispositivo_id`';
  end if;

  update experiencia.dispositivo
  set ultimo_sinal_em = now(),
      fila_pendente   = coalesce((p->>'fila_pendente')::integer, fila_pendente),
      versao_app      = coalesce(nullif(p->>'versao_app',''), versao_app)
  where id = v_id and removido_em is null;
end
$$;

comment on function experiencia.fn_registra_sinal(jsonb) is
  'Nome novo, nao consta na folha canonica. Atualiza so ultimo_sinal_em, fila_pendente '
  'e versao_app de um dispositivo. Nao cria linha: aparelho desconhecido e ignorado, '
  'porque o cadastro dos 5 tablets e ato humano e nao efeito colateral de heartbeat.';

grant execute on function experiencia.fn_casa_abre(date)                  to experiencia_app, experiencia_leitura;
grant execute on function experiencia.fn_sorteia_pergunta(uuid, text)     to experiencia_app;
grant execute on function experiencia.fn_grava_resposta(jsonb)            to experiencia_app;
grant execute on function experiencia.fn_registra_sinal(jsonb)            to experiencia_app;
