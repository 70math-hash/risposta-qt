# 02. O que REPLICAR: cada feature de MVP virada em coisa construível

> Base lida na íntegra: [`00-briefing.md`](../../00-briefing.md), [`dados/10-supabase-inspecao.md`](../dados/10-supabase-inspecao.md), [`07-matriz-features.md`](../07-matriz-features.md) (as 57 linhas de prioridade MVP das 113), [`06-questionario.md`](../06-questionario.md) (o questionário tela por tela), [`05-integracoes.md`](../05-integracoes.md) (os vereditos de integração) e [`01-risposta.md`](../01-risposta.md) (o que o incumbente entrega hoje).
> **A inspeção do Supabase de 13/08/2026 tem precedência sobre qualquer decisão anterior**, porque foi leitura direta do ambiente. Três recomendações antigas mudaram por causa dela, e estão marcadas no texto.
> **As correções dos verificadores adversariais têm precedência sobre a pesquisa original.** Preço refutado não aparece aqui.
> Número que não foi lido em fonte oficial aparece como NÃO PÚBLICO, NÃO VERIFICADO ou DESCONHECIDO, com essas palavras.

---

## 1. O que "replicar" significa neste projeto

Replicar aqui não é reproduzir a tela do fornecedor atual. É entregar **a mesma decisão operacional que ele deveria estar entregando**, com três diferenças deliberadas: sem mensalidade, sem ilha de dados e sem nada que dependa de alguém lembrar de manter.

Quatro consequências práticas dessa definição:

1. **Feature que não muda o que a casa faz amanhã não entra.** O incumbente publica 54 funcionalidades, e 23 delas não fazem diferença nenhuma para uma unidade (`01-risposta.md`, seção 4). Replicar as 23 seria pagar a conta de um produto desenhado para dez lojas, só que em esforço em vez de dinheiro.
2. **Não ficar pior que o incumbente em nada que ele faz bem.** O que ele faz bem e é obrigatório aqui: coleta anônima em tablet levado à mesa, relatório diário por e-mail com destinatários editáveis, ranking por código de garçom, base de clientes com nascimento, alerta crítico, análise de comentário por IA. Tudo isso está especificado abaixo com critério de aceite. Um item dele é estruturalmente irreplicável (benchmark contra a base de outros restaurantes) e a substituição é humana, não software.
3. **Onde ele tem defeito documentado, a réplica corrige.** O caso mais barato e mais grave: o relatório dele fecha o dia às 23:59 e o contador do tablet zera às 7:00, e o próprio suporte publica que a resposta da madrugada aparece em dois dias diferentes ([risposta.app](https://www.risposta.app/o-relatorio-e-os-tablets-consideram-horarios-diferentes/)). Numa casa que fecha depois da meia-noite isso corrompe a série toda noite. A correção é uma coluna, e está em F15.
4. **Superfície móvel é o custo real, não o dinheiro.** O consumo previsto de infraestrutura fica entre 0,04% e 7,2% dos planos gratuitos. O gargalo é quantas peças podem quebrar em silêncio num sistema sem mantenedor, e é por isso que várias features baratas foram cortadas na matriz e não voltam aqui.

### A regra de ouro

**Nada entra no MVP sem critério de aceite verificável.** Verificável quer dizer três coisas ao mesmo tempo:

| Exigência | O que reprova |
|---|---|
| Outra pessoa, com o sistema na mão, responde sim ou não em menos de 5 minutos, sem perguntar nada a quem construiu | "O painel tem que ser rápido" |
| Onde existe número, o número está escrito | "O alvo de toque tem que ser confortável" em vez de "44 px de lado, no mínimo" |
| O critério diz o que acontece quando falha, e a falha é observável de fora | "Se a internet cair, trata o erro" |

Corolário que vale para todas as 59 entradas abaixo: **feature sem critério de aceite não é feature, é intenção**, e intenção não vai para o ar. Se na hora de escrever o critério ele não sair objetivo, a feature volta para a matriz e desce de prioridade.

### O que a inspeção do ambiente mudou, antes de qualquer código

| Decisão anterior | Estado real, lido em 13/08/2026 | Decisão nova |
|---|---|---|
| Organização Supabase separada para a pesquisa (linha 110 da matriz) | Existe **uma** organização (`QT Pizza Bar`) e o teto de 2 projetos ativos do plano gratuito **já está atingido** (`NFe e Financeiro` e `qt-avaliacoes` ativos, `Fichas Sensoriais` INACTIVE) | **Inaplicável.** Vira schema dedicado dentro de projeto existente, em F55 |
| Custo de insumo teria de ser importado de planilha ou das skills | Já está em Postgres, no projeto `NFe e Financeiro`: `insumos_master` (131 linhas), `historico_precos` (344), `notas` (422), `itens_nota` (1.179). E `pratos` tem 1 linha, `prato_ingredientes` tem 0 | O diferencial de cruzar satisfação com CMV depende de **preencher** estrutura existente, não de construir nova. Segue Fase 2, mas o MVP tem de nascer podendo dar `JOIN` (F42 e F55) |
| QR Code seria canal novo a criar | `cliques_avaliacao` tem **74 linhas reais** (`id`, `garcom`, `criado_em`, `user_agent`, `referrer`), sem nota e sem comentário: é rastreador de clique por garçom. Ou seja, **já existem QR por garçom em circulação e a equipe já foi treinada a apresentá-los** | O hábito operacional, que é a parte difícil, já está de pé. Ver seção 4 |
| Integração com o CRM do app de reservas | O app de reservas **não está em nenhum dos três projetos** | Fica fora do MVP e qualquer afirmação sobre ela tem confiança **baixa** até o proprietário dizer onde ele vive |

### Como ler cada entrada

Cinquenta e nove entradas, na estrutura fixa pedida. `Lx` é a linha da matriz de 113 features. Duas entradas não vêm de linha numerada e estão marcadas como adição.

Nomes de campo aparecem em `crase`. **São nomes provisórios de trabalho, não schema definitivo**: o schema versionado é entrega da etapa seguinte, e trocar um nome depois custa uma migration. Fuso de tudo: `America/Sao_Paulo`.

Telas do quiosque conforme `06-questionario.md`, seção 14: `T0` garçom, `T1` nota, `T2A/T2B/T2C` ramificação, `T3C1/T3C2/T3C3` prato a prato, `T3C` fator, `T3/T4` rotacionadas, `T5` aberta, `T6` contato, `T7` agradecimento.

Rotinas agendadas do MVP, e são só cinco. **Onde cada uma roda, porque isso estava faltando:**

| Rotina | Quando | Plataforma |
|---|---|---|
| `watcher_drive` | a cada 30 min | **Cloudflare Workers**, com Cron Triggers |
| `cron_classificador` | 07h | **Cloudflare Workers**, com Cron Triggers |
| `cron_digest_16h` | 16h | **Cloudflare Workers**, com Cron Triggers |
| `cron_retencao` | mensal, dia 1 | **Cloudflare Workers**, com Cron Triggers |
| `backup_semanal` | domingo | **GitHub Actions** |

São duas plataformas, e não mais que duas, porque cada plataforma a mais é uma conta a mais que pode expirar em silêncio num sistema sem mantenedor. O `backup_semanal` fica no GitHub Actions e não no Cloudflare porque precisa de `pg_dump` e de armazenamento de artefato, que é onde o runner do GitHub já está.

---

## 2. As features de MVP, uma por uma

### Bloco A. Coleta

#### F01. PWA de quiosque no tablet levado à mesa (L1)

- **Por que existe.** É o canal que gera volume, e o próprio incumbente publica que o tablet responde por cerca de 90% das avaliações porque permite resposta anônima ([risposta.app](https://www.risposta.app/risposta-qr-code/)), o que atende diretamente o critério de coletar mais que hoje.
- **Onde vive.** O app inteiro (`T0` a `T7`), instalado como PWA no tablet Android próprio, com fixação de tela do sistema operacional.
- **Dado que precisa.** `dispositivo_id`, `versao_app`, `versao_questionario`, `idioma_sessao`.
- **Critério de aceite.**
  - [ ] Instala pelo navegador, sem APK, sem sideload e **sem desativar o Play Protect** (é o atrito que o app do incumbente exige hoje).
  - [ ] Menor alvo de toque de qualquer tela: **44 x 44 px** ([WCAG 2.2, 2.5.5 Target Size Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)). Os 11 botões de nota: **60 a 80 px de lado**, em duas fileiras de 6 e 5.
  - [ ] Nenhuma tela tem rolagem em nenhum ponto do fluxo, no tablet de produção.
  - [ ] Transição entre telas abaixo de **2 segundos**.
  - [ ] Timeout de inatividade em **45 segundos**, com contagem visível nos **15 finais**, e a nota já dada é gravada mesmo se o resto for descartado.
  - [ ] `T7` faz auto-reset em **8 segundos** e não exibe nada da resposta enviada.
  - [ ] Texto secundário nunca em `#A0A5A5` sobre fundo claro: esse par dá **2,1:1** e reprova até no 3:1 de texto grande. Preto `#1A1E1E` sobre `#EFECEC` dá **14,3:1** e é a combinação padrão.
  - [ ] Fixação de tela ativa: o cliente não sai do app nem alcança outra aba.
- **Como falha.** Tablet atualiza, perde a fixação, ou o navegador limpa dados. O sistema trata isso em F03 (fila) e F08 (heartbeat): a fila sobrevive à queda de rede e o heartbeat avisa quando o aparelho some por 24h. Se o tablet morrer de vez, o QR de F02 é o canal que continua funcionando na mesma noite.

#### F02. QR Code na conta e na mesa como canal paralelo permanente (L2)

- **Por que existe.** Tem que estar impresso e funcionando na sexta em que o tablet morre, e o hábito de apresentar QR já existe na casa (74 linhas em `cliques_avaliacao`).
- **Onde vive.** Impresso na conta e em porta-guardanapo, apontando para a mesma URL do questionário com `?g=<pin_garcom>&m=<mesa>` pré-preenchidos.
- **Dado que precisa.** `canal` (`tablet` ou `qr`), `garcom_pin`, `mesa`, `origem_url`.
- **Critério de aceite.**
  - [ ] Uma resposta vinda de QR grava exatamente os mesmos campos de uma vinda do tablet, com `canal = 'qr'`, e aparece no painel sem tratamento especial.
  - [ ] O QR abre a `T1` em menos de **3 segundos** em rede móvel 4G, sem app, sem login e sem cadastro.
  - [ ] Existe **um QR por garçom ativo** e o link carrega o PIN dele, para não pedir digitação ao cliente.
  - [ ] O QR **não** aponta para o Google nem para qualquer plataforma de avaliação pública, e a tela final não convida a nada (F51 explica o motivo).
  - [ ] Impresso e em circulação antes do desligamento do fornecedor atual, não depois.
- **Como falha.** Reimpressão esquecida quando um garçom sai e outro entra, e o QR passa a atribuir a resposta a quem não atendeu. Mitigação: PIN de garçom removido marca a resposta como `garcom_nao_reconhecido` (F50) em vez de atribuir errado, e o painel de administração mostra quais QR estão impressos para PIN inativo.

#### F03. Fila local no navegador, com UUID no cliente e idempotência no servidor (L4)

- **Por que existe.** Resposta perdida com o cliente vendo tela de erro contamina exatamente a experiência que se está medindo, e o incumbente sincroniza por pull manual disparado pela equipe.
- **Onde vive.** Service worker do PWA mais `IndexedDB` (`fila_respostas`), com espelho append-only em `localStorage`.
- **Dado que precisa.** `resposta_uuid` (v4 gerado no cliente), `criado_em_cliente`, `status` (`pendente` ou `enviado`), `tentativas_envio`.
- **Critério de aceite.**
  - [ ] Com o Wi-Fi desligado, três respostas completas são aceitas e o cliente vê a tela de agradecimento normal, sem nenhuma mensagem de erro.
  - [ ] Religando a rede, as três chegam ao banco em menos de **2 minutos**, sem ação humana.
  - [ ] Reenvio do mesmo `resposta_uuid` **não** cria segunda linha: o servidor responde sucesso e o total do dia não muda. Testado enviando o mesmo payload 5 vezes.
  - [ ] `navigator.storage.persist()` é chamado na instalação.
  - [ ] Contador **"X respostas aguardando envio"** visível na tela do garçom (`T0`), sempre, mesmo quando é zero.
  - [ ] A fila é de mão única: o tablet só escreve. Nenhuma sincronização bidirecional, nenhuma resolução de conflito.
- **Como falha.** Alguém limpa os dados do navegador com fila pendente, e a resposta morre. É o único caso sem conserto, e por isso existe o espelho em `localStorage` e o contador visível. Despejo por pressão de disco apaga o origin inteiro de uma vez, nunca meia fila, o que simplifica o tratamento.

#### F04. Antifraude: uma resposta por mesa por janela, PIN e teto diário (L5)

- **Por que existe.** O próprio fornecedor atual publica que o risco do QR sozinho é a manipulação da amostra pela equipe, e o briefing pede nota por garçom, o que cria o incentivo. Sem trava, o painel é decoração.
- **Onde vive.** Validação no servidor, na gravação da resposta, mais um bloco no painel de qualidade da coleta.
- **Dado que precisa.** `mesa`, `garcom_pin`, `dia_operacional`, `criado_em`, `dispositivo_id`, `duracao_ms`.
- **Critério de aceite.**
  - [ ] Segunda resposta da **mesma mesa, mesmo dia operacional, dentro de 20 minutos** é gravada com `suspeita = true` e **não entra** em nenhum indicador do painel nem do e-mail. Vinte minutos é decisão de projeto, não número de fonte: a mesa é juntada e existem comandas individuais, então bloquear de todo seria perder resposta legítima.
  - [ ] Toda resposta carrega PIN. Resposta sem PIN é rejeitada na `T0`, que não deixa passar com campo vazio.
  - [ ] Se o total de respostas de um dispositivo num dia operacional passar de **30**, o e-mail das 16h traz uma linha de aviso com o número. Trinta é o teto de projeto para uma casa de até 20 mesas por dia.
  - [ ] O painel mostra, por garçom e por dia operacional, **respostas coletadas contra mesas atendidas informadas**, que é o relatório que expõe tanto quem não pede quanto quem pede demais.
  - [ ] Nenhuma trava depende de comanda do PDV: o R3 provavelmente não traz comanda (DESCONHECIDO, confiança média) e nada aqui pode esperar por isso.
- **Como falha.** Garçom responde por si mesmo com o tablet na mão, dentro de todas as travas. Nenhuma trava barata pega isso. O que o sistema faz: expõe a razão respostas por mesas atendidas por garçom, que é anômala quando alguém fabrica volume, e o projeto **não** amarra bônus a nota (a matriz corta isso na linha 97, e o próprio guia do fornecedor atual prevê punição administrativa de 2%, o que prova que o problema é real).

#### F05. Tentativas e conversão sobre mesas atendidas (L6)

- **Por que existe.** Coletar mais que hoje é critério de sucesso, e sem denominador não existe taxa. Também diz se o problema é a operação ou a coleta.
- **Onde vive.** Botão de "não quis responder" na `T0`, mais um campo diário de mesas atendidas no painel, mais bloco 1 do e-mail das 16h.
- **Dado que precisa.** `tentativa` (`garcom_pin`, `mesa`, `dia_operacional`, `desfecho`), `mesas_atendidas_dia` (`dia_operacional`, `mesas`).
- **Critério de aceite.**
  - [ ] O garçom registra recusa em **um toque** na `T0`, sem sair da tela.
  - [ ] O painel mostra conversão do dia como fração explícita, no formato **`respostas / mesas atendidas`** com os dois números visíveis, nunca só o percentual.
  - [ ] Referência escrita ao lado: cerca de **520 mesas por mês** (até 20 por dia, 26 dias), e a meta de **150 respostas por mês** equivale a cerca de **29%**.
  - [ ] Se `mesas_atendidas_dia` não foi informado, o painel escreve **"denominador ausente"** e não mostra percentual nenhum.
  - [ ] O corte por garçom mostra o `n` ao lado, sempre.
- **Como falha.** Ninguém preenche mesas atendidas. Então o sistema degrada para contagem absoluta de respostas e escreve que a taxa não pode ser calculada, em vez de inventar denominador. Melhoria de custo zero prevista para a Fase 2: puxar o número de mesas do R3 se ele trouxer, o que é DESCONHECIDO hoje.
- **Dono nomeado da tarefa.** O gerente de turno, no fechamento do caixa, em um campo único no painel. Se o campo ficar **3 dias** sem preenchimento, o e-mail das 16h cobra em linha própria. A confirmação de quem executa é a pergunta 4 da seção 5 de [`05-critica.md`](05-critica.md).

#### F06. Coleta anônima com contato só na última tela (L7)

- **Por que existe.** O anonimato, não o hardware, é o motor do volume, e é a razão declarada dos cerca de 90% do tablet no fornecedor atual.
- **Onde vive.** Todas as telas do quiosque, com contato exclusivamente em `T6`.
- **Dado que precisa.** `resposta` sem nenhuma chave para `contato` quando `T6` é pulada.
- **Critério de aceite.**
  - [ ] Nenhum campo de identificação aparece antes da `T6`. Verificação: percorrer o fluxo inteiro e não achar nome, e-mail, telefone ou login.
  - [ ] Rodapé literal na `T1`: `Sua resposta é anônima. O garçom não vê o que você responde.` E ela é verdadeira, garantido por F26.
  - [ ] Depois de enviar, o tablet **não** mostra a resposta, nem resumo, nem a nota dada.
  - [ ] Reset completo de estado entre clientes: nenhuma tela carrega vestígio da resposta anterior.
  - [ ] Uma resposta é gravada como **completa** com a nota e nada mais.
- **Como falha.** Mesa com comanda única e uma pessoa só é identificável de fato, mesmo sem campo de nome. O sistema não promete o que não entrega: o aviso de privacidade (F44) registra que em mesa individual a resposta pode ser associável ao atendimento, em vez de prometer anonimato absoluto.

#### F07. Instrumentação de tempo por tela (L8)

- **Por que existe.** Transforma o teto de 45 segundos do briefing em número medido em vez de promessa, e os 6 a 9 segundos por tela são estimativa com confiança baixa.
- **Onde vive.** Duas marcas de tempo por tela, gravadas com a resposta, e um bloco semanal no painel de qualidade da coleta.
- **Dado que precisa.** `tela_evento` (`resposta_uuid`, `tela`, `entrou_em`, `saiu_em`, `pulou`).
- **Critério de aceite.**
  - [ ] Toda resposta tem carimbo de entrada e de saída de **cada** tela exibida.
  - [ ] O painel mostra **mediana e p90** da duração total, por semana, separando **caminho sem digitação** de caminho com digitação (quem escreve na aberta ou deixa contato estoura os 45 s por escolha própria, e isso não é falha).
  - [ ] Regra de corte escrita no painel e executada: se o **p90 do caminho sem digitação passar de 45 segundos**, uma tela sai. Se o p90 do caminho de detrator com causa comida passar de 45 s, a tela que sai é a `T3C3`.
  - [ ] Os quatro caminhos aparecem com duração medida ao lado da estimativa (promotor 35 s, neutro 28 s, detrator sem comida 28 s, detrator com comida 39 s).
- **Como falha.** Carimbo perdido em resposta que veio da fila offline com relógio do tablet errado. Mitigação: duração calculada por diferença entre carimbos do **mesmo** dispositivo, nunca contra a hora do servidor, e resposta com duração negativa ou acima de 15 minutos entra como `duracao_invalida` e sai do cálculo de p90, com a contagem de descartes visível.

#### F08. Heartbeat do tablet (L9)

- **Por que existe.** É o único alarme que funciona quando ninguém monitora, e substitui a Central de Sincronização do fornecedor atual, que só existe porque a sincronização dele é manual.
- **Onde vive.** Chamada leve do PWA a cada abertura e a cada hora, mais verificação dentro de `cron_digest_16h`.
- **Dado que precisa.** `heartbeat_dispositivo` (`dispositivo_id`, `ultimo_contato_em`, `fila_pendente`, `versao_app`).
- **Critério de aceite.**
  - [ ] Tablet sem contato por mais de **24 horas** gera uma linha em destaque no e-mail das 16h, nomeando o aparelho e a hora do último contato.
  - [ ] Fila pendente maior que **5 respostas** por mais de **2 horas** gera a mesma linha.
  - [ ] Teste de aceite: desligar o tablet por um dia e confirmar que o aviso chega no e-mail do dia seguinte.
  - [ ] Nenhuma tela nova é construída para isso: o heartbeat vive no e-mail que já existe.
- **Como falha.** O tablet está ligado mas o e-mail não sai, e aí o alarme cala junto com o sistema. É por isso que a única regra de operação escrita no README é: **se o e-mail não chegar dois dias seguidos, algo quebrou.**

### Bloco B. Questionário

#### F09. NPS de 0 a 10 na primeira tela, um toque (L13)

- **Por que existe.** Escala principal fixada no briefing, e é a única do levantamento que permite comparar a casa com qualquer coisa fora dela.
- **Onde vive.** `T1`, a única tela obrigatória.
- **Dado que precisa.** `nota` (0 a 10), `faixa` (`detrator` 0 a 6, `neutro` 7 e 8, `promotor` 9 e 10), `idioma_sessao`.
- **Critério de aceite.**
  - [ ] Texto exato em português: **`De 0 a 10, o quanto você recomendaria o QT para um amigo ou familiar?`** Âncoras `0 · não recomendaria` e `10 · recomendaria com certeza`.
  - [ ] Onze alvos, duas fileiras de 6 e 5, **60 a 80 px de lado**, sem rolagem, e o toque avança sozinho sem botão de confirmar.
  - [ ] Sem opção de pular, e é a **única** tela sem pular no questionário inteiro.
  - [ ] A escala é 0 a 10, nunca 1 a 10 e nunca 1 a 5 com nome de NPS.
  - [ ] Cálculo gravado como fórmula explícita e reconferível: percentual de promotores menos percentual de detratores.
- **Como falha.** A conversão medida fica abaixo de 10% das mesas atendidas por três meses. Aí, e só aí, testar 5 alvos e converter faixa, o que perde comparabilidade externa e é a última carta, não a primeira (matriz, linha 22, Fase 2 condicional).

#### F10. Ramificação condicional pela nota (L14)

- **Por que existe.** Custa um `if` e economiza segundos de todo mundo que estava satisfeito, e evita perguntar as nove dimensões a quem deu 10.
- **Onde vive.** Saída da `T1` para `T2A`, `T2B` ou `T2C`.
- **Dado que precisa.** `faixa`, `caminho_percorrido`.
- **Critério de aceite.**
  - [ ] Nota 9 ou 10 vai para `T2A` (`Que bom. O que mais te agradou hoje?`), seleção de até 2 opções.
  - [ ] Nota 7 ou 8 vai para `T2B` (`O que faltou para ser 10?`), as mesmas 8 opções.
  - [ ] Nota 0 a 6 vai para `T2C` (`Desculpe. Onde a gente errou?`), uma opção, e `A comida` abre o caminho de prato (F13).
  - [ ] **Ninguém recebe a ramificação de nota baixa e o bloco rotacionado.** Regra estrutural, e é o que mantém os quatro caminhos dentro do teto de tempo.
  - [ ] Promotor recebe 2 rotacionadas, neutro recebe 1, detrator recebe 0.
- **Como falha.** Cliente toca em nota errada e quer voltar. Botão de voltar uma tela sempre disponível, porque toque errado em alvo de 60 px acontece e sem voltar a pessoa abandona.

#### F11. Banco de perguntas rotacionadas, com peso e foco do mês (L15)

- **Por que existe.** Entrega cobertura de 20 dimensões pelo preço de conclusão de uma pesquisa de 3 telas, e é o que faz a pesquisa se renovar sem ninguém reescrever nada.
- **Onde vive.** `T3` e `T4` no quiosque, mais uma tela de administração do banco no painel.
- **Dado que precisa.** `pergunta_banco` (`id`, `texto_pt`, `texto_en`, `opcoes`, `dimensao`, `peso`, `ativa`, `em_foco`, `sai_quando`), `resposta_pergunta_sorteada` (`resposta_uuid`, `pergunta_id`, `respondida`).
- **Critério de aceite.**
  - [ ] As sete regras de sorteio implementadas em código, não em planilha: no máximo 2 por resposta; nunca duas da mesma dimensão; suprimir a dimensão já coberta pela ramificação de nota baixa; sorteio por peso com as perguntas em foco somando **50%** das impressões; gravar qual foi **sorteada** e qual foi **respondida**; não repetir a mesma pergunta na mesma mesa na mesma noite; **pergunta que o sistema pode responder sozinho sai do banco**.
  - [ ] Arranque com **12 perguntas ativas, não 20**, incluindo as de peso alto 1, 2, 3, 4, 11, 15 e 17 do banco da seção 14.5 do questionário.
  - [ ] De **2 a 4 perguntas em foco** por mês, editáveis pelo proprietário em uma tela, sem deploy.
  - [ ] Nenhuma pergunta do banco usa teclado, e nenhuma pede nota de 1 a 5.
  - [ ] Nenhuma pergunta do banco cita garçom por nome.
  - [ ] O painel mostra, por pergunta, **sorteadas e respondidas** no mês e no trimestre. Com `n` abaixo de **20**, mostra o `n` e **não** mostra proporção.
- **Como falha.** Banco que só cresce, com 20 perguntas em rotação uniforme e 3,6 impressões por pergunta por mês, o que não sustenta nada. O sistema previne isso de duas formas: o peso de foco concentra metade das impressões, e a coluna `sai_quando` marca as sete perguntas temporárias por desenho (1, 4, 9, 10, 16, 19 e 20), que morrem quando a integração correspondente entrar.

#### F12. Uma pergunta aberta, opcional, no fim, ancorada na nota (L16)

- **Por que existe.** Contagem prioriza, mas é a citação literal que convence a equipe a mudar o turno.
- **Onde vive.** `T5`.
- **Dado que precisa.** `resposta_texto` (`resposta_uuid`, `texto_cru`, `idioma`).
- **Critério de aceite.**
  - [ ] Texto muda com a faixa: 9 ou 10 recebe `O que a gente fez bem hoje?`, 7 ou 8 recebe `O que a gente pode melhorar?`, 0 a 6 recebe `Conta rápido o que aconteceu?`.
  - [ ] Nunca a formulação `Algum comentário?`.
  - [ ] Uma só aberta em todo o questionário, sempre a última pergunta de conteúdo, sempre opcional.
  - [ ] Caixa com altura de duas linhas que cresce, e botão `Pular` do mesmo tamanho do de enviar.
  - [ ] Pular custa **um toque** e cerca de 3 segundos.
- **Como falha.** Cerca de 18% de não resposta em aberta é o esperado (fonte secundária, confiança média), e o volume real fica em poucas dezenas de comentários por mês, muitos deles "tudo ótimo". Por isso o diagnóstico não pode depender do texto: a estrutura carrega o diagnóstico e o texto carrega a citação.

#### F13. Prato a prato só quando a nota é baixa (L17)

- **Por que existe.** É o plano B degradado que entrega quase todo o valor sem depender de nenhuma pendência do PDV, e é o que viabiliza a nota por prato pedida no briefing.
- **Onde vive.** `T3C1` (grupo), `T3C2` (item) e `T3C3` (fator), só quando `T2C` = `A comida`.
- **Dado que precisa.** `resposta_item` (`resposta_uuid`, `grupo`, `item_id`, `item_nome`, `fator`).
- **Critério de aceite.**
  - [ ] `T3C1` com 4 alvos (`Pizza`, `Entrada`, `Sobremesa`, `Mais de um item`).
  - [ ] `T3C2` com **6 a 7 alvos por tela, sem rolagem**, mais `Prefiro não dizer`.
  - [ ] `T3C3` com os seis fatores fixos: `Sabor`, `Chegou frio`, `Ponto da massa`, `Apresentação`, `Ingrediente sem frescor`, `Veio errado ou faltou item`.
  - [ ] A lista de itens vem de `item_cardapio` (F42), não de texto solto no código.
  - [ ] O caminho completo de detrator com causa comida cabe em **5 telas de conteúdo**, e é o caminho mais apertado do questionário (39 s estimados, 6 s de margem).
- **Como falha.** Cardápio muda e a lista fica velha, oferecendo prato que saiu. Mitigação: `item_cardapio` tem `ativo`, e a tela lista só os ativos. Se ninguém atualizar, a tela oferece pratos fora do cardápio, o que é visível no painel como reclamação de item inativo e entra como linha de aviso no e-mail.

#### F14. Português e inglês (L20)

- **Por que existe.** Está no escopo travado do briefing, e o texto em inglês de todas as telas já está escrito na seção 14.3 do questionário.
- **Onde vive.** Botão `EN` fixo no alto à direita de **todas** as telas do quiosque.
- **Dado que precisa.** `idioma_sessao`, e duas colunas de texto em `pergunta_banco` e em `item_cardapio`.
- **Critério de aceite.**
  - [ ] Alvo do botão `EN` de no mínimo **44 px**, presente em 100% das telas.
  - [ ] Trocar de idioma **não** reinicia a resposta nem apaga a nota já dada.
  - [ ] **Não existe** tela de escolha de idioma: ela custaria 2 a 3 segundos de todo mundo para servir a poucos.
  - [ ] Nenhuma string de tela fica no código: todas em uma tabela ou arquivo de tradução versionado, com as duas colunas obrigatórias.
  - [ ] Critério de revisão, decisão de projeto: se depois de **3 meses** menos de **2%** das respostas tiverem `idioma_sessao = 'en'`, o inglês congela como está e não recebe mais manutenção.
- **Como falha.** Pergunta nova entra só em português. Regra de aceite: o formulário de cadastro de pergunta **não salva** sem os dois textos.

### Bloco C. O relógio da casa

#### F15. Dia operacional com corte às 6h (brecha 1 da matriz, adição sem linha numerada)

- **Por que existe.** É a correção do defeito mais grave do fornecedor atual, documentado por ele mesmo, e é a mudança mais barata de todo o projeto.
- **Onde vive.** Uma função no banco e uma coluna gerada, usadas em **toda** consulta, todo gráfico e todo e-mail.
- **Dado que precisa.** `dia_operacional` (date), derivado de `criado_em` menos 6 horas, fuso `America/Sao_Paulo`.
- **Critério de aceite.**
  - [ ] Resposta gravada às **00h40 de quarta** aparece como **terça**, no painel e no e-mail, sem exceção.
  - [ ] Existe **um** lugar no código que define o corte, e o valor 6h é configuração, não literal espalhado.
  - [ ] Nenhuma consulta do painel usa `date(criado_em)`. Verificação: busca por `criado_em::date` no repositório retorna zero ocorrência fora da função de dia operacional.
  - [ ] Segunda-feira, dia de fechamento, aparece sem respostas, e não recebe respostas da madrugada de domingo para segunda.
  - [ ] O e-mail das 16h de hoje cobre o **dia operacional de ontem**, fechado, nunca um dia parcial.
- **Como falha.** Alguém escreve uma consulta nova com data civil e o número divergir do resto do painel. Prevenção: a coluna existe no banco, então a consulta errada é mais difícil de escrever que a certa. Detecção: o e-mail traz o total do dia e o painel traz o mesmo total, e divergência entre os dois é o sintoma a procurar.

### Bloco D. Painel de leitura

#### F16. Painel com gráficos, igualmente usável em celular e computador (L23)

- **Por que existe.** É pedido explícito do briefing, e um painel novo é mais simples que o do fornecedor atual, que carrega cinco bibliotecas de gráfico na mesma página sobre AngularJS 1.x sem suporte desde 2021.
- **Onde vive.** `/painel` (hoje), `/painel/tendencia`, `/painel/garcons`, `/painel/pratos`, `/painel/coleta`, `/painel/clientes`, `/painel/saude`.
- **Dado que precisa.** Views de leitura sobre `resposta`, `resposta_opcao`, `resposta_item`, `venda_produto_dia`.
- **Critério de aceite.**
  - [ ] Abre e mostra o número do dia em menos de **3 segundos** em 4G, no celular.
  - [ ] Nenhuma tela exige rolagem horizontal em tela de **360 px** de largura.
  - [ ] A tela `hoje` cabe em **uma** dobra de celular: respostas, conversão, detratores, promotores.
  - [ ] Todo número tem `n` ao lado. Sem exceção, e é regra de projeto, não estilo.
  - [ ] Nenhum indicador composto proprietário. O painel escreve a fórmula de tudo que calcula, e qualquer número pode ser reconferido com uma consulta.
- **Como falha.** Painel vira coleção de gráficos que ninguém abre, porque o e-mail das 16h já resolve o dia a dia. Isso é aceitável e previsto: o painel existe para investigar, o e-mail existe para decidir. O que não é aceitável é o painel divergir do e-mail, e a checagem está em F15.

#### F17. NPS com faixa de 95% e n visível (L24)

- **Por que existe.** Com 50 respostas no mês, uma variação de 10 pontos de NPS não significa nada, e sem a faixa a seta é ruído com aparência de informação. O fornecedor atual publica zonas de NPS sem amostra e sem metodologia.
- **Onde vive.** `/painel/tendencia`, e o relatório mensal (Fase 2) herda a mesma regra.
- **Dado que precisa.** `n`, contagem de promotores, neutros e detratores por janela.
- **Critério de aceite.**
  - [ ] Todo NPS aparece com o `n` e a faixa de 95%, calculada como **1,96 vezes o erro padrão**, com o erro padrão em `raiz((p_promotores + p_detratores - NPS²) / n)`. Conferência: n=50 dá erro padrão de 10,5 e faixa de ±20,5 pontos.
  - [ ] A tabela de referência está impressa na tela: **n=50 dá ±20,5 pontos; n=100 dá ±14,5; n=200 dá ±10,3**. E a diferença mínima entre dois períodos para não ser ruído: **±29, ±20,5 e ±14,5 pontos** respectivamente.
  - [ ] Corte com `n` abaixo do mínimo aparece literalmente como **`amostra insuficiente, n=7`**, e não como número.
  - [ ] Está escrito no painel que **não existe benchmark de NPS de pizzaria verificável no Brasil nem no mundo**, e que a Retently removeu restaurantes do benchmark de 2026 por falta de base recorrente.
  - [ ] Nenhuma comparação com número de outro setor, e nenhuma conversão entre CSAT 0 a 100 e NPS -100 a +100.
- **Como falha.** Alguém olha só a seta e ignora a faixa. Mitigação de desenho: a faixa é desenhada como faixa, não como nota de rodapé, e a seta de tendência **não aparece** quando a diferença é menor que a mínima detectável para aquele `n`.

#### F18. Distribuição da nota em vez de média (L25)

- **Por que existe.** Em 20 mesas por dia, a média esconde exatamente os dois clientes que vão reclamar em público.
- **Onde vive.** `/painel` e bloco 1 do e-mail.
- **Dado que precisa.** Contagem por faixa e por `dia_operacional`.
- **Critério de aceite.**
  - [ ] A tela mostra **quantos 0 a 6, quantos 7 e 8, quantos 9 e 10**, em contagem absoluta.
  - [ ] **Nenhuma tela do MVP mostra nota média geral** como indicador principal.
  - [ ] O e-mail traz contagem de detratores e de promotores, nunca média nem percentual isolado.
- **Como falha.** Pedido de "só uma média para o grupo do WhatsApp". A resposta do sistema é a distribuição, e a razão está escrita no painel em uma linha.

#### F19. Nota por área e por fator, em contagem absoluta (L26)

- **Por que existe.** Categoria vaga não gera ação. "Ponto da massa: 6 menções" gera. Substitui a nota por categoria e subcategoria do fornecedor atual, que é indicador essencial.
- **Onde vive.** `/painel` e blocos 3, 4 e 5 do e-mail.
- **Dado que precisa.** `resposta_opcao` (`dimensao`, `fator`), taxonomia fixa das nove dimensões (comida, bebida, tempo, atendimento, precisão do pedido, ambiente, limpeza, preço e valor, item consumido).
- **Critério de aceite.**
  - [ ] O corte primário é **fator**, não dimensão. `Atendimento: 4,1` não existe no MVP; `recepção 3, conhecimento do cardápio 5, despedida 1` existe.
  - [ ] Tempo aparece decomposto em **quatro** momentos (mesa, bebida, pizza, conta), porque a ação é diferente em cada um.
  - [ ] Bebida tem linha própria e nunca é embutida em comida.
  - [ ] Limpeza tem **banheiro em linha separada**.
  - [ ] A taxonomia é a mesma na estrutura e na saída do classificador (F34), e é estável entre meses. Categoria nova só entra por decisão humana e por migration.
- **Como falha.** Taxonomia inflando ao longo do tempo, e a contagem do mês deixando de ser comparável com a do mês anterior. Prevenção: o classificador não pode criar categoria, e o formulário de pergunta nova obriga escolher uma dimensão existente.

#### F20. Desempenho por garçom, com n obrigatório e janela trimestral (L27)

- **Por que existe.** É indicador pedido no briefing, e o fornecedor atual já entrega ranking por código de garçom. A diferença é que aqui ele não vira ranking mensal, porque com esse volume uma célula de 2 respostas demite gente por ruído.
- **Onde vive.** `/painel/garcons`.
- **Dado que precisa.** `garcom_id`, `garcom_pin`, `dia_operacional`, `nota`, `tentativa`.
- **Critério de aceite.**
  - [ ] Janela padrão da tela: **trimestre**. Mensal existe só como contagem absoluta, nunca como ranking.
  - [ ] Garçom com `n` abaixo de **20** no trimestre aparece com `amostra insuficiente, n=x` no lugar da nota.
  - [ ] A tela mostra, junto da nota, **conversão do garçom** (respostas sobre mesas atendidas), que é a métrica de processo e está sob controle dele.
  - [ ] Está escrito na tela que a leitura é para conversa de desenvolvimento, e que **meta de nota amarrada a bônus não é usada neste sistema**, com o motivo em uma linha.
  - [ ] Extras entram e saem sem apagar histórico: garçom removido fica com `removido_em` e as respostas antigas continuam atribuídas.
- **Como falha.** Alguém exporta o CSV e monta o ranking mensal por fora. O sistema não pode impedir isso, e o que ele faz é entregar o `n` em toda linha exportada, para o ranking sair com a amostra ao lado.

#### F21. Corte por dia da semana (L28)

- **Por que existe.** Sábado contra sábado é o corte que informa numa casa que abre só à noite. Segmentação por período do dia é bucket vazio aqui, e o fornecedor atual gasta três buckets nisso. O briefing pede desempenho por garçom **e turno**. O que se recusa aqui é o turno no sentido do fornecedor atual (Manhã, Tarde, Noite), que numa casa só de jantar produz dois buckets vazios. O turno que a casa tem de verdade é **primeira e segunda leva de mesas**, e ele entra como corte opcional a partir de `dia_operacional` mais faixa horária (até 20h30, depois de 20h30), sem tela nova, quando houver `n` de 20 por faixa no trimestre. Enquanto não houver, a tela escreve `amostra insuficiente, n=x`. Essa é a única definição de turno do sistema, e ela é a mesma em F39 e F41.
- **Onde vive.** `/painel/tendencia`.
- **Dado que precisa.** `dia_operacional` e o dia da semana derivado dele.
- **Critério de aceite.**
  - [ ] Comparação padrão: **este sábado contra a média dos últimos 4 sábados**, com os dois `n`.
  - [ ] Segunda-feira não aparece na grade, porque a casa fecha.
  - [ ] **Nenhum** corte por Manhã, Tarde ou Noite existe no sistema.
  - [ ] O corte por turno, quando existir, é **faixa horária sobre `dia_operacional`** (até 20h30, depois de 20h30), é opcional, não tem tela nova e só mostra proporção com `n` de **20 por faixa no trimestre**. Abaixo disso escreve `amostra insuficiente, n=x`. Esta definição é a mesma em F39 e F41, e nenhuma outra definição de turno existe no repositório.
  - [ ] O dia da semana vem do dia operacional (F15), não da data civil.
- **Como falha.** Quatro sábados com 8 respostas cada não sustentam comparação de proporção. Então a tela compara **contagem** e escreve o `n`, e a leitura em proporção só aparece na janela trimestral.

#### F22. Item comparado à média do cardápio (L29)

- **Por que existe.** Nota absoluta em restaurante não informa nada, porque quase todo mundo dá 8, 9 ou 10. Desvio contra a média informa tudo, e a mecânica é da Tattle, verbatim `See how a menu item performs against the menu average`.
- **Onde vive.** `/painel/pratos`.
- **Dado que precisa.** `resposta_item` agregado por `item_id`, mais a média de menções por item ativo.
- **Critério de aceite.**
  - [ ] A tela mostra, por item, **contagem de reclamações no trimestre** e a **média de reclamações por item do cardápio** no mesmo trimestre, lado a lado.
  - [ ] Item com menos de **3 eventos** de reclamação no trimestre **não** aparece sinalizado.
  - [ ] Está escrito na tela que o eixo é **evento de reclamação de quem deu nota baixa**, não nota média do prato, porque prato a prato só é perguntado em nota baixa.
  - [ ] A versão com denominador do PDV (reclamações por 100 unidades vendidas) **não** entra no MVP: ela é Fase 2 e depende do R3 já rodando. O MVP não insinua essa taxa em tela nenhuma.
  - [ ] **Nunca** tirar prato do cardápio com base em 3 ou 4 reclamações: a tela prioriza investigação e diz isso.
- **Como falha.** Cerca de 18 eventos de reclamação por mês espalhados por mais de 15 itens do cardápio, o que dá células minúsculas. É por isso que a janela é trimestral e o mínimo é 3 eventos, e é por isso que a matriz de engenharia de cardápio inteira é Fase 2.

#### F23. Taxa de pulo por tela (L30)

- **Por que existe.** É o melhor sinal de que uma tela está mal escrita, e sai de graça de F07.
- **Onde vive.** `/painel/coleta`.
- **Dado que precisa.** `tela_evento.pulou`, mais `resposta_pergunta_sorteada.respondida`.
- **Critério de aceite.**
  - [ ] Uma linha por tela, com **exibições e pulos**, no mês.
  - [ ] Pergunta do banco mostra **sorteada** e **respondida**, porque sem os dois a proporção fica errada.
  - [ ] Tela com pulo acima de **60%** aparece marcada como candidata a reescrita. Sessenta por cento é limiar de projeto, não número de fonte.
- **Como falha.** Nada. É leitura, não escrita. O risco é ninguém olhar, e a mitigação é a tela ser curta o suficiente para caber numa olhada mensal.

### Bloco E. Alerta e recuperação

#### F24. Alerta em tempo real ao gerente, com mesa, hora, nota e fator (L34)

- **Por que existe.** Aqui o cliente ainda está sentado, a janela é de minutos, e nenhuma das grandes plataformas consegue explorar isso porque dispara para quem já foi embora. É paridade de mercado obrigatória, não diferencial.
- **Onde vive.** Não vive em tela nenhuma do cliente. Dispara na gravação da resposta, para o celular do gerente de turno.
- **Dado que precisa.** `alerta` (`resposta_uuid`, `nota`, `mesa`, `fator`, `criado_em`, `enviado_em`, `canal`, `destinatario`).
- **Critério de aceite.**
  - [ ] Nota de **0 a 6** dispara em menos de **30 segundos** do toque, medido entre `criado_em` da resposta e `enviado_em` do alerta.
  - [ ] O gatilho é a **nota**, não o motivo: dispara mesmo se a pessoa pular todas as telas seguintes.
  - [ ] O aviso traz **mesa, hora, nota e fator** quando houver fator, e nada mais.
  - [ ] Canal do MVP: **e-mail** (Resend), porque WhatsApp é Fase 3. Consumo de 100 e-mails por dia é o limite gratuito, e o volume esperado de detratores é de poucos por noite.
  - [ ] **Como o gerente vê esse e-mail no meio do salão, que é o ponto que faltava escrever.** E-mail que chega numa caixa que ninguém abre durante o serviço não é alerta em tempo real, e sem isso a vantagem de "alerta com o cliente ainda na mesa" (D5 do grid) é teórica. O canal escolhido para o MVP é **e-mail com notificação por push e som no aparelho que o gerente de turno já usa em serviço**, em um endereço dedicado (por exemplo `alerta@`), com o aplicativo de e-mail configurado para notificar **só** esse endereço. Escolhido por três razões: custo zero, nenhuma peça móvel nova (é o mesmo Resend do e-mail das 16h) e nenhuma dependência de API de terceiro que expira. Aceite: com o aparelho bloqueado e na tela inicial, a nota 2 dada no tablet produz notificação visível e audível em menos de **30 segundos**, testado uma vez antes do go-live e registrado na definição de pronto.
  - [ ] Resposta que chegou pela fila offline com atraso maior que **20 minutos** dispara o alerta marcado como **atrasado**, com a hora real do toque, para o gerente não abordar uma mesa que já foi.
- **A alternativa, se a casa não aceitar aparelho com push ligado durante o serviço.** Aí o MVP não tem canal de tempo real: o alerta continua sendo gravado e continua saindo no bloco 2 do e-mail das 16h do dia seguinte, e a vantagem de abordar a mesa antes de o cliente ir embora **só se realiza na Fase 3, com WhatsApp**. As duas opções custam R$ 0 em software, e a diferença é operacional, então a escolha é do proprietário. A escolha padrão deste documento é a primeira, o e-mail com push, e o motivo é que ela entrega a janela de minutos sem construir nada e sem nenhuma peça móvel nova.
- **Como falha.** Alerta chega e ninguém age. Isso é humano, e o MVP não constrói ticket de recuperação (Fase 2, e desenhado para morrer sozinho em 48h). O que o MVP faz: o bloco 2 do e-mail das 16h lista **um incidente por linha, com "houve contato" e quanto tempo levou**, e incidente sem contato aparece em destaque.

#### F25. Regras de ronda que preservam o anonimato percebido (L35)

- **Por que existe.** Gerente na mesa 30 segundos depois de uma nota 4 ensina o cliente que a pesquisa não é anônima, e o anonimato é o que sustenta o volume. Nenhuma fonte lida trata dessa tensão.
- **Onde vive.** Não é código. É meia página no README e no treinamento da equipe, mais o texto do próprio alerta.
- **Dado que precisa.** Nenhum campo novo.
- **Critério de aceite.**
  - [ ] O texto das regras está escrito no repositório e termina no corpo do alerta, em uma linha: **o gerente nunca menciona a pesquisa nem a nota**.
  - [ ] O aviso de privacidade (F44) registra que em mesa com comanda individual a resposta pode ser associável, em vez de prometer anonimato que o desenho não entrega.
- **Regra escrita no README, fora da lista de aceite.** A ronda é hábito visível em mesas aleatórias, não só nas de nota baixa: se a única mesa visitada na noite foi a que deu nota baixa, a regra foi quebrada. Isso **não é critério de software**, é regra de operação, e a verificação é a leitura da regra na reunião de turno. Ficou fora do aceite porque exigiria um observador humano no salão, o que a regra de ouro deste documento não admite.
- **Como falha.** Gerente de turno novo não sabe da regra. Mitigação de custo zero: a regra viaja no corpo de todo alerta, então quem recebe o alerta lê a regra junto.

#### F26. Nenhum alerta no tablet (L36)

- **Por que existe.** Som, vibração ou aviso na tela entregam o cliente e derrubam a percepção de anonimato da mesa inteira.
- **Onde vive.** Decisão de desenho do PWA.
- **Dado que precisa.** Nenhum.
- **Critério de aceite.**
  - [ ] O tablet **não** emite som em nenhum momento do fluxo.
  - [ ] O tablet **não** vibra.
  - [ ] Nenhuma tela do tablet muda de aparência em função da nota dada.
  - [ ] Nenhuma notificação do sistema operacional aparece com o app em primeiro plano.
  - [ ] Teste de aceite: dar nota 2 com o tablet na mão e confirmar que o aparelho se comporta exatamente como com nota 10.
- **Como falha.** Uma biblioteca de terceiro toca um som padrão. Verificação no aceite, e o item entra na definição de pronto.

#### F27. Alerta de queda de tendência, na versão em contagem (L38)

- **Por que existe.** Vigiar queda antes de virar crise está no escopo de auditoria por IA do briefing, e o fornecedor atual já entrega isso. A diferença é que aqui a versão que entra é a que funciona com este volume.
- **Onde vive.** `cron_digest_16h`, como bloco do e-mail.
- **Dado que precisa.** Contagem de detratores por semana operacional, por dia da semana.
- **Critério de aceite.**
  - [ ] O alerta é em **contagem de detratores por semana**, não em pontos de NPS mensal.
  - [ ] Dispara quando a contagem da semana corrente passa da anterior em **3 ou mais** detratores, com os dois números escritos. Três é limiar de projeto, escolhido para ser legível em `n` pequeno.
  - [ ] Nenhum alerta de tendência é emitido em pontos de NPS no MVP: a versão com faixa é Fase 2.
  - [ ] O e-mail mostra a série das últimas **4 semanas**, em contagem.
- **Como falha.** Falso positivo por semana curta (feriado, casa fechada). Mitigação: a comparação usa **semanas operacionais com o mesmo número de dias abertos**, e semana incompleta aparece marcada como tal, sem disparar.

### Bloco F. Relatório diário

#### F28. Relatório diário por e-mail às 16h, com diagnóstico escrito (L40)

- **Por que existe.** É o maior retorno absoluto do projeto e a resposta direta às duas dores declaradas (relatório raso e dados em ilha). Acumula três funções: entregável, keep-alive do banco e alarme de falha.
- **Onde vive.** `cron_digest_16h`, todo dia às **16h**, cobrindo o dia operacional anterior.
- **Dado que precisa.** Tudo do dia anterior, mais `classificacao_texto`, mais `venda_produto_dia`, mais `execucao_rotina`.
- **Critério de aceite.**
  - [ ] Sai às **16h**, antes da abertura da noite, todo dia, inclusive segunda. Em dia que o calendário de operação marca como fechado, o conteúdo é **`casa fechada`**, nunca "nada a relatar" e nunca "nenhuma resposta coletada", pela regra de F32.
  - [ ] Oito blocos, na ordem da seção 10.2 do questionário: quatro números de ontem; incidentes de ontem; fator da semana; cozinha; salão; pergunta em foco; cruzamento com faturamento; nada a relatar.
  - [ ] **Toda linha termina numa frase que um gerente pode executar no próximo turno.** Linha que não termina assim sai do template.
  - [ ] Bloco 1 traz respostas, conversão sobre mesas atendidas, contagem de detratores e contagem de promotores. **Sem média e sem percentual isolado.**
  - [ ] Bloco 6 mostra a proporção da pergunta em foco só quando `n` for **20 ou mais**. Abaixo disso, mostra o `n` e não mostra proporção.
  - [ ] Legível no celular, em texto, sem depender de imagem carregar.
  - [ ] Consumo: **5 de 100 e-mails por dia** do plano gratuito do Resend, com 3.000 por mês de teto. Folga de 20 vezes.
- **Como falha.** Duas falhas distintas e cada uma tem tratamento. Se o banco responde e o e-mail não sai, `execucao_rotina` grava o erro e a próxima execução tenta de novo. Se o e-mail sai mas o dado está vazio, o texto diz "nenhuma resposta no dia" em vez de mostrar zeros sem explicação. Se o e-mail não chegar **dois dias seguidos**, a regra escrita no README é assumir que algo quebrou, porque este é o único alarme do sistema.

#### F29. Destinatários editáveis, com corte por área (L41)

- **Por que existe.** Cozinha, salão e proprietário recebem cortes diferentes, e isso é decisão do briefing. O fornecedor atual já entrega lista editável pelo cliente.
- **Onde vive.** `/painel/admin`, aba de destinatários.
- **Dado que precisa.** `destinatario` (`email`, `papel`, `ativo`), com `papel` em (`proprietario`, `gerencia`, `cozinha`, `salao`).
- **Critério de aceite.**
  - [ ] Adicionar ou remover destinatário sem deploy, em uma tela, em menos de **1 minuto**.
  - [ ] `cozinha` recebe apenas blocos 4 e 8. `salao` recebe apenas blocos 5 e 8. `gerencia` recebe 1 a 6 e 8. `proprietario` recebe todos os 8.
  - [ ] Teste de aceite: cadastrar quatro endereços, um por papel, e conferir que cada um recebeu só o que devia.
  - [ ] Nenhum endereço recebe dois e-mails no mesmo dia.
- **Como falha.** Endereço errado, ou saída de funcionário sem remoção. Mitigação: `execucao_rotina` grava a lista de destinatários de cada envio, então dá para responder "quem recebeu o quê" meses depois, o que também é exigência de LGPD.

#### F30. Comentários filtrados por área, com crítica pessoal grave só para o proprietário (L42)

- **Por que existe.** Decisão do briefing, e é um campo booleano na saída do classificador, não uma triagem humana diária.
- **Onde vive.** Blocos 4 e 5 do e-mail, mais uma linha separada só para o proprietário.
- **Dado que precisa.** `classificacao_texto` com `dimensao`, `polaridade`, `severidade`, `nomeia_pessoa`.
- **Critério de aceite.**
  - [ ] Comentário com `nomeia_pessoa = true` **nunca** aparece nos blocos de cozinha e de salão.
  - [ ] Comentário com `severidade = alta` vai por linha separada, só para o proprietário.
  - [ ] Cada citação literal aparece com o **fator** ao lado, e a contagem do fator aparece junto.
  - [ ] Teste de aceite: injetar um comentário que nomeia um garçom e confirmar que ele só chegou ao proprietário.
- **Como falha.** O classificador erra e marca como grave o que não é, ou pior, deixa passar. O primeiro erro só produz um e-mail a mais para o proprietário. O segundo é real, e por isso a degradação de F36 é conservadora: **sem classificação, o comentário não entra nos blocos por área**, entra na lista do proprietário, que é o destino mais restrito.

#### F31. Cada linha comparada contra o período anterior (L43)

- **Por que existe.** Nota isolada não gera decisão. "Sábado abaixo dos últimos quatro sábados" gera, e essa é a definição de sucesso número 3.
- **Onde vive.** Todos os blocos numéricos do e-mail, e `/painel`.
- **Dado que precisa.** Mesma consulta em duas janelas, mais `n` das duas.
- **Critério de aceite.**
  - [ ] Todo número do e-mail vem com o comparável ao lado: o mesmo dia da semana nas últimas 4 ocorrências, ou os 7 dias anteriores no caso do fator da semana.
  - [ ] Os dois `n` aparecem sempre.
  - [ ] Quando a diferença é menor que a mínima detectável para aquele `n` (F17), o e-mail escreve **"sem diferença legível"** em vez de mostrar seta.
- **Como falha.** Nos primeiros 30 dias não existe comparável. O e-mail escreve "primeira ocorrência, sem base de comparação" em vez de comparar com zero.

#### F32. "Nada a relatar" quando o dia foi normal (L44)

- **Por que existe.** É o que impede o e-mail diário de virar ruído ignorado no terceiro mês, e ninguém no mercado faz.
- **Onde vive.** `cron_digest_16h`.
- **Dado que precisa.** As mesmas contagens, mais os limiares.
- **Critério de aceite.**
  - [ ] Dia sem detrator, sem alerta de heartbeat, sem falha de importação e sem fator acima do comparável sai como **`Nada a relatar`** mais os quatro números do bloco 1, e nada mais.
  - [ ] O e-mail de "nada a relatar" tem no máximo **10 linhas**.
  - [ ] Um dia com zero respostas **não** é "nada a relatar": é "nenhuma resposta coletada", e isso é um problema de coleta que precisa aparecer.
  - [ ] O **calendário de operação é dado do sistema**. Dia operacional em que a casa não abriu sai como **`casa fechada`** e não entra na contagem de dias sem resposta nem dispara alerta. Só dia de operação com zero respostas vira `nenhuma resposta coletada`. É o que resolve a contradição com F28, porque a casa fecha toda segunda.
- **Como falha.** Limiar mal calibrado, e o e-mail dizendo "nada a relatar" numa noite ruim. Verificação prevista no aceite: rodar o gerador sobre os dados da ponte e conferir que **todo dia com pelo menos 1 detrator, 1 falha de importação ou 1 alerta de heartbeat saiu fora de "nada a relatar"**. É contagem, não julgamento.

#### F33. Log de execução no próprio banco (L45)

- **Por que existe.** O Resend guarda 30 dias e o log do Supabase no plano gratuito guarda 1 dia. Este é o log que sobra quando o do fornecedor expira.
- **Onde vive.** Tabela `execucao_rotina`, exposta em `/painel/saude`.
- **Dado que precisa.** `execucao_rotina` (`id`, `rotina`, `iniciado_em`, `terminado_em`, `status`, `respostas_no_periodo`, `email_enviado`, `destinatarios`, `erro`).
- **Critério de aceite.**
  - [ ] As cinco rotinas gravam uma linha por execução, com sucesso ou com erro.
  - [ ] `/painel/saude` mostra as últimas **30 execuções** de cada rotina, com hora e status.
  - [ ] O envio do e-mail é gravado como passo **separado** da consulta ao banco, porque é isso que permite saber se o problema foi dado ou entrega. É também o que garante o keep-alive de F54 mesmo quando o e-mail falha.
  - [ ] Erro grava a mensagem, truncada, nunca só um booleano.
- **Como falha.** A rotina não roda de jeito nenhum, e aí não há linha nenhuma para gravar. É exatamente por isso que a ausência de e-mail por dois dias é o alarme externo, e não o log.

### Bloco G. IA na coleira

#### F34. Classificação de comentário por área e polaridade, frase por frase (L72)

- **Por que existe.** "Pizza excelente mas demorou 40 minutos" tem que gerar um positivo em produto e um negativo em tempo, não uma média inútil. Substitui a análise de sentimento do fornecedor atual, que é essencial e hoje roda por OpenAI.
- **Onde vive.** `cron_classificador`, 07h, em lote sobre os comentários do dia operacional anterior.
- **Dado que precisa.** Entrada: `texto_cru`, `nota`, `faixa`. Saída: `classificacao_texto` (`resposta_uuid`, `frase`, `dimensao`, `fator`, `polaridade`, `severidade`, `nomeia_pessoa`, `modelo`, `versao_prompt`, `classificado_em`).
- **Critério de aceite.**
  - [ ] Saída em **JSON validado por schema**. JSON inválido é descartado e a resposta fica sem classificação, nunca com classificação parcial inventada.
  - [ ] A taxonomia de saída é **exatamente** a mesma da estrutura (F19). O modelo **não pode** criar dimensão nem fator novos: valor fora da lista é rejeitado.
  - [ ] Uma frase pode gerar dois registros com polaridades opostas em dimensões diferentes.
  - [ ] **Nenhuma nota de sentimento de 0 a 100.** É indicador de vaidade disfarçado de precisão.
  - [ ] Volume e custo: **150 respostas por mês, das quais cerca de 40% deixam comentário, ou seja cerca de 2 chamadas por dia**, com teto de **10** em noite cheia. Menos de **0,1%** da cota diária gratuita do Groq. Sem cartão de crédito envolvido. Este é o único número de volume de LLM do projeto, e ele vale igual em [`03-superar.md`](03-superar.md).
  - [ ] `versao_prompt` gravada em toda linha, para a contagem de um mês ser comparável com a de outro.
- **Como falha.** Cota estourada, política do fornecedor mudada, ou API fora do ar. Tratamento em F36: o texto cru já está salvo, o digest sai com os comentários sem categoria e com aviso, e a classificação é retentada no dia seguinte sobre a fila do que ficou pendente.

#### F35. Diagnóstico escrito no relatório diário (L73)

- **Por que existe.** É a diferença entre relatório e decisão, que é a definição de sucesso número 3. No fornecedor atual o diagnóstico de IA é mensal, não diário.
- **Onde vive.** Um parágrafo no topo do e-mail das 16h, depois do bloco 1.
- **Dado que precisa.** Números já calculados do dia e da semana, `classificacao_texto` agregada, e **nada de texto livre não processado**.
- **Critério de aceite.**
  - [ ] No máximo **5 linhas**, e sempre com um número dentro.
  - [ ] O diagnóstico recebe apenas **agregados e citações já classificadas**, nunca a base inteira, e nunca faz o cálculo: os números são calculados em SQL e passados prontos. A IA redige, ela não conta.
  - [ ] Se o diagnóstico contiver um número que não está em nenhum bloco do e-mail, é bug e o aceite reprova.
  - [ ] Sem diagnóstico disponível, o e-mail sai **completo** com os oito blocos e a linha `diagnóstico indisponível hoje`.
- **Como falha.** A IA escreve algo plausível e errado. A trava é estrutural: ela não tem acesso a dado bruto e não faz aritmética, então o pior caso é uma frase mal escrita sobre números corretos, e não um número inventado.

#### F36. Texto cru sempre guardado, e degradação sem IA (L75)

- **Por que existe.** Se o free tier mudar de política, você perde a análise, nunca o dado.
- **Onde vive.** Gravação da resposta (`resposta_texto`) e tratamento de erro do `cron_classificador`.
- **Dado que precisa.** `texto_cru` gravado **antes** de qualquer chamada de IA.
- **Critério de aceite.**
  - [ ] O texto é gravado na mesma transação da resposta, e a classificação é sempre posterior e opcional.
  - [ ] Com a IA desligada por um dia, o e-mail sai com os comentários **sem categoria** e com aviso explícito, nunca sem os comentários.
  - [ ] Comentário não classificado fica em fila e é reprocessado na próxima execução, e a fila é visível em `/painel/saude`.
  - [ ] Teste de aceite: apagar a chave da API e rodar o digest. Ele tem que sair.
- **Como falha.** Não falha em nada que importe. Este item existe justamente para ser o piso de todos os outros do bloco.

#### F37. Módulo único de LLM, com prompt, chamada e parser num só lugar (L76)

- **Por que existe.** Com cerca de 2 chamadas por dia e teto de 10 (F34), trocar de fornecedor tem que custar uma linha de configuração, e só custa isso se o acoplamento estiver num módulo só.
- **Onde vive.** Um arquivo, uma função de entrada, uma de saída.
- **Dado que precisa.** `modelo`, `versao_prompt`, `provedor`, em configuração, nunca espalhados.
- **Critério de aceite.**
  - [ ] Busca por `groq` no repositório retorna ocorrência em **um** arquivo, mais a variável de ambiente.
  - [ ] Trocar de provedor é editar uma configuração e um adaptador, sem tocar em painel, e-mail ou schema.
  - [ ] O módulo tem um modo `dry-run` que devolve resposta fixa, para o digest ser testado sem gastar cota.
  - [ ] Escolha do provedor registrada com o motivo: **Groq por contrato de privacidade**, não por limite. Os termos do tier gratuito do Gemini pedem literalmente para não enviar informação pessoal.
- **Como falha.** Alguém chama a IA de outro lugar por pressa. Detecção: a busca do primeiro critério entra na definição de pronto e pode ser reconferida em 10 segundos.

#### F38. Nunca enviar identificador direto ao LLM (L106)

- **Por que existe.** Assim, trocar de fornecedor amanhã não vira incidente de dado pessoal. O fornecedor atual manda para a OpenAI e o que vai não é público.
- **Onde vive.** Dentro do módulo de F37, na função de montagem do payload.
- **Dado que precisa.** `resposta_uuid` interno no lugar de nome, WhatsApp e e-mail.
- **Critério de aceite.**
  - [ ] O payload enviado contém **só** texto do comentário, notas e ids internos. Nome, telefone, e-mail e número de mesa **não** vão.
  - [ ] Existe um teste automatizado que reprova se o payload casar com padrão de telefone brasileiro ou de e-mail.
  - [ ] O log do módulo grava o payload enviado, truncado, para auditoria de 30 dias.
  - [ ] A regra é do projeto, não do provedor: vale igual se o provedor mudar.
- **Como falha.** O cliente escreve o próprio telefone dentro do comentário aberto. O teste do segundo critério detecta o padrão e o payload segue com o trecho mascarado, e o texto original continua intacto no banco.

### Bloco H. Dado do PDV

#### F39. Import do R3 por pasta sincronizada, com watcher na nuvem (L80)

- **Por que existe.** É um dos quatro obrigatórios da primeira versão e é o único caminho que não depende de nada da Altec nem do PC do caixa (que desliga no fim do dia). O caminho depende de alguém exportar o R3 com regularidade. Se esse hábito já existe hoje nas análises de CMV é **NÃO VERIFICADO**, e é a pergunta 5 da seção 5 de [`05-critica.md`](05-critica.md). Se não existir, o hábito precisa ser criado antes da posição 32 do backlog, e o botão de importar planilha (F40) passa de rede de segurança a caminho principal.
- **Onde vive.** `watcher_drive`, a cada 30 minutos, sobre uma pasta do Google Drive.
- **Dado que precisa.** `venda_produto_dia` (`dia_operacional`, `produto_id_pdv`, `produto_nome_norm`, `grupo`, `unidades`, `valor_liquido`, `arquivo_origem`, `importado_em`) e `import_execucao` (`arquivo`, `hash`, `linhas`, `status`, `erro`).
- **Critério de aceite.**
  - [ ] Aceita **Excel e CSV**, porque o R3 sai em planilha e a existência de CSV é DESCONHECIDA.
  - [ ] Casamento por **ID do produto** quando existir, e por **nome normalizado sem acento e em maiúsculas** como reserva, porque o R3 traz nomes como `RUCOLA` e `FANTASTICA`.
  - [ ] **Idempotência por data:** importar o mesmo arquivo duas vezes não duplica linha nenhuma, e o faturamento do dia não muda. Testado com 5 reimportações.
  - [ ] O arquivo bruto é salvo **antes** de ser interpretado, e fica guardado.
  - [ ] Falha de leitura grava `status = erro` com a mensagem e **não** apaga o dado do dia anterior.
  - [ ] Nenhuma promessa de comanda, mesa ou horário em tela nenhuma: a chave de junção é o **dia operacional**, e nada além dele. Se um dia a junção descer para turno, o turno é o de F21 (faixa horária, até 20h30 e depois de 20h30) e nenhum outro, e isso depende de o R3 trazer horário, o que é DESCONHECIDO.
- **Como falha.** Ninguém exporta, ou o layout da planilha muda sem aviso. Primeiro caso: o e-mail das 16h traz a linha "sem faturamento importado para ontem" e o bloco 7 não aparece. Segundo caso: `import_execucao` grava erro de parser e a mesma linha aparece no e-mail. Em nenhum dos dois o painel mostra número velho como se fosse novo.
- **Dono nomeado.** O proprietário, na mesma rotina em que já exporta o R3 para a análise de CMV. Ausência de arquivo novo por **2 dias operacionais** vira linha de cobrança no e-mail das 16h, e não silêncio. A confirmação de quem executa é a pergunta 4 da seção 5 de [`05-critica.md`](05-critica.md).
- **Como o watcher autentica no Drive.** A credencial do Drive é o único segredo externo de longa duração do MVP. Ela é uma **conta de serviço** com acesso somente leitura a **uma** pasta, nunca OAuth de usuário com refresh token, justamente para não repetir a fragilidade que fez o corte 3 de [`04-cortar-e-backlog.md`](04-cortar-e-backlog.md) recusar a API do Google Business Profile. Dono da credencial: o proprietário, com a chave guardada fora do repositório. Falha de autenticação grava `status = erro` em `import_execucao` e vira linha no e-mail das 16h no mesmo dia.

#### F40. Botão de importar planilha no painel (L81)

- **Por que existe.** Rede de segurança permanente: se o Drive falhar, se o layout mudar, se o agendamento morrer, o dono arrasta a planilha no celular e o número aparece.
- **Onde vive.** `/painel/importar`.
- **Dado que precisa.** O mesmo parser e as mesmas tabelas de F39.
- **Critério de aceite.**
  - [ ] Funciona **no celular**, com o arquivo vindo do compartilhamento do Drive ou do e-mail.
  - [ ] Usa exatamente o mesmo parser do watcher: zero código duplicado.
  - [ ] Mostra, antes de gravar, quantas linhas e quais datas foram reconhecidas, e pede confirmação.
  - [ ] Reimportar dia já importado **substitui** o dia por inteiro, e o painel registra quem importou e quando.
- **Como falha.** Arquivo errado (outro relatório, outro mês). A prévia do terceiro critério é a defesa: nada grava sem confirmação com as datas na tela.

#### F41. Cruzamento satisfação x faturamento em nível de dia (L82)

- **Por que existe.** É a dor declarada de o sistema atual ficar numa ilha, e é o terceiro item obrigatório do MVP.
- **Onde vive.** Bloco 7 do e-mail das 16h e `/painel/tendencia`.
- **Dado que precisa.** `resposta` agregada por `dia_operacional` e `venda_produto_dia` agregada por `dia_operacional`.
- **Critério de aceite.**
  - [ ] A junção é por **dia operacional**, e a tela escreve isso. Não existe junção por turno no MVP, e a única definição de turno aceita no sistema é a de F21 (faixa horária sobre `dia_operacional`, até 20h30 e depois de 20h30), nunca Manhã, Tarde e Noite.
  - [ ] Bloco 7 traz faturamento de ontem, ticket médio e os **dois pratos mais vendidos**, com a contagem de reclamações do trimestre ao lado.
  - [ ] **Nenhum gráfico insinua causalidade** entre nota e faturamento: com até 20 mesas por dia, essa correlação é ruído, e uma linha de texto na tela diz isso.
  - [ ] Dia sem importação aparece como lacuna explícita, nunca como zero.
  - [ ] A tela não promete, em nenhum canto, cruzamento por comanda ou por mesa.
- **Como falha.** Alguém lê "noite de nota baixa com faturamento alto" como causa. Mitigação de desenho: os dois números aparecem em tabela, com o `n` da pesquisa ao lado, e não em gráfico de dispersão com linha de tendência.

#### F42. Catálogo de itens do cardápio com chave de junção (adição desta etapa, sem linha na matriz)

- **Por que existe.** Sai direto da inspeção do Supabase: o custo já está em Postgres e as tabelas de ficha técnica (`pratos`, `prato_ingredientes`) existem e estão vazias, então a chave que liga a resposta da pesquisa ao produto do PDV e ao prato da ficha técnica é a única peça que falta, e ela é barata agora e caríssima depois.
- **Onde vive.** `/painel/admin`, aba de cardápio. Alimenta a `T3C2` do quiosque.
- **Dado que precisa.** `item_cardapio` (`id`, `nome_pt`, `nome_en`, `grupo`, `ativo`, `produto_id_pdv`, `produto_nome_norm`, `prato_id`).
- **Critério de aceite.**
  - [ ] Toda pizza, entrada e sobremesa do cardápio atual cadastrada, com `grupo` e `ativo`.
  - [ ] `produto_nome_norm` preenchido no formato do R3 (maiúsculas, sem acento), e conferido contra um R3 real: **100% dos itens do cardápio ativo casam** com alguma linha do relatório.
  - [ ] `prato_id` aceita nulo, e fica nulo enquanto `pratos` não estiver preenchida. O MVP **não** depende dele.
  - [ ] A `T3C2` lista só itens `ativo = true`, em 6 a 7 alvos por tela.
  - [ ] O MVP **não** calcula CMV e **não** escreve nada em `pratos`, `prato_ingredientes`, `insumos_master` ou `historico_precos`. Só leitura, e só na Fase 2.
- **Como falha.** Cardápio muda e ninguém atualiza o catálogo. Detecção automática de custo zero: o import do R3 lista produtos vendidos que **não** existem em `item_cardapio`, e essa lista entra como linha no e-mail das 16h. Assim o cardápio se cobra sozinho.

### Bloco I. Base de clientes e LGPD

#### F43. Base de clientes com consentimento registrado (L50)

- **Por que existe.** É um dos quatro obrigatórios da primeira versão, e é o que substitui a base de clientes do fornecedor atual (nome, e-mail, telefone, nascimento, CEP).
- **Onde vive.** `T6` do quiosque como entrada, `/painel/clientes` como leitura.
- **Dado que precisa.** `cliente` (`id`, `nome`, `email`, `whatsapp`, `nascimento`, `criado_em`, `ultima_visita_em`, `origem`) e `consentimento` (`cliente_id`, `resposta_uuid`, `finalidade`, `aceito_em`, `versao_texto`).
- **Critério de aceite.**
  - [ ] A base nasce com os campos de consentimento, não recebe depois. Sem `consentimento` gravado, não existe linha em `cliente`.
  - [ ] Contato duplicado (mesmo WhatsApp ou mesmo e-mail) atualiza `ultima_visita_em` em vez de criar segunda linha.
  - [ ] Nenhuma campanha, nenhum disparo e nenhum aniversário no MVP: tudo isso é Fase 2. O MVP só constrói a base.
  - [ ] `/painel/clientes` exporta CSV (F52) e mostra a contagem de contatos por mês, que é a variável que decide se o módulo de recompra existe algum dia.
  - [ ] Medição obrigatória desde o dia 1: **taxa de contato opcional** (contatos deixados sobre respostas), porque esse número é DESCONHECIDO e não existe benchmark.
- **Como falha.** A taxa de contato fica em 10% ou menos, e a base rende cerca de 72 pessoas em 6 meses, o que não sustenta nem coorte de retorno. Nesse caso a Fase 2 de CRM não abre, e a decisão fica registrada com o número medido em vez de com opinião.

#### F44. Aviso de privacidade na tela do quiosque (L98)

- **Por que existe.** LGPD feita certo desde o início é decisão do briefing, e três linhas na tela cumprem mais que uma política de 15 páginas que ninguém lê.
- **Onde vive.** Rodapé da `T1` e da `T6`, com link para a página completa em `/privacidade`.
- **Dado que precisa.** `consentimento_texto` (`versao`, `texto`, `vigente_de`).
- **Critério de aceite.**
  - [ ] O rodapé nomeia: controlador (razão social e CNPJ), finalidade, quais dados, **categorias de compartilhamento** (hospedagem, banco de dados, provedor de e-mail, serviço de IA), prazo de retenção e canal de direitos.
  - [ ] Cabe em **3 linhas** na tela, com link para o texto completo.
  - [ ] O texto registra que em mesa com comanda individual a resposta pode ser associável ao atendimento (F25).
  - [ ] Os números de artigo da LGPD citados na página completa são conferidos contra o texto da lei **antes de publicar**: a apuração não conseguiu ler o texto integral da Lei 13.709 (Planalto devolveu HTTP 503) e os artigos 7, 11 e 16 estão apoiados em guias da ANPD.
  - [ ] A versão vigente do texto fica gravada, e nenhuma resposta é aceita sem uma versão vigente.
- **Como falha.** Texto alterado sem nova versão, e aí o consentimento antigo passa a apontar para texto que mudou. Prevenção: `consentimento_texto` é append-only, e editar cria versão nova.

#### F45. Duas caixas de consentimento separadas, com data, hora e versão (L99)

- **Por que existe.** Sem o registro da versão aceita não se prova o consentimento, e é isso que se pede numa fiscalização.
- **Onde vive.** `T6`, e só ali.
- **Dado que precisa.** `consentimento` com `finalidade` em (`pesquisa`, `contato`), `aceito_em`, `versao_texto`.
- **Critério de aceite.**
  - [ ] Duas caixas separadas: uma para responder à pesquisa, outra para receber contato. **Nenhuma pré-marcada.**
  - [ ] Uso do contato para **promoção** exige consentimento próprio e destacado, e não reaproveita o "aceito" da pesquisa. No MVP, promoção não existe, então essa caixa não existe: ela entra junto com a primeira campanha, na Fase 2.
  - [ ] Cada consentimento grava data, hora e **versão do texto**.
  - [ ] Teste de aceite: dar consentimento, mudar o texto, dar outro consentimento, e conferir que as duas linhas apontam para versões diferentes.
- **Como falha.** Cliente marca contato e não preenche campo nenhum. Então não existe titular a registrar, e nenhuma linha é criada em `cliente`, só a resposta anônima.

#### F46. Nome e contato estritamente opcionais (L100)

- **Por que existe.** Princípio da necessidade, e é o ponto mais violado por sistema de pesquisa de restaurante.
- **Onde vive.** `T6`, e a ausência dele em todas as outras telas.
- **Dado que precisa.** Nenhuma coluna obrigatória em `contato`.
- **Critério de aceite.**
  - [ ] Uma resposta com **só a nota** é gravada, contada como completa e aparece em todos os indicadores.
  - [ ] O botão `Pular` da `T6` tem **o mesmo tamanho** do botão de enviar.
  - [ ] Nenhum campo de contato em nenhuma tela anterior à `T6`.
  - [ ] Rodapé honesto na `T6`: `Sua nota já foi registrada. Se você deixar contato, ele fica ligado a esta resposta.` Nunca prometer que segue anônima depois de pedir o WhatsApp.
- **Como falha.** Não falha tecnicamente. O risco é alguém pedir depois que o contato seja obrigatório para "melhorar o CRM", e a resposta está escrita aqui: isso derruba o volume, que é o critério de sucesso número 2.

#### F47. Link de exclusão e revogação, por canal gratuito (L101)

- **Por que existe.** Direito do titular, e um link mais um endereço publicado resolvem sem formulário jurídico.
- **Onde vive.** Rodapé de `/privacidade` e do e-mail, mais uma tela simples de pedido.
- **Dado que precisa.** `exclusao_pedido` (`id`, `contato_informado`, `pedido_em`, `atendido_em`, `resultado`).
- **Critério de aceite.**
  - [ ] Link visível em `/privacidade` e no rodapé de todo e-mail enviado ao cliente (no MVP não há e-mail ao cliente, então basta a página).
  - [ ] Pedido gravado com data, e prazo de atendimento escrito na página. Como agente de pequeno porte, o prazo é **em dobro** (Res. CD/ANPD nº 2/2022, art. 14) e a declaração simplificada pode ser fornecida em **até 15 dias** (art. 15).
  - [ ] Atender o pedido apaga nome, e-mail, WhatsApp e nascimento, e **mantém** a resposta anônima e os agregados.
  - [ ] O pedido atendido fica registrado com `atendido_em`, porque é a prova de que foi cumprido.
- **Como falha.** Ninguém vê o pedido. Mitigação: pedido aberto há mais de **7 dias** entra como linha no e-mail das 16h, para o proprietário.

#### F48. Retenção implementada em job, contada da última visita (L102)

- **Por que existe.** Prazo em intenção não conta. E contar da coleta apagaria justamente o cliente que volta uma vez por ano, que é quem a campanha de retorno deveria alcançar.
- **Onde vive.** `cron_retencao`, mensal, dia 1.
- **Dado que precisa.** `cliente.ultima_visita_em`, e o prazo em configuração.
- **Critério de aceite.**
  - [ ] O prazo é **decisão explícita do proprietário, 12 ou 24 meses**, escrito em `/privacidade` e igual ao valor da configuração. Decisão por omissão reprova o aceite.
  - [ ] A contagem é da **última visita**, e é renovada a cada nova visita.
  - [ ] O job apaga nome, e-mail, WhatsApp e nascimento, e **preserva** a resposta, a nota e os agregados históricos.
  - [ ] O job grava em `execucao_rotina` quantas linhas foram anonimizadas, e o número aparece em `/painel/saude`.
  - [ ] Teste de aceite: criar um cliente com `ultima_visita_em` antiga, rodar o job, e conferir que os campos pessoais sumiram e a resposta continua.
- **Como falha.** Job apagando o que não devia. Por isso ele nunca faz `DELETE` na resposta, só `UPDATE` de campos pessoais para nulo, e o dump semanal (F53) é a rede embaixo.

### Bloco J. Administração

#### F49. PIN por garçom, com cadastro, edição e remoção (L90)

- **Por que existe.** A equipe de salão varia toda semana com extras, e o PIN é o que atribui o atendimento. É a funcionalidade essencial 45 do fornecedor atual.
- **Onde vive.** `/painel/admin`, aba de equipe.
- **Dado que precisa.** `garcom` (`id`, `nome`, `pin`, `ativo`, `criado_em`, `removido_em`).
- **Critério de aceite.**
  - [ ] Cadastrar garçom novo leva menos de **1 minuto** e não exige deploy.
  - [ ] Remover garçom preenche `removido_em` e **não** apaga respostas antigas nem reatribui nada.
  - [ ] PIN reutilizado por pessoa diferente é bloqueado enquanto o anterior tiver resposta no trimestre corrente.
  - [ ] A lista mostra, por garçom, respostas e conversão do mês, para o cadastro ser útil e não burocrático.
- **Como falha.** Extra atende sem PIN cadastrado e usa o PIN de outro. O sistema não pega isso, e o que ele faz é registrar o que foi digitado (F50) e expor a razão respostas por mesas atendidas, onde o volume anômalo aparece.

#### F50. PIN tratado como dado da resposta, não como autenticação (L91)

- **Por que existe.** Com fila offline o PIN não pode ser validado no momento, e guardar hash de credencial num tablet que circula pelo salão é pior que não validar.
- **Onde vive.** `T0` e a validação na sincronização.
- **Dado que precisa.** `resposta.garcom_pin_digitado` (texto), `resposta.garcom_id` (resolvido no servidor), `resposta.garcom_reconhecido` (booleano).
- **Critério de aceite.**
  - [ ] Nenhum hash de PIN, nenhuma lista de PIN e nenhuma credencial de equipe ficam no tablet. Verificação: inspecionar o armazenamento do PWA e não achar nada disso.
  - [ ] PIN que não casa na sincronização grava `garcom_reconhecido = false` e a resposta **entra** nos indicadores gerais, mas **não** no corte por garçom.
  - [ ] O painel mostra a contagem de respostas com PIN não reconhecido por dia, e ela aparece no e-mail quando passa de **3** no dia.
  - [ ] O PIN não protege nada: ele atribui atendimento. Está escrito no README para ninguém tratar como segurança.
- **Como falha.** Digitação errada de um dígito, e a resposta cai em outro garçom existente. Não há como distinguir isso de uso legítimo, e é o motivo pelo qual o corte por garçom é trimestral e para conversa de desenvolvimento, nunca para punição.

### Bloco K. Avaliações públicas

#### F51. Link para Google e iFood no painel, sem trazer conteúdo (L64)

- **Por que existe.** É a decisão do briefing, e ela dispensa a parte mais caríssima de reconstruir: o módulo de reputação do fornecedor atual usa OAuth do Google Business Profile com guarda e refresh de token, e credencial iFood Merchant, e ele mantém tela de diagnóstico de erro por loja, o que sugere que falha de credencial é frequente.
- **Onde vive.** Dois links em `/painel`.
- **Dado que precisa.** Nenhum. Duas URLs em configuração.
- **Critério de aceite.**
  - [ ] Dois links, um para o perfil do Google e um para o Portal do Parceiro do iFood, abrindo em aba nova.
  - [ ] **Nenhuma** avaliação pública é lida, guardada ou respondida pelo sistema no MVP.
  - [ ] **Nenhum** convite ao Google em nenhuma tela, e menos ainda condicionado à nota: a política de conteúdo do Google proíbe `selectively solicit positive reviews from customers` e proíbe pressionar avaliação no estabelecimento ([política oficial](https://support.google.com/contributionpolicy/answer/7400114)), e o perfil penalizado seria o do QT, não o do fornecedor.
  - [ ] Substituto humano escrito no README: ler o Portal do Parceiro do iFood **1 vez por semana**, e anotar a nota de 4 pizzarias comparáveis no Google **1 vez por trimestre**, em cerca de 20 minutos.
  - [ ] Ação de custo zero recomendada agora, fora do código: pedir o Basic API Access da Google Business Profile, que é formulário gratuito com prazo oficial de até 14 dias, para manter a Fase 2 aberta.
- **Como falha.** Não tem como falhar, é um link. O risco é de escopo: alguém querer trazer review para dentro. A matriz corta isso nas linhas 65 a 71, e o motivo está escrito.

### Bloco L. Sobrevivência do dado

#### F52. Botão de exportar CSV e Excel no painel (L107)

- **Por que existe.** Pedido explícito do briefing, e é a garantia de que o dado nunca fica preso no sistema novo, como está preso no atual (API de 4 dias por requisição e 50 registros por página).
- **Onde vive.** `/painel/exportar`, mais um botão em cada tela de listagem.
- **Dado que precisa.** Views de leitura, com `n` em toda linha agregada.
- **Critério de aceite.**
  - [ ] Exporta respostas, opções, itens, comentários, clientes e vendas, em **CSV** e em **Excel**.
  - [ ] Sem limite de janela de datas, e sem paginação obrigatória: um ano inteiro em um arquivo.
  - [ ] O CSV abre no Excel em português sem quebrar acento e sem quebrar separador.
  - [ ] Exportação de clientes exige login de administrador e fica registrada em `execucao_rotina`, porque é dado pessoal saindo do sistema.
  - [ ] Toda linha agregada exportada carrega o `n`.
- **Como falha.** Planilha de clientes indo para grupo de WhatsApp. O sistema não impede, e o registro do quarto critério é o que permite saber que aconteceu.

#### F53. Dump semanal do banco para fora do Supabase (L108)

- **Por que existe.** **O plano gratuito do Supabase não tem backup nenhum.** Sem esse dump, "anos de histórico" é promessa sem piso. Backup gerenciado existe só no Pro, a US$ 25/mês (oficial).
- **Onde vive.** `backup_semanal`, GitHub Actions, domingo.
- **Dado que precisa.** Todo o schema `experiencia`.
- **Critério de aceite.**
  - [ ] Roda **1 vez por semana** em regime permanente e guarda as últimas **8 semanas**.
  - [ ] O dump é **restaurado num banco vazio** ao menos uma vez, antes de declarar o MVP no ar. Backup não testado não é backup.
  - [ ] Falha de execução avisa por e-mail, e a ausência de dump por **2 semanas** aparece em `/painel/saude`.
  - [ ] Consumo de cerca de **1,5%** da cota gratuita do GitHub Actions.
  - [ ] O dump **não** contém chave de serviço nem segredo.
  - [ ] O dump é **cifrado com chave simétrica** antes de sair do runner, e a chave não vive no repositório.
  - [ ] O destino é **um bucket privado nomeado no README**, com retenção de **8 semanas** e acesso restrito aos dois administradores (F57). Qual bucket, e sob qual conta, é decisão do proprietário e é a segunda metade da pergunta 5 da seção 5 de [`05-critica.md`](05-critica.md): sem ela, o `backup_semanal` não pode entrar no ar, porque leva a base de clientes inteira (nome, e-mail, WhatsApp, nascimento) para fora do Supabase.
  - [ ] O dump conta como **compartilhamento de dado pessoal**: o destino entra nas categorias de compartilhamento do aviso de privacidade (F44) e no registro de operações (F59).
  - [ ] Enquanto o digest das 16h não existir, este workflow carrega o **keep-alive provisório** do banco (F54), com uma escrita própria em `execucao_rotina`, e roda **duas vezes por semana** (domingo e quarta) só nessa janela, porque a pausa do plano gratuito acontece com uma semana de inatividade e uma execução semanal não deixa margem. O dump guardado continua sendo o de domingo. Nenhuma rotina nova permanente é criada para isso.
- **Como falha.** Repositório privado com cota estourada, ou credencial expirada. Detecção pelo terceiro critério, e a mitigação é que o dump anterior continua válido: perder um domingo não perde dado, perder oito seguidos sim.

#### F54. Cron diário que toca o banco, keep-alive (L109)

- **Por que existe.** Projeto gratuito do Supabase é pausado após uma semana de inatividade, e projeto pausado é sistema morto sem ninguém para reanimar.
- **Onde vive.** Dentro de `cron_digest_16h`, sem rotina nova.
- **Dado que precisa.** Uma consulta de leitura e uma escrita em `execucao_rotina`.
- **Critério de aceite.**
  - [ ] O digest **consulta o banco e grava a execução** todos os dias, inclusive segunda e inclusive em dia sem resposta.
  - [ ] A consulta ao banco e o envio do e-mail são passos **separados**: falha de e-mail não impede o keep-alive.
  - [ ] `/painel/saude` mostra a data da última escrita bem-sucedida, e ela nunca passa de **2 dias**.
  - [ ] Nenhuma segunda rotina permanente existe só para isso. **Entre a criação do schema e a entrada do digest, o keep-alive é uma escrita do workflow de backup** (`backup_semanal`, F53), e não uma rotina nova. Depois que o digest das 16h entra, essa escrita é aposentada. É isso que fecha a divergência com a posição 25 do backlog, que chamava a entrega de `cron_keepalive`: não existe sexta rotina.
- **Como falha.** No arranjo provisório, o keep-alive semanal encosta no limite: a pausa acontece após uma semana de inatividade e a escrita é semanal, então um domingo perdido já é risco de pausa. Enquanto durar essa janela, o backup roda **duas vezes por semana** (domingo e quarta), o que é a mesma peça e nenhuma rotina nova. O outro modo de falha é o projeto ser pausado de qualquer forma (mudança de política, cota da organização). Sintoma: HTTP 402 em toda a API. Como a inspeção mostrou que a restrição de uso é aplicada a **todos** os projetos da organização, e o schema vai viver junto do fiscal (F55), este é o risco mais sério do arranjo e está registrado como tal.

#### F55. Schema dedicado dentro de projeto existente (L110, reescrita pela inspeção)

- **Por que existe.** A linha original da matriz pedia organização Supabase separada, e a inspeção provou que isso é inaplicável: existe **uma** organização e o teto de **2 projetos ativos** do plano gratuito já está atingido. Ao mesmo tempo, o custo de insumo já está em `NFe e Financeiro`, e é lá que o `JOIN` do diferencial nº 1 pode existir sem rotina de sincronização.
- **Onde vive.** Não é tela. É a primeira decisão de banco, e ela precede a primeira tabela.
- **Dado que precisa.** Schema `experiencia` dentro de `NFe e Financeiro` (`rzrjdbnxhpwzqgqrlfwa`, `sa-east-1`), com papel próprio.
- **Critério de aceite.**
  - [ ] Todas as tabelas do sistema nascem no schema `experiencia`, e **nenhuma** no `public`.
  - [ ] O papel da aplicação tem permissão de escrita **só** no schema `experiencia`, e no máximo `SELECT` nas tabelas de custo (`pratos`, `prato_ingredientes`, `insumos_master`, `historico_precos`). Verificação: tentar `INSERT` numa tabela fiscal com a credencial da aplicação tem que falhar.
  - [ ] `pg_dump` do projeto **antes** da primeira migration, guardado fora do Supabase.
  - [ ] Toda criação por **migration versionada** no repositório. Zero DDL ad hoc pelo painel do Supabase.
  - [ ] Região `sa-east-1`, que é onde o projeto já está, porque dado pessoal de cliente brasileiro em São Paulo tem menos latência e menos superfície de conformidade, e **região não se troca depois de criado**.
  - [ ] Decisão registrada por escrito pelo proprietário, porque conviver no mesmo projeto do sistema fiscal é escolha dele, não do implementador. Confiança da recomendação: **média**, e o caminho alternativo (viver em `qt-avaliacoes` mais rotina diária copiando custo) está descrito na inspeção com o custo de uma peça móvel a mais e a região errada.
- **Como falha.** Consulta mal escrita da pesquisa competindo com o sistema fiscal, ou restrição de uso da organização derrubando os dois de uma vez. Mitigações: RLS ligado (F58), papel sem escrita fora do schema, e o dump semanal de F53 valendo para o schema inteiro.

#### F56. Exportação e eliminação comprovada dos dados no fornecedor atual (L112)

- **Por que existe.** Na relação com o titular, quem responde é o restaurante. E depois do cancelamento a alavanca desaparece.
- **Onde vive.** Não é software. É um pedido por escrito, antes de desligar.
- **Dado que precisa.** Nada do sistema novo. Um e-mail e o arquivo de resposta.
- **Critério de aceite.**
  - [ ] Pedido enviado **por escrito** antes do cancelamento, pedindo exportação dos dados e confirmação de eliminação.
  - [ ] Resposta do fornecedor arquivada no repositório, em `docs/`.
  - [ ] Decisão explícita sobre migrar histórico: o critério do briefing é migrar **só se for fácil**, e com a API dele (janela de 4 dias por requisição, 50 registros por página, cerca de 92 requisições por ano de histórico, credencial pedida por e-mail a pessoa nomeada) **não é fácil**. Decisão recomendada: migrar os últimos meses ou nenhum, e assumir que a linha de base começa do zero.
  - [ ] Confirmar antes o estado do perfil do QT no Google, porque se o convite ao Google estiver hoje condicionado à nota, isso é review gating operando no perfil do restaurante.
- **Como falha.** Fornecedor não responde. Então fica registrado que o pedido foi feito, com data, o que é o que importa numa fiscalização. E o cancelamento não espera por isso.

### Bloco M. Três itens que não são feature, e por que continuam obrigatórios

Estes três estão marcados como MVP na matriz e **não se justificam por nenhum dos quatro critérios de sucesso** (a tabela da seção 3 mostra isso). Eles não são feature: são condição de partida. A proposta é **tirá-los da lista de features e mantê-los na definição de pronto**, o que é rebaixamento de prioridade sem perda de exigência.

#### F57. Dois administradores, com login e 2FA (L92)

- **Por que existe.** Proprietário e sócio, e nada além disso. Não precisa de hierarquia de papéis.
- **Onde vive.** Configuração de conta do Supabase, mais o login do painel.
- **Dado que precisa.** Dois usuários.
- **Critério de aceite.**
  - [ ] Exatamente **2** contas de administrador, com **2FA ligado nas duas**, verificado na tela de conta.
  - [ ] Nenhuma senha compartilhada e nenhuma conta genérica de "admin".
  - [ ] Tempo de execução: menos de **15 minutos**, uma vez.
- **Como falha.** Perda de acesso de um dos dois. O outro administrador é a redundância, e é a razão de serem dois.

#### F58. RLS ligado e chave de serviço fora do front-end (L93)

- **Por que existe.** Segurança proporcional para uma unidade cabe em três decisões, e esta é a mais importante das três.
- **Onde vive.** Banco e build do PWA.
- **Dado que precisa.** Políticas por tabela.
- **Critério de aceite.**
  - [ ] RLS **habilitado em todas** as tabelas de `experiencia`. Verificação: nenhuma tabela do schema com RLS desligado.
  - [ ] O bundle publicado do PWA **não** contém a chave de serviço. Verificação: buscar a chave no JavaScript servido e não achar.
  - [ ] O PWA escreve resposta por função com escopo restrito, e não tem permissão de leitura da base de clientes.
  - [ ] `get_advisors` do Supabase rodado antes do go-live, sem alerta de segurança em aberto.
- **Como falha.** Chave vazada num commit. Tratamento: rotação da chave e um `git` limpo do histórico, e é por isso que a chave nunca entra no repositório em primeiro lugar.

#### F59. Registro simplificado das operações de tratamento (L103)

- **Por que existe.** Obrigação da Res. CD/ANPD nº 2/2022, art. 9, e uma planilha de uma página basta.
- **Onde vive.** Um arquivo em `docs/`, não no sistema.
- **Dado que precisa.** Nada do banco.
- **Critério de aceite.**
  - [ ] Uma página, listando: finalidades, categorias de titular, categorias de dado, com quem é compartilhado, prazo de retenção e medidas de segurança.
  - [ ] Revisado quando entrar finalidade nova (campanha, WhatsApp, delivery).
  - [ ] Tempo de execução: menos de **1 hora**, uma vez.
- **Como falha.** Fica velho em silêncio. Mitigação: revisão amarrada à entrada de finalidade nova, não ao calendário.

---

## 3. Rastreio: cada feature de MVP contra os critérios de sucesso do briefing

Os quatro critérios: **C1** cancelar a mensalidade, **C2** coletar mais respostas que hoje, **C3** gerar decisão e não só relatório, **C4** unificar os dados.

| # | Feature | C1 | C2 | C3 | C4 |
|---|---|---|---|---|---|
| F01 | PWA de quiosque no tablet | sim | sim | | |
| F02 | QR na conta e na mesa | sim | sim | | |
| F03 | Fila local com idempotência | | sim | | |
| F04 | Antifraude por mesa, PIN e teto | | | sim | |
| F05 | Tentativas e conversão | | sim | sim | |
| F06 | Anônima com contato só no fim | | sim | | |
| F07 | Instrumentação de tempo | | sim | | |
| F08 | Heartbeat do tablet | sim | sim | | |
| F09 | NPS 0 a 10 na primeira tela | sim | | sim | |
| F10 | Ramificação por nota | | sim | sim | |
| F11 | Banco rotacionado com foco | | sim | sim | |
| F12 | Aberta ancorada na nota | | | sim | |
| F13 | Prato a prato em nota baixa | | | sim | sim |
| F14 | Português e inglês | | sim (confiança baixa) | | |
| F15 | Dia operacional às 6h | sim | | sim | sim |
| F16 | Painel em celular e computador | sim | | sim | |
| F17 | NPS com faixa e n | | | sim | |
| F18 | Distribuição em vez de média | | | sim | |
| F19 | Área e fator em contagem | sim | | sim | |
| F20 | Garçom com n e trimestre | sim | | sim | |
| F21 | Corte por dia da semana | | | sim | |
| F22 | Item contra média do cardápio | | | sim | sim |
| F23 | Taxa de pulo por tela | | sim | | |
| F24 | Alerta em tempo real | sim | | sim | |
| F25 | Regras de ronda | | sim | | |
| F26 | Nenhum alerta no tablet | | sim | | |
| F27 | Queda de tendência em contagem | sim | | sim | |
| F28 | E-mail das 16h com diagnóstico | sim | | sim | sim |
| F29 | Destinatários por área | sim | | sim | |
| F30 | Comentário filtrado por área | sim | | sim | |
| F31 | Comparação com período anterior | | | sim | |
| F32 | Nada a relatar | | | sim | |
| F33 | Log de execução | sim | | | |
| F34 | Classificação frase por frase | sim | | sim | |
| F35 | Diagnóstico escrito no diário | sim | | sim | |
| F36 | Texto cru e degradação sem IA | | | sim | |
| F37 | Módulo único de LLM | sim | | | |
| F38 | Nunca identificador ao LLM | | sim | | |
| F39 | Import do R3 por pasta | | | sim | sim |
| F40 | Botão de importar planilha | | | sim | sim |
| F41 | Satisfação x faturamento por dia | sim | | sim | sim |
| F42 | Catálogo de itens com chave | | | sim | sim |
| F43 | Base de clientes com consentimento | sim | | | sim |
| F44 | Aviso de privacidade na tela | | sim | | sim |
| F45 | Duas caixas de consentimento | | | | sim |
| F46 | Contato estritamente opcional | | sim | | |
| F47 | Link de exclusão | | sim | | sim |
| F48 | Retenção em job | | | | sim |
| F49 | PIN por garçom | sim | | sim | |
| F50 | PIN como dado da resposta | | sim | sim | |
| F51 | Link para Google e iFood | sim | | | |
| F52 | Exportar CSV e Excel | sim | | sim | sim |
| F53 | Dump semanal | sim | | | |
| F54 | Keep-alive diário | sim | | | |
| F55 | Schema dedicado no projeto existente | | | | sim |
| F56 | Exportação e eliminação no fornecedor | sim | | | |
| **F57** | **Dois administradores com 2FA** | | | | |
| **F58** | **RLS e chave fora do front-end** | | | | |
| **F59** | **Registro das operações de tratamento** | | | | |

### As três que não se justificam, e o que fazer com elas

**F57, F58 e F59 não atendem nenhum dos quatro critérios de sucesso, e é honesto dizer isso.** Nenhuma delas ajuda a cancelar a mensalidade, coletar mais, gerar decisão ou unificar dado. Elas protegem o sistema e cumprem a lei, o que é obrigação e não benefício.

**Proposta de rebaixamento:** saem da lista de features do MVP e entram na **definição de pronto** como itens de configuração, com tempo de execução somado abaixo de **2 horas** para as três. Isso as tira do planejamento de construção sem tirar a exigência: nenhuma delas pode faltar no go-live, mas nenhuma delas merece o nome de feature nem uma linha de cronograma.

**Duas ressalvas de leitura da tabela, para ela não ser usada errado:**

- **F14 (português e inglês)** aparece com C2 marcado e confiança baixa. Está no escopo travado do briefing, então não é candidata a corte, mas o ganho de volume é presumido e não medido. O critério de revisão dos 2% em 3 meses está em F14 justamente para isso.
- **F51 (link para Google e iFood)** só existe por C1: ela substitui, por dois links, o módulo do fornecedor atual que é o tecnicamente mais bem feito e o mais caro de reconstruir. É a melhor troca de esforço por valor de toda a tabela.

---

## 4. O que aproveitar do que já existe

Três ativos reais, e a diferença entre eles é o que se migra, o que se descarta e o que se reaproveita como hábito.

### 4.1 As 74 linhas de `cliques_avaliacao`

O que é, de fato: um rastreador de clique por garçom, com `id`, `garcom` (texto livre, não normalizado), `criado_em`, `user_agent` e `referrer`. **Não tem nota, não tem comentário, não tem mesa e não tem comanda.** Portanto não é pesquisa de satisfação, é medição de engajamento com um convite.

| Decisão | O que fazer | Critério de aceite |
|---|---|---|
| **Migrar** | As 74 linhas para `experiencia.convite_clique`, preservando `criado_em`, `garcom` cru, `user_agent` e `referrer` | 74 linhas na origem, 74 no destino, conferido por contagem e pelo `criado_em` mínimo e máximo |
| **Migrar** | A lista distinta de `garcom` vira semente da tabela `garcom` de F49, com PIN atribuído na migração | Todo valor distinto de `garcom` das 74 linhas tem uma linha em `garcom`, ativa ou com `removido_em` preenchido |
| **Reaproveitar como linha de base** | A distribuição de cliques por garçom e por dia é a **única** leitura própria de volume que a casa tem hoje, e serve de ponto de partida para a meta de conversão de F05 | O painel de coleta mostra a série antiga separada da nova, rotulada como `convite`, nunca somada às respostas |
| **Descartar** | `user_agent` e `referrer` das linhas novas: no tablet próprio eles não informam nada e são superfície de dado sem uso | Nenhum campo de `user_agent` na tabela de resposta nova |
| **Descartar** | O texto livre em `garcom` como identidade permanente: ele não normaliza e não sobrevive a homônimo | `resposta.garcom_id` é chave, e o texto digitado fica só em `garcom_pin_digitado` (F50) |
| **Não migrar** | `pizzapp_receitas` (8 linhas). É de outro produto, contexto de curso, e não tem relação com experiência do cliente | Nenhuma referência a `pizzapp_receitas` no schema novo |
| **Depois de migrar** | Pausar `qt-avaliacoes`, o que libera o segundo slot ativo da organização e permite trazer `Fichas Sensoriais` de volta | Projeto pausado só **depois** do dump conferido e da restauração testada |

**Pendência que precede a migração:** para onde esses QR apontam hoje. Se apontam para o Google e o convite é condicionado à nota, isso é review gating operando no perfil do QT, e precisa ser desligado antes de qualquer coisa (F51). A pergunta é do proprietário e não é opcional.

### 4.2 Os QR por garçom já em circulação, que é o ativo mais valioso

Isto não é dado, é hábito operacional, e é a parte mais difícil de construir num sistema de pesquisa. Ele já está de pé: existem QR por garçom impressos e a equipe já foi treinada a apresentá-los.

| Decisão | O que fazer |
|---|---|
| **Reaproveitar o gesto** | A pesquisa nova entra no mesmo momento do serviço em que o QR já é apresentado hoje, que é a entrega da conta. Nenhum treinamento novo de fluxo, só de destino |
| **Reaproveitar a atribuição por garçom** | O modelo por garçom já existe na cabeça da equipe, e o PIN de F49 e F50 é a formalização dele, não uma novidade |
| **Trocar o destino, não o hábito** | Os QR passam a apontar para a `T1` do sistema novo, com `?g=<pin>` (F02). Reimpressão é a única mudança física |
| **Descartar** | Qualquer convite a plataforma pública no destino do QR, por decisão do briefing e por política do Google |
| **Aceite** | Um QR por garçom ativo, impresso, testado em celular real, apontando para a `T1`, antes do desligamento do fornecedor atual |

**Ressalva que precisa estar ao lado da promessa de "trocar o destino, não o hábito".** O gesto é o mesmo para o garçom, mas não necessariamente para o cliente. Se o que a equipe diz hoje ao apresentar o QR é "avalie a gente no Google", então o cliente que aceita está aceitando **publicar uma avaliação pública**, e o novo destino o leva a uma **pesquisa interna anônima**, que é outra coisa. Muda o que ele entende que está fazendo, muda o que ele espera de retorno e pode muito bem mudar quem aceita. **A conversão do gesto reaproveitado é DESCONHECIDA**, não tem benchmark e não pode ser presumida igual à de hoje. As 74 linhas de `cliques_avaliacao` medem cliques em um convite, não respostas de pesquisa, então elas servem de linha de base de **volume de convite aceito**, e nunca de previsão de conversão da pesquisa nova. Duas consequências práticas: o script do garçom precisa ser reescrito junto com o QR (é uma frase, custo zero, e sem isso o cliente é levado a um lugar que não é o prometido), e a conversão real é medida por F05 desde o primeiro dia, contra as mesas atendidas, e não contra as 74 linhas. Para onde os QR apontam hoje é a pergunta 2 da seção 5 de [`05-critica.md`](05-critica.md), e ela precede esta ressalva.

### 4.3 O custo que já está em Postgres

`insumos_master` (131 linhas), `historico_precos` (344), `notas` (422) e `itens_nota` (1.179) são sistema real e com volume. `pratos` tem 1 linha e `prato_ingredientes` tem 0.

| Decisão | O que fazer |
|---|---|
| **Reaproveitar sem tocar** | O MVP **lê** e nunca escreve nessas tabelas, e no MVP nem lê: só garante que o `JOIN` será possível (F55) |
| **Reaproveitar como chave** | `item_cardapio.prato_id` (F42) é o ponto de encontro, e ele nasce aceitando nulo |
| **Não construir** | Nenhuma tabela nova de custo, nenhum cálculo de CMV, nenhuma cópia de preço de insumo. O diferencial nº 1 depende de **preencher** `pratos` e `prato_ingredientes`, o que é trabalho de ficha técnica nas skills, não de software de pesquisa |
| **Manter separado** | As skills seguem sendo a ferramenta de formular e revisar receita, conforme instrução do briefing. O sistema de experiência apenas consome custo por prato, e só na Fase 2 |

### 4.4 As respostas da ponte, e o mapeamento campo a campo para o schema definitivo

O terceiro ativo é o que a **ponte da M0** coletar antes do schema existir: nota, comentário aberto e a atribuição por QR. Elas são respostas reais de clientes reais e não podem ser descartadas, mas nascem sem quatro coisas que o schema definitivo exige: `dia_operacional` calculado pela função de F15, PIN validado, `versao_texto` de consentimento e idioma. A migração é a posição 15 do backlog, e ela é escrita aqui campo a campo para não virar improviso na hora.

| Campo na ponte | Campo no schema definitivo | Regra de migração |
|---|---|---|
| `id` sequencial | `resposta.origem_id`, mais `resposta_uuid` novo (v4 gerado na migração) | O id antigo é preservado para a contagem ser reconferível. Aceite: `n` na origem igual a `n` no destino, com o `criado_em` mínimo e máximo iguais |
| `nota` | `resposta.nota` | Direto, sem transformação. É o único campo que não precisa de tratamento |
| **ausente** | `resposta.faixa` | Derivada da nota na migração (0 a 6 detrator, 7 e 8 neutro, 9 e 10 promotor), nunca digitada |
| `criado_em` | `resposta.criado_em` | Preservado com fuso `America/Sao_Paulo`. Nada de recarimbar com a hora da migração |
| **ausente** | `resposta.dia_operacional` | **Recalculado** pela função de F15 sobre `criado_em`, corte às 6h. É derivação pura, então a ponte não precisa ter calculado nada. Consequência a declarar, não a esconder: resposta da madrugada muda de dia em relação ao que o e-mail da ponte mostrou, e a migração grava quantas linhas mudaram de dia |
| comentário aberto | `resposta_texto.texto_cru` | Íntegro, sem truncar e sem limpar. `resposta_texto.idioma` recebe `pt` como **valor imputado**, marcado como imputado, porque a ponte não tem seletor de idioma |
| `?g=<pin>` da URL | `resposta.garcom_pin_digitado`, `resposta.garcom_id`, `resposta.garcom_reconhecido` | O PIN nunca foi validado na ponte, então **nenhuma** resposta migrada entra como PIN validado. O `garcom_id` é resolvido na migração contra a tabela `garcom` (F49) e, quando não casa, `garcom_reconhecido = false`: a resposta entra nos indicadores gerais e fica fora do corte por garçom (F50) |
| `?m=<mesa>` da URL | `resposta.mesa` | Quando existir. Quando não existir, fica nulo e a linha não é chutada |
| **ausente** | `resposta.canal` | `qr` fixo, porque na M0 não existe tablet |
| **ausente** | `resposta.suspeita` | A regra dos 20 minutos de F04 é aplicada **retroativamente** na migração onde houver `mesa` e `criado_em`. Sem `mesa`, a linha fica com `suspeita = false` e `suspeita_nao_avaliavel = true`, para ninguém ler o zero como ausência de duplicata |
| **ausente** | `resposta.dispositivo_id`, `versao_app`, `versao_questionario` | `dispositivo_id` fica nulo (é o celular do cliente, e F03 não vale para ele). `versao_questionario` recebe o literal `ponte` |
| **ausente** | `tela_evento`, `resposta.duracao_ms` | Ficam sem linha. As respostas da ponte **saem** do cálculo de mediana e p90 de F07, e a série de tempo começa no go-live. A contagem de respostas excluídas aparece no painel de coleta |
| **ausente** | `resposta_opcao`, `resposta_item` | Não existem: a ponte não tem ramificação nem prato a prato. Os cortes por fator (F19) e por item (F22) começam do zero no go-live, e a tela escreve **início de série**, nunca queda |
| **ausente** | `consentimento.versao_texto` | É o único campo sem saída automática. Ver a divergência abaixo |
| (nova) | `resposta.origem` | `ponte` gravado em toda linha migrada, para qualquer contagem poder ser refeita com e sem elas |

**A divergência que a migração não resolve sozinha: o consentimento.** F44 exige que nenhuma resposta seja aceita sem uma versão vigente de texto, e a ponte, como está descrita na posição 6 do backlog, não grava `versao_texto`. Duas opções, e a escolha é do proprietário:

- **Opção A, corrigir a ponte antes de coletar:** a ponte carrega duas linhas de aviso (finalidade, controlador e canal de direitos) e grava `versao_texto` desde a primeira resposta. Custo: algumas horas na M0, antes da coleta começar. Resultado: a migração é direta e o schema definitivo nasce limpo.
- **Opção B, migrar o que já foi coletado sem versão:** as linhas entram com `versao_texto` nulo e `consentimento_ausente = true`, contam nos agregados e **nunca** são usadas para contato. Custo: o schema definitivo nasce com um lote de linhas que não satisfaz o critério de F44, e isso precisa aparecer no registro de operações (F59) em vez de ficar implícito.

Descartar o comentário aberto do período da ponte é a terceira saída, e ela custa perder justamente o texto dos primeiros clientes. Nenhuma das três é decisão de implementador. Esta escolha é vizinha da pergunta 5 da seção 5 de [`05-critica.md`](05-critica.md), que trata de dado pessoal, e precisa ser respondida junto com ela.

---

## 5. Definição de pronto do MVP

Lista fechada. Cumprida inteira, autoriza declarar o MVP no ar e pedir o cancelamento. Nenhum item é opcional, e nenhum item novo entra aqui sem sair outro.

### Coleta e questionário

- [ ] `T0` a `T7` no ar, com os textos exatos da seção 14.3 do questionário, em português e inglês.
- [ ] Menor alvo de toque de **44 px**, botões de nota de **60 a 80 px**, zero rolagem, transição abaixo de 2 s, timeout de 45 s com contagem nos 15 finais, `T7` com auto-reset em 8 s.
- [ ] Texto secundário nunca em `#A0A5A5` sobre fundo claro.
- [ ] Três respostas gravadas com o Wi-Fi desligado e entregues sozinhas ao religar, sem duplicar em 5 reenvios do mesmo UUID.
- [ ] Banco rotacionado com **12 perguntas ativas** e **2 a 4 em foco**, editáveis sem deploy.
- [ ] Uma resposta com só a nota grava e conta como completa.
- [ ] Nenhum som, nenhuma vibração e nenhuma mudança de tela em função da nota.

### Tempo e leitura

- [ ] `dia_operacional` com corte às **6h** usado em toda consulta, todo gráfico e todo e-mail, e resposta de 00h40 de quarta aparecendo como terça.
- [ ] Painel abrindo em menos de 3 s em 4G no celular, com `n` ao lado de todo número.
- [ ] NPS sempre com faixa de 95% e a tabela de ruído impressa (±29 em n=50, ±20,5 em n=100, ±14,5 em n=200).
- [ ] Corte com amostra abaixo do mínimo aparecendo como `amostra insuficiente, n=x`.
- [ ] Nenhuma nota média geral como indicador principal, em nenhuma tela.

### Relatório e alerta

- [ ] E-mail das **16h** saindo todo dia, com os oito blocos, os cortes por papel e "nada a relatar" funcionando.
- [ ] Quatro endereços cadastrados, um por papel, e cada um recebendo só o seu corte, conferido no envio real.
- [ ] Nota de 0 a 6 disparando alerta ao gerente em menos de **30 s**, com mesa, hora, nota e fator, e nunca no tablet.
- [ ] Alerta testado **no aparelho do gerente de turno**, bloqueado e na tela inicial, com push e som, dentro dos 30 s. Se a casa recusar aparelho com push em serviço, isso fica registrado e o alerta com o cliente ainda na mesa passa a ser Fase 3 (F24).
- [ ] Regras de ronda escritas no README e no corpo do alerta.
- [ ] Digest saindo completo com a chave da IA apagada.

### Dado unificado

- [ ] `watcher_drive` importando o R3 e o botão de importar planilha funcionando no celular, com o mesmo parser.
- [ ] Reimportar o mesmo arquivo 5 vezes sem duplicar faturamento.
- [ ] `item_cardapio` com 100% dos itens ativos casando com um R3 real.
- [ ] Bloco 7 do e-mail com faturamento, ticket médio e dois pratos mais vendidos, sem gráfico que insinue causalidade.
- [ ] Exportação em CSV e Excel de tudo, abrindo no Excel em português sem quebrar acento.

### LGPD

- [ ] Aviso de três linhas nas telas, `/privacidade` publicada, e artigos da LGPD conferidos contra o texto da lei antes de publicar.
- [ ] Duas caixas de consentimento, nenhuma pré-marcada, com data, hora e versão gravadas.
- [ ] Prazo de retenção **escolhido explicitamente pelo proprietário** (12 ou 24 meses), escrito na página e igual ao da configuração.
- [ ] `cron_retencao` testado: cliente antigo anonimizado, resposta preservada.
- [ ] Link de exclusão publicado, e pedido aberto há mais de 7 dias aparecendo no e-mail.
- [ ] Teste do payload da IA reprovando telefone e e-mail.

### Sobrevivência

- [ ] Schema `experiencia` criado por migration versionada, dentro de `NFe e Financeiro`, em `sa-east-1`, com `pg_dump` anterior guardado fora do Supabase.
- [ ] Papel da aplicação sem escrita fora do schema, confirmado por tentativa de `INSERT` que falha.
- [ ] RLS habilitado em todas as tabelas, `get_advisors` sem alerta em aberto, chave de serviço ausente do bundle publicado.
- [ ] Dump semanal rodando e **restaurado com sucesso num banco vazio pelo menos uma vez**.
- [ ] Keep-alive gravando todos os dias, inclusive segunda, com a consulta separada do envio de e-mail.
- [ ] Duas contas de administrador com 2FA, e o registro de uma página das operações de tratamento em `docs/`.
- [ ] README com a única regra de operação do sistema: **se o e-mail das 16h não chegar dois dias seguidos, algo quebrou.**
- [ ] Os **sete deveres humanos recorrentes** da tabela abaixo escritos no README, cada um com dono nomeado pelo proprietário (pergunta 4 da seção 5 de [`05-critica.md`](05-critica.md)). Dever sem dono nomeado no go-live é dever cortado, e o corte fica escrito ao lado do indicador que ele deixa de sustentar.
- [ ] Destino do dump semanal nomeado no README, com cifra, retenção de 8 semanas e acesso restrito aos dois administradores (F53).

### Migração e transição

- [ ] 74 linhas de `cliques_avaliacao` migradas e conferidas por contagem, com a lista de garçons virando semente de `garcom`.
- [ ] Um QR por garçom ativo, reimpresso, testado em celular real, apontando para a `T1`.
- [ ] Resposta do proprietário sobre para onde os QR antigos apontavam, e review gating desligado se existir.
- [ ] Pedido de exportação e de eliminação enviado por escrito ao fornecedor atual, com a resposta arquivada em `docs/`.
- [ ] Decisão registrada sobre histórico: migrar os últimos meses ou nenhum.
- [ ] **Ensaio de aceite de três noites de serviço real** com o sistema novo, coletando de verdade, com o e-mail das 16h saindo nos três dias seguintes. Não é operação em paralelo de dois fornecedores, que o briefing descarta: é teste de aceite, e ele acontece **antes** do e-mail de cancelamento.
- [ ] Dois tablets em operação, não um, porque o hardware passa a ser custo direto da casa e aparelho de entrada é consumível.
- [ ] Respostas da ponte migradas pelo mapeamento campo a campo da seção 4.4, com a contagem conferida na origem e no destino e com o número de linhas que mudaram de dia operacional escrito no log da migração.

### Os sete deveres humanos recorrentes que este MVP cria

A restrição mais dura do briefing é **"ninguém vai manter o sistema depois de pronto"**. O MVP como está especificado não cumpre isso literalmente: ele cria sete tarefas humanas recorrentes, espalhadas por quatro documentos. Consolidá-las numa tabela é o que permite auditar a restrição em vez de acreditar nela.

**A coluna de dono é proposta, não decidida.** Quem executa cada uma, com nome, é a pergunta 4 da seção 5 de [`05-critica.md`](05-critica.md), e ela precede a primeira linha de código. Tarefa sem dono nomeado é tarefa cortada, e cortá-la muda o que o painel consegue mostrar, o que está escrito na última coluna.

| Tarefa | Frequência | Dono proposto | O que acontece se ninguém fizer |
|---|---|---|---|
| Exportar o R3 para a pasta do Drive (F39) | Diária | Proprietário, na mesma rotina de análise de CMV. O hábito já existir é **NÃO VERIFICADO** | O bloco 7 do e-mail não aparece e o cruzamento satisfação x faturamento some, que é o terceiro obrigatório do MVP. Ausência de arquivo novo por 2 dias operacionais vira linha de cobrança no e-mail das 16h |
| Informar `mesas_atendidas_dia` (F05) | Diária | Gerente de turno, no fechamento do caixa | O painel escreve `denominador ausente` e não mostra percentual. Sem denominador não existe taxa de conversão, e "coletar mais que hoje" deixa de ser mensurável, que é o critério de sucesso nº 2. Campo vazio por 3 dias vira linha de cobrança no e-mail das 16h |
| Trocar as 2 a 4 perguntas em foco (F11) | Mensal | Proprietário, na tela de administração, sem deploy | O banco rotacionado congela nas mesmas perguntas, as impressões deixam de se concentrar onde interessa e a pesquisa para de se renovar. Não quebra nada, e é a mais fácil de deixar cair |
| Abrir o Portal do Parceiro do iFood e ler as avaliações (F51) | Semanal | Proprietário ou gerência, cerca de 20 minutos | O sistema não lê avaliação pública por decisão do briefing, então nenhum software cobre essa lacuna: a casa fica cega para o iFood. Não existe alerta possível, porque o sistema não sabe que a tarefa não foi feita |
| Anotar a nota de 4 pizzarias comparáveis no Google (F51) | Trimestral | Proprietário ou gerência | O substituto do benchmark, que é irreplicável em software, desaparece. Como não existe benchmark de NPS de pizzaria verificável, essa anotação manual é a única referência externa do projeto |
| Testar a restauração do dump em banco vazio (F53) | **Divergência**: F53 exige ao menos **uma** vez antes do go-live; [`03-superar.md`](03-superar.md) 2.7 pede **trimestral** | Proprietário ou o segundo administrador (F57) | Backup não testado não é backup, e o plano gratuito do Supabase não tem backup nenhum. A divergência entre os dois documentos precisa ser fechada: o piso deste documento é a restauração única antes do go-live, e a trimestral é o que se recomenda por cima dela |
| Manter a ficha técnica atualizada para o CMV não derivar (posição 36 de [`04-cortar-e-backlog.md`](04-cortar-e-backlog.md)) | Contínua, a cada mudança de receita ou de preço | Proprietário, nas skills, que é onde a ficha técnica vive por instrução do briefing | O diferencial nº 1 (satisfação cruzada com CMV) passa a cruzar com custo velho, o que é pior que não cruzar, porque tem aparência de número certo. Isso é Fase 2, mas a derivação começa no dia em que a ficha for preenchida |

Duas leituras honestas desta tabela. A primeira: **cinco das sete tarefas não têm nenhum alarme possível** e só as duas diárias entram no e-mail das 16h como cobrança, porque só elas têm um sinal que o sistema consegue observar (arquivo que não chegou, campo que não foi preenchido). A segunda: **o sistema roda sozinho, o painel completo não.** O que sobrevive sem nenhuma das sete é a coleta, o alerta ao gerente, a distribuição de notas, o corte por garçom e o e-mail das 16h. O que morre é a conversão, o cruzamento com faturamento, o iFood e a referência externa.

### O que a definição de pronto deliberadamente não exige, e é bom que não exija

Convite ao Google, cupom, leitura de review público, campanha automática, aniversário, ticket de recuperação com dono e prazo, WhatsApp, previsão de recompra, conversa com os dados em texto livre, matriz de engenharia de cardápio, cruzamento com CMV, integração com o CRM de reservas, Raspberry Pi e leitura direta do banco do PDV.

Nada disso bloqueia o cancelamento da mensalidade, e cada um deles adicionaria peça móvel na versão em que menos se pode ter isso. O cruzamento com CMV é o diferencial mais defensável do projeto e continua Fase 2, com uma diferença que a inspeção trouxe: ele deixou de depender de construir estrutura de custo e passou a depender de **preencher** a que já existe.
