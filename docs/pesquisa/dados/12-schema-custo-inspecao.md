# Estrutura real das tabelas de custo (somente leitura)

Lida diretamente em 14/08/2026 no projeto `NFe e Financeiro` (`rzrjdbnxhpwzqgqrlfwa`, `sa-east-1`),
via `information_schema`. **Nada foi criado, alterado ou apagado.**

Este arquivo é a base do desenho do cruzamento satisfação x CMV, que é o diferencial nº 1 do projeto.
Ele **substitui suposições anteriores**: o dossiê assumia que o custo por prato viria de planilha ou
das skills, e que a junção com o R3 seria por nome normalizado. As duas suposições estavam erradas, e
a realidade é melhor.

---

## 1. Os dois achados que mudam o desenho

### 1.1 `pratos.id_altec` existe

A tabela `pratos` já tem a coluna **`id_altec` (`text`, nullable)**. É a chave direta para casar com o
relatório R3 do PDV, que traz ID do produto.

**Consequência:** a junção do R3 com o cardápio deixa de ser por nome normalizado sem acento (frágil,
porque `RUCOLA` contra `Rúcola` depende de regra de normalização que muda com o tempo) e passa a ser
por **identificador estável**. O casamento por nome continua existindo, mas como **reserva**, para o
caso de `id_altec` estar nulo.

Isso conserta uma fragilidade que estava especificada em `etapa-3/02-replicar.md` como se fosse
inevitável.

### 1.2 A lista de materiais é recursiva

`producao_ingredientes.producao_id` referencia **`insumos_master.id`**, não uma tabela de produções.
Combinado com `insumos_master.tipo`, isso significa:

| `tipo` | Linhas | O que é |
|---|---|---|
| `comercial` | 129 | Insumo comprado, com preço vindo de nota fiscal |
| `producao_interna` | 1 | Sub-receita (massa, molho, base), que tem a **própria** lista de ingredientes em `producao_ingredientes` |

**Consequência:** o custo de um prato não é uma soma plana de `prato_ingredientes`. É uma resolução
**recursiva**: prato leva insumos, e insumo de tipo `producao_interna` leva outros insumos, em
quantos níveis houver. A consulta correta é um `WITH RECURSIVE`, e uma soma plana daria custo
subestimado (ignorando o conteúdo das sub-receitas) ou zero para a sub-receita.

Numa pizzaria isso não é detalhe: massa e molho são exatamente sub-receitas, e são a maior parte do
custo de uma pizza.

---

## 2. Estrutura das tabelas

### `pratos` (1 linha)

| Coluna | Tipo | Nulo | Papel no cruzamento |
|---|---|---|---|
| `id` | `uuid` | não | |
| `nome` | `text` | não | |
| `categoria` | `text` | não | Agrupamento no painel (PIZZAS, ENTRADAS, etc.) |
| **`id_altec`** | `text` | sim | **Chave de junção com o R3.** Preencher é pré-requisito do cruzamento |
| `preco_venda` | `numeric` | sim | Numerador da margem |
| `cmv_meta` | `numeric` | sim | Meta de CMV, permite comparar real contra alvo |
| `observacao` | `text` | sim | |
| `ativo` | `boolean` | sim | Filtro do painel |
| `created_at` | `timestamptz` | sim | |

### `prato_ingredientes` (0 linhas)

| Coluna | Tipo | Nulo | Observação |
|---|---|---|---|
| `id` | `uuid` | não | |
| `prato_id` | `uuid` | sim | FK para `pratos.id` |
| `insumo_master_id` | `uuid` | sim | FK para `insumos_master.id` |
| `quantidade` | `numeric` | **não** | Gramagem da ficha técnica |
| `rn_override` | `numeric` | sim | Rendimento específico desta linha, sobrepõe o `rn` do insumo |
| `ordem` | `integer` | sim | |
| `observacao` | `text` | sim | |

### `insumos_master` (131 linhas)

| Coluna | Tipo | Nulo | Papel |
|---|---|---|---|
| `id` | `uuid` | não | |
| `codigo_qt`, `nome_qt` | `varchar`, `text` | sim, **não** | |
| `categoria`, `unidade_padrao` | `text` | sim | |
| `ficha_tecnica_ref` | `text` | sim | Ponte de leitura para as skills |
| `estoque_minimo`, `estoque_atual` | `numeric` | sim | Fora do escopo da pesquisa |
| `ativo` | `boolean` | sim | |
| **`rn`** | `numeric` | **não** | **Rendimento.** Divisor do custo: quantidade usada sobre rendimento |
| **`preco_unitario_fixo`** | `numeric` | sim | Preço travado. **Só 1 dos 130 tem.** Serve de reserva |
| **`tipo`** | `text` | **não** | `comercial` ou `producao_interna`. Define se desce um nível |
| `codigo_producao` | `text` | sim | Nenhuma linha preenchida |
| `id_altec` | `text` | sim | |
| `rendimento`, `modo_preparo` | `numeric`, `text` | sim | |

