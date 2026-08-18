-- =============================================================================
-- scripts/ensaio-dados.sql
--
-- O QUE FAZ
--   Exercita as funcoes e as views com dado de mentira, e CONFERE o resultado. Cada
--   conferencia e um `raise exception` quando o numero sai errado, entao o script inteiro
--   e um teste: ou termina com `TUDO CONFERIDO`, ou derruba na primeira divergencia.
--
-- POR QUE EXISTE
--   Migration que aplica limpo nao e funcao que devolve resultado certo. As 14 migrations
--   passaram a aplicar sem erro antes de qualquer uma destas conferencias existir, e ainda
--   assim `fn_grava_resposta` podia estar gravando a resposta e perdendo as filhas, ou
--   marcando `suspeita` em toda linha, ou calculando `dia_operacional` com o corte errado.
--   Nada disso aparece em `create or replace`.
--
--   O payload usado e o MESMO de `payloadCompleto()` em tests/contrato-sql.test.ts, campo
--   por campo. O teste em TypeScript prova que as chaves casam; este prova que a funcao faz
--   a coisa certa com elas.
--
-- O QUE ASSUME
--   1. `scripts/ensaio.sh` acabou de rodar: schema `experiencia` no lugar, as cinco tabelas
--      de custo em `public`, `convite_clique` vazia (a semente falha de proposito).
--   2. O banco e de ensaio e pode ser destruido. NAO RODAR contra projeto de verdade.
--   3. Os numeros conferidos aqui foram calculados a mao, e estao escritos junto de cada
--      conferencia. Quando a conta muda no SQL, esta conta tem de mudar junto, a mao. Isso
--      e proposital: conferencia que se atualiza sozinha nao confere nada.
-- =============================================================================

\set ON_ERROR_STOP on
set search_path = experiencia, public;

-- =============================================================================
-- PARTE 0. O corte das 6h, que e a decisao de desenho mais facil de errar.
-- =============================================================================
do $$
declare
  v_erros text := '';
  i       integer;
begin
  -- 01h30 de terca pertence a SEGUNDA operacional: o expediente de segunda-feira a noite
  -- atravessa a meia-noite, e cortar em meia-noite partiria uma noite de servico em dois
  -- dias, com metade das respostas caindo no dia seguinte.
  if experiencia.fn_dia_operacional('2026-08-05 01:30:00-03'::timestamptz) <> '2026-08-04' then
    v_erros := v_erros || format('01h30 de 05/08 deu %s, esperado 2026-08-04. ',
      experiencia.fn_dia_operacional('2026-08-05 01:30:00-03'::timestamptz));
  end if;

  -- 05h59 ainda e a noite anterior.
  if experiencia.fn_dia_operacional('2026-08-05 05:59:00-03'::timestamptz) <> '2026-08-04' then
    v_erros := v_erros || '05h59 deveria ser o dia anterior. ';
  end if;

  -- 06h00 em ponto vira o dia novo. O limite e fechado embaixo.
  if experiencia.fn_dia_operacional('2026-08-05 06:00:00-03'::timestamptz) <> '2026-08-05' then
    v_erros := v_erros || '06h00 deveria ser o dia corrente. ';
  end if;

  -- 23h59 e o proprio dia.
  if experiencia.fn_dia_operacional('2026-08-05 23:59:00-03'::timestamptz) <> '2026-08-05' then
    v_erros := v_erros || '23h59 deveria ser o proprio dia. ';
  end if;

  -- E a propriedade que o deslocamento LITERAL existe para garantir: `at time zone interval` da o
  -- MESMO resultado que `at time zone 'America/Sao_Paulo'` enquanto o Brasil nao tiver horario de
  -- verao, e e IMMUTABLE de verdade. Se um dia divergirem, o horario de verao voltou, e ai isto
  -- derruba a aplicacao em vez de deixar o dado gravado discordar do recalculado.
  for i in 0..364 loop
    declare
      v_ts timestamptz := '2026-01-01 00:00:00-03'::timestamptz + (i || ' days')::interval
                          + ((i * 37) % 1440 || ' minutes')::interval;
      v_nome date := ((v_ts at time zone 'America/Sao_Paulo') - interval '6 hours')::date;
      v_lit  date := experiencia.fn_dia_operacional(v_ts);
    begin
      if v_nome <> v_lit then
        v_erros := v_erros || format(
          'em %s o nome do fuso da %s e o deslocamento literal da %s. ', v_ts, v_nome, v_lit);
        exit;
      end if;
    end;
  end loop;

  if v_erros <> '' then
    raise exception 'fn_dia_operacional: %', v_erros;
  end if;
  raise notice 'ok  fn_dia_operacional: corte das 6h nos quatro limites, e o deslocamento literal';
  raise notice '    concorda com o nome do fuso nos 365 dias de 2026';
end
$$;

do $$
declare v_vol char;
begin
  -- `resposta.dia_operacional` e COLUNA GERADA, e coluna gerada exige funcao imutavel. O Postgres
  -- aceita a declaracao sem conferir o corpo, entao esta conferencia le o catalogo: se alguem
  -- trocar o deslocamento literal pelo nome do fuso de novo, a declaracao continua dizendo
  -- `immutable` e a mentira volta em silencio.
  select provolatile into v_vol
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'experiencia' and p.proname = 'fn_dia_operacional';

  if v_vol <> 'i' then
    raise exception 'fn_dia_operacional esta declarada como % e precisa ser immutable', v_vol;
  end if;

  -- E a prova de que o CORPO tambem e imutavel, e nao so a declaracao: uma expressao STABLE nao
  -- pode entrar num indice de expressao. Se o corpo voltar a usar o nome do fuso, isto falha.
  begin
    execute 'create index ensaio_prova_imutabilidade on experiencia.resposta ((experiencia.fn_dia_operacional(respondido_em)))';
    execute 'drop index experiencia.ensaio_prova_imutabilidade';
  exception when others then
    raise exception
      'fn_dia_operacional nao aceita indice de expressao: %. O corpo dela nao e imutavel de '
      'verdade, e `resposta.dia_operacional` e coluna gerada. Provavelmente voltou o '
      '`at time zone ''America/Sao_Paulo''`, que e STABLE.', sqlerrm;
  end;

  raise notice 'ok  fn_dia_operacional e imutavel na declaracao E no corpo';
end
$$;

do $$
begin
  -- Segunda fechada por padrao, 04/08/2026 e terca.
  if experiencia.fn_casa_abre('2026-08-03') then
    raise exception 'fn_casa_abre: segunda-feira deveria estar fechada por padrao';
  end if;
  if not experiencia.fn_casa_abre('2026-08-04') then
    raise exception 'fn_casa_abre: terca-feira deveria estar aberta por padrao';
  end if;

  insert into experiencia.calendario_operacao (dia_operacional, abre, motivo)
  values ('2026-08-03', true, 'feriado, casa abriu na segunda');
  if not experiencia.fn_casa_abre('2026-08-03') then
    raise exception 'fn_casa_abre: calendario_operacao deveria sobrepor o padrao semanal';
  end if;

  insert into experiencia.calendario_operacao (dia_operacional, abre, motivo)
  values ('2026-08-11', false, 'ferias coletivas');
  if experiencia.fn_casa_abre('2026-08-11') then
    raise exception 'fn_casa_abre: excecao de fechamento deveria sobrepor terca aberta';
  end if;

  raise notice 'ok  fn_casa_abre: padrao semanal e as duas direcoes de excecao';
end
$$;

-- ATENCAO ao `::smallint`: a assinatura e `fn_faixa_nps(smallint)`, e o Postgres NAO faz a
-- conversao implicita de literal inteiro na resolucao de funcao. `fn_faixa_nps(7)` falha com
-- "function does not exist", que e uma mensagem que nao ajuda ninguem. Dentro do banco isso
-- nunca aparece, porque a coluna gerada de `resposta` passa `nota`, que ja e `smallint`; quem
-- vai tropecar e quem escrever consulta a mao. Fica registrado aqui porque este arquivo e o
-- lugar onde a pegadinha foi descoberta.
do $$
begin
  if experiencia.fn_faixa_nps(0::smallint) <> 'detrator'
     or experiencia.fn_faixa_nps(6::smallint) <> 'detrator' then
    raise exception 'fn_faixa_nps: 0 e 6 sao detrator';
  end if;
  if experiencia.fn_faixa_nps(7::smallint) <> 'neutro'
     or experiencia.fn_faixa_nps(8::smallint) <> 'neutro' then
    raise exception 'fn_faixa_nps: 7 e 8 sao neutro';
  end if;
  if experiencia.fn_faixa_nps(9::smallint) <> 'promotor'
     or experiencia.fn_faixa_nps(10::smallint) <> 'promotor' then
    raise exception 'fn_faixa_nps: 9 e 10 sao promotor';
  end if;
  raise notice 'ok  fn_faixa_nps: os seis limites das tres faixas';
end
$$;

do $$
begin
  -- `fn_fator_valido` e o CHECK que impede par (dimensao, fator) inventado de entrar. Sem ele,
  -- um `fator` com erro de digitacao viraria uma linha nova no grafico de mencoes, e ninguem
  -- notaria porque o grafico continuaria bonito.
  if not experiencia.fn_fator_valido('comida', 'sabor') then
    raise exception 'fn_fator_valido: (comida, sabor) e par valido';
  end if;
  if experiencia.fn_fator_valido('comida', 'espera_mesa') then
    raise exception 'fn_fator_valido: espera_mesa nao e fator de comida, e passou';
  end if;
  if experiencia.fn_fator_valido('inventada', 'sabor') then
    raise exception 'fn_fator_valido: dimensao inexistente passou';
  end if;
  -- Fator nulo e valido: a T2A e a T2B marcam a dimensao sem descer ao fator.
  if not experiencia.fn_fator_valido('comida', null) then
    raise exception 'fn_fator_valido: fator nulo tem de ser aceito (T2A e T2B marcam dimensao)';
  end if;
  raise notice 'ok  fn_fator_valido: par certo passa, par trocado e dimensao inventada nao';
end
$$;

-- =============================================================================
-- PARTE 1. Cadastro.
-- =============================================================================
insert into experiencia.configuracao (chave, valor, descricao) values
  ('janela_duplicidade_minutos', '20', 'janela da trava de duplicidade por mesa'),
  ('email_alerta_gerente',       'gerente@exemplo.invalid', 'destino do alerta de detrator'),
  ('atraso_alerta_minutos',      '20', 'acima disso o alerta nasce marcado como atrasado')
on conflict (chave) do update set valor = excluded.valor;

insert into experiencia.garcom (id, nome, pin, ativo) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Ana',   '1234', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Bruno', '5678', true),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'Carla', '9012', false);

insert into experiencia.mesa (id, numero, area, capacidade) values
  ('bbbbbbbb-0000-4000-8000-000000000001', '7',  'salao',  4),
  ('bbbbbbbb-0000-4000-8000-000000000002', '12', 'varanda', 2);

-- `uso` e `em_uso` ou `reserva`, e nao a area do salao: D5 compra 5 tablets, 4 em uso e 1 de
-- reserva, e essa coluna e o que distingue os dois. Aparelho de reserva mudo nao e alarme.
insert into experiencia.dispositivo (id, apelido, uso) values
  ('cccccccc-0000-4000-8000-000000000001', 'tablet 1', 'em_uso'),
  ('cccccccc-0000-4000-8000-000000000002', 'tablet 2', 'em_uso'),
  ('cccccccc-0000-4000-8000-000000000005', 'tablet 5', 'reserva');

-- `consentimento_texto` NAO e semeada aqui: a migration 20260817107000 ja semeia a versao `1`,
-- que e a mesma que o bundle do PWA usa por omissao. Semear de novo aqui esconderia a ausencia da
-- migration, e a ausencia dela e o que recusava toda resposta com consentimento (A04).
do $$
begin
  if not exists (select 1 from experiencia.consentimento_texto where versao = '1') then
    raise exception
      'consentimento_texto nao tem a versao 1. A migration que a semeia nao rodou, e sem ela a '
      'chave estrangeira de consentimento.versao_texto recusa TODA resposta com consentimento.';
  end if;
end
$$;

