# QT Experiência

Sistema de experiência do cliente da QT Pizza Bar. Coleta em tablet e QR Code, painel de
leitura, digest diário por e-mail, e cruzamento de satisfação com custo por prato.

Substitui a assinatura de um fornecedor de pesquisa de satisfação. O que ele **não** entregava,
e é a razão de existir deste sistema: ler o PDV da casa e conhecer a ficha técnica.

---

## As duas regras de operação

Estas duas frases são o manual inteiro. Todo o resto é detalhe.

### 1. O e-mail das 16h é o batimento cardíaco

Ele chega todo dia às 16h e cobre a noite anterior fechada. Ele é três coisas ao mesmo tempo:
o relatório, o que mantém o banco acordado, e o único alarme do sistema.

> **Se o e-mail das 16h não chegar dois dias seguidos, algo quebrou.**

Não existe monitoramento além disso, e é de propósito: alarme que ninguém lê não é alarme.
O que fazer quando ele não chega está em [`docs/arquitetura/05-implantacao-e-operacao.md`](docs/arquitetura/05-implantacao-e-operacao.md),
no runbook, escrito para quem não programa.

### 2. Vercel Hobby é proibido neste projeto

Não por limite técnico. A documentação oficial do plano Hobby diz que ele é restrito a
*"non-commercial, personal use only"*, e um sistema rodando dentro de um restaurante é uso
comercial. O deploy é **Cloudflare Pages** e **Cloudflare Workers**, que permitem uso
comercial no plano gratuito e ainda dão cron com precisão de minuto, contra ±59 minutos do
concorrente.

---

## O que roda onde

| Peça | Onde | Plano | Custo |
|---|---|---|---|
| PWA de coleta e painel | Cloudflare Pages | gratuito | R$ 0 |
| API de escrita e 4 rotinas | Cloudflare Workers + Cron Triggers | gratuito | R$ 0 |
| Banco e autenticação | Supabase, projeto `NFe e Financeiro`, schema `experiencia`, `sa-east-1` | gratuito | R$ 0 |
| E-mail do digest | Resend | gratuito | R$ 0 |
| Classificação de comentário | Groq | gratuito | R$ 0 |
| Backup cifrado | Backblaze B2 + GitHub Actions | gratuito | R$ 0 |

Consumo previsto: entre 0,04% e 7,2% de cada cota gratuita. A conta completa, com o cenário
pessimista, está em [`docs/arquitetura/04-custo-real.md`](docs/arquitetura/04-custo-real.md).

**Groq e não Gemini**, e a razão é privacidade, não limite: o tier gratuito do Gemini usa o
conteúdo enviado para treinar, com revisão humana, e o próprio termo pede para não enviar dado
pessoal. Comentário de cliente é dado pessoal.

---

## Estrutura

```
src/comum/       dominio, dia operacional, NPS, contrato de gravacao, marca
src/coleta/      o PWA de quiosque: questionario, fila local, maquina de estado
src/painel/      o painel de leitura, sete abas, somente leitura
worker/          API de escrita e as quatro rotinas agendadas
worker/rotinas/  digest, classificador, retencao, watcher do Drive, parser do R3
supabase/        migrations versionadas
docs/            briefing, decisoes, pesquisa competitiva, arquitetura
tests/           99 testes
```

## Comandos

```bash
npm install
npm run dev          # PWA e painel em localhost:5173
npm run worker:dev   # Worker em localhost:8787
npm run verifica     # tipos, testes e build. Rode antes de todo commit
```

## Configuração

```bash
cp .env.example .env.local   # front: so chave publica
cp .env.example .dev.vars    # worker: os segredos
```

A chave de serviço do Supabase **nunca** entra no front. Ela vive só no Worker, por
`wrangler secret put`. O bundle publicado é legível por qualquer pessoa, e é por isso que ele
não carrega segredo nenhum.

---

## Três decisões de arquitetura que parecem estranhas e não são

**O corte do dia é às 6h da manhã, nunca à meia-noite.** A casa fecha depois de 0h, e o
fornecedor anterior cortava o relatório às 23:59 enquanto o contador do tablet zerava às 7:00,
o que jogava o pedaço mais tardio da noite no dia errado, todos os dias. Existe **uma** definição
de dia operacional, em `experiencia.fn_dia_operacional`, espelhada em `src/comum/dia-operacional.ts`.
Busca no repositório por `criado_em::date` tem de voltar zero ocorrência.

**O PIN do garçom não é autenticação, é dado da resposta.** Tratá-lo como segredo obrigaria a
guardá-lo com hash, e aí ninguém consegue corrigir um PIN digitado errado. Ele amarra a resposta
ao atendente, e a fraude é impedida por outras travas.

**Nenhuma meta, ranking ou bônus ligado a volume de avaliações.** Dois motivos independentes:
meta amarrada à nota contamina o dado, e o Google proíbe por texto oficial pedir à equipe um
número determinado de avaliações. Rastrear qual garçom entregou o QR é permitido; virar meta é
violação nomeada. Ver decisão D8 em [`docs/01-decisoes.md`](docs/01-decisoes.md).

---

## Antes de aplicar a primeira migration

Ordem obrigatória, e a primeira condição não é negociável:

1. **`pg_dump` do projeto `NFe e Financeiro`, confirmado restaurável.** Este projeto contém o
   sistema fiscal da casa. Dump que ninguém testou não é backup.
2. Conta no Backblaze B2 criada, bucket privado com lifecycle de 56 dias, par de chaves `age`
   gerado. A chave privada **nunca** vai para o GitHub: gerenciador de senhas e uma cópia em
   papel no cofre do restaurante.
3. Crítica adversarial da Etapa 4 sem achado de severidade alta em aberto.

