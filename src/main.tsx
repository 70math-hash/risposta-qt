/**
 * Ponto de entrada unico, com dois modos.
 *
 * Sem router: o modo sai do caminho da URL uma vez, no arranque, e nao muda depois. O
 * quiosque nunca navega, e o painel troca de aba por estado. Isso remove uma dependencia e
 * uma classe inteira de erro (rota que nao casa, historico que volta no meio da pesquisa).
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './comum/marca.css'
import { App as Coleta, VERSAO_APP } from './coleta/App.js'
import { ligaHeartbeat, ligaSincronizador } from './comum/api.js'
import { pedePersistencia } from './coleta/fila.js'
import type { ItemCardapio } from './coleta/App.js'

interface CatalogoDaApi {
  itens?: ItemCardapio[]
  perguntas_ativas?: { id: string; numero: number }[]
  consentimento?: { versao: string; texto: string } | null
}
import { Painel } from './painel/Painel.jsx'

const raiz = document.getElementById('raiz')
if (raiz === null) throw new Error('elemento #raiz nao encontrado')

const ehPainel = location.pathname.startsWith('/painel')

/**
 * O aparelho se identifica por um id guardado localmente, semeado no provisionamento.
 * Identifica a MESA, nunca a pessoa: e o tablet da casa, nao o celular do cliente.
 */
function dispositivoLocal(): string | undefined {
  const salvo = localStorage.getItem('qt_dispositivo_id')
  return salvo ?? undefined
}

if (ehPainel) {
  createRoot(raiz).render(
    <StrictMode>
      <Painel />
    </StrictMode>,
  )
} else {
  const dispositivoId = dispositivoLocal()
  const canal = dispositivoId === undefined ? 'qr' : 'tablet'

  document.body.classList.add('quiosque')
  void pedePersistencia()
  ligaSincronizador()
  if (dispositivoId !== undefined) ligaHeartbeat(dispositivoId, VERSAO_APP)

  const raizReact = createRoot(raiz)

  /**
   * Renderiza ja, e enriquece quando o catalogo chegar.
   *
   * A coleta NAO espera a rede: o cliente esta na mesa e a nota e o unico dado obrigatorio.
   * Sem catalogo, a tela de item e pulada e as rotacionadas aparecem sem serem gravadas, o que
   * e degradacao honesta. Bloquear a coleta por causa de uma tela opcional seria o inverso da
   * prioridade certa.
   */
  const desenha = (extra: Partial<React.ComponentProps<typeof Coleta>> = {}) => {
    raizReact.render(
      <StrictMode>
        <Coleta
          canal={canal}
          {...(dispositivoId !== undefined ? { dispositivoId } : {})}
          {...extra}
        />
      </StrictMode>,
    )
  }

  desenha()

  void fetch(`${(import.meta.env.VITE_API_BASE as string | undefined) ?? ''}/api/catalogo`)
    .then((r) => r.json() as Promise<CatalogoDaApi>)
    .then((c) => {
      desenha({
        itens: c.itens ?? [],
        perguntasAtivasDoBanco: c.perguntas_ativas ?? [],
        ...(c.consentimento !== null && c.consentimento !== undefined
          ? { versaoTextoConsentimento: c.consentimento.versao }
          : {}),
      })
    })
    .catch(() => {
      // Sem catalogo a coleta segue. O que nao pode acontecer e a tela nao abrir.
    })
}
