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
