-- =============================================================================
-- scripts/ensaio-semente-homonimo.sql
--
-- A38: dois cadastros com o mesmo nome, e o clique que nao sabe de qual dos dois e.
--
-- POR QUE ISTO PRECISA DE UM CENARIO PROPRIO
--   O caminho feliz da semente roda com nomes que identificam uma pessoa cada, entao ele nunca
--   passa pelo ramo ambiguo. Antes da correcao, o `left join experiencia.garcom g on
--   lower(btrim(g.nome)) = lower(btrim(o.garcom))` multiplicava a linha da origem por quantos
--   homonimos houvesse, e o `on conflict (id_origem) do nothing` engolia a multiplicacao: a
--   primeira linha que chegasse vencia. O clique ficava atribuido a um `Ana` ARBITRARIO, e a
--   conferencia de 74 continuava passando, porque o total nao muda.
--
--   Nada no sistema mostraria isso depois. Por isso o caso vive aqui, e nao numa nota.
--
-- POR QUE `rollback` NO FIM
--   Este arquivo apaga `convite_clique` para refazer a resolucao do zero, e os casos do Worker
--   rodam contra este mesmo banco logo depois. Em transacao desfeita, o cenario existe durante a
--   conferencia e nao existe depois dela.
--
-- COMO RODA
--   psql -v copia=/tmp/semente-XXXX.sql -f scripts/ensaio-semente-homonimo.sql
-- =============================================================================

begin;

-- Esvazia para que a semente RESOLVA de novo: com as linhas no lugar, `on conflict (id_origem)
-- do nothing` nao reescreve `garcom_id`, e o cenario nao aconteceria.
delete from experiencia.convite_clique;

-- A segunda `Ana`. Duas pessoas com o mesmo primeiro nome na mesma casa e normal, e e por isso
-- que a correcao NAO foi um indice unico em `lower(btrim(nome))`: ele recusaria o cadastro da
-- segunda, que e uma pessoa de verdade com respostas de verdade.
insert into experiencia.garcom (nome, pin, ativo) values ('  ANA  ', '9911', true);

\i :copia

do $$
declare
  v_ana_total integer;
  v_ana_nulos integer;
  v_bruno     integer;
  v_linhas    integer;
begin
  select count(*) into v_linhas from experiencia.convite_clique;
  if v_linhas <> 74 then
    raise exception
      'A38: a origem tem 74 linhas e chegaram %. Se passou de 74, a juncao por nome multiplicou a '
      'linha da origem; se ficou abaixo, alguma linha foi descartada.', v_linhas;
  end if;

  -- `Ana` aparece em 32 das 74 linhas da fixture, em tres grafias (uma delas com espaco nas
  -- pontas). Ser o nome mais frequente e o que torna o caso caro: atribuir arbitrariamente move
  -- 43% do historico de cliques para uma das duas pessoas.
  select count(*), count(*) filter (where garcom_id is null)
    into v_ana_total, v_ana_nulos
  from experiencia.convite_clique where lower(btrim(garcom)) = 'ana';

  if v_ana_total <> 32 then
    raise exception 'A38: esperadas 32 linhas de `Ana` na origem, vieram %', v_ana_total;
  end if;

  if v_ana_nulos <> 32 then
    raise exception
      'A38: das 32 linhas de `Ana`, % ficaram sem garcom resolvido, e o certo sao 32. Com dois '
      'cadastros de mesmo nome, escolher um e arbitrario: o clique passa a contar para uma pessoa '
      'que talvez nao o tenha recebido, e num painel por garcom isso nao parece erro.', v_ana_nulos;
  end if;

  -- E o resto continua resolvendo: a correcao nao pode ter desligado a atribuicao inteira, que
  -- seria "passar no teste" pelo motivo errado.
  select count(*) into v_bruno
  from experiencia.convite_clique
  where lower(btrim(garcom)) = 'bruno' and garcom_id is not null;

  if v_bruno < 1 then
    raise exception
      'A38: `Bruno` tem cadastro unico e ficou sem atribuicao. A correcao do homonimo desligou a '
      'resolucao de todo mundo, o que passaria no teste do `Ana` pelo motivo errado.';
  end if;

  raise notice 'ok  A38: com dois cadastros `Ana`, os 32 cliques dela ficam SEM atribuicao e sao '
               'anunciados; quem tem cadastro unico continua resolvendo';
end
$$;

-- Desfaz o cenario inteiro: a segunda `Ana`, o apagamento de `convite_clique` e o que a semente
-- gravou nesta passada.
rollback;
