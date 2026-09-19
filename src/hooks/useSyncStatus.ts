// src/hooks/useSyncStatus.ts
import { useLiveQuery } from 'dexie-react-hooks'
import { offlineDb } from '../lib/offlineDb'

export type RecordSyncStatus = 'synced' | 'pending' | 'syncing' | 'error'

export function useSyncStatus(table: string, id: string | undefined): RecordSyncStatus {
  const status = useLiveQuery(async () => {
    if (!id) return 'synced'
    const items = await offlineDb.syncQueue.where('table').equals(table).toArray()
    const item = items.find((i) => i.recordId === id)
    return item?.status ?? 'synced'
  }, [table, id])

  return status ?? 'synced'
}