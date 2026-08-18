-- =============================================================================
-- 20260817105000_cria_view_texto_a_classificar.sql
--
-- O QUE FAZ
--   Cria `experiencia.vw_texto_a_classificar`: os textos abertos de um dia operacional que
--   ainda nao foram classificados.
--
-- NOME NOVO, NAO CONSTA NA FOLHA CANONICA, e isso esta sendo dito de proposito.
--   A folha lista as views de painel e as de exportacao. Esta e uma view de TRABALHO: ela nao
--   aparece em tela nenhuma e existe so para a rotina `cron_classificador` saber o que fazer.
--   O precedente e `fn_registra_sinal`, declarada do mesmo jeito na migration de funcoes.
--
-- POR QUE EXISTE
--   `worker/rotinas/classificador.ts` ja consultava `vw_texto_a_classificar` desde que foi
--   escrito. A view nunca foi criada. O efeito: a rotina das 10h rodaria todo dia, o PostgREST
--   devolveria 404, a excecao subiria e `execucao_rotina` registraria erro — mas so DEPOIS de
--   `registraExecucao` passar a funcionar, porque enquanto ela mandava uma coluna inexistente
--   o log tambem falhava em silencio. Somando as duas, o resultado era: nenhum texto
--   classificado, nunca, e nenhum registro de que a rotina tentou.
--
--   Consequencia no dado: `classificacao_texto` ficaria vazia para sempre. Isso NAO derruba
--   nada visivelmente, porque a coluna `dimensao` de `vw_exportacao_comentario` aceita nulo e
--   `vw_fator_contagem` soma `origem = 'opcao'` normalmente. A perda e silenciosa: o texto que
--   a pessoa escreveu deixa de virar fator contavel, e a metade da voz do cliente que nao cabe
--   num botao nunca entra em numero nenhum.
--
-- O QUE ASSUME
--   1. O texto cru e gravado na mesma transacao da resposta, ANTES de qualquer chamada de IA
--      (F36). Esta view le o que ja esta gravado; se o free tier da Groq mudar de politica,
--      perde-se a classificacao e nunca o texto.
--   2. Texto de resposta marcada como `suspeita` TAMBEM entra. Quem filtra suspeita sao as
--      views de leitura, e elas ja fazem isso. Filtrar aqui tambem seria a mesma regra em dois
--      lugares, e no dia em que a definicao de suspeita mudar, um dos dois ficaria velho.
--   3. Texto ja mascarado por `fn_mascara_contato` entra igual: a mascara troca telefone e
--      e-mail por marcador e nao muda a reclamacao, que e o que se classifica.
--   4. A rotina limita a 40 por execucao, do lado do Worker. A view nao limita: quem decide
--      quanto cabe na cota diaria e quem chama, e nao a definicao do conjunto.
--
-- COMO SE DESFAZ
--   drop view if exists experiencia.vw_texto_a_classificar;
--   A rotina volta a falhar com 404, e agora isso aparece em `execucao_rotina`.
-- =============================================================================

create or replace view experiencia.vw_texto_a_classificar with (security_invoker = true) as
select rt.resposta_id,
       r.dia_operacional,
       r.nota,
       r.idioma,
       rt.texto_cru,
       rt.mascarado_em,
       rt.criado_em
from experiencia.resposta_texto rt
join experiencia.resposta r on r.id = rt.resposta_id
where btrim(rt.texto_cru) <> ''
  -- `not exists`, e nao `left join ... is null`: com varias frases por resposta, o `left join`
  -- devolveria a mesma resposta uma vez por frase e a rotina reclassificaria o que ja esta
  -- classificado, gastando cota da Groq e criando frase duplicada.
  and not exists (
    select 1 from experiencia.classificacao_texto ct
    where ct.resposta_id = rt.resposta_id
  )
order by r.nota, rt.criado_em;

comment on view experiencia.vw_texto_a_classificar is
  'NOME NOVO, nao consta na folha canonica: e view de trabalho da rotina '
  'cron_classificador, e nao aparece em tela nenhuma. Ordenada por nota crescente, porque '
  'quando a cota diaria da Groq nao alcanca tudo, o texto do detrator e o que precisa ser '
  'lido primeiro.';

grant select on experiencia.vw_texto_a_classificar to experiencia_app;
