-- =============================================================================
-- 20260817107000_semeia_consentimento_texto.sql
--
-- O QUE FAZ
--   Semeia `experiencia.consentimento_texto` com a versao `1`, cujo texto e exatamente o que o
--   bundle do PWA mostra na T6. Depois CONFERE que a linha existe, e derruba a migration se nao.
--
-- POR QUE EXISTE: SEM ELA, NENHUMA RESPOSTA COM CONSENTIMENTO ENTRA NO PRIMEIRO DIA
--   `consentimento.versao_texto` tem chave estrangeira para `consentimento_texto.versao`. Nenhuma
--   migration semeava essa tabela, entao num projeto novo ela nasce VAZIA. A cadeia inteira:
--
--     1. `GET /api/catalogo` le `consentimento_texto` e nao acha nada; devolve `consentimento: null`.
--     2. O PWA cai no valor padrao de `versaoTextoConsentimento`, que era `'nao-verificada'`.
--     3. `fn_grava_resposta` insere `consentimento` com essa versao.
--     4. A chave estrangeira nao encontra `'nao-verificada'` e levanta 23503.
--     5. A insercao acontece DENTRO de `fn_grava_resposta`, na mesma transacao: a RESPOSTA
--        INTEIRA e recusada.
--
--   E o consentimento de finalidade `pesquisa` e enviado em TODA resposta. Portanto o efeito nao
--   e uma borda: e nenhuma resposta gravada, nunca, num projeto recem-implantado, com a fila do
--   tablet tentando de novo para sempre. Confirmado contra o Postgres de ensaio:
--
--     23503: insert or update on table "consentimento" violates foreign key constraint
--            "consentimento_versao_texto_fkey" ...
--            Key (versao_texto)=(nao-verificada) is not present in table "consentimento_texto".
--
--   Achado pela critica adversarial da Etapa 4 (A04).
--
-- POR QUE SEMEAR, EM VEZ DE AFROUXAR A CHAVE ESTRANGEIRA
--   A chave e o que garante que o texto citado num aceite EXISTE e pode ser lido depois. Numa
--   fiscalizacao, "a pessoa aceitou a versao 1" so vale se a versao 1 puder ser mostrada. Trocar
--   a chave por texto livre resolveria o erro e destruiria a unica coisa que o aceite prova.
--
--   A outra alternativa, deixar `fn_grava_resposta` resolver a versao vigente quando a enviada nao
--   existe, e pior: ela gravaria um aceite citando um texto que a pessoa nao viu.
--
-- O QUE ASSUME
--   1. O texto abaixo e o MESMO de `T6.rodape` em `src/coleta/questionario.ts`, e
--      `VERSAO_TEXTO_EMBUTIDO` naquele arquivo e `'1'`. `tests/contrato-consentimento.test.ts`
--      confere as duas coisas, porque texto duplicado em dois lugares divergindo em silencio e
--      justamente o que uma fiscalizacao encontraria.
--   2. Trocar o texto NAO e editar esta linha: e inserir uma versao nova, com `vigente_de` novo.
--      Editar apagaria a prova de qual texto estava na tela nos aceites ja gravados.
--   3. `vigente_de` fica em 2026-01-01, antes de qualquer coleta, para nao existir resposta com
--      aceite anterior a vigencia do texto que ela cita.
--
-- COMO SE DESFAZ
--   delete from experiencia.consentimento_texto where versao = '1';
--   Falha enquanto existir `consentimento` apontando para ela, e isso e a chave fazendo o
--   trabalho dela. Desfazer num projeto em coleta volta a recusar toda resposta.
-- =============================================================================

insert into experiencia.consentimento_texto (versao, texto, vigente_de)
values (
  '1',
  -- Exatamente o que a T6 mostra, em pt e en. Guardar os dois idiomas num campo so, e nao duas
  -- linhas, porque a versao e do TEXTO e nao do idioma: a pessoa aceitou aquele texto, na lingua
  -- em que ele estava na tela dela.
  'Sua nota já foi registrada. Se você deixar contato, ele fica ligado a esta resposta. '
  '(EN) Your rating is already saved. If you leave a contact, it will be linked to this response.',
  '2026-01-01T00:00:00-03:00'
)
on conflict (versao) do nothing;

do $$
declare v_n integer;
begin
  select count(*) into v_n from experiencia.consentimento_texto where versao = '1';
  if v_n <> 1 then
    raise exception
      'a versao 1 de consentimento_texto nao existe depois desta migration. Sem ela, a chave '
      'estrangeira de consentimento.versao_texto recusa TODA resposta que carregue consentimento, '
      'e o consentimento de finalidade pesquisa vai em toda resposta.';
  end if;

  -- E a conferencia que importa de verdade: a versao que o PWA usa por omissao existe. O valor
  -- literal esta aqui de proposito, e nao lido de configuracao: se alguem trocar
  -- `VERSAO_TEXTO_EMBUTIDO` no TypeScript sem semear a versao nova, esta linha derruba a
  -- migration em vez de deixar a coleta cair em producao.
  if not exists (select 1 from experiencia.consentimento_texto where versao = '1') then
    raise exception 'a versao embutida no bundle do PWA (`1`) nao existe em consentimento_texto';
  end if;

  raise notice 'consentimento_texto: versao 1 semeada, igual ao texto embutido no bundle.';
end
$$;
