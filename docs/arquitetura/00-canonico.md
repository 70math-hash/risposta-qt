# Valores canônicos da Etapa 4

**Data:** 16/08/2026 · **Escopo:** desenho, não execução. Nenhuma migration foi aplicada e nenhum DDL foi
executado para escrever esta folha.

Esta folha existe por um motivo mecânico: na Etapa 3, cinco agentes escreveram em paralelo sem ver o
texto uns dos outros, e o resultado foram cinco contradições, todas de nome ou de número, nenhuma de
desenho. Nome divergente é a falha mais barata de evitar e a mais cara de consertar depois, porque cada
nome do schema aparece em centenas de lugares (DDL, view, função, Worker, template de e-mail, tela,
exportação, consulta escrita à mão pelo proprietário dois anos depois).

**Esta folha é LEI para todos os documentos da Etapa 4 e para todo o SQL, código e texto que vier depois
dela.** Só as decisões `D1` a `D8` de [`../01-decisoes.md`](../01-decisoes.md) e os fatos verificados do
ambiente vencem esta folha. A ordem completa está na seção 10.

---

## 0. Como usar esta folha, em quatro regras

1. **Copie o texto literal.** Todo nome aqui está entre crases e é para ser copiado com a grafia exata,
   sem traduzir, sem abreviar, sem pluralizar, sem trocar de ordem. Se você está interpretando, você já
   errou.
2. **Se não está aqui, não invente.** Nome que falta entra por **edição desta folha primeiro**, e só
   depois aparece no seu documento. Nome criado direto no documento é a contradição da próxima rodada.
3. **Número que não está aqui e não está numa fonte oficial se escreve `NÃO VERIFICADO`**, com essas
   palavras. O mesmo vale para `NÃO PÚBLICO` e `DESCONHECIDO`. Número inventado é pior que número ausente,
   porque tem aparência de conferido.
4. **Referencie entrega por nome e marco, nunca por número de posição.** Exemplo correto: "cobrado na
   entrega `Painel de leitura`, na M1". Exemplo proibido: "cobrado na posição 20". Número de posição foi a
   causa mecânica de três contradições na Etapa 3 (`C2` da folha da Etapa 3).

Uma regra de julgamento, que vale mais que as quatro acima: **ninguém vai manter este sistema depois de
pronto.** Toda escolha desta folha foi feita contra essa restrição, e o inimigo é a peça que quebra em
silêncio. É por isso que existem colunas geradas em vez de convenção de consulta, uma função só para o
corte do dia, e nome de tabela que não pode ser confundido com o do sistema fiscal que vive no mesmo
banco.

---

## 1. O nome do schema

```
experiencia
```

**Justificativa, em uma linha:** é o nome já fixado por `D2` e usado em todos os documentos da Etapa 3,
tem 11 caracteres, é português sem acento, minúsculo, diz o domínio (experiência do cliente) e não cita
fornecedor, tecnologia nem produto, que são as três coisas que envelhecem.

Onde ele vive, e isto não se discute:

| Item | Valor literal |
|---|---|
| Projeto Supabase | `NFe e Financeiro` |
| Ref do projeto | `rzrjdbnxhpwzqgqrlfwa` |
| Região | `sa-east-1` (São Paulo). Região não se troca depois de criada |
| Versão do Postgres | 17 (lida como 17.6.1.111 em 13/08/2026) |
| Organização | `QT Pizza Bar`, única, com o teto de 2 projetos ativos do plano gratuito **já atingido** |

Três consequências que valem como regra, todas de `D2`:

- **Nenhuma tabela do sistema nasce em `public`.** Todas nascem em `experiencia`.
- **O schema `experiencia` nunca escreve fora de si mesmo.** Nas tabelas de custo (`public.pratos`,
  `public.prato_ingredientes`, `public.insumos_master`, `public.historico_precos`,
  `public.producao_ingredientes`) ele tem no máximo `SELECT`.
- **Toda estrutura entra por migration versionada, e `pg_dump` do projeto vem antes de qualquer
  migração, sem exceção.** Enquanto o dump não existir e não estiver guardado fora do Supabase, o SQL
  desta etapa é arquivo inerte no repositório.

---

## 2. As tabelas do schema `experiencia`

### 2.1 A regra de número, declarada uma vez

**Singular, sempre.** Uma linha é uma coisa, e o nome da tabela é o nome dessa coisa no singular.

**Invariante conferível:** nenhum nome de tabela do schema `experiencia` está no plural. Se você escreveu
plural, está errado. Isso vale inclusive para tabela de contagem (`mesa_atendida_dia`) e para o armazenamento
local do navegador (`fila_resposta`).

As tabelas de custo em `public` (`pratos`, `insumos_master`, `historico_precos`, `prato_ingredientes`,
`producao_ingredientes`) estão no plural, são de outro sistema, são **somente leitura** para nós e
**não se renomeiam**. A regra do singular vale para o que nós criamos.

### 2.2 A lista, que é a lei

Vinte e seis tabelas. Cada linha traz o nome literal, o que a tabela guarda e o grão (o que é uma linha).

**Bloco A. Coleta**

| Tabela | O que guarda | Grão (uma linha é) |
|---|---|---|
| `resposta` | A resposta de pesquisa, com nota, mesa, garçom digitado, canal, dispositivo, idioma, suspeita e as marcas de tempo | Uma resposta enviada por um cliente |
| `resposta_opcao` | As opções marcadas nas telas de ramificação e de fator, com dimensão e fator | Uma opção marcada em uma resposta |
| `resposta_item` | O item do cardápio apontado por detrator com causa comida, com o fator | Um item apontado em uma resposta |
| `resposta_texto` | O comentário aberto, texto cru como o cliente escreveu, nunca reescrito | Uma resposta (zero ou uma linha por resposta) |
| `resposta_pergunta_sorteada` | Qual pergunta do banco foi sorteada e se foi respondida | Uma pergunta sorteada em uma resposta |
| `tela_evento` | Carimbo de entrada e de saída de cada tela exibida, e se foi pulada | Uma exibição de tela em uma resposta |
| `tentativa` | A abordagem registrada na `T0`, inclusive a recusa, que é o numerador da conversão por garçom | Uma abordagem de mesa (respondeu ou recusou) |

**Bloco B. Cadastro**

| Tabela | O que guarda | Grão (uma linha é) |
|---|---|---|
| `garcom` | Nome, PIN, ativo, criado e removido. Extra entra e sai sem apagar histórico | Um garçom |
| `mesa` | Número, área do salão e capacidade. É o que permite deduzir a área a partir da mesa, em vez de perguntar ao cliente | Uma mesa física |
| `dispositivo` | Os 5 tablets, com apelido, uso ou reserva, e o estado do último sinal (hora, fila pendente, versão do app) | Um aparelho da casa |
| `item_cardapio` | O catálogo de itens com as chaves de junção para o R3 e para a ficha técnica | Um item do cardápio |
| `pergunta_banco` | O banco de perguntas rotacionadas, com texto em duas línguas, dimensão, peso, ativa, em foco e quando sai | Uma pergunta do banco |
| `destinatario` | E-mail e papel de quem recebe o digest das 16h | Um endereço de e-mail com um papel |
| `mesa_atendida_dia` | A contagem de mesas atendidas informada à mão no fechamento, que é o denominador da conversão da casa | Um dia operacional |
| `calendario_operacao` | Só a **exceção** ao padrão semanal: feriado, fechamento extraordinário, abertura extra. O padrão vem de função, então ninguém precisa preencher nada em mês normal | Um dia operacional declarado como exceção |
| `configuracao` | Parâmetro de negócio editável sem deploy (prazos, limiares, URLs, provedor e modelo de LLM) | Um parâmetro |

**Bloco C. Cliente e LGPD**

| Tabela | O que guarda | Grão (uma linha é) |
|---|---|---|
| `cliente` | Nome, e-mail, WhatsApp, nascimento, origem, última visita e a marca de anonimização | Um cliente identificado |
| `consentimento` | O aceite, com finalidade, data, hora e versão do texto aceito | Um consentimento dado por uma finalidade |
| `consentimento_texto` | O texto do aviso, versionado, append-only. Editar cria versão nova | Uma versão do texto de consentimento |
| `exclusao_pedido` | Pedido de exclusão ou revogação, com data do pedido, data do atendimento e resultado | Um pedido de titular |

**Bloco D. IA na coleira**

| Tabela | O que guarda | Grão (uma linha é) |
|---|---|---|
| `classificacao_texto` | A saída do classificador, frase por frase, com dimensão, fator, polaridade, severidade, se nomeia pessoa, modelo e versão do prompt. É derivada e pode ser refeita do zero | Uma frase classificada de um comentário |

**Bloco E. Dado do PDV**

| Tabela | O que guarda | Grão (uma linha é) |
|---|---|---|
| `venda_produto_dia` | A venda importada do relatório **R3 Vendas por Produto Detalhado** do Altec, com unidades e valor líquido | Um produto em um dia operacional |
| `execucao_importacao` | Cada tentativa de importação, com o arquivo bruto guardado antes de ser interpretado, o hash, as linhas e o erro | Uma execução de importação de arquivo |

**Bloco F. Operação e saúde**

| Tabela | O que guarda | Grão (uma linha é) |
|---|---|---|
| `execucao_rotina` | O log das cinco rotinas no próprio banco, com início, fim, status, contagens, destinatários e erro truncado. É o log que sobra quando o do fornecedor expira | Uma execução de uma rotina |
| `alerta_detrator` | O alerta de nota 0 a 6 disparado ao gerente, com mesa, hora, nota, fator, canal, destinatário, envio e se houve contato | Um alerta de um detrator |

**Bloco G. Histórico migrado**

| Tabela | O que guarda | Grão (uma linha é) |
|---|---|---|
| `convite_clique` | As 74 linhas de `cliques_avaliacao` do projeto `qt-avaliacoes`, com `garcom` cru, `criado_em`, `user_agent` e `referrer` preservados | Um clique em convite, do histórico |

**Bloco H. Acrescentado depois da implementação**

| Tabela | O que guarda | Grão (uma linha é) |
|---|---|---|
| `exportacao_registro` | Quem baixou qual exportação, e quando. **Resolve uma contradição interna desta folha**: a seção 6.3 mandava registrar o uso de `vw_exportacao_cliente` em `execucao_rotina`, e a seção 3.3 fecha `rotina` em cinco valores, nenhum de exportação. Tabela própria em vez de um sexto valor: exportação não tem agendamento nem passo, e misturá-la faria `vw_saude_rotina` responder duas perguntas diferentes | Uma exportação baixada |

Com ela, são **27** tabelas, e a invariante que confere esse número roda na ÚLTIMA migration da cadeia — a única que enxerga o estado final. Ela morava na migration de RLS, que roda no meio: aprovava um número que deixava de ser verdade três migrations depois.

### 2.3 Fora do Postgres, e mesmo assim com nome fixado

| Nome | Onde vive | O que guarda |
|---|---|---|
| `fila_resposta` | `IndexedDB` do PWA, com espelho append-only em `localStorage` | A resposta pendente de envio no tablet, com `status` e `tentativas_envio` |

**Acrescentado depois da implementação:** o PWA cria **dois** armazenamentos locais, e não um.

| Nome | Onde vive | O que guarda |
|---|---|---|
| `fila_tentativa` | IndexedDB do tablet | As recusas registradas na `T0`, esperando envio. Ficam separadas de `fila_resposta` porque vão para rota diferente e têm carga diferente: a recusa não tem nota |

---

### 2.4 As nove decisões de nome que esta folha toma, e por quê

Cada uma existe porque dois documentos da Etapa 3 usavam nomes diferentes para a mesma coisa, ou porque o
nome escolhido lá cria risco de consulta errada aqui. **O nome antigo está revogado e entra na lista de
expressões proibidas da seção 9.**

| Antes (revogado) | Agora | Motivo |
|---|---|---|
| `resposta_prato` | `resposta_item` | Dois nomes para uma tabela só. O catálogo é `item_cardapio` e a linha pode ser pizza, entrada ou sobremesa, então `item` é o substantivo certo. `resposta_prato` só existia no SQL ilustrativo, que o próprio documento marcou como não verificado |
| `comentario_trecho` | `classificacao_texto` | Dois nomes para uma tabela só. Vence o nome usado nos critérios de aceite |
| `resposta.comentario_bruto` | `resposta_texto.texto_cru` | O texto aberto tem tabela própria, com idioma. Coluna e tabela concorrentes para o mesmo dado é a receita de gravar nos dois e divergir |
| `pergunta` | `pergunta_banco` | Dois nomes para uma tabela só. `pergunta` sozinho se confunde com `resposta` na leitura de consulta |
| `contato` (tabela) | `cliente` | Não existe tabela `contato`. O contato é o conjunto de colunas pessoais de `cliente` |
| `alerta` | `alerta_detrator` | Já existe `public.alertas` (36 linhas, sistema fiscal) no mesmo banco. Nome quase igual em schema diferente é como se escreve a consulta errada e não se percebe |
| `heartbeat_dispositivo` | colunas dentro de `dispositivo` | Duas tabelas para um grão só. Uma linha por aparelho responde "há quanto tempo este tablet está mudo", que é a única pergunta que o alarme faz. Menos uma tabela é menos uma peça |
| `import_execucao` | `execucao_importacao` | `import` não é português e a irmã já se chama `execucao_rotina`. As duas passam a ler igual |
| `mesas_atendidas_dia` | `mesa_atendida_dia` | Único plural que sobrava. Com ele fora, "nenhuma tabela no plural" passa a ser invariante conferível por busca |

### 2.5 Duas contradições de desenho que esta folha fecha, porque elas nasceriam de nome

**A conversão por garçom não usa a contagem diária de mesas.** `mesa_atendida_dia` tem grão de **um dia
operacional**, com um número só, porque quem preenche é o gerente no fechamento e um campo por garçom
multiplicaria a tarefa humana por quatro, o que a mataria. Portanto: a conversão **da casa** é
`respostas / mesa_atendida_dia.mesas`, e a conversão **por garçom** é `respostas / tentativas registradas
na T0` (tabela `tentativa`). São dois denominadores diferentes, com nomes diferentes, e a tela escreve qual
está usando. Sem esta linha, dois documentos escreveriam a mesma métrica com contas diferentes.

**O arquivo bruto do R3 fica na própria linha de `execucao_importacao`**, em coluna de bytes, e não em
bucket de Storage. Bucket é mais uma superfície com credencial e política de acesso próprias. O tamanho
esperado de um arquivo R3 é de dezenas de KB, e o número real é **NÃO VERIFICADO**. Não existe poda desses
bytes no MVP, e isso está declarado aqui para não ser descoberto como surpresa quando o schema crescer.

---

## 3. As colunas que aparecem em mais de um documento

### 3.1 A lista, que é a lei

Estas são as colunas que cinco agentes escreveriam com cinco nomes. **O nome literal é este, em todas as
tabelas onde a coluna aparecer.**

| Coluna | Tipo | Onde vive | Regra |
|---|---|---|---|
| `id` | `uuid` | Toda tabela do schema | Chave primária. Em `resposta`, o valor é o **UUID v4 gerado no cliente**, e é ele que dá idempotência: reenvio do mesmo `id` não cria segunda linha |
| `resposta_id` | `uuid` | `resposta_opcao`, `resposta_item`, `resposta_texto`, `resposta_pergunta_sorteada`, `tela_evento`, `classificacao_texto`, `consentimento`, `alerta_detrator` | Chave estrangeira para `resposta.id`. **Não existe `resposta_uuid`** |
| `dia_operacional` | `date` | `resposta` (gerada), `venda_produto_dia`, `mesa_atendida_dia`, `calendario_operacao`, `tentativa` | A única data de agrupamento do sistema. Regra completa na seção 4 |
| `mesa_digitada` | `text` | `resposta`, `tentativa` | O que o garçom digitou, cru, preservado sempre |
| `mesa_id` | `uuid` | `resposta`, `tentativa` | Resolvido no servidor contra `mesa`. Mesa não reconhecida é `mesa_id is null`. **Não existe coluna `mesa_reconhecida`** |
| `garcom_pin_digitado` | `text` | `resposta`, `tentativa` | O que foi digitado na `T0`, cru, preservado sempre. O PIN é dado da resposta, nunca autenticação |
| `garcom_id` | `uuid` | `resposta`, `tentativa`, `convite_clique` | Resolvido no servidor contra `garcom` |
| `garcom_reconhecido` | `boolean` | `resposta`, `tentativa` | `false` quando o PIN não casa. A resposta entra nos indicadores gerais e **não** entra no corte por garçom |
| `pin` | `text` | `garcom` | O PIN do cadastro. Nunca hash, nunca no tablet |
| `nota` | `smallint` | `resposta` | NPS de 0 a 10. Nunca 1 a 10, nunca 1 a 5 |
| `faixa` | `text` | `resposta` (gerada de `nota`) | `detrator` (0 a 6), `neutro` (7 e 8), `promotor` (9 e 10) |
| `canal` | `text` | `resposta`, `tentativa` | `tablet` ou `qr`. Nada mais no MVP |
| `dispositivo_id` | `uuid` | `resposta`, `tentativa` | Chave estrangeira para `dispositivo.id`. Nulo quando a resposta vem de QR no celular do cliente |
| `idioma` | `text` | `resposta`, e como sufixo em `pergunta_banco` e `item_cardapio` | `pt` ou `en`. **Não existe `idioma_sessao`**, e o idioma não se repete em `resposta_texto`: ele se lê por junção |
| `suspeita` | `boolean` | `resposta` | Marcação, nunca rejeição. Default `false` |
| `suspeita_motivo` | `text` | `resposta` | Por que foi marcada. Nulo quando `suspeita = false` |
| `versao_texto` | `text` | `consentimento` | A versão do texto de consentimento aceita, apontando para `consentimento_texto.versao` |
| `versao_app` | `text` | `resposta`, `dispositivo` | Versão do PWA que gravou |
| `versao_questionario` | `text` | `resposta` | Versão do questionário vigente na resposta |
| `versao_prompt` | `text` | `classificacao_texto` | Sem ela a contagem de um mês não é comparável com a de outro |
| `modelo` | `text` | `classificacao_texto` | Nome do modelo de LLM usado |
| `dimensao` | `text` | `resposta_opcao`, `pergunta_banco`, `classificacao_texto` | Um dos nove valores fixos da seção 3.3 |
| `fator` | `text` | `resposta_opcao`, `resposta_item`, `classificacao_texto`, `alerta_detrator` | Um dos valores fixos da seção 3.3 |
| `prato_id` | `uuid` | `item_cardapio` | Chave estrangeira lógica para `public.pratos.id`. Aceita nulo, e fica nulo enquanto a ficha técnica não existir |
| `produto_id_pdv` | `text` | `item_cardapio`, `venda_produto_dia` | O `id_altec` do R3. É a chave de junção preferida |
| `produto_nome_norm` | `text` | `item_cardapio`, `venda_produto_dia` | Nome em maiúsculas e sem acento, no formato do R3. Junção de **reserva**, só quando `produto_id_pdv` for nulo |
| `rotina` | `text` | `execucao_rotina` | Um dos cinco nomes literais da seção 5 |
| `status` | `text` | `execucao_rotina`, `execucao_importacao` | `sucesso` ou `erro` |
| `erro` | `text` | `execucao_rotina`, `execucao_importacao` | Mensagem truncada. Nunca só um booleano |

### 3.2 As marcas de tempo, fixadas de uma vez

**Regra de sufixo:** `timestamptz` termina em `_em`. Data termina em `_dia` ou é `dia_operacional`. Nunca
`data_x`, nunca `x_at`, nunca `timestamp`. O banco guarda em UTC e a apresentação é em `America/Sao_Paulo`,
sempre explícito, nunca herdado de default de servidor.

| Coluna | Tipo | O que é |
|---|---|---|
| `criado_em` | `timestamptz` | Instante em que o **servidor** gravou a linha, `default now()`. Existe em toda tabela e nunca é editado |
| `criado_em_cliente` | `timestamptz` | Instante do toque pelo relógio **do tablet**, enviado junto da resposta |
| `respondido_em` | `timestamptz` | **O instante canônico da resposta.** Igual a `criado_em_cliente` quando a diferença contra `criado_em` é de até 48 horas, senão igual a `criado_em`. Resolvido no servidor na gravação. É dele que sai o `dia_operacional`, e é ele que a hora do alerta atrasado exibe |
| `entrou_em`, `saiu_em` | `timestamptz` | `tela_evento`. Duração é diferença entre carimbos do **mesmo** dispositivo, nunca contra a hora do servidor |
| `enviado_em` | `timestamptz` | `alerta_detrator`. Os 30 segundos do alerta se medem entre `respondido_em` e `enviado_em` |
| `iniciado_em`, `terminado_em` | `timestamptz` | `execucao_rotina`, `execucao_importacao` |
| `importado_em` | `timestamptz` | `venda_produto_dia` |
| `aceito_em` | `timestamptz` | `consentimento` |
| `vigente_de` | `timestamptz` | `consentimento_texto` |
| `ultima_visita_em` | `timestamptz` | `cliente`. É dela que corre o prazo de 12 meses |
| `anonimizado_em` | `timestamptz` | `cliente`. Prova de que a retenção rodou |
| `removido_em` | `timestamptz` | `garcom`, `dispositivo`, `item_cardapio`. Saída sem apagar histórico |
| `ultimo_sinal_em` | `timestamptz` | `dispositivo`. É o heartbeat, e é o que o e-mail das 16h lista aparelho por aparelho |
| `classificado_em` | `timestamptz` | `classificacao_texto` |
| `pedido_em`, `atendido_em` | `timestamptz` | `exclusao_pedido` |
| `atualizado_em` | `timestamptz` | `configuracao` |
| `em_foco_desde` | `date` | `pergunta_banco`. É o que permite o digest dizer há quantos meses o foco não muda |

### 3.3 Os domínios de valor, fixados em minúsculo, sem acento, snake_case

Estas listas são fechadas. **O classificador de IA não pode criar valor novo, e valor fora da lista é
rejeitado.** Valor novo entra por decisão humana e por migration, nunca por prompt.

**`dimensao`, nove valores:**
`comida`, `bebida`, `tempo`, `atendimento`, `precisao_pedido`, `ambiente`, `limpeza`, `preco_valor`,
`item_consumido`.

**`fator`, por dimensão:**

| Dimensão | Fatores |
|---|---|
| `comida` | `sabor`, `chegou_frio`, `ponto_da_massa`, `apresentacao`, `ingrediente_sem_frescor`, `veio_errado_ou_faltou` |
| `bebida` | `temperatura`, `tempo_ate_chegar`, `qualidade`, `veio_errada` |
| `tempo` | `espera_mesa`, `espera_bebida`, `espera_pizza`, `espera_conta` |
| `atendimento` | `recepcao`, `simpatia`, `atencao_durante`, `despedida`, `conhecimento_cardapio` |
| `precisao_pedido` | `item_errado`, `item_faltando`, `pedido_especial_ignorado`, `restricao_alimentar` |
| `ambiente` | `ruido`, `temperatura_salao`, `iluminacao`, `conforto` |
| `limpeza` | `mesa`, `salao`, `banheiro` |
| `preco_valor` | `valor_percebido`, `preco_pizza`, `preco_bebida`, `couvert_ou_taxa` |
| `item_consumido` | Não usa `fator`. O item vai em `resposta_item` |

Os seis fatores de `comida` são exatamente os da tela `T3C3`, e `limpeza.banheiro` tem linha própria de
propósito, porque é o que aparece em avaliação pública negativa.

**Outras listas fechadas:**

| Coluna | Valores |
|---|---|
| `faixa` | `detrator`, `neutro`, `promotor` |
| `canal` (resposta) | `tablet`, `qr` |
| `canal` (alerta) | `email` |
| `papel` (destinatario) | `proprietario`, `gerencia`, `cozinha`, `salao` |
| `finalidade` (consentimento) | `pesquisa`, `contato` |
| `desfecho` (tentativa) | `respondeu`, `recusou` |
| `grupo` (item_cardapio) | `pizza`, `entrada`, `sobremesa` |
| `grupo` (resposta_item) | `pizza`, `entrada`, `sobremesa`, `mais_de_um` |
| `area` (mesa) | `salao`, `varanda` |
| `uso` (dispositivo) | `em_uso`, `reserva` |
| `polaridade` | `positivo`, `negativo`, `neutro` |
| `severidade` | `baixa`, `media`, `alta` |
| `status` | `sucesso`, `erro` |
| `origem` (cliente) | `pesquisa` |
| `rotina` | `watcher_drive`, `cron_classificador`, `cron_digest_16h`, `cron_retencao`, `backup_semanal` |

**Acrescentados depois da implementação**, pelo motivo declarado na seção 6.4. Os dois primeiros são
os que mais doeram por falta: o `CHECK` de `tela_evento.tela` aceitava `T3` e `T4`, nomes que nenhuma
ponta do código escreve, e recusava `ROT1` e `ROT2`, que são os que o quiosque grava. Como
`tela_evento` é inserida **dentro** de `fn_grava_resposta`, a violação derrubava a **resposta inteira**
— cerca de 85% de tudo, porque promotor recebe 2 rotacionadas e neutro 1.

| Coluna | Valores |
|---|---|
| `tela` (tela_evento) | `T0`, `T1`, `T2A`, `T2B`, `T2C`, `T3C`, `T3C1`, `T3C2`, `T3C3`, `ROT1`, `ROT2`, `T5`, `T6`, `T7` |
| `tela` (resposta_opcao) | `T2A`, `T2B`, `T2C`, `T3C`, `T3C3`. **Subconjunto do anterior**, e `ROT1`/`ROT2` ficam de fora de propósito: a resposta da rotacionada vive em `resposta_pergunta_sorteada`, e contá-la aqui faria `vw_fator_contagem` ler um `sim` como menção a um problema |
| `peso` (pergunta_banco) | `alto`, `medio`, `baixo`. Texto, e não número: o fator de foco converte para 4, 2 e 1 dentro de `fn_sorteia_pergunta` |
| `origem` (execucao_importacao) | `watcher_drive`, `painel` |
| `passo` (execucao_rotina) | `consulta`, `envio`. O digest separa os dois porque falha de e-mail não pode desligar o keep-alive do banco |

**`ROT1` e `ROT2`, e não `T3` e `T4`.** A tela **é** a primeira e a segunda pergunta rotacionada, e não
uma tela fixa: `T3` fixo seria mentira, porque o conteúdo muda a cada resposta por sorteio. E
`vw_tela_pulo` mostra a taxa de pulo por nome de tela, onde `ROT1` diz o que é.

**Não existe** coluna de nota de sentimento de 0 a 100, e **não existe** valor de turno `manha`, `tarde`
ou `noite` em lugar nenhum do sistema.

### 3.4 O que esta folha não fixa

A lista completa de colunas de cada tabela, com tipo, nulidade, default e índice, é entrega do documento
de **modelo de dados** da Etapa 4. Esse documento **não pode renomear nada desta folha**, e o que ele
acrescentar precisa entrar aqui na mesma passada.

---

## 4. A regra do dia operacional, escrita uma vez e para sempre

### 4.1 O horário real da casa

Terça a sexta das 18h às 23h. Sábado e domingo das 17h às 23h. **Fecha segunda.** A última mesa sai depois
do horário de fechamento, e é isso que quebra o dia civil.

### 4.2 O corte

**O corte é às 6h da manhã, no fuso `America/Sao_Paulo`. O corte NUNCA é a meia-noite.**

Tudo que entra entre 00:00 e 05:59 pertence à **noite anterior**. Escolhido às 6h porque é folgado contra
o fechamento real (a casa fecha às 23h e a última resposta plausível é de madrugada), e porque 6h é antes
de qualquer atividade do dia seguinte numa casa que só serve jantar.

### 4.3 A função, com o nome exato e o corpo exato

```sql
create function experiencia.fn_dia_operacional(ts timestamptz)
returns date
language sql
immutable
as $$
  select ((ts at time zone 'America/Sao_Paulo') - interval '6 hours')::date
$$;
```

### 4.4 A coluna gerada, com o nome exato

```sql
dia_operacional date
  generated always as (experiencia.fn_dia_operacional(respondido_em)) stored
```

A coluna é **gerada e indexada** em `resposta`. Nas outras tabelas (`venda_produto_dia`,
`mesa_atendida_dia`, `calendario_operacao`, `tentativa`) `dia_operacional` é coluna comum, gravada pela
aplicação, sempre com o valor que veio de `fn_dia_operacional` ou, no caso do R3, da data do arquivo.

### 4.5 Por que o corte é literal na função, e não parâmetro em `configuracao`

Coluna gerada exige função `immutable`, e função `immutable` não pode ler tabela. Portanto **as 6 horas
são literais dentro de `fn_dia_operacional`, e essa função é o "um lugar só" que os critérios de aceite
pedem.** Trocar o corte é uma migration que recria a função e reescreve a coluna gerada, e é bom que
custe isso. Qualquer agente que tentar ler o corte de `configuracao` dentro da coluna gerada vai bater
num erro do Postgres, e é melhor saber disso aqui do que descobrir na hora.

### 4.6 A conferência, com casos resolvidos

| `respondido_em` (hora local) | `dia_operacional` | Por quê |
|---|---|---|
| Quarta, 00h40 | **terça** | Depois da meia-noite e antes das 6h, pertence à noite de terça |
| Sábado, 23h50 | sábado | Antes da meia-noite, dia dele mesmo |
| Domingo, 05h59 | sábado | Último minuto da noite de sábado |
| Domingo, 06h00 | domingo | Primeiro minuto do dia operacional de domingo. A casa só abre às 17h, então resposta nesse horário é anomalia a investigar, não erro de corte |
| Segunda, 01h20 | **domingo** | A madrugada de domingo para segunda é da noite de domingo. Segunda nunca recebe resposta, porque a casa fecha |

### 4.7 As proibições que vêm com a regra

- **Nenhuma consulta, view, função, Worker ou export usa `criado_em::date` nem `date(criado_em)`.** Busca
  por essas duas expressões no repositório tem que voltar zero ocorrência fora de `fn_dia_operacional`.
- Todo gráfico, todo bloco de e-mail e todo corte de painel agrupa por `dia_operacional`, sem exceção.
- Na tela, o rótulo traz a janela real: `terça 12/08, das 18h às 6h`, e não `12/08`.
- O dia da semana sai de `dia_operacional`, nunca da data civil. Segunda não aparece na grade.
- O e-mail das 16h de hoje cobre o `dia_operacional` de **ontem**, fechado, nunca um dia parcial.

### 4.8 A limitação declarada, para não ser descoberta depois

O `dia_operacional` de `venda_produto_dia` vem da **data que o R3 do Altec informa**, sem deslocamento,
porque o corte do dia dentro do Altec é **NÃO VERIFICADO** (é a pergunta 4 do bloqueio `A1`, ao suporte da
Altec). Se o Altec fechar o dia à meia-noite, uma venda lançada às 00h30 cai no dia seguinte no R3 e a
resposta da mesma mesa cai no dia anterior na pesquisa. O cruzamento continua sendo por `dia_operacional`,
e a divergência possível fica escrita aqui e na tela, em vez de ser corrigida por adivinhação.

---

## 5. As rotinas agendadas

### 5.1 As cinco, e só cinco

Os nomes são literais e **não se traduzem nem se renomeiam**, porque `cron_retencao` está nomeada em `D4` e
`backup_semanal` está nomeada em `C6` da folha da Etapa 3, e trocar um nome citado em decisão registrada
custa divergência sem comprar nada.

| Rotina | Onde roda | Frequência e hora (local) | Expressão cron (UTC) | O que faz |
|---|---|---|---|---|
| `watcher_drive` | Cloudflare Workers, Cron Triggers | a cada 30 minutos | `*/30 * * * *` | Olha a pasta sincronizada do Drive e importa o R3 novo |
| `cron_classificador` | Cloudflare Workers, Cron Triggers | 07h, todo dia | `0 10 * * *` | Classifica em lote os comentários do dia operacional anterior |
| `cron_digest_16h` | Cloudflare Workers, Cron Triggers | 16h, todo dia, inclusive segunda | `0 19 * * *` | Monta e envia o digest das 16h, e é o keep-alive do banco |
| `cron_retencao` | Cloudflare Workers, Cron Triggers | mensal, dia 1, 05h | `0 8 1 * *` | Anonimiza dado pessoal com 12 meses da última visita e roda a varredura de padrão no texto aberto |
| `backup_semanal` | GitHub Actions | domingo e quarta, 04h | `0 7 * * 0,3` | `pg_dump`, cifra com `age` e envia ao bucket privado do Backblaze B2 |

O fuso local é `America/Sao_Paulo` (UTC-3, sem horário de verão em 2026). **Se o horário de verão voltar,
as quatro expressões de hora fixa mudam, e é esta tabela que se edita.** Isso está escrito aqui porque é
exatamente o tipo de coisa que quebra em silêncio uma vez por ano.

### 5.2 As regras que vêm com elas

- **Duas plataformas, e não mais que duas.** Cloudflare Workers para as quatro primeiras, GitHub Actions
  para o backup, porque ele precisa de `pg_dump`. Cada plataforma a mais é uma conta a mais que expira em
  silêncio.
- **Não existe rotina `cron_keepalive`, e nenhuma rotina é criada só para manter o banco acordado.**
  Entre a criação do schema e a entrada do digest, quem segura o banco acordado é a escrita do próprio
  `backup_semanal`, duas vezes por semana. Depois que o digest das 16h existe, ele passa a ser o
  keep-alive, e o backup segue sendo backup.
- **Não existe sexta rotina.** Se aparecer necessidade de uma, ela entra nesta tabela antes de existir em
  código.
- **Toda rotina grava uma linha em `execucao_rotina`, com sucesso ou com erro.** No digest, a consulta ao
  banco e o envio do e-mail são passos separados, porque falha de e-mail não pode desligar o keep-alive.
- O alerta de detrator **não é rotina**: ele dispara na gravação da resposta.
- O plano gratuito do Cloudflare dá **5 Cron Triggers por conta** e nós usamos 4. Sobra 1, e ele não é
  para keep-alive.

---

## 6. As views e as funções

### 6.1 Prefixos

| Objeto | Prefixo | Exemplo |
|---|---|---|
| View | `vw_` | `vw_hoje` |
| Função | `fn_` | `fn_dia_operacional` |
| Papel do banco | `experiencia_` | `experiencia_app` |

Nome de view é português sem acento, snake_case, singular do que a linha representa, com a janela no fim
quando ela faz parte do sentido (`_dia`, `_semana`, `_trimestre`, `_mes`).

### 6.2 As views do painel

| View | Tela | O que devolve | Grão |
|---|---|---|---|
| `vw_hoje` | `/painel` | Respostas, conversão, detratores e promotores do dia operacional fechado, em contagem | Um dia operacional |
| `vw_distribuicao_faixa_dia` | `/painel` | Contagem de 0 a 6, de 7 e 8, de 9 e 10 | Uma faixa por dia operacional |
| `vw_nps_janela` | `/painel/tendencia` | NPS, `n`, erro padrão e faixa de 95% | Uma janela de datas |
| `vw_semana_detrator` | `/painel/tendencia` | Contagem de detratores por semana operacional, com o número de dias abertos da semana | Uma semana operacional |
| `vw_dia_semana` | `/painel/tendencia` | Este sábado contra a média dos últimos 4 sábados, com os dois `n` | Um dia da semana por janela |
| `vw_fator_contagem` | `/painel` | Menções por dimensão e fator, em contagem absoluta | Um fator por janela |
| `vw_garcom_trimestre` | `/painel/garcons` | Nota e conversão por garçom, com `n` obrigatório | Um garçom por trimestre |
| `vw_item_trimestre` | `/painel/pratos` | Reclamações por item e a média de reclamações por item do cardápio, lado a lado | Um item por trimestre |
| `vw_coleta_dia` | `/painel/coleta` | Respostas sobre mesas atendidas, suspeitas, PIN não reconhecido, respostas por dispositivo | Um dia operacional |
| `vw_tela_pulo` | `/painel/coleta` | Exibições e pulos por tela, no mês | Uma tela por mês |
| `vw_duracao_semana` | `/painel/coleta` | Mediana e p90 da duração, separando caminho com digitação de caminho sem | Uma semana por tipo de caminho |
| `vw_pergunta_desempenho` | `/painel/coleta` | Sorteadas e respondidas por pergunta, no mês e no trimestre | Uma pergunta por janela |
| `vw_venda_dia` | `/painel/tendencia` | Faturamento, ticket médio e os dois produtos mais vendidos | Um dia operacional |
| `vw_satisfacao_venda_dia` | `/painel/tendencia` | O cruzamento satisfação e faturamento, junção por `dia_operacional` | Um dia operacional |
| `vw_cliente_mes` | `/painel/clientes` | Contatos deixados, taxa de contato sobre respostas e contagem por mês | Um mês |
| `vw_alerta_incidente` | `/painel` | Detectados, contatados e tempo até o primeiro contato em minutos | Um alerta |
| `vw_dispositivo_sinal` | `/painel/saude` | Cada aparelho pelo apelido, com hora do último sinal e fila pendente | Um aparelho |
| `vw_saude_rotina` | `/painel/saude` | As últimas 30 execuções de cada rotina, com hora e status | Uma execução |
| `vw_custo_prato` | `/painel/pratos` | Custo por prato numa data de referência, com `WITH RECURSIVE`, lendo as tabelas de custo em modo somente leitura | Um prato por data de referência |

**Acrescentadas depois da implementação**, pelo mesmo motivo declarado na seção 6.4: a folha estava
atrás do SQL, e folha atrasada tem precedência e mente. As quatro nasceram de dado que era **gravado
e nunca lido**, que é trabalho pedido ao cliente sem retorno nenhum.

| View | Tela | O que devolve | Por que ela existe |
|---|---|---|---|
| `vw_pergunta_resposta` | `/painel/coleta` | A distribuição das respostas das rotacionadas, com o **rótulo** de cada opção ao lado do índice | `resposta_pergunta_sorteada.opcao_indice` era gravada e nenhuma view a devolvia. A pergunta era feita a cada promotor, todas as noites, e a resposta não podia ser vista |
| `vw_importacao` | `/painel/coleta` | O log das importações de R3, com os dias que cada arquivo cobriu e quem subiu | `dias_lidos` e `importado_por` tinham o mesmo problema. Sem leitura, "qual dia este arquivo cobriu" exigia abrir o arquivo, e "quem subiu esta planilha" — a primeira pergunta quando um faturamento não fecha — não tinha resposta |
| `vw_exclusao_pedido` | `/painel/admin` | Os pedidos de titular, abertos primeiro, com os dias em aberto e o prazo interno de 7 dias | `exclusao_pedido` tinha índice para os pedidos abertos e nenhuma leitura: o índice servia uma consulta que ninguém escreveu |
| `vw_gravacao_diagnostico` | `/painel/saude` | As partes de resposta que o banco recusou na gravação, por dia e por tipo | A gravação passou a ser resiliente: filha que o banco recusa é descartada e a **resposta entra**, porque a nota é o único dado obrigatório. Esta view é o que impede o descarte de ser silencioso — sem ela, "descartar e seguir" seria engolir erro |
| `vw_texto_a_classificar` | nenhuma | Os textos de um dia ainda não classificados | View de **trabalho** da rotina `cron_classificador`, que a consultava desde que foi escrita. Ela nunca havia sido criada: a rotina rodaria todo dia e devolveria 404 |

### 6.3 As views de exportação

| View | O que exporta |
|---|---|
| `vw_exportacao_resposta` | Respostas com nota, faixa, dia operacional, canal, garçom e mesa |
| `vw_exportacao_opcao` | Opções marcadas, com dimensão e fator |
| `vw_exportacao_item` | Itens apontados, com fator |
| `vw_exportacao_comentario` | Texto cru com a classificação ao lado |
| `vw_exportacao_cliente` | Base de clientes. Exige login de administrador e fica registrada em `execucao_rotina` |
| `vw_exportacao_venda` | Venda por produto e dia operacional |

**Regra que vale em todas:** toda linha agregada exportada carrega o `n`. Sem exceção.

**E elas têm tela.** As seis existiam desde a primeira migration e nenhuma tela as lia: a promessa de
portabilidade estava escrita, o SQL estava escrito, e não havia como um humano baixar nada — que é o
mesmo que não existir, para quem precisa levar o dado embora. A aba `/painel/exportar` baixa as seis.

**A leitura pagina e confere.** O PostgREST hospedado corta em 1000 linhas por resposta **sem erro e
sem aviso**, e um ano de coleta passa disso com folga. A leitura do painel pagina até o fim e compara
o total lido com a contagem do servidor; se divergir, o arquivo **não** é gerado e a tela mostra o
motivo. Exportação truncada em silêncio vira decisão errada; exportação que falha vira tentativa de
novo.

### 6.4 As funções

**Atualizado depois da implementação.** A versão anterior desta seção listava cinco funções, e o SQL
criava onze. A regra 2 da seção 0 diz que nome que falta entra por edição desta folha **primeiro**, e
essa regra foi violada durante a construção — o que se conserta aqui, e não deixando a folha
desatualizada, porque folha desatualizada é pior que folha ausente: ela tem precedência e mente.

| Função | O que faz |
|---|---|
| `fn_dia_operacional(timestamptz) returns date` | O corte às 6h. É a única definição do dia operacional do sistema. **`immutable` de verdade**: usa `at time zone interval '-03:00'` e não o nome do fuso, porque `at time zone <texto>` é `stable` e a coluna gerada exige imutabilidade |
| `fn_faixa_nps(smallint) returns text` | Devolve `detrator`, `neutro` ou `promotor` |
| `fn_fator_valido(text, text) returns boolean` | O par (dimensão, fator) da seção 3.3. Sustenta o `CHECK` de `resposta_opcao`, `classificacao_texto` e `pergunta_banco` |
| `fn_casa_abre(date) returns boolean` | Padrão semanal (fecha segunda) com `calendario_operacao` sobrepondo. É o que faz o digest escrever `casa fechada` em vez de `nenhuma resposta coletada` |
| `fn_sorteia_pergunta(uuid, text, timestamptz) returns setof uuid` | As regras de sorteio do banco, em código, nunca em planilha. **NÃO está no caminho ativo hoje**: quem sorteia é o cliente, porque o sorteio acontece no meio do fluxo e o quiosque tem de funcionar sem rede. Ela é a definição completa — a única que implementa a regra 6, que depende do que outros aparelhos sortearam na mesma noite — e fica para o dia em que houver caminho online. Ver a seção 6.6 |
| `fn_grava_resposta(jsonb) returns uuid` | O único caminho de escrita do PWA para resposta, com escopo restrito. O tablet não tem `INSERT` direto e não lê a base de clientes |
| `fn_registra_sinal(jsonb) returns void` | O heartbeat do aparelho. É escrita **sem resposta associada**, e por isso não cabe em `fn_grava_resposta`. Não cria linha: aparelho desconhecido é ignorado, porque o cadastro dos 5 tablets é ato humano e não efeito de heartbeat |
| `fn_mascara_contato(text) returns text` | A varredura de telefone, e-mail e CPF em texto livre (`D4`). Sem ela, os 12 meses de retenção são contornados pelo próprio texto que se pretende preservar |
| `fn_aplica_retencao(integer) returns jsonb` | A rotina **mensal**: anonimiza quem passou de 12 meses da última visita e varre o texto. `UPDATE` para nulo, nunca `DELETE` |
| `fn_marca_atualizado() returns trigger` | Carimba `atualizado_em`. Existe porque a coluna tinha `default now()` e **nada a escrevia**: ela dizia, para sempre, que o parâmetro foi atualizado quando ele foi criado |
| `fn_atende_exclusao(uuid, text) returns jsonb` | O pedido **individual** de titular. Anonimiza e carimba o pedido na mesma transação: em duas chamadas existiria um estado com o pedido atendido e o dado ainda no banco |
| `fn_grava_resposta` e `fn_registra_sinal` | são as **duas, e só duas**, que o PWA chama |

### 6.6 As duas implementações do sorteio, e por que existem duas

`01-arquitetura` afirmava que o sorteio "vive em `fn_sorteia_pergunta`, no banco, e **não é copiado
para o cliente**", com a razão certa ("duas definições é como se produz divergência que ninguém
audita"). **Isso nunca foi verdade**, e a afirmação foi corrigida: `sorteiaPerguntas` em
`src/coleta/questionario.ts` sempre foi a única que roda, e nada no sistema chama a função do banco.

Duas existem porque o sorteio acontece **no meio do fluxo**, com o cliente na mesa, antes de a
resposta existir — e o quiosque tem de funcionar sem rede. Uma ida ao banco ali transformaria uma
tela de dois segundos numa espera, e uma noite sem Wi-Fi em nenhuma pergunta rotacionada.

| Regra | Cliente | Banco |
|---|---|---|
| 1. Quantidade pela faixa (promotor 2, neutro 1, detrator 0) | sim | sim |
| 2. Uma por dimensão | sim | sim |
| 3. Suprime a dimensão coberta pela ramificação de nota baixa | sim | sim |
| 4. Fator de foco | sim | sim |
| 5. Sem repetição dentro da mesma resposta | sim | sim |
| 6. Não repetir na mesma mesa na mesma noite | **não** | sim |

