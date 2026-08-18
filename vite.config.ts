import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Um projeto Pages, dois modos: a coleta em / e o painel em /painel.
// Sem router e sem SSR de proposito: o quiosque e maquina de estado e o painel e abas,
// e cada dependencia a menos e uma coisa a menos que quebra num sistema que ninguem mantem.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    // Android 13 de entrada: manter o bundle pequeno importa mais que dividir em muitos chunks.
    chunkSizeWarningLimit: 400,
    sourcemap: true,
  },
  server: { port: 5173 },
})
