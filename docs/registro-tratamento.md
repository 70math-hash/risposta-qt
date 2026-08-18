# Registro das operações de tratamento de dados pessoais

**Controlador:** o restaurante (pessoa jurídica que opera a casa). · **Operador:** nenhum contratado toma
decisão sobre finalidade; os fornecedores listados na seção 5 processam por instrução.
**Base legal principal:** consentimento (LGPD art. 7º, I). · **Última revisão:** 18/08/2026.

> **O que este documento é.** O art. 37 da LGPD obriga o controlador a manter registro das operações de
> tratamento. `D4` cita este arquivo como obrigação, e ele **não existia no repositório** — a crítica
> adversarial o listou entre os quatro arquivos citados e ausentes. Documento que é apontado e não existe é
> pior que documento omisso: quem lê a referência conclui que a obrigação está cumprida.
>
> **O que ele não é.** Não é parecer jurídico. Ele descreve, com precisão verificável contra o schema, o que
> o sistema coleta, por quê, por quanto tempo e quem alcança. A adequação disso ao caso concreto da casa é
> decisão do controlador, e a seção 8 lista o que continua pendente dele.

---

## 1. A decisão que molda tudo: a pesquisa é anônima por padrão

A resposta de pesquisa **não é dado pessoal**. Ela não tem nome, contato, identificador de dispositivo
pessoal, IP nem cookie. O que ela tem é nota, opções tocadas, texto livre, mesa, garçom, tablet e marcas de
tempo — dados da **operação da casa**, não da pessoa.

Isso não é acidente de implementação, é o motor do volume: a tela T1 promete anonimato de forma explícita, e
é essa promessa que faz a taxa de resposta existir. Toda a modelagem decorre daí.

Dado pessoal só entra quando a pessoa **digita um contato**, numa tela separada, com duas caixas
desmarcadas. Se ela marcar a caixa e não preencher nada, **nenhuma linha de cliente é criada** — a restrição
`cliente_tem_contato_ou_esta_anonimizado` recusa a linha vazia no banco, e não apenas no formulário.

**Consequência para este registro:** a maior parte do sistema está fora do escopo da LGPD, e as seções
abaixo tratam da minoria que não está.

---

## 2. As operações de tratamento

| # | Operação | Dados pessoais | Titulares | Finalidade | Base legal | Retenção |
|---|---|---|---|---|---|---|
| **T1** | Contato deixado voluntariamente na pesquisa | nome, e-mail, WhatsApp, data de nascimento — todos opcionais, e ao menos um obrigatório para a linha existir | clientes da casa | retorno sobre a experiência relatada, e contato futuro quando consentido | consentimento (art. 7º, I), colhido em duas caixas separadas e nenhuma pré-marcada | **12 meses** a contar da última visita, renovados a cada visita nova |
| **T2** | Texto livre da pesquisa | nenhum por desenho, e **eventualmente** um contato que a pessoa escreveu no meio do comentário | clientes da casa | entender a reclamação em palavras da própria pessoa | legítimo interesse na melhoria do serviço (art. 7º, IX); o texto não identifica ninguém | o texto é mantido; o **contato dentro dele** é mascarado junto com T1 |
| **T3** | Cadastro de garçom | nome (às vezes só o primeiro) e um PIN de 4 dígitos | empregados da casa | atribuir a resposta a quem atendeu, para a leitura por garçom | execução de contrato de trabalho (art. 7º, V) | enquanto o vínculo durar, e depois disso pelo histórico da série — a linha é **desligada**, nunca apagada |
| **T4** | Clique em convite de avaliação (histórico migrado) | nome do garçom em texto livre, `user_agent`, `referrer` | empregados da casa | preservar a série histórica de 74 cliques do sistema anterior | legítimo interesse na continuidade do histórico (art. 7º, IX) | indeterminado — é série histórica, e não tem titular cliente |
| **T5** | E-mail de destinatário de alerta e do resumo diário | e-mail corporativo | empregados da casa | entregar o alerta de detrator e o resumo das 16h | execução de contrato de trabalho (art. 7º, V) | enquanto a pessoa receber; desligar preenche `removido_em` |
| **T6** | Pedido de titular (acesso, correção, exclusão) | o contato pelo qual o pedido chegou | clientes da casa | atender o direito exercido (art. 18) | obrigação legal (art. 7º, II) | o pedido é mantido como prova de atendimento; o dado pessoal do cliente é anonimizado no atendimento |

**`user_agent` e `referrer` (T4)** são o único par que merece nota: eles vieram do sistema anterior e foram
transcritos sem interpretação, porque interpretar durante uma migração é como se perde a única cópia de um
histórico. São dados de navegador, não de pessoa identificada, e não alimentam nenhuma leitura do painel.

**O que o sistema NÃO coleta, e é decisão e não esquecimento:** CPF, endereço, IP do respondente, cookie de
rastreio, identificador de publicidade, geolocalização, e qualquer dado do art. 5º, II (sensível). Não há
tela que peça nenhum deles, e não há coluna que os receba.

---

## 3. A retenção, e como se prova que ela rodou

`fn_aplica_retencao` roda por cron e faz, **numa única transação**, as duas metades:

1. anonimiza o cliente cuja última visita passou de 12 meses — nome, e-mail, WhatsApp e nascimento viram
   nulos, e `anonimizado_em` recebe a data;
2. varre o texto livre daquele cliente e mascara telefone, e-mail e CPF que a pessoa tenha escrito no meio do
   comentário.

Fazer as duas juntas é o que impede o estado em que o cadastro está limpo e o comentário ainda carrega o
telefone.

**A prova.** A restrição `cliente_anonimizado_sem_dado_pessoal` torna "anonimizado" **não falsificável**: o
banco recusa uma linha marcada como anonimizada que ainda tenha qualquer coluna pessoal preenchida. Não é uma
convenção que alguém pode esquecer de seguir — é uma condição que o Postgres verifica em toda escrita.

A execução fica registrada em `execucao_rotina`, com quantas linhas foram anonimizadas e quantos
mascaramentos ocorreram, e a aba de clientes do painel mostra a contagem por mês. Ausência de dado não prova
nada; o registro da rotina prova.

**O mascaramento erra para o lado seguro,** de propósito: ele prefere mascarar um número que não era telefone
a deixar passar um que era.

---

## 4. Os direitos do titular, e por onde cada um passa

| Direito (art. 18) | Como é atendido | Onde |
|---|---|---|
| Confirmação e acesso | exportação da linha do cliente, com os consentimentos que ele deu | aba **Exportar**, arquivo `clientes` |
| Correção | edição do contato | aba de administração |
| **Eliminação** | `fn_atende_exclusao` anonimiza o cliente e carimba o pedido **na mesma transação** | aba de administração, lista de pedidos |
| Portabilidade | os seis arquivos CSV, com as junções já resolvidas | aba **Exportar** |
| Informação sobre compartilhamento | seção 5 deste documento | aqui |
| Revogação do consentimento | mesma via da eliminação | aba de administração |

**Prazo interno de 7 dias.** A LGPD não fixa 7 dias; o sistema fixa, e cobra no resumo diário quando um
pedido passa disso. Prazo interno curto é o que evita o prazo legal ser estourado.

**A eliminação não apaga a resposta de pesquisa,** e isso é deliberado e informado: a resposta nunca foi dado
pessoal, e apagá-la destruiria a série histórica da casa sem nenhum ganho de privacidade. O que se apaga é o
que identifica — o contato. O `consentimento` permanece, sem o dado, como prova de que houve consentimento e
de que ele foi honrado.

---

## 5. Quem alcança o dado

| Quem | O que alcança | Onde fica | Salvaguarda |
|---|---|---|---|
| **Supabase** (banco) | tudo | `sa-east-1` (São Paulo) — **dado pessoal não sai do Brasil** | RLS ativo em todas as tabelas, `security_invoker` nas views, papel de escrita restrito |
| **Cloudflare** (Pages e Workers) | o que trafega nas requisições | borda global | não persiste dado pessoal; o Worker é passagem, não armazenamento |
| **Resend** (e-mail) | o e-mail do **destinatário interno**, e o conteúdo do alerta | fora do Brasil | o alerta cita mesa, nota e fator — **nunca o contato do cliente** |
| **Groq** (classificação de texto) | o texto livre da pesquisa | fora do Brasil | o texto vai **sem** cliente, sem contato e sem identificador; a saída é limitada a listas fechadas de valor |
| **Backblaze B2** (backup) | o backup inteiro, incluindo dado pessoal | fora do Brasil | **cifrado com chave assimétrica** antes de sair; quem opera o B2 não tem a chave privada |

**As duas transferências internacionais que merecem decisão explícita** são Groq e B2:

- **Groq** recebe texto que a pessoa escreveu, e texto livre pode conter qualquer coisa, inclusive um nome.
  Ele vai desacompanhado de tudo que o ligaria a uma pessoa. O risco residual é a pessoa escrever o próprio
  nome no comentário — e é por isso que o texto também passa pelo mascaramento da retenção.
- **B2** recebe o dado pessoal de fato, e é o único caso. A salvaguarda é criptografia assimétrica aplicada
  **antes** do upload: o arquivo que atravessa a fronteira é ilegível para quem o guarda.

---

## 6. Medidas de segurança

- **A chave que vai ao navegador não escreve.** O painel entra com uma chave pública e o papel dela tem
  apenas `SELECT`. Toda escrita passa pelo Worker, atrás de conferência de sessão, com uma **lista branca**
  que declara tabela e colunas — coluna fora da lista é **recusada**, não ignorada.
- **A chave de serviço nunca vai ao pacote publicado.** Ela vive só no Worker.
- **RLS em todas as tabelas**, com política, verificado por invariante que derruba a migração se alguma
  tabela ficar sem.
- **PIN de garçom não é autenticação.** É dado da resposta. Descobrir o PIN de alguém não dá acesso a nada.
- **Exportação de dado pessoal em bloco fica registrada** em `exportacao_registro`: quem baixou, quando, e
  quantas linhas.
- **Exportação truncada falha em vez de entregar o pedaço.** A leitura pagina até o fim e confere o total
  contra a contagem do servidor.

---

## 7. Incidentes

Não houve incidente de segurança com dado pessoal até a data desta revisão. Este documento não estava no
repositório antes de 18/08/2026, o que **é em si uma não conformidade documental** — registrada aqui em vez
de corrigida em silêncio.

Havendo incidente: comunicar ANPD e titulares em prazo razoável (art. 48), registrar aqui a data, a natureza,
os titulares alcançados e as medidas tomadas.

---

## 8. O que depende de decisão do controlador

Estes itens **não** podem ser resolvidos pelo software, e ficam pendentes até que o proprietário decida:

1. **Encarregado (DPO) nomeado**, com o contato publicado — art. 41. Pode ser o próprio proprietário.
2. **A política de privacidade voltada ao público**, publicada onde o QR e o tablet possam apontar. Este
   documento é o registro interno; ele não substitui o aviso ao titular.
3. **Confirmar a base legal de T2 e T4** (legítimo interesse) com quem responde juridicamente pela casa. As
   duas são defensáveis e nenhuma foi validada por advogado.
4. **Revisão anual** deste registro, ou a cada mudança que toque dado pessoal — o que vier primeiro.

> A regra que governa este arquivo é a mesma do resto do projeto: uma pendência escrita e visível vale mais
> que uma resolvida em silêncio, porque a segunda ninguém revisa.
