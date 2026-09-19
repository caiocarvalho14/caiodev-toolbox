// src/hooks/useSyncStatusMap.ts
import { useLiveQuery } from 'dexie-react-hooks'
import { offlineDb } from '../lib/offlineDb'
import type { RecordSyncStatus } from './useSyncStatus'

/** Retorna um Map<recordId, status> com todos os itens pendentes/em erro daquela tabela. */
export function useSyncStatusMap(table: string): Map<string, RecordSyncStatus> {
  const map = useLiveQuery(async () => {
    const items = await offlineDb.syncQueue.where('table').equals(table).toArray()
    const result = new Map<string, RecordSyncStatus>()
    for (const item of items) {
      result.set(item.recordId, item.status)
    }
    return result
  }, [table])

  return map ?? new Map()
}