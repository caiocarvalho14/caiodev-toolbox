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
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    if (table && navigator.onLine) {
      try {
        await pullTable(table)
      } catch {
        // pull falhou (ex: sem internet real apesar do navigator.onLine) — segue com o que já tem local
      }
    }
    const list = await repo.list()
    setData(list)
    setLoading(false)
  }, [repo, table])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, loading, reload }
}