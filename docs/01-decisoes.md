# Registro de decisões

Decisões tomadas depois do briefing inicial, com a consequência de cada uma. Este arquivo tem
**precedência sobre o briefing e sobre o dossiê** onde houver divergência, porque é mais recente e
foi tomado com a pesquisa e a inspeção do ambiente já na mesa.

---

## D1. Comprar os tablets antes de cancelar a mensalidade

**Data:** 13/08/2026 · **Decidido por:** proprietário
**Resolve:** o achado A1 da crítica adversarial, a contradição entre o piso de 20 itens do grid e o
cancelamento com 4 itens do backlog.

O tablet locado só volta quando os tablets próprios estiverem rodando com painel. O piso de aceite
alto vale, e o cancelamento acontece contra ele.

### Consequências

| Consequência | Detalhe |
|---|---|
| **A ponte sai do escopo** | A ponte de coleta (formulário de terceiro gravando no banco próprio) existia para permitir o cancelamento na semana 1. Sem cancelamento antecipado, ela é complexidade sem propósito. **Economiza 12 a 20 horas** e remove uma dependência externa do caminho crítico |
| **O marco M0 deixa de existir** | O backlog passa a três marcos: M1 Coleta própria, M2 Decisão, M3 Recorrência. A compra dos tablets sobe para o início da M1 |
| **A economia começa depois** | 2 a 3 meses a mais de mensalidade, ou seja, entre R$ 1.000 e R$ 3.000 pagos ao fornecedor atual. É o preço declarado de proteger o critério de sucesso nº 2 |
| **O critério nº 2 fica protegido** | Coletar mais que hoje deixa de depender de o QR sozinho substituir um canal que responde por cerca de 90% do volume |
| **Haverá sobreposição curta** | O briefing dizia "troca direta, sem período em paralelo". Por construção, agora existe uma janela curta com os dois no ar. Não é período de comparação, é transição: o sistema próprio entra, é conferido, e só então o tablet locado volta |
| **A trava de A2 continua valendo** | Medir a conversão sobre mesas atendidas desde o primeiro dia, com a linha de base das 74 linhas de `cliques_avaliacao` |

---

## D2. A pesquisa vive num schema dedicado dentro do projeto `NFe e Financeiro`

**Data:** 13/08/2026 · **Decidido por:** proprietário
**Resolve:** o bloqueio `P2` do backlog e a pergunta 1 da crítica. Substitui a recomendação de
"organização Supabase separada" do sumário executivo, que a inspeção mostrou ser inaplicável.

### Consequências

| Consequência | Detalhe |
|---|---|
| **Diferencial nº 1 a um `JOIN` de distância** | Satisfação e custo por prato no mesmo Postgres. Nenhuma rotina de sincronização, ou seja, uma peça móvel a menos num sistema que ninguém vai manter |
| **Região correta** | `sa-east-1`, São Paulo. Dado pessoal de cliente brasileiro fica no Brasil, com menos latência e menos superfície de conformidade. Região não se troca depois de criada |
| **`qt-avaliacoes` pode ser pausado** | Depois de migrar as 74 linhas de `cliques_avaliacao`. Libera o segundo slot ativo da organização e permite trazer `Fichas Sensoriais` de volta do INACTIVE |
| **Ramo alternativo cai** | O ramo de contingência escrito para o caso de `P2` ser não (rotina diária de cópia de custo, região `us-east-1`, transferência internacional no aviso de privacidade) fica sem efeito |

### Condições inegociáveis desta decisão

Foram oferecidas como parte da pergunta e valem como regra do projeto:

1. Nada da pesquisa tem permissão de escrita fora do próprio schema. O schema fiscal é somente leitura para ela, e apenas nas tabelas de custo.
2. Toda criação e alteração de estrutura por **migration versionada**, nunca ad hoc pelo painel.
3. **`pg_dump` antes de qualquer migração** que toque o projeto, sem exceção.
4. A migração das 74 linhas acontece depois do dump, e o `qt-avaliacoes` só é pausado depois de conferido que o dado chegou íntegro.

---

## D3. Vale "só linkar" para Google e iFood

