-- =============================================================================
-- 20260817104000_ajusta_execucao_rotina_contagens.sql
--
-- O QUE FAZ
--   Acrescenta `contagens jsonb` a `experiencia.execucao_rotina` e a expoe em
--   `vw_saude_rotina`. Additiva: nenhuma coluna e removida, renomeada ou mudada de tipo, e
--   nenhuma view existente perde coluna.
--
-- POR QUE EXISTE
--   A folha canonica descreve `execucao_rotina` como "o log das cinco rotinas no proprio
--   banco, com inicio, fim, status, CONTAGENS, destinatarios e erro truncado" (secao 2.2).
--   A migration de operacao implementou `contagens` como cinco colunas nomeadas
--   (`respostas_no_periodo`, `email_enviado`, `destinatarios`, `linhas_anonimizadas`,
--   `mascaramentos`), o que cobre o digest, o classificador e a retencao, e NAO cobre o
--   watcher do Drive, cujas contagens sao `arquivos_vistos`, `importados`, `ja_conhecidos` e
--   `pasta_configurada`.
--
--   O `registraExecucao` do Worker mandava um campo `contagens` que nenhuma coluna recebia,
--   e a chamada inteira e envolvida por um `catch` vazio de proposito, para falha de log nao
--   derrubar a rotina que estava rodando. As duas decisoes juntas produzem o pior resultado:
--   as quatro rotinas rodariam normalmente, cada insercao de log falharia com 400 em
--   silencio, e `/painel/saude` e o bloco de saude do e-mail das 16h ficariam vazios para
--   sempre. O log existe justamente porque o log do fornecedor expira em 1 dia no plano
--   gratuito, e um log vazio nao avisa que esta vazio.
--
--   Descoberto conferindo os nomes de coluna de toda escrita do Worker contra o DDL de
--   verdade, depois de o mesmo tipo de divergencia ter aparecido nas leituras do catalogo.
--
-- POR QUE JSONB, E NAO MAIS CINCO COLUNAS
--   Cada rotina nova traria colunas novas, quase todas nulas nas outras quatro linhas de
--   rotina. As cinco colunas nomeadas ficam porque as views e o digest as leem por nome, e
--   sao as que valem alarme; o `jsonb` guarda o resto sem obrigar migration a cada rotina.
--
-- COMO SE DESFAZ
--   alter table experiencia.execucao_rotina drop column contagens;
--   E reaplicar 20260817096000 para a view voltar a forma anterior. Perde-se o diagnostico
--   do watcher, nao o das outras rotinas.
-- =============================================================================

alter table experiencia.execucao_rotina
  add column if not exists contagens jsonb null;

comment on column experiencia.execucao_rotina.contagens is
  'As contagens que a rotina devolveu, cruas. As cinco colunas nomeadas continuam sendo a '
  'fonte do alarme e do digest; esta guarda o que nao tem coluna propria, como '
  'arquivos_vistos e ja_conhecidos do watcher do Drive. Nunca e a unica copia de um numero '
  'que alguma tela le por nome.';

-- -----------------------------------------------------------------------------
-- A view, recriada com a coluna nova no fim. Ordem preservada nas demais, porque
-- `src/painel/dados.ts` e `supabase/formas-das-views.json` guardam a forma e um teste
-- confere as duas contra esta.
-- -----------------------------------------------------------------------------
create or replace view experiencia.vw_saude_rotina with (security_invoker = true) as
select er.id,
       er.rotina,
       er.passo,
       er.iniciado_em,
       er.terminado_em,
       er.status,
       er.respostas_no_periodo,
       er.email_enviado,
       er.destinatarios,
       er.linhas_anonimizadas,
       er.mascaramentos,
       er.erro,
       round(extract(epoch from (er.terminado_em - er.iniciado_em))::numeric, 1) as duracao_s,
       er.contagens
from experiencia.execucao_rotina er
order by er.iniciado_em desc;

comment on view experiencia.vw_saude_rotina is
  'O log das rotinas, mais recente primeiro. A duracao sai da diferenca dos dois carimbos e '
  'nao de coluna gravada, para nao existir jeito de ela discordar deles.';

grant select on experiencia.vw_saude_rotina to experiencia_app, experiencia_leitura;
