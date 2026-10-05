// src/hooks/useOfflineList.ts — versão com pull automático no mount
import { useCallback, useEffect, useState } from 'react'
import { pullTable, type SyncableTable } from '../lib/sync/pullEngine'

interface Repository<T> {
  list: () => Promise<T[]>
}

export function useOfflineList<T extends { id: string }>(
  repo: Repository<T>,
  table?: SyncableTable // opcional: se passado, faz pull antes de listar
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)   // só true na carga inicial
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  const reload = useCallback(async () => {

    if (!hasLoadedOnce) setLoading(true)
    if (table && navigator.onLine) {
      try {
        await pullTable(table)
      } catch {
        // pull falhou (ex: sem internet real apesar do navigator.onLine) — segue com o que já tem local
      }
    }
    console.log(`loading: ${loading}; hasLoadedOnce: ${hasLoadedOnce}`)
    const list = await repo.list()
    setData(list)
    setLoading(false)
    setHasLoadedOnce(true)
  }, [repo, table, hasLoadedOnce])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, loading, reload }
}