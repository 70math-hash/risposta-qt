# 06. Reverificação das correções da Etapa 3

> Documentos relidos na íntegra: [`05-critica.md`](05-critica.md), [`01-grid-comparativo.md`](01-grid-comparativo.md), [`02-replicar.md`](02-replicar.md), [`03-superar.md`](03-superar.md), [`04-cortar-e-backlog.md`](04-cortar-e-backlog.md). Conferidos também [`00-sumario-executivo.md`](../00-sumario-executivo.md) e [`07-matriz-features.md`](../07-matriz-features.md), por causa da omissão 7.
> Regra usada: APLICADO só quando a frase corrigida está no texto **e** resolve o problema em todos os documentos onde ele existia. Correção escrita em um documento e não escrita no par dele é PARCIAL, mesmo quando o texto novo diz que a divergência foi fechada.

---

## 1. Veredito

**Vinte e três dos trinta e um itens estão resolvidos, cinco ficaram pela metade, dois não foram tocados, e o conserto criou cinco contradições novas entre documentos**, quase todas do mesmo tipo: a correção entrou em um lado do par e o outro lado ficou com o texto antigo.

---

## 2. Item por item

### Achados A1 a A22

| # | Situação | Evidência que comprova |
|---|---|---|
| **A1** | **APLICADO** | `01` seção 4 abre com "Esta lista é o piso de aceite do **sistema próprio**, cobrado na posição 26 do backlog, e não do dia do cancelamento", e nomeia o piso menor de quatro itens. A decisão sobre os dezesseis restantes é devolvida à pergunta 3 |
| **A2** | **APLICADO** | `04` posição 10: "é esperada queda de volume entre a devolução do tablet e a posição 27. A queda tem tamanho **DESCONHECIDO**", com a trava de antecipar a compra dos tablets |
| **A3** | **PARCIAL** | `02` F21, F39 e F41 usam a mesma definição ("faixa horária sobre `dia_operacional`, até 20h30 e depois de 20h30"). Mas `04` posição 33 continua com o texto original: "Junção por data, **possivelmente data mais turno**, nunca por comanda", que é exatamente a frase que F41 passou a proibir |
| **A4** | **NÃO APLICADO** | Busca por "pontos físicos", "4 ou mais", "licença de quiosque" em `02` não retorna nada. A seção 5 de `02` não tem nenhuma linha de divergência declarada contra o briefing, e o plano segue com 1 tablet em uso mais 1 de reserva sem justificar a redução de quatro pontos para um |
| **A5** | **PARCIAL** | `02` F39 ganhou o bloco "Como o watcher autentica no Drive": "Ela é uma **conta de serviço** com acesso somente leitura a **uma** pasta, nunca OAuth de usuário com refresh token". A nota espelho **não** entrou no corte 3 de `04`, que segue só com "Token que expira em silêncio é o retrato exato da peça que quebra sem avisar" |
| **A6** | **PARCIAL** | A reordenação está feita: `04` tem a posição **14b** com "É tabela de cadastro e não depende de mais nada", a nota de numeração e a conferência do caminho crítico. O aceite novo ("um arquivo R3 exportado à mão... isso não reprova o aceite") entrou só em `04`. `02` F42 mantém "conferido contra um R3 real: **100% dos itens do cardápio ativo casam**", e a definição de pronto repete "`item_cardapio` com 100% dos itens ativos casando com um R3 real" |
| **A7** | **APLICADO** | `01` P5 agora é "**Menções por área e por fator, em contagem absoluta**", com "O QT **não** replica a nota por categoria do incumbente... Isso é divergência deliberada do piso, não paridade perdida" |
| **A8** | **APLICADO** | `01` P12 virou "**Histórico consultável, não necessariamente navegável**", com "Tela dedicada de histórico de relatórios é Fase 2 (matriz, linha 47)" |
| **A9** | **APLICADO** | `02` F53 tem os três critérios: "cifrado com chave simétrica", "um bucket privado nomeado no README, com retenção de 8 semanas" e "O dump conta como **compartilhamento de dado pessoal**". A escolha do bucket fica corretamente com o proprietário, ligada à pergunta 5 |
| **A10** | **APLICADO** | `03` 2.1: "**1 evento por detrator que escolhe `A comida` na `T2C`**. A fração... é **DESCONHECIDA**", com a coluna de 50% na tabela e a métrica nova "Fração de detratores com causa comida" |
| **A11** | **PARCIAL** | `03` 2.8 e `02` F04 estão iguais e certos ("marcação, não bloqueio", métrica "menos de 3% e estável"). Mas `01` P15 continua exigindo o oposto como aceite do piso: "Duas respostas seguidas da mesma comanda são **rejeitadas**, com registro". Implementar F04 reprova P15 |
| **A12** | **APLICADO** | `01` B2 virou "**Parcial** (três telas em promotor e neutro, cinco no detrator com causa comida)", e a legenda foi ajustada: "B2 e J8 são deste segundo tipo" |
| **A13** | **APLICADO, e a matemática confere** | `02` F17: "faixa de 95%, calculada como **1,96 vezes o erro padrão**... Conferência: n=50 dá erro padrão de 10,5 e faixa de ±20,5 pontos". Reconferido: raiz(0,5475/50) = 0,1046, ou 10,5 pontos; 10,5 x 1,96 = 20,5. As linhas de n=100 (7,4 e ±14,5) e n=200 (5,2 e ±10,3) também fecham, e a diferença mínima detectável é o intervalo vezes raiz de 2 (±29, ±20,5, ±14,5) |
| **A14** | **APLICADO** | `02` F32: "Dia operacional em que a casa não abriu sai como **`casa fechada`** e não entra na contagem de dias sem resposta". F28 foi alinhada: "Em dia que o calendário de operação marca como fechado, o conteúdo é **`casa fechada`**" |
| **A15** | **PARCIAL** | `02` F54 e F53 fecharam por dentro ("Nenhuma rotina nova permanente é criada para isso"), mas `04` posição 25 continua entregando literalmente "`backup_semanal` por GitHub Actions com restauração testada, **`cron_keepalive`** e log de execução". F54 afirma que "isso fecha a divergência com a posição 25", e não fecha. Sobra ainda a janela entre a posição 13 e a 25, em que nenhuma das duas peças existe |
| **A16** | **APLICADO** | `04` posição 6 agora carrega "**duas linhas de aviso de privacidade** (finalidade, controlador e canal de direitos) e `versao_texto` gravado junto de cada resposta", com o motivo do comentário aberto escrito |
| **A17** | **APLICADO** | `02` F05 tem "**Dono nomeado da tarefa.** O gerente de turno, no fechamento do caixa" e F39 tem "**Dono nomeado.** O proprietário... Ausência de arquivo novo por **2 dias operacionais** vira linha de cobrança" |
| **A18** | **APLICADO** | `02` F39: "Se esse hábito já existe hoje nas análises de CMV é **NÃO VERIFICADO**, e é a pergunta 5 da seção 5". A tabela de deveres repete a marcação |
| **A19** | **APLICADO** | `01` J8 virou "**Parcial** (o banco nasce em `sa-east-1`; o tratamento cruza fronteira em três pontos)", com "Marcar Sim seria falso" na nota do bloco |
| **A20** | **APLICADO** | F32: "conferir que **todo dia com pelo menos 1 detrator, 1 falha de importação ou 1 alerta de heartbeat saiu fora de 'nada a relatar'**. É contagem, não julgamento". F25 saiu do aceite: "Isso **não é critério de software**, é regra de operação" |
| **A21** | **APLICADO, e o número ficou igual** | `02` F34: "cerca de 2 chamadas por dia, com teto de 10... vale igual em `03-superar.md`". `03` 2.6: "cerca de 2 chamadas por dia, com teto de 10 em noite cheia... É o mesmo número de F34". `03` 2.5 e `02` F37 usam o mesmo número |
| **A22** | **APLICADO** | `04` tem a seção "O ramo alternativo, se `P2` for não", com as posições 12 e 28 caindo, a 13 mudando de destino, a rotina de cópia, `us-east-1` e a linha no aviso de privacidade. A tabela de bloqueios remete a ela |