A regra 6 é a única divergência, e ela é declarada e não acidental: depende do que **outros
aparelhos** sortearam na mesma noite, e nenhum aparelho sabe isso sem rede. A consequência é
limitada — duas festas na mesma mesa na mesma noite podem receber a mesma pergunta — e o custo de
errar é uma repetição, e não um número errado.

### 6.5 Os papéis do banco

| Papel | Permissão |
|---|---|
| `experiencia_app` | Escrita **só** no schema `experiencia`, mais `SELECT` nas cinco tabelas de custo em `public`. Tentativa de `INSERT` em tabela fiscal tem que falhar, e isso é critério de aceite |
| `experiencia_leitura` | `SELECT` no schema `experiencia`, para o painel |
| `authenticated` | Recebe **diretamente** o mesmo `SELECT` de `experiencia_leitura`, e não por herança. Os papéis do Supabase são `noinherit`, então `grant experiencia_leitura to authenticated` não transporta privilégio nenhum e o painel não leria uma linha |
| `authenticator` | O papel de conexão do PostgREST. É membro de `experiencia_app`, o que permite ao Worker escrever **com o papel restrito** em vez de com `service_role` |

**O papel com que o Worker escreve decide se esta tabela vale.** Com `service_role`, que tem
`BYPASSRLS` e privilégio no `public` do sistema fiscal, nada aqui vale. O Worker assina um JWT curto
com `role: experiencia_app` quando `SUPABASE_JWT_SECRET` está configurado, e `GET /api/saude`
responde qual dos dois está ativo. **NÃO VERIFICADO** até a primeira implantação: se o PostgREST
hospedado aceita papel custom no claim `role`, e se o projeto tem o segredo HS256 legado.

RLS habilitado em **todas** as tabelas de `experiencia`, sem exceção, e a chave de serviço nunca no
bundle publicado do PWA.

**Append-only por permissão, e não por comentário.** Nove tabelas não têm `UPDATE` nem `DELETE` para
`experiencia_app`: `resposta` e as cinco filhas, `tentativa`, `consentimento`, `consentimento_texto` e
`convite_clique`. Uma invariante no fim da migration de RLS derruba a aplicação se alguma delas
ganhar `UPDATE`, ou se a política `app_update` reaparecer nelas.

---

## 7. Os números canônicos

Uma linha cada, com o valor literal. **Onde um documento anterior traz outro número, vale este.**

| # | Número | Valor literal |
|---|---|---|
| N01 | Chamadas ao LLM, classificação | **cerca de 2 por dia, com teto de 10 em noite cheia** (`C12` da folha da Etapa 3, número único do projeto) |
| N02 | Chamadas ao LLM, redação do diagnóstico | **1 por dia**, dentro de `cron_digest_16h` |
| N03 | Consumo da cota de LLM | **menos de 0,1% da cota diária gratuita do Groq** |
| N04 | Modelos de LLM | classificação em `llama-3.1-8b-instant`, redação em `llama-3.3-70b-versatile`, provedor **Groq**, escolhido por contrato de privacidade e não por limite |
| N05 | Faixa de 95% do NPS, fórmula | **1,96 vezes o erro padrão**, com erro padrão em `raiz((p_promotores + p_detratores - NPS²) / n)` |
| N06 | Faixa de 95% com n=50 | erro padrão **10,5**, faixa **±20,6 pontos** |
| N07 | Faixa de 95% com n=100 | erro padrão **7,4**, faixa **±14,5 pontos** |
| N08 | Faixa de 95% com n=200 | erro padrão **5,2**, faixa **±10,3 pontos** |
| N06b | Correção de N06 | A faixa de n=50 era **±20,5** e o valor certo é **±20,6**. Com o numerador de variância de 0,55 que N06 a N08 assumem, `raiz(0,55/50) × 100 = 10,4881` e `1,96 × 10,4881 = 20,56`, que arredonda para 20,6. Mesmo partindo do erro padrão já arredondado, `1,96 × 10,5 = 20,58`. N07, N08 e N09 já estavam certos, e continuam |
| N09 | Diferença mínima detectável entre dois períodos | **±29 pontos** com n=50, **±20,5** com n=100, **±14,5** com n=200 (a faixa vezes raiz de 2) |
| N10 | Retenção de dado pessoal | **12 meses contados da última visita**, apagado por `cron_retencao` |
| N11 | Retenção da resposta da pesquisa | **indefinidamente, desvinculada do contato**, depois da varredura de padrão (telefone, e-mail, CPF) no texto aberto |
| N12 | Retenção do backup | **8 semanas**, por lifecycle do bucket: `daysFromUploadingToHiding = 56` e `daysFromHidingToDeleting = 1` |
| N13 | Tablets | **5**, sendo **4 em uso e 1 de reserva** (`D5`) |
| N14 | Licenças de quiosque | **5 licenças Fully Kiosk PLUS a 8,90 EUR cada, pagamento único, 44,50 EUR no total** |
| N15 | Preço do tablet em BRL | **NÃO VERIFICADO.** Cotar no ato. Única referência independente: cerca de 180 EUR por unidade |
| N16 | Teto de tempo do questionário | **45 segundos**, medido como p90 do caminho sem digitação. Se passar, uma tela sai |
| N17 | Timeout de inatividade no tablet | **45 segundos**, com contagem visível nos **15 finais**, e a nota já dada é gravada |
| N18 | Auto-reset da tela final `T7` | **8 segundos** |
| N19 | Perguntas ativas no banco | **12 no arranque, 20 no teto.** Os dois são da mesma escada, e subir de 12 para 20 é decisão de leitura do painel |
| N20 | Perguntas em foco | **de 2 a 4 por mês, somando 50% das impressões** |
| N21 | Supabase Free | **500 MB** de banco, **pausa após 1 semana de inatividade**, **nenhum backup** no plano gratuito, teto de **2 projetos ativos por organização, já atingido** |
| N22 | Cloudflare Workers Free | **100.000 requisições por dia**, **10 ms de CPU por invocação**, **5 Cron Triggers por conta** |
| N23 | Resend Free | **100 e-mails por dia**, **3.000 por mês**, retenção de log de **30 dias**. O digest usa 5 por dia |
| N24 | Groq Free | `llama-3.1-8b-instant` **14.400 requisições por dia**, `llama-3.3-70b-versatile` **1.000 por dia** |
| N25 | GitHub Actions Free | **2.000 minutos por mês** em repositório privado. O backup consome cerca de **1,5%** |
| N26 | Backblaze B2 | **primeiros 10 GB de armazenamento sempre grátis**, chamadas de API classe A, B e C gratuitas, **sem cartão de crédito** |
| N27 | Janela de duplicidade por mesa | **20 minutos** no mesmo dia operacional, e a segunda resposta é **aceita, agradecida e gravada com `suspeita = true`** |
| N28 | Teto de respostas por dispositivo por dia | **30**. Acima disso, linha de aviso no e-mail das 16h |
| N29 | Métrica da trava de fraude | **respostas suspeitas abaixo de 3% e estável** |
| N30 | Alerta de detrator | nota **0 a 6**, disparo em menos de **30 segundos**, e resposta que chegou com mais de **20 minutos** de atraso vai marcada como atrasada |
| N31 | Heartbeat | aparelho sem contato por mais de **24 horas**, ou fila pendente acima de **5 respostas** por mais de **2 horas** |
| N32 | `n` mínimo para proporção | **20** (garçom no trimestre, pergunta em foco no mês, faixa horária no trimestre). Abaixo disso a tela escreve `amostra insuficiente, n=x` |
| N33 | Item do cardápio sinalizado | mínimo de **3 eventos de reclamação no trimestre** e **30 unidades vendidas** no trimestre |
| N34 | Alvos de toque | mínimo **44 x 44 px**, e os 11 botões de nota entre **60 e 80 px de lado**, em duas fileiras de 6 e 5 |
| N35 | Desempenho de tela | transição abaixo de **2 segundos** no tablet, painel abrindo em menos de **3 segundos** em 4G no celular |
| N36 | Limiar de pulo por tela | **60%**, e acima disso a tela é candidata a reescrita |
| N37 | Contraste | preto `#1A1E1E` sobre `#EFECEC` dá **14,3:1** e é o padrão. Texto secundário em `#A0A5A5` sobre fundo claro dá **2,1:1** e é proibido |
| N38 | Operação da casa | **22 mesas** (16 no salão, 6 na varanda), até **20 mesas atendidas por dia**, cerca de **520 mesas por mês** em 26 dias |
| N39 | Volume de respostas | **50 a 200 por mês** hoje, meta de **150 por mês**, que equivale a cerca de **29%** das mesas atendidas |
| N40 | Histórico a migrar | **74 linhas** de `cliques_avaliacao`, e é o único dado histórico a migrar |
| N41 | Blocos do digest | **8**, e o e-mail de `Nada a relatar` tem no máximo **10 linhas** |
| N42 | Alarme único do sistema | **se o e-mail das 16h não chegar dois dias seguidos, algo quebrou** |
| N43 | Cobranças no digest | arquivo do R3 ausente por **2 dias operacionais**, `mesa_atendida_dia` vazio por **3 dias**, pedido de exclusão aberto há mais de **7 dias**, PIN não reconhecido acima de **3 no dia** |
| N44 | Alerta de queda de tendência | **3 ou mais** detratores acima da semana anterior, com a série das últimas **4 semanas** em contagem |
| N45 | Capacidade individual de cada mesa | **NÃO VERIFICADO.** Pendência do proprietário (`P5`) |
| N46 | Semântica de `rn`, `rendimento` e `rn_override` | **NÃO VERIFICADO.** É premissa declarada, nunca fato, e o painel escreve que o número não está conferido enquanto o proprietário não confirmar |

