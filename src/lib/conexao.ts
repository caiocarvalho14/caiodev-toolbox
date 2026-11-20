// src/lib/conexao.ts
// Estado da conexão com o servidor, compartilhado pelo app inteiro.
// - Tolerância: o servidor tem no máximo TOLERANCIA_MS para responder; passou disso, o app
//   segue com os dados locais (IndexedDB) e marca a conexão como caída.
// - Quando a conexão volta depois de ter caído, `voltou` fica true até o usuário sincronizar
//   ou dispensar o aviso (o botão Sincronizar mostra um aviso verde).
import { useSyncExternalStore } from 'react'

export const TOLERANCIA_MS = 2000

interface EstadoConexao {
  online: boolean
  /** a conexão caiu e voltou: hora de sincronizar */
  voltou: boolean
}

let estado: EstadoConexao = { online: navigator.onLine, voltou: false }
const ouvintes = new Set<() => void>()

function definir(parcial: Partial<EstadoConexao>) {
  estado = { ...estado, ...parcial }
  ouvintes.forEach((ouvinte) => ouvinte())
}

export function marcarOffline() {
  if (estado.online) definir({ online: false })
}

export function marcarOnline() {
  // só avisa se estava caída antes; a primeira confirmação ao abrir o app não conta
  if (!estado.online) definir({ online: true, voltou: true })
}

export function dispensarAvisoVoltou() {
  if (estado.voltou) definir({ voltou: false })
}

/** Erro de rede ou de tempo esgotado (não é erro do servidor, como RLS ou validação). */
export function ehFalhaDeConexao(err: unknown): boolean {
  if (!navigator.onLine) return true
  const e = err as { name?: string; message?: string } | null
  const texto = `${e?.name ?? ''} ${e?.message ?? ''}`
  return /abort|timeout|timed out|failed to fetch|networkerror|load failed|network request failed/i.test(texto)
}

// --- verificação periódica (uma só para o app inteiro) ---
const PING_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`
const INTERVALO_ONLINE_MS = 30_000
const INTERVALO_OFFLINE_MS = 10_000 // sem conexão, confere mais vezes para avisar logo que voltar

let verificando = false
let monitorIniciado = false
let timer: number | undefined

export async function verificarConexao() {
  if (verificando) return
  verificando = true
  try {
    if (!navigator.onLine) {
      marcarOffline()
      return
    }
    await fetch(`${PING_URL}?_=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(TOLERANCIA_MS),
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    })
    marcarOnline()
  } catch {
    marcarOffline()
  } finally {
    verificando = false
    agendar()
  }
}

function agendar() {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    if (document.visibilityState === 'visible') void verificarConexao()
    else agendar()
  }, estado.online ? INTERVALO_ONLINE_MS : INTERVALO_OFFLINE_MS)
}

function iniciarMonitor() {
  if (monitorIniciado) return
  monitorIniciado = true
  window.addEventListener('online', () => void verificarConexao())
  window.addEventListener('offline', marcarOffline) // isso é confiável: se caiu, caiu
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void verificarConexao()
  })
  void verificarConexao()
}

function assinar(ouvinte: () => void) {
  iniciarMonitor()
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

export function useConexao(): EstadoConexao {
  return useSyncExternalStore(assinar, () => estado)
}
