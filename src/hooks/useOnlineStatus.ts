// src/hooks/useOnlineStatus.ts
import { useCallback, useEffect, useRef, useState } from 'react'

type UseOnlineStatusOptions = {
  /** URL usada pra testar conexão real. Deve ser leve e sempre disponível.
   * Default: favicon do próprio site (same-origin, sem problema de CORS). */
  pingUrl?: string
  /** Intervalo (ms) entre checagens periódicas enquanto a aba está visível.
   * Default: 30s. */
  intervalMs?: number
  /** Timeout (ms) pra considerar a checagem como falha. Default: 5s. */
  timeoutMs?: number
}

// navigator.onLine só diz se a interface de rede está ativa (ex: Wi-Fi
// conectado), não se há internet de verdade — por isso, além do evento
// nativo (que serve pra reagir instantaneamente quando o SO detecta que
// caiu a rede), fazemos uma requisição real pra confirmar.
export function useOnlineStatus(options: UseOnlineStatusOptions = {}) {
  const {
    pingUrl = `${window.location.origin}/favicon.ico`,
    intervalMs = 30_000,
    timeoutMs = 5_000,
  } = options

  const [online, setOnline] = useState(() => navigator.onLine)
  const checkingRef = useRef(false)
  const checkConnection = useCallback(async () => {
    if (checkingRef.current) return
    checkingRef.current = true

    // se o SO já diz que não tem rede nenhuma, nem tenta a requisição
    if (!navigator.onLine) {
      setOnline(false)
      checkingRef.current = false
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

    try {
      await fetch(`${pingUrl}?_=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      })
      setOnline(true)
    } catch {
      setOnline(false)
    } finally {
      window.clearTimeout(timeout)
      checkingRef.current = false
    }
  }, [pingUrl, timeoutMs])

  useEffect(() => {
    checkConnection()

    const handleOnline = () => checkConnection()
    const handleOffline = () => setOnline(false) // isso é confiável: se caiu, caiu

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // reconfirma periodicamente e sempre que a aba volta a ficar visível,
    // pra pegar casos de "wifi conectado mas sem internet" que não disparam
    // o evento 'offline'
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') checkConnection()
    }, intervalMs)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkConnection()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.clearInterval(interval)
    }
  }, [checkConnection, intervalMs])

  return online
}