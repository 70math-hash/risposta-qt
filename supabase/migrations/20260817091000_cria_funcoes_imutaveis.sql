-- =============================================================================
-- 20260817091000_cria_funcoes_imutaveis.sql
--
-- O QUE FAZ
--   Cria as tres funcoes `immutable` do schema: `fn_dia_operacional`,
--   `fn_faixa_nps` e `fn_fator_valido`.
--
--   Elas vem ANTES das tabelas, e nao junto das outras funcoes no fim, por uma
--   razao mecanica do Postgres e nao por preferencia: `resposta.dia_operacional` e
--   `resposta.faixa` sao colunas GERADAS, e coluna gerada exige que a funcao exista
--   e seja `immutable` no momento do `create table`. `fn_fator_valido` esta aqui
--   pelo mesmo motivo: ela aparece em CHECK de quatro tabelas.
--
-- O QUE ASSUME
--   1. O corte do dia e as 6h no fuso America/Sao_Paulo, literal dentro da funcao.
--      Nao e parametro em `configuracao`, e a razao esta na secao 4.5 da folha
--      canonica: funcao `immutable` nao pode ler tabela.
--   2. As listas de `dimensao` e de `fator` sao as da secao 3.3 da folha canonica,
--      copiadas literalmente, e sao as mesmas de src/comum/dominio.ts. As duas
--      mudam na mesma migration ou nao mudam.
--   3. CHECK que chama funcao nao revalida linha antiga quando a funcao muda.
--      Portanto trocar um valor de dominio e: nova migration que recria a funcao E
--      revalida as constraints afetadas.
--
-- COMO SE DESFAZ
--   drop function if exists experiencia.fn_fator_valido(text, text);
--   drop function if exists experiencia.fn_faixa_nps(smallint);
--   drop function if exists experiencia.fn_dia_operacional(timestamptz);
--   As duas primeiras nao caem enquanto existir coluna gerada ou CHECK que as use.
--   Derrubar `fn_dia_operacional` exige antes remover a coluna gerada de `resposta`,
--   o que reescreve a tabela. E bom que custe isso.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- O dia operacional. Corpo exato da secao 4.3 da folha canonica, sem uma virgula
-- de diferenca. Espelhada em src/comum/dia-operacional.ts, com 21 testes.
-- PROIBIDO no repositorio: criado_em::date e date(criado_em). Secao 4.7.
-- -----------------------------------------------------------------------------
create or replace function experiencia.fn_dia_operacional(ts timestamptz)
returns date
language sql
immutable
as $$
  select ((ts at time zone 'America/Sao_Paulo') - interval '6 hours')::date
$$;

comment on function experiencia.fn_dia_operacional(timestamptz) is
  'A unica definicao do dia operacional do sistema. Corte as 6h, fuso '
  'America/Sao_Paulo, nunca a meia-noite. 00h40 de quarta pertence a terca.';

-- -----------------------------------------------------------------------------
-- A faixa de NPS. Espelhada em `faixaDaNota` de src/comum/nps.ts.
-- -----------------------------------------------------------------------------
create or replace function experiencia.fn_faixa_nps(nota smallint)
returns text
language sql
immutable
as $$
  select case
           when nota between 0 and 6  then 'detrator'
           when nota between 7 and 8  then 'neutro'
           when nota between 9 and 10 then 'promotor'
         end
$$;

comment on function experiencia.fn_faixa_nps(smallint) is
  'detrator 0 a 6, neutro 7 e 8, promotor 9 e 10. Escala 0 a 10, nunca 1 a 10.';

-- -----------------------------------------------------------------------------
-- O par dimensao/fator, que e a lista fechada da secao 3.3.
--
-- Existe para que a lista viva num lugar so em vez de aparecer copiada em quatro
-- CHECK. `dimensao` nula quer dizer "qualquer dimensao", e serve a
-- `alerta_detrator`, que guarda `fator` sem `dimensao` ao lado.
--
-- NOME NOVO, NAO CONSTA NA FOLHA CANONICA. Segue a convencao da secao 8 (prefixo
-- `fn_`, portugues sem acento, snake_case) e precisa entrar na secao 6.4 da folha.
-- -----------------------------------------------------------------------------
create or replace function experiencia.fn_fator_valido(dimensao text, fator text)
returns boolean
language sql
immutable
as $$
  select case
    -- `item_consumido` nao usa fator: o item vai em `resposta_item`.
    when dimensao = 'item_consumido' then fator is null
    -- Opcao de dimensao sem fator e legitima: a T2A grava "A pizza" sem fator.
    when fator is null then true
    when dimensao is null then fator = any (array[
        'sabor','chegou_frio','ponto_da_massa','apresentacao',
        'ingrediente_sem_frescor','veio_errado_ou_faltou',
        'temperatura','tempo_ate_chegar','qualidade','veio_errada',
        'espera_mesa','espera_bebida','espera_pizza','espera_conta',
        'recepcao','simpatia','atencao_durante','despedida','conhecimento_cardapio',
        'item_errado','item_faltando','pedido_especial_ignorado','restricao_alimentar',
        'ruido','temperatura_salao','iluminacao','conforto',
        'mesa','salao','banheiro',
        'valor_percebido','preco_pizza','preco_bebida','couvert_ou_taxa'
      ])
    else fator = any (
      case dimensao
        when 'comida' then array[
          'sabor','chegou_frio','ponto_da_massa','apresentacao',
          'ingrediente_sem_frescor','veio_errado_ou_faltou']
        when 'bebida' then array[
          'temperatura','tempo_ate_chegar','qualidade','veio_errada']
        when 'tempo' then array[
          'espera_mesa','espera_bebida','espera_pizza','espera_conta']
        when 'atendimento' then array[
          'recepcao','simpatia','atencao_durante','despedida','conhecimento_cardapio']
        when 'precisao_pedido' then array[
          'item_errado','item_faltando','pedido_especial_ignorado','restricao_alimentar']
        when 'ambiente' then array[
          'ruido','temperatura_salao','iluminacao','conforto']
        when 'limpeza' then array['mesa','salao','banheiro']
        when 'preco_valor' then array[
          'valor_percebido','preco_pizza','preco_bebida','couvert_ou_taxa']
        else array[]::text[]
      end
    )
  end
$$;

comment on function experiencia.fn_fator_valido(text, text) is
  'Verdadeiro quando o fator pertence a dimensao (secao 3.3 da folha canonica). '
  'dimensao nula aceita qualquer fator da lista plana, e serve a alerta_detrator. '
  'Espelho de fatorValido em src/comum/dominio.ts.';

grant execute on function experiencia.fn_dia_operacional(timestamptz) to experiencia_app, experiencia_leitura;
grant execute on function experiencia.fn_faixa_nps(smallint)          to experiencia_app, experiencia_leitura;
grant execute on function experiencia.fn_fator_valido(text, text)     to experiencia_app, experiencia_leitura;
