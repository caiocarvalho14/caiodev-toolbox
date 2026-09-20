// src/hooks/usePendingSyncCount.ts
import { useLiveQuery } from 'dexie-react-hooks'
import { offlineDb } from '../lib/offlineDb'

export function usePendingSyncCount(): number {
  const count = useLiveQuery(async () => {
    return offlineDb.syncQueue.where('status').anyOf(['pending', 'error']).count()
  }, [])

  return count ?? 0
}