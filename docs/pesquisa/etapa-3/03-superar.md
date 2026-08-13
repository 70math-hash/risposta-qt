# Etapa 3.3. O que SUPERAR: as oito mecânicas que justificam construir

> Fontes lidas na íntegra para escrever este documento: [`00-briefing.md`](../../00-briefing.md), [`dados/10-supabase-inspecao.md`](../dados/10-supabase-inspecao.md), [`03-global.md`](../03-global.md), [`07-matriz-features.md`](../07-matriz-features.md), [`04-custo-zero.md`](../04-custo-zero.md) e [`06-questionario.md`](../06-questionario.md).
> **As correções dos verificadores adversariais têm precedência.** Nenhum preço refutado é usado aqui como régua. Onde não existe valor lido em página oficial, está escrito **NÃO PÚBLICO**, **NÃO VERIFICADO** ou **DESCONHECIDO**.
> A inspeção do Supabase de 13/08/2026 vale mais que qualquer suposição anterior deste dossiê, inclusive a recomendação de organização separada, que está formalmente revogada aqui.

---

## 1. A tese

A pergunta que este documento existe para responder é uma só, e ela é desconfortável: **por que construir, se a Avalio publica o plano Starter a R$ 575,00 por ano à vista, equivalentes a R$ 47,92/mês, com API REST inclusa?**

A resposta não é preço. Contra R$ 47,92/mês, a economia de trocar de fornecedor já resolveria a dor de custo do briefing sozinha, e seria desonesto fingir o contrário. A resposta é que **existem oito coisas que nenhum fornecedor vende, em nenhuma faixa de preço, e sete delas são desenho e não tecnologia**. Um sistema de pesquisa genérico a R$ 47,92/mês coleta nota e devolve gráfico. Ele não sabe que a casa fecha depois da meia-noite, não sabe quanto custa a muçarela, não sabe que 50 respostas por mês não sustentam uma seta subindo, e não tem como saber, porque nada disso é problema dele.

O ganho é **estrutural, e não temporário**, por três razões que não dependem de nenhum fornecedor errar:

1. **A metade difícil do diferencial já está pronta e é inacessível a terceiros.** O custo de insumo do QT já vive em Postgres, no projeto `NFe e Financeiro`: `insumos_master` com 131 linhas e `historico_precos` com 344, alimentados por 422 notas e 1.179 itens de nota. Nenhum fornecedor de experiência do cliente tem acesso ao custo de insumo do cliente dele, e isso não é descuido: é limitação do modelo de negócio deles. O que falta no QT não é dado de custo, é a ficha técnica que liga prato a insumo, e ela já tem tabela criada e vazia (`pratos` com 1 linha, `prato_ingredientes` com 0). O diferencial nº 1 do briefing depende de **preencher estrutura existente**, não de construir estrutura nova.
2. **As restrições da casa são o ativo, não o obstáculo.** Uma unidade, só jantar, fecha segunda, mesas juntadas, comandas individuais, 20 mesas por dia. Cada uma dessas frases é uma decisão de produto que um fornecedor multi-loja não pode tomar sem quebrar o produto para os outros clientes dele. O corte do dia operacional às 6h da manhã é uma linha de código aqui e uma migração global lá.
3. **O volume pequeno é permanente, e quase todo o mercado está desenhado para escondê-lo.** A Tattle, referência mundial em profundidade, declara no [FAQ oficial](https://get.tattleapp.com/resources/faq/) que não recomenda o produto para marcas com menos de 10 lojas, porque o motor de recomendação dela precisa de volume. Ninguém publica intervalo de confiança ao lado do número, porque publicar incerteza reduz a percepção de valor do painel que está sendo vendido. O QT não vende painel para ninguém, então pode fazer a única coisa que o mercado não pode: **dizer quando não sabe**.

O que vem abaixo não é lista de desejos. É a lista do que o sistema próprio faz melhor que o incumbente **e** melhor que o melhor do mundo, com o desenho concreto de cada uma, a conta que prova a afirmação, a métrica que diz se está funcionando, e a trava que impede a mecânica de fazer mal.

Uma ressalva de honestidade, dita agora para não parecer descoberta depois: das oito mecânicas, **uma não é superação, é empate com governança melhor** (o sentimento frase por frase, seção 2.6). Está aqui porque é peça obrigatória do conjunto, não porque o QT invente algo.

---

## 2. As mecânicas de superação

### 2.1 Satisfação cruzada com CMV e ficha técnica

**A mecânica.** Ligar reclamação por prato a **custo de insumo e margem de contribuição do mesmo prato**, no mesmo quadrante, com o denominador vindo do PDV. Não é "a Carbonara tem nota 4,2". É "a Carbonara gerou 5 reclamações em 210 unidades vendidas no trimestre, 2,4 por 100, contra 0,6 por 100 na média do cardápio, e ela é o item de maior margem unitária da casa".

**Quem no mundo mais chega perto, e onde para.** A **Tattle** liga satisfação a receita, com dashboard de Revenue Analysis, e compara o item contra a média do cardápio, verbatim `See how a menu item performs against the menu average` ([get.tattleapp.com](https://get.tattleapp.com/features/item-level-feedback/)). A **Yumpingo** declara conectar satisfação a performance financeira. A **Bikky** faz análise de cardápio sobre dado de PDV. **Todos param na receita. Nenhum entra na ficha técnica.** Isso é ausência de evidência nas 36 fontes globais do dossiê, não prova de ausência no mundo: **confiança média**. E a razão de eles pararem ali é estrutural, o que sustenta a afirmação de que o ganho não é temporário: fornecedor de CX não tem o custo de insumo do cliente, e ficha técnica vive em outro sistema.

**Como funciona no QT, em desenho concreto.**

O caminho tem quatro etapas, e a ordem importa porque a etapa 1 é a única cara.

**Etapa 1, preencher `pratos` e `prato_ingredientes`.** É carga única, feita por migration versionada, nunca ad hoc no painel do Supabase.

| Passo | O que é feito | Onde |
|---|---|---|
| 1.1 | Uma linha por item de cardápio em `pratos`, com nome canônico e preço de venda vigente | `public.pratos` (hoje com 1 linha) |
| 1.2 | Uma linha por insumo de cada ficha em `prato_ingredientes`, com quantidade, unidade e fator de correção | `public.prato_ingredientes` (hoje vazia) |
| 1.3 | Amarrar cada linha ao `insumos_master` que já existe, resolvendo nome à mão uma vez | `public.insumos_master` (131 linhas) |
| 1.4 | Tabela de equivalência entre o nome do produto no R3 do Altec e o `prato_id`, porque o nome do PDV nunca bate com o nome da ficha | schema `experiencia`, tabela nova |

As fichas técnicas continuam vivendo nas skills do Claude Code, como o briefing instruiu. O que entra no banco é o **resultado** delas, e o sistema de experiência **apenas lê**. Ele nunca recalcula ficha, nunca escreve em `pratos`, e não tem permissão de escrita fora do próprio schema.

**Etapa 2, onde as tabelas novas moram.** Schema dedicado (`experiencia`) **dentro do projeto `NFe e Financeiro`** (`rzrjdbnxhpwzqgqrlfwa`, `sa-east-1`), com RLS e papel próprio. Isto substitui a recomendação de organização Supabase separada que estava no sumário executivo: a organização é uma só, o teto de 2 projetos ativos já está atingido (`NFe e Financeiro` e `qt-avaliacoes` ativos, `Fichas Sensoriais` inativo), e criar um quarto projeto no plano gratuito implica pausar outro. O motivo positivo é mais forte que o negativo: **é o único arranjo que permite `JOIN` direto entre resposta de pesquisa e custo por prato**. Projeto separado significaria sincronizar custo por rotina, ou seja, mais uma peça móvel num sistema que ninguém vai manter.

**Etapa 3, a consulta que junta.** Ela roda uma vez por trimestre, escreve numa tabela de resumo e o painel só lê o resumo (o teto de 10 ms de CPU do Cloudflare Workers Free exige pré-agregar no Postgres).

```sql
-- ATENÇÃO: os nomes de COLUNA abaixo são NÃO VERIFICADOS. A inspeção de 13/08/2026
-- leu nomes de tabela e contagem de linhas, não o esquema de colunas. Conferir antes de rodar.
with reclamacoes as (
  select rp.prato_id, count(*) as eventos
  from experiencia.resposta_prato rp
  join experiencia.resposta r on r.id = rp.resposta_id
  where r.dia_operacional between :ini and :fim
    and r.nota <= 6
  group by 1
),
vendas as (                       -- denominador CENSITÁRIO, vem do R3 do Altec
  select v.prato_id, sum(v.unidades) as unidades, sum(v.receita) as receita
  from experiencia.venda_produto_dia v
  where v.dia_operacional between :ini and :fim
  group by 1
),
custo as (                        -- preço vigente do insumo na data de referência
  select pi.prato_id, sum(pi.quantidade * hp.preco_unitario) as cmv_unitario
  from public.prato_ingredientes pi
  cross join lateral (
    select h.preco_unitario from public.historico_precos h
    where h.insumo_id = pi.insumo_id and h.data <= :fim
    order by h.data desc limit 1
  ) hp
  group by 1
)
select p.nome,
       v.unidades,
       c.cmv_unitario,
       (v.receita / nullif(v.unidades,0)) - c.cmv_unitario as margem_unitaria,
       coalesce(x.eventos,0)                               as eventos,
       100.0 * coalesce(x.eventos,0) / nullif(v.unidades,0) as reclam_por_100
from public.pratos p
join vendas v      on v.prato_id = p.id
left join custo c  on c.prato_id = p.id
left join reclamacoes x on x.prato_id = p.id
order by reclam_por_100 desc nulls last;
```

**O que aparece na tela.** A matriz de Kasavana e Smith (1982) com margem de contribuição no eixo vertical, unidades vendidas no horizontal e **reclamações por 100 unidades como cor do ponto**. Quatro quadrantes viram oito decisões, e a mais valiosa é "Star com satisfação caindo", que pega desvio de execução antes de virar queda de venda. Ao lado de cada ponto, sempre, o numerador e o denominador, e um rótulo dizendo qual eixo é censitário (margem e unidades) e qual é amostral (reclamação).

**Como medir se está funcionando.**

O rigor estatístico vem antes de qualquer conclusão por prato, e ele é aritmética, não opinião.

| Premissa | Valor |
|---|---|
| Mesas atendidas por mês | 20 por dia, 26 dias de operação, cerca de **520** |
| Respostas por mês | 50 a 200 hoje, meta de 150 (29% de conversão) |
| Detratores | cerca de 15% das respostas |
| Eventos de reclamação por prato por mês | 1 evento por resposta de detrator |

| Respostas/mês | Eventos/mês | Eventos/trimestre | Média por item, cardápio de 18 itens |
|---|---|---|---|
| 50 | 7,5 | 22 | **1,2** |
| 120 | 18 | 54 | **3,0** |
| 150 | 22,5 | 67 | **3,7** |
| 200 | 30 | 90 | **5,0** |

A leitura honesta desta tabela é a regra de publicação: **na janela trimestral, o item mediano do cardápio mal alcança 3 eventos.** Isso significa que a matriz serve para achar o item fora da curva, e nunca para ranquear o cardápio inteiro.

O intervalo de Poisson (cálculo próprio, aritmética verificável, confiança alta) diz o resto:

| Eventos observados no trimestre | Intervalo de 95% da contagem | Quanto o item precisa estar acima da média do cardápio para o sinal sobreviver |
|---|---|---|
| 3 | cerca de 0,6 a 8,8 | cerca de **5 vezes** |
| 5 | cerca de 1,6 a 11,7 | cerca de **3 vezes** |
| 10 | cerca de 4,8 a 18,4 | cerca de **2 vezes** |

**As regras que decorrem, e são obrigatórias na tela:**

1. Janela **trimestral**, nunca mensal.
2. Mínimo de **3 eventos** para o item aparecer sinalizado. Abaixo disso ele aparece como "amostra insuficiente, n=1", literalmente, e não como número.
3. Item que não chega a 3 eventos no trimestre **acumula para o semestre** em vez de ser publicado com n baixo.
4. Denominador mínimo de **30 unidades vendidas** no trimestre, senão a taxa por 100 é aritmética sem sentido.
5. **Nunca tirar prato do cardápio** com base em 3 ou 4 reclamações. A matriz prioriza investigação, ela não decide sozinha.

| Métrica | Valor de partida | Meta |
|---|---|---|
| Linhas em `prato_ingredientes` | **0** (fato lido em 13/08/2026) | Todo item do cardápio com ficha carregada, em uma carga única |
| Itens do cardápio com custo unitário calculável pela view | **1** (`pratos` tem 1 linha) | 100% dos itens vendidos no R3 do trimestre |
| Itens que atingem 3 eventos no trimestre | DESCONHECIDO, medir no primeiro trimestre | 3 a 5 itens sinalizados por trimestre, que é o número que a operação consegue tratar |
| Decisões de ficha técnica ou de preço tomadas a partir da matriz | 0 | **1 por trimestre**, registrada com data e resultado |

**Risco de fazer errado, e a trava.** O risco é matar um prato bom com 3 reclamações e um gráfico bonito, ou, pior, mexer na receita de um Plow Horse de alta venda porque a matriz pediu. A trava é dupla: as cinco regras de publicação acima ficam **no código**, não na cabeça de ninguém (a view não devolve linha que não atenda ao mínimo), e a matriz é rotulada na tela como ferramenta de priorização de investigação. Risco secundário, e mais grave: `NFe e Financeiro` é o sistema fiscal. Nenhuma migração sem `pg_dump` antes, toda criação por migration versionada, e o papel do schema `experiencia` sem nenhuma permissão de escrita fora dele.

---

### 2.2 Corte do dia operacional no fechamento real

**A mecânica.** O dia do restaurante termina quando a última mesa vai embora, não às 23:59. Uma coluna de `dia_operacional` calculada com corte às 6h da manhã, usada em **toda** consulta, todo gráfico e todo e-mail.

**Quem no mundo mais chega perto, e onde para.** Ninguém. Todo produto de CX assume dia civil, porque foi desenhado para casa que abre de manhã. A Tattle tem Day Part Heatmap, que é visualização por período do dia e não corte configurável do dia. O incumbente é o caso extremo e **documenta o próprio defeito**: o relatório conta até 23:59 e o contador do tablet só zera às 7:00, então tudo respondido entre a meia-noite e o fechamento aparece no tablet como do dia anterior e no relatório como do dia seguinte ([O relatório e os tablets consideram horários diferentes](https://www.risposta.app/o-relatorio-e-os-tablets-consideram-horarios-diferentes/)). O exemplo é do próprio fornecedor: 24 opiniões no tablet, 20 no relatório, 4 empurradas para o dia seguinte. Confiança **alta** sobre o defeito do incumbente (está publicado por ele), **média** sobre "ninguém no mundo faz diferente" (é ausência de evidência).

**Como funciona no QT, em desenho concreto.** Uma função imutável no banco e uma coluna gerada:

```sql
-- corte às 6h: tudo que entra entre 00:00 e 05:59 pertence à noite anterior
create function experiencia.dia_operacional(ts timestamptz)
returns date language sql immutable as
$$ select ((ts at time zone 'America/Sao_Paulo') - interval '6 hours')::date $$;
```

A coluna `dia_operacional` é gerada na própria tabela de resposta e **indexada**. Nenhuma consulta do sistema usa `criado_em::date`, nunca, e isso vira regra escrita no README. Na tela, cada corte aparece rotulado com a janela real: "terça 12/08, das 18h às 6h", e não "12/08".

**Como medir se está funcionando.** Aqui existe um valor de partida que pode ser medido **hoje, sem pedir nada a ninguém**: a tabela `cliques_avaliacao` no projeto `qt-avaliacoes` tem 74 linhas com `criado_em`. Uma consulta contando quantas caem entre 00:00 e 06:00 dá a primeira estimativa real do tamanho do problema nesta casa, e ela custa trinta segundos.

| Métrica | Valor de partida | Meta |
|---|---|---|
| Percentual de respostas registradas entre 00:00 e 06:00 | **A medir sobre as 74 linhas de `cliques_avaliacao`.** Hoje: DESCONHECIDO | É o tamanho do erro que se está corrigindo, não uma meta a mover |
| Respostas classificadas no dia errado | 100% das respostas pós meia-noite, por desenho do incumbente | **0** |
| Consultas do sistema usando `criado_em::date` em vez de `dia_operacional` | não aplicável | **0**, verificável por busca no repositório |

**Risco de fazer errado, e a trava.** O risco é a coluna existir e alguém escrever uma consulta nova usando a data crua, seis meses depois, e ninguém perceber porque o número continua plausível. A trava é o corte estar numa **única função** do banco, e a tabela de resposta expor `dia_operacional` como coluna gerada, de modo que a consulta certa seja também a mais curta de escrever. Segundo risco: o fuso. Fixar `America/Sao_Paulo` explicitamente na função, porque `qt-avaliacoes` hoje roda em `us-east-1` e qualquer default de servidor está errado.

---

### 2.3 Faixa de significância ao lado de cada indicador

**A mecânica.** Todo número do painel carrega o `n` e o intervalo de 95%. Corte que não atinge o mínimo aparece literalmente como "amostra insuficiente, n=7", e não como número bonito.

**Quem no mundo mais chega perto, e onde para.** Ninguém publica intervalo de confiança ao lado do número. A **Tattle** resolve o problema pelo lado oposto e mais honesto: recusa cliente com menos de 10 lojas, por escrito, porque o motor de recomendação dela precisa de volume ([FAQ oficial](https://get.tattleapp.com/resources/faq/)). A **Qualtrics** tem o rigor metodológico, e é plataforma de pesquisa, não produto de CX de restaurante. O incumbente publica zonas de NPS sem amostra e sem metodologia, e ao mesmo tempo escreve na própria central de ajuda que não recomenda se fixar em NPS de setor ([guia de NPS](https://www.risposta.app/guia-completo-nps-net-promoter-score-em-bares-e-restaurantes/)). Confiança **alta**: o incentivo comercial contra publicar incerteza é evidente, e é por isso que o ganho é estrutural.

**Como funciona no QT, em desenho concreto.** A conta é explícita e fica escrita no painel, não escondida no código. Erro padrão do NPS:

```
EP = raiz( (p_promotores + p_detratores − NPS²) / n )
```

Com a distribuição plausível de 60% promotores, 25% neutros e 15% detratores, que dá NPS 45 (`p_prom + p_det = 0,75`, `NPS² = 0,2025`, numerador `0,5475`):

| n (respostas no período) | Erro padrão | Intervalo de 95% em torno do valor | Diferença mínima detectável entre dois períodos |
|---|---|---|---|
| 50 | 10,5 pontos | ± 20,5 pontos | **cerca de 29 pontos** |
| 100 | 7,4 pontos | ± 14,5 pontos | cerca de 20,5 pontos |
| 200 | 5,2 pontos | ± 10,3 pontos | **cerca de 14,5 pontos** |

A diferença mínima detectável é o intervalo multiplicado por raiz de 2, porque são dois períodos independentes. Cálculo próprio, aritmética verificável, confiança alta na conta e média na premissa de distribuição, que muda o resultado em alguns pontos e não em ordem de grandeza.

Na tela isso vira três decisões concretas:

1. **NPS sempre com a faixa e o n ao lado.** "NPS 45, faixa de 25 a 66, n=50" é feio e é verdade.
2. **Distribuição antes da média.** Contagem de 0 a 6, de 7 e 8, de 9 e 10. Em 20 mesas por dia a média esconde exatamente os dois clientes que vão reclamar em público.
3. **Alerta de tendência em contagem, não em pontos.** "Detratores: 18 na semana passada, 12 nesta" é legível. "NPS caiu 9 pontos" é ruído com aparência de informação.

**Como medir se está funcionando.**

| Métrica | Valor de partida | Meta |
|---|---|---|
| Números publicados sem `n` ao lado | 100% no painel do incumbente | **0** |
| Respostas por mês (é o que compra significância para todo o resto) | 50 a 200 | **150/mês**, ou 29% das 520 mesas |
| Decisões tomadas sobre diferença menor que a mínima detectável | DESCONHECIDO | **0**, e o painel impede porque não desenha a seta |
| Meta numérica de NPS nos três primeiros meses | não aplicável | **Nenhuma**, deliberadamente. Meses 1 a 3 são linha de base |

**Risco de fazer errado, e a trava.** Existem dois riscos opostos, e o segundo é o mais provável. O primeiro é publicar seta sobre ruído, que é o que se está corrigindo. O segundo é o painel virar um monumento à incerteza, com tanta ressalva que ninguém decide nada, e aí o sistema novo repete a queixa de "relatório raso" por outro caminho. A trava para o segundo é **duas camadas separadas de leitura**: operação em **contagem absoluta e janela curta** (quantos detratores nesta semana, quais mesas, qual fator), tendência em **proporção e janela trimestral**. Contagem de evento raro é acionável com n pequeno. Estimativa de média não é. Nunca misturar as duas na mesma tela.

---

### 2.4 Banco de perguntas rotacionadas

**A mecânica.** A primeira pergunta é sempre a nota. As seguintes são sorteadas por peso de um banco de cerca de 20 perguntas. Ninguém vê mais de três telas de pergunta, e o banco inteiro é coberto ao longo do mês pela soma dos respondentes. **A profundidade passa a ser propriedade da amostra, não da entrevista.**

**Quem no mundo mais chega perto, e onde para.** A **TableSafe**, na plataforma RAIL, com a primeira pergunta fixa e as duas seguintes `rotated randomly` ([425business.com, 2017](https://425business.com/tablesafe-to-launch-improved-restaurant-payment-system/)). Da mesma fonte vem o único dado empírico do dossiê inteiro sobre onde a taxa de resposta despenca: `they found if customers were asked more than three questions, the response rates dropped way off`. Onde para: o dado tem nove anos, a empresa foi adquirida pela Mad Mobile em 28/10/2021, e a rotação era **uniforme**, sem peso e sem foco. A **Tattle** vai para o lado oposto, com `55+ data points per survey` e um executivo citado dizendo `despite being 50+ questions`. Confiança **média** no número que sustenta a mecânica (autodeclarado, 2017), **alta** na mecânica em si, que é verificável no texto.

**Como funciona no QT, em desenho concreto.** Uma tabela `pergunta` (id, texto em português, texto em inglês, dimensão, peso, ativa) e uma função de sorteio. Cada resposta grava **qual pergunta foi sorteada e qual foi respondida**, porque sem isso não existe denominador e a proporção sai errada.

A conta de cobertura mensal, com o desenho da seção 14 do questionário (promotor recebe 2 rotacionadas, neutro recebe 1, detrator recebe 0, porque o tempo do detrator vale mais na ramificação de fator e prato). Com 60/25/15, cada resposta gera em média **1,45 impressão rotacionada**:

| Respostas no mês | Impressões rotacionadas | Banco de 20, impressões por pergunta por mês | Por trimestre |
|---|---|---|---|
| 50 | 73 | 3,6 | 11 |
| 120 | 174 | 8,7 | 26 |
| 150 | 218 | 10,9 | 33 |
| 200 | 290 | 14,5 | 44 |

O banco é tocado inteiro todo mês em qualquer cenário. Mas 8 a 15 respostas por pergunta por mês **não sustentam número publicável**, e é aqui que entra o mecanismo que a TableSafe não tinha: **peso e foco**. De 2 a 4 perguntas em foco por mês somam 50% das impressões. Com 174 impressões e 4 perguntas em foco, são **22 respostas por pergunta em foco no mês**, dez vezes melhor que a média uniforme e já legível para proporção grosseira.

Sete regras de seleção, todas em código e nenhuma em planilha:

1. Nunca mais de 2 rotacionadas por resposta.
2. Nunca duas da mesma dimensão na mesma resposta.
3. Suprimir a pergunta cuja dimensão já foi coberta pela ramificação de nota baixa.
4. Sortear por peso, com o foco do mês somando 50%.
5. Registrar sorteada e respondida, sempre.
6. Não repetir a mesma pergunta na mesma comanda na mesma noite.
7. **Toda pergunta que o sistema pode responder sozinho sai do banco.** Área do salão vem do número da mesa, garçom vem do PIN, prato vem da comanda quando ela existir. Slot de pesquisa é o recurso mais escasso do projeto e não se gasta perguntando o que o banco já sabe.

**Como medir se está funcionando.**

| Métrica | Valor de partida | Meta |
|---|---|---|
| Dimensões cobertas por mês | 4 categorias fixas no incumbente | **20**, com 2 a 4 em foco |
| Impressões por pergunta em foco por mês | não aplicável | **20 ou mais** (alcançado a partir de cerca de 120 respostas/mês) |
| Perguntas do banco com denominador registrado | não aplicável | **100%** |
| p90 da duração da pesquisa | DESCONHECIDO, o incumbente não expõe | **45 segundos.** Se passar, corta tela |
| Reescritas manuais do questionário por trimestre | uma por mudança de cardápio | **0**: entra uma linha na tabela |

**Risco de fazer errado, e a trava.** O risco é o banco crescer para 40 perguntas porque acrescentar linha é barato, e aí cada pergunta recebe metade da amostra e nenhuma é legível. A trava é numérica e fica no código: **teto de 20 perguntas ativas**, e para ativar a 21ª é preciso desativar uma. O segundo risco é o oposto do primeiro: o foco do mês nunca ser trocado porque ninguém vai manter o sistema. A trava é o digest das 16h imprimir, uma vez por mês, qual é o foco vigente e há quantos meses ele não muda.

---

### 2.5 Digest diário por área às 16h

**A mecânica.** Um e-mail por dia, às 16h, antes de abrir, com recorte por destinatário (proprietário e gerência veem tudo, cozinha vê prato e tempo, salão vê atendimento, crítica pessoal grave vai só para o proprietário), diagnóstico escrito, comparação contra o período anterior, e "nada a relatar" quando o dia foi normal. **A mesma peça acumula três funções: entregável, keep-alive do banco e alarme de falha do sistema.**

**Quem no mundo mais chega perto, e onde para.** O **SevenRooms**, com o AI Feedback Summary, que é **semanal**. A **Tattle**, que entrega a principal área de melhoria a cada **30 dias**, no nível de local, verbatim `provides each location-level team their top area for improvement every 30 days` ([get.tattleapp.com](https://get.tattleapp.com/features/item-level-feedback/)). Correção obrigatória do verificador, registrada aqui para não ser redescoberta: **a Tattle não gera plano de ação por turno.** A palavra `shift` não aparece na página citada. O incumbente manda e-mail diário, e o diagnóstico de IA dele está no relatório mensal, não no diário. Ou seja: existe digest, existe cadência diária, e **não existe a combinação de cadência diária com diagnóstico escrito, corte por área e função de auto-monitoramento**.

**Como funciona no QT, em desenho concreto.** Um Cron Trigger do Cloudflare às 16h00 (é o único agendamento gratuito que crava o minuto e permite uso comercial; o Vercel Hobby tem precisão de mais ou menos 59 minutos e proíbe uso comercial). O Worker faz, nesta ordem:

1. Consulta o banco pelo `dia_operacional` de ontem. **Esta chamada é separada no código do envio do e-mail**, de propósito: desligar o e-mail durante férias não pode desligar a consulta, porque é ela que impede a pausa por inatividade do Supabase Free (documentada: 1 semana).
2. Compara cada linha contra o período anterior comparável (sábado contra os últimos quatro sábados, nunca sábado contra sexta).
3. Chama o Groq (`llama-3.3-70b-versatile`, 1.000 requisições/dia gratuitas para 1 chamada) para redigir o diagnóstico a partir dos números já calculados. A IA **nunca** calcula: ela redige.
4. Monta três versões do HTML por área e dispara pelo Resend (5 e-mails/dia contra teto de 100/dia, 5% da cota).
5. Grava uma linha de log **no próprio banco**: horário, quantas respostas entraram, se o e-mail saiu. O log do Resend expira em 30 dias e o do Supabase em 1 dia. Este é o log que sobra.

No corpo do e-mail, gráfico nenhum em imagem: barra desenhada em HTML e CSS (célula de tabela com largura percentual), números em tabela e um link para o painel. SVG inline em cliente de e-mail é de compatibilidade **NÃO VERIFICADA** e notoriamente irregular.

**Como medir se está funcionando.**

| Métrica | Valor de partida | Meta |
|---|---|---|
| Dias de operação com e-mail entregue | e-mail diário existe hoje, com diagnóstico só no mensal | **100%**, e no máximo 2 atrasos por trimestre |
| Dias entre a falha do sistema e alguém perceber | DESCONHECIDO (ninguém monitora) | **2 dias**, que é a regra única de operação do README |
| Pausas do banco por inatividade | não aplicável | **0** |
| E-mails com "nada a relatar" | não aplicável | Existirem. Digest que sempre tem novidade vira ruído ignorado no terceiro mês |
| Consumo de cota | não aplicável | Resend 5%, Groq 0,06%, Supabase 7,2% em dez anos |

**Risco de fazer errado, e a trava.** O risco máximo do projeto inteiro é o digest **errar em silêncio**: sair bonito, com número plausível e errado, porque o import do R3 falhou ou a classificação não voltou. Isso é pior que não sair, porque ninguém vai auditar o e-mail diário depois do terceiro mês. Três travas: **um dia sem dado sai como um dia sem dado**, escrito com essas palavras; se a classificação de IA falhar, o digest sai com os comentários sem categoria e um aviso, **nunca sem os comentários**; e a linha de log no banco permite reconstruir o que aconteceu depois que o log do fornecedor expirou. Risco secundário: sem SPF e DKIM configurados no subdomínio do QT, o relatório cai em spam e a conclusão de quem recebe será que o sistema não funciona. É trabalho de DNS de uma vez só, e é a diferença entre adoção e abandono na segunda semana.

---

### 2.6 Sentimento frase por frase, com o texto cru sempre guardado

**A mecânica.** O comentário aberto não recebe uma classificação única. Cada frase é classificada em separado. "Pizza excelente mas demorou 40 minutos" gera um positivo em produto **e** um negativo em tempo, em vez de uma média inútil que não gera ação nenhuma.

**Quem no mundo mais chega perto, e onde para.** A **Olo** faz exatamente isto e faz bem, verbatim `the sentiment of each comment, phrase-by-phrase` ([olo.com/sentiment](https://www.olo.com/sentiment)). A **Ovation** faz a versão categórica, com mais de 35 categorias de restaurante. A **Chatmeter** faz a versão extrema, extraindo tema sem categoria pré-definida. O incumbente já classifica por IA, com endpoint `/openai/reviews/impressions` visível no bundle de produção dele.

**Aqui é preciso ser franco: nesta mecânica o QT não supera ninguém em capacidade. Ele iguala a mecânica e supera a governança.** O que a Olo não oferece ao QT, e nenhum fornecedor oferece, é a garantia de que o texto cru continua sendo do restaurante quando o fornecedor mudar de política, de preço ou de dono.

**Como funciona no QT, em desenho concreto.** Duas tabelas, e a separação entre elas é a mecânica inteira:

| Tabela | O que guarda | Pode ser refeita? |
|---|---|---|
| `experiencia.resposta.comentario_bruto` | O texto como o cliente escreveu, sem tratamento | **Nunca é apagada** (exceto por pedido de exclusão do titular) |
| `experiencia.comentario_trecho` | Um trecho por linha, com dimensão, polaridade, `critica_pessoal` booleano, modelo usado, versão do prompt e data | **Sempre.** É derivada, e pode ser reprocessada do zero |

Uma chamada por comentário ao Groq `llama-3.1-8b-instant` (cerca de 8 por dia contra 14.400/dia gratuitas), com saída estruturada em JSON: lista de trechos, cada um com dimensão e polaridade. **Nenhum identificador direto vai para o LLM**: só o texto e as notas, com nome e WhatsApp trocados por id interno. O Groq foi escolhido por contrato e não por limite, porque a cláusula dele proíbe usar as entradas e saídas para treino, enquanto os termos do tier gratuito do Gemini pedem literalmente para não enviar informação pessoal.

Na tela e no e-mail, isso alimenta duas decisões já tomadas no briefing: comentários filtrados por área para cozinha e salão, e crítica pessoal grave só para o proprietário. É um campo booleano na saída do classificador, não uma triagem humana diária.

**Como medir se está funcionando.**

| Métrica | Valor de partida | Meta |
|---|---|---|
| Comentários com texto cru preservado | Fica no fornecedor, recuperável pela API de 4 dias | **100%** |
| Comentários classificados em pelo menos uma dimensão | DESCONHECIDO | 90% ou mais, e o resto sai sem categoria com aviso |
| Trechos por comentário (média) | 1 por construção, quando a classificação é por resposta inteira | **maior que 1**, que é a prova de que a mecânica está funcionando |
| Custo de trocar de fornecedor de LLM | não aplicável | **uma linha de configuração** |

**Risco de fazer errado, e a trava.** O risco é a IA virar alicerce em vez de acabamento, e uma mudança de política de free tier derrubar o produto. Já aconteceu no mercado: a Google retirou os números de cota do tier gratuito da documentação pública. As travas são três: **módulo único** com prompt, chamada e parser num só lugar, decidido no primeiro dia; **degradação declarada** para classificação por regra (nota mais palavras-chave), que cobre a maior parte de 200 comentários por mês e mantém o digest de pé sem nenhuma IA; e **o texto cru nunca sai do Postgres do QT**. Se a política mudar, perde-se a análise, jamais o dado.

---

### 2.7 Posse do dado e portabilidade

**A mecânica.** O dado nasce no Postgres do restaurante. Sair do sistema é um botão, e não um projeto.

**Quem no mundo mais chega perto, e onde para.** A **ReviewTrackers**, com o tier Data Only, que vende review bruto para o cliente processar na plataforma dele. É a postura certa e é exceção: treze dos fornecedores mapeados no dossiê não têm nenhuma API pública. O incumbente tem sete endpoints, todos POST e todos de leitura, com **janela de 4 dias por requisição e 50 registros por página**, sem endpoint de escrita, sem webhook e sem push, e com a credencial pedida por e-mail a pessoa nomeada, sem portal de developer e sem sandbox ([api.risposta.app](https://api.risposta.app/)). A conta de saída: cerca de **92 requisições só para varrer as datas de um ano**, mais a paginação. Isso não é bug, é modelo: série histórica presa na casa do fornecedor é o que garante a renovação do contrato. Confiança **alta**, a limitação está na documentação pública deles.

**Como funciona no QT, em desenho concreto.** Quatro decisões, todas tomadas antes da primeira tabela, e todas de custo zero se tomadas agora e caras se lembradas depois:

1. **Nenhum identificador de PDV como chave primária.** O `prato_id` é do QT, e o nome do produto no R3 do Altec é atributo de uma tabela de equivalência. Trocar de PDV vira trocar de adaptador, e não reescrever histórico.
2. **A API de leitura já existe e não será escrita.** O Supabase entrega REST autenticada de graça. Nenhum endpoint próprio é construído.
3. **Botão de exportar CSV e Excel no painel**, que é pedido explícito do briefing e também a garantia de que o dado não fica preso no sistema novo.
4. **`pg_dump` semanal para fora do Supabase**, via GitHub Actions (30 minutos/mês contra 2.000, 1,5% da cota). **O plano gratuito do Supabase não tem backup nenhum**: backup gerenciado com retenção de 7 dias só existe no Pro, a US$ 25/mês, que é oficial. Sem esse dump, "anos de histórico" é promessa sem piso.

Sobre a migração do histórico do incumbente, a decisão honesta: o critério do briefing é migrar só se for fácil, e com aquela API não é. O caminho defensável é migrar os últimos meses ou nenhum, e assumir que a linha de base começa do zero. O que **não** é opcional é pedir por escrito, antes de cancelar, a exportação e a eliminação comprovada dos dados no fornecedor, porque depois do cancelamento a alavanca desaparece e, na relação com o titular, quem responde é o restaurante.

**Como medir se está funcionando.**

| Métrica | Valor de partida | Meta |
|---|---|---|
| Tempo para produzir um CSV do histórico completo | cerca de 92 requisições por ano de histórico, mais paginação, mais credencial pedida por e-mail | **menos de 60 segundos**, sem pedir nada a ninguém |
| Backups fora do fornecedor de banco | **0** (o plano gratuito não tem nenhum) | **1 por semana**, desde o primeiro mês de dado real |
| Restaurações testadas | 0 | **1 por trimestre.** Backup que nunca foi restaurado não é backup |
| Registros do sistema com chave primária vinda de terceiro | não aplicável | **0** |

**Risco de fazer errado, e a trava.** O risco é o backup existir e nunca ter sido restaurado, ou o workflow agendado do GitHub ser desativado em repositório inativo (relato amplo da comunidade, **não confirmado** na documentação lida) e parar em silêncio. As travas: o teste de restauração trimestral entra como linha do digest, e o cron principal do sistema é o Cloudflare, nunca o GitHub Actions. Risco secundário, e novo desde a inspeção: a restrição da Fair Use Policy do Supabase é aplicada a **todos os projetos da organização**, com 402 em toda a API. Como a organização é uma só e o schema `experiencia` vai conviver com o fiscal, o consumo da pesquisa precisa ficar visível no digest (linhas gravadas na semana, tamanho do schema), e não descoberto num 402.

---

### 2.8 Antifraude no software

**A mecânica.** A integridade da amostra é garantida por código, não por regulamento interno.

**Quem no mundo mais chega perto, e onde para.** Ninguém publica a mecânica. O dado mais bem sustentado de todo o levantamento vem justamente do incumbente, que escreve na própria página que `O grande risco de usar QR Code somente é a manipulação das amostras por parte das equipes` ([risposta.app](https://www.risposta.app/risposta-qr-code/)). E a solução dele é parcialmente **administrativa**: o guia oficial de metas prevê punição, com unidade suspeita perdendo 2% dos resultados ou sendo desclassificada do programa de bônus, e recomenda teto de 25 tentativas por dia por tablet em operação de dois turnos. Isso diz duas coisas ao mesmo tempo, e a segunda é a mais importante: **manipulação pela equipe é problema real e conhecido, e amarrar bônus a nota cria exatamente o incentivo para manipular**.

**Como funciona no QT, em desenho concreto.** Seis travas, todas baratas, e uma decisão de gestão que vale mais que as seis.

| Trava | Desenho | Custo |
|---|---|---|
| Uma resposta por comanda ou mesa por janela | Restrição única no banco sobre (mesa, `dia_operacional`, janela), com UUID gerado no cliente para idempotência | Baixo |
| Janela de tempo válida | Resposta só é aceita dentro do horário de operação do `dia_operacional` corrente | Baixo |
| PIN do garçom | Digitado antes de entregar o tablet, e tratado como **dado da resposta, não como autenticação**. Com fila offline não há como validar na hora, e guardar hash de credencial num tablet que circula pelo salão é pior que não validar | Baixo |
| Identificação do aparelho **da casa** | O tablet é equipamento do restaurante, então identificá-lo não é rastrear cliente. Repetição anômala no mesmo aparelho gera contagem no digest | Baixo |
| Duração anômala | Resposta concluída em menos de 8 segundos entra numa contagem separada, nunca é apagada | Baixo, fase 2 |
| QR por garçom com janela | O QR que **já está em circulação** (as 74 linhas de `cliques_avaliacao` provam que existe e que a equipe foi treinada) passa a exigir mesa e janela de tempo, em vez de aceitar qualquer clique | Baixo |

**Nada de fingerprinting do celular do cliente.** É tratamento oculto: o titular não pode se opor ao que não sabe que existe, e o ganho não paga o passivo. O aparelho que se identifica é o da casa.

**A decisão de gestão que vale mais que as seis travas: não amarrar meta de equipe à nota.** Metas de processo, que estão sob controle da casa e são legíveis com amostra pequena: conversão sobre mesas atendidas, tempo até o primeiro contato de recuperação, e taxa de recuperação (contatados sobre detectados). Isso remove o incentivo na origem, em vez de policiar o efeito.

**Como medir se está funcionando.**

| Métrica | Valor de partida | Meta |
|---|---|---|
| Respostas duplicadas por comanda | Tratado por punição administrativa (2% dos resultados) | **0**, impedido pelo banco |
| Conversão sobre mesas atendidas, por garçom | As 74 linhas de `cliques_avaliacao` já dão a primeira leitura de distribuição por atendente | Faixa saudável e **parecida entre garçons**. Outlier alto é tão suspeito quanto outlier baixo |
| Respostas com duração menor que 8 segundos | DESCONHECIDO | menos de 2% |
| Metas de nota amarradas a bônus | existem no desenho do incumbente | **0** |

**Risco de fazer errado, e a trava.** O risco é o antifraude derrubar resposta legítima e a equipe concluir que "o sistema não funciona", que é como uma trava boa morre. As travas: nada é **apagado**, tudo suspeito é **marcado** e contado à parte, para que o efeito de qualquer regra seja mensurável e reversível; e a mensagem na tela nunca acusa ninguém, apenas diz que aquela mesa já respondeu hoje. Risco pendente, que precisa de resposta do proprietário antes de qualquer coisa: **para onde os QR Codes por garçom apontam hoje?** Se apontam para o Google condicionados à nota, isso é review gating operando no perfil do QT, e a penalidade recai sobre o restaurante e não sobre o fornecedor.

---

## 3. O PLACAR

| # | Mecânica | Situação do incumbente | Situação do melhor do mundo | Situação do QT proposto | O ganho, em uma frase |
|---|---|---|---|---|---|
| 1 | **Satisfação cruzada com CMV e ficha técnica** | Não faz, e não tem como fazer | Tattle liga satisfação a **receita**, Yumpingo a performance financeira, Bikky analisa cardápio sobre PDV. **Nenhum entra na ficha técnica** (ausência de evidência, confiança média) | Custo já em Postgres (`insumos_master` 131, `historico_precos` 344). Falta preencher `pratos` e `prato_ingredientes`, que já existem e estão vazias | Saber se o prato que decepciona é também o que sustenta a margem, com o custo real e não estimado |
| 2 | **Corte do dia operacional** | Relatório corta às 23:59, tablet zera às 7:00, e o próprio fornecedor documenta o descasamento | Ninguém publica corte configurável. Tattle tem heatmap por período, que é visualização | Uma função imutável com corte às 6h, e coluna gerada usada em toda consulta | Terça compara com terça de verdade, e a noite mais pressionada para de ser lançada no dia errado |
| 3 | **Faixa de significância** | Publica zonas de NPS sem amostra nem metodologia | Tattle resolve pelo lado oposto: recusa cliente com menos de 10 lojas, por escrito | `n` e intervalo de 95% ao lado de todo número, e "amostra insuficiente, n=7" em vez de número bonito | Para de tomar decisão sobre ruído: com 50 respostas, só 29 pontos de NPS significam algo |
| 4 | **Banco de perguntas rotacionadas** | Perguntas personalizadas fixas | TableSafe fazia rotação **uniforme** em 2017, e foi adquirida em 2021. Tattle vai ao oposto, com 50 e poucas perguntas | 20 perguntas com peso, 2 a 4 em foco somando 50% das impressões, teto de 2 por resposta | 20 dimensões de cobertura pelo preço de conclusão de uma pesquisa de 3 telas, e a pesquisa se renova sem ninguém reescrever nada |
| 5 | **Digest diário por área às 16h** | E-mail diário existe, mas o diagnóstico de IA está no mensal | SevenRooms é semanal, Tattle entrega a principal área a cada 30 dias | Cron às 16h00, diagnóstico escrito, corte por área, "nada a relatar", log no próprio banco | Uma peça com três funções (entregável, keep-alive e alarme), que é o que torna "ninguém mantém" viável |
| 6 | **Sentimento frase por frase** | Classifica por IA (OpenAI), granularidade não documentada | **Olo faz, e faz bem** (`phrase-by-phrase`) | Mesma mecânica, mais texto cru inviolável, degradação sem IA declarada e nenhum identificador enviado ao LLM | Não é superação de capacidade, é superação de governança: a política do fornecedor pode mudar, o dado não sai daqui |
| 7 | **Posse do dado e portabilidade** | 7 endpoints de leitura, janela de 4 dias, 50 por página, credencial por e-mail. Cerca de 92 requisições por ano de histórico | ReviewTrackers Data Only é a exceção. Treze fornecedores mapeados não têm API pública nenhuma | Postgres próprio, REST do Supabase pronta, botão de exportar, `pg_dump` semanal para fora | Sair custa menos de um minuto em vez de um projeto, e isso vale para o próximo fornecedor também |
| 8 | **Antifraude no software** | Parcialmente **administrativo**: punição de 2% dos resultados e teto de 25 tentativas por dia | Ninguém publica a mecânica | Seis travas em código, mais a decisão de não amarrar meta de equipe à nota | O incentivo para manipular é removido na origem, em vez de punido depois |

---

## 4. O que NÃO vamos superar, e por que está certo não tentar

Esta seção existe porque um documento que só lista vitórias não é análise, é folheto. Os três itens abaixo são perdas reais, e em dois deles o QT está **correndo atrás**, não na frente.

### 4.1 Previsão de recompra

**Quem faz melhor, e faz de verdade.** A **Olo Guest Data Platform** (ex-Wisely) unifica PDV, pedido, fidelidade e feedback em perfil individual, e prediz guest lifetime value e churn risk por machine learning ([olo.com/gdp](https://www.olo.com/gdp)). A **Bikky** faz frequência e lifetime value como CDP. A **Ovation** vende Retention Marketing, com método **NÃO PÚBLICO**.

**Por que o QT não alcança, e o motivo não é dinheiro.** É física da amostra, e há dois bloqueios em série. O primeiro vem antes do volume: **a coleta é anônima**, e sem identificador nada disso funciona. A variável que decide se o módulo existe é a taxa de contato opcional, que é **DESCONHECIDA** e não tem benchmark. O segundo é o tamanho: com 120 respostas por mês e 25% deixando contato, a base identificada em seis meses fica em torno de 180 pessoas. Os modelos que a literatura reporta operam sobre milhares de registros. Um modelo treinado nesse volume produz lista de risco que é ruído, e a casa gasta cortesia com quem ia voltar de qualquer forma.

**O que fica no lugar, com a mesma ação prática:** RFM por regra, com a recência calibrada pelo intervalo mediano observado na própria base e não por uma janela de 90 dias copiada de varejo; e **detecção em vez de previsão**, ou seja, sinalizar quem já saiu do padrão dele. É SQL, é verificável à mão, e leva à mesma ligação telefônica. Tudo isso na fase 2, ancorado no CRM de reservas, que é onde a identidade útil mora.

**Aviso de escopo que mudou com a inspeção:** o app de reservas **não está em nenhum dos três projetos Supabase da organização**. Enquanto o proprietário não disser onde ele vive, integração com o CRM de reservas **não entra no MVP**, e qualquer afirmação sobre ela tem confiança **baixa**.

### 4.2 Benchmark de rede

**Quem faz.** Yumpingo e GuestXM, sobre a base da Black Box Intelligence. O número que circula (300 e poucas empresas, cerca de 100 mil unidades) vem de um press release de novembro de 2022, tem quase quatro anos e **NÃO FOI VERIFICADO** de forma independente. O incumbente também vende benchmark contra restaurantes do mesmo segmento e porte, com amostra e metodologia **NÃO PÚBLICO**.

**Por que não tentar.** Exige base de milhares de unidades, o que é estruturalmente irreplicável por uma casa só. E há um dado que reduz muito o tamanho da perda: **não existe benchmark de NPS de pizzaria verificável, no Brasil nem no mundo**. A Retently, uma das referências globais do assunto, removeu restaurantes e hospitalidade do benchmark de 2026 por falta de base recorrente. O próprio incumbente escreve que não recomenda se fixar em NPS de setor. Ou seja, o que se perde tem valor desconhecido, e provavelmente pequeno.

**O que fica no lugar:** abrir o Google uma vez por trimestre e anotar a nota de quatro pizzarias comparáveis. Vinte minutos, e mais honesto que um número sem metodologia. Raspagem automática está descartada porque quebra quando a página muda, contradiz a decisão de "somente link" e exige alguém consertando.

### 4.3 Consultoria humana e treinamento de equipe

**O que é.** Nenhum software substitui alguém sentando com a equipe para discutir o que os números querem dizer, nem o treinamento de salão que faz o garçom pedir a avaliação de um jeito que funciona.

**Por que não tentar substituir com IA.** Porque seria promessa falsa. A auditoria por IA sobre dado real de cliente pagante substitui bem o **cliente oculto** (que no produto atual não tem página, metodologia nem preço publicados em todo o domínio deles), e não substitui consultoria. São coisas diferentes.

**O que precisa de decisão separada, e não é técnica.** Se a consultoria estava sendo usada, ela precisa de plano próprio, e possivelmente de contratação avulsa. Se não estava sendo usada, ela está sendo paga sem uso, e isso é parte da resposta sobre o preço atual. O mesmo vale para o tablet locado, que volta no cancelamento e vira custo direto do restaurante: comprar dois na mesma viagem e no mesmo modelo, e tratá-los como consumíveis.

---

## 5. Fechamento: a ordem de entrada, e qual delas sozinha paga o projeto

### A ordem

O critério não é valor, é **dependência mais custo de esquecer**. Duas decisões custam zero se tomadas antes da primeira tabela e custam muito depois, então elas vêm antes de tudo, inclusive antes de qualquer coisa que apareça na tela.

| Ordem | Mecânica | Por que nesta posição |
|---|---|---|
| **0** | **Posse do dado (2.7), a parte de modelagem** | Schema `experiencia` dentro de `NFe e Financeiro`, `sa-east-1`, nenhum identificador de PDV como chave primária. Não produz nada visível e decide se o sistema existe em dois anos |
| **0** | **Corte do dia operacional (2.2)** | Uma função e uma coluna. Se entrar depois, toda série já coletada nasce embaralhada e precisa ser recalculada |
| 1 | **Banco de perguntas rotacionadas (2.4)** | Uma tabela e um sorteio. Define o formato do dado que todas as outras mecânicas vão ler |
| 2 | **Antifraude (2.8)** | Sem ele o painel inteiro é decorativo, e o QR por garçom já está em circulação hoje, sem trava |
| 3 | **Digest diário às 16h (2.5)** | Maior retorno absoluto, e é ele que passa a monitorar o resto. A partir daqui o sistema avisa quando quebra |
| 4 | **Faixa de significância (2.3)** | Entra junto com o painel, e é o que impede o sistema novo de repetir a queixa do antigo |
| 5 | **Sentimento frase por frase (2.6)** | Um prompt com saída estruturada. Depende de já haver comentário acumulado para valer a pena |
| 6 | **Posse do dado (2.7), a parte de backup e exportação** | `pg_dump` semanal e botão de exportar, a partir do primeiro mês de dado real |
| 7 | **Satisfação cruzada com CMV (2.1)** | A mais cara e a última: depende do import do R3 rodando, de `pratos` e `prato_ingredientes` preenchidas, e de um trimestre inteiro de eventos acumulados |

### Qual delas sozinha paga o projeto

A régua honesta não é a mensalidade atual de R$ 501 a R$ 1.000. É a alternativa mais barata que existe de verdade: **R$ 575,00 por ano à vista, equivalentes a R$ 47,92/mês** (Avalio Starter, com API REST inclusa). Contra essa régua, sete das oito mecânicas são argumentos de qualidade, e qualidade nem sempre paga R$ 575 por ano.

**A que paga sozinha é a 2.1, satisfação cruzada com CMV.** Ela é a única das oito que **nenhum fornecedor vende a nenhum preço**, porque nenhum tem acesso ao custo de insumo do cliente. E o retorno dela não precisa ser argumentado, ele pode ser **conferido no próprio banco**: para empatar com a alternativa mais barata, a matriz precisa gerar cerca de **R$ 1,58 por dia** de ganho (R$ 575 divididos por 365). Com o denominador censitário do R3 do Altec e o custo unitário da ficha técnica, uma única correção de gramagem, de fornecedor de insumo ou de preço num item de alta rotação é aferível em reais, com data e com unidades vendidas, no trimestre seguinte. É a única afirmação de retorno deste documento que se prova com dado em vez de com prosa.

Há uma ironia que vale registrar em vez de esconder: **a mecânica que paga o projeto é a última a entrar.** Isso não é contradição de prioridade, é sequência de dependência, e ela tem uma consequência prática imediata. Preencher `pratos` e `prato_ingredientes` **não depende de nenhuma linha de código do sistema de pesquisa**. É carga de dado numa estrutura que já existe, em tabelas que hoje têm 1 e 0 linhas, num banco que já está de pé. Pode começar hoje, em paralelo com tudo, e é a tarefa de maior retorno por hora do projeto inteiro.

E a que **destrava o cancelamento da mensalidade** é outra: o digest diário das 16h (2.5) somado à coleta. No dia em que o e-mail das 16h chegar com número certo e diagnóstico escrito, o produto atual já não está entregando nada que não esteja sendo entregue melhor, e o tablet locado pode voltar.
