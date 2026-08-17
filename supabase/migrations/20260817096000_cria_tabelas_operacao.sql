-- =============================================================================
-- 20260817096000_cria_tabelas_operacao.sql
--
-- O QUE FAZ
--   Cria `execucao_rotina` e `alerta_detrator` (Bloco F da folha canonica, operacao e
--   saude) e `classificacao_texto` (Bloco D, IA na coleira), com os indices que
--   /painel/saude e o bloco 2 do digest usam.
--
--   `classificacao_texto` entra neste arquivo, e nao num proprio, por duas razoes:
--   ela depende de `resposta_texto`, entao nao pode vir antes da migration de coleta,
--   e ela e derivada e refazivel do zero, o que a coloca junto do resto da superficie
--   de operacao. Os blocos da folha canonica sao classificacao de conteudo, nao ordem
--   de migration.
--
-- O QUE ASSUME
--   1. `execucao_rotina` grava PASSO separado: no digest, a consulta ao banco e o
--      envio do e-mail sao duas linhas, porque falha de e-mail nao pode desligar o
--      keep-alive (F33, ADR-05). `passo` e coluna nova, e a lista `consulta` e `envio`
--      e dominio novo. As duas precisam entrar na folha canonica.
--   2. `alerta_detrator` guarda `nota`, que a secao 2.2 da folha atribui a ele e a
--      secao 3.1 lista so em `resposta`. Resolvido em favor da secao 2.2: o alerta e o
--      registro do que foi ENVIADO, e precisa ser legivel anos depois sem depender de
--      juncao.
--   3. "Se houve contato" se le como `contato_em is not null`, sem coluna booleana,
--      pelo mesmo padrao com que a folha canonica le mesa nao reconhecida como
--      `mesa_id is null` (secao 9.2).
--   4. O alerta vai para UM endereco dedicado, lido de `configuracao.email_alerta_gerente`
--      (F24). E isso que mantem o grao de "um alerta de um detrator" com uma linha por
--      alerta, em vez de uma linha por destinatario.
--   5. Reclassificar um comentario e DELETE por `resposta_id` seguido de INSERT. Por
--      isso `classificacao_texto` e a segunda, e ultima, tabela com DELETE concedido.
--
-- COMO SE DESFAZ
--   drop table if exists experiencia.classificacao_texto, experiencia.alerta_detrator,
--     experiencia.execucao_rotina;
--   `classificacao_texto` e refazivel do zero pelo `cron_classificador`, porque o
--   `texto_cru` continua intacto. As outras duas nao: sao log e sao prova.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- execucao_rotina (F33, F48, F52, F54). Uma execucao de uma rotina.
-- E o log que sobra quando o do fornecedor expira: Resend guarda 30 dias (N23) e o
-- log do Supabase no plano gratuito guarda 1 dia.
-- -----------------------------------------------------------------------------
create table if not exists experiencia.execucao_rotina (
  id                    uuid        primary key default gen_random_uuid(),
  rotina                text        not null,
  passo                 text        null,
  iniciado_em           timestamptz not null default now(),
  terminado_em          timestamptz null,
  status                text        not null,
  respostas_no_periodo  integer     null,
  email_enviado         boolean     null,
  destinatarios         text[]      null,
  linhas_anonimizadas   integer     null,
  mascaramentos         integer     null,
  erro                  text        null,
  criado_em             timestamptz not null default now(),
  constraint execucao_rotina_dominio check (rotina in (
    'watcher_drive','cron_classificador','cron_digest_16h','cron_retencao','backup_semanal')),
  constraint execucao_rotina_passo_dominio check (passo is null or passo in ('consulta','envio')),
  constraint execucao_rotina_status_dominio check (status in ('sucesso','erro')),
  constraint execucao_rotina_erro_tem_mensagem
    check (status <> 'erro' or (erro is not null and btrim(erro) <> '')),
  constraint execucao_rotina_terminou_depois
    check (terminado_em is null or terminado_em >= iniciado_em)
);

comment on table experiencia.execucao_rotina is
  'Toda rotina grava uma linha, com sucesso ou com erro. A ausencia de linha nova e '
  'informacao: e o que /painel/saude mostra e o que o alarme humano dos dois dias cobre.';
comment on column experiencia.execucao_rotina.passo is
  'COLUNA NOVA, nao consta na folha canonica. `consulta` e `envio` no cron_digest_16h. '
  'O par consulta=sucesso e envio=erro e a assinatura exata da falha de ENTREGA, e sem '
  'ela nao se distingue problema de dado de problema de e-mail (ADR-05).';
comment on column experiencia.execucao_rotina.mascaramentos is
  'Quantos textos abertos tiveram telefone, e-mail ou CPF mascarados na varredura de '
  'cron_retencao (F48, N11). Aparece em /painel/saude.';

-- Indice: as ultimas 30 execucoes de cada rotina (vw_saude_rotina).
create index if not exists execucao_rotina_rotina_iniciado_idx
  on experiencia.execucao_rotina (rotina, iniciado_em desc);
-- Indice: a data da ultima escrita bem-sucedida, que nunca pode passar de 2 dias (F54).
create index if not exists execucao_rotina_sucesso_idx
  on experiencia.execucao_rotina (iniciado_em desc) where status = 'sucesso';

-- -----------------------------------------------------------------------------
-- alerta_detrator (F24, F25). Um alerta de um detrator.
-- Nome revogado: `alerta`, porque ja existe public.alertas (36 linhas, sistema fiscal)
-- no mesmo banco (secao 2.4).
-- -----------------------------------------------------------------------------
create table if not exists experiencia.alerta_detrator (
  id            uuid        primary key default gen_random_uuid(),
  resposta_id   uuid        not null references experiencia.resposta (id),
  nota          smallint    not null,
  fator         text        null,
  canal         text        not null default 'email',
  destinatario  text        not null,
  enviado_em    timestamptz null,
  atrasado      boolean     not null default false,
  contato_em    timestamptz null,
  erro          text        null,
  criado_em     timestamptz not null default now(),
  constraint alerta_detrator_nota_de_detrator check (nota between 0 and 6),
  constraint alerta_detrator_canal_dominio check (canal in ('email')),
  constraint alerta_detrator_fator_valido check (experiencia.fn_fator_valido(null, fator)),
  -- Um alerta por resposta. Reenvio atualiza a linha, nao cria a segunda.
  constraint alerta_detrator_resposta_uq unique (resposta_id)
);

comment on column experiencia.alerta_detrator.nota is
  'O gatilho e a NOTA, nao o motivo: dispara mesmo se a pessoa pular todas as telas '
  'seguintes (F24). O CHECK de 0 a 6 e o que garante que nenhum alerta nasca fora da '
  'faixa de detrator.';
comment on column experiencia.alerta_detrator.atrasado is
  'Verdadeiro quando a resposta chegou pela fila offline com mais de 20 minutos de '
  'atraso (N30), para o gerente nao abordar uma mesa que ja foi.';
comment on column experiencia.alerta_detrator.contato_em is
  'ACHADO: nenhuma tela do MVP escreve nesta coluna. O bloco 2 do digest e '
  'vw_alerta_incidente precisam de "houve contato" e "quanto tempo levou", e sem uma '
  'superficie de escrita a coluna fica sempre nula e o painel sempre diz "sem contato". '
  'A coluna existe, o registrador nao. Precisa entrar como entrega antes do go-live.';

create index if not exists alerta_detrator_resposta_idx on experiencia.alerta_detrator (resposta_id);
-- Indice: os 30 segundos, medidos entre resposta.respondido_em e alerta.enviado_em (N30).
create index if not exists alerta_detrator_enviado_idx on experiencia.alerta_detrator (enviado_em);
-- Indice: incidente sem contato, que aparece em destaque no bloco 2 do digest.
create index if not exists alerta_detrator_sem_contato_idx
  on experiencia.alerta_detrator (criado_em) where contato_em is null;

-- -----------------------------------------------------------------------------
-- classificacao_texto (F34, F30). Uma frase classificada de um comentario.
-- Nome revogado: `comentario_trecho` (secao 2.4).
-- -----------------------------------------------------------------------------
create table if not exists experiencia.classificacao_texto (
  id              uuid        primary key default gen_random_uuid(),
  resposta_id     uuid        not null references experiencia.resposta (id),
  frase_ordem     smallint    not null,
  frase           text        not null,
  dimensao        text        not null,
  fator           text        null,
  polaridade      text        not null,
  severidade      text        not null,
  nomeia_pessoa   boolean     not null default false,
  modelo          text        not null,
  versao_prompt   text        not null,
  classificado_em timestamptz not null default now(),
  criado_em       timestamptz not null default now(),
  constraint classificacao_texto_dimensao_dominio check (dimensao in (
    'comida','bebida','tempo','atendimento','precisao_pedido',
    'ambiente','limpeza','preco_valor','item_consumido')),
  constraint classificacao_texto_fator_valido check (experiencia.fn_fator_valido(dimensao, fator)),
  constraint classificacao_texto_polaridade_dominio
    check (polaridade in ('positivo','negativo','neutro')),
  constraint classificacao_texto_severidade_dominio
    check (severidade in ('baixa','media','alta')),
  constraint classificacao_texto_frase_nao_vazia check (btrim(frase) <> ''),
  constraint classificacao_texto_ordem_nao_negativa check (frase_ordem >= 0),
  -- Uma frase pode gerar dois registros com polaridades opostas em DIMENSOES
  -- diferentes (F34). Duas linhas na mesma dimensao para a mesma frase, nao.
  constraint classificacao_texto_uq unique (resposta_id, frase_ordem, dimensao)
);

comment on table experiencia.classificacao_texto is
  'Derivada e refazivel do zero: o texto_cru continua intacto em resposta_texto, e a '
  'reclassificacao e DELETE por resposta_id seguido de INSERT. O modelo NAO pode criar '
  'dimensao nem fator novos, e o CHECK e o que garante isso do lado do banco: valor fora '
  'da lista e rejeitado, nao aceito com aviso (F34).';
comment on column experiencia.classificacao_texto.versao_prompt is
  'Sem ela a contagem de um mes nao e comparavel com a de outro.';
comment on column experiencia.classificacao_texto.nomeia_pessoa is
  'Comentario com nomeia_pessoa = true NUNCA aparece nos blocos de cozinha e de salao, '
  'e vai por linha separada so para o proprietario (F30).';

create index if not exists classificacao_texto_resposta_idx
  on experiencia.classificacao_texto (resposta_id);
-- Indice: contagem por dimensao e fator na janela (vw_fator_contagem, origem classificacao).
create index if not exists classificacao_texto_dimensao_fator_idx
  on experiencia.classificacao_texto (dimensao, fator);
-- Indice: a fila do que ainda nao foi classificado se le por NOT EXISTS contra este
-- indice, a partir de resposta_texto.
create index if not exists classificacao_texto_classificado_idx
  on experiencia.classificacao_texto (classificado_em desc);

-- -----------------------------------------------------------------------------
-- Grants.
-- -----------------------------------------------------------------------------
grant select, insert, update         on experiencia.execucao_rotina     to experiencia_app;
grant select, insert, update         on experiencia.alerta_detrator     to experiencia_app;
grant select, insert, delete         on experiencia.classificacao_texto to experiencia_app;

grant select on
  experiencia.execucao_rotina, experiencia.alerta_detrator, experiencia.classificacao_texto
to experiencia_leitura;
