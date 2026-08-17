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
  // O painel entra na M1, depois da coleta. Ate la, uma tela honesta em vez de erro.
  raiz.innerHTML =
    '<div class="tela"><div class="tela__corpo">' +
    '<h1 class="pergunta">Painel</h1>' +
    '<p class="ajuda">Em construção. A coleta é a primeira entrega da M1.</p>' +
    '</div></div>'
} else {
  const dispositivoId = dispositivoLocal()
  const canal = dispositivoId === undefined ? 'qr' : 'tablet'

  document.body.classList.add('quiosque')
  void pedePersistencia()
  ligaSincronizador()
  if (dispositivoId !== undefined) ligaHeartbeat(dispositivoId, VERSAO_APP)

  createRoot(raiz).render(
    <StrictMode>
      <Coleta canal={canal} {...(dispositivoId !== undefined ? { dispositivoId } : {})} />
    </StrictMode>,
  )
}
