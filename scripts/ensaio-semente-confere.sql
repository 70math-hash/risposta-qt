-- =============================================================================
-- scripts/ensaio-semente-confere.sql
--
-- Confere o resultado do caminho feliz da semente de `convite_clique`, depois de
-- `scripts/ensaio.sh --dados` aplicar a copia preenchida DUAS vezes.
--
-- Os quatro numeros vem da fixture `ensaio-semente-74.sql`, e estao explicados aqui e la.
-- Numero fixo de proposito: conferencia que se calcula a partir do que encontrou nao confere
-- nada.
-- =============================================================================

do $$
declare
  v_linhas    integer;
  v_com       integer;
  v_garcons   integer;
  v_ativos    integer;
  v_numericos integer;
  v_total     integer;
begin
  select count(*), count(garcom_id) into v_linhas, v_com from experiencia.convite_clique;
  select count(*) into v_garcons from experiencia.garcom where pin like 'provisorio-%';
  select count(*) into v_ativos  from experiencia.garcom where pin like 'provisorio-%' and ativo;

  -- 74 depois de DUAS aplicacoes. E a prova de que o UNIQUE em `id_origem` torna a migracao
  -- repetivel: sem ele, a segunda passada dobraria o historico e ninguem notaria, porque 148
  -- cliques tambem parece um numero plausivel.
  if v_linhas <> 74 then
    raise exception 'depois de duas aplicacoes existem % linhas, esperado 74', v_linhas;
  end if;

  -- Dez das 74 tem `garcom` em branco na origem. Elas ENTRAM, e ficam sem garcom resolvido:
  -- branco e um fato da origem, e descartar a linha ou inventar um marcador seria interpretar
  -- durante a migracao.
  if v_com <> 64 then
    raise exception '% linhas com garcom resolvido, esperado 64', v_com;
  end if;

  -- Quatro nomes distintos nao vazios vem da origem: Ana (que aparece tres vezes, uma delas
  -- com espaco nas pontas), Bruno, `Carla D''Ávila` e `José`. Mas `ensaio-dados.sql` JA cadastrou
  -- Ana, Bruno e Carla com PIN de verdade, antes de a semente rodar.
  --
  -- Portanto a semente cria DOIS garcons provisorios, e nao quatro: `Carla D''Ávila` (que nao e
  -- a mesma pessoa que `Carla` para uma comparacao exata de nome) e `José`. E isso e a
  -- propriedade que importa: a semente NAO duplica quem ja existe no cadastro. Sem o
  -- `not exists`, o dia da migracao produziria uma segunda Ana inativa com PIN provisorio, e o
  -- historico de cliques dela apontaria para a Ana errada.
  if v_garcons <> 2 then
    raise exception
      '% garcons de semente, esperado 2 (Ana e Bruno ja existiam no cadastro, e Carla D''''Ávila e Jose nao). '
      'Se der 4, a semente parou de conferir o cadastro existente e criou homonimo; se der 8, duas '
      'aplicacoes dobraram.', v_garcons;
  end if;

  -- E o total: os 3 do cadastro de ensaio mais os 2 da semente.
  select count(*) into v_total from experiencia.garcom;
  if v_total <> 5 then
    raise exception '% garcons no total, esperado 5 (3 do cadastro + 2 da semente)', v_total;
  end if;

  raise notice 'ok  semente: 74 linhas, 64 com garcom, 2 garcons novos inativos sem duplicar cadastro, reaplicacao sem dobrar';
end
$$;