Atenção à ambiguidade: existem **`rn`** e **`rendimento`** como colunas distintas em
`insumos_master`, e ainda `rn_override` nas duas tabelas de ingredientes. Qual é a semântica exata de
cada uma, e qual tem precedência no cálculo, é **NÃO VERIFICADO** e precisa ser confirmado com o
proprietário antes de a consulta de custo ser escrita. Errar aqui produz número com aparência de
certo, que é pior que número ausente.

### `historico_precos` (344 linhas)

| Coluna | Tipo | Nulo | Papel |
|---|---|---|---|
| `id` | `uuid` | não | |
| `insumo_master_id` | `uuid` | sim | FK para `insumos_master.id` |
| `fornecedor_id` | `uuid` | sim | FK para `fornecedores.id` |
| `nota_id` | `uuid` | sim | FK para `notas.id`, ou seja rastreia até a nota fiscal |
| **`data`** | `date` | **não** | Data do preço. É o que permite custo histórico, não só atual |
| **`valor_unit_normalizado`** | `numeric` | sim | **A fonte de preço.** Já normalizado por unidade |
| `variacao_pct` | `numeric` | sim | |

Que este histórico exista com data é o que torna possível responder "o CMV da Margherita subiu porque
a muçarela subiu em maio", em vez de só "o CMV é X hoje".

### `producao_ingredientes` (5 linhas)

Mesma forma de `prato_ingredientes`, com `producao_id` em vez de `prato_id`, apontando para
`insumos_master.id`. É o segundo nível da lista de materiais.

---

## 3. Chaves estrangeiras confirmadas

| Tabela | Coluna | Referencia |
|---|---|---|
| `prato_ingredientes` | `prato_id` | `pratos.id` |
| `prato_ingredientes` | `insumo_master_id` | `insumos_master.id` |
| `producao_ingredientes` | `producao_id` | **`insumos_master.id`** |
| `producao_ingredientes` | `insumo_master_id` | `insumos_master.id` |
| `historico_precos` | `insumo_master_id` | `insumos_master.id` |
| `historico_precos` | `fornecedor_id` | `fornecedores.id` |
| `historico_precos` | `nota_id` | `notas.id` |

---

## 4. O que isso significa para o schema `experiencia`

| Ponto | Decisão que decorre |
|---|---|
| **Junção com o cardápio** | A tabela de itens do schema `experiencia` guarda `prato_id` (`uuid`, FK lógica para `pratos.id`), não nome de prato. O nome é buscado por leitura, nunca copiado, senão duas fontes divergem |
| **Junção com o R3** | Por `pratos.id_altec`, com casamento por nome normalizado apenas como reserva quando `id_altec` for nulo |
| **Custo por prato** | Uma **view** no schema `experiencia`, com `WITH RECURSIVE`, que lê as tabelas de custo em modo somente leitura. Nenhuma cópia de custo, nenhuma rotina de sincronização, nenhuma duplicação de regra de cálculo. É literalmente o que a decisão D2 comprou |
| **Data de referência do custo** | A view aceita data e resolve o preço vigente naquela data por `historico_precos`, com `preco_unitario_fixo` como reserva. Isso permite comparar satisfação de um trimestre com o custo daquele trimestre, e não com o custo de hoje |
| **Estado atual dos dados** | A estrutura está pronta e **vazia**: `pratos` tem 1 linha e `prato_ingredientes` tem 0. O cruzamento é estruturalmente possível e ainda não tem dado. Preencher é a entrega de M3, e o painel precisa exibir `ficha técnica ausente` em vez de custo zero |
| **Escrita** | O schema `experiencia` **nunca** escreve em `pratos`, `prato_ingredientes`, `insumos_master`, `historico_precos` nem `producao_ingredientes`. Condição 1 da decisão D2 |

## 5. Pendência que nasce daqui

**Qual a semântica de `rn`, `rendimento` e `rn_override`, e qual a precedência entre eles no cálculo
de custo?** É a única pergunta que impede escrever a view de custo com confiança. Sem ela, a view
sai, mas com uma premissa declarada em vez de verificada, e o número precisa aparecer no painel
marcado como não conferido.
