// src/hooks/useOnlineStatus.ts
import { useCallback, useEffect, useRef, useState } from 'react'

type UseOnlineStatusOptions = {
  pingUrl?: string
  intervalMs?: number
  timeoutMs?: number
}

const DEFAULT_PING_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`
console.log(DEFAULT_PING_URL)
export function useOnlineStatus(options: UseOnlineStatusOptions = {}) {
  const {
    pingUrl = DEFAULT_PING_URL,
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
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
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