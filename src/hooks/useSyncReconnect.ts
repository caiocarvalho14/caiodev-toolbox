// src/hooks/useSyncOnReconnect.ts
import { useEffect } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import { requestSync } from '../lib/sync/syncEngine'

/** Chame uma vez na raiz do app. Dispara a fila sempre que a conexão real volta. */
export function useSyncOnReconnect() {
  const online = useOnlineStatus()

  useEffect(() => {
    if (online) void requestSync()
  }, [online])
}