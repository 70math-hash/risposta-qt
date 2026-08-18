# Dossiê: substituto próprio do Risposta

Pesquisa competitiva exaustiva sobre o Risposta e seus pares no Brasil e fora, feita para
decidir o que construir no lugar dele. Escrito para o QT Pizza Bar (uma unidade, Rio de
Janeiro, 22 mesas, só jantar).

**Comece pelo [sumário executivo](00-sumario-executivo.md).** Ele cabe em cinco minutos e
tem a conclusão de negócio em números, os 10 achados que mudam a decisão, a conta da
economia, as recomendações para as decisões que estavam em aberto, os riscos e o próximo passo.

## Os arquivos

| # | Arquivo | O que tem dentro |
|---|---|---|
| 00 | [Sumário executivo](00-sumario-executivo.md) | Conclusão, economia, decisões recomendadas, riscos, próximos passos, metodologia |
| 01 | [O fornecedor atual](01-risposta.md) | Risposta dissecado: empresa, 5 módulos, 54 features, arquitetura lida do bundle de produção, motor de cálculo, fragilidades |
| 02 | [Mercado brasileiro](02-brasil.md) | 23 concorrentes diretos e 23 suítes de gestão com CX embutido, com preço quando público e falsos positivos nomeados |
| 03 | [Referências globais](03-global.md) | 36 fornecedores e, principalmente, as mecânicas de produto que valem copiar, com veredito de copiar, adaptar ou ignorar |
| 04 | [Custo zero](04-custo-zero.md) | Limites reais de cada plano gratuito, stack recomendada, a conta do custo mensal e o que ameaça o zero |
| 05 | [Integrações](05-integracoes.md) | Google, iFood, Altec/Next com 9 caminhos avaliados, tablet em modo quiosque, Raspberry Pi, WhatsApp e LGPD |
| 06 | [Questionário](06-questionario.md) | Padrão de mercado, benchmarks com fonte, e o questionário recomendado tela por tela em português e inglês |
| 07 | [Matriz de features](07-matriz-features.md) | 113 features com esforço, custo e prioridade (MVP, fase 2, fase 3, cortar), mais as brechas de mercado |

Os dados brutos de cada frente estão em [`dados/`](dados/), um JSON por frente, e são a
fonte de tudo acima.

## Como este dossiê foi feito

Sete frentes de pesquisa em paralelo, mais uma investigação dedicada ao PDV Altec/Next,
seguidas de quatro verificadores adversariais cuja função era derrubar afirmação errada, e não
confirmar o trabalho alheio.

**Os verificadores registraram 40 correções e 40 lacunas.** Um deu veredito CONFIRMADO
(fornecedor atual, com 3 ressalvas) e três deram PARCIAL. Em qualquer divergência, a versão
corrigida tem precedência sobre a pesquisa original, e isso está dito no ponto exato do texto.

O erro recorrente encontrado não foi invenção de conteúdo: foi **citação deslocada**, uma
afirmação verdadeira apontando para uma URL que não a continha. Por isso preço que não foi
lido em página oficial do fornecedor aparece como **NÃO PÚBLICO** ou **NÃO VERIFICADO**, com
essas palavras, sem exceção.

Duas execuções de agente falharam por erro de servidor do provedor e foram refeitas do zero.
Nenhum resultado parcial de execução interrompida foi aproveitado.

## Preços que a verificação derrubou e não devem ser usados

| Afirmação circulada | Situação |
|---|---|
| Avalio a 12x R$ 64,00/mês | É a mesma assinatura parcelada, a opção mais cara do plano. O piso real é **R$ 575,00/ano à vista**, equivalente a R$ 47,92/mês |
| Tablet Android de entrada a R$ 900 a R$ 1.200 | **Refutado.** Preço em BRL segue não verificado. Única referência independente: cerca de 180 EUR (GSMArena, Galaxy Tab A11) |
| Fully Kiosk PLUS a 7,90 EUR | O valor correto é **8,90 EUR** por aparelho, pagamento único |
| Tattle a US$ 59, Cloutly a US$ 27, HappyOrNot a US$ 100 por totem, Birdeye em três tiers | Não confirmados em página oficial. Não usar como régua |

## O que ainda falta

Duas pendências do proprietário, nenhuma delas bloqueando desenvolvimento:

- **Prints do painel e das perguntas do Risposta.** Preenchem a comparação da seção 15 de
  `06-questionario.md` e mostram se o convite ao Google está condicionado à nota. O
  questionário recomendado foi desenhado a partir da evidência de mercado, sem assumir nada
  sobre as perguntas atuais.
- **Capacidade individual das 22 mesas.** Troca o denominador da taxa de resposta, hoje
  calculada sobre mesas e não sobre pessoas. É calibragem de meta, não bloqueio.
