# Briefing do projeto — substituto próprio do Risposta

Documento gerado a partir de uma entrevista de 104 perguntas respondidas pelo proprietário
(QT Pizza Bar, Rio de Janeiro). É a **fonte da verdade** do escopo. Qualquer decisão de
produto ou de arquitetura deve ser conferida contra este arquivo.

- **Data da entrevista:** 13/08/2026
- **Etapa concluída:** 1 (Descoberta)
- **Branch:** `claude/risposta-competitor-research-807bpl`

---

## 1. Objetivo

Construir uma **suíte interna única** para o QT Pizza Bar que substitua o Risposta e também
as mensalidades de CRM/fidelização, gestão de avaliações e BI. Não é SaaS comercial; no
máximo será cedida a amigos do setor.

| Item | Definição |
|---|---|
| Objetivo | Suíte interna maior (substituir Risposta + CRM + reputação + BI) |
| Situação atual | Cliente pagante do Risposta, **subutilizado** |
| Custo atual | R$ 501 a R$ 1.000/mês, **sem fidelidade e sem multa** |
| Unidades | 1 (QT Pizza Bar) |
| Escopo | Suíte completa: pesquisa + avaliações públicas + CRM/recorrência + auditoria por IA |
| Comercialização | Só para amigos do setor. Sem multi-tenant comercial |
| Transição | **Troca direta**, sem período em paralelo |

### Definição de sucesso (todas as quatro)

1. Cancelar a mensalidade.
2. Coletar **mais** respostas do que hoje (50–200/mês).
3. Gerar decisão, não só relatório.
4. Unificar os dados (satisfação + venda + CMV + ficha técnica + reserva).

### Dores declaradas com a ferramenta atual

- Não conversa com os dados do restaurante (fica numa ilha).
- Relatório raso, não gera ação.
- Preço alto demais.

---

## 2. A operação (restrições reais)

| Item | Valor |
|---|---|
| Formato | Pizzaria, salão, só jantar |
| Dias e horários | Ter–sex 18h–23h · Sáb–dom 17h–23h (fecha segunda) |
| Mesas | 16 no salão interno + 6 na varanda = 22 |
| Particularidade | Mesas são **juntadas**; existem **comandas individuais** |
| Movimento | Até 20 mesas atendidas por dia |
| Respostas hoje | 50 a 200/mês |
| Equipe de salão | Varia muito (fixos + extras) |
| Internet do salão | Estável |
| PDV | **Altec / Next** — nuvem e local (a confirmar) |
| Reservas | **Sistema próprio, feito no Claude Code**, no ar; detalhes desconhecidos |

> Capacidade individual de cada mesa: **pendente**, o proprietário vai enviar.

---

## 3. Coleta

| Item | Decisão |
|---|---|
| Canais | Tablet próprio em **modo quiosque** + **QR Code** na mesa/conta + WhatsApp pós-visita (fase futura) |
| Pontos físicos | 4 ou mais (garçom leva o tablet junto com a conta) |
| Hardware atual | Tablet **locado do Risposta** — volta no cancelamento |
| Hardware novo | Tablets **Android de entrada**, comprados em viagem ao Paraguai |
| Momento | **Junto com a conta** |
| Duração máxima | **45 segundos** — nem tão curto que não informe, nem tão longo que perca |
| Escala principal | **NPS 0 a 10** |
| Obrigatório | **Só a nota**. Todo o resto é opcional |
| Prato a prato | **Só quando a nota for baixa** |
| Tela final | **Apenas agradecer e encerrar** — sem convite ao Google, sem cupom, sem Instagram |
| Identificação | **Anônima**, com contato opcional no fim |
| Idiomas | Português e inglês |
| Offline | Não é requisito (internet estável), mas fila local é desejável como seguro |
| Incentivo | **Nenhum prêmio.** O garçom pede na entrega da conta — processo humano, custo zero |
| Perguntas | **Copiar o padrão de mercado.** O proprietário enviará prints das perguntas do Risposta para comparação |

### Mesa e garçom

- **Preferência:** puxar do PDV pela comanda.
- **Plano B (se o Altec não integrar):** o garçom digita o número da mesa e seu PIN antes de entregar o tablet.

---

## 4. Indicadores e relatório

Indicadores desejados (todos):

- NPS e nota média ao longo do tempo, com tendência.
- Nota por área e **por prato**.
- Desempenho por **garçom e turno**.
- **Cruzamento com faturamento** (o BI que hoje é feito à mão).

| Item | Decisão |
|---|---|
| Frequência | **Diária** |
| Canal | **E-mail** por enquanto (WhatsApp só quando o sistema amadurecer) |
| Horário | **16h** — antes da abertura da noite |
| Destinatários | Proprietário + gerência (visão completa) · Cozinha (prato e tempo) · Salão (atendimento) |
| Comentários abertos | **Filtrados por área**; crítica pessoal grave só para o proprietário |
| Painel | **Dashboard interno com gráficos**, no estilo do painel do Risposta |
| Dispositivo | Celular e computador **igualmente** |
| Exportação | Botão de exportar CSV/Excel + **backup automático** |

---

## 5. Módulos além da pesquisa

### CRM / recorrência
- Base de clientes com histórico.
- Campanha de retorno.
- Aniversário e datas.
- **Integração com o CRM das reservas** (sistema próprio já no ar).

### Avaliações públicas
- Monitorar **Google Meu Negócio** e **iFood**.
- **Somente link** para as plataformas — não trazer o conteúdo para dentro, não responder pelo sistema.

### Auditoria por IA (substitui o cliente oculto)
Vigia os quatro:
- Queda de tendência antes de virar crise.
- Padrões repetidos de falha.
- Prato específico com problema.
- Divergência entre a pesquisa e a avaliação pública.

### Cortado
- Módulo de checklist de operação (abertura/fechamento).

---

## 6. Inteligência artificial

| Item | Decisão |
|---|---|
| Usos desejados | Análise de comentários · Diagnóstico escrito no relatório diário · Cruzamento com ficha técnica e CMV |
| Custo aceito | **R$ 0** |
| Caminho | **Camada gratuita de Gemini/Groq** (com a ressalva de que política de fornecedor pode mudar) |

---

## 7. Arquitetura e infraestrutura

| Item | Decisão |
|---|---|
| Stack | **Supabase + Next.js** |
| Deploy | A definir — recomendação técnica pendente (Vercel / Netlify / Cloudflare) |
| Banco | **Não mexer no Supabase ainda**; inspecionar e recomendar antes de criar qualquer tabela |
| Repositório | A definir — recomendação pendente |
| Relação com o app de reservas | A definir **após inspeção** do que já está no ar |
| Domínio | Subdomínio do domínio do QT |
| Custo de infra | **O máximo gratuito possível** |
| Manutenção | **Ninguém vai manter.** Tem que rodar sozinho — restrição dura de arquitetura |
| Documentação | Markdown no repositório |
| Git | Autorizado commitar e dar **push** no branch designado. Sem pull request |

### Import de dados do PDV

- Frequência desejada: **automática**.
- O PC do caixa **desliga no fim do dia**, então não serve de host.
- O proprietário topa **comprar um Raspberry Pi** para rodar um agente diário. Modelo a recomendar.
- Relatório de origem: **R3 — Vendas por Produto Detalhado** (Altec).

### Fichas técnicas e CMV

- Hoje vivem em skills separadas do Claude Code.
- Instrução: **manter separado**.
- Mas o cruzamento satisfação × CMV é um diferencial desejado, e o cardápio atual está nas skills.
- **Tensão a resolver na arquitetura** (proposta: o sistema tem tabela própria de itens e custos, alimentada por importação, sem acoplamento às skills).
- Se o sistema calcula CMV ou apenas consome o resultado: **recomendação técnica pendente**.

---

## 8. Acesso, segurança e LGPD

| Item | Decisão |
|---|---|
| Login da equipe | **PIN simples no tablet** |
| Administradores | Proprietário + um sócio |
| Nível de segurança | Proporcional — a definir tecnicamente |
| LGPD | **Fazer certo desde o início**: consentimento, aviso de privacidade, direito de exclusão, retenção |
| Reconhecimento de cliente recorrente | Equilíbrio a definir tecnicamente, respeitando a LGPD |
| Identidade visual | **Manual de marca da QT** em todas as telas — preto `#1A1E1E`, cinza `#A0A5A5`, branco `#EFECEC`, Helvetica, fundo branco, minimalista/modernista |

---

## 9. MVP

Obrigatório na primeira versão no ar (os quatro):

1. Coleta + painel de leitura.
2. Resumo diário por e-mail.
3. Importação do Altec (R3) com cruzamento satisfação × faturamento.
4. Base de clientes / CRM.

**Prazo:** sem prazo. Prioridade é o resultado, não a velocidade.
**Migração do histórico do Risposta:** só se for fácil, sem trabalho manual grande.

### Fase 2
- Campanha automática de retorno.
- Previsão de recompra.
- Conversa com os dados em linguagem natural.

### Fase 3 / futuro
- Pesquisa de delivery (modelo de dados já preparado para isso).
- WhatsApp como canal de coleta e de relatório.

---

## 10. Diferenciais pretendidos (o que nenhum concorrente entrega)

1. **Satisfação cruzada com CMV** — saber se o prato mais elogiado é também o mais rentável.
2. **Previsão de recompra** — identificar quem não vai voltar antes de ele desaparecer.
3. **Conversa com os dados** — perguntar em linguagem natural e receber análise dos próprios números.

---

## 11. Conduta do projeto

| Item | Decisão |
|---|---|
| Aprovação | **Etapa por etapa**, na sessão |
| Profundidade da pesquisa | **Máxima, exaustiva** |
| Geografia da pesquisa | Brasil + exterior |
| Foco do dossiê | Funcionalidade a funcionalidade |
| Formato do dossiê | Artifact interativo + arquivo markdown no repositório |
| Franqueza | Avisar sobre alternativa mais barata **apenas se a diferença for muito discrepante** |
| O que não copiar do Risposta | Nada — "quero tudo e mais" |

---

## 12. Perguntas em aberto (pendências do proprietário)

- [ ] Prints das perguntas que o Risposta usa hoje.
- [ ] Capacidade individual de cada uma das 22 mesas.
- [ ] Confirmar se o Altec/Next armazena em nuvem e o que expõe (API, banco, exportação programada).
- [ ] Nome do repositório e do app de reservas para inspeção.

## 13. Decisões delegadas (recomendação técnica pendente)

- [ ] Repositório: este (`risposta-qt`) ou um novo.
- [ ] Plataforma de deploy.
- [ ] Relação com o app de reservas: mesmo banco ou separado.
- [ ] Nível de segurança proporcional.
- [ ] Reconhecimento de cliente recorrente sob LGPD.
- [ ] O sistema calcula CMV ou só consome.
- [ ] Modelo mínimo de tablet Android e de Raspberry Pi.
- [ ] Orçamento mínimo de hardware.
- [ ] Metas de equipe amarradas à nota: recomendar a favor ou contra.
- [ ] Nome do produto.
