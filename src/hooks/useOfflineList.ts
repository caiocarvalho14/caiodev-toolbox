// src/hooks/useOfflineList.ts
import { useCallback, useEffect, useState } from 'react'

interface Repository<T> {
  list: () => Promise<T[]>
}

export function useOfflineList<T extends { id: string }>(repo: Repository<T>) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const list = await repo.list()
    setData(list)
    setLoading(false)
  }, [repo])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, loading, reload }
}