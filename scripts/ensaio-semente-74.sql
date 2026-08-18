-- =============================================================================
-- scripts/ensaio-semente-74.sql
--
-- Setenta e quatro linhas SINTETICAS com a forma de `public.cliques_avaliacao`, usadas por
-- `scripts/ensaio.sh --dados` para exercitar o CAMINHO FELIZ de
-- `20260817103000_semeia_convite_clique.sql`.
--
-- POR QUE EXISTE
--   Aplicar a migration como ela esta no repositorio falha de proposito, e o script de ensaio
--   confere essa falha. Mas a falha proposital nao prova que a migration FUNCIONA quando o bloco
--   esta preenchido, e foi so ao rodar o caminho feliz que apareceu um CHECK
--   (`convite_clique_garcom_nao_vazio`) que derrubaria a migracao inteira por causa de uma linha
--   com `garcom` em branco. Essa migration e o unico caminho para a unica copia desse historico.
--
-- O QUE ELAS TESTAM DE PROPOSITO
--   `Ana` e `  Ana  `        o mesmo garcom, resolvido por btrim e minusculas
--   `Ana` repetida            nao cria garcom duplicado
--   `Carla D'Ávila`           apostrofo, que quebra literal SQL mal escapado
--   `José`                    acento
--   `` (vazio)                fato da origem: 10 linhas ficam sem garcom resolvido
--   referrer com apostrofo    o mesmo escape, num campo que ninguem olha
--
--   Resultado esperado: 74 linhas, 64 com garcom resolvido, 4 garcons com PIN provisorio e
--   `ativo = false`. Reaplicar nao dobra nada.
--
-- GERADO uma vez por scripts/exporta_cliques_avaliacao.mjs contra uma origem falsa local.
-- Nao e dado real: os 74 registros de verdade so entram na migration no dia da migracao.
-- =============================================================================

insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (1, 'Ana', '2026-05-01T20:00:00.000Z'::timestamptz, null, null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (2, 'Bruno', '2026-05-02T20:01:00.000Z'::timestamptz, 'Mozilla/5.0 teste 1', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (3, 'Carla D''Ávila', '2026-05-03T20:02:00.000Z'::timestamptz, 'Mozilla/5.0 teste 2', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (4, '  Ana  ', '2026-05-04T20:03:00.000Z'::timestamptz, 'Mozilla/5.0 teste 3', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (5, '', '2026-05-05T20:04:00.000Z'::timestamptz, 'Mozilla/5.0 teste 4', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (6, 'José', '2026-05-06T20:05:00.000Z'::timestamptz, null, 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (7, 'Ana', '2026-05-07T20:06:00.000Z'::timestamptz, 'Mozilla/5.0 teste 6', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (8, 'Ana', '2026-05-08T20:07:00.000Z'::timestamptz, 'Mozilla/5.0 teste 7', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (9, 'Bruno', '2026-05-09T20:08:00.000Z'::timestamptz, 'Mozilla/5.0 teste 8', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (10, 'Carla D''Ávila', '2026-05-10T20:09:00.000Z'::timestamptz, 'Mozilla/5.0 teste 9', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (11, '  Ana  ', '2026-05-11T20:10:00.000Z'::timestamptz, null, 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (12, '', '2026-05-12T20:11:00.000Z'::timestamptz, 'Mozilla/5.0 teste 11', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (13, 'José', '2026-05-13T20:12:00.000Z'::timestamptz, 'Mozilla/5.0 teste 12', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (14, 'Ana', '2026-05-14T20:13:00.000Z'::timestamptz, 'Mozilla/5.0 teste 13', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (15, 'Ana', '2026-05-15T20:14:00.000Z'::timestamptz, 'Mozilla/5.0 teste 14', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (16, 'Bruno', '2026-05-16T20:15:00.000Z'::timestamptz, null, null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (17, 'Carla D''Ávila', '2026-05-17T20:16:00.000Z'::timestamptz, 'Mozilla/5.0 teste 16', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (18, '  Ana  ', '2026-05-18T20:17:00.000Z'::timestamptz, 'Mozilla/5.0 teste 17', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (19, '', '2026-05-19T20:18:00.000Z'::timestamptz, 'Mozilla/5.0 teste 18', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (20, 'José', '2026-05-20T20:19:00.000Z'::timestamptz, 'Mozilla/5.0 teste 19', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (21, 'Ana', '2026-05-21T20:20:00.000Z'::timestamptz, null, 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (22, 'Ana', '2026-05-22T20:21:00.000Z'::timestamptz, 'Mozilla/5.0 teste 21', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (23, 'Bruno', '2026-05-23T20:22:00.000Z'::timestamptz, 'Mozilla/5.0 teste 22', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (24, 'Carla D''Ávila', '2026-05-24T20:23:00.000Z'::timestamptz, 'Mozilla/5.0 teste 23', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (25, '  Ana  ', '2026-05-25T20:24:00.000Z'::timestamptz, 'Mozilla/5.0 teste 24', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (26, '', '2026-05-26T20:25:00.000Z'::timestamptz, null, 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (27, 'José', '2026-05-27T20:26:00.000Z'::timestamptz, 'Mozilla/5.0 teste 26', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (28, 'Ana', '2026-05-28T20:27:00.000Z'::timestamptz, 'Mozilla/5.0 teste 27', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (29, 'Ana', '2026-05-01T20:28:00.000Z'::timestamptz, 'Mozilla/5.0 teste 28', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (30, 'Bruno', '2026-05-02T20:29:00.000Z'::timestamptz, 'Mozilla/5.0 teste 29', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (31, 'Carla D''Ávila', '2026-05-03T20:30:00.000Z'::timestamptz, null, null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (32, '  Ana  ', '2026-05-04T20:31:00.000Z'::timestamptz, 'Mozilla/5.0 teste 31', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (33, '', '2026-05-05T20:32:00.000Z'::timestamptz, 'Mozilla/5.0 teste 32', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (34, 'José', '2026-05-06T20:33:00.000Z'::timestamptz, 'Mozilla/5.0 teste 33', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (35, 'Ana', '2026-05-07T20:34:00.000Z'::timestamptz, 'Mozilla/5.0 teste 34', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (36, 'Ana', '2026-05-08T20:35:00.000Z'::timestamptz, null, 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (37, 'Bruno', '2026-05-09T20:36:00.000Z'::timestamptz, 'Mozilla/5.0 teste 36', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (38, 'Carla D''Ávila', '2026-05-10T20:37:00.000Z'::timestamptz, 'Mozilla/5.0 teste 37', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (39, '  Ana  ', '2026-05-11T20:38:00.000Z'::timestamptz, 'Mozilla/5.0 teste 38', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (40, '', '2026-05-12T20:39:00.000Z'::timestamptz, 'Mozilla/5.0 teste 39', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (41, 'José', '2026-05-13T20:40:00.000Z'::timestamptz, null, 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (42, 'Ana', '2026-05-14T20:41:00.000Z'::timestamptz, 'Mozilla/5.0 teste 41', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (43, 'Ana', '2026-05-15T20:42:00.000Z'::timestamptz, 'Mozilla/5.0 teste 42', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (44, 'Bruno', '2026-05-16T20:43:00.000Z'::timestamptz, 'Mozilla/5.0 teste 43', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (45, 'Carla D''Ávila', '2026-05-17T20:44:00.000Z'::timestamptz, 'Mozilla/5.0 teste 44', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (46, '  Ana  ', '2026-05-18T20:45:00.000Z'::timestamptz, null, null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (47, '', '2026-05-19T20:46:00.000Z'::timestamptz, 'Mozilla/5.0 teste 46', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (48, 'José', '2026-05-20T20:47:00.000Z'::timestamptz, 'Mozilla/5.0 teste 47', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (49, 'Ana', '2026-05-21T20:48:00.000Z'::timestamptz, 'Mozilla/5.0 teste 48', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (50, 'Ana', '2026-05-22T20:49:00.000Z'::timestamptz, 'Mozilla/5.0 teste 49', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (51, 'Bruno', '2026-05-23T20:50:00.000Z'::timestamptz, null, 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (52, 'Carla D''Ávila', '2026-05-24T20:51:00.000Z'::timestamptz, 'Mozilla/5.0 teste 51', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (53, '  Ana  ', '2026-05-25T20:52:00.000Z'::timestamptz, 'Mozilla/5.0 teste 52', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (54, '', '2026-05-26T20:53:00.000Z'::timestamptz, 'Mozilla/5.0 teste 53', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (55, 'José', '2026-05-27T20:54:00.000Z'::timestamptz, 'Mozilla/5.0 teste 54', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (56, 'Ana', '2026-05-28T20:55:00.000Z'::timestamptz, null, 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (57, 'Ana', '2026-05-01T20:56:00.000Z'::timestamptz, 'Mozilla/5.0 teste 56', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (58, 'Bruno', '2026-05-02T20:57:00.000Z'::timestamptz, 'Mozilla/5.0 teste 57', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (59, 'Carla D''Ávila', '2026-05-03T20:58:00.000Z'::timestamptz, 'Mozilla/5.0 teste 58', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (60, '  Ana  ', '2026-05-04T20:59:00.000Z'::timestamptz, 'Mozilla/5.0 teste 59', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (61, '', '2026-05-05T20:00:00.000Z'::timestamptz, null, null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (62, 'José', '2026-05-06T20:01:00.000Z'::timestamptz, 'Mozilla/5.0 teste 61', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (63, 'Ana', '2026-05-07T20:02:00.000Z'::timestamptz, 'Mozilla/5.0 teste 62', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (64, 'Ana', '2026-05-08T20:03:00.000Z'::timestamptz, 'Mozilla/5.0 teste 63', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (65, 'Bruno', '2026-05-09T20:04:00.000Z'::timestamptz, 'Mozilla/5.0 teste 64', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (66, 'Carla D''Ávila', '2026-05-10T20:05:00.000Z'::timestamptz, null, 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (67, '  Ana  ', '2026-05-11T20:06:00.000Z'::timestamptz, 'Mozilla/5.0 teste 66', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (68, '', '2026-05-12T20:07:00.000Z'::timestamptz, 'Mozilla/5.0 teste 67', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (69, 'José', '2026-05-13T20:08:00.000Z'::timestamptz, 'Mozilla/5.0 teste 68', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (70, 'Ana', '2026-05-14T20:09:00.000Z'::timestamptz, 'Mozilla/5.0 teste 69', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (71, 'Ana', '2026-05-15T20:10:00.000Z'::timestamptz, null, 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (72, 'Bruno', '2026-05-16T20:11:00.000Z'::timestamptz, 'Mozilla/5.0 teste 71', 'https://exemplo.invalid/q?a=1''b');
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (73, 'Carla D''Ávila', '2026-05-17T20:12:00.000Z'::timestamptz, 'Mozilla/5.0 teste 72', null);
insert into origem_cliques_avaliacao (id, garcom, criado_em, user_agent, referrer) values (74, '  Ana  ', '2026-05-18T20:13:00.000Z'::timestamptz, 'Mozilla/5.0 teste 73', 'https://exemplo.invalid/q?a=1''b');
