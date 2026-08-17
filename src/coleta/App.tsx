/**
 * O quiosque de coleta.
 *
 * Maquina de estado, nao aplicacao com rotas: o cliente percorre um caminho linear com
 * ramificacao por nota, e nao existe navegacao para tras nem URL para compartilhar. Isso
 * elimina router, historico e SSR de uma vez.
 *
 * Regras que o codigo honra, e nao apenas descreve:
 *   T1 e a unica tela obrigatoria. Uma resposta e valida com a nota e nada mais.
 *   Ninguem recebe a ramificacao de nota baixa E o bloco rotacionado (teto de 45 s, N16).
 *   Timeout de inatividade de 45 s, com contagem visivel nos 15 finais, e a nota ja dada e
 *   gravada (N17). Perder a nota por inatividade seria perder o unico dado obrigatorio.
 *   T7 so agradece, e reseta em 8 s sem exibir nada da resposta enviada (N18, D3, D6).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dimensao, Idioma } from '../comum/dominio.js'
import type {
  ConsentimentoDado,
  ItemApontado,
  OpcaoMarcada,
  PerguntaSorteada,
  RespostaEnviada,
  TelaEvento,
} from '../comum/contrato.js'
import { enfileiraResposta, enfileiraTentativa } from './fila.js'
import { sincroniza } from '../comum/api.js'
import {
  ARRANQUE_SUGERIDO,
  CABECALHO_ROTACIONADA,
  T0,
  T1,
  T2A,
  T2B,
  T2C,
  T3C1,
  T3C2,
  T3C3,
  T3C_FATORES,
  T3C_PERGUNTA,
  T6,
  T7,
  VERSAO_QUESTIONARIO,
  type Opcao,
  type PerguntaBanco,
  type Passo,
  perguntaAberta,
  proximoPasso,
  perguntasAtivas,
  quantasRotacionadas,
  sorteiaPerguntas,
  t,
} from './questionario.js'
import { SimboloQt } from '../comum/SimboloQt.js'

export const VERSAO_APP = '0.1.0'

/** N17. Perder a nota por inatividade seria perder o unico dado obrigatorio. */
const TIMEOUT_INATIVIDADE_S = 45
const CONTAGEM_VISIVEL_S = 15

// `Passo` e `proximoPasso` vivem em questionario.ts, que e onde a ramificacao e testada.

export interface ItemCardapio {
  id: string
  nome: string
  grupo: 'pizza' | 'entrada' | 'sobremesa'
}

export interface PropsColeta {
  /** `tablet` no quiosque, `qr` no celular do cliente. */
  canal: 'tablet' | 'qr'
  /** Obrigatorio quando o canal e `tablet`. */
  dispositivoId?: string
  /** Catalogo ativo, vindo da API. Vazio faz a T3C2 ser pulada, em vez de travar. */
  itens?: readonly ItemCardapio[]
  /**
   * Perguntas ativas do banco, vindas do catalogo, com o `id` do banco e o `numero`.
   *
   * O payload guarda o `id` e nao o numero, porque numero e rotulo de leitura e pode migrar
   * numa reescrita. Sem o catalogo carregado, as rotacionadas ainda APARECEM (o texto esta no
   * bundle) mas nao sao gravadas, porque gravar com id inventado corromperia a contagem.
   */
  perguntasAtivasDoBanco?: readonly { id: string; numero: number }[]
  /** A versao vigente do texto de consentimento, vinda da API. */
  versaoTextoConsentimento?: string
}

function agora(): string {
  return new Date().toISOString()
}

function novoId(): string {
  return crypto.randomUUID()
}

export function App(props: PropsColeta): React.ReactElement {
  const {
    canal,
    dispositivoId,
    itens = [],
    perguntasAtivasDoBanco = [],
    versaoTextoConsentimento = 'nao-verificada',
  } = props

  const [idioma, setIdioma] = useState<Idioma>('pt')
  const [passo, setPasso] = useState<Passo>(canal === 'tablet' ? 'T0' : 'T1')

  // Dado da T0
  const [mesa, setMesa] = useState('')
  const [pin, setPin] = useState('')

  // Dado da resposta em construcao
  const respostaId = useRef<string>(novoId())
  const inicioTela = useRef<string>(agora())
  const [telas, setTelas] = useState<TelaEvento[]>([])
  const [nota, setNota] = useState<number | null>(null)
  const [opcoes, setOpcoes] = useState<OpcaoMarcada[]>([])
  const [marcadasAgora, setMarcadasAgora] = useState<string[]>([])
  const [item, setItem] = useState<ItemApontado | null>(null)
  const [texto, setTexto] = useState('')
  const [contatoWhats, setContatoWhats] = useState('')
  const [contatoEmail, setContatoEmail] = useState('')
  const [aceitouContato, setAceitouContato] = useState(false)
  const [sorteadas, setSorteadas] = useState<PerguntaBanco[]>([])
  const [respondidasRot, setRespondidasRot] = useState<PerguntaSorteada[]>([])
  const [dimensaoDetrator, setDimensaoDetrator] = useState<Dimensao | null>(null)

  const [restante, setRestante] = useState(TIMEOUT_INATIVIDADE_S)

  /** Quando o catalogo nao chegou, cai no arranque sugerido, que ao menos exibe pergunta. */
  const banco = useMemo(() => {
    const numeros =
      perguntasAtivasDoBanco.length > 0
        ? perguntasAtivasDoBanco.map((p) => p.numero)
        : ARRANQUE_SUGERIDO
    return perguntasAtivas(numeros)
  }, [perguntasAtivasDoBanco])

  /** numero da pergunta -> id do banco. Vazio significa rotacionada nao gravavel. */
  const idPorNumero = useMemo(() => {
    const m = new Map<number, string>()
    for (const p of perguntasAtivasDoBanco) m.set(p.numero, p.id)
    return m
  }, [perguntasAtivasDoBanco])

  /** Zera tudo e volta ao inicio. Nunca exibe nada da resposta anterior. */
  const reinicia = useCallback(() => {
    respostaId.current = novoId()
    inicioTela.current = agora()
    setTelas([])
    setNota(null)
    setOpcoes([])
    setMarcadasAgora([])
    setItem(null)
    setTexto('')
    setContatoWhats('')
    setContatoEmail('')
    setAceitouContato(false)
    setSorteadas([])
    setRespondidasRot([])
    setDimensaoDetrator(null)
    setMesa('')
    setPin('')
    setIdioma('pt')
    setRestante(TIMEOUT_INATIVIDADE_S)
    setPasso(canal === 'tablet' ? 'T0' : 'T1')
  }, [canal])

  /** Fecha o carimbo da tela atual e abre o da proxima. */
  const registraTela = useCallback((tela: Passo, pulou: boolean) => {
    const evento: TelaEvento = {
      tela,
      entrou_em: inicioTela.current,
      saiu_em: agora(),
      pulou,
    }
    setTelas((t0) => [...t0, evento])
    inicioTela.current = agora()
  }, [])

  /** Grava a resposta na fila local e dispara a sincronia. Nunca bloqueia a tela. */
  const grava = useCallback(
    (notaFinal: number, telasFinais: readonly TelaEvento[]) => {
      const aceiteEm = agora()
      const consentimentos: ConsentimentoDado[] = [
        { finalidade: 'pesquisa', versao_texto: versaoTextoConsentimento, aceito_em: aceiteEm },
      ]
      const temContato = contatoWhats.trim() !== '' || contatoEmail.trim() !== ''
      if (temContato && aceitouContato) {
        consentimentos.push({
          finalidade: 'contato',
          versao_texto: versaoTextoConsentimento,
          aceito_em: aceiteEm,
        })
      }

      const carga: RespostaEnviada = {
        id: respostaId.current,
        criado_em_cliente: agora(),
        nota: notaFinal,
        canal,
        idioma,
        versao_app: VERSAO_APP,
        versao_questionario: VERSAO_QUESTIONARIO,
        opcoes,
        itens: item === null ? [] : [item],
        sorteadas: respondidasRot,
        telas: telasFinais,
        consentimentos,
        ...(mesa.trim() !== '' ? { mesa_digitada: mesa.trim() } : {}),
        ...(pin.trim() !== '' ? { garcom_pin_digitado: pin.trim() } : {}),
        ...(dispositivoId !== undefined ? { dispositivo_id: dispositivoId } : {}),
        ...(texto.trim() !== '' ? { texto: { texto_cru: texto.trim() } } : {}),
        ...(temContato && aceitouContato
          ? {
              contato: {
                ...(contatoWhats.trim() !== '' ? { whatsapp: contatoWhats.trim() } : {}),
                ...(contatoEmail.trim() !== '' ? { email: contatoEmail.trim() } : {}),
              },
            }
          : {}),
      }

      // A tentativa de par NAO e enfileirada aqui: `fn_grava_resposta` grava ela na mesma
      // transacao, com o MESMO id da resposta. Enviar as duas duplicaria o denominador da
      // conversao por garcom, inflando a taxa sem ninguem notar.
      void enfileiraResposta(carga)
        .then(() => sincroniza())
        .catch(() => {
          // A resposta ja esta na fila. Falha de rede aqui e invisivel para o cliente, e a
          // fila drena depois. O que nunca pode acontecer e o cliente ver erro na mesa.
        })
    },
    [
      aceitouContato,
      canal,
      contatoEmail,
      contatoWhats,
      dispositivoId,
      idioma,
      item,
      mesa,
      opcoes,
      pin,
      respondidasRot,
      texto,
      versaoTextoConsentimento,
    ],
  )

  /**
   * Encerra a resposta: grava e vai para o agradecimento.
   *
   * Chamado tanto pelo fim normal quanto pelo timeout de inatividade, e e por isso que a
   * nota ja dada nunca se perde.
   */
  const encerra = useCallback(
    (passoAtual: Passo, pulou: boolean) => {
      if (nota === null) {
        reinicia()
        return
      }
      const evento: TelaEvento = {
        tela: passoAtual,
        entrou_em: inicioTela.current,
        saiu_em: agora(),
        pulou,
      }
      const todas = [...telas, evento]
      setTelas(todas)
      grava(nota, todas)
      setPasso('T7')
    },
    [grava, nota, reinicia, telas],
  )

  // --- Timeout de inatividade ---
  useEffect(() => {
    if (passo === 'T0' || passo === 'T7') {
      setRestante(TIMEOUT_INATIVIDADE_S)
      return
    }
    setRestante(TIMEOUT_INATIVIDADE_S)
    const tick = setInterval(() => {
      setRestante((r) => {
        if (r <= 1) {
          clearInterval(tick)
          // Com nota, encerra e grava. Sem nota, so volta ao inicio: nao existe resposta.
          if (nota === null) reinicia()
          else encerra(passo, true)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [passo, nota, encerra, reinicia])

  // --- Auto-reset da tela final ---
  useEffect(() => {
    if (passo !== 'T7') return
    const relogio = setTimeout(reinicia, T7.autoResetSegundos * 1000)
    return () => clearTimeout(relogio)
  }, [passo, reinicia])

  const tocou = useCallback(() => setRestante(TIMEOUT_INATIVIDADE_S), [])

  // --- Navegacao ---

  const escolheNota = (n: number) => {
    setNota(n)
    registraTela('T1', false)
    const quantas = quantasRotacionadas(n)
    setSorteadas([...sorteiaPerguntas(banco, quantas)])
    setMarcadasAgora([])
    setPasso(proximoPasso('T1', { nota: n, rotacionadas: quantas }))
  }

  const proximoDepoisDaRamificacao = (de: 'T2A' | 'T2B') => {
    // Detrator nao recebe rotacionada: a regra vive em proximoPasso, com teste proprio.
    setPasso(proximoPasso(de, { nota: nota ?? 10, rotacionadas: sorteadas.length }))
  }

  const confirmaMultipla = (tela: 'T2A' | 'T2B', lista: readonly Opcao[]) => {
    const marcadas = lista.filter((o) => marcadasAgora.includes(o.codigo))
    setOpcoes((prev) => [
      ...prev,
      ...marcadas.map((o) => ({
        tela,
        dimensao: o.dimensao,
        opcao_codigo: o.codigo,
        ...(o.fator !== undefined ? { fator: o.fator } : {}),
      })),
    ])
    registraTela(tela, marcadas.length === 0)
    setMarcadasAgora([])
    proximoDepoisDaRamificacao(tela)
  }

  const escolheCausaDetrator = (op: Opcao) => {
    setOpcoes((prev) => [
      ...prev,
      {
        tela: 'T2C',
        dimensao: op.dimensao,
        opcao_codigo: op.codigo,
        ...(op.fator !== undefined ? { fator: op.fator } : {}),
      },
    ])
    registraTela('T2C', false)
    setDimensaoDetrator(op.dimensao)
    setPasso(
      proximoPasso('T2C', {
        nota: nota ?? 0,
        rotacionadas: 0,
        causa: op.abre ?? 'nenhuma',
      }),
    )
  }

  const respondeRotacionada = (indice: 0 | 1, opcaoIndice: number | null) => {
    const p = sorteadas[indice]
    if (p !== undefined) {
      const idDoBanco = idPorNumero.get(p.numero)
      // Sem id do catalogo, a rotacionada nao e gravada: id inventado corromperia a contagem
      // por pergunta, que e justamente o que o banco rotacionado existe para medir.
      if (idDoBanco !== undefined) {
        setRespondidasRot((prev) => [
          ...prev,
          {
            pergunta_banco_id: idDoBanco,
            respondida: opcaoIndice !== null,
            ...(opcaoIndice !== null ? { opcao_indice: opcaoIndice } : {}),
          },
        ])
      }
      if (opcaoIndice !== null && p.fator !== undefined) {
        setOpcoes((prev) => [
          ...prev,
          {
            tela: `ROT${indice + 1}`,
            dimensao: p.dimensao,
            fator: p.fator!,
            opcao_codigo: String(opcaoIndice),
          },
        ])
      }
    }
    const de: Passo = indice === 0 ? 'ROT1' : 'ROT2'
    registraTela(de, opcaoIndice === null)
    setPasso(proximoPasso(de, { nota: nota ?? 10, rotacionadas: sorteadas.length }))
  }

  // --- Telas ---

  const Topo = () => (
    <div className="tela__topo">
      <SimboloQt largura={44} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--u2)' }}>
        {restante <= CONTAGEM_VISIVEL_S && passo !== 'T0' && passo !== 'T7' ? (
          <span className="contagem" role="status">
            {restante}s
          </span>
        ) : null}
        <button
          type="button"
          className="idioma"
          aria-pressed={idioma === 'en'}
          onClick={() => {
            setIdioma(idioma === 'pt' ? 'en' : 'pt')
            tocou()
          }}
        >
          {idioma === 'pt' ? 'EN' : 'PT'}
        </button>
      </div>
    </div>
  )

  const Pular = ({ onClick }: { onClick: () => void }) => (
    <button type="button" className="btn btn--secundario" onClick={onClick}>
      {idioma === 'pt' ? 'Pular' : 'Skip'}
    </button>
  )

  if (passo === 'T7') {
    return (
      <div className="fim" onPointerDown={reinicia}>
        <SimboloQt largura={72} />
        <p className="fim__texto">{t(T7.texto, idioma)}</p>
      </div>
    )
  }

  if (passo === 'T0') {
    const pronto = mesa.trim() !== '' && pin.trim() !== ''
    return (
      <div className="tela">
        <Topo />
        <div className="tela__corpo">
          <h1 className="pergunta">{t(T0.rotuloMesa, idioma)}</h1>
          <input
            className="campo"
            inputMode="numeric"
            autoComplete="off"
            value={mesa}
            onChange={(e) => setMesa(e.target.value)}
            aria-label={t(T0.rotuloMesa, idioma)}
          />
          <span className="rotulo">{t(T0.rotuloPin, idioma)}</span>
          <input
            className="campo"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            aria-label={t(T0.rotuloPin, idioma)}
          />
        </div>
        <div className="tela__rodape">
          <button
            type="button"
            className="btn btn--secundario"
            onClick={() => {
              // A recusa e dado: e o denominador da conversao por garcom.
              void enfileiraTentativa({
                id: novoId(),
                criado_em_cliente: agora(),
                desfecho: 'recusou',
                canal,
                ...(dispositivoId !== undefined ? { dispositivo_id: dispositivoId } : {}),
                ...(mesa.trim() !== '' ? { mesa_digitada: mesa.trim() } : {}),
                ...(pin.trim() !== '' ? { garcom_pin_digitado: pin.trim() } : {}),
              }).then(() => sincroniza())
              reinicia()
            }}
          >
            {t(T0.botaoRecusou, idioma)}
          </button>
          <button
            type="button"
            className="btn"
            disabled={!pronto}
            onClick={() => {
              inicioTela.current = agora()
              setPasso('T1')
            }}
          >
            {t(T0.botao, idioma)}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="tela" onPointerDown={tocou}>
      <Topo />

      {passo === 'T1' ? (
        <>
          <div className="tela__corpo">
            <h1 className="pergunta">{t(T1.pergunta, idioma)}</h1>
            <div className="notas">
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  className="nota"
                  onClick={() => escolheNota(n)}
                  aria-label={String(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="ancoras">
              <span>{t(T1.ancoraEsquerda, idioma)}</span>
              <span>{t(T1.ancoraDireita, idioma)}</span>
            </div>
          </div>
          <div className="tela__rodape">
            <p className="aviso-anonimo">{t(T1.rodape, idioma)}</p>
          </div>
        </>
      ) : null}

      {passo === 'T2A' || passo === 'T2B' ? (
        (() => {
          const cfg = passo === 'T2A' ? T2A : T2B
          return (
            <>
              <div className="tela__corpo">
                <h1 className="pergunta">{t(cfg.pergunta, idioma)}</h1>
                <p className="ajuda">{t(cfg.ajuda, idioma)}</p>
                <div className="opcoes">
                  {cfg.opcoes.map((op) => {
                    const marcada = marcadasAgora.includes(op.codigo)
                    return (
                      <button
                        key={op.codigo}
                        type="button"
                        className="opcao"
                        aria-pressed={marcada}
                        onClick={() =>
                          setMarcadasAgora((prev) =>
                            marcada
                              ? prev.filter((c) => c !== op.codigo)
                              : prev.length >= cfg.maximo
                                ? prev
                                : [...prev, op.codigo],
                          )
                        }
                      >
                        {t(op.rotulo, idioma)}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="tela__rodape">
                <Pular onClick={() => confirmaMultipla(passo, cfg.opcoes)} />
                <button
                  type="button"
                  className="btn"
                  disabled={marcadasAgora.length === 0}
                  onClick={() => confirmaMultipla(passo, cfg.opcoes)}
                >
                  {idioma === 'pt' ? 'Continuar' : 'Continue'}
                </button>
              </div>
            </>
          )
        })()
      ) : null}

      {passo === 'T2C' ? (
        <>
          <div className="tela__corpo">
            <h1 className="pergunta">{t(T2C.pergunta, idioma)}</h1>
            <p className="ajuda">{t(T2C.ajuda, idioma)}</p>
            <div className="opcoes">
              {T2C.opcoes.map((op) => (
                <button
                  key={op.codigo}
                  type="button"
                  className="opcao"
                  onClick={() => escolheCausaDetrator(op)}
                >
                  {t(op.rotulo, idioma)}
                </button>
              ))}
            </div>
          </div>
          <div className="tela__rodape">
            <Pular
              onClick={() => {
                registraTela('T2C', true)
                setPasso('T5')
              }}
            />
          </div>
        </>
      ) : null}

      {passo === 'T3C' && dimensaoDetrator !== null ? (
        <>
          <div className="tela__corpo">
            <h1 className="pergunta">{t(T3C_PERGUNTA, idioma)}</h1>
            <div className="opcoes">
              {(T3C_FATORES[dimensaoDetrator] ?? []).map((op) => (
                <button
                  key={op.codigo}
                  type="button"
                  className="opcao"
                  onClick={() => {
                    setOpcoes((prev) => [
                      ...prev,
                      {
                        tela: 'T3C',
                        dimensao: op.dimensao,
                        opcao_codigo: op.codigo,
                        ...(op.fator !== undefined ? { fator: op.fator } : {}),
                      },
                    ])
                    registraTela('T3C', false)
                    setPasso('T5')
                  }}
                >
                  {t(op.rotulo, idioma)}
                </button>
              ))}
            </div>
          </div>
          <div className="tela__rodape">
            <Pular
              onClick={() => {
                registraTela('T3C', true)
                setPasso('T5')
              }}
            />
          </div>
        </>
      ) : null}

      {passo === 'T3C1' ? (
        <>
          <div className="tela__corpo">
            <h1 className="pergunta">{t(T3C1.pergunta, idioma)}</h1>
            <div className="opcoes">
              {T3C1.opcoes.map((op) => (
                <button
                  key={op.codigo}
                  type="button"
                  className="opcao"
                  onClick={() => {
                    setItem({ grupo: op.codigo })
                    registraTela('T3C1', false)
                    // Sem catalogo carregado, a T3C2 nao tem o que listar: pula direto ao
                    // fator, em vez de mostrar tela vazia.
                    const temItens =
                      op.codigo !== 'mais_de_um' &&
                      itens.some((i) => i.grupo === op.codigo)
                    setPasso(
                      proximoPasso('T3C1', {
                        nota: nota ?? 0,
                        rotacionadas: 0,
                        temItensDoGrupo: temItens,
                      }),
                    )
                  }}
                >
                  {t(op.rotulo, idioma)}
                </button>
              ))}
            </div>
          </div>
          <div className="tela__rodape">
            <Pular
              onClick={() => {
                registraTela('T3C1', true)
                setPasso('T5')
              }}
            />
          </div>
        </>
      ) : null}

      {passo === 'T3C2' && item !== null ? (
        <>
          <div className="tela__corpo">
            <h1 className="pergunta">{t(T3C2.pergunta, idioma)}</h1>
            <div className="opcoes">
              {itens
                .filter((i) => i.grupo === item.grupo)
                .slice(0, T3C2.maximoPorTela)
                .map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className="opcao"
                    onClick={() => {
                      setItem({ ...item, item_cardapio_id: i.id })
                      registraTela('T3C2', false)
                      setPasso('T3C3')
                    }}
                  >
                    {i.nome}
                  </button>
                ))}
              <button
                type="button"
                className="opcao"
                onClick={() => {
                  registraTela('T3C2', true)
                  setPasso('T3C3')
                }}
              >
                {t(T3C2.preferoNaoDizer, idioma)}
              </button>
            </div>
          </div>
          <div className="tela__rodape">
            <Pular
              onClick={() => {
                registraTela('T3C2', true)
                setPasso('T3C3')
              }}
            />
          </div>
        </>
      ) : null}

      {passo === 'T3C3' ? (
        <>
          <div className="tela__corpo">
            <h1 className="pergunta">{t(T3C3.pergunta, idioma)}</h1>
            <div className="opcoes">
              {T3C3.opcoes.map((op) => (
                <button
                  key={op.codigo}
                  type="button"
                  className="opcao"
                  onClick={() => {
                    setItem((i) => (i === null ? i : { ...i, fator: op.fator }))
                    setOpcoes((prev) => [
                      ...prev,
                      {
                        tela: 'T3C3',
                        dimensao: op.dimensao,
                        opcao_codigo: op.codigo,
                        ...(op.fator !== undefined ? { fator: op.fator } : {}),
                      },
                    ])
                    registraTela('T3C3', false)
                    setPasso('T5')
                  }}
                >
                  {t(op.rotulo, idioma)}
                </button>
              ))}
            </div>
          </div>
          <div className="tela__rodape">
            <Pular
              onClick={() => {
                registraTela('T3C3', true)
                setPasso('T5')
              }}
            />
          </div>
        </>
      ) : null}

      {passo === 'ROT1' || passo === 'ROT2' ? (
        (() => {
          const indice = passo === 'ROT1' ? 0 : 1
          const p = sorteadas[indice]
          if (p === undefined) {
            return (
              <div className="tela__corpo">
                <button type="button" className="btn" onClick={() => setPasso('T5')}>
                  {idioma === 'pt' ? 'Continuar' : 'Continue'}
                </button>
              </div>
            )
          }
          return (
            <>
              <div className="tela__corpo">
                <span className="rotulo">{t(CABECALHO_ROTACIONADA, idioma)}</span>
                <h1 className="pergunta">{t(p.texto, idioma)}</h1>
                <div className="opcoes">
                  {p.opcoes.map((op, i) => (
                    <button
                      key={op.pt}
                      type="button"
                      className="opcao"
                      onClick={() => respondeRotacionada(indice as 0 | 1, i)}
                    >
                      {t(op, idioma)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tela__rodape">
                <Pular onClick={() => respondeRotacionada(indice as 0 | 1, null)} />
              </div>
            </>
          )
        })()
      ) : null}

      {passo === 'T5' && nota !== null ? (
        <>
          <div className="tela__corpo">
            <span className="rotulo">{idioma === 'pt' ? 'Opcional' : 'Optional'}</span>
            <h1 className="pergunta">{t(perguntaAberta(nota), idioma)}</h1>
            <textarea
              className="campo"
              rows={2}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              aria-label={t(perguntaAberta(nota), idioma)}
            />
          </div>
          <div className="tela__rodape">
            <Pular
              onClick={() => {
                setTexto('')
                registraTela('T5', true)
                setPasso('T6')
              }}
            />
            <button
              type="button"
              className="btn"
              onClick={() => {
                registraTela('T5', texto.trim() === '')
                setPasso('T6')
              }}
            >
              {idioma === 'pt' ? 'Continuar' : 'Continue'}
            </button>
          </div>
        </>
      ) : null}

      {passo === 'T6' ? (
        <>
          <div className="tela__corpo">
            <h1 className="pergunta">{t(T6.pergunta, idioma)}</h1>
            <p className="ajuda">{t(T6.ajuda, idioma)}</p>
            <input
              className="campo"
              inputMode="tel"
              placeholder="WhatsApp"
              value={contatoWhats}
              onChange={(e) => {
                setContatoWhats(e.target.value)
                setAceitouContato(true)
              }}
              aria-label="WhatsApp"
            />
            <input
              className="campo"
              inputMode="email"
              placeholder={idioma === 'pt' ? 'E-mail' : 'Email'}
              value={contatoEmail}
              onChange={(e) => {
                setContatoEmail(e.target.value)
                setAceitouContato(true)
              }}
              aria-label={idioma === 'pt' ? 'E-mail' : 'Email'}
            />
            <p className="aviso-anonimo">{t(T6.rodape, idioma)}</p>
          </div>
          <div className="tela__rodape">
            <Pular
              onClick={() => {
                setContatoWhats('')
                setContatoEmail('')
                setAceitouContato(false)
                encerra('T6', true)
              }}
            />
            <button type="button" className="btn" onClick={() => encerra('T6', false)}>
              {idioma === 'pt' ? 'Enviar' : 'Send'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