insert into experiencia.item_cardapio (id, nome_pt, nome_en, grupo, produto_id_pdv, produto_nome_norm) values
  ('dddddddd-0000-4000-8000-000000000001', 'Margherita',  'Margherita',  'pizza',    'ALT-100', 'MARGHERITA'),
  ('dddddddd-0000-4000-8000-000000000002', 'Calabresa',   'Pepperoni',   'pizza',    'ALT-101', 'CALABRESA'),
  ('dddddddd-0000-4000-8000-000000000003', 'Bruschetta',  'Bruschetta',  'entrada',  'ALT-200', 'BRUSCHETTA');

insert into experiencia.pergunta_banco (id, numero, texto_pt, texto_en, opcoes, dimensao, fator, peso, ativa, em_foco, em_foco_desde) values
  ('eeeeeeee-0000-4000-8000-000000000001', 1, 'O tempo de espera foi aceitavel?', 'Was the wait acceptable?',
   '["sim","mais ou menos","nao"]'::jsonb, 'tempo', 'espera_mesa', 'alto', true, true, '2026-07-01'),
  -- `chegou_frio`, e nao `temperatura`: `temperatura` e fator de BEBIDA. O CHECK
  -- `pergunta_banco_fator_valido` derruba o par trocado, que e exatamente o que se quer dele.
  ('eeeeeeee-0000-4000-8000-000000000002', 2, 'A pizza veio na temperatura certa?', 'Was the pizza served hot?',
   '["sim","mais ou menos","nao"]'::jsonb, 'comida', 'chegou_frio', 'medio', true, false, null),
  ('eeeeeeee-0000-4000-8000-000000000003', 3, 'O ambiente estava confortavel?', 'Was the room comfortable?',
   '["sim","mais ou menos","nao"]'::jsonb, 'ambiente', null, 'baixo', true, false, null);

-- =============================================================================
-- PARTE 2. `fn_grava_resposta` com o payload COMPLETO.
--
-- Exatamente o `payloadCompleto()` de tests/contrato-sql.test.ts. O teste de contrato prova
-- que as chaves casam; aqui se prova que a funcao usa todas elas.
-- =============================================================================
do $$
declare
  v_id    uuid;
  v_p     jsonb;
  v_n     integer;
  v_r     record;
  -- 01h00 de HOJE pelo relogio de Sao Paulo. Duas propriedades de proposito:
  --   1. cai DENTRO das 48 horas em qualquer hora do dia em que este script rode, entao a
  --      funcao usa o relogio do cliente e da para conferir que ela usou;
  --   2. esta antes do corte das 6h, entao o dia operacional e o dia ANTERIOR, o que exercita
  --      a coluna gerada de verdade em vez de so a funcao isolada.
  -- Data fixa nao serviria: em duas semanas ela sai da janela de 48h e o teste muda de
  -- significado sem ninguem mexer nele.
  v_hoje  date        := (now() at time zone 'America/Sao_Paulo')::date;
  v_ts    timestamptz := (v_hoje::text || ' 01:00:00')::timestamp at time zone 'America/Sao_Paulo';
