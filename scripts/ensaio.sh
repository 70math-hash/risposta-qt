#!/usr/bin/env bash
# =============================================================================
# scripts/ensaio.sh
#
# Derruba e recria o banco de ensaio, semeia a estrutura de `public` e aplica TODAS as
# migrations em ordem, com `ON_ERROR_STOP=1`.
#
# POR QUE EXISTE
#   `tsc --noEmit` e os testes de contrato conferem a ponta TypeScript. Nada disso executa
#   uma linha de SQL. As duas coisas que este script achou (`round(double precision, int)`
#   inexistente e `temporary ... on commit drop` morrendo em autocommit) sao invisiveis para
#   qualquer outro teste do projeto, e as duas derrubariam a aplicacao em producao.
#
# COMO USAR
#   scripts/ensaio.sh            aplica estrutura + migrations
#   scripts/ensaio.sh --dados    aplica tambem os dados de ensaio e roda as conferencias
#
# O QUE NAO FAZ
#   Nao fala com Supabase. Precisa de um Postgres local e de `sudo -u postgres psql`.
# =============================================================================
set -euo pipefail

BANCO="${BANCO:-qt_ensaio}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
psql_() { sudo -u postgres psql -v ON_ERROR_STOP=1 -q -d "$BANCO" "$@"; }

echo "== recriando $BANCO =="
sudo -u postgres psql -q -c "drop database if exists $BANCO" -c "create database $BANCO"

echo "== estrutura de public (as cinco tabelas de custo) =="
psql_ -f "$RAIZ/scripts/ensaio-publico.sql"

