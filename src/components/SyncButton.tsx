// src/components/SyncButton.tsx
import { useState } from 'react'
import { RefreshCw, WifiOff, CloudUpload } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { usePendingSyncCount } from '../hooks/usePendingSyncCount'
import { useToast } from '../hooks/useToast'
import { fullSync } from '../lib/sync/syncEngine'

export function SyncButton() {
  const online = useOnlineStatus()
  const pendingCount = usePendingSyncCount()
  const [syncing, setSyncing] = useState(false)
  const { toast } = useToast()

  const disabled = !online || syncing || pendingCount === 0

  async function handleSync() {
    setSyncing(true)
    try {
      await fullSync()
      toast({ title: 'Sincronização concluída' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao sincronizar' })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={disabled}
      title={
        !online
          ? 'Sem conexão com o servidor'
          : pendingCount === 0
            ? 'Nada pendente para sincronizar'
            : `${pendingCount} pendente(s) — clique para sincronizar`
      }
      className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600"
    >
      {!online ? (
        <WifiOff className="w-4 h-4" />
      ) : syncing ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : (
        <CloudUpload className="w-4 h-4" />
      )}
      Sincronizar
      {pendingCount > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold">
          {pendingCount}
        </span>
      )}
    </button>
  )
}