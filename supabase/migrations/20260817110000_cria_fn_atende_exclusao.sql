-- =============================================================================
-- 20260817110000_cria_fn_atende_exclusao.sql
--
-- O QUE FAZ
--   Cria `experiencia.fn_atende_exclusao(uuid, text)`: atende um pedido de exclusao de titular,
--   anonimizando o cliente e carimbando o pedido NA MESMA TRANSACAO.
--
-- NOME NOVO, NAO CONSTA NA FOLHA CANONICA, e isso esta sendo dito de proposito.
--   A folha define `fn_aplica_retencao`, que e a rotina MENSAL e automatica: ela varre quem passou
--   de 12 meses da ultima visita. Nao existia nada para o pedido INDIVIDUAL, que e obrigacao legal
--   e tem prazo proprio. A tabela `exclusao_pedido` existia, com indice para os pedidos abertos, e
--   nada escrevia `atendido_em`: o pedido entrava e nao tinha como ser atendido.
--
--   Achado pela critica adversarial da Etapa 4 (A08), que listou o atendimento de pedido de titular
--   entre as escritas que o painel nao tinha caminho para fazer.
--
-- POR QUE UMA FUNCAO, E NAO DUAS CHAMADAS DO WORKER
--   Atender e duas coisas: anonimizar o cliente e carimbar o pedido. Dividir isso entre duas
--   chamadas cria um estado intermediario em que o pedido esta marcado como atendido e o dado
--   pessoal continua no banco — que e exatamente o estado que uma fiscalizacao encontraria e que
--   ninguem consegue detectar depois, porque o carimbo diz que esta feito.
--
-- O QUE ELA NAO FAZ
--   Nao apaga a RESPOSTA. D4 e explicito: dado pessoal sai, resposta de pesquisa fica, sem dono.
--   O historico de satisfacao e da casa; o dado pessoal e da pessoa. Apagar a resposta atenderia
--   o pedido com dado que nao e do titular.
--
--   Nao apaga a LINHA de `cliente`. `anonimizado_em` e a prova de que o pedido foi atendido, e o
--   CHECK `cliente_anonimizado_sem_dado_pessoal` impede que "anonimizado" seja mentira. Sem a
--   linha, nao ha como provar nada.
--
-- O QUE ASSUME
--   1. O pedido pode NAO ter `cliente_id`: a pessoa escreve um telefone ou e-mail e nao ha
--      obrigacao de ele existir na base. Nesse caso a funcao PROCURA por contato, e se nao achar
--      registra `resultado` dizendo isso e carimba `atendido_em` de todo jeito. "Nao havia dado
--      seu" e uma resposta legitima e tem de ficar registrada; deixar o pedido aberto para sempre
--      criaria uma pendencia falsa que a cobranca do digest repetiria toda semana.
--   2. A comparacao de contato normaliza telefone por digitos e e-mail por minusculas, igual a
--      `fn_grava_resposta`. Duas normalizacoes diferentes fariam o pedido nao achar o cliente que
--      a gravacao criou.
--   3. Reatender um pedido ja atendido nao faz nada e devolve o que houve antes. Idempotente de
--      proposito: um duplo clique na tela nao pode gerar um segundo carimbo com data diferente.
--
-- COMO SE DESFAZ
--   drop function if exists experiencia.fn_atende_exclusao(uuid, text);
--   O que ela ja anonimizou NAO volta, e e isso que se pediu a ela.
-- =============================================================================

create or replace function experiencia.fn_atende_exclusao(
  p_pedido_id     uuid,
  p_atendido_por  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = experiencia, public, pg_temp
as $$
declare
  v_pedido      record;
  v_cliente_id  uuid;
  v_digitos     text;
  v_anonimizado integer := 0;
  v_resultado   text;
begin
  select * into v_pedido from experiencia.exclusao_pedido where id = p_pedido_id;
  if v_pedido.id is null then
    raise exception 'pedido de exclusao % nao existe', p_pedido_id;
  end if;

  -- Idempotente: reatender devolve o que houve antes, sem carimbar de novo.
  if v_pedido.atendido_em is not null then
    return jsonb_build_object(
      'ja_atendido', true,
      'atendido_em', v_pedido.atendido_em,
      'resultado',   v_pedido.resultado,
      'clientes_anonimizados', 0);
  end if;

  v_cliente_id := v_pedido.cliente_id;

  -- Sem `cliente_id`, procura pelo contato informado. Mesma normalizacao de `fn_grava_resposta`:
  -- digitos para telefone, minusculas para e-mail. Normalizacao diferente aqui faria o pedido nao
  -- achar exatamente o cliente que a gravacao criou.
  if v_cliente_id is null then
    v_digitos := regexp_replace(coalesce(v_pedido.contato_informado, ''), '[^0-9]', '', 'g');
    select c.id into v_cliente_id
    from experiencia.cliente c
    where c.anonimizado_em is null
      and (
        lower(c.email) = lower(btrim(v_pedido.contato_informado))
        or (length(v_digitos) >= 8
            and regexp_replace(coalesce(c.whatsapp, ''), '[^0-9]', '', 'g') = v_digitos)
      )
    limit 1;
  end if;

  if v_cliente_id is not null then
    -- UPDATE para nulo, nunca DELETE (F48, D4). A resposta de pesquisa fica, sem dono.
    update experiencia.cliente
    set nome           = null,
        email          = null,
        whatsapp       = null,
        nascimento     = null,
        anonimizado_em = now()
    where id = v_cliente_id and anonimizado_em is null;
    v_anonimizado := 1;
    v_resultado := format('cliente anonimizado; resposta de pesquisa preservada sem dono%s',
      case when p_atendido_por is null then '' else '; atendido por ' || p_atendido_por end);
  else
    -- Registrado e FECHADO. Deixar aberto criaria pendencia falsa que a cobranca do digest
    -- repetiria toda semana, e "nao havia dado seu" e uma resposta legitima ao titular.
    v_resultado := format('nenhum cliente encontrado para o contato informado%s',
      case when p_atendido_por is null then '' else '; atendido por ' || p_atendido_por end);
  end if;

  update experiencia.exclusao_pedido
  set atendido_em = now(),
      resultado   = v_resultado,
      cliente_id  = coalesce(cliente_id, v_cliente_id)
  where id = p_pedido_id;

  return jsonb_build_object(
    'ja_atendido', false,
    'atendido_em', now(),
    'resultado',   v_resultado,
    'clientes_anonimizados', v_anonimizado);
end
$$;

comment on function experiencia.fn_atende_exclusao(uuid, text) is
  'NOME NOVO, nao consta na folha canonica. Atende UM pedido de titular, anonimizando o cliente e '
  'carimbando o pedido na mesma transacao: em duas chamadas existiria um estado com o pedido '
  'marcado como atendido e o dado pessoal ainda no banco. Nao apaga a resposta de pesquisa (D4) '
  'nem a linha de cliente, que e a prova de que o pedido foi atendido.';

grant execute on function experiencia.fn_atende_exclusao(uuid, text) to experiencia_app;

-- -----------------------------------------------------------------------------
-- E a view dos pedidos abertos, que e o que a tela mostra e o digest cobra.
--
-- Sem ela, `exclusao_pedido` tinha indice para os pedidos abertos e nenhuma leitura: o indice
-- existia para uma consulta que ninguem escreveu.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_exclusao_pedido with (security_invoker = true) as
select ep.id,
       ep.contato_informado,
       ep.cliente_id,
       ep.pedido_em,
       ep.atendido_em,
       ep.resultado,
       (ep.atendido_em is null) as aberto,
       round(extract(epoch from (coalesce(ep.atendido_em, now()) - ep.pedido_em)) / 86400.0, 1)
         as dias_em_aberto,
       -- Sete dias e prazo INTERNO, e nao legal. A LGPD nao da prazo de 7 dias; prazo interno
       -- curto e o que evita o prazo legal ser estourado, e e o que vira cobranca no digest (N43).
       (ep.atendido_em is null and ep.pedido_em < now() - interval '7 days') as atrasado
from experiencia.exclusao_pedido ep
order by ep.atendido_em nulls first, ep.pedido_em;

comment on view experiencia.vw_exclusao_pedido is
  'Os pedidos de titular, abertos primeiro. Os 7 dias sao prazo interno e nao legal: prazo curto '
  'e o que evita o prazo da LGPD ser estourado.';

grant select on experiencia.vw_exclusao_pedido to experiencia_app, experiencia_leitura;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select on experiencia.vw_exclusao_pedido to authenticated';
  end if;
end
$$;
