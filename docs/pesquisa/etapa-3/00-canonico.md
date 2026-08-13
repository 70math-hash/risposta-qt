# Valores canônicos da Etapa 3

Folha de reconciliação. Onde qualquer documento da Etapa 3 divergir desta folha, **esta folha
vence**. Ela existe porque a primeira rodada de correção foi feita por agentes em paralelo que não
viam o texto uns dos outros, e o resultado foi correção aplicada num lado do par e não no outro.

Ordem de precedência do projeto: `docs/01-decisoes.md` → esta folha → documentos da Etapa 3 →
dossiê da Etapa 2 → briefing.

---

## C1. A ponte de coleta não existe

Decisão D1: os tablets são comprados **antes** do cancelamento. A ponte existia unicamente para
permitir cancelar na semana 1, e sem essa finalidade é complexidade sem propósito.

- **O marco M0 deixa de existir.** Os marcos são **M1 Coleta própria**, **M2 Decisão**, **M3 Recorrência**.
- Toda entrega de ponte sai do backlog, incluindo o formulário de terceiro, o webhook e a migração da ponte para o schema definitivo.
- A seção de migração da ponte de `02-replicar.md` sai inteira. Não há dado de ponte para migrar.
- A discussão de Opção A contra Opção B sobre `versao_texto` na ponte perde objeto e sai.
- O único dado histórico a migrar são as **74 linhas de `cliques_avaliacao`** do projeto `qt-avaliacoes`.

## C2. Nunca referenciar entrega por número de posição entre documentos

Foi a causa mecânica de três contradições. Número de posição muda a cada reordenação e nenhum
documento acompanha o outro.

- Dentro de `04-cortar-e-backlog.md`, a numeração de posição pode existir, como ordem de execução.
- **Em qualquer referência cruzada, use o nome da entrega e o marco.** Exemplo correto: "cobrado na entrega `painel_leitura`, na M1". Exemplo proibido: "cobrado na posição 26".
- Isso vale também para as referências dentro de `01-grid-comparativo.md` ao piso de aceite.

## C3. Piso de aceite: o que é e quando é cobrado

- O piso de vinte itens é o piso do **sistema próprio**, cobrado **antes da devolução do tablet locado**, que agora acontece depois de o sistema estar de pé (D1).
- Não existe mais "piso menor de quatro itens", porque não existe mais cancelamento antecipado.
- `01-grid-comparativo.md` deve usar uma expressão só, **"dia da devolução do tablet locado"**, nas seções 1, 2 e 4 e na lista "o que não entra no piso". A expressão "dia da troca" sai do documento, porque foi usada com dois sentidos.

## C4. Resposta duplicada: marcação, nunca rejeição

Vale em `01` P15, `02` F04 e `03` 2.8, com o mesmo texto:

> A segunda resposta da mesma mesa, no mesmo dia operacional, dentro de 20 minutos, é **aceita,
> agradecida e gravada com `suspeita = true`**, e não entra nos indicadores. Não é rejeitada, porque
> mesas juntadas com comandas individuais produzem respostas legítimas em sequência.

Métrica única: **respostas marcadas como suspeitas abaixo de 3% e estável**.

## C5. Aceite de `item_cardapio`

Vale a versão de `04`, em `02` F42 e na definição de pronto:

> Conferido contra **um arquivo R3 exportado à mão**, de um mês qualquer, antes de existir qualquer
> import automático. Item ativo que não aparece no R3 do período fica como `sem venda no período`, e
> **isso não reprova o aceite**.

A frase "100% dos itens do cardápio ativo casam" sai dos dois lugares.

## C6. Keep-alive e backup

Uma regra só, repetida igual em `02` (tabela de rotinas, F53, F54) e em `04`:

- **Não existe rotina `cron_keepalive`.** Nenhuma rotina é criada só para manter o banco acordado.
- O backup roda **duas vezes por semana, domingo e quarta**, em GitHub Actions. A escolha de duas execuções é o que garante que nunca se passe uma semana inteira sem escrita, que é a janela de pausa por inatividade do plano gratuito.
- **Entre a criação do schema e a entrada do digest**, quem segura o banco acordado é a escrita do próprio workflow de backup, duas vezes por semana.
- **Depois que o digest das 16h existe**, ele passa a ser o keep-alive, e o backup segue sendo backup.
- A entrega no backlog chama-se **`backup_semanal`**, sem menção a `cron_keepalive`.

## C7. Turno

Definição única, em `02` F21, F39, F41 e em `04`:

- Não existe corte por Manhã, Tarde e Noite. Numa casa só de jantar isso produz dois buckets vazios.
- O corte que a casa tem é **faixa horária sobre `dia_operacional`: até 20h30, e depois de 20h30**.
- É **corte opcional de leitura**, não dimensão de junção. Exige `n` de 20 por faixa no trimestre; abaixo disso a tela escreve `amostra insuficiente, n=x`.
- A frase "possivelmente data mais turno" sai de `04`. A junção com venda é **por `dia_operacional`**, e ponto.

## C8. Google e iFood: somente link

Decisão D3.

- Nada de API do Google Business Profile, nem no MVP nem na fase 2. Nada de API do iFood.
- **A detecção de divergência entre pesquisa e avaliação pública sai** da auditoria por IA. Restam três itens: queda de tendência antes de virar crise, padrões repetidos de falha, e prato específico com problema.
- A tarefa recorrente de abrir o Portal do iFood toda semana sai da tabela de deveres. **Passam a ser seis deveres, não sete.**
- O bloqueio `P7` está resolvido e vira registro de decisão, não pergunta em aberto.
- O corte 2 de `04` não deve sugerir QR fixo apontando para o Google logo depois de citar a política que proíbe pressionar por avaliação dentro do estabelecimento. Se a sugestão ficar, precisa da ressalva ao lado.

## C9. Supabase

Decisão D2.

- Schema dedicado **`experiencia`** dentro do projeto `NFe e Financeiro`, região `sa-east-1`.
- **O ramo alternativo para o caso de `P2` ser não sai dos documentos.** `P2` está respondido.
- As quatro condições inegociáveis de D2 valem como regra e devem aparecer em `02` e em `04`: nenhuma escrita fora do schema, migration versionada sempre, `pg_dump` antes de qualquer migração, e `qt-avaliacoes` só é pausado depois de conferida a integridade das 74 linhas migradas.
- `00-sumario-executivo.md` e `07-matriz-features.md` precisam de **nota de errata no topo**, porque ambos ainda mandam criar organização separada, e a matriz ainda classifica isso como MVP na linha 110.

## C10. Retenção

Decisão D4.

- **Dado pessoal** (nome, WhatsApp, e-mail, data de nascimento): **12 meses contados da última visita**, apagado por rotina automática.
- **Resposta da pesquisa** (nota, comentário, prato, garçom, `dia_operacional`): mantida indefinidamente, **desvinculada do contato**.
- Antes de tratar o comentário aberto como dado não pessoal, ele passa por **varredura de padrão** (telefone, e-mail, CPF), porque é campo livre e o cliente pode escrever o próprio contato dentro dele.
- `cron_retencao` passa a ter prazo definido e pode ser escrita.

## C11. Faixa de confiança

Fórmula única, já conferida:

> Faixa de 95% = **1,96 vezes o erro padrão**, com erro padrão em
> `raiz((p_promotores + p_detratores - NPS²) / n)`.
> Conferência: n=50 dá erro padrão 10,5 e faixa ±20,5. n=200 dá 5,2 e ±10,3.
> A diferença mínima detectável entre dois períodos é a faixa vezes raiz de 2: ±29 para n=50, ±14,5 para n=200.

## C12. Chamadas ao LLM

Número único nos dois documentos: **cerca de 2 chamadas por dia, com teto de 10 em noite cheia**.
Menos de 0,1% da cota diária gratuita.

## C13. Credencial de longa duração

O critério que recusa a API do Google é o mesmo que precisa justificar o Drive. A nota da conta de
serviço, já escrita em `02` F39, deve ser **repetida no corte 3 de `04`**:

> A credencial do Drive é uma conta de serviço com acesso somente leitura a uma pasta, nunca OAuth
> de usuário com refresh token, exatamente para não repetir a fragilidade que faz este corte recusar
> a API do Google Business Profile.

## C14. Destino do dump

O bucket privado de destino do `pg_dump` **entra nas categorias de compartilhamento de dado
pessoal** do aviso de privacidade em `02` F44, ao lado de hospedagem, banco, provedor de e-mail e
serviço de IA. Hoje F53 afirma que entra e F44 não lista.

## C15. Pontos físicos de coleta: divergência a declarar

O briefing pede **4 ou mais pontos físicos**. O plano prevê **1 tablet em uso mais 1 de reserva**.
A redução nunca foi declarada, e com D1 ela virou urgente, porque a compra acontece na viagem ao
Paraguai, que é a única janela prevista.

`02-replicar.md` deve trazer, na seção de transição, a divergência escrita com as duas opções e o
custo de cada uma:

- **Plano atual:** 1 tablet em uso, 1 de reserva. Justificativa: com até 20 mesas por dia e coleta na entrega da conta, o tablet circula com o garçom e não fica parado em ponto fixo. O QR por garçom é o segundo canal, permanente e ilimitado.
- **Se o proprietário mantiver os 4 pontos:** mais 2 a 3 tablets, mais 2 a 3 licenças de quiosque a 8,90 EUR cada, e mais 2 a 3 suportes. Preço dos tablets em BRL segue **NÃO VERIFICADO**.
- A decisão precisa sair **antes da viagem**, não depois.

## C16. Marcações do grid que precisam virar Parcial

Mesma régua já aplicada a B2 e J8:

- **C5 do grid** ("Corte por dia da semana e por turno"): vira **Parcial**, porque F21 condiciona o corte por faixa horária a um `n` de 20 por faixa no trimestre.
