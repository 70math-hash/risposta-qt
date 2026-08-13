# 05. Integrações: o que dá para ligar, a que custo e com que risco

> Base: `dados/05-tecnico.json` (viabilidade de 12 temas técnicos), `dados/08-altec.json` (investigação dedicada ao PDV Altec/Next, com 9 caminhos de integração) e `dados/09-verif-tecnico.json` (verificação adversarial, veredito **PARCIAL**, 12 correções).
> **Onde o verificador refutou a pesquisa original, este documento usa a versão corrigida e diz isso no texto.** Onde o verificador apontou lacuna, a lacuna está registrada, com essas palavras.
> Número que não foi lido em página oficial aparece como **NÃO PÚBLICO**, **NÃO VERIFICADO** ou **DESCONHECIDO**. Confiança baixa está marcada, porque este documento vai ser usado para decidir gasto de dinheiro e compra de hardware.
> Os limites dos planos gratuitos (Supabase, Cloudflare, Resend, Groq) estão detalhados em `04-custo-zero.md`. Aqui eles aparecem só como veredito de linha, para não duplicar.

---

## 1. Tabela mestra de veredito

Uma linha por tema. A coluna "Entra no MVP" é julgada contra os quatro itens obrigatórios da primeira versão: coleta e painel, resumo diário por e-mail, importação do Altec com cruzamento satisfação × faturamento, e base de clientes.

| Integração | Viabilidade | Custo real para 1 unidade | Esforço | Entra no MVP? |
|---|---|---|---|---|
| **Google Business Profile API** (ler avaliações) | **Viável com ressalva.** Depende de aprovação da Google | **Grátis.** Texto oficial: "available to registered users at no charge" | Pedido é um formulário. Integração, 1 a 2 dias depois de aprovado | **Não.** Pedir o acesso agora, construir depois (seção 2) |
| **Places API** (só a nota agregada) | **Viável, uso restrito** | **R$ 0** no volume (30 chamadas/mês contra 1.000 grátis). Acima: **US$ 20,00/1.000** no SKU Place Details Enterprise | 1 dia | **Não** |
| **iFood Review API** | **Difícil.** Exige homologação com CNPJ de CNAE de tecnologia | APIs gratuitas. Custo de entrada é o processo, não a licença | Alto. É um projeto em si | **Não** (seção 3) |
| **iFood pelo painel do lojista** | **Viável** | **Grátis** | Minutos por semana, processo humano | **Sim**, como rotina humana, não como código |
| **PDV Altec/Next: importar o R3** | **Viável pelo caminho que não depende do fornecedor.** API pública **NÃO EXISTE** | **R$ 0** | Médio-baixo: 2 a 3 dias (pasta sincronizada + parser + upload manual) | **Sim, obrigatório** (seção 4) |
| **Supabase Free** (banco e auth) | **Viável com folga de anos** | **Grátis.** Saída paga: **Pro US$ 25/mês** (oficial, corrigido pelo verificador) | Baixo | **Sim** |
| **Deploy e cron** (Cloudflare Pages + Workers + Cron Triggers) | **Viável.** Vercel Hobby está fora por **proibição de uso comercial** | **Grátis** | Baixo | **Sim** |
| **E-mail transacional** (Resend) | **Viável com folga de 20x** | **Grátis**: 3.000/mês, 100/dia, 1 domínio | Baixo, mais a configuração de SPF/DKIM | **Sim** |
| **LLM para classificar e resumir** (Groq) | **Viável.** Escolhido por privacidade, não por limite | **Grátis** | Baixo | **Sim**, limitado ao diagnóstico do relatório |
| **WhatsApp Business Cloud API** | **Viável com ressalva.** Barato no desenho "cliente inicia", caro e imprevisível no desenho "restaurante dispara" | Serviço iniciado pelo cliente: **grátis**. Template: pago por mensagem entregue, valor em BRL **NÃO VERIFICADO** (seção 9) | Médio, quase todo em burocracia de template | **Não** |
| **Tablet Android em modo quiosque** | **Viável** | Software: **R$ 0** com fixação nativa, ou **8,90 EUR por aparelho** no Fully Kiosk PLUS (oficial, corrigido). Hardware: preço em BRL **NÃO VERIFICADO** | Baixo | **Sim** |
| **PWA offline com fila local** | **Viável, e é a arquitetura certa** | **Grátis** | Médio-baixo, meio dia se mantido simples | **Sim**, na versão simples (seção 8) |
| **Raspberry Pi como agente diário** | **Tecnicamente viável, operacionalmente errado agora** | Energia menos de R$ 1/mês (ordem de grandeza, tarifa **NÃO VERIFICADA**). Preço do hardware no Brasil **DESCONHECIDO** | Alto, e o custo é humano | **Não. Não comprar** (seção 6) |
| **LGPD** (consentimento, retenção, exclusão) | **Viável, e o custo é de desenho, não de advogado** | **R$ 0** se implementado no produto | Médio. É código e texto de tela, não papel assinado | **Sim, obrigatório** |
| **Reconhecer cliente recorrente sem cadastro** | **Viável com ressalva. Confiança baixa** | **Grátis** | Baixo | **Parcial**: análise por pedido no MVP, código voluntário na fase 2 |

**Leitura de uma linha:** nada do que é obrigatório no MVP depende de aprovação de terceiro. As duas integrações que dependem de portão externo (Google Business Profile e iFood) são justamente as que o cliente já decidiu resolver por link. Isso não é coincidência, é sorte a favor do projeto, e a seção 2 explica por quê.

---

## 2. Google Business Profile: o que realmente exige, e por que a decisão de só linkar economiza trabalho

### O que a API exige de fato

A Google Business Profile API não é aberta por padrão. Ela é gratuita, mas passa por um portão de aprovação humana. Os pré-requisitos oficiais são cinco, todos publicados em [developers.google.com/my-business/content/prereqs](https://developers.google.com/my-business/content/prereqs):

| Requisito | Situação para o QT |
|---|---|
| Conta Google e projeto no Google Cloud Console | Trivial |
| Conta de Organização no Cloud | Trivial, mas é um passo a mais que ninguém espera |
| Gerenciar um Google Business Profile **verificado e ativo há mais de 60 dias** | Provavelmente já cumprido, o perfil da pizzaria é antigo. **Confirmar antes de pedir**, porque isso decide a elegibilidade |
| Ter um **site representando o negócio** listado no perfil | Confirmar se o link do site está no perfil do Google |
| Pedido via formulário de contato, opção "Application for Basic API Access" | Um formulário. Fontes de terceiros falam em cerca de 40% de rejeição por formulário incompleto |

**Prazo de aprovação:** o FAQ oficial diz "Requests are reviewed within 14 days" ([FAQ da GBP API](https://developers.google.com/my-business/content/faq)). Fontes de terceiros falam em 3 a 10 dias úteis, confiança média.

**Custo:** zero. O texto oficial da página de preços é literal: "The Google My Business API is available to registered users at no charge." Escopo OAuth único, `https://www.googleapis.com/auth/business.manage`.

**Cotas:** a Business Information API, sob a qual cai a leitura de reviews, tem "Default requests: 300 QPM". Edições ficam limitadas a 10 por minuto por perfil, e esse limite **não pode ser aumentado**.

> **Correção do verificador, aplicada aqui.** A pesquisa original afirmava que um projeto novo nasce com **0 QPM** antes da aprovação. Esse número não aparece em nenhuma página oficial. O que é oficial: o acesso depende de aprovação e o aprovado recebe "a standard default quota for all eight APIs", com 300 QPM na Business Information API. **A cota antes da aprovação é NÃO VERIFICADA, não é zero comprovado.** A conclusão prática não muda: sem aprovação, não se lê review por essa via.

Um detalhe do FAQ que evita frustração: ter acesso à API não dá acesso a dado nenhum. Você só consulta perfis sobre os quais já tem permissão. Não existe leitura de avaliação de concorrente por aqui.

### A alternativa, e a armadilha jurídica dela

A alternativa sem aprovação é a Places API (New), que devolve nota agregada e contagem de avaliações. No volume do QT, uma chamada por dia dá cerca de 30 por mês contra 1.000 gratuitas, ou seja **R$ 0**.

> **Correção do verificador, aplicada aqui.** A pesquisa original mandava usar o SKU **Enterprise + Atmosphere** (US$ 25,00/1.000) para buscar só a nota. Está errado por dois motivos: `rating` e `userRatingCount` estão no SKU **Place Details Enterprise** (US$ 20,00/1.000, 1.000 grátis/mês), 20% mais barato, e o SKU Enterprise + Atmosphere é o que aciona o campo `reviews`, que é justamente o campo cujo armazenamento é proibido. **Para nota agregada, peça só os campos do Place Details Enterprise.**

A armadilha é contratual, não técnica. Os Termos do Google Maps Platform proíbem copiar e salvar nomes de empresa, endereços e avaliações de usuários, e proíbem cachear conteúdo Maps fora das exceções. O `place_id` é a única coisa que pode ser guardada indefinidamente. Ao exibir uma review, a atribuição do autor é obrigatória (avatar, nome e link de perfil; com espaço reduzido, no mínimo o avatar), com acesso à review original no Maps via `googleMapsUri`.

> **Lacuna registrada pelo verificador:** a página `cloud.google.com/maps-platform/terms` voltou truncada, e a exceção de 30 dias para latitude e longitude **não foi verificada** no texto contratual. Confirmado na página de políticas do Places: `place_id` armazenável indefinidamente, proibição de pré-buscar, cachear ou armazenar conteúdo fora das exceções, e atribuição obrigatória.

Consequência prática, e ela é dura: **a Places API serve para ler a nota do dia, não para montar histórico próprio de avaliações.** Guardar a série histórica da nota diária já entra em zona cinzenta sob a proibição de cachear conteúdo Maps, e como o texto integral dos termos não pôde ser lido, essa avaliação fica com **confiança baixa**. Para histórico legítimo, o caminho é a GBP API aprovada, que trata do dado do seu próprio negócio.

### A decisão de só linkar: economiza trabalho, sim

O cliente decidiu monitorar Google e iFood **somente por link**, sem trazer conteúdo para dentro e sem responder pelo sistema. Veredito direto: **essa decisão economiza muito trabalho e é a decisão certa para a primeira versão.** O que ela elimina, item por item:

| O que a decisão elimina | Por que isso importa aqui |
|---|---|
| Espera de até 14 dias por aprovação da Google | Tira uma dependência externa do caminho crítico do MVP |
| Fluxo OAuth com refresh de token e renovação de credencial | É o tipo de código que quebra em silêncio meses depois, num sistema que ninguém mantém |
| Toda a exposição jurídica do Maps Platform | Nada é armazenado, então nada viola cláusula de cache ou de atribuição |
| Obrigação de atribuição de autor na interface | Menos tela, menos regra visual, menos manutenção |
| Uma tabela, um cron e um parser a mais | Cada um deles é uma peça que pode falhar sem avisar |

Para comparação: reconstruir a Central de Reputação do Risposta (Google e iFood no mesmo painel) é, segundo a apuração do concorrente em `01-risposta.md`, a parte tecnicamente mais cara de reproduzir, e é exatamente ela que a decisão de linkar dispensa.

### Vale rever? Em um ponto só, e ele é grátis

**O que se perde:** um dos quatro itens da auditoria por IA descrita no briefing é "divergência entre a pesquisa e a avaliação pública". Sem nenhum dado do Google entrando no sistema, esse item não existe. Os outros três (queda de tendência, padrão repetido de falha, prato com problema) vivem inteiros dentro dos dados da própria pesquisa.

**Recomendação acionável, em duas frases:** mantenha a decisão de só linkar no produto, e **peça o Basic API Access da GBP API agora, nesta semana**, porque o pedido é um formulário gratuito com prazo de até 14 dias e não obriga a construir nada. Se a aprovação sair, você ganha a opção de acender o item de divergência na fase 2 com um cron de dez linhas; se não sair, você não perdeu nem uma hora de desenvolvimento.

O que **não** vale fazer: montar um banco histórico de reviews via Places API para simular o que a GBP API faria de forma legítima. É mais barato esperar o formulário do que carregar o risco contratual.

---

## 3. iFood: existe API, mas o portão não é para uma pizzaria

### O que existe

O iFood mantém APIs públicas por módulo: Authentication, Merchant, Order, Catalog, Financial, Review e Merchants. O módulo **Review** faz exatamente o que o projeto precisaria: consulta as avaliações das lojas parceiras nos últimos dias, mostra e responde comentários do consumidor, devolve o detalhe de uma avaliação e entrega as métricas de performance de avaliação da loja.

Regras técnicas confirmadas do módulo Review: resposta só em avaliação com status `NOT_REPLIED`, texto entre 10 e 300 caracteres, e avaliação não respondida publica automaticamente em 5 dias.

### Quem consegue acesso

O portão está no cadastro, não na API. O Developer Portal exige **CNPJ** (CPF e conta de estudante não são aceitos) e **CNAE correspondente a empresa de tecnologia**. O fluxo é: registrar-se, receber loja e app de teste, desenvolver, criar o app de produção e abrir ticket pedindo homologação com aplicação completa e funcional. As APIs são gratuitas para quem cumpre os requisitos.

Uma pizzaria com CNAE de restaurante não se cadastra como integradora. Ela precisaria usar um CNPJ de tecnologia e passar por homologação, ou consumir através de um integrador já homologado (o próprio PDV, por exemplo).

> **Correção de outra frente de verificação, aplicada aqui.** A afirmação de que o iFood "só libera para gestores de reputação homologados" é **parcial e não verificável como escrita**. A doc do iFood cita cinco categorias de empresa integradora, e "Gerenciadores de avaliações" é uma delas, o que significa que um sistema como este **se encaixa na categoria**. Não é veto categórico, é custo de processo.

> **Lacuna registrada pelo verificador:** `developer.ifood.com.br` devolveu **HTTP 403** em FAQ, termos de uso e página de homologação. Ficam **NÃO VERIFICADOS**: a espera de 15 dias após reprovação, a janela exata de histórico da Review API ("últimos dias"), o texto literal dos termos sobre raspagem, e a existência de exportação CSV das avaliações no Portal do Parceiro. O requisito de CNPJ com CNAE de tecnologia e a gratuidade das APIs foram confirmados por trecho indexado do próprio FAQ.

### O que o painel do lojista permite

A seção Avaliações do Portal do Parceiro mostra a **média dos últimos 3 meses** (a mesma que o cliente vê no app), os comentários dos clientes e o percentual de satisfação com a entrega. Perfis com permissão adequada exportam relatórios de pedidos e de desempenho. **Exportação de CSV específica das avaliações: DESCONHECIDO**, sem confirmação oficial.

Automatizar login no painel para raspar essas telas é má ideia por três motivos somados: quebra em qualquer mudança de front-end, pode acionar antibot, e coloca a conta comercial do restaurante em risco de sanção sob termos que **não foi possível ler**.

### O que o Risposta faz, e o que isso significa para um build próprio

Registro importante, apurado no bundle de produção do concorrente: **o Risposta lê o iFood pela API oficial Merchant**, com os endpoints escritos direto no código:

```
https://merchant-api.ifood.com.br/review/v2.0/merchants/{merchantId}/reviews      (listagem)
https://merchant-api.ifood.com.br/review/v1.0/merchants/{merchantId}/summary      (resumo)
https://merchant-api.ifood.com.br/review/v2.0/merchants/{merchantId}/reviews/{reviewId}/answers   (resposta)
```

Três implicações diretas para um build próprio:

1. **O caminho é real e é o oficial.** Não existe truque escondido: quem faz isso em produção passou pela homologação e mantém credencial de merchant por loja. O custo é o processo, e ele é pago uma vez por empresa integradora, não por restaurante.
2. **A credencial é o ponto frágil, não o código.** O painel do Risposta tem uma tela de diagnóstico que exibe `merchant_id`, status HTTP e mensagem de erro por loja, o que sugere que **falha de credencial do iFood por loja é frequente** o suficiente para merecer interface própria. Num sistema que ninguém vai manter, herdar esse tipo de fragilidade é um mau negócio.
3. **Você está pagando hoje por algo que já decidiu não usar.** A Central de Reputação está dentro da mensalidade atual, e o escopo definido no briefing é monitorar por link. Cancelar a mensalidade não custa uma capacidade que o novo sistema precisaria ter.

**Veredito:** corte o iFood da v1. Um salão de 22 mesas aberto só no jantar não gera volume de avaliação de delivery que pague o custo de homologação. Se um dia o dado virar necessário, a ordem é: (a) perguntar ao suporte da Altec se a integração iFood que o PDV já tem expõe avaliações, aproveitando a homologação **dele**; (b) leitura manual do Portal do Parceiro uma vez por semana; (c) só em último caso, procurar um integrador homologado disposto a repassar o endpoint de Review.

---

## 4. O PDV Altec/Next: a integração que decide o MVP

Esta é a única integração obrigatória do MVP que depende de um fornecedor de fora, e é a de informação pública mais escassa de todo o projeto. Por isso o plano abaixo é desenhado para o **pior caso** e melhora sozinho se o suporte responder bem.

### Quem é

Altec Sistemas e Tecnologia, fornecedora brasileira de software de gestão para bares e restaurantes, sede em São Paulo, atuando desde 2003, com mais de 1.800 clientes declarados (confiança média, número vindo de trecho de busca de páginas do próprio fornecedor). Site oficial: [www.altecsistemas.com.br](https://www.altecsistemas.com.br/). O domínio antigo `altec.ws` responde 301 para o novo. CNPJ 06.142.226/0001-03, de base de terceiro. Existem outras empresas chamadas Altec sem nenhuma relação, então não confunda ao pesquisar.

**Nome do produto:** a linha se chama **Next**, e a Altec usa esse nome publicamente em blog e release de imprensa. Internamente o Next se decompõe em quatro módulos, nomeados no repositório público da empresa: **Caixa Next, Next POS, Next Admin e Next Hub**. O sucessor em desenvolvimento se chama **Logos**.

Detalhe que precisa ser resolvido com o suporte: a documentação interna do cliente chama o back-office de **"Altec Riser"**, e esse nome **não aparece em nenhuma fonte pública da Altec**. É nome comercial legado ou interno. A pergunta 1 da seção 5 existe por isso.

**Suporte:** WhatsApp e telefone, todos os dias das 08:00 às 00:00, sem base de conhecimento pública, sem portal de tickets. Consequência prática: **toda resposta técnica vai chegar por conversa, não por documento.** Peça por escrito e salve o print, especialmente na pergunta sobre acesso ao banco.

### O que existe

| Existe | Evidência |
|---|---|
| **Arquitetura híbrida, confirmada pelo fornecedor** | FAQ da página do PDV, verbatim: "Não. O PDV funciona mesmo offline. Porém, é necessário estar conectado à internet para sincronizar as informações e realizar atualizações do sistema." Isso implica base de dados local no salão |
| **Portal em nuvem** | Produto **Retaguarda Cloud**, descrito como "100% em nuvem", acessível por navegador em PC ou celular, com "integração total com PDV" e backup automático. Tem dashboard e área de Relatórios com vendas, pagamentos e desempenho, filtrável por período e filial |
| **Exportação de relatório** | Módulo "Relatórios Web" com 13 relatórios analíticos exportáveis para **PDF e Excel** (confiança média: a página original faz 301 e a URL equivalente no site novo dá 404; só o trecho indexado pôde ser lido). Existência de **CSV: DESCONHECIDO** |
| **Integrações nativas** | iFood (página própria), Keeta/Meituan, "Eu Falo" (fidelidade e cashback), NF-e e NFC-e nativas, KDS, Cardápio Digital e um BI próprio, **Insight BI**, que entrega diagnóstico por WhatsApp e foi lançado "inicialmente para os sistemas Classic e Next" |
| **Capacidade técnica interna de API REST** | O repositório público `logos-docs` traz um `Requisitos Backend.md` com **mais de 90 endpoints REST** agrupados por domínio, runners de sincronização periódica (upload de vendas a cada ~5 min, download de produtos a cada ~30 min) e operação offline com banco local. **Mas isso é o sucessor Logos, não o Next de hoje** |

### O que não existe

| Não existe | Evidência |
|---|---|
| **API pública ou de parceiro para o cliente** | Nenhuma página do fornecedor menciona API, webservice, webhook, sandbox ou chave de acesso. O sitemap completo não tem página de desenvolvedor. O repositório que teria a documentação, [altec-sistemas/hub-api-docs](https://github.com/altec-sistemas/hub-api-docs), está **literalmente vazio** ("This repository is empty"). Buscas em português e inglês não retornam nada do fornecedor |
| **Programa técnico de parceiros** | O único programa publicado é **comercial**, de revenda: 30% do MRR nos anos 1 e 2, 20% no ano 3, 10% no ano 4. Nenhuma trilha técnica |
| **Documentação do banco de dados** | Nenhuma página de requisitos de instalação. **NÃO PÚBLICO.** A melhor pista aponta MySQL: o exemplo de configuração do Logos usa host `localhost` e porta **3306**, e a organização da Altec no GitHub mantém um fork ativo de `mysql.dart`. Firebird, SQL Server e PostgreSQL não aparecem em nenhuma fonte ligada à Altec. **Isso é inferência, confiança baixa. Nenhum nome de tabela é público** |
| **Endereço de login do Retaguarda Cloud** | **NÃO PÚBLICO.** Não está no site, nem no sitemap completo, nem no link-in-bio. O dono certamente já tem esse endereço. Não deve ser adivinhado |
| **Uma linha de documentação sobre o relatório R3** | Nem site, nem blog, nem YouTube, nem fórum. Tudo que se sabe vem do uso real do cliente |
| **Conector para Power BI** | Nenhuma menção em nenhuma fonte. Assuma que não existe |
| **Integradores terceiros que leiam a Altec** | Praticamente nenhum. O único que a cita pelo nome é o VocêQpad, e por padrão **Open Delivery**, que é fluxo de **entrada** de pedido de delivery, não **saída** de dado de venda. Não serve para o cruzamento satisfação × faturamento |

### O relatório R3, o que se sabe de fato

O R3 (Vendas por Produto Detalhado) é o relatório de origem definido no briefing. Não há documentação pública nenhuma. O que se sabe vem do uso real do cliente, registrado nas skills `financial-qt` e `ficha-tecnica-qt`:

- Sai em planilha **Excel ou CSV**.
- É uma listagem dos produtos vendidos no período.
- Traz ao menos **ID do produto**, **nome do produto** (em MAIÚSCULAS e frequentemente **sem acento**: "RUCOLA", "FANTASTICA"), **grupo ou categoria** (PIZZAS, ENTRADAS, QUEIJOS BRASILEIROS) e **valor de venda líquida**.
- **Agendamento de envio automático por e-mail: DESCONHECIDO.** Zero evidência pública, nem a favor nem contra.

Isso já define duas regras não negociáveis do parser: casar por **ID do produto** quando existir e por **nome normalizado sem acento** como reserva, e **nunca duplicar a mesma data**, o que exige idempotência por data na importação.

### A arquitetura híbrida e o que ela muda

A confirmação oficial de que o PDV opera offline e sincroniza depois significa que existem **duas superfícies de coleta possíveis**, e elas têm propriedades opostas:

| Superfície | Disponibilidade | Consequência |
|---|---|---|
| **Base local no salão** | Só enquanto a máquina estiver ligada | Colide de frente com a restrição declarada de que **o PC do caixa desliga no fim do dia**. Para coletar dali, a leitura teria de acontecer por volta das 23h, com o salão ainda aberto, o que arrisca perder o fechamento |
| **Nuvem (Retaguarda Cloud)** | 24 horas, independente do PC do caixa | **É a superfície certa para qualquer agente diário.** Também é a única compatível com a ideia de não ter máquina nenhuma no restaurante |

### Os 9 caminhos de integração

| # | Caminho | Viabilidade | Esforço | Depende de | Risco | Recomendação |
|---|---|---|---|---|---|---|
| **1** | **API oficial ou de parceiro da Altec (REST)** consumida por cron gratuito em nuvem | **Desconhecida, provavelmente inviável hoje** | Baixo **se existir**: 1 a 2 dias. Zero manutenção contínua | Confirmação do suporte de que existe API para o cliente na linha Next/Riser, com credencial e documentação. Toda a evidência pública diz que **não existe** | Bloqueio total se não existir. Secundário: Altec cobrar por integração ou exigir contrato de parceria. **Nenhum endpoint conhecido**, nada pode ser presumido | **Perguntar primeiro, porque muda tudo, mas não esperar a resposta para começar.** Se existir e for gratuita, é o melhor de todos: nada roda no restaurante, nada quebra quando a Altec atualiza a tela, e não precisa de Raspberry Pi |
| **2** | **Envio automático do R3 por e-mail**, com anexo consumido por robô | **Desconhecida, viável com ressalva se a Altec suportar** | Baixo: 1 a 2 dias (caixa dedicada + função com cron lendo a caixa e parseando o anexo) | O suporte confirmar que o Retaguarda Cloud ou o Next Admin agenda envio periódico de relatório em Excel/CSV. **Zero evidência pública nos dois sentidos.** Depende também de layout estável | Layout de planilha muda sem aviso e o parser quebra em silêncio. E-mail cai em spam, ou o agendamento é desligado numa atualização | **É o melhor caminho realista de manutenção zero**, porque não exige máquina no restaurante, nem ninguém clicando, nem Raspberry Pi. Se existir, migre para cá e mantenha o caminho 3 como reserva |
| **3** | **Pasta sincronizada (Google Drive) com o R3 exportado + watcher gratuito em nuvem** | **Viável** | Médio-baixo: 2 a 3 dias | **Nada da Altec.** Só do dono ou do gerente exportar o R3 e salvar na pasta. A exportação para Excel já existe e **ele já faz isso hoje** para as análises de CMV, então o hábito está formado | Risco **humano**, não técnico: alguém esquece de exportar. Mitigável porque o cruzamento não é tempo real. Risco técnico baixíssimo, custo de infra **R$ 0** | **É o caminho padrão. Construa este primeiro, antes de falar com a Altec.** Não depende de fornecedor, não depende do PC do caixa, não tem host para pagar e não tem nada para manter além do parser |
| **4** | **Upload manual do R3 no painel do sistema próprio** ("importar planilha") | **Viável** | Baixo: 1 dia, reaproveita o parser do caminho 3 | Nada. Só do próprio sistema | Depende 100% de ação humana. Nenhum risco técnico | **Construir sempre, junto com o caminho 3, como rede de segurança permanente.** É a garantia de que o produto nunca fica cego: se o Drive falhar, se o layout mudar, se o agendamento morrer, o dono arrasta a planilha no celular e o número aparece |
| **5** | **Leitura direta do banco local via Raspberry Pi na mesma rede** | **Viável com ressalva**, e é o **único caminho que pode dar granularidade de mesa e comanda** | **Alto: 1 a 2 semanas.** Mapear schema desconhecido, escrever consultas, tratar fuso e fechamento de caixa, empacotar como serviço | Quatro confirmações, todas com o suporte: qual banco e versão; em que máquina roda; liberação de usuário somente-leitura com senha; e se isso viola contrato, garantia ou suporte. **Todas em aberto.** O banco não é público (indício de MySQL por inferência) e nenhum nome de tabela é público | **O mais alto de todos.** Schema proprietário muda em atualização e quebra a consulta em silêncio. Consulta mal escrita compete com o PDV em horário de operação. Pode gerar atrito contratual. E **viola frontalmente a restrição de que ninguém vai manter o sistema** | **Não usar para faturamento diário**, o caminho 3 resolve melhor e mais barato. Considerar **só** se o cliente insistir no cruzamento por comanda e se o suporte liberar acesso somente-leitura **por escrito** |
| **6** | **Endpoint interno do Retaguarda Cloud**, descoberto por inspeção das chamadas do próprio portal | **Viável com ressalva** | Médio: 3 a 5 dias | Ter o login real do Retaguarda Cloud (endereço **NÃO PÚBLICO**, pegar com o dono) e a chamada devolver JSON. Depende de não haver 2FA nem token de vida curta amarrado ao navegador | API não documentada muda sem aviso e sem changelog. Pode ferir os termos de uso. Pode haver rate limit ou bloqueio por detecção de automação | **Só depois de esgotar 1, 2 e 3**, e de preferência com o suporte ciente. Se funcionar, é bem mais estável que automação de navegador, porque não depende de layout de tela. **Não implemente nada antes de observar o tráfego real do portal logado** |
| **7** | **Automação de navegador (Playwright/Puppeteer) no Raspberry Pi**, baixando o R3 do portal | **Viável** | Alto **na manutenção**: 2 a 4 dias para montar, quebra recorrente depois | URL e login do Retaguarda Cloud, ausência de 2FA e de CAPTCHA, e um Pi com folga (**Pi 4 ou 5 com 4 GB ou mais**, não um Zero) | **O mais frágil dos automatizados.** Qualquer mudança de layout, rótulo de botão ou fluxo de login derruba a coleta, e derruba **em silêncio**. Colide diretamente com "ninguém vai manter depois de pronto" | **Último recurso automatizado.** Se for por aqui, três regras não negociáveis: rodar de madrugada (04h), salvar o arquivo bruto **antes** de parsear, e alertar ativamente quando falhar duas execuções seguidas |
| **8** | **Agente diário rodando no PC do caixa** | **Inviável** | Irrelevante | Que o PC ficasse ligado, e ele não fica. Restrição dura declarada | Coleta simplesmente não acontece. E agendamento no Windows do caixa é o tipo de coisa que ninguém reconfigura depois de uma formatação ou troca de máquina | **Descartar.** Está aqui só para registrar que foi avaliado e rejeitado |
| **9** | **Captura do arquivo de backup automático gerado pela Altec** | **Desconhecida, provavelmente inviável** | Médio se o arquivo existir e for legível; alto se for proprietário ou criptografado | A Altec afirma que "o backup é realizado automaticamente", mas **não diz onde, em que formato, nem se fica na máquina do cliente**. Tudo **DESCONHECIDO** | Alto: backup costuma ficar do lado do fornecedor. Se for dump proprietário ou criptografado, não há o que ler. Depender de artefato de backup para operação diária é frágil por natureza | **Não planejar em cima disso.** Vale **uma** pergunta ao suporte. Se a resposta for um dump legível numa pasta local, isso reabre o caminho 5 de forma muito mais segura, porque a leitura passa a ser de cópia, sem tocar no banco em produção |

### Recomendação final, em uma frase

**Construa hoje os caminhos 3 e 4 juntos (pasta no Drive com watcher gratuito, mais botão de importar planilha no painel), porque eles não dependem de nada da Altec nem do PC do caixa e custam R$ 0, e só migre para o caminho 2 ou 1 se o suporte confirmar por escrito que existe agendamento por e-mail ou API.**

### O alerta do R3: ele provavelmente não tem mesa nem comanda

Esta é a descoberta que mais muda o desenho do produto, e ela precisa ficar explícita antes da primeira tabela ser criada.

**O que se sabe:** é **DESCONHECIDO** se o R3 carrega número de mesa, comanda ou horário. Pela natureza do relatório, que é agregado por produto no período, **provavelmente não carrega**. Confiança média, e a pergunta 4 da seção 5 existe para resolver isso.

**Por que isso é crítico:** o briefing declara preferência por puxar mesa e garçom do PDV pela comanda. Se o R3 não tem comanda, essa preferência não é atendível por ele, e o **único** caminho que poderia atendê-la é o caminho 5 (leitura direta do banco local), que é justamente o de maior esforço, maior risco contratual e maior custo humano recorrente.

**O que muda no desenho, em cinco consequências concretas:**

1. **O plano B do briefing passa a ser o plano A.** O garçom digita o número da mesa e seu PIN antes de entregar o tablet. Isso não é degradação, é a decisão certa: o dado de mesa e garçom passa a nascer dentro do seu sistema, sob seu controle, sem dependência de fornecedor e sem quebrar quando a Altec atualizar.
2. **O modelo de dados tem dois grãos diferentes, e eles não se juntam por comanda.** Grão 1: a resposta da pesquisa (mesa, garçom, turno, timestamp, notas, comentário), vinda do tablet. Grão 2: venda por produto por dia, vinda do R3. **A chave de junção é a data**, possivelmente data mais turno. Desenhe o schema assumindo isso e não prometa junção por comanda em tela nenhuma.
3. **"Nota por prato" não pode vir do cruzamento com o R3.** Cruzar 20 mesas por dia com venda agregada por produto não identifica qual cliente comeu qual pizza. A nota por prato tem de nascer **na própria pesquisa**, e o briefing já resolveu isso da melhor forma possível: perguntar prato a prato **só quando a nota for baixa**. Mantenha essa decisão, ela é o que viabiliza o indicador.
4. **O cruzamento satisfação × faturamento fica em nível de dia, não de mesa.** Isso ainda entrega valor real (noite de nota baixa contra noite de faturamento alto, dia da semana, efeito de casa cheia), mas a correlação por prato entre os dois grãos é estatisticamente fraca com 20 mesas por dia. **Não construa gráfico que insinue causalidade nesse cruzamento**, porque com esse volume ele vai mostrar ruído e o dono vai tomar decisão em cima de ruído. Confiança dessa avaliação: média, é julgamento estatístico sobre o volume declarado.
5. **A pergunta 4 ao suporte pode reabrir tudo.** Se existir **outro** relatório com venda por comanda ou mesa e horário, exportável em Excel ou CSV, o desenho preferido do cliente volta ao jogo pelo caminho 3, sem banco, sem Pi e sem risco. É por isso que essa pergunta é a segunda mais importante da lista.

---

## 5. As 8 perguntas para o suporte da Altec

Prontas para copiar e colar no WhatsApp do suporte. Recomendação de forma: mande em mensagens separadas, numeradas, e **peça a resposta da pergunta 6 por escrito**.

```
Olá! Sou cliente e estou organizando os dados da minha loja para análise
própria. Preciso de 8 respostas técnicas, por favor.

1) Qual produto e versão exata está instalado na minha loja: Classic, Next
ou Riser? Preciso do nome comercial e do número de versão do PDV e do
módulo de retaguarda.

2) O sistema tem API REST ou webservice que eu (o cliente) possa usar para
consultar minhas próprias vendas, com credencial e documentação? Se tiver,
como solicito o acesso e a documentação, e há custo?

3) Consigo agendar o envio automático diário, por e-mail, do relatório
"R3 - Vendas por Produto Detalhado" já em Excel ou CSV? Se sim, onde
configuro isso? Se não existe, existe algum agendamento de relatório por
e-mail no sistema?

4) O relatório R3 pode ser exportado em CSV além de Excel, e ele traz
número de mesa/comanda e horário do pedido, ou só o total por produto no
período? Se não traz, existe algum outro relatório com venda por
comanda/mesa e horário, exportável em Excel ou CSV?

5) O banco de dados da minha loja fica no PC do caixa, em um servidor
local, ou só no servidor da Altec? Qual é o banco e a versão (MySQL,
MariaDB, Firebird, SQL Server, PostgreSQL)?

6) Vocês liberam um usuário somente-leitura no banco de dados para eu
conectar uma ferramenta própria de análise? Isso quebra contrato,
garantia ou direito a suporte? Preciso da resposta por escrito.

7) Qual é o endereço (URL) do Retaguarda Cloud do meu estabelecimento, e
ele tem autenticação em dois fatores? Posso criar um segundo usuário,
somente-leitura, só para relatórios?

8) O backup automático que vocês fazem gera algum arquivo na minha
máquina? Se sim, em qual pasta e em qual formato, e eu posso copiar esse
arquivo para uso próprio?
```

**Qual delas destrava mais: a pergunta 3.** Um "sim" nela entrega automação de manutenção zero sem depender de mais nada: nenhuma máquina no restaurante, nenhum clique humano, nenhum Raspberry Pi, e o caminho 3 continua vivo como reserva. A pergunta 2 seria ainda melhor se o "sim" viesse, mas **toda** a evidência pública aponta para "não" (repositório de documentação vazio, nenhum portal de desenvolvedor, programa de parceria puramente comercial), então não organize o cronograma em volta dela. A vice-líder é a pergunta 4, porque é ela que decide se o cruzamento por mesa e comanda é possível sem tocar no banco, e portanto se o modelo de dados tem um grão ou dois.

---

## 6. Raspberry Pi: não compre agora

### O veredito honesto

O trabalho descrito no briefing para o Pi é "buscar ou baixar um relatório e enviar para uma API, uma vez por dia". Isso é **exatamente** o que um Cloudflare Cron Trigger faz de graça, com granularidade de 1 minuto, sem eletricidade, sem cartão SD que corrompe, sem depender do Wi-Fi do salão e sem alguém para reiniciar o aparelho. GitHub Actions com `schedule` também resolve, gratuito em repositório público.

Num restaurante sem nenhuma pessoa de TI, um Pi no salão adiciona um ponto de falha físico para executar uma tarefa que a nuvem executa de graça. Cartão SD corrompe, energia cai, Wi-Fi oscila, e **ninguém percebe que o agente parou até o relatório não chegar**. Isso colide com a restrição mais dura do projeto.

> **Lacuna registrada pelo verificador:** o consumo do Pi (cerca de 0,7 W em idle e até 1,4 W em carga no Zero 2 W; de 3,0 a 8,8 W no Pi 5) e o preço de varejo no Brasil **não foram reverificados** e seguem vindo de terceiros. A tarifa de energia do Rio também **não foi verificada**. A conta de "menos de R$ 1/mês" é ordem de grandeza, não número.

### Quando o Pi ganha

Só em um cenário: **se o dado estiver preso localmente e não houver como puxá-lo de fora.** Ou seja, se o suporte da Altec responder "não" às perguntas 2, 3 e 7 e o cliente rejeitar a exportação manual. Nesse caso o Pi vira um agente de saída, e ele aparece em dois dos nove caminhos:

| Caminho | Modelo necessário | Por quê |
|---|---|---|
| **5** (ler o banco local) | Raspberry Pi Zero 2 W seria suficiente | O trabalho é uma consulta SQL e um POST. Quad-core, roda Python com cron sem esforço, e é o mais eficiente da linha |
| **7** (automação de navegador) | **Pi 4 ou 5 com 4 GB ou mais** | Navegador headless em ARM funciona, mas é pesado. Um Pi de 2 GB não dá conta |

Note a consequência: **o modelo certo depende de qual caminho for necessário**, e nenhum dos dois é necessário hoje. Comprar antes de saber é comprar o aparelho errado com probabilidade alta. O Raspberry Pi 5 é exagero em qualquer cenário deste projeto, e tem o detalhe irritante de consumir cerca de 1,7 W **mesmo desligado**, porque o chip de gerenciamento de energia continua ativo (terceiro, não reverificado).

### Recomendação clara, e o que comprar em vez disso

**Não compre Raspberry Pi agora.** A ordem de preferência é esta, e o Pi é o quarto lugar em quatro:

1. API ou exportação agendada do próprio Altec, se existir.
2. Cron na nuvem (Cloudflare Workers) puxando de onde o Altec publica.
3. Pasta sincronizada no Google Drive com o Worker lendo o arquivo.
4. Só então Raspberry Pi.

**O que comprar em vez disso**, com o mesmo dinheiro e muito mais retorno:

| Em vez de | Compre | Por quê |
|---|---|---|
| Raspberry Pi + fonte + cartão SD + gabinete | **Um segundo tablet de reserva** | Tablet de quiosque quebra tela. Com um reserva carregado, a coleta não para. Sem ele, uma tela trincada custa dias de dado |
| Raspberry Pi | **Suporte de mesa com chave e cabo de segurança** para o tablet | Resolve furto e vandalismo, que é um risco real de aparelho solto em salão, e é o item de hardware com melhor relação custo-benefício do projeto |
| Raspberry Pi | **Uma licença Fully Kiosk PLUS por aparelho, 8,90 EUR** (seção 7) | Faz o tablet reabrir o app sozinho depois de queda de energia. Isso remove uma tarefa humana recorrente, que é exatamente o que o projeto precisa |

Se um dia o Pi virar necessário, ele vem com uma exigência não negociável: **um watchdog que avisa por e-mail quando o agente não reporta em 24 horas.** Sem isso, o Pi falha em silêncio e o sistema fica cego sem ninguém saber.

---

## 7. Tablet Android em modo quiosque

### Como travar o aparelho

Três níveis, e o gratuito resolve a maior parte do caso.

| Opção | O que faz | Custo | Limites |
|---|---|---|---|
| **Fixação de tela nativa do Android** (Configurações > Segurança > Fixação de app) | Trava o aparelho no app aberto. Texto oficial da Google: "When app pinning is on, you need to enter your PIN, pattern, or password before you can unpin." O cliente na mesa **não sai do app sem a senha do gerente** | **R$ 0** | **Não reabre sozinho depois que o tablet reinicia.** Não bloqueia notificação nem volume. Alguns passos só existem no Android 11 ou superior |
| **Fully Kiosk Browser PLUS** | Lockdown de verdade: modo quiosque, **boot on start**, screensaver, API REST/JS/MQTT, leitor de QR | **8,90 EUR (ou 10,99 US$) + imposto, por dispositivo, pagamento único**, com desconto por volume a partir de 10 aparelhos. Fully Cloud, opcional: máximo 1,18 EUR/mês por dispositivo no pagamento anual | Suporte oficial de Android 6 a 16, com aviso de que derivados como **Android Go**, Fire OS, Chrome OS e Android TV "may have restricted feature set or serious issues" |
| **PWA instalado na tela inicial em modo fullscreen** | Elimina a barra do navegador | **R$ 0** | **Não trava nada por si só.** É complemento das opções acima, nunca substituto |
| **Android Enterprise / dispositivo dedicado (COSU) com MDM** | O jeito de fábrica | Depende do MDM | Exagero de operação para um tablet num salão de 22 mesas |

> **Correção do verificador, aplicada aqui.** A pesquisa original dizia que o preço do Fully Kiosk PLUS **não estava** na página oficial e citava 7,90 EUR de terceiro. Duplo erro: o preço **está** na página oficial e o valor correto é **8,90 EUR**, 12,7% acima do citado. É dado oficial, não estimativa.

**Recomendação:** comece com a fixação nativa, que é gratuita e imediata. Mas, dada a restrição de que ninguém vai manter o sistema, a recomendação honesta é **comprar a licença Fully Kiosk PLUS logo (8,90 EUR por aparelho, pagamento único)**, porque o `boot on start` elimina a única tarefa humana recorrente do quiosque: reabrir e refixar o app depois de uma queda de energia. Dois aparelhos custam 17,80 EUR, uma vez na vida. Trocar uma tarefa humana recorrente por um pagamento único é o melhor negócio disponível neste projeto.

### Especificação mínima para um PWA leve

O app é um formulário de 5 a 8 campos, sem vídeo, com duração máxima de 45 segundos por resposta. A especificação abaixo tem folga de propósito, porque o gargalo não é desempenho, é **navegador atualizado**: WebView velho quebra service worker e IndexedDB.

| Item | Mínimo | Por quê |
|---|---|---|
| **RAM** | 4 GB | Abaixo disso o navegador é morto em background e o app recarrega no meio da resposta |
| **Versão do Android** | **13 ou superior**, de fábrica. Prefira 15 | Chrome e WebView atualizados, service worker moderno. Este é o item que decide a vida útil do aparelho |
| **Tela** | 10 a 11 polegadas | O cliente lê sentado, com o tablet na mesa. 8 polegadas funciona, mas é apertado para NPS de 0 a 10 lado a lado |
| **Armazenamento** | 64 GB | Folga irrelevante para o app, mas evicção de dados acontece por pressão de disco (seção 8) |
| **Wi-Fi** | Wi-Fi 5 | Suficiente. O app pesa kilobytes |
| **Evitar** | **Android Go**, 2 GB de RAM, tela 1024x600 | A própria Fully documenta feature set restrito em Android Go, e 2 GB inviabiliza operação estável |

### Modelos concretos

| Modelo | Especificação apurada | Preço |
|---|---|---|
| **Samsung Galaxy Tab A11** | 8,7 polegadas, 800x1340, 90 Hz, MediaTek Helio G99, opções de 4 GB/64 GB e de 4, 6 ou 8 GB/128 GB, **Android 15 de fábrica, atualizável para Android 16 / One UI 8**. Anunciado em 12/09/2025 | **NÃO VERIFICADO em BRL.** Referência independente: cerca de 180 EUR (GSMArena) |
| **Samsung Galaxy Tab A11+** | 11 polegadas, 6 GB de RAM, 128 GB, microSD até 2 TB, processador de 4 nm | **NÃO VERIFICADO.** A loja Samsung Brasil não expõe preço em conteúdo legível por robô |
| **Lenovo Tab M11** | 11 polegadas FHD, octa-core, 4 GB de RAM, 128 GB, Wi-Fi, Android 14 | **NÃO VERIFICADO** na página oficial lida |
| **Xiaomi Redmi Pad 2 / Redmi Pad SE** | Citados por comparativos brasileiros como melhor custo-benefício de entrada. **Especificação não apurada** aqui | **NÃO VERIFICADO** |

> **Correções do verificador, aplicadas aqui.** (1) O Galaxy Tab A11 sai de fábrica com **Android 15**, não com Android 16. Afirmar Android 16 como especificação de fábrica é otimista, e a versão de fábrica é justamente o dado sensível à decisão, porque o requisito mínimo é Android 13+ por causa de WebView e service worker. (2) A faixa de **R$ 900 a R$ 1.200** citada na pesquisa original é **NÃO VERIFICADA**: vem só de terceiro, e é o único item de investimento em hardware do projeto. Preço em BRL exige cotação em varejista no momento da compra.

> **Lacuna registrada pelo verificador:** os preços em BRL do Tab A11+ e do Lenovo Tab M11 não estão expostos nas páginas oficiais. O investimento em hardware do projeto segue **sem cotação verificável**.

**Recomendação:** um dos dois de **11 polegadas** (Galaxy Tab A11+ ou Lenovo Tab M11), pela tela e pelo Android recente. **Compre dois**: um em uso e um de reserva carregado.

### Comprando no Paraguai: o que verificar na loja

Como o preço em BRL não é verificável e o preço no Paraguai **não foi pesquisado**, a parte útil aqui não é o número, é o checklist de loja. Os itens abaixo são de engenharia e de bom senso, não de fonte publicada, e estão marcados como tal.

**Verificar no aparelho, na loja, antes de pagar** (peça para ligar e olhar você mesmo):

1. **Configurações > Sobre o tablet > Versão do Android.** Precisa ser **13 ou superior**. Não aceite a promessa do vendedor, olhe na tela. É o item que mais separa um tablet que dura três anos de um que quebra o PWA no ano que vem.
2. **RAM real em Configurações**, não na caixa. Mínimo 4 GB.
3. **Play Store > Configurações > Sobre > Certificação do Play Protect.** Precisa dizer que o dispositivo é **certificado**. Tablet não certificado dá problema para instalar e atualizar o Chrome, e é justamente o risco de aparelho de marca desconhecida no mercado cinza.
4. **Fixação de app existe no menu?** Configurações > Segurança > Fixação de app. Se o fabricante removeu, seu plano gratuito de quiosque morre ali.
5. **Fonte de 100 a 240 V.** O carregador tem de servir na tomada do Rio. Está escrito em letra miúda na própria fonte.
6. **Tela: toque nos cantos e nas bordas.** É o defeito mais comum e o mais difícil de resolver depois.

**O que evitar** (julgamento, não fonte):

- **Android Go em qualquer aparelho.** A restrição de recursos é documentada pela própria Fully, e a RAM não sustenta o navegador.
- **Marca que você nunca viu**, mesmo com especificação boa no papel. Sem certificação do Play e sem atualização, o tablet é descartável.
- **Modelo de 2 GB de RAM**, por mais barato que esteja.
- **Contar com garantia.** Compra fora do Brasil não tem rede autorizada aqui. Trate os dois tablets como consumíveis, e é mais um argumento para levar o segundo aparelho na mesma viagem.
- **Regras de bagagem e cota do viajante: NÃO VERIFICADAS** neste documento. Confira na Receita Federal antes de viajar, porque isso é sobre dinheiro e não sobre tecnologia.

**Alternativa que dispensa tablet:** QR Code impresso na mesa e no comprovante, com o cliente respondendo no próprio celular. Elimina o hardware inteiro, elimina o problema de quiosque e ainda ganha o identificador de dispositivo do cliente que a seção 10 discute. O custo é **taxa de resposta**: quem tem de tirar o celular do bolso responde menos. O briefing já decidiu usar os dois canais, e essa é a decisão certa: o tablet carrega o volume, o QR Code carrega a cauda.

---

## 8. PWA offline com fila local: vale a pena mesmo com internet estável

**Vale, e é barato.** Não pela internet do salão, que é estável, mas por três situações que acontecem em qualquer salão estável: o roteador reiniciando no meio do serviço, o Wi-Fi oscilando por alguns minutos numa noite cheia, e o cliente tocando em "enviar" no instante exato em que a conexão pisca. Sem fila local, cada um desses casos é uma resposta perdida e, pior, uma resposta perdida **com o cliente vendo uma tela de erro**, o que contamina a experiência que a pesquisa está justamente medindo.

**Cota não é problema.** Os limites oficiais (MDN) são generosos ao ponto de irrelevância: no Chrome e derivados, um origin pode usar até 60% do disco total; no Firefox, best-effort é o menor entre 10% do disco e 10 GiB, e persistent vai até 50% do disco; no Safari, a partir de macOS 14 e iOS 17, cerca de 60% do disco. Duzentas respostas por mês com notas, comentário e contato são **kilobytes**. Não existe cenário de estouro aqui.

**O que importa é evicção, não cota.** Por padrão o armazenamento é best-effort, ou seja, descartável sob pressão de disco, por política LRU. Dois detalhes decidem o desenho:

1. **Quando um origin é despejado, todos os dados dele vão de uma vez** (IndexedDB, Cache API, tudo), para não deixar estado inconsistente. Então "fila meio apagada" não acontece: ou está toda lá, ou nada está. Isso é bom, porque simplifica o tratamento de erro.
2. **O Safari apaga proativamente dados criados por script após 7 dias sem interação do usuário**, quando a prevenção de rastreamento cross-site está ligada. Irrelevante no tablet Android, **decisivo** se o fluxo migrar para o celular do cliente via QR Code, porque derruba tanto a fila quanto o identificador de recorrência da seção 10.

### Desenho recomendado, e onde parar

O escopo abaixo é deliberadamente pequeno. Fila offline é o tipo de recurso que vira projeto se ninguém disser onde para.

| Peça | O que faz | Por que está aqui |
|---|---|---|
| Service worker com os assets no Cache API | O app abre sem rede | Sem isso, uma queda de Wi-Fi deixa o tablet numa tela branca na frente do cliente |
| Object store `fila_respostas` no IndexedDB | Cada registro com **UUID v4 gerado no cliente**, timestamp e status (pendente/enviado) | O UUID no cliente é o que permite idempotência no servidor |
| Idempotência no servidor pela chave UUID | Reenvio duplicado não gera resposta duplicada | O retry do Background Sync **vai** reenviar. Sem idempotência, o NPS do dia infla |
| Background Sync quando houver rede, com retry exponencial, e reenvio no próximo load do app como reserva | Envia sozinho | O "no próximo load" é o que salva quando o Background Sync não dispara |
| `navigator.storage.persist()` na instalação | Passa de best-effort para persistent, e aí só o usuário apaga | Custa uma linha e remove a evicção automática do mapa de riscos |
| **Contador visível de "X respostas aguardando envio"** | O gerente enxerga que algo está errado | É o único alarme que funciona num sistema que ninguém monitora |
| Heartbeat diário do tablet para o Worker | Avisa o dono se o tablet ficou 24h sem sincronizar | Cobre o caso pior: tablet esquecido desligado ou fora do Wi-Fi |

**Um detalhe de desenho que a fila offline força, e que é fácil esquecer:** se o garçom digita mesa e PIN antes de entregar o tablet, e o tablet está offline, **o PIN não pode ser validado contra o servidor naquele momento**. Não tente resolver isso guardando hash de PIN no tablet, porque isso coloca credencial de equipe num aparelho que circula pelo salão. Trate o PIN como **dado da resposta**, não como autenticação: grave o que foi digitado, valide na sincronização e marque como "garçom não reconhecido" o que não casar. O PIN aqui serve para atribuir atendimento, não para proteger nada.

**O que não construir:** sincronização bidirecional, resolução de conflito, cache de configuração com invalidação, ou modo offline no painel do dono. Nada disso é necessário. A fila é de mão única: o tablet só escreve.

**O risco que sobra é humano, não técnico:** alguém limpar dados do navegador ou desinstalar o PWA com fila pendente. Mitigação barata: além do IndexedDB, escreva cada resposta também num backup append-only no `localStorage`, como redundância de custo zero.

---

## 9. WhatsApp: por que ficou fora, e quanto custaria de fato

### O modelo mudou, e a maior parte do que se lê na internet está desatualizada

Dois textos oficiais da Meta resolvem quase tudo:

- **"Effective July 1, 2025, Meta charges on a per-message basis"** e **"You are only charged when a template message is delivered"**. Não é mais por conversa, é por mensagem entregue, e a cobrança acontece na entrega, não no envio.
- **"Effective November 1, 2024 - Service conversations are now free for all businesses"**. A antiga cota de 1.000 conversas de serviço gratuitas por mês não existe mais porque **o serviço inteiro virou gratuito**.

Consequências que mudam a conta:

| Situação | Custo |
|---|---|
| Cliente inicia a conversa e você responde dentro da janela de atendimento aberta | **Grátis.** "All non-template messages are free" dentro da janela |
| Template de **utilidade** entregue dentro de uma janela de atendimento aberta | **Grátis** |
| Você inicia a conversa **fora** da janela, com template | **Pago**, e o preço depende da categoria (Marketing, Utility ou Authentication) |
| Cliente clica em anúncio Click-to-WhatsApp e você responde em até 24h | **Grátis** (Free Entry Point), com janela livre de 72 horas depois |

### O custo real no Brasil: os números existem, mas não foram lidos

> **Correção do verificador, aplicada aqui.** A pesquisa original declarou os preços do Brasil como **NÃO PÚBLICOS**, alegando que o rate card da Meta é uma ferramenta interativa. **Isso está refutado.** A documentação de desenvolvedor da Meta publica rate cards **baixáveis por moeda, com BRL incluído**, em CSV (rates), CSV (volume tiers) e PDF, e diz explicitamente "Per-message rates in BRL are now published below". O site de marketing é interativo; a doc de desenvolvedor não é. Havia caminho oficial e ele não foi percorrido.

> **Lacuna registrada pelo verificador:** os arquivos CSV e PDF por moeda são referenciados na doc, mas **as URLs de download não foram alcançáveis** nesta apuração. Portanto **os valores oficiais em BRL seguem NÃO VERIFICADOS neste documento.** Ação concreta: baixar manualmente o CSV de BRL em [developers.facebook.com/docs/whatsapp/pricing](https://developers.facebook.com/docs/whatsapp/pricing) e substituir toda a faixa de terceiros pelos valores oficiais de Utility, Marketing e Authentication, mais os volume tiers. **Sem isso não existe número confiável para decidir entre "cliente inicia" e "restaurante dispara".**

> **Correção do verificador sobre a estimativa de terceiros.** A pesquisa original disse que as fontes brasileiras "convergem" para Utility entre R$ 0,03 e R$ 0,05. **A palavra "convergem" é falsa.** Outras fontes do mesmo período dão Utility em R$ 0,08 (o dobro), Marketing em R$ 0,39 e Authentication em R$ 0,0945 (metade da faixa citada). Há **dispersão de 2x em Utility**, não convergência.

Cenário do QT, refeito com a incerteza honesta. Vinte mesas por dia, terça a domingo, dão cerca de **520 disparos por mês**:

| Cenário | Custo estimado por mês | Confiança |
|---|---|---|
| Disparo ativo como **Utility** | **de ~R$ 16 a ~R$ 42/mês** (faixa de terceiros conflitantes, R$ 0,03 a R$ 0,08 por mensagem) | **Baixa.** A pesquisa original citava "~R$ 21", número que o verificador derrubou |
| Disparo ativo **reclassificado como Marketing** | cerca de **R$ 182/mês** a R$ 0,35 por mensagem | Baixa, e é o risco que importa |
| Desenho **"cliente inicia"** (QR Code que abre `wa.me`) | **R$ 0** | Alta. É consequência direta de texto oficial |

Existe desconto por volume de até 40% em utility e authentication; marketing não entra em desconto por volume. Irrelevante neste volume.

### A burocracia de template

Template aprovado continua **obrigatório** para iniciar conversa fora da janela de atendimento. Ele é classificado em Marketing, Utility ou Authentication, e **a categoria determina o preço**. Mensagens de serviço não precisam de template, mas só valem dentro da janela aberta pelo cliente.

Os riscos, em ordem de probabilidade:

1. **Reclassificação de categoria.** "Responda nossa pesquisa" fica exatamente na fronteira entre Utility e Marketing. Uma reclassificação multiplica o custo por cerca de 8 vezes, e ela pode acontecer **sem aviso**.
2. **Rejeição ou recategorização do template**, quebrando o fluxo diário até alguém reescrever e reenviar para aprovação. Num sistema sem mantenedor, isso significa canal morto.
3. **Qualidade do número.** Marcação de spam rebaixa o tier ou bloqueia o número. Num restaurante, o número do WhatsApp **é** o canal de atendimento e de reserva. Arriscar o número principal por uma pesquisa é troca ruim.
4. **Markup de BSP.** Se usar um BSP em vez da Cloud API direta, entram mensalidade de plataforma e markup por mensagem, **não cobertos** por nenhum dos números acima.
5. **LGPD.** Usar o WhatsApp coletado na pesquisa para disparo ativo é **finalidade nova** e exige consentimento próprio e destacado (seção 10).

**Faturamento em BRL:** a partir de 01/07/2026, clientes elegíveis podem criar novas WABAs faturadas em reais pela entidade local da Meta no Brasil, e a migração para real passa a ser obrigatória até 30/06/2027.

### Por que ficou fora do MVP, e o que fazer no lugar

Fora por três razões que se somam, nenhuma delas técnica:

1. **O briefing já colocou o WhatsApp na fase 3**, tanto como canal de coleta quanto de relatório, e definiu e-mail às 16h como canal do resumo diário. Não há conflito a resolver.
2. **O número decisório não existe ainda.** Decidir disparo ativo hoje é decidir com faixa de 2x de incerteza sobre o único custo recorrente em dinheiro do projeto inteiro. Espere o CSV oficial.
3. **Cada template é uma peça burocrática viva**, sujeita a recategorização sem aviso, num sistema cuja restrição mais dura é não ter mantenedor.

**Alternativa para o resumo diário, em ordem:**

| Opção | Como funciona | Avaliação |
|---|---|---|
| **Resend com domínio próprio autenticado** (SPF/DKIM) | 3.000 e-mails/mês, 100/dia no plano gratuito. O relatório das 16h sai por aqui | **É a escolha.** Folga de 20x, API simples, retenção de 30 dias suficiente para depurar. **A autenticação de domínio não é opcional**: sem SPF/DKIM o relatório cai em spam e o dono conclui que o sistema não funciona |
| **Relatório como página protegida no Cloudflare Pages, com o e-mail levando só o link** | Reduz a dependência de entregabilidade a quase zero | Ótimo complemento. Custo: o dono tem de abrir o link. Recomendado como **plano B automático** do corpo do e-mail |
| **Fallback por SMTP de outro provedor** | Se a API do Resend falhar, o Worker reenvia | Boa prática. **Ressalva:** os 300 e-mails/dia do Brevo seguem **NÃO CONFIRMADOS em página da própria Brevo** (lacuna registrada pelo verificador) e não devem entrar como "degrau seguinte gratuito" garantido |
| **WhatsApp no desenho "cliente inicia"** | QR Code que abre `wa.me` com mensagem pronta; todo o diálogo nas 24h seguintes é gratuito | **É por aqui que o WhatsApp deve entrar, quando entrar.** Custo zero, nenhum template, nenhuma aprovação |

Só considere disparo ativo por template quando tiver medido que o retorno por resposta paga a faixa de R$ 16 a R$ 42 por mês, e sempre testando a categoria Utility antes de escalar.

---

## 10. LGPD: o que a lei realmente exige, e o que é exagero

> **Nota de confiança que precisa ficar visível.** O texto integral da Lei 13.709 **não pôde ser lido** na apuração (o Planalto devolveu HTTP 503 em três tentativas) e **não foi reverificado** na rodada de verificação. Os artigos 7 (incisos I e IX), 11 e 16 estão apoiados em guias da ANPD e fonte secundária. **Valide os números de artigo contra a lei antes de publicar o aviso de privacidade.** Os artigos da Resolução CD/ANPD nº 2/2022, ao contrário, foram verificados direto na fonte da ANPD.

### Base legal

Para coletar nome, WhatsApp e histórico de consumo numa pesquisa **voluntária**, a base natural é o **consentimento** (art. 7, I), porque nada disso é necessário para executar o contrato de vender pizza.

O **legítimo interesse** (art. 7, IX) pode sustentar a análise **agregada** da qualidade do serviço, mas a ANPD, no Guia Orientativo sobre Legítimo Interesse (fev/2024), exige um **teste de balanceamento em três fases** (finalidade, necessidade, e balanceamento com salvaguardas) e exige que o interesse seja concreto e não especulativo, com finalidade legítima, específica e explícita. **Não use legítimo interesse como atalho quando o consentimento é perfeitamente viável**, que é exatamente o caso aqui.

E o ponto que mais gera problema depois: se você quiser usar o WhatsApp coletado na pesquisa para **promoção**, isso é **finalidade nova** e exige consentimento próprio e destacado. Não vale reaproveitar o "aceito" da pesquisa.

### O que a lei exige na prática, em ordem de implementação

| # | Exigência | Como fica no produto |
|---|---|---|
| 1 | **Aviso de privacidade** antes do envio | Rodapé de três linhas na própria tela do quiosque, com link para a página completa. Precisa dizer: quem é o controlador (razão social e CNPJ), para que serve a pesquisa, quais dados são coletados, **com quem são compartilhados** (nomeie as categorias: hospedagem, banco de dados, provedor de e-mail, serviço de IA), por quanto tempo ficam guardados, e o canal para exercer direitos |
| 2 | **Consentimento com caixa não pré-marcada**, e **duas caixas separadas** | Uma para responder à pesquisa, outra para receber contato ou promoção. Guarde **data, hora e a versão do texto aceito**. Sem esse registro você não consegue provar o consentimento, e é isso que se pede numa fiscalização |
| 3 | **Nome e WhatsApp opcionais** | A pesquisa tem de funcionar em branco. Coletar o que não é necessário viola o princípio da necessidade, e **este é o ponto mais violado por sistema de pesquisa de restaurante.** O briefing já acertou: só a nota é obrigatória |
| 4 | **Direito de exclusão e revogação**, por canal gratuito e facilitado, a qualquer momento | Um link "apagar meus dados" no rodapé e um WhatsApp ou e-mail publicado. Não precisa de formulário jurídico |
| 5 | **Retenção com prazo escrito e implementado em código** | Um job que, passado o prazo, apaga nome e telefone e mantém só o agregado. O art. 16 manda eliminar depois do término do tratamento. **Prazo em intenção não conta, tem de ser código agendado** |
| 6 | **Segurança proporcional** | RLS ligado no Supabase, 2FA na conta, chave de serviço **fora** do front-end do PWA, e nada de exportar planilha de clientes para grupo de WhatsApp |
| 7 | **Registro simplificado das operações de tratamento** (Res. CD/ANPD nº 2/2022, art. 9) | Uma planilha de uma página basta |

### O que você ganha como agente de tratamento de pequeno porte

A Resolução CD/ANPD nº 2/2022 enquadra microempresas e empresas de pequeno porte pelos limites de receita da LC 123/2006 e traz alívios reais:

| Artigo | O que dá |
|---|---|
| **Art. 9** | Registro simplificado das operações de tratamento |
| **Art. 11** | **Não é obrigatório indicar encarregado (DPO)**, desde que exista canal de comunicação com o titular |
| **Art. 13** | Política de segurança simplificada, considerando custos, estrutura, escala e volume |
| **Art. 14** | **Prazo em dobro** para atender solicitação do titular, comunicar incidente e fornecer declarações |
| **Art. 15** | A **declaração simplificada** do art. 19, I, da LGPD pode ser fornecida em **até quinze dias** contados do requerimento do titular |

> **Correção do verificador, aplicada aqui.** A pesquisa original colocava o prazo de 15 dias da declaração simplificada como uma exceção **dentro do art. 14**. Está errado: os 15 dias estão no **art. 15**, artigo autônomo. O art. 14 trata do prazo em dobro. Os artigos 9, 11 e 13 estavam corretos.

**Atenção ao limite do alívio:** a própria resolução diz que a flexibilização **não isenta** do cumprimento das bases legais nem dos princípios. Pequeno porte simplifica a burocracia, não a substância.

### O que é exagero para uma operação de uma unidade

Isto aqui é dinheiro e tempo que não precisam ser gastos: contratar **DPO externo**; produzir **RIPD/DPIA completo**; buscar **ISO 27001**; **criptografia de campo** no banco; **contrato de operador de dezenas de páginas** com cada fornecedor SaaS; **consentimento em papel assinado**; e **política de privacidade de 15 páginas** que ninguém lê e que, por não ser lida, piora a transparência em vez de melhorar.

### A linha vermelha absoluta

**Não envie comentário com nome e telefone para LLM em camada gratuita que treina com o dado.** Os termos da Gemini API, no tier não pago, dizem literalmente: "Google uses the content you submit to the Services and any generated responses to provide, improve, and develop Google products and services and machine learning technologies", "Human reviewers may read, annotate, and process your API input and output" e, sem rodeio, **"Do not submit sensitive, confidential, or personal information to the Unpaid Services"**. No tier pago o texto é o oposto.

Por isso a escolha de LLM do projeto é o **Groq**, cujo contrato de serviços diz que não é permitido usar inputs ou outputs para treinar ou ajustar modelos sem permissão explícita do cliente.

E a regra de ouro que vale independente de fornecedor, porque protege contra a troca de provedor amanhã: **nunca envie identificador direto ao LLM.** Mande só o texto do comentário e as notas, com nome e WhatsApp substituídos por um id interno, e reconstitua a identidade no seu banco.

### Reconhecer cliente recorrente sem cadastro: o desenho recomendado

> **Confiança baixa nesta subseção.** É interpretação aplicada, não citação literal de dispositivo legal, e o texto da lei não pôde ser lido diretamente. Trate como desenho defensável, não como parecer.

Comece pelo erro conceitual mais comum: **hash de telefone não anonimiza nada.** É pseudonimização, porque o espaço de busca de um número brasileiro é pequeno o suficiente para reverter o hash por força bruta em segundos. Dado pseudonimizado **continua sob a LGPD**. Só dado anonimizado de forma irreversível, considerando meios técnicos razoáveis, sai do escopo.

Com isso posto, quatro desenhos possíveis:

| Desenho | Como funciona | Utilidade | Exposição | Veredito |
|---|---|---|---|---|
| **A. Código voluntário de 6 caracteres** | O cliente recebe ou escolhe um código curto e digita nas visitas seguintes | Média a alta, dependendo da adesão | **Baixa.** O vínculo só existe se o cliente quiser, ele entende exatamente o que está fazendo, a exclusão é apagar uma linha, e **nenhum telefone é guardado para reconhecer recorrência** | **Camada opcional recomendada.** É o mais equilibrado, e o mais honesto de explicar em uma frase |
| **B. Identificador de dispositivo do próprio cliente** | UUID v4 aleatório no primeiro acesso, guardado no `localStorage` do navegador **dele**, quando a resposta vem por QR Code no celular | Média, e frágil | Baixa, **se houver aviso claro** de que existe um identificador local | **Complemento, só no fluxo por QR Code.** Frágil por natureza: navegação privada, limpar dados, trocar de celular, e no iOS a evicção de 7 dias sem interação apaga o identificador. **Não serve no tablet do restaurante**, onde o UUID identificaria a mesa, não a pessoa |
| **C. Recorrência pelo lado do pedido, não da pessoa** | Amarra a resposta ao pedido, mesa e turno, e trabalha padrão de consumo (itens, ticket, dia da semana, horário) | Alta para análise, nula para reconhecer indivíduo | **Nenhuma**, desde que não haja identificador de cliente pendurado. É dado do negócio, não da pessoa | **Base analítica sempre ligada.** Cobre boa parte do valor ("mesa que pede entrada avalia melhor", "sexta tem nota pior") com risco zero |
| **D. Opt-in leve com apelido** | Primeiro nome mais os quatro últimos dígitos do telefone | Resolve o "você já veio antes?" | **Média.** Ainda é dado pessoal, embora minimizado | Só se A e B não derem taxa de reconhecimento suficiente |

**O que não fazer, em nenhuma hipótese:**

- **Reconhecimento facial ou qualquer biometria.** É dado sensível (art. 11), exige consentimento específico e destacado, e para um salão de 22 mesas é desproporcional e cria um passivo enorme por um ganho pequeno.
- **Fingerprinting de dispositivo** por canvas, fontes ou IP. É tratamento oculto: o titular não tem como se opor a algo que não sabe que existe.
- **Cruzar o telefone do delivery com o do salão** sem aviso e sem consentimento para essa finalidade.
- **Comprar ou enriquecer base de terceiros.**

**Desenho recomendado para o QT:** **C como base analítica sempre ligada, mais A como camada opcional de reconhecimento.** Na prática: "guarde este código e a gente te reconhece na próxima visita." Zero telefone armazenado para fins de recorrência, botão de "apagar meu código", e expiração automática do código depois de 12 meses sem uso. Custo: zero, é lógica de banco.

**Uma tensão real a resolver, e ela é de produto, não de lei.** O MVP inclui base de clientes e CRM, e CRM quer histórico longo, enquanto retenção curta quer apagar. Retenção de 12 meses **contados da coleta** apaga justamente o cliente que volta uma vez por ano, que é exatamente quem a campanha de retorno deveria alcançar. Desenho mais útil e ainda defensável: contar a retenção **a partir da última visita**, não da coleta, e renovar o prazo a cada nova visita, porque enquanto a relação está viva a finalidade também está. Escolha o número (12 ou 24 meses), escreva na página de privacidade, e implemente no job. **Este é julgamento de produto, confiança média, e é uma decisão que o dono precisa tomar de forma explícita, não por omissão.**