Dois números que existem e não são deste projeto, e por isso ficam registrados como referência externa e
nada mais: a alternativa de mercado publica **R$ 575,00 por ano à vista, equivalentes a R$ 47,92 por mês**,
e a mensalidade atual está entre **R$ 501 e R$ 1.000 por mês, sem fidelidade e sem multa**.

---

## 8. Convenção de nomenclatura

| Item | Regra | Exemplo correto | Exemplo errado |
|---|---|---|---|
| Idioma dos identificadores | **Português sem acento** | `garcom`, `execucao_rotina` | `waiter`, `garçom`, `import_execucao` |
| Caso | **snake_case**, tudo minúsculo | `dia_operacional` | `diaOperacional`, `DiaOperacional`, `DIA_OPERACIONAL` |
| Número | **Singular** para tabela e para view | `resposta`, `vw_hoje` | `respostas`, `vw_respostas` |
| Ordem das palavras | Substantivo da coisa primeiro, qualificador depois. Filha de `resposta` leva o prefixo `resposta_` | `item_cardapio`, `resposta_opcao` | `cardapio_item`, `opcao_resposta` |
| Prefixo de view | `vw_` | `vw_garcom_trimestre` | `v_garcom`, `view_garcom` |
| Prefixo de função | `fn_` | `fn_dia_operacional` | `f_dia_op`, `get_dia_operacional` |
| Prefixo de papel | `experiencia_` | `experiencia_app` | `app_user`, `anon2` |
| Marca de tempo | sufixo `_em` para `timestamptz` | `aceito_em` | `data_aceite`, `accepted_at` |
| Data | `dia_operacional`, ou sufixo `_dia` | `mesa_atendida_dia` | `data`, `dt_ref` |
| Booleano | afirmativo, sem `nao_` | `ativo`, `suspeita`, `garcom_reconhecido` | `nao_ativo`, `is_active`, `flag_susp` |
| Chave estrangeira | nome da tabela apontada mais `_id` | `garcom_id`, `resposta_id` | `id_garcom`, `fk_garcom` |
| Valor de lista | minúsculo, sem acento, snake_case | `precisao_pedido` | `Precisão do Pedido`, `PRECISAO` |
| Arquivo de migration | `supabase/migrations/AAAAMMDDHHMMSS_verbo_objeto.sql`, com hora em UTC e verbo em `cria`, `altera`, `remove`, `semeia` ou `corrige` | `20260817090000_cria_schema_experiencia.sql` | `migration1.sql`, `fix.sql`, `20260817_final_v2.sql` |
| SQL que não é migration | `sql/` no repositório, por assunto | `sql/consulta_custo_prato.sql` | consulta colada no painel do Supabase |

Três regras de processo que fazem parte da convenção:

1. **Migration aplicada nunca é editada.** Correção é migration nova. O repositório é a única fonte de
   schema, e nada se conserta ad hoc pelo painel do Supabase.
2. **Uma migration por assunto**, com nome que diz o assunto. `cria_tabela_resposta` é nome; `ajustes` não.
3. **Nenhum identificador vindo do PDV é chave primária.** `produto_id_pdv` é atributo de junção, e
   `item_cardapio.id` é do QT. Trocar de PDV precisa custar um adaptador, nunca a reescrita do histórico.

---

## 9. Expressões proibidas

Cada linha traz a expressão, o motivo e o que se escreve no lugar. **Busca no repositório por qualquer uma
delas só pode voltar ocorrência dentro desta seção ou precedida de "não existe".**

### 9.1 Revogadas por `D1` a `D8`

| Expressão proibida | Motivo | No lugar |
|---|---|---|
| `ponte`, `ponte de coleta` | `D1` comprou os tablets antes do cancelamento, e a ponte existia só para cancelar na semana 1 | Nada. A coleta própria é o PWA de quiosque |
| `M0` | O marco deixou de existir com `D1` | Os marcos são **M1 Coleta própria**, **M2 Decisão**, **M3 Recorrência** |
| `piso menor de quatro itens` | Sem cancelamento antecipado, o piso é o de vinte itens do sistema próprio | `piso de aceite`, cobrado no `dia da devolução do tablet locado` |
| `dia da troca` | Foi usada com dois sentidos na Etapa 3 | `dia da devolução do tablet locado` |
| `organização Supabase separada`, `novo projeto Supabase` | `D2`, e a inspeção: existe uma organização e o teto de 2 projetos ativos já está atingido | `schema experiencia dentro de NFe e Financeiro` |
| `ramo alternativo de P2`, `rotina diária de cópia de custo`, `us-east-1` para dado novo | `P2` está respondida por `D2`. Ramo de contingência de pergunta respondida é texto que alguém executa por engano | Nada. O `JOIN` direto existe porque o schema vive no mesmo projeto |
| `detecção de divergência entre a pesquisa e a avaliação pública` | `D3`. Não se compara com o que não se lê | A auditoria por IA tem **três** itens: queda de tendência, padrão repetido de falha, prato com problema |
| `API do Google Business Profile`, `API do iFood`, `Basic API Access` | `D3`, nem no MVP nem na Fase 2 | Dois links no painel, e nada mais |
| `abrir o Portal do Parceiro do iFood toda semana` | `D3` tirou essa tarefa da lista. São **seis** deveres humanos, não sete | Nada. A leitura do Portal é o que o proprietário já faz por conta própria |
| `meta por nota`, `ranking mensal de garçom`, `semáforo de desempenho`, `bônus por avaliação`, `comissão por nota` | `D8`, por dois motivos independentes: contamina o dado e é proibido por texto oficial do Google | Metas de **processo**: conversão sobre mesas atendidas, tempo até o primeiro contato, taxa de recuperação |
| `review gating`, `convite ao Google condicionado à nota` | `D6`: os dois QR são fisicamente separados e o do Google não tem nota no caminho | `QR da pesquisa` e `QR do Google`, sempre citados em separado |
| `1 tablet em uso mais 1 de reserva`, `2 tablets` | `D5` fechou em favor do briefing | **5 tablets, 4 em uso e 1 de reserva**, e 5 licenças |
| `gpg simétrico`, `chave simétrica` para o backup | `D7`: com chave simétrica o GitHub guardaria o pacote e a chave que o abre | `age` **assimétrico**, com a chave pública no runner e a privada fora dele |
| `artefato do GitHub Actions` como destino do backup | `D7`: uso vedado nos Termos Adicionais, com punição que levaria repositório e backups no mesmo evento | Bucket privado no **Backblaze B2**, com lifecycle de 56 dias |

### 9.2 Revogadas por esta folha, porque eram nome divergente

| Expressão proibida | No lugar |
|---|---|
| `resposta_uuid` | `resposta.id` e, nas filhas, `resposta_id` |
| `resposta_prato` | `resposta_item` |
| `comentario_trecho` | `classificacao_texto` |
| `comentario_bruto` | `resposta_texto.texto_cru` |
| `pergunta` como nome de tabela | `pergunta_banco` |
| `contato` como nome de tabela | `cliente` |
| `alerta` como nome de tabela | `alerta_detrator` |
| `heartbeat_dispositivo` | colunas de sinal dentro de `dispositivo` |
| `import_execucao` | `execucao_importacao` |
| `mesas_atendidas_dia` | `mesa_atendida_dia` |
| `fila_respostas` | `fila_resposta` |
| `idioma_sessao` | `idioma` |
| `mesa_reconhecida` | `mesa_id is null` |

### 9.3 Revogadas por número errado ou por desenho errado

| Expressão proibida | Motivo | No lugar |
|---|---|---|
| `cron_keepalive` | Nenhuma rotina é criada só para manter o banco acordado | `backup_semanal` até o digest existir, e o `cron_digest_16h` depois |
| `9 chamadas por dia` ao LLM | Número de Etapa 2, revogado por `C12` | `cerca de 2 por dia, teto de 10` |
| `possivelmente data mais turno` como chave de junção | Junção é por `dia_operacional`, e ponto | `dia_operacional` |
| `Manhã`, `Tarde`, `Noite` como turno | Numa casa só de jantar isso produz buckets vazios | Faixa horária sobre `dia_operacional`: **até 20h30 e depois de 20h30**, corte opcional de leitura, nunca dimensão de junção |
| `junção por comanda`, `junção por mesa` com o PDV | O R3 trazer comanda é `DESCONHECIDO`, e nada pode esperar por isso | `dia_operacional` |
| `criado_em::date`, `date(criado_em)` | Reintroduz o defeito que o projeto existe para corrigir | `dia_operacional` |
| `nota média geral` como indicador principal | Em 20 mesas por dia a média esconde exatamente quem vai reclamar em público | Distribuição em três faixas, em contagem |
| `nota de sentimento de 0 a 100` | Indicador de vaidade disfarçado de precisão | `polaridade` e `severidade` |
| `índice composto proprietário`, `Índice Risposta` | A fórmula publicada não fecha no exemplo oficial dela | NPS e fator, com a fórmula escrita na tela |
| `100% dos itens do cardápio ativo casam` | Aceite impossível antes do primeiro import | `conferido contra um arquivo R3 exportado à mão`, e item sem venda fica como `sem venda no período` |
| `soma plana de prato_ingredientes` | Insumo de tipo `producao_interna` tem lista própria, e soma plana dá número errado | `WITH RECURSIVE` em `vw_custo_prato` |
| `Raspberry Pi` | Ponto de falha físico no salão para uma tarefa que um cron na nuvem faz de graça | `watcher_drive` mais o botão de importar planilha |
| `fingerprinting` do celular do cliente | Tratamento oculto: o titular não pode se opor ao que não sabe que existe | Identificação do aparelho **da casa**, em `dispositivo` |
| `cupom`, `voucher`, `convite ao Google` na tela final | A tela final apenas agradece | `T7` só agradece e reseta em 8 segundos |
| `raspagem` de avaliação de concorrente | Quebra em silêncio e esbarra nos termos do Maps | Anotar a nota de 4 pizzarias comparáveis, 1 vez por trimestre |
| `conversa com os dados em texto livre` no MVP | Texto para SQL erra em silêncio e ninguém vai auditar | Perguntas fixas com consulta escrita e revisada, na M3 |
| `cliente oculto`, `benchmark de setor` como entrega | Um é serviço humano com metodologia não pública, o outro é estruturalmente irreplicável | Auditoria por IA sobre dado real, e a anotação trimestral |
| `SMS`, `push` como canal de campanha | Um transforma sucesso em fatura crescente, o outro exige app instalado | E-mail no plano gratuito, na Fase 2 |
| `DDL ad hoc pelo painel` | Condição 2 de `D2` | Migration versionada, sempre |

### 9.4 Preços refutados, que não podem aparecer em nenhum documento

Aqui os valores errados **não são reproduzidos**, de propósito: reimprimir o número refutado é o caminho
mais curto para alguém copiá-lo de volta. Cada linha descreve a afirmação proibida e traz o valor correto.

| Afirmação proibida | O que se escreve |
|---|---|
| Qualquer preço parcelado atribuído à Avalio (a parcela mensal que circulou na pesquisa original está **refutada**) | **R$ 575,00 por ano à vista, equivalentes a R$ 47,92 por mês** |
| Qualquer preço de licença Fully Kiosk diferente de 8,90 EUR (o valor menor que circulou está **refutado**) | **8,90 EUR por aparelho, pagamento único**, 5 licenças, 44,50 EUR no total |
| Qualquer faixa de preço em reais para o tablet (a faixa que circulou está **refutada**) | **NÃO VERIFICADO em BRL.** Cotar no ato. Única referência independente: cerca de 180 EUR por unidade |
| Qualquer preço em dólar atribuído a Tattle, Cloutly ou HappyOrNot (os três valores que circularam estão **refutados**) | Preço **NÃO PÚBLICO** nos três casos |
| Penalidade de ranqueamento no Google como consequência de review gating | **NÃO VERIFICADO.** O que está verificado é a proibição na política de conteúdo, não a consequência de ranqueamento |
| A cláusula do Google sobre pedir avaliação dentro do estabelecimento tratada como fato fechado | O que está verificado: o Google **recomenda** imprimir e exibir o QR e incluí-lo no recibo, e proíbe **exigir e pressionar** e a solicitação seletiva de avaliação positiva |

---

## 10. Precedência de documentos

Quando dois documentos divergirem, vence o que estiver mais alto nesta tabela. A coluna da direita diz o
que cada nível tem autoridade para decidir, e é ela que resolve o caso difícil.

| Nível | Documento | Do que ele é dono |
|---|---|---|
| 1 | [`docs/01-decisoes.md`](../01-decisoes.md), `D1` a `D8` | Decisão de produto, de escopo e de arquitetura. **Vence tudo, inclusive esta folha** |
| 2 | [`docs/pesquisa/dados/10-supabase-inspecao.md`](../pesquisa/dados/10-supabase-inspecao.md), [`12-schema-custo-inspecao.md`](../pesquisa/dados/12-schema-custo-inspecao.md), [`11-backup-e-politica-google.md`](../pesquisa/dados/11-backup-e-politica-google.md) | **Fato verificado do ambiente**: nome de tabela existente, contagem de linhas, tipo de coluna, limite lido em página oficial. Fato não perde para texto: se esta folha contradisser um fato lido, o fato vence e a folha se corrige |
| 3 | **Esta folha**, `docs/arquitetura/00-canonico.md` | **Nome, número canônico e convenção.** Nenhum documento de nível 4 ou abaixo pode renomear nada daqui |
| 4 | [`docs/00-briefing.md`](../00-briefing.md) | Escopo travado: o que a casa quer, o que está cortado, as quatro definições de sucesso |
| 5 | Demais documentos da Etapa 4, em `docs/arquitetura/` | Desenho detalhado: modelo de dados, SQL, telas, rotinas, LGPD, operação |
| 6 | [`docs/pesquisa/etapa-3/00-canonico.md`](../pesquisa/etapa-3/00-canonico.md), `C1` a `C16` | Reconciliação da Etapa 3. Continua valendo onde esta folha não falou |
| 7 | [`etapa-3/02-replicar.md`](../pesquisa/etapa-3/02-replicar.md), depois [`04-cortar-e-backlog.md`](../pesquisa/etapa-3/04-cortar-e-backlog.md), depois [`03-superar.md`](../pesquisa/etapa-3/03-superar.md), depois `01-grid-comparativo.md`, `05-critica.md`, `06-reverificacao.md`, `07-conferencia-final.md` | Feature com critério de aceite (`Fxx`), backlog e marcos, mecânicas de superação. Nesta ordem interna |
| 8 | Dossiê da Etapa 2: `00-sumario-executivo.md`, `07-matriz-features.md`, `01` a `06` | Pesquisa de mercado. **Tem errata no topo** e é o nível mais fraco: onde ele divergir de qualquer nível acima, está revogado |

Quatro regras de desempate, para não sobrar caso ambíguo:

1. **Nome sempre se resolve no nível 3.** Nenhum outro nível cria, traduz ou pluraliza nome.
2. **Número se resolve no nível 3, salvo se o nível 2 tiver um valor lido em fonte oficial** que
   contradiga. Nesse caso o número desta folha se corrige, e a correção é editada aqui antes de aparecer
   em qualquer outro lugar.
3. **Migration aplicada é fato, não texto.** Se o banco divergir desta folha depois de aplicada uma
   migration, a correção é uma migration nova, nunca a edição silenciosa de um documento.
4. **Divergência declarada de propósito continua valendo.** Duas existem e nenhuma é erro: a restauração
   do dump (uma vez antes do go-live é piso, uma por trimestre é o recomendado por cima) e o canal do
   alerta em tempo real (e-mail com push agora, ou Fase 3 com WhatsApp se a casa recusar aparelho com push
   em serviço). As duas dependem do proprietário, e as duas ficam escritas nos dois lados.

---

## 11. O que esta folha deliberadamente não decide

Fica escrito para que ninguém preencha o vazio com invenção.

| Em aberto | Quem responde | O que trava |
|---|---|---|
| Para onde apontam hoje os QR por garçom (`P1`) | Proprietário | A reimpressão dos QR. É a única pendência que pode estar causando dano em curso |
| Quem executa, com nome, cada um dos seis deveres humanos recorrentes, e quem responde quando o e-mail das 16h não chega dois dias seguidos | Proprietário | Decide se a restrição "ninguém vai manter" é premissa ou ficção. Dever sem dono é dever cortado |
| Qual bucket e sob qual conta, no Backblaze B2, e a geração do par de chaves `age` | Proprietário | `backup_semanal` não entra no ar sem isso, porque ele leva a base de clientes inteira para fora do Supabase |
| Semântica de `rn`, `rendimento` e `rn_override`, e a precedência entre eles | Proprietário | `vw_custo_prato` sai com premissa declarada, e o painel escreve que o número não está conferido |
| Onde vive o app de reservas (`P4`) | Proprietário | Toda integração com o CRM de reservas, na M3 |
| Nome do produto e subdomínio (`P6`) | Proprietário | O DNS, que precede SPF e DKIM, que precedem o digest chegar sem cair em spam |
| Capacidade individual das 22 mesas, e prints das perguntas atuais (`P5`) | Proprietário | Nada. É calibragem |
| As 8 perguntas ao suporte da Altec (`A1`), em especial o agendamento do R3 e se ele traz mesa, comanda e horário | Suporte da Altec | Nada. Melhora o sistema se responder bem, e o cronograma não espera |

**Nenhuma dessas pendências autoriza inventar nome, número ou coluna.** Onde faltar resposta, escreve-se
`NÃO VERIFICADO` com essas palavras, e o painel escreve o mesmo para quem lê.
