# Inspeção do Supabase da QT (somente leitura)

Executada em 13/08/2026 via MCP, com `list_organizations`, `list_projects` e `list_tables`.
**Nada foi criado, alterado ou apagado.** Este arquivo é a fonte da verdade sobre o estado real
do ambiente, e vale mais que qualquer suposição feita antes dele.

## Organizações

Uma só: **QT Pizza Bar** (`pyylhcrwnihlfgrdmjya`).

Consequência imediata: a recomendação de "organização Supabase separada", feita no sumário
executivo para evitar a restrição em cascata (HTTP 402 em todos os projetos da organização),
**não é aplicável sem criar uma segunda conta ou pagar**. Se o número de organizações gratuitas
por conta é limitado a uma: **NÃO VERIFICADO**, precisa ser conferido antes de qualquer decisão
que dependa disso.

## Projetos

| Projeto | Ref | Região | Status | Postgres |
|---|---|---|---|---|
| NFe e Financeiro | `rzrjdbnxhpwzqgqrlfwa` | `sa-east-1` (São Paulo) | **ACTIVE_HEALTHY** | 17.6.1.111 |
| Fichas Sensoriais | `wsvrnvaqucomlzzvkmzc` | `sa-east-1` (São Paulo) | **INACTIVE** | 17.6.1.121 |
| qt-avaliacoes | `helinoirdizwrluydkzp` | `us-east-1` (EUA) | **ACTIVE_HEALTHY** | 17.6.1.155 |

Criados em 28/04/2026, 19/05/2026 e 05/08/2026 respectivamente.

### Dois fatos que decidem arquitetura

**1. O teto de 2 projetos ativos por organização já está atingido.** Dois estão ativos e um está
inativo. A armadilha que a pesquisa levantou não é hipótese futura: já aconteceu. Criar um quarto
projeto no plano gratuito implica pausar outro.

**2. `qt-avaliacoes` está em `us-east-1`, os outros dois em `sa-east-1`.** Dado de cliente
brasileiro hospedado nos Estados Unidos é transferência internacional, o que é permitido pela
LGPD mas exige base legal adequada e aumenta a superfície de conformidade sem nenhum ganho.
Também custa latência a partir de São Paulo. Para um sistema que vai guardar nome e WhatsApp de
cliente, `sa-east-1` é a escolha certa, e **a região de um projeto Supabase não se troca depois
de criado**.

## Conteúdo: `qt-avaliacoes` (`helinoirdizwrluydkzp`)

### `public.cliques_avaliacao` — 74 linhas, RLS habilitado

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | `bigint` identity | |
| `garcom` | `text` | Atribuição por atendente, não normalizada (texto livre) |
| `criado_em` | `timestamptz` | default `now()` |
| `user_agent` | `text` nullable | |
| `referrer` | `text` nullable | |

**O que isto é, de fato:** um rastreador de cliques por garçom. Registra que alguém acionou um
link ou QR atribuído a um atendente, com o aparelho e a origem. **Não existe coluna de nota, de
comentário, de mesa nem de comanda** — portanto não é pesquisa de satisfação, é medição de
engajamento com um convite.

**Por que importa muito:** significa que **já existem QR Codes por garçom em circulação na casa**,
e que a equipe já foi treinada a apresentá-los. Isso é o ativo mais difícil de construir num
sistema de pesquisa (o hábito operacional), e ele já está de pé. As 74 linhas também dão uma
primeira leitura de volume e de distribuição por atendente.

**Pendência para o proprietário:** para onde esses QR Codes apontam hoje? Se apontam para o
Google, é preciso verificar se o convite é condicionado à nota (o que contraria a política de
conteúdo do Google, conforme `01-risposta.md`). Se apontam para o Risposta, o mesmo se aplica.

### `public.pizzapp_receitas` — 8 linhas, RLS habilitado

Receitas do QT PizzApp, uma linha por receita por aparelho, com `device_id`, `aluno`, `turma`,
`nome`, `params` (`jsonb`). É de outro produto (contexto de curso, ligado à marca pessoal do
pizzaiolo), e está hospedado neste projeto por conveniência. Não tem relação com experiência do
cliente e não deve influenciar o modelo de dados da pesquisa.

## Conteúdo: `NFe e Financeiro` (`rzrjdbnxhpwzqgqrlfwa`)

Sistema real e com volume, todo com RLS habilitado:

| Tabela | Linhas | Leitura |
|---|---|---|
| `notas` | 422 | Notas fiscais de entrada ingeridas |
| `itens_nota` | 1.179 | Itens das notas, o grão fino da compra |
| `nota_duplicatas` | 436 | Controle de duplicidade na ingestão |
| `insumos_master` | 131 | **Cadastro mestre de insumos** |
| `historico_precos` | 344 | **Série histórica de preço de insumo** |
| `fornecedores` | 61 | |
| `alertas` | 36 | |
| `producao_ingredientes` | 5 | |
| `pratos` | **1** | Ficha técnica, praticamente vazia |
| `prato_ingredientes` | **0** | Ficha técnica, vazia |
| `sefaz_estado` | 1 | Estado da integração fiscal |

### O que isso muda no diferencial nº 1

O cruzamento de satisfação com CMV era o diferencial mais defensável do projeto, e a suposição
até aqui era que o custo teria de ser importado de planilha ou das skills. **Ele já está em
Postgres, com histórico de preço por insumo.**

O que falta não é dado de custo: é a **ficha técnica** que liga prato a insumo, e ela já tem
tabela pronta e vazia (`pratos`, `prato_ingredientes`). Ou seja, o caminho para o diferencial é
preencher uma estrutura que já existe, não construir uma nova.

Isso também resolve a tensão registrada no briefing (o proprietário pediu para manter as fichas
técnicas separadas, nas skills, mas quer o cruzamento). A resolução: **a ficha técnica vive no
banco, em `pratos` e `prato_ingredientes`; as skills seguem sendo a ferramenta de trabalho para
formular e revisar receita.** O sistema de experiência apenas **consome** o custo por prato, sem
recalcular nada e sem acoplar-se às skills.

## Onde está o app de reservas

**Não está em nenhum destes três projetos.** Nenhuma tabela de reserva, mesa, cliente ou fila
apareceu. Então o app de reservas roda em outro lugar: outra conta Supabase, outro provedor de
banco, ou armazenamento que não é banco. **Pendência do proprietário:** informar onde ele vive.

Até essa resposta, qualquer recomendação sobre unificar ou sincronizar com as reservas fica com
confiança **baixa**, e a integração com o CRM de reservas não pode entrar no MVP.

## Recomendação de arquitetura que decorre desta inspeção

Substitui a recomendação de "organização separada" do sumário executivo, que a realidade do
ambiente tornou inaplicável.

| Decisão | Recomendação | Por quê |
|---|---|---|
| Onde criar as tabelas | **Schema novo e dedicado dentro de `NFe e Financeiro`**, não um projeto novo | É o único caminho que permite `JOIN` direto entre resposta de pesquisa e custo por prato, que é o diferencial nº 1. Projeto separado significaria sincronizar custo por rotina, ou seja, mais uma peça móvel num sistema que ninguém vai manter |
| Isolamento | Por **schema** (ex. `experiencia`) mais RLS, com papéis distintos por schema | Isolamento lógico sem custo de projeto. O fiscal continua no schema dele, e nada da pesquisa escreve nele |
| Região | `sa-east-1`, que é onde o projeto recomendado já está | Dado pessoal de cliente brasileiro em São Paulo, com menos latência e menos superfície de conformidade. Região não se troca depois |
| `qt-avaliacoes` | **Migrar as 74 linhas** e depois pausar o projeto | Libera o segundo slot ativo da organização, o que permite trazer `Fichas Sensoriais` de volta. Ganho concreto e imediato |
| Risco a tratar | `NFe e Financeiro` é o sistema fiscal, e mexer nele tem custo se der errado | Nenhuma migração sem `pg_dump` antes. Toda criação por migration versionada, nunca ad hoc. Nada da pesquisa com permissão de escrita fora do próprio schema |

**Confiança:** alta sobre o estado do ambiente (foi lido diretamente). Média sobre a escolha do
projeto, porque depende de o proprietário confirmar que aceita a pesquisa convivendo no mesmo
projeto do fiscal. Se ele recusar, o caminho é `qt-avaliacoes` mais uma rotina diária que copia
custo por prato para dentro dele, ao custo de uma peça móvel a mais e da região errada.
