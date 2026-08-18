"""
Monta uma copia temporaria de `20260817103000_semeia_convite_clique.sql` com o BLOCO GERADO
preenchido pelas 74 linhas sinteticas de `ensaio-semente-74.sql`.

POR QUE EXISTE
    A migration versionada falha de proposito quando o bloco esta vazio, e `scripts/ensaio.sh`
    confere essa falha. Mas falha proposital nao prova que a migration FUNCIONA quando o bloco
    esta cheio, e foi so ao rodar o caminho feliz que apareceu um CHECK que derrubaria a
    migracao inteira por causa de uma linha com `garcom` em branco na origem. Essa migration e
    o unico caminho para a unica copia daquele historico.

O QUE ELE NAO FAZ
    Nao toca no arquivo versionado. Escreve uma copia, e o arquivo do repositorio continua
    sendo o que falha de proposito: e essa falha que impede alguem de aplicar a migration com
    o bloco vazio e deixar `convite_clique` vazia com aparencia de migrada.

USO
    python3 scripts/monta-semente-de-ensaio.py <raiz-do-repo> <arquivo-de-saida>
"""

import sys

INICIO = '-- >>> INICIO DO BLOCO GERADO'
FIM = '-- >>> FIM DO BLOCO GERADO'
ESPERADO = 74


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    raiz, saida = sys.argv[1], sys.argv[2]

    caminho_migration = f'{raiz}/supabase/migrations/20260817103000_semeia_convite_clique.sql'
    with open(caminho_migration, encoding='utf-8') as f:
        migration = f.read()
    with open(f'{raiz}/scripts/ensaio-semente-74.sql', encoding='utf-8') as f:
        fixture = f.read()

    inserts = [l for l in fixture.splitlines() if l.startswith('insert into')]
    if len(inserts) != ESPERADO:
        # Numero fixo de proposito. Uma fixture truncada faria o ensaio conferir 74 contra 74
        # linhas que ele mesmo encurtou, e passar.
        print(f'a fixture tem {len(inserts)} inserts e deveria ter {ESPERADO}', file=sys.stderr)
        return 1

    i = migration.index(INICIO)
    f_ = migration.index(FIM)
    with open(saida, 'w', encoding='utf-8') as f:
        f.write(migration[:i] + '\n'.join(inserts) + '\n' + migration[f_:])
    return 0


if __name__ == '__main__':
    sys.exit(main())