**Data:** 13/08/2026 · **Decidido por:** proprietário
**Resolve:** a contradição interna do próprio briefing, apontada na omissão 8 da crítica: pedir
"somente link" e ao mesmo tempo pedir que a auditoria por IA detecte divergência entre a pesquisa e
a avaliação pública. Não se compara com o que não se lê.

### Consequências

| Consequência | Detalhe |
|---|---|
| **A detecção de divergência sai** | O quarto item da auditoria por IA é cortado. Os outros três continuam: queda de tendência antes de virar crise, padrões repetidos de falha, e prato específico com problema |
| **Nada de API do Google nem do iFood** | Nem no MVP nem na fase 2. Some a dependência de aprovação de terceiro, o prazo de até 14 dias, a proibição dos termos do Maps de armazenar avaliação, e a exigência do iFood de CNPJ com CNAE de tecnologia |
| **O painel leva até lá** | Link para os perfis, e só |
| **Some uma tarefa humana recorrente** | Abrir o Portal do iFood toda semana sai da lista de deveres. Sobram seis |

---

## D4. Retenção de dado pessoal: 12 meses contados da última visita

**Data:** 13/08/2026 · **Decidido por:** delegado a mim, com o pedido de escolher o proporcional.

A regra tem duas metades, e é a separação entre elas que faz a decisão funcionar:

| O que | Prazo | Por quê |
|---|---|---|
| **Dado pessoal**: nome, WhatsApp, e-mail, data de nascimento | **12 meses da última visita**, depois apagado por rotina automática | Doze meses cobrem um ciclo sazonal inteiro e um aniversário, que são as duas finalidades declaradas. Cliente que não volta há um ano está fora do ciclo de recompra de uma pizzaria, e guardar o WhatsApp dele um segundo ano tem valor decrescente e risco crescente. O princípio da necessidade da LGPD pede o menor prazo que serve à finalidade |
| **Resposta da pesquisa**: nota, comentário, prato, garçom, dia operacional | **Indefinidamente**, desvinculada do contato | Não é dado pessoal depois de desvinculada, e é justamente a série histórica que o proprietário quer preservar e que hoje mora na casa do fornecedor. Apagar isso destruiria o ativo que motiva o projeto |

### O detalhe que quase sempre escapa

O **comentário aberto é campo livre**, e o cliente pode escrever o próprio nome, o telefone ou o de
outra pessoa dentro dele. Portanto, no momento da desvinculação, o texto precisa passar por uma
varredura de padrão (telefone, e-mail, CPF) antes de ser mantido como dado não pessoal. Sem isso, a
retenção de 12 meses é contornada pelo próprio texto que se pretende preservar.

### O que isso liga

- A rotina `cron_retencao`, que passa a ter prazo definido e pode ser escrita.
- A linha de prazo de retenção do aviso de privacidade.
- O registro de operações de tratamento.

---

## Pendências que continuam abertas

| Pendência | O que trava | Quem responde |
|---|---|---|
| **Para onde apontam hoje os QR por garçom, e o convite depende da nota?** | Pode haver review gating operando no perfil do restaurante agora. É a única pendência que pode estar impedindo dano em curso | Proprietário, olhando a configuração |
| **Quem executa as seis tarefas recorrentes, com nome, e quem conserta quando o alarme soa** | Decide se a restrição "ninguém vai manter" é premissa ou ficção. Tarefa sem dono é tarefa cortada, e cortá-la muda o que o painel mostra | Proprietário |
| **Onde fica guardado o `pg_dump` semanal** | É pré-requisito do backup, e sem destino definido o backup obrigatório vira a maior exposição de dado pessoal do desenho | Proprietário |
| **Onde vive o app de reservas** | Integração com o CRM de reservas fica fora do MVP até essa resposta | Proprietário |
| **As 8 perguntas ao suporte da Altec** | A pergunta 3 (agendamento de e-mail do R3) e a 4 (o R3 tem mesa e comanda?) decidem se a importação é automática e se o cruzamento por comanda existe | Suporte da Altec |
| **Prints das perguntas do Risposta e capacidade das mesas** | Calibragem, não bloqueio | Proprietário |
