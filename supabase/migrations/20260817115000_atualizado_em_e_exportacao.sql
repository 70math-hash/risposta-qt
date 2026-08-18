-- =============================================================================
-- 20260817115000_atualizado_em_e_exportacao.sql
--
-- Dois achados menores da critica: A30 e A44.
-- =============================================================================

-- =============================================================================
-- A30. Uma coluna que mentia para sempre
--
-- `configuracao.atualizado_em` tinha `default now()` e NADA a atualizava: nao havia trigger e
-- nenhum caminho de escrita a tocava. Ela dizia, para sempre, que o parametro foi atualizado
-- quando ele foi CRIADO.
--
-- Isso importa mais do que parece: `configuracao` guarda o e-mail do alerta de detrator e a janela
-- de duplicidade. "Quando foi que mudaram isto?" e a primeira pergunta quando um alerta para de
-- chegar, e a coluna respondia com uma data falsa.
-- =============================================================================
create or replace function experiencia.fn_marca_atualizado()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end
$$;

comment on function experiencia.fn_marca_atualizado() is
  'Trigger de `atualizado_em`. Existe porque a coluna tinha default e nada a escrevia: ela dizia '
  'para sempre que o parametro foi atualizado quando ele foi criado.';

drop trigger if exists configuracao_atualizado_em on experiencia.configuracao;
create trigger configuracao_atualizado_em
  before update on experiencia.configuracao
  for each row execute function experiencia.fn_marca_atualizado();

-- =============================================================================
-- A44. Uma contradicao interna da folha, resolvida no banco
--
-- A secao 6.3 manda que o uso de `vw_exportacao_cliente` "fica registrada em `execucao_rotina`", e
-- a secao 3.3 fecha `rotina` em cinco valores, nenhum de exportacao. As duas nao podem valer.
--
-- Resolvida pelo lado que preserva as duas intencoes: o registro passa a ter tabela PROPRIA, em vez
-- de um sexto valor em `rotina`. Exportacao nao e rotina — nao tem agendamento, nao tem passo, nao
-- tem status de sucesso ou erro no mesmo sentido — e enfia-la ali faria `vw_saude_rotina` misturar
-- "o sistema rodou" com "alguem baixou um arquivo", que sao perguntas diferentes.
--
-- E o registro importa: `vw_exportacao_cliente` e a unica leitura que entrega dado pessoal em bloco.
-- =============================================================================
create table if not exists experiencia.exportacao_registro (
  id            uuid        primary key default gen_random_uuid(),
  view_exportada text       not null,
  quem          text        not null,
  linhas        integer     null,
  criado_em     timestamptz not null default now(),
  constraint exportacao_registro_view_dominio check (view_exportada in (
    'vw_exportacao_resposta','vw_exportacao_opcao','vw_exportacao_item',
    'vw_exportacao_comentario','vw_exportacao_venda','vw_exportacao_cliente'))
);

comment on table experiencia.exportacao_registro is
  'Quem baixou qual exportacao, e quando. Tabela propria e nao um sexto valor em `rotina`: '
  'exportacao nao tem agendamento nem passo, e mistura-la com as rotinas faria vw_saude_rotina '
  'responder duas perguntas diferentes de uma vez. `vw_exportacao_cliente` e a unica leitura que '
  'entrega dado pessoal em bloco, e por isso o registro existe.';

create index if not exists exportacao_registro_criado_idx
  on experiencia.exportacao_registro (criado_em desc);

alter table experiencia.exportacao_registro enable row level security;

create policy leitura_painel on experiencia.exportacao_registro
  for select to experiencia_leitura, authenticated using (true);
create policy app_select on experiencia.exportacao_registro
  for select to experiencia_app using (true);
create policy app_insert on experiencia.exportacao_registro
  for insert to experiencia_app with check (true);

grant select, insert on experiencia.exportacao_registro to experiencia_app;
grant select on experiencia.exportacao_registro to experiencia_leitura;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant select on experiencia.exportacao_registro to authenticated';
  end if;
end
$$;

-- =============================================================================
-- A INVARIANTE DE ESTADO FINAL.
--
-- Esta e a ultima migration da cadeia, e por isso e a unica que enxerga o estado final. A
-- conferencia do numero exato de tabelas morava em `20260817102000`, que roda no meio: ela aprovava
-- um numero que deixava de ser verdade tres migrations depois.
--
-- Conferencia que descreve um estado intermediario como se fosse o final da uma falsa sensacao de
-- trava, que e pior que nao ter trava: com ela, ninguem procura.
-- =============================================================================
do $$
declare
  v_tabelas      integer;
  v_sem_rls      integer;
  v_sem_politica integer;
  v_views        integer;
begin
  select count(*) into v_tabelas
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'experiencia' and c.relkind = 'r';

  -- 26 da folha, mais `exportacao_registro`. Se este numero mudar, alguem criou ou removeu tabela,
  -- e a folha canonica precisa ser editada ANTES desta linha (regra 2 da secao 0 dela).
  if v_tabelas <> 27 then
    raise exception
      'esperadas 27 tabelas em experiencia (as 26 da folha mais exportacao_registro), encontradas %. '
      'Tabela nova entra na folha canonica primeiro.', v_tabelas;
  end if;

  select count(*) into v_sem_rls
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'experiencia' and c.relkind = 'r' and c.relrowsecurity = false;
  if v_sem_rls > 0 then
    raise exception 'RLS desligado em % tabela(s) no estado final. F58 exige todas, sem excecao', v_sem_rls;
  end if;

  select count(*) into v_sem_politica
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'experiencia' and c.relkind = 'r'
    and not exists (select 1 from pg_policies p
                    where p.schemaname = 'experiencia' and p.tablename = c.relname);
  if v_sem_politica > 0 then
    raise exception
      'RLS ligado e nenhuma politica em % tabela(s) no estado final: isso nega tudo em silencio, '
      'e tabela criada por migration posterior a de RLS e exatamente onde isso acontece.',
      v_sem_politica;
  end if;

  select count(*) into v_views
  from information_schema.views where table_schema = 'experiencia';
  if v_views <> 30 then
    raise exception 'esperadas 30 views em experiencia, encontradas %', v_views;
  end if;

  raise notice 'ok  estado final: 27 tabelas, todas com RLS e politica, e 30 views.';
end
$$;