echo "== migrations =="
for f in "$RAIZ"/supabase/migrations/*.sql; do
  nome="$(basename "$f")"
  printf '  %-52s ' "$nome"

  if [[ "$nome" == *semeia_convite_clique* ]]; then
    # Esta migration falha DE PROPOSITO quando o bloco gerado esta vazio, e essa falha e
    # uma garantia: sem ela, aplicar o arquivo como esta no repositorio deixaria
    # `convite_clique` vazia com aparencia de migrada. Aqui o teste e o inverso do normal:
    # ela TEM de falhar, e com a mensagem certa. Tudo que vem antes do `do $$` final ja
    # rodou quando a excecao estoura, entao chegar nessa mensagem tambem prova que o
    # `begin`/`commit` e a area de pouso temporaria funcionam.
    if psql_ -f "$f" >/dev/null 2>/tmp/ensaio-erro; then
      echo "FALHOU: aplicou em silencio com o bloco gerado vazio"
      exit 1
    fi
    if grep -q 'As 74 linhas nao foram embutidas' /tmp/ensaio-erro; then
      echo "ok (falha proposital, mensagem certa)"
    else
      echo "FALHOU com erro diferente do proposital"
      sed 's/^/      /' /tmp/ensaio-erro
      exit 1
    fi
    continue
  fi

  if psql_ -f "$f" >/dev/null 2>/tmp/ensaio-erro; then
    echo "ok"
  else
    echo "FALHOU"
    sed 's/^/      /' /tmp/ensaio-erro
    exit 1
  fi
done

if [[ "${1:-}" == "--dados" ]]; then
  echo "== dados de ensaio e conferencias =="
  psql_ -f "$RAIZ/scripts/ensaio-dados.sql"

  # ---------------------------------------------------------------------------
  # O CAMINHO FELIZ da semente de convite_clique.
  #
  # A falha proposital ja foi conferida acima. Ela nao prova que a migration funciona com o
  # bloco preenchido, e foi so ao rodar o caminho feliz que apareceu um CHECK que derrubaria
  # a migracao inteira por causa de uma linha com `garcom` em branco.
  #
  # A migration do repositorio NAO e alterada: o bloco e injetado numa copia temporaria, com
  # as 74 linhas sinteticas de `ensaio-semente-74.sql`. O arquivo versionado continua sendo
  # o que falha de proposito.
  # ---------------------------------------------------------------------------
  echo "== caminho feliz da semente de convite_clique =="
  # `mktemp` cria com 0600, e o `psql` roda como `postgres` via sudo: sem o chmod, o arquivo
  # existe e o Postgres nao o le, com um "Permission denied" que parece problema de banco.
  COPIA="$(mktemp /tmp/semente-XXXXXX.sql)"
  python3 "$RAIZ/scripts/monta-semente-de-ensaio.py" "$RAIZ" "$COPIA"
  chmod 644 "$COPIA"

  psql_ -f "$COPIA"
  # Reaplicar, para provar que o UNIQUE em id_origem torna a migracao repetivel.
  psql_ -f "$COPIA" >/dev/null

  psql_ -f "$RAIZ/scripts/ensaio-semente-confere.sql"

  # A38: o mesmo arquivo de semente, agora com DOIS cadastros de mesmo nome. Roda em transacao
  # desfeita, entao o cenario nao sobra para os casos do Worker mais abaixo.
  psql_ -v copia="$COPIA" -f "$RAIZ/scripts/ensaio-semente-homonimo.sql"
  rm -f "$COPIA"

  # ---------------------------------------------------------------------------
  # O Worker, rodando de verdade contra este banco.
  #
  # `scripts/postgrest-de-ensaio.mjs` traduz a requisicao para SQL e deixa o POSTGRES julgar: ele
  # nao tem lista de colunas validas. Coluna errada volta como o 42703 do proprio banco, que e o
  # mesmo erro que o PostgREST devolveria.
  #
  # `tests/worker-integracao.test.ts` PULA os casos quando o substituto nao esta no ar, e avisa em
  # stderr que pulou. Este bloco existe para que, aqui, ele nao pule: e o unico lugar onde a camada
  # HTTP do Worker e executada.
  # ---------------------------------------------------------------------------
  if [[ -d "$RAIZ/node_modules/pg" ]]; then
    echo "== o Worker contra este banco =="

    # Porta LIVRE escolhida pelo proprio sistema, e nao um numero fixo. Com porta fixa, uma
    # instancia esquecida de uma execucao anterior fazia a nova morrer com EADDRINUSE, e os testes
    # rodavam contra a instancia velha — que aponta para o mesmo banco mas roda o codigo antigo do
    # substituto. O sintoma eram tres testes falhando por motivo nenhum, e a causa levava tempo
    # para achar porque a resposta vinha, so vinha de outro processo.
    PORTA="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"
    export PGREST_ENSAIO="http://127.0.0.1:$PORTA"

    PGUSER="${PGUSER_ENSAIO:-root}" node "$RAIZ/scripts/postgrest-de-ensaio.mjs" "$PORTA" &
    PGREST=$!

    # Espera o socket abrir, em vez de dormir um tempo fixo.
    PRONTO=0
    for _ in $(seq 1 40); do
      if curl -sS -m 1 -o /dev/null "$PGREST_ENSAIO/rest/v1/mesa?select=numero&limit=1" \
        -H 'accept-profile: experiencia' 2>/dev/null; then
        PRONTO=1
        break
      fi
      # Se o processo morreu, nao ha o que esperar.
      kill -0 "$PGREST" 2>/dev/null || break
      sleep 0.25
    done

    # DERRUBA aqui, e nao deixa vitest rodar. Sem esta guarda, o substituto fora do ar fazia os 27
    # casos pularem (ou pior, falharem contra outra instancia), e um harness que confunde
    # "nao subiu" com "o codigo esta errado" custa mais tempo que o bug que ele deveria achar.
    if [[ $PRONTO -ne 1 ]]; then
      echo "  o substituto de PostgREST NAO subiu em $PGREST_ENSAIO"
      kill "$PGREST" 2>/dev/null || true
      exit 1
    fi

    npx vitest run tests/worker-integracao.test.ts
    RESULTADO=$?
    kill "$PGREST" 2>/dev/null || true
    wait "$PGREST" 2>/dev/null || true
    if [[ $RESULTADO -ne 0 ]]; then
      echo "  os testes de integracao do Worker FALHARAM"
      exit 1
    fi
  else
    # Dito alto, e nao omitido: sem o cliente de Postgres nao ha substituto, e sem substituto a
    # camada HTTP do Worker nao e exercitada por nada.
    echo "  pg nao instalado (npm install --no-save pg). A camada HTTP do Worker NAO foi testada."
  fi
fi

echo "== fim =="
