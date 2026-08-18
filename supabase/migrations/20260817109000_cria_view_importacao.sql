-- =============================================================================
-- 20260817109000_cria_view_importacao.sql
--
-- O QUE FAZ
--   Cria `experiencia.vw_importacao`: o log das importacoes de R3, com os dias que cada arquivo
--   cobriu, quem subiu quando foi manual, e o tamanho do bruto guardado.
--
-- NOME NOVO, NAO CONSTA NA FOLHA CANONICA, e isso esta sendo dito de proposito.
--
-- POR QUE EXISTE
--   `execucao_rotina` tem view (`vw_saude_rotina`) e aparece em `/painel/saude`.
--   `execucao_importacao` NAO tinha view nenhuma. Duas colunas dela eram gravadas e nunca lidas
--   por view, tela ou exportacao:
--
--     `dias_lidos`     os dias operacionais que o arquivo cobre. E o que transforma "faltou o R3
--                      de terca" numa consulta em vez de uma leitura de arquivo. Sem leitura, a
--                      unica forma de saber qual dia entrou e abrir o arquivo.
--     `importado_por`  quem subiu a planilha, quando a origem e `painel`. E a PRIMEIRA pergunta
--                      quando um numero de faturamento nao fecha, e a resposta estava no banco
--                      sem caminho de leitura.
--
--   Isso e pior que dado faltando: e trabalho feito e guardado que ninguem consegue usar. Achado
--   por um teste que confere se toda coluna de dado coletado e devolvida por alguma view.
--
-- O QUE ELA NAO DEVOLVE, DE PROPOSITO
--   `arquivo_bruto`. A coluna e `bytea` e guarda o arquivo inteiro; devolve-la numa view de painel
--   mandaria centenas de kilobytes por linha para o navegador a cada abertura de aba. O que a view
--   devolve e o TAMANHO em bytes, que responde "o bruto esta lá?" sem trazer o bruto. Reprocessar
--   e ato deliberado, com consulta propria, e nao efeito colateral de abrir uma tela.
--
-- COMO SE DESFAZ
--   drop view if exists experiencia.vw_importacao;
--   Volta-se a nao ter como responder qual dia entrou nem quem subiu o arquivo.
-- =============================================================================

create or replace view experiencia.vw_importacao with (security_invoker = true) as
select ei.id,
       ei.origem,
       ei.arquivo,
       ei.hash,
       ei.dias_lidos,
       -- O primeiro e o ultimo dia, ao lado da lista. Com eles, "qual arquivo cobre 12/08" e um
       -- filtro de intervalo, e nao uma varredura de array.
       (select min(d) from unnest(ei.dias_lidos) as d) as primeiro_dia,
       (select max(d) from unnest(ei.dias_lidos) as d) as ultimo_dia,
       coalesce(array_length(ei.dias_lidos, 1), 0)     as dias_cobertos,
       ei.linhas,
       ei.status,
       ei.erro,
       ei.importado_por,
       ei.iniciado_em,
       ei.terminado_em,
       round(extract(epoch from (ei.terminado_em - ei.iniciado_em))::numeric, 1) as duracao_s,
       -- Tamanho, e nao conteudo. Ver "O QUE ELA NAO DEVOLVE" no cabecalho.
       length(ei.arquivo_bruto)                        as bruto_bytes,
       -- Quantas linhas de venda esta execucao realmente gravou. Pode ser MENOR que `linhas`
       -- quando um dia foi reimportado depois por outro arquivo: o UNIQUE
       -- (dia_operacional, produto_nome_norm) faz a linha passar a pertencer a execucao mais nova.
       -- A diferenca entre as duas colunas e o que mostra que houve reimportacao.
       (select count(*) from experiencia.venda_produto_dia v
         where v.execucao_importacao_id = ei.id)::int   as linhas_vigentes,
       (select count(*) from experiencia.venda_produto_dia v
         where v.execucao_importacao_id = ei.id and v.item_cardapio_id is null)::int
                                                       as linhas_sem_item,
       case
         when ei.status = 'erro'
           then 'nenhuma venda gravada; o arquivo bruto esta guardado e da para reprocessar'
         when ei.linhas = 0
           then 'o arquivo nao produziu linha de venda nenhuma'
         when (select count(*) from experiencia.venda_produto_dia v
                where v.execucao_importacao_id = ei.id and v.item_cardapio_id is null) > 0
           then 'ha produto vendido que nao existe no cadastro de cardapio: a venda entra no '
                'faturamento e nao entra no cruzamento por 100 unidades'
         else null
       end                                             as aviso
from experiencia.execucao_importacao ei
order by ei.iniciado_em desc;

comment on view experiencia.vw_importacao is
  'NOME NOVO, nao consta na folha canonica. O log das importacoes de R3. Existe porque '
  '`dias_lidos` e `importado_por` eram gravadas e nenhuma view as devolvia: nao havia como '
  'responder qual dia um arquivo cobriu nem quem subiu a planilha. Nao devolve `arquivo_bruto`, '
  'so o tamanho dele: reprocessar e ato deliberado, e nao efeito de abrir uma tela.';

grant select on experiencia.vw_importacao to experiencia_app, experiencia_leitura;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select on experiencia.vw_importacao to authenticated';
  end if;
end
$$;