begin
  v_p := jsonb_build_object(
    'id',                   '11111111-1111-4111-8111-111111111111',
    'criado_em_cliente',    to_char(v_ts at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'nota',                 3,
    'canal',                'tablet',
    'idioma',               'pt',
    'versao_app',           '0.1.0',
    'versao_questionario',  '1.0.0',
    'mesa_digitada',        '7',
    'garcom_pin_digitado',  '1234',
    'dispositivo_id',       'cccccccc-0000-4000-8000-000000000001',
    'desfecho',             'respondeu',
    'opcoes', jsonb_build_array(
      jsonb_build_object('tela','T2C','dimensao','comida','fator','sabor','opcao_codigo','comida')),
    'itens', jsonb_build_array(
      jsonb_build_object('grupo','pizza','item_cardapio_id','dddddddd-0000-4000-8000-000000000001','fator','sabor')),
    'texto',     jsonb_build_object('texto_cru', 'a massa veio crua'),
    'sorteadas', jsonb_build_array(
      jsonb_build_object('pergunta_banco_id','eeeeeeee-0000-4000-8000-000000000002','respondida',true,'opcao_indice',1)),
    'telas', jsonb_build_array(
      jsonb_build_object('tela','T1','entrou_em','2026-08-05T01:00:00Z','saiu_em','2026-08-05T01:00:08Z','pulou',false)),
    'contato', jsonb_build_object('nome','Cliente','whatsapp','11999999999','email','a@b.com'),
    'consentimentos', jsonb_build_array(
      jsonb_build_object('finalidade','pesquisa','versao_texto','1','aceito_em','2026-08-05T01:00:00Z'),
      jsonb_build_object('finalidade','contato', 'versao_texto','1','aceito_em','2026-08-05T01:00:00Z'))
  );

  v_id := experiencia.fn_grava_resposta(v_p);
  if v_id::text <> '11111111-1111-4111-8111-111111111111' then
    raise exception 'fn_grava_resposta devolveu % em vez do id do cliente', v_id;
  end if;

  select * into v_r from experiencia.resposta where id = v_id;

  -- A COLUNA GERADA aplicando o corte das 6h: 01h00 e ainda a noite do dia anterior.
  -- Se este numero sair igual a `v_hoje`, o corte nao esta sendo aplicado na coluna, e metade
  -- das respostas de toda madrugada estaria caindo no dia seguinte.
  if v_r.dia_operacional <> v_hoje - 1 then
    raise exception 'dia_operacional deu % e 01h00 pertence ao dia anterior, %', v_r.dia_operacional, v_hoje - 1;
  end if;
  if v_r.faixa <> 'detrator' then
    raise exception 'faixa de nota 3 deu %, esperado detrator', v_r.faixa;
  end if;
  -- Carimbo do cliente dentro das 48h: e ELE que vale. Guardar o relogio do servidor aqui
  -- moveria a resposta para o dia operacional errado sempre que a fila do tablet demorasse a
  -- esvaziar, que e justamente o caso em que a fila existe.
  if v_r.respondido_em <> v_ts then
    raise exception 'respondido_em deu % e deveria ser o carimbo do cliente, %', v_r.respondido_em, v_ts;
  end if;
  if v_r.mesa_id <> 'bbbbbbbb-0000-4000-8000-000000000001' then
    raise exception 'mesa 7 nao foi resolvida: %', v_r.mesa_id;
  end if;
  if v_r.garcom_id <> 'aaaaaaaa-0000-4000-8000-000000000001' or not v_r.garcom_reconhecido then
    raise exception 'PIN 1234 nao resolveu a Ana: garcom_id=% reconhecido=%', v_r.garcom_id, v_r.garcom_reconhecido;
  end if;
  if v_r.suspeita then
    raise exception 'primeira resposta da mesa nao pode nascer suspeita';
  end if;
  raise notice 'ok  resposta: dia operacional, faixa, mesa, garcom e suspeita';

  -- As filhas. Uma por uma, porque "gravou a resposta" e "gravou a resposta inteira" sao
  -- coisas diferentes, e a segunda e a que interessa.
  select count(*) into v_n from experiencia.resposta_opcao where resposta_id = v_id;
  if v_n <> 1 then raise exception 'resposta_opcao: % linhas, esperado 1', v_n; end if;

  select count(*) into v_n from experiencia.resposta_item where resposta_id = v_id;
  if v_n <> 1 then raise exception 'resposta_item: % linhas, esperado 1', v_n; end if;

  select count(*) into v_n from experiencia.resposta_texto
   where resposta_id = v_id and texto_cru = 'a massa veio crua';
  if v_n <> 1 then raise exception 'resposta_texto: o texto cru nao foi gravado'; end if;

  select count(*) into v_n from experiencia.resposta_pergunta_sorteada
   where resposta_id = v_id and pergunta_banco_id = 'eeeeeeee-0000-4000-8000-000000000002'
     and respondida = true and opcao_indice = 1;
  if v_n <> 1 then raise exception 'resposta_pergunta_sorteada: id, respondida e opcao_indice nao chegaram'; end if;

  select count(*) into v_n from experiencia.tela_evento where resposta_id = v_id;
  if v_n <> 1 then raise exception 'tela_evento: % linhas, esperado 1', v_n; end if;

  select count(*) into v_n from experiencia.consentimento where resposta_id = v_id;
  if v_n <> 2 then raise exception 'consentimento: % linhas, esperado 2', v_n; end if;
  raise notice 'ok  filhas: opcao, item, texto, sorteada, tela e os dois consentimentos';

  -- A tentativa de par, com o MESMO id. E o denominador da conversao por garcom, e ela tem de
  -- existir uma vez, nunca duas: o PWA nao a envia, a funcao a grava.
  select count(*) into v_n from experiencia.tentativa where id = v_id and desfecho = 'respondeu';
  if v_n <> 1 then raise exception 'tentativa de par: % linhas, esperado exatamente 1', v_n; end if;
  raise notice 'ok  tentativa de par: uma linha, mesmo id, desfecho respondeu';

  -- O cliente e o consentimento de contato amarrados.
  select count(*) into v_n from experiencia.cliente where email = 'a@b.com';
  if v_n <> 1 then raise exception 'cliente: % linhas para a@b.com, esperado 1', v_n; end if;
  select count(*) into v_n from experiencia.consentimento
   where resposta_id = v_id and finalidade = 'contato' and cliente_id is not null;
  if v_n <> 1 then raise exception 'o consentimento de contato deveria apontar para o cliente'; end if;
  select count(*) into v_n from experiencia.consentimento
   where resposta_id = v_id and finalidade = 'pesquisa' and cliente_id is null;
  if v_n <> 1 then raise exception 'o consentimento de pesquisa NAO deve apontar para cliente: a coleta e anonima'; end if;
  raise notice 'ok  cliente: uma linha, e so o consentimento de contato aponta para ela';

  -- O alerta de detrator, gravado na MESMA transacao. Nota 3 e detrator.
  select count(*) into v_n from experiencia.alerta_detrator
   where resposta_id = v_id and nota = 3 and destinatario = 'gerente@exemplo.invalid';
  if v_n <> 1 then raise exception 'alerta_detrator: nota 3 deveria ter gerado alerta'; end if;
  select count(*) into v_n from experiencia.alerta_detrator where resposta_id = v_id and fator = 'sabor';
  if v_n <> 1 then raise exception 'o alerta deveria carregar o primeiro fator marcado (sabor)'; end if;
  raise notice 'ok  alerta_detrator: gravado na transacao, com destinatario e fator';
end
$$;

-- =============================================================================
-- PARTE 3. Idempotencia. Cinco reenvios do mesmo payload.
--
-- E a garantia que permite a fila do tablet ser agressiva. Se ela falhar, uma queda de rede
-- no meio do envio infla o total do dia, e o numero fica errado para sempre sem ninguem saber.
-- =============================================================================
do $$
declare
  v_p     jsonb;
  v_ids   uuid[] := '{}';
  v_n     integer;
  i       integer;
  v_hoje  date        := (now() at time zone 'America/Sao_Paulo')::date;
  v_ts    timestamptz := (v_hoje::text || ' 01:00:00')::timestamp at time zone 'America/Sao_Paulo';
begin
  -- O MESMO carimbo da Parte 2, senao isto nao seria reenvio do mesmo payload.
  v_p := jsonb_build_object(
    'id','11111111-1111-4111-8111-111111111111',
    'criado_em_cliente', to_char(v_ts at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'nota',3,'canal','tablet','idioma','pt','versao_app','0.1.0','versao_questionario','1.0.0',
    'mesa_digitada','7','garcom_pin_digitado','1234',
    'dispositivo_id','cccccccc-0000-4000-8000-000000000001',
    'opcoes','[]'::jsonb,'itens','[]'::jsonb,'sorteadas','[]'::jsonb,'telas','[]'::jsonb,
    'consentimentos','[]'::jsonb);

  for i in 1..5 loop
    v_ids := v_ids || experiencia.fn_grava_resposta(v_p);
  end loop;

  if array_length(array(select distinct unnest(v_ids)), 1) <> 1 then
    raise exception 'os cinco reenvios deveriam devolver o mesmo id';
  end if;

  select count(*) into v_n from experiencia.resposta where id = '11111111-1111-4111-8111-111111111111';
  if v_n <> 1 then raise exception 'apos 5 reenvios existem % respostas, esperado 1', v_n; end if;

  select count(*) into v_n from experiencia.tentativa where id = '11111111-1111-4111-8111-111111111111';
  if v_n <> 1 then raise exception 'apos 5 reenvios existem % tentativas, esperado 1', v_n; end if;

  -- E o mais importante: o reenvio nao pode ter apagado nem duplicado as filhas da primeira.
  select count(*) into v_n from experiencia.resposta_opcao
   where resposta_id = '11111111-1111-4111-8111-111111111111';
  if v_n <> 1 then
    raise exception 'o reenvio com opcoes vazias mexeu nas filhas: resposta_opcao tem % linhas, esperado 1 (a da primeira gravacao)', v_n;
  end if;
  select count(*) into v_n from experiencia.resposta_texto
   where resposta_id = '11111111-1111-4111-8111-111111111111';
  if v_n <> 1 then raise exception 'o reenvio apagou o texto cru da primeira gravacao'; end if;

  raise notice 'ok  idempotencia: 5 reenvios, 1 resposta, 1 tentativa, filhas intactas';
end
$$;

-- =============================================================================
-- PARTE 4. O canal `qr`, que nao passa pela T0 e portanto nao tem PIN.
-- =============================================================================
do $$
declare
  v_id uuid;
  v_n  integer;
begin
  v_id := experiencia.fn_grava_resposta(jsonb_build_object(
    'id','22222222-2222-4222-8222-000000000001','criado_em_cliente', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'nota',10,'canal','qr','idioma','en','versao_app','0.1.0','versao_questionario','1.0.0',
    'opcoes','[]'::jsonb,'itens','[]'::jsonb,'sorteadas','[]'::jsonb,'telas','[]'::jsonb,
    'consentimentos','[]'::jsonb));

  select count(*) into v_n from experiencia.resposta where id = v_id and canal = 'qr'
    and garcom_pin_digitado is null and garcom_reconhecido = false;
  if v_n <> 1 then raise exception 'resposta por QR sem PIN deveria ter sido aceita'; end if;

  -- E NAO pode gerar tentativa: tentativa e uma abordagem de mesa registrada na T0, e resposta
  -- por QR no celular do cliente nao e abordagem. Gravar uma aqui inflaria o denominador da
  -- conversao por garcom com abordagens que nunca existiram.
  select count(*) into v_n from experiencia.tentativa where id = v_id;
  if v_n <> 0 then raise exception 'resposta por QR gerou tentativa, e nao deveria'; end if;

  -- Nota 10 nao gera alerta.
  select count(*) into v_n from experiencia.alerta_detrator where resposta_id = v_id;
  if v_n <> 0 then raise exception 'nota 10 nao deveria gerar alerta de detrator'; end if;

  raise notice 'ok  canal qr: aceito sem PIN, sem tentativa, sem alerta';
end
$$;

do $$
begin
  -- E a recusa do outro lado: sem PIN ela nao existe, porque e um toque na T0.
  begin
    perform experiencia.fn_grava_resposta(jsonb_build_object(
      'id','22222222-2222-4222-8222-000000000009','criado_em_cliente', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF'),
      'nota',5,'canal','tablet','idioma','pt','versao_questionario','1.0.0',
      'opcoes','[]'::jsonb,'itens','[]'::jsonb,'sorteadas','[]'::jsonb,'telas','[]'::jsonb,
      'consentimentos','[]'::jsonb));
    raise exception 'resposta de TABLET sem PIN deveria ter sido rejeitada, e passou';
  exception when others then
    if sqlerrm not like '%garcom_pin_digitado%' then raise; end if;
  end;
  raise notice 'ok  tablet sem PIN: rejeitado, com mensagem que diz o motivo';
end
$$;

-- =============================================================================
-- PARTE 5. A recusa: uma linha em `tentativa`, e nada mais.
-- =============================================================================
do $$
declare
  v_id uuid;
  v_n  integer;
begin
  v_id := experiencia.fn_grava_resposta(jsonb_build_object(
    'id','33333333-3333-4333-8333-000000000001','criado_em_cliente', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'desfecho','recusou','canal','tablet','mesa_digitada','12','garcom_pin_digitado','5678',
    'dispositivo_id','cccccccc-0000-4000-8000-000000000001'));

  select count(*) into v_n from experiencia.tentativa where id = v_id and desfecho = 'recusou'
    and garcom_id = 'aaaaaaaa-0000-4000-8000-000000000002';
  if v_n <> 1 then raise exception 'a recusa nao gravou tentativa resolvida para o Bruno'; end if;

  select count(*) into v_n from experiencia.resposta where id = v_id;
  if v_n <> 0 then raise exception 'a recusa criou uma resposta, e nao deveria: nao houve nota'; end if;

  raise notice 'ok  recusa: uma tentativa, nenhuma resposta';
end
$$;

-- =============================================================================
-- PARTE 6. PIN que nao casa, e mesa que nao casa.
--
-- Nos dois casos a resposta ENTRA nos indicadores gerais. Rejeitar seria perder a nota de um
-- cliente de verdade por causa de um erro de digitacao de quem entregou o tablet.
-- =============================================================================
do $$
declare
  v_id uuid;
  v_r  record;
begin
  v_id := experiencia.fn_grava_resposta(jsonb_build_object(
    'id','44444444-4444-4444-8444-000000000001','criado_em_cliente', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'nota',9,'canal','tablet','idioma','pt','versao_questionario','1.0.0',
    'mesa_digitada','99','garcom_pin_digitado','0000',
    'dispositivo_id','cccccccc-0000-4000-8000-000000000002',
    'opcoes','[]'::jsonb,'itens','[]'::jsonb,'sorteadas','[]'::jsonb,'telas','[]'::jsonb,
    'consentimentos','[]'::jsonb));

  select * into v_r from experiencia.resposta where id = v_id;
  if v_r.mesa_id is not null then raise exception 'mesa 99 nao existe e nao deveria ter sido resolvida'; end if;
  if v_r.mesa_digitada <> '99' then raise exception 'mesa_digitada crua deveria ter sido preservada'; end if;
  if v_r.garcom_id is not null or v_r.garcom_reconhecido then
    raise exception 'PIN 0000 nao existe: garcom_reconhecido deveria ser falso';
  end if;
  if v_r.garcom_pin_digitado <> '0000' then raise exception 'o PIN cru deveria ter sido preservado'; end if;
  if v_r.faixa <> 'promotor' then raise exception 'a resposta tem de entrar nos indicadores: faixa deu %', v_r.faixa; end if;

  -- PIN de garcom INATIVO tambem nao resolve. A Carla tem PIN 9012 e `ativo = false`, e e por
  -- isso que a semente de `convite_clique` pode criar garcom inativo com PIN provisorio sem
  -- risco de atribuir resposta nova a ninguem por acidente.
  v_id := experiencia.fn_grava_resposta(jsonb_build_object(
    'id','44444444-4444-4444-8444-000000000002','criado_em_cliente', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'nota',8,'canal','tablet','idioma','pt','versao_questionario','1.0.0',
    'garcom_pin_digitado','9012','dispositivo_id','cccccccc-0000-4000-8000-000000000002',
    'opcoes','[]'::jsonb,'itens','[]'::jsonb,'sorteadas','[]'::jsonb,'telas','[]'::jsonb,
    'consentimentos','[]'::jsonb));
  select * into v_r from experiencia.resposta where id = v_id;
  if v_r.garcom_reconhecido then raise exception 'PIN de garcom inativo nao deveria resolver'; end if;

  raise notice 'ok  nao reconhecido: mesa e PIN crus preservados, resposta contada, inativo nao resolve';
end
$$;

-- =============================================================================
-- PARTE 7. A trava de duplicidade por mesa: MARCA, nunca rejeita.
-- =============================================================================
do $$
declare
  v_a uuid;
  v_b uuid;
  v_r record;
  v_t timestamptz := now();
begin
  v_a := experiencia.fn_grava_resposta(jsonb_build_object(
    'id','55555555-5555-4555-8555-000000000001','criado_em_cliente', to_char(v_t,'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'nota',7,'canal','tablet','idioma','pt','versao_questionario','1.0.0',
    'mesa_digitada','12','garcom_pin_digitado','1234',
    'dispositivo_id','cccccccc-0000-4000-8000-000000000001',
    'opcoes','[]'::jsonb,'itens','[]'::jsonb,'sorteadas','[]'::jsonb,'telas','[]'::jsonb,
    'consentimentos','[]'::jsonb));

  -- Dois minutos depois, mesma mesa. Mesas juntadas com comandas individuais produzem isso
  -- todo dia, e sao respostas legitimas.
  v_b := experiencia.fn_grava_resposta(jsonb_build_object(
    'id','55555555-5555-4555-8555-000000000002',
    'criado_em_cliente', to_char(v_t + interval '2 minutes','YYYY-MM-DD"T"HH24:MI:SSOF'),
    'nota',6,'canal','tablet','idioma','pt','versao_questionario','1.0.0',
    'mesa_digitada','12','garcom_pin_digitado','1234',
    'dispositivo_id','cccccccc-0000-4000-8000-000000000001',
    'opcoes','[]'::jsonb,'itens','[]'::jsonb,'sorteadas','[]'::jsonb,'telas','[]'::jsonb,
    'consentimentos','[]'::jsonb));

  select * into v_r from experiencia.resposta where id = v_b;
  if v_r.id is null then raise exception 'a segunda resposta da mesa foi REJEITADA, e deveria ter sido aceita'; end if;
  if not v_r.suspeita then raise exception 'a segunda resposta da mesa em 2 minutos deveria estar marcada como suspeita'; end if;
  if v_r.suspeita_motivo is null then raise exception 'suspeita sem motivo escrito nao serve para nada'; end if;

  select * into v_r from experiencia.resposta where id = v_a;
  if v_r.suspeita then raise exception 'a PRIMEIRA resposta nao pode ter sido marcada retroativamente'; end if;

  raise notice 'ok  duplicidade: segunda resposta aceita e marcada, primeira intacta';
end
$$;

-- =============================================================================
-- PARTE 8. `fn_sorteia_pergunta`, com as regras que dao para conferir com 3 perguntas.
-- =============================================================================
do $$
declare
  v_n        integer;
  v_dims     integer;
begin
  -- A resposta 44444444...01 tem nota 9 (promotor) e nenhuma opcao marcada: pela regra de
  -- quantidade, promotor recebe 2 perguntas.
  select count(*) into v_n
  from experiencia.fn_sorteia_pergunta('44444444-4444-4444-8444-000000000001', '99');
  if v_n <> 2 then raise exception 'promotor deveria receber 2 perguntas sorteadas, e recebeu %', v_n; end if;

  -- Uma por dimensao, nunca duas da mesma.
  select count(distinct pb.dimensao) into v_dims
  from experiencia.fn_sorteia_pergunta('44444444-4444-4444-8444-000000000001', '99') s
  join experiencia.pergunta_banco pb on pb.id = s;
  if v_dims <> 2 then raise exception 'as 2 perguntas deveriam vir de 2 dimensoes distintas, e vieram de %', v_dims; end if;

  -- Detrator recebe zero: quem acabou de dar nota 3 e explicar o motivo nao leva mais pergunta.
  select count(*) into v_n
  from experiencia.fn_sorteia_pergunta('11111111-1111-4111-8111-111111111111', '7');
  if v_n <> 0 then raise exception 'detrator nao deveria receber pergunta rotacionada, e recebeu %', v_n; end if;

  -- Neutro recebe uma.
  select count(*) into v_n
  from experiencia.fn_sorteia_pergunta('44444444-4444-4444-8444-000000000002', null);
  if v_n <> 1 then raise exception 'neutro deveria receber 1 pergunta, e recebeu %', v_n; end if;

  raise notice 'ok  fn_sorteia_pergunta: 2 para promotor em 2 dimensoes, 1 para neutro, 0 para detrator';
end
$$;

-- =============================================================================
-- PARTE 9. `fn_registra_sinal`.
-- =============================================================================
do $$
declare
  v_r record;
begin
  perform experiencia.fn_registra_sinal(jsonb_build_object(
    'dispositivo_id','cccccccc-0000-4000-8000-000000000001','versao_app','0.2.0','fila_pendente',7));
  select * into v_r from experiencia.dispositivo where id = 'cccccccc-0000-4000-8000-000000000001';
  if v_r.fila_pendente <> 7 or v_r.versao_app <> '0.2.0' or v_r.ultimo_sinal_em is null then
    raise exception 'fn_registra_sinal nao atualizou o aparelho: fila=% versao=% sinal=%',
      v_r.fila_pendente, v_r.versao_app, v_r.ultimo_sinal_em;
  end if;

  -- Aparelho desconhecido e IGNORADO, nao criado: o cadastro dos 5 tablets e ato humano, e nao
  -- efeito colateral de heartbeat. Um QR aberto num celular qualquer nao pode virar aparelho.
  perform experiencia.fn_registra_sinal(jsonb_build_object(
    'dispositivo_id','cccccccc-0000-4000-8000-000000000099','versao_app','0.2.0','fila_pendente',1));
  if exists (select 1 from experiencia.dispositivo where id = 'cccccccc-0000-4000-8000-000000000099') then
    raise exception 'fn_registra_sinal criou aparelho desconhecido, e nao deveria';
  end if;

  raise notice 'ok  fn_registra_sinal: atualiza o conhecido, ignora o desconhecido';
end
$$;

-- =============================================================================
-- PARTE 10. O custo recursivo. E o diferencial numero 1 do projeto, e o unico numero
-- deste arquivo que da para conferir com lapis e papel.
--
--   As premissas da view, que estao declaradas no cabecalho da migration e sao NAO
--   VERIFICADAS (N46), e o que este ensaio segue ao pe da letra:
--     `insumos_master.rn`         fator de rendimento em (0,1]: quantidade / rn
--     `insumos_master.rendimento` rendimento DO LOTE da sub-receita, na unidade padrao
--     `rn_override` da linha       substitui o `rn` do insumo
--
--   Margherita, ficha tecnica:
--     massa      200 g de sub-receita `MASSA`   (producao_interna, rn 1, rendimento 1000 g)
--     mucarela   150 g de insumo comercial      (rn 1)
--
--   MASSA, ficha tecnica propria, que e o segundo nivel:
--     farinha    600 g a R$ 0,006/g
--     agua       400 g a R$ 0,000/g
--
--   Nivel 1:  massa      200 / 1 = 200 g de sub-receita
--             mucarela   150 / 1 = 150 g  x 0,050 = R$ 7,50
--   Nivel 2:  farinha    200 x 600 / 1000 = 120 g  x 0,006 = R$ 0,72
--             agua       200 x 400 / 1000 =  80 g  x 0,000 = R$ 0,00
--
--   CUSTO TOTAL = 7,50 + 0,72 + 0,00 = R$ 8,22
--   Preco 49,00  ->  CMV = 8,22 / 49,00 = 16,8%   margem = R$ 40,78
--
-- Uma soma PLANA daria R$ 7,50, ignorando massa e molho, que numa pizzaria sao a maior parte
-- do custo. E por isso que a consulta e `with recursive` e nao um `join`.
--
-- A agua entra com preco ZERO de proposito, e nao nula: `sum()` do SQL ignora nulo em silencio,
-- e a view forca o custo a nulo quando conta insumo sem preco. Preco zero e um preco, e tem de
-- somar como zero; ausencia de preco tem de derrubar o custo inteiro. Sao casos diferentes, e
-- este ensaio exercita os dois.
-- =============================================================================
do $$
declare
  v_massa    uuid;
  v_farinha  uuid;
  v_agua     uuid;
  v_mucarela uuid;
  v_prato    uuid;
begin
  insert into public.insumos_master (nome_qt, tipo, rn, unidade_padrao)
  values ('FARINHA', 'comercial', 1, 'g') returning id into v_farinha;
  insert into public.insumos_master (nome_qt, tipo, rn, unidade_padrao)
  values ('AGUA', 'comercial', 1, 'g') returning id into v_agua;
  insert into public.insumos_master (nome_qt, tipo, rn, unidade_padrao)
  values ('MUCARELA', 'comercial', 1, 'g') returning id into v_mucarela;
  -- `rn` fica em 1 e o rendimento do lote vai em `rendimento`. Sao colunas DIFERENTES com
  -- papeis diferentes, e trocar uma pela outra e exatamente o erro que a nota N46 avisa que
  -- ninguem confirmou ainda: com 1000 no `rn`, a quantidade de massa na pizza cai para 0,2 g,
  -- os dois insumos do segundo nivel ficam sem quantidade e a view devolve custo AUSENTE.
  -- Que ela devolva ausente, e nao um numero pequeno e plausivel, e o comportamento certo.
  insert into public.insumos_master (nome_qt, tipo, rn, rendimento, unidade_padrao)
  values ('MASSA', 'producao_interna', 1, 1000, 'g') returning id into v_massa;

  insert into public.historico_precos (insumo_master_id, data, valor_unit_normalizado) values
    (v_farinha,  '2026-08-01', 0.006),
    (v_agua,     '2026-08-01', 0.000),
    (v_mucarela, '2026-08-01', 0.050),
    -- Preco ANTIGO da mucarela, para provar que a view usa o mais recente e nao o primeiro.
    (v_mucarela, '2026-01-01', 0.030);

  insert into public.producao_ingredientes (producao_id, insumo_master_id, quantidade, ordem) values
    (v_massa, v_farinha, 600, 1),
    (v_massa, v_agua,    400, 2);

  insert into public.pratos (nome, categoria, id_altec, preco_venda, cmv_meta, ativo)
  values ('Margherita', 'PIZZAS', 'ALT-100', 49.00, 30.0, true) returning id into v_prato;

  insert into public.prato_ingredientes (prato_id, insumo_master_id, quantidade, ordem) values
    (v_prato, v_massa,    200, 1),
    (v_prato, v_mucarela, 150, 2);

  -- Um segundo prato SEM ficha tecnica, para provar que ele aparece como ausente e nunca
  -- como custo zero. Custo zero num painel de margem e o pior erro possivel: ele nao parece
  -- erro, parece um prato muito lucrativo.
  insert into public.pratos (nome, categoria, id_altec, preco_venda, ativo)
  values ('Calabresa', 'PIZZAS', 'ALT-101', 52.00, true);

  update experiencia.item_cardapio set prato_id = v_prato
   where id = 'dddddddd-0000-4000-8000-000000000001';
end
$$;

do $$
declare
  v_r record;
begin
  -- A view devolve uma SERIE por prato, uma linha por data em que o preco de algum insumo da
  -- arvore mudou. Ler sem filtro de vigencia pega uma data qualquer da historia, e em
  -- 01/01/2026 a farinha ainda nao tinha preco, entao o custo daquela linha e ausente com
  -- razao. O filtro abaixo e o que esta escrito no comentario da propria view.
  select * into v_r
  from experiencia.vw_custo_prato
  where id_altec = 'ALT-100'
    and data_referencia <= current_date
    and (vigente_ate is null or vigente_ate > current_date);

  if v_r.prato_nome is null then raise exception 'vw_custo_prato nao devolveu a Margherita'; end if;

  -- A conferencia a lapis: R$ 8,22.
  if round(v_r.custo_total, 2) <> 8.22 then
    raise exception 'custo da Margherita deu % e a conta a mao da 8.22. Soma plana daria 7.50, o que indicaria que a recursao nao desceu na sub-receita MASSA', round(v_r.custo_total, 2);
  end if;
  if round(v_r.margem_bruta, 2) <> 40.78 then
    raise exception 'margem deu %, esperado 40.78', round(v_r.margem_bruta, 2);
  end if;
  if round(v_r.cmv_pct, 1) <> 16.8 then
    raise exception 'CMV deu %%%, esperado 16.8%%', round(v_r.cmv_pct, 1);
  end if;
  if v_r.nivel_maximo < 2 then
    raise exception 'nivel_maximo deu %, e a ficha tem 2 niveis: a recursao nao desceu', v_r.nivel_maximo;
  end if;
  if v_r.custo_ausente then raise exception 'a Margherita tem ficha completa e nao deveria estar marcada como ausente'; end if;
  raise notice 'ok  vw_custo_prato: R$ 8,22 com a sub-receita resolvida, CMV 16,8%%, 2 niveis';

  -- E o prato sem ficha.
  select * into v_r
  from experiencia.vw_custo_prato
  where id_altec = 'ALT-101'
    and data_referencia <= current_date
    and (vigente_ate is null or vigente_ate > current_date);
  if not v_r.custo_ausente then
    raise exception 'prato sem ficha tecnica deveria vir com custo_ausente = true';
  end if;
  if v_r.custo_total is not null and v_r.custo_total = 0 then
    raise exception 'prato sem ficha veio com custo ZERO, que num painel de margem parece prato muito lucrativo';
  end if;
  if v_r.motivo_incompleto is null then
    raise exception 'custo ausente sem motivo escrito nao diz a quem le o que fazer';
  end if;
  raise notice 'ok  vw_custo_prato: prato sem ficha vem ausente com motivo, nunca zero';
end
$$;

-- -----------------------------------------------------------------------------
-- A25 e A26: o ramo repetido e contado, e a data com duas notas usa a media.
-- -----------------------------------------------------------------------------
do $$
declare
  v_base     uuid;
  v_massa    uuid;
  v_queijo   uuid;
  v_prato    uuid;
  v_r        record;
begin
  -- A26 primeiro, no proprio prato ja conferido: uma SEGUNDA nota de mucarela na mesma data, com
  -- preco diferente. Antes o desempate era por uuid, entao o custo dependia de qual identificador
  -- saiu maior; agora e a media das duas.
  --
  --   mucarela: 0,050 e 0,070 na mesma data -> media 0,060
  --   150 g x 0,060 = R$ 9,00, e o custo do prato passa de 8,22 para 9,72.
  insert into public.historico_precos (insumo_master_id, data, valor_unit_normalizado)
  select id, '2026-08-01', 0.070 from public.insumos_master where nome_qt = 'MUCARELA';

  select * into v_r from experiencia.vw_custo_prato
  where id_altec = 'ALT-100'
    and data_referencia <= current_date
    and (vigente_ate is null or vigente_ate > current_date);

  if round(v_r.custo_total, 2) <> 9.72 then
    raise exception
      'A26: com duas notas de mucarela na mesma data (0,050 e 0,070), a media da 0,060 e o custo '
      'deveria ser 9,72. Deu %. Se der 8,22 ou 10,50, o desempate voltou a ser por uma nota so, e '
      'o custo do prato passa a depender de qual uuid saiu maior.', round(v_r.custo_total, 2);
  end if;
  raise notice 'ok  A26: data com duas notas usa a media das duas (custo 9,72)';

  -- A25: um CICLO DE VERDADE, A -> B -> A.
  --
  -- Vale registrar o que a critica errou aqui, porque o erro dela e instrutivo: o exemplo que ela
  -- deu — "mucarela no molho e mucarela dentro da base do molho" — NAO aciona o guarda. `visitados`
  -- acumula por CAMINHO, e `molho -> mucarela` e `molho -> base -> mucarela` sao dois caminhos
  -- distintos, nenhum deles com repeticao interna. Esse caso sempre funcionou, e a mucarela era
  -- somada duas vezes corretamente, uma por ramo.
  --
  -- O guarda so dispara na repeticao DENTRO de um caminho, que e ciclo mesmo. E ai o problema
  -- existia e era o descrito: o no sumia sem entrar em contagem nenhuma, e o custo do prato saia
  -- MENOR e plausivel — que num painel de margem nao parece erro, parece prato lucrativo.
  insert into public.insumos_master (nome_qt, tipo, rn, rendimento, unidade_padrao)
  values ('BASE COM CICLO', 'producao_interna', 1, 1000, 'g') returning id into v_base;
  select id into v_massa from public.insumos_master where nome_qt = 'MASSA';
  select id into v_queijo from public.insumos_master where nome_qt = 'MUCARELA';

  -- MASSA -> BASE -> MASSA. Ciclo fechado, do tipo que uma ficha tecnica editada a mao produz.
  insert into public.producao_ingredientes (producao_id, insumo_master_id, quantidade, ordem)
  values (v_base, v_massa, 100, 1);
  insert into public.producao_ingredientes (producao_id, insumo_master_id, quantidade, ordem)
  values (v_massa, v_base, 50, 3);

  insert into public.pratos (nome, categoria, id_altec, preco_venda, ativo)
  values ('Prato Com Ciclo', 'PIZZAS', 'ALT-777', 60.00, true) returning id into v_prato;
  insert into public.prato_ingredientes (prato_id, insumo_master_id, quantidade, ordem) values
    (v_prato, v_queijo, 100, 1),
    (v_prato, v_massa,  200, 2);

  select * into v_r from experiencia.vw_custo_prato
  where id_altec = 'ALT-777'
    and data_referencia <= current_date
    and (vigente_ate is null or vigente_ate > current_date);

  if v_r.insumos_em_ciclo < 1 then
    raise exception
      'A25: o insumo repetido no ramo NAO foi contado (insumos_em_ciclo = %). Antes ele sumia sem '
      'entrar em contagem nenhuma, e o custo do prato saia menor e plausivel — que num painel de '
      'margem nao parece erro, parece prato lucrativo.', v_r.insumos_em_ciclo;
  end if;
  if not v_r.custo_ausente then
    raise exception 'A25: com ramo em ciclo, o custo tem de vir AUSENTE e veio %', v_r.custo_total;
  end if;
  if v_r.motivo_incompleto not like '%ciclo%' then
    raise exception 'A25: o motivo nao explica o ciclo: %', v_r.motivo_incompleto;
  end if;
  raise notice 'ok  A25: ramo repetido e contado, custo vem ausente com motivo, e nao menor em silencio';

  -- Desfaz o que este bloco criou, para nao mexer nos numeros conferidos a lapis mais acima.
  delete from public.prato_ingredientes where prato_id = v_prato;
  delete from public.pratos where id = v_prato;
  delete from public.producao_ingredientes where producao_id = v_base;
  delete from public.producao_ingredientes where producao_id = v_massa and insumo_master_id = v_base;
  delete from public.insumos_master where id = v_base;
  delete from public.historico_precos
   where insumo_master_id = v_queijo and valor_unit_normalizado = 0.070;
end
$$;

-- =============================================================================
-- A24. O insumo que tem lista propria e NAO esta rotulado como `producao_interna`.
--
-- A inspecao de 14/08/2026 registrou `insumos_master` com 131 linhas e, tres paragrafos antes,
-- 129 `comercial` mais 1 `producao_interna`. Falta uma linha, e `tipo` e NOT NULL. Este bloco nao
-- descobre qual e — isso so o banco de producao responde. Ele prova que a resposta DEIXOU DE
-- IMPORTAR para o calculo.
--
-- O que se monta aqui e o caso exato do vao: um insumo com `tipo` que ninguem documentou, com lista
-- propria de ingredientes. Antes da correcao, `arvore` nao descia nele (o `join` exigia
-- `tipo = 'producao_interna'`) e `folha` tambem nao o aceitava (ele TEM lista). O no sumia inteiro:
-- fora de `insumos_contados`, fora de todos os contadores de buraco, e o custo do prato saia MENOR,
-- completo e sem aviso nenhum.
-- =============================================================================
do $$
declare
  v_sub    uuid;
  v_queijo uuid;
  v_prato  uuid;
  v_r      record;
  v_tipos  int;
begin
  select id into v_queijo from public.insumos_master where nome_qt = 'MUCARELA';

  -- `tipo` fora dos dois valores documentados. Se a 131a linha da producao for algo assim, este e
  -- o comportamento que ela vai encontrar.
  insert into public.insumos_master (nome_qt, tipo, rn, rendimento, unidade_padrao)
  values ('MOLHO NAO ROTULADO', 'sub_receita', 1, 1000, 'g') returning id into v_sub;

  insert into public.producao_ingredientes (producao_id, insumo_master_id, quantidade, ordem)
  values (v_sub, v_queijo, 500, 1);

  insert into public.pratos (nome, categoria, id_altec, preco_venda, ativo)
  values ('Prato Com Rotulo Estranho', 'PIZZAS', 'ALT-778', 40.00, true) returning id into v_prato;
  insert into public.prato_ingredientes (prato_id, insumo_master_id, quantidade, ordem)
  values (v_prato, v_sub, 200, 1);

  select * into v_r from experiencia.vw_custo_prato
  where id_altec = 'ALT-778'
    and data_referencia <= current_date
    and (vigente_ate is null or vigente_ate > current_date);

  -- A prova de que a recursao desceu: o unico insumo da ficha e o MOLHO, e ele nao tem preco
  -- proprio. Se o calculo tivesse parado nele, `insumos_contados` seria 1 e o insumo contado seria
  -- o molho. Descendo, o contado passa a ser a MUCARELA, que tem preco, e o custo existe.
  --
  -- Conta a lapis: 200 g de molho / rn 1 = 200; 500 g de mucarela / rn 1 = 500, dividido pelo
  -- rendimento do lote 1000 = 0,5; 200 x 0,5 = 100 g de mucarela a R$ 0,050 = R$ 5,00.
  if v_r.insumos_contados <> 1 then
    raise exception
      'A24: esperado 1 insumo folha (a mucarela dentro do molho), veio %. A recursao nao desceu num '
      'insumo que TEM lista propria so porque o rotulo nao era producao_interna.', v_r.insumos_contados;
  end if;
  if v_r.custo_ausente then
    raise exception
      'A24: o custo veio AUSENTE (%), e a ficha esta completa: molho -> mucarela, com preco e '
      'rendimento. Sinal de que o no do molho caiu no vao entre `arvore` e `folha`.',
      v_r.motivo_incompleto;
  end if;
  if round(v_r.custo_total, 2) <> 5.00 then
    raise exception
      'A24: custo deu % e a conta a mao da 5.00. Se deu zero ou nulo, o no do molho sumiu; se deu '
      'outro numero, a divisao pelo rendimento do lote mudou.', round(v_r.custo_total, 2);
  end if;
  if v_r.nivel_maximo < 2 then
    raise exception 'A24: nivel_maximo deu %, e a ficha tem 2 niveis: a recursao parou no rotulo', v_r.nivel_maximo;
  end if;
  raise notice 'ok  A24: insumo com lista propria e rotulo desconhecido e resolvido, e nao some da conta';

  -- E a view que responde a pergunta que o documento nao responde.
  select count(*) into v_tipos from experiencia.vw_custo_insumo_suspeito;
  if v_tipos < 2 then
    raise exception 'A24: vw_custo_insumo_suspeito devolveu % linha(s), e existem pelo menos 2 tipos', v_tipos;
  end if;

  select * into v_r from experiencia.vw_custo_insumo_suspeito where tipo = 'sub_receita';
  if not v_r.tipo_fora_do_documentado then
    raise exception 'A24: `sub_receita` nao esta entre os dois tipos documentados e nao foi marcada';
  end if;
  if v_r.com_lista_e_outro_rotulo <> 1 then
    raise exception
      'A24: esperado 1 insumo com lista propria e rotulo diferente de producao_interna, veio %',
      v_r.com_lista_e_outro_rotulo;
  end if;

  select * into v_r from experiencia.vw_custo_insumo_suspeito where tipo = 'comercial';
  if v_r.tipo_fora_do_documentado then
    raise exception 'A24: `comercial` e um dos dois tipos documentados e foi marcado como fora deles';
  end if;
  raise notice 'ok  A24: vw_custo_insumo_suspeito enumera os tipos que existem e marca o nao documentado';

  -- Desfaz, para nao mexer nos numeros conferidos a lapis mais acima.
  delete from public.prato_ingredientes where prato_id = v_prato;
  delete from public.pratos where id = v_prato;
  delete from public.producao_ingredientes where producao_id = v_sub;
  delete from public.insumos_master where id = v_sub;
end
$$;

-- =============================================================================
-- O INSERT que `.github/workflows/backup.yml` monta em shell.
--
-- Os dois ramos, com os literais exatos do arquivo. E fronteira de string pura: `tsc` nao ve
-- dentro do YAML, `psql` so descobre no domingo, e o sintoma seria o workflow falhando toda semana
-- com violacao de CHECK — ou ninguem olhando.
--
-- `tests/contrato-telas.test.ts` confere o LADO DE LA (que o workflow escreve em execucao_rotina,
-- com rotina do dominio, nos dois desfechos). Este bloco confere que o comando roda de verdade.
-- =============================================================================
do $$
declare v_n int;
begin
  insert into experiencia.execucao_rotina (rotina, iniciado_em, terminado_em, status, erro)
  values ('backup_semanal', now(), now(), 'sucesso', NULL);

  -- O ramo de erro, com a mensagem exata: `execucao_rotina_erro_tem_mensagem` recusa status `erro`
  -- sem mensagem, entao um workflow que passasse NULL aqui perderia o registro justamente no caso
  -- em que ele mais importa.
  insert into experiencia.execucao_rotina (rotina, iniciado_em, terminado_em, status, erro)
  values ('backup_semanal', now(), now(), 'erro',
          'o passo de dump e envio terminou como failure. Ver o log da execucao no GitHub Actions.');

  select count(*) into v_n from experiencia.vw_saude_rotina where rotina = 'backup_semanal';
  if v_n <> 2 then
    raise exception
      'backup_semanal gravado e vw_saude_rotina mostra % linha(s), esperado 2. O passo antes era '
      '`select 1`: a aba de saude nao distinguia "o backup nao rodou" de "o backup rodou".', v_n;
  end if;

  -- E o CHECK recusa o que nao e rotina, que e o que protege contra um erro de digitacao no YAML.
  begin
    insert into experiencia.execucao_rotina (rotina, iniciado_em, status)
    values ('backup_semana', now(), 'sucesso');
    raise exception 'o dominio de `rotina` aceitou `backup_semana`, que nao existe';
  exception when check_violation then
    null;
  end;

  delete from experiencia.execucao_rotina where rotina = 'backup_semanal';
  raise notice 'ok  backup_semanal: os dois INSERT do workflow rodam e aparecem em vw_saude_rotina';
end
$$;

-- =============================================================================
-- PARTE 11. O R3 e o cruzamento com venda.
-- =============================================================================
do $$
declare
  v_imp uuid;
  v_r   record;
begin
  -- `dias_lidos` e `date[]`, a lista de dias operacionais que o arquivo cobre, e nao uma
  -- contagem: com a lista, "faltou o R3 de terca" e uma consulta em vez de uma leitura de
  -- arquivo. E `arquivo_bruto` e `bytea`, com CHECK de tamanho maior que zero: o arquivo exato
  -- que chegou, guardado antes de ser interpretado (ADR-12).
  insert into experiencia.execucao_importacao
    (origem, arquivo, hash, arquivo_bruto, linhas, dias_lidos, status)
  values ('watcher_drive', 'R3_20260804.csv', 'hash-de-ensaio',
          convert_to('PRODUTO;QTD;VALOR', 'UTF8'), 2, array['2026-08-04'::date], 'sucesso')
  returning id into v_imp;

  -- Junta por `produto_id_pdv`, que e o `id_altec`: identificador estavel, e nao nome
  -- normalizado. `RUCOLA` contra `Rúcola` depende de regra de normalizacao que muda com o
  -- tempo; ALT-100 nao muda.
  insert into experiencia.venda_produto_dia
    (dia_operacional, produto_id_pdv, produto_nome_norm, grupo, unidades, valor_liquido, item_cardapio_id, execucao_importacao_id)
  values
    ('2026-08-04', 'ALT-100', 'MARGHERITA', 'pizza', 40, 1960.00, 'dddddddd-0000-4000-8000-000000000001', v_imp),
    ('2026-08-04', 'ALT-101', 'CALABRESA',  'pizza', 12,  624.00, 'dddddddd-0000-4000-8000-000000000002', v_imp);

  insert into experiencia.mesa_atendida_dia (dia_operacional, mesas) values ('2026-08-04', 18);

  select * into v_r from experiencia.vw_satisfacao_venda_dia where dia_operacional = '2026-08-04';
  if v_r.faturamento is null then raise exception 'faturamento do dia nao chegou na view'; end if;
  if round(v_r.faturamento, 2) <> 2584.00 then
    raise exception 'faturamento deu %, esperado 2584.00', round(v_r.faturamento, 2);
  end if;
  -- 2584,00 / 18 mesas = 143,5555... -> 143,56
  if round(v_r.ticket_medio_por_mesa, 2) <> 143.56 then
    raise exception 'ticket por mesa deu %, esperado 143.56', round(v_r.ticket_medio_por_mesa, 2);
  end if;
  raise notice 'ok  vw_satisfacao_venda_dia: faturamento 2584,00 e ticket por mesa 143,56';

  -- E a prova de que dia sem R3 importado aparece como faturamento VAZIO, e nao como zero.
  -- Faturamento zero num dia aberto e uma afirmacao falsa sobre a casa.
  select * into v_r from experiencia.vw_satisfacao_venda_dia
   where dia_operacional <> '2026-08-04' and n > 0 limit 1;
  if v_r.dia_operacional is not null and v_r.faturamento is not null then
    raise exception 'dia sem R3 importado deveria ter faturamento nulo, e veio %', v_r.faturamento;
  end if;
  raise notice 'ok  dia sem R3: faturamento nulo, nunca zero';
end
$$;

-- =============================================================================
-- PARTE 12. As contas do painel: NPS com faixa de confianca.
--
-- No dia 04/08 existem: nota 3 (detrator) e nota 10 (promotor)? Nao: a de nota 10 e por QR e
-- caiu no dia de hoje. Entao a conferencia usa a janela e o que houver nela, e checa a
-- ARITMETICA, que e o que pode estar errado.
-- =============================================================================
do $$
declare
  v_r      record;
  v_esp    numeric;
  -- O dia operacional da resposta completa da Parte 2, que e o dia anterior ao de hoje pelo
  -- relogio da casa. Data fixa nao serve: as respostas deste ensaio nascem de `now()`.
  v_dia    date := (now() at time zone 'America/Sao_Paulo')::date - 1;
begin
  select * into v_r from experiencia.vw_nps_janela where janela = 'dia' and inicio = v_dia;
  if v_r.n is null then raise exception 'vw_nps_janela nao devolveu o dia %', v_dia; end if;

  -- NPS = (promotores - detratores) / n * 100, arredondado a uma casa.
  v_esp := round((v_r.promotores - v_r.detratores)::numeric * 100 / v_r.n, 1);
  if v_r.nps <> v_esp then
    raise exception 'NPS da view deu % e a formula da %', v_r.nps, v_esp;
  end if;

  -- A faixa de 95% e 1,96 erros padrao. Se este fator mudar, toda leitura de tendencia do
  -- painel muda de significado sem ninguem perceber.
  --
  -- A TOLERANCIA DE 0,11 NAO E FROUXIDAO, E O ARREDONDAMENTO DA VIEW ESTAR CERTO
  --   A view arredonda UMA VEZ, a partir do erro padrao cru: `faixa_95 = round(1,96 x cru, 1)`.
  --   O `erro_padrao` que ela devolve ja veio arredondado para exibicao, entao recalcular
  --   `1,96 x erro_padrao` aqui e arredondar DE NOVO, sobre um valor que ja perdeu casas.
  --
  --   Com erro padrao cru de 33,47: a view da `round(65,60) = 65,6`, e esta conta daria
  --   `round(1,96 x 33,5) = 65,7`. Os dois estao certos; o que nao pode e exigir igualdade entre
  --   um arredondamento e dois.
  --
  --   A versao anterior exigia igualdade exata e passava, porque os dados de ensaio caiam longe de
  --   qualquer fronteira de arredondamento. Passou a falhar quando a janela do dia mudou e o
  --   numero caiu em cima de uma — ou seja, o teste tinha um resultado que dependia do dia em que
  --   rodasse. A conferencia da diferenca minima logo abaixo ja usava 0,11, pelo mesmo motivo.
  if abs(v_r.faixa_95 - round(1.96 * v_r.erro_padrao, 1)) > 0.11 then
    raise exception 'faixa_95 deu % e 1,96 x erro padrao da %', v_r.faixa_95, round(1.96 * v_r.erro_padrao, 1);
  end if;

  -- A diferenca minima detectavel entre DOIS periodos e a faixa vezes raiz de 2, porque cada
  -- periodo carrega o proprio erro. Sem isso, o painel diria que 8 pontos de queda e queda.
  if abs(v_r.diferenca_minima_detectavel - round((1.96 * v_r.erro_padrao * sqrt(2))::numeric, 1)) > 0.11 then
    raise exception 'diferenca minima detectavel deu %, esperado faixa x raiz(2) = %',
      v_r.diferenca_minima_detectavel, round((1.96 * v_r.erro_padrao * sqrt(2))::numeric, 1);
  end if;

  -- E com n abaixo de 20 a view TEM de escrever o aviso. E a unica coisa que impede o painel
  -- de mostrar um NPS de aparencia solida calculado sobre tres respostas.
  if v_r.n < 20 then
    if v_r.amostra_suficiente then raise exception 'n=% e amostra_suficiente veio verdadeiro', v_r.n; end if;
    if v_r.aviso is null then raise exception 'n=% e a view nao escreveu aviso', v_r.n; end if;
  end if;

  raise notice 'ok  vw_nps_janela: NPS, faixa de 1,96 EP, diferenca minima e o aviso de n<20';
end
$$;

-- =============================================================================
-- PARTE 13. Toda view responde, e nenhuma explode.
--
-- Criar view sem erro e uma coisa; executar o corpo dela contra dado e outra. Divisao por
-- zero, `date_trunc` sobre nulo e agregacao sobre conjunto vazio so aparecem no `select`.
-- =============================================================================
do $$
declare
  v_view  text;
  v_n     bigint;
  v_total integer := 0;
begin
  for v_view in
    select table_name from information_schema.views
    where table_schema = 'experiencia' order by table_name
  loop
    execute format('select count(*) from experiencia.%I', v_view) into v_n;
    v_total := v_total + 1;
    -- `rpad`, e nao `%-32s`: em `raise notice` o `%` e substituicao e o `-32s` sairia literal.
    raise notice '    %  %', rpad(v_view, 32), v_n;
  end loop;

  -- As de leitura mais `vw_texto_a_classificar`, que e view de trabalho da rotina do
  -- classificador. Numero fixo de proposito: view que deixa de ser criada tem de derrubar isto,
  -- e nao passar como "contei as que existem".
  if v_total <> 31 then
    raise exception 'esperava 31 views executaveis e contei %', v_total;
  end if;
  raise notice 'ok  as 31 views executam contra dado, e nenhuma levanta erro';
end
$$;

-- =============================================================================
-- PARTE 14. O dia vazio, que e o caso comum e nao o excepcional.
--
-- A casa fecha segunda. Uma view que so funciona com dado nao serve, porque a primeira tela
-- que o proprietario abre numa terca de manha e a de um dia sem resposta nenhuma.
-- =============================================================================
do $$
declare
  v_n bigint;
begin
  select count(*) into v_n from experiencia.vw_hoje where dia_operacional = '2026-08-10';
  if v_n <> 0 then raise exception 'vw_hoje inventou linha para um dia sem resposta'; end if;

  -- E a view de trabalho: com o texto da Parte 2 ainda sem classificacao, ela devolve 1. Depois
  -- de classificado, tem de devolver 0, senao a rotina reclassifica todo dia o mesmo texto e
  -- gasta a cota diaria da Groq com trabalho ja feito.
  select count(*) into v_n from experiencia.vw_texto_a_classificar;
  if v_n <> 1 then raise exception 'vw_texto_a_classificar deveria ter 1 pendente e tem %', v_n; end if;

  insert into experiencia.classificacao_texto
    (resposta_id, frase_ordem, frase, dimensao, fator, polaridade, severidade, modelo, versao_prompt)
  values ('11111111-1111-4111-8111-111111111111', 1, 'a massa veio crua',
          'comida', 'ponto_da_massa', 'negativo', 'alta', 'ensaio', '1.0.0');

  select count(*) into v_n from experiencia.vw_texto_a_classificar;
  if v_n <> 0 then
    raise exception 'texto classificado continua pendente: a rotina o leria de novo todo dia';
  end if;
  raise notice 'ok  vw_texto_a_classificar: pendente antes, e fora da lista depois de classificado';

  -- E o painel tem de saber que a casa estava fechada, o que vem de `fn_casa_abre` e nao da
  -- ausencia de linha: ausencia de linha e ambigua entre "fechado" e "coleta quebrada".
  if experiencia.fn_casa_abre('2026-08-10') then
    raise exception '10/08/2026 e segunda-feira e deveria estar fechada';
  end if;
  raise notice 'ok  dia vazio: nenhuma view inventa linha, e fn_casa_abre explica o vazio';
end
$$;

-- =============================================================================
-- PARTE 15. Retencao e anonimizacao.
-- =============================================================================
do $$
declare
  v_cliente uuid;
  v_n       integer;
begin
  select id into v_cliente from experiencia.cliente where email = 'a@b.com';

  update experiencia.cliente
  set nome = null, email = null, whatsapp = null, nascimento = null, anonimizado_em = now()
  where id = v_cliente;

  -- A resposta CONTINUA existindo depois de o dado pessoal sair. E o desenho de D4: o
  -- historico de satisfacao e da casa, o dado pessoal e da pessoa.
  select count(*) into v_n from experiencia.resposta where id = '11111111-1111-4111-8111-111111111111';
  if v_n <> 1 then raise exception 'anonimizar o cliente apagou a resposta, e nao deveria'; end if;

  select count(*) into v_n from experiencia.resposta_texto
   where resposta_id = '11111111-1111-4111-8111-111111111111';
  if v_n <> 1 then raise exception 'anonimizar o cliente apagou o texto da resposta'; end if;

  -- E o consentimento fica, porque ele e a prova de que houve aceite.
  select count(*) into v_n from experiencia.consentimento
   where resposta_id = '11111111-1111-4111-8111-111111111111';
  if v_n <> 2 then raise exception 'anonimizar apagou o consentimento, que e a prova do aceite'; end if;

  raise notice 'ok  anonimizacao: dado pessoal sai, resposta e consentimento ficam';
end
$$;

-- =============================================================================
-- PARTE 15B. As tres recusas que a critica adversarial da Etapa 4 encontrou (A01, A02, A04).
--
-- As tres tinham a mesma forma: um valor que o codigo escreve e o banco recusa, numa tabela FILHA
-- inserida DENTRO de `fn_grava_resposta`. Como e a mesma transacao, a filha recusada derruba a
-- RESPOSTA INTEIRA. Nenhuma delas perde um campo: perde tudo.
-- =============================================================================
do $$
declare
  v_id  uuid;
  v_n   integer;
  v_p   jsonb;
begin
  -- A01: as telas que o quiosque grava de verdade, incluindo ROT1 e ROT2. Antes da correcao, o
  -- CHECK aceitava `T3` e `T4`, nomes que nenhuma ponta escreve, e recusava estes dois.
  v_p := jsonb_build_object(
    'id', '99999999-9999-4999-8999-000000000a01',
    'criado_em_cliente', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'nota', 10, 'canal', 'tablet', 'idioma', 'pt', 'versao_questionario', '1.0.0',
    'mesa_digitada', '7', 'garcom_pin_digitado', '1234',
    'dispositivo_id', 'cccccccc-0000-4000-8000-000000000001',
    'opcoes', '[]'::jsonb, 'itens', '[]'::jsonb, 'sorteadas', '[]'::jsonb,
    'consentimentos', '[]'::jsonb,
    'telas', jsonb_build_array(
      jsonb_build_object('tela','T0','entrou_em', now(), 'saiu_em', now(), 'pulou', false),
      jsonb_build_object('tela','T1','entrou_em', now(), 'saiu_em', now(), 'pulou', false),
      jsonb_build_object('tela','T2A','entrou_em', now(), 'saiu_em', now(), 'pulou', false),
      jsonb_build_object('tela','ROT1','entrou_em', now(), 'saiu_em', now(), 'pulou', false),
      jsonb_build_object('tela','ROT2','entrou_em', now(), 'saiu_em', now(), 'pulou', false),
      jsonb_build_object('tela','T5','entrou_em', now(), 'saiu_em', now(), 'pulou', true),
      jsonb_build_object('tela','T6','entrou_em', now(), 'saiu_em', now(), 'pulou', true),
      jsonb_build_object('tela','T7','entrou_em', now(), 'saiu_em', now(), 'pulou', false)));

  v_id := experiencia.fn_grava_resposta(v_p);
  select count(*) into v_n from experiencia.tela_evento where resposta_id = v_id;
  if v_n <> 8 then
    raise exception 'A01: das 8 telas do caminho de promotor, % chegaram. ROT1 e ROT2 sao as que o CHECK recusava, e a recusa derrubava a resposta inteira', v_n;
  end if;
  raise notice 'ok  A01: as 8 telas do caminho de promotor, com ROT1 e ROT2, sao aceitas';

  -- A04: o consentimento com a versao EMBUTIDA no bundle. Antes da correcao, o padrao do PWA era
  -- `nao-verificada`, que a chave estrangeira nao encontra, e `consentimento_texto` nascia vazia.
  v_id := experiencia.fn_grava_resposta(jsonb_build_object(
    'id', '99999999-9999-4999-8999-000000000a04',
    'criado_em_cliente', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'nota', 9, 'canal', 'tablet', 'idioma', 'pt', 'versao_questionario', '1.0.0',
    'mesa_digitada', '7', 'garcom_pin_digitado', '1234',
    'dispositivo_id', 'cccccccc-0000-4000-8000-000000000001',
    'opcoes', '[]'::jsonb, 'itens', '[]'::jsonb, 'sorteadas', '[]'::jsonb, 'telas', '[]'::jsonb,
    'consentimentos', jsonb_build_array(
      jsonb_build_object('finalidade','pesquisa','versao_texto','1','aceito_em', now()))));

  select count(*) into v_n from experiencia.consentimento
   where resposta_id = v_id and versao_texto = '1';
  if v_n <> 1 then
    raise exception 'A04: o consentimento com a versao embutida no bundle nao foi gravado';
  end if;
  raise notice 'ok  A04: consentimento com a versao 1, que a semente garante existir';

  -- A02, na forma que ela tem DEPOIS de A19.
  --
  -- Antes, a tela `ROT1` em `resposta_opcao` derrubava a resposta inteira. Agora a gravacao e
  -- resiliente, entao a garantia mudou de forma e ficou melhor: a opcao continua RECUSADA (senao a
  -- contagem por fator volta a ser poluida por resposta de rotacionada, contando um `sim` como
  -- mencao a um problema), e a RESPOSTA ENTRA.
  --
  -- As duas metades precisam ser conferidas. Conferir so a primeira deixaria passar uma regressao
  -- que derrubasse a resposta de novo; conferir so a segunda deixaria passar a poluicao.
  v_id := experiencia.fn_grava_resposta(jsonb_build_object(
    'id', '99999999-9999-4999-8999-000000000a02',
    'criado_em_cliente', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'nota', 9, 'canal', 'tablet', 'idioma', 'pt', 'versao_questionario', '1.0.0',
    'garcom_pin_digitado', '1234',
    'dispositivo_id', 'cccccccc-0000-4000-8000-000000000001',
    'itens', '[]'::jsonb, 'sorteadas', '[]'::jsonb, 'telas', '[]'::jsonb,
    'consentimentos', '[]'::jsonb,
    'opcoes', jsonb_build_array(
      jsonb_build_object('tela','ROT1','dimensao','comida','fator','sabor','opcao_codigo','0'))));

  select count(*) into v_n from experiencia.resposta where id = v_id;
  if v_n <> 1 then
    raise exception 'A02/A19: a resposta foi perdida por causa de uma opcao com tela invalida';
  end if;

  select count(*) into v_n from experiencia.resposta_opcao
   where resposta_id = v_id and tela = 'ROT1';
  if v_n <> 0 then
    raise exception
      'A02: resposta_opcao aceitou a tela ROT1. A resposta de rotacionada voltaria a contar como '
      'mencao a um problema em vw_fator_contagem, inflando o grafico justamente onde a casa vai bem';
  end if;

  select count(*) into v_n from experiencia.resposta
   where id = v_id and diagnostico is not null;
  if v_n <> 1 then
    raise exception 'A02: a opcao foi descartada SEM registro no diagnostico';
  end if;
  raise notice 'ok  A02: ROT1 continua recusado em resposta_opcao, a resposta entra, e o descarte fica registrado';
end
$$;

-- -----------------------------------------------------------------------------
-- A view que passou a dar leitura ao `opcao_indice`, que era gravado e nunca lido.
-- -----------------------------------------------------------------------------
do $$
declare
  v_r record;
  v_n integer;
begin
  -- Duas respostas de promotor, respondendo a MESMA pergurta com indices diferentes.
  perform experiencia.fn_grava_resposta(jsonb_build_object(
    'id', '99999999-9999-4999-8999-00000000b001',
    'criado_em_cliente', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'nota', 10, 'canal', 'tablet', 'idioma', 'pt', 'versao_questionario', '1.0.0',
    'garcom_pin_digitado', '1234', 'dispositivo_id', 'cccccccc-0000-4000-8000-000000000001',
    'opcoes', '[]'::jsonb, 'itens', '[]'::jsonb, 'telas', '[]'::jsonb, 'consentimentos', '[]'::jsonb,
    'sorteadas', jsonb_build_array(jsonb_build_object(
      'pergunta_banco_id','eeeeeeee-0000-4000-8000-000000000001','respondida',true,'opcao_indice',0))));

  perform experiencia.fn_grava_resposta(jsonb_build_object(
    'id', '99999999-9999-4999-8999-00000000b002',
    'criado_em_cliente', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'nota', 10, 'canal', 'tablet', 'idioma', 'pt', 'versao_questionario', '1.0.0',
    'garcom_pin_digitado', '5678', 'dispositivo_id', 'cccccccc-0000-4000-8000-000000000001',
    'opcoes', '[]'::jsonb, 'itens', '[]'::jsonb, 'telas', '[]'::jsonb, 'consentimentos', '[]'::jsonb,
    'sorteadas', jsonb_build_array(jsonb_build_object(
      'pergunta_banco_id','eeeeeeee-0000-4000-8000-000000000001','respondida',true,'opcao_indice',2))));

  -- Uma sorteada e PULADA, que tambem e dado: pulo alto e sinal de pergunta mal escrita.
  perform experiencia.fn_grava_resposta(jsonb_build_object(
    'id', '99999999-9999-4999-8999-00000000b003',
    'criado_em_cliente', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'nota', 9, 'canal', 'tablet', 'idioma', 'pt', 'versao_questionario', '1.0.0',
    'garcom_pin_digitado', '1234', 'dispositivo_id', 'cccccccc-0000-4000-8000-000000000001',
    'opcoes', '[]'::jsonb, 'itens', '[]'::jsonb, 'telas', '[]'::jsonb, 'consentimentos', '[]'::jsonb,
    'sorteadas', jsonb_build_array(jsonb_build_object(
      'pergunta_banco_id','eeeeeeee-0000-4000-8000-000000000001','respondida',false))));

  -- O ROTULO tem de casar com o indice. `opcoes` da pergunta 1 e ["sim","mais ou menos","nao"],
  -- entao indice 0 e `sim` e indice 2 e `nao`. Errar por um trocaria `sim` por `mais ou menos` em
  -- silencio, e o painel diria o contrario do que as pessoas responderam.
  select * into v_r from experiencia.vw_pergunta_resposta
   where pergunta_banco_id = 'eeeeeeee-0000-4000-8000-000000000001' and opcao_indice = 0;
  if v_r.rotulo <> 'sim' then
    raise exception 'vw_pergunta_resposta: indice 0 deu rotulo "%", esperado "sim". Deslocamento de um em `ordinality - 1` inverteria a leitura de toda pergunta', v_r.rotulo;
  end if;
  if v_r.respostas <> 1 then
    raise exception 'indice 0 deveria ter 1 resposta e tem %', v_r.respostas;
  end if;

  select * into v_r from experiencia.vw_pergunta_resposta
   where pergunta_banco_id = 'eeeeeeee-0000-4000-8000-000000000001' and opcao_indice = 2;
  if v_r.rotulo <> 'nao' then
    raise exception 'vw_pergunta_resposta: indice 2 deu rotulo "%", esperado "nao"', v_r.rotulo;
  end if;

  -- O pulo entra no denominador de sorteadas e nao no de respondidas.
  select respondidas, puladas, sorteadas into v_r
  from experiencia.vw_pergunta_resposta
  where pergunta_banco_id = 'eeeeeeee-0000-4000-8000-000000000001' limit 1;
  if v_r.respondidas <> 2 or v_r.puladas <> 1 or v_r.sorteadas <> 3 then
    raise exception 'vw_pergunta_resposta: respondidas=% puladas=% sorteadas=%, esperado 2, 1 e 3',
      v_r.respondidas, v_r.puladas, v_r.sorteadas;
  end if;

  raise notice 'ok  vw_pergunta_resposta: rotulo casa com o indice, e o pulo conta em sorteadas';
end
$$;

-- =============================================================================
-- PARTE 15C. A gravacao resiliente (A19), e as tres contagens corrigidas.
--
-- A propriedade que esta parte protege e a mais importante do sistema: A NOTA NAO SE PERDE POR
-- CAUSA DE UMA FILHA. Tres dos quatro erros mais graves do projeto foram uma filha recusada
-- derrubando a resposta inteira.
-- =============================================================================
do $$
declare
  v_id  uuid;
  v_r   record;
  v_n   integer;
begin
  -- Uma resposta com QUATRO filhas invalidas de uma vez: tela que nao existe no dominio, par
  -- (dimensao, fator) trocado, pergunta_banco_id que nao existe, e versao de consentimento sem
  -- linha na tabela de textos. Antes, QUALQUER uma delas sozinha derrubava tudo.
  v_id := experiencia.fn_grava_resposta(jsonb_build_object(
    'id', 'cccccccc-cccc-4ccc-8ccc-000000000a19',
    'criado_em_cliente', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'nota', 4, 'canal', 'tablet', 'idioma', 'pt', 'versao_questionario', '1.0.0',
    'mesa_digitada', '7', 'garcom_pin_digitado', '1234',
    'dispositivo_id', 'cccccccc-0000-4000-8000-000000000001',
    'itens', '[]'::jsonb,
    'opcoes', jsonb_build_array(
      -- Valida: entra.
      jsonb_build_object('tela','T2C','dimensao','comida','fator','sabor','opcao_codigo','comida'),
      -- Tela fora do dominio: recusada.
      jsonb_build_object('tela','TELA_QUE_NAO_EXISTE','dimensao','comida','opcao_codigo','x'),
      -- Par trocado (`espera_mesa` e fator de `tempo`): recusada.
      jsonb_build_object('tela','T3C','dimensao','comida','fator','espera_mesa','opcao_codigo','y')),
    'sorteadas', jsonb_build_array(
      -- Pergunta que nao existe: recusada.
      jsonb_build_object('pergunta_banco_id','00000000-0000-4000-8000-000000000000','respondida',true)),
    'telas', jsonb_build_array(
      jsonb_build_object('tela','T1','entrou_em', now(), 'saiu_em', now(), 'pulou', false),
      jsonb_build_object('tela','INVENTADA','entrou_em', now(), 'saiu_em', now(), 'pulou', false)),
    'consentimentos', jsonb_build_array(
      jsonb_build_object('finalidade','pesquisa','versao_texto','1','aceito_em', now()),
      jsonb_build_object('finalidade','contato','versao_texto','versao-que-nao-existe','aceito_em', now()))));

  -- A RESPOSTA ENTROU. E o que importa.
  select * into v_r from experiencia.resposta where id = v_id;
  if v_r.id is null then
    raise exception 'A19: a resposta foi perdida por causa de filhas invalidas. A nota e o unico dado obrigatorio do sistema';
  end if;
  if v_r.nota <> 4 then raise exception 'A19: a nota chegou errada: %', v_r.nota; end if;

  -- As filhas VALIDAS entraram.
  select count(*) into v_n from experiencia.resposta_opcao where resposta_id = v_id;
  if v_n <> 1 then raise exception 'A19: das 3 opcoes, 1 era valida e % entraram', v_n; end if;

  select count(*) into v_n from experiencia.tela_evento where resposta_id = v_id;
  if v_n <> 1 then raise exception 'A19: das 2 telas, 1 era valida e % entraram', v_n; end if;

  select count(*) into v_n from experiencia.consentimento where resposta_id = v_id;
  if v_n <> 1 then raise exception 'A19: dos 2 consentimentos, 1 era valido e % entraram', v_n; end if;

  -- E o DESCARTE FICOU REGISTRADO. Sem isto, isto aqui seria engolir erro.
  if v_r.diagnostico is null then
    raise exception 'A19: as filhas foram descartadas SEM registro. Descarte silencioso e pior que a falha que ele evita';
  end if;
  if jsonb_array_length(v_r.diagnostico) <> 5 then
    raise exception 'A19: esperava 5 filhas recusadas no diagnostico e ha %: %',
      jsonb_array_length(v_r.diagnostico), v_r.diagnostico;
  end if;

  -- E a view que torna o registro legivel: uma tela quebrada tem de aparecer como linha subindo.
  select count(*) into v_n from experiencia.vw_gravacao_diagnostico;
  if v_n < 1 then raise exception 'A19: vw_gravacao_diagnostico nao mostra as recusas'; end if;

  raise notice 'ok  A19: resposta preservada com 5 filhas recusadas, e as 5 registradas no diagnostico';
end
$$;

do $$
declare
  v_id      uuid;
  v_r       record;
  v_antes   integer;
begin
  -- A13: resposta por QR nao tem PIN e NAO pode contar como PIN nao reconhecido.
  --
  -- A conferencia e a DIFERENCA, e nao o valor absoluto: o ensaio ja gravou duas respostas de
  -- TABLET com PIN nao reconhecido (o `0000`, que nao existe, e o `9012`, da Carla inativa), e
  -- essas duas devem contar mesmo. O que a resposta por QR nao pode fazer e somar uma terceira.
  select coalesce(pin_nao_reconhecido, 0) into v_antes from experiencia.vw_coleta_dia
   where dia_operacional = experiencia.fn_dia_operacional(now());

  v_id := experiencia.fn_grava_resposta(jsonb_build_object(
    'id', 'cccccccc-cccc-4ccc-8ccc-000000000a13',
    'criado_em_cliente', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'nota', 9, 'canal', 'qr', 'idioma', 'pt', 'versao_questionario', '1.0.0',
    'opcoes','[]'::jsonb,'itens','[]'::jsonb,'sorteadas','[]'::jsonb,'telas','[]'::jsonb,
    'consentimentos','[]'::jsonb));

  select * into v_r from experiencia.resposta where id = v_id;
  if v_r.garcom_reconhecido then raise exception 'A13: resposta de QR nao deveria ter garcom reconhecido'; end if;

  select * into v_r from experiencia.vw_coleta_dia
   where dia_operacional = experiencia.fn_dia_operacional(now());
  if v_r.pin_nao_reconhecido <> v_antes then
    raise exception
      'A13: a resposta por QR somou em pin_nao_reconhecido (era %, virou %). Com 4 respostas de QR '
      'num dia o limiar dispara e o digest cobra um problema que nao existe, que e o jeito mais '
      'rapido de matar a credibilidade do unico alarme do sistema.', v_antes, v_r.pin_nao_reconhecido;
  end if;

  -- E as de TABLET com PIN errado continuam contando: a correcao nao pode ter desligado o alarme
  -- inteiro para calar o falso positivo.
  if v_antes < 1 then
    raise exception
      'A13: nenhuma resposta de tablet com PIN nao reconhecido esta sendo contada. O ensaio grava '
      'duas (PIN 0000 e o da Carla inativa), e se elas sumiram a correcao desligou o alarme.';
  end if;
  if v_r.respostas_qr < 1 then
    raise exception 'A13: a resposta por QR nao apareceu na contagem de canal';
  end if;
  raise notice 'ok  A13: resposta por QR nao conta como PIN nao reconhecido';
end
$$;

do $$
declare v_r record;
begin
  -- A16: o dia em coleta aparece, e vem marcado como NAO fechado, com aviso.
  select * into v_r from experiencia.vw_hoje
   where dia_operacional = experiencia.fn_dia_operacional(now());
  if v_r.dia_operacional is null then
    raise exception 'A16: o dia corrente sumiu de vw_hoje. Ele deve aparecer, com rotulo honesto';
  end if;
  if v_r.fechado then
    raise exception 'A16: o dia corrente veio marcado como fechado';
  end if;
  if v_r.aviso is null or v_r.aviso not like '%em coleta%' then
    raise exception 'A16: o dia em coleta tem de vir com aviso, e veio com "%"', v_r.aviso;
  end if;

  -- E o dia ANTERIOR vem fechado.
  select * into v_r from experiencia.vw_hoje
   where dia_operacional = experiencia.fn_dia_operacional(now()) - 1;
  if v_r.dia_operacional is not null and not v_r.fechado then
    raise exception 'A16: o dia anterior deveria vir marcado como fechado';
  end if;
  raise notice 'ok  A16: vw_hoje marca o dia em coleta como nao fechado, com aviso';
end
$$;

do $$
declare
  v_id uuid;
  v_n  integer;
begin
  -- A28: dois itens `prefiro nao dizer` no mesmo grupo, os dois com item_cardapio_id NULO. Com a
  -- regra padrao de UNIQUE os nulos nao colidem, entao o `on conflict` nunca disparava e a mesma
  -- reclamacao entrava duas vezes.
  v_id := experiencia.fn_grava_resposta(jsonb_build_object(
    'id', 'cccccccc-cccc-4ccc-8ccc-000000000a28',
    'criado_em_cliente', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'nota', 3, 'canal', 'tablet', 'idioma', 'pt', 'versao_questionario', '1.0.0',
    'garcom_pin_digitado', '1234', 'dispositivo_id', 'cccccccc-0000-4000-8000-000000000001',
    'opcoes','[]'::jsonb,'sorteadas','[]'::jsonb,'telas','[]'::jsonb,'consentimentos','[]'::jsonb,
    'itens', jsonb_build_array(
      jsonb_build_object('grupo','pizza'),
      jsonb_build_object('grupo','pizza'))));

  select count(*) into v_n from experiencia.resposta_item where resposta_id = v_id;
  if v_n <> 1 then
    raise exception
      'A28: dois `prefiro nao dizer` do mesmo grupo geraram % linhas. Com nulos distintos, o '
      'on conflict nunca dispara e a reclamacao daquele item dobra na contagem.', v_n;
  end if;
  raise notice 'ok  A28: item sem id nao duplica, porque o UNIQUE e `nulls not distinct`';
end
$$;

-- =============================================================================
-- PARTE 16. `fn_mascara_contato` e `fn_aplica_retencao`.
--
-- As duas ultimas funcoes, e as duas que MEXEM em dado ja gravado. Sao as que mais precisam de
-- conferencia justamente por isso: uma mascara texto que o cliente escreveu, a outra apaga dado
-- pessoal, e nenhuma das duas tem desfazer.
-- =============================================================================
do $$
declare
  v_t text;
begin
  -- A varredura de padrao de D4: telefone, e-mail e CPF em texto livre. O cliente escreve o
  -- proprio telefone no campo aberto sem ninguem pedir, e esse texto e exportado em CSV.
  v_t := experiencia.fn_mascara_contato('me liga no 11 99999-8888 que eu explico');
  if v_t like '%99999%' then
    raise exception 'fn_mascara_contato deixou o telefone passar: %', v_t;
  end if;

  v_t := experiencia.fn_mascara_contato('manda pro joao.silva@exemplo.com.br por favor');
  if v_t like '%joao.silva@%' then
    raise exception 'fn_mascara_contato deixou o e-mail passar: %', v_t;
  end if;

  v_t := experiencia.fn_mascara_contato('meu cpf e 123.456.789-09');
  if v_t like '%123.456%' then
    raise exception 'fn_mascara_contato deixou o CPF passar: %', v_t;
  end if;

  -- E o texto SEM contato tem de sair intacto. Mascara que come texto normal e pior que
  -- mascara que nao roda: ela destroi a reclamacao, que e o dado que se queria ler.
  v_t := experiencia.fn_mascara_contato('a massa veio crua e o garcom foi otimo');
  if v_t <> 'a massa veio crua e o garcom foi otimo' then
    raise exception 'fn_mascara_contato mexeu em texto sem contato: %', v_t;
  end if;

  raise notice 'ok  fn_mascara_contato: telefone, e-mail e CPF mascarados, texto comum intacto';
end
$$;

do $$
declare
  v_r          jsonb;
  v_antigo     uuid;
  v_recente    uuid;
  v_n          integer;
  v_chave      text;
begin
  -- Um cliente com ultima visita ha 13 meses (passou dos 12 de D4) e um com 2 meses.
  insert into experiencia.cliente (nome, email, ultima_visita_em)
  values ('Antigo', 'antigo@exemplo.invalid', now() - interval '13 months')
  returning id into v_antigo;
  insert into experiencia.cliente (nome, email, ultima_visita_em)
  values ('Recente', 'recente@exemplo.invalid', now() - interval '2 months')
  returning id into v_recente;

  v_r := experiencia.fn_aplica_retencao(12);

  -- O antigo perde o dado pessoal e ganha o carimbo de anonimizacao.
  select count(*) into v_n from experiencia.cliente
   where id = v_antigo and email is null and nome is null and anonimizado_em is not null;
  if v_n <> 1 then
    raise exception 'o cliente de 13 meses deveria ter sido anonimizado. Devolvido: %', v_r;
  end if;

  -- A LINHA continua existindo. Apagar a linha levaria embora `ultima_visita_em`, e sem ela
  -- nao ha como provar que a retencao rodou nem quando o prazo comecou a correr.
  if not exists (select 1 from experiencia.cliente where id = v_antigo) then
    raise exception 'a retencao APAGOU a linha do cliente, e deveria ter apenas anonimizado';
  end if;

  -- E o de 2 meses fica intacto: prazo que corre antes da hora e perda de dado, nao conformidade.
  select count(*) into v_n from experiencia.cliente
   where id = v_recente and email = 'recente@exemplo.invalid' and anonimizado_em is null;
  if v_n <> 1 then raise exception 'o cliente de 2 meses foi anonimizado antes do prazo'; end if;

  -- A CHAVE E `clientes_anonimizados`, e a primeira versao deste teste leu
  -- `linhas_anonimizadas`, que e o nome da COLUNA de `execucao_rotina` e nao o da chave que a
  -- funcao devolve. O teste passava sem conferir nada, porque `NULL <> 0` em SQL nao e
  -- verdadeiro nem falso: e NULL, e um `if NULL` simplesmente nao entra. Por isso a chave e
  -- conferida como existente ANTES de o valor ser comparado.
  if not (v_r ? 'clientes_anonimizados') then
    raise exception 'fn_aplica_retencao nao devolveu a chave clientes_anonimizados. Devolveu: %', v_r;
  end if;
  if (v_r->>'clientes_anonimizados')::integer <> 1 then
    raise exception 'a primeira passada deveria ter anonimizado 1 cliente, e devolveu %', v_r;
  end if;

  -- Rodar de novo nao pode contar o mesmo cliente outra vez: a rotina e mensal e vai rodar
  -- doze vezes por ano sobre a mesma base.
  v_r := experiencia.fn_aplica_retencao(12);
  if (v_r->>'clientes_anonimizados')::integer <> 0 then
    raise exception 'a segunda passada anonimizou % cliente(s), e deveria ser 0: %',
      v_r->>'clientes_anonimizados', v_r;
  end if;

  -- E as tres chaves que a rotina do Worker le do retorno. Ler chave que a funcao nao devolve
  -- e o mesmo erro de nome de coluna, com a mesma consequencia: `undefined` virando zero e o
  -- log dizendo que nada foi anonimizado num mes em que foi.
  for v_chave in select unnest(array['clientes_anonimizados','textos_varridos','padroes_removidos'])
  loop
    if not (v_r ? v_chave) then
      raise exception 'fn_aplica_retencao nao devolve a chave %, que retencao.ts le', v_chave;
    end if;
  end loop;

  raise notice 'ok  fn_aplica_retencao: anonimiza o de 13 meses, poupa o de 2, e nao repete';
end
$$;

-- =============================================================================
-- FIM
-- =============================================================================
do $$
declare
  v_resp integer;
  v_tent integer;
begin
  select count(*) into v_resp from experiencia.resposta;
  select count(*) into v_tent from experiencia.tentativa;
  raise notice '';
  raise notice 'TUDO CONFERIDO. % respostas e % tentativas no banco de ensaio.', v_resp, v_tent;
end
$$;
