-- =============================================================================
-- 20260817108000_cria_view_pergunta_resposta.sql
--
-- O QUE FAZ
--   Cria `experiencia.vw_pergunta_resposta`: a distribuicao das respostas das perguntas
--   rotacionadas, com o ROTULO de cada opcao ao lado da contagem.
--
-- NOME NOVO, NAO CONSTA NA FOLHA CANONICA, e isso esta sendo dito de proposito.
--   A folha define `vw_pergunta_desempenho`, que responde "quantas vezes esta pergunta foi
--   sorteada e quantas foram respondidas". Ela NAO responde "o que as pessoas responderam", que e
--   a unica razao de existir um banco de perguntas.
--
-- POR QUE EXISTE
--   `resposta_pergunta_sorteada.opcao_indice` era gravada e NUNCA lida. Nenhuma das 26 views a
--   tocava, nenhuma tela a mostrava, nenhuma exportacao a levava. Dado que so entra e um custo
--   sem retorno, e nesse caso o custo e uma pergunta feita a cada cliente promotor todas as
--   noites, cuja resposta ninguem podia ver.
--
--   A situacao piorava por um segundo caminho, agora removido: o quiosque tambem escrevia a
--   resposta da rotacionada em `resposta_opcao`, o que (a) violava o dominio de `tela` daquela
--   tabela e derrubava a resposta inteira, e (b) fazia `vw_fator_contagem` contar um `sim` como
--   mencao a um problema. Tirar aquela escrita sem criar esta view deixaria a rotacionada
--   completamente muda.
--
-- POR QUE O ROTULO ENTRA AQUI, E NAO NA TELA
--   `opcao_indice` e um numero, e `pergunta_banco.opcoes` e o `jsonb` com os rotulos na ordem. O
--   par (indice, rotulo) so faz sentido junto, e resolver isso no painel espalharia a mesma
--   juncao por cada tela e por cada exportacao. A folha canonica ja decidiu guardar o INDICE e
--   nao o rotulo, porque rotulo muda com reescrita e com idioma, e indice nao: esta view e o
--   lugar onde os dois se encontram, uma vez.
--
-- O QUE ASSUME
--   1. `pergunta_banco.opcoes` e um array `jsonb` de textos, na ordem em que aparecem na tela, e
--      `opcao_indice` e base ZERO. `jsonb_array_elements` com `ordinality` comeca em 1, entao o
--      casamento e `ordinality - 1`. Errar isso por um deslocaria toda a leitura em uma posicao,
--      trocando `sim` por `mais ou menos` em silencio, e por isso o ensaio confere o rotulo.
--   2. Pergunta sorteada e NAO respondida entra, com `opcao_indice` nulo e rotulo nulo. Pulo e
--      dado: taxa de pulo alta numa pergunta e sinal de pergunta mal escrita, e some se a linha
--      sair.
--   3. Resposta marcada como `suspeita` fica fora, como em toda view de leitura.
--
-- COMO SE DESFAZ
--   drop view if exists experiencia.vw_pergunta_resposta;
--   Volta-se a gravar `opcao_indice` sem ninguem poder ler.
-- =============================================================================

create or replace view experiencia.vw_pergunta_resposta with (security_invoker = true) as
with respondidas as (
  select rps.pergunta_banco_id,
         date_trunc('quarter', r.dia_operacional)::date as trimestre,
         rps.respondida,
         rps.opcao_indice
  from experiencia.resposta_pergunta_sorteada rps
  join experiencia.resposta r on r.id = rps.resposta_id
  where r.suspeita = false
),

-- Os rotulos de cada pergunta, com o indice base zero ao lado.
rotulos as (
  select pb.id as pergunta_banco_id,
         (o.ordinality - 1)::smallint as opcao_indice,
         -- `#>> '{}'` extrai o texto de um `jsonb` escalar sem as aspas que `::text` deixaria.
         o.valor #>> '{}' as rotulo
  from experiencia.pergunta_banco pb
  cross join lateral jsonb_array_elements(pb.opcoes) with ordinality as o(valor, ordinality)
),

agregado as (
  select pergunta_banco_id,
         trimestre,
         opcao_indice,
         count(*)::int as respostas
  from respondidas
  where respondida = true and opcao_indice is not null
  group by 1, 2, 3
),

-- O total por pergunta e trimestre, que e o denominador do percentual. Sai de `respondidas` e
-- nao de `agregado`, para o percentual ser sobre quem RESPONDEU e nao sobre a soma das opcoes
-- conhecidas: opcao_indice fora da lista de rotulos (pergunta reescrita com menos opcoes)
-- entraria no denominador e nao no numerador, e a soma dos percentuais nao daria 100.
totais as (
  select pergunta_banco_id,
         trimestre,
         count(*) filter (where respondida = true)::int  as respondidas,
         count(*) filter (where respondida = false)::int as puladas,
         count(*)::int                                   as sorteadas
  from respondidas
  group by 1, 2
)
select pb.id                     as pergunta_banco_id,
       pb.numero,
       pb.texto_pt,
       pb.dimensao,
       pb.fator,
       pb.ativa,
       pb.em_foco,
       t.trimestre,
       a.opcao_indice,
       -- Rotulo nulo significa `opcao_indice` que nao existe mais na lista de opcoes, o que
       -- acontece quando a pergunta e reescrita com menos opcoes. Aparece como indice sem rotulo,
       -- em vez de desaparecer: a contagem antiga continua sendo verdade sobre o texto antigo.
       r.rotulo,
       a.respostas,
       t.respondidas,
       t.puladas,
       t.sorteadas,
       case when t.respondidas > 0
            then round(a.respostas::numeric * 100 / t.respondidas, 1)
            else null end        as respostas_pct,
       case when t.sorteadas > 0
            then round(t.puladas::numeric * 100 / t.sorteadas, 1)
            else null end        as pulo_pct,
       case when t.sorteadas < 20
            then 'amostra insuficiente, n=' || t.sorteadas
            else null end        as aviso
from totais t
join experiencia.pergunta_banco pb on pb.id = t.pergunta_banco_id
left join agregado a on a.pergunta_banco_id = t.pergunta_banco_id and a.trimestre = t.trimestre
left join rotulos r on r.pergunta_banco_id = a.pergunta_banco_id and r.opcao_indice = a.opcao_indice
order by t.trimestre desc, pb.numero, a.opcao_indice;

comment on view experiencia.vw_pergunta_resposta is
  'NOME NOVO, nao consta na folha canonica. A distribuicao das respostas das perguntas '
  'rotacionadas, com o rotulo de cada opcao ao lado do indice. Existe porque '
  'resposta_pergunta_sorteada.opcao_indice era gravada e nunca lida por view, tela ou '
  'exportacao nenhuma: a pergunta era feita todas as noites e a resposta nao podia ser vista.';

grant select on experiencia.vw_pergunta_resposta to experiencia_app, experiencia_leitura;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select on experiencia.vw_pergunta_resposta to authenticated';
  end if;
end
$$;
