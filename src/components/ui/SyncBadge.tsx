// src/components/ui/SyncBadge.tsx
import { Cloud, CloudUpload, CloudAlert } from 'lucide-react'
import type { RecordSyncStatus } from '../../hooks/useSyncStatus'

interface SyncBadgeProps {
  status: RecordSyncStatus
}



export function SyncBadge({ status }: SyncBadgeProps) {
  if (status === 'synced') return null // registro ok — sem poluir a UI

  if (status === 'error') {
    return (
      <span
        title="Erro ao sincronizar — será tentado novamente"
        className="inline-flex items-center gap-1 text-xs font-medium text-red-600"
      >
        <CloudAlert className="w-3.5 h-3.5" />
      </span>
    )
  }

  return (
    <span
      title={status === 'syncing' ? 'Sincronizando...' : 'Pendente de sincronização'}
      className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"
    >
      {status === 'syncing' ? (
        <CloudUpload className="w-3.5 h-3.5 animate-pulse" />
      ) : (
        <Cloud className="w-3.5 h-3.5" />
      )}
    </span>
  )
}