### Omissões 1 a 9

| # | Situação | Evidência que comprova |
|---|---|---|
| **O1. Deveres humanos recorrentes** | **APLICADO** | `02` seção 5, "Os sete deveres humanos recorrentes que este MVP cria", com as quatro colunas pedidas e a ressalva "**A coluna de dono é proposta, não decidida**". A divergência da restauração (única contra trimestral) está declarada como divergência, que é o comportamento certo |
| **O2. Quem age quando o alarme soa** | **APLICADO** | `04` seção 3, "Quem age quando o alarme soa", com os quatro passos (ler o log, despausar, rodar migration, restaurar dump) e o prazo de dois e sete dias. O nome fica com o proprietário, corretamente declarado |
| **O3. Canal de alerta do gerente** | **APLICADO** | `02` F24: "**e-mail com notificação por push e som no aparelho que o gerente de turno já usa em serviço**", com aceite testável e a alternativa escrita ("a vantagem... **só se realiza na Fase 3, com WhatsApp**"). A definição de pronto cobra o teste |
| **O4. Onde vive cada rotina** | **APLICADO** | `02` seção 1, tabela "Rotina / Quando / Plataforma": quatro em Cloudflare Workers e `backup_semanal` em GitHub Actions, com o motivo da separação |
| **O5. Conta de retorno de `03`** | **APLICADO** | `03` seção 5: "comparar infraestrutura zero contra R$ 575 por ano é comparação errada", com a tabela de desembolso único (tablets, licenças, suporte, 40 a 80 horas) e as duas réguas, sendo a do primeiro ano declarada inexistente enquanto `D` não for cotado |
| **O6. Migração da ponte** | **APLICADO** | `02` seção 4.4, tabela campo a campo com regra de migração para cada campo ausente, incluindo `dia_operacional` recalculado e a contagem de linhas que mudam de dia |
| **O7. Errata no sumário e na matriz** | **NÃO APLICADO** | `00-sumario-executivo.md` linha 197 continua com "**criar a organização Supabase separada**", a linha 146 e a tabela de riscos idem, e `07-matriz-features.md` mantém a linha 110 ("Organização Supabase separada do app de reservas", prioridade **MVP**). Nenhum dos dois arquivos tem nota de errata, e a palavra não aparece em nenhum lugar do dossiê |
| **O8. Tensão "somente link" contra "divergência"** | **APLICADO** | `04` seção 6, bloqueio **`P7`**, com a pergunta exata, as opções A e B e a nota "ela nasce da omissão 8 daquela crítica, e é contradição do briefing consigo mesmo" |
| **O9. Hábito do QR** | **APLICADO** | `02` 4.2: "**A conversão do gesto reaproveitado é DESCONHECIDA**, não tem benchmark e não pode ser presumida igual à de hoje", com a consequência prática de reescrever o script do garçom |

---

## 3. Contradições novas, criadas pela rodada de correção

**1. A ponte grava consentimento em um documento e não grava no outro.** `04` posição 6 passou a exigir "`versao_texto` gravado junto de cada resposta". `02` seção 4.4 continua dizendo o contrário: "a ponte, como está descrita na posição 6 do backlog, **não grava `versao_texto`**", e ainda oferece ao proprietário a escolha entre a Opção A e a Opção B, sendo que a Opção A já foi decidida em `04`. É a contradição mais direta das cinco, e ela nasceu do conserto de A16.

**2. O aceite de `item_cardapio` tem duas versões incompatíveis.** `04` posição 14b: "Item ativo que não aparece no R3 do período fica como `sem venda no período`, e **isso não reprova o aceite**". `02` F42 e a definição de pronto: "**100% dos itens do cardápio ativo casam** com alguma linha do relatório". Um cardápio com um prato sazonal parado passa em `04` e reprova em `02`.

**3. `02` F54 declara fechada uma divergência que continua aberta.** F54 escreve "É isso que fecha a divergência com a posição 25 do backlog, que chamava a entrega de `cron_keepalive`: não existe sexta rotina". A posição 25 de `04` continua, palavra por palavra, entregando `cron_keepalive`. Afirmação de fechamento sem o fechamento é pior que a divergência original, porque desliga a checagem.

**4. Turno voltou a existir em `04`.** `02` F41 fixou "**Não existe junção por turno no MVP**". `04` posição 33 continua com "Junção por data, **possivelmente data mais turno**". É a metade do achado A3 que não foi aplicada.

**5. O piso de aceite está cobrado uma posição antes do hardware que ele exige.** `01` seção 4 agora diz que a lista de vinte itens é "cobrada na posição **26** do backlog". P1 do próprio piso exige "Coleta em mesa, em tablet próprio, modo quiosque", e os tablets só são comprados na posição **27** de `04`. O número veio da própria crítica, mas foi este conserto que o escreveu no documento.

### Contradições que não são novas e continuam vivas

**6. Resposta duplicada: rejeitar ou marcar.** `01` P15 exige, como aceite do piso, que "Duas respostas seguidas da mesma comanda são **rejeitadas**". `02` F04 e `03` 2.8 proíbem rejeitar. A crítica só mandou olhar `02` contra `03`, e por isso `01` passou intacto.

**7. Backup semanal ou duas vezes por semana.** `02` F53 e F54 criaram a janela em que o backup "roda **duas vezes por semana** (domingo e quarta)". A tabela de rotinas da seção 1 de `02` segue com "`backup_semanal` / domingo", e `04` posição 25 não menciona a janela.

**8. O destino do dump não entrou onde F53 diz que entrou.** F53 afirma que o destino "entra nas categorias de compartilhamento do aviso de privacidade (F44)". A lista de F44 continua sendo "hospedagem, banco de dados, provedor de e-mail, serviço de IA", sem o backup.

---

## 4. O que ainda falta, em ordem de importância

1. **Escrever a divergência dos pontos físicos (A4).** É a única restrição do briefing que segue sendo reduzida em silêncio: quatro pontos pedidos, um planejado. Enquanto a frase não estiver na seção 5 de `02`, o proprietário não tem como saber que está aceitando a troca, e o custo de mais 2 a 3 tablets e licenças fica fora da viagem ao Paraguai, que é a única janela de compra prevista.
2. **Alinhar o aceite de `item_cardapio` (A6, contradição 2).** Trocar o critério de F42 e o da definição de pronto em `02` pelo texto já aprovado em `04`. Sem isso, a entrega 14b não tem aceite único e quem testar escolhe qual documento obedecer.
3. **Consertar a posição 25 de `04` e a lacuna do keep-alive (A15, contradição 3).** Tirar o nome `cron_keepalive` da entrega e, principalmente, dizer o que segura o banco entre a posição 13 (schema criado) e a 25 (primeiro backup). Hoje nenhum dos dois documentos cobre essa janela, e a pausa por inatividade acontece em uma semana.
4. **Remover "possivelmente data mais turno" da posição 33 de `04` (A3, contradição 4).** É uma linha, e ela reabre a definição que F21, F39 e F41 acabaram de fechar em três lugares.
5. **Alinhar `01` P15 com a trava de marcação (A11, contradição 6).** Reescrever o aceite de P15 para "a segunda resposta é aceita, agradecida e gravada com `suspeita = true`, e não entra nos indicadores". Do jeito que está, o piso de aceite reprova a implementação correta.
6. **Atualizar `02` seção 4.4 para a Opção A (contradição 1).** A escolha já foi feita na posição 6 de `04`. O parágrafo de A contra B deve virar registro de decisão tomada, mantendo a Opção B apenas como o que fazer com respostas eventualmente coletadas antes da correção.
7. **Repetir a nota da conta de serviço no corte 3 de `04` (A5).** Sem ela, o mesmo critério (credencial de longa duração de fornecedor externo) segue recusando o Google e aceitando o Drive sem explicação no lugar onde a recusa está escrita.
8. **Publicar a errata em `00-sumario-executivo.md` e em `07-matriz-features.md` (omissão 7).** São os dois arquivos que alguém de fora vai ler primeiro, e os dois ainda mandam "criar a organização Supabase separada", que a inspeção provou inaplicável. A matriz ainda classifica isso como MVP na linha 110.
9. **Corrigir a posição do piso em `01` (contradição 5)**, de 26 para 27, ou dizer que P1 é o único item do piso que espera o hardware.
10. **Acertar os três pontos menores:** incluir o destino do dump nas categorias de compartilhamento de F44; refletir a janela de duas execuções semanais do backup na tabela de rotinas de `02` e na posição 25 de `04`; e reavaliar `01` C5, que marca o QT com **Sim** em "Corte por dia da semana e por turno" enquanto F21 condiciona o corte por turno a um `n` de 20 por faixa no trimestre, ou seja, é **Parcial** pela mesma régua que já foi aplicada a B2 e a J8.
11. **Resíduo de linguagem em `01`.** As seções 1 e 2 ainda enquadram o grid inteiro como resposta para "o dia em que o tablet locado voltar", e a lista "o que não entra no piso" ainda diz "no dia da troca". A seção 4 desfez a ambiguidade no lugar certo, mas o resto do documento continua usando a expressão nos dois sentidos.