Toda estrutura entra por **migration versionada**. Migration aplicada nunca é editada:
correção é migration nova. Nada de DDL ad hoc pelo painel do Supabase.

## Documentação

| Documento | O que responde |
|---|---|
| [`docs/00-briefing.md`](docs/00-briefing.md) | O escopo, de uma entrevista de 104 perguntas |
| [`docs/01-decisoes.md`](docs/01-decisoes.md) | D1 a D8, com a consequência de cada uma. **Vence tudo** |
| [`docs/arquitetura/00-canonico.md`](docs/arquitetura/00-canonico.md) | Nome de tabela, coluna, rotina e os 46 números canônicos. **É lei** |
| [`docs/arquitetura/`](docs/arquitetura/) | Arquitetura, modelo de dados, segurança e LGPD, custo, implantação |
| [`docs/pesquisa/`](docs/pesquisa/) | A pesquisa competitiva: 82 fornecedores, com verificação adversarial |

Onde dois documentos divergirem, a precedência está na seção 10 da folha canônica.

## Como se verifica este sistema

Quatro camadas, e cada uma existe porque a de cima nao alcanca o que a de baixo erra.

```
npm run verifica          tsc + a suite inteira + build. Roda em qualquer maquina, sem banco.
scripts/ensaio.sh         as migrations num Postgres local, do zero, mais a restauracao ensaiada.
scripts/ensaio.sh --dados o acima + as funcoes exercitadas com dado + a matriz de permissoes
                          girando a maçaneta + o Worker de verdade por HTTP.
```

**1. `tsc --noEmit`.** Pega o que e tipo. Nao pega nada que atravesse uma fronteira como texto:
nome de coluna dentro de `select=...`, nome de argumento de funcao, chave de payload JSON. Foi
nessa fronteira que moraram quinze dos erros consertados neste projeto.

**2. Os testes de contrato** (`tests/contrato-*.test.ts`). Leem as migrations de verdade e as
fontes de verdade, e comparam. Nao precisam de banco, entao rodam em `npm test`:

- `contrato-sql`: as chaves que `fn_grava_resposta` le existem no payload que o Worker envia.
- `contrato-colunas`: toda coluna que o Worker pede e escreve existe em tabela ou em view; os
  dominios fechados escritos em TypeScript sao o mesmo conjunto que o `check` do banco.
- `contrato-views`: as interfaces do painel tem exatamente os campos que a view devolve, e o tipo
  passado a `useView` casa com a view lida. As interfaces sao GERADAS do banco, e nao escritas a
  mao: 25 delas divergiam quando eram escritas a mao, e uma citava uma view que nao existe.
- `contrato-folha-canonica`: a folha nao promete funcao nem view que o SQL nao cria, nenhum
  documento afirma contagem que contradiz o SQL, e **todo caminho de arquivo citado existe** — a
  critica abriu com quatro arquivos citados e ausentes.
- `contrato-telas`: as listas fechadas do TypeScript sao o mesmo conjunto que os `check` do banco,
  nos dois sentidos, e toda escrita de `dados.ts` tem uma tela que a chama.

**3. `scripts/ensaio.sh --dados`.** Aplica as migrations num Postgres local e exercita as funcoes
com dado, conferindo numero por numero — inclusive o custo recursivo da pizza, que da R$ 8,22 e
esta calculado a mao dentro do arquivo. Roda tambem o caminho feliz da migracao das 74 linhas, com
nomes que doem (acento, apostrofo, espaco nas pontas, vazio), duas vezes, para provar que
reaplicar nao dobra.

**4. `sql/teste_rls.sql`.** A matriz de permissoes girando a maçaneta, dentro de
`begin; ... rollback;`. Confere que `anon` nao alcanca nada, que o painel le e nao escreve, que o
papel do Worker le o custo e **nao** escreve no sistema fiscal (o criterio de aceite de `F55`), e
que nenhuma view contorna a matriz por falta de `security_invoker`.

Na primeira vez que rodou, ele contradisse o documento de seguranca: `experiencia_app` lia toda a
coleta, enquanto o documento afirmava que ele nao tinha grant nenhum ali. Os dois estavam coerentes
entre si e errados quanto ao banco, que e por que nenhuma leitura pegaria.

**5. `tests/worker-integracao.test.ts`.** O Worker rodando contra aquele Postgres, por HTTP.
`scripts/postgrest-de-ensaio.mjs` traduz a requisicao para SQL e deixa o Postgres julgar: ele nao
tem lista de colunas validas, entao nao consegue aprovar um pedido que o PostgREST recusaria.

Se o substituto nao estiver no ar, esses casos sao **pulados com aviso em stderr**, e nao
aprovados. Pulado nao e verde.

**E a restauracao, ensaiada a cada execucao.** Papel e objeto do cluster e `pg_dump` nao leva
nenhum, entao restaurar num Postgres cru falha uma vez por `GRANT` do dump. `sql/papeis.sql` roda
antes das migrations (o estado de quem acabou de criar o banco) e de novo depois (a conferencia de
que os `GRANT` do dump encontraram os papeis). Esse caminho so se percorre no dia em que o backup
importa — ensaia-lo e a unica forma de saber que ele funciona antes desse dia.

### O que ainda nao e verificado por nada

- **A tela.** Nenhum teste renderiza um componente. O que protege o painel e o contrato de views,
  mais a regra de que toda escrita de `dados.ts` tem de ser chamada por alguma tela — foi assim que
  apareceu um botao que faltava no fim de uma cadeia que existia inteira.
- **O envio de e-mail e a chamada da Groq.** So a montagem esta coberta; o envio, nao.
- **A premissa de custo.** `rn`, `rendimento` e `rn_override` sao `NAO VERIFICADO` (N46). A view
  devolve `premissa_conferida = false` e o painel escreve isso na tela, em toda leitura.
