// src/hooks/useOfflineList.ts
import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { pullTable, type SyncableTable } from '../lib/sync/pullEngine'

interface Repository<T> {
  list: () => Promise<T[]>
}

// Vários componentes usam as mesmas tabelas: compartilha o pull em andamento e
// não repete o pull de uma tabela que acabou de ser atualizada.
const PULL_TTL_MS = 30_000
const pullsEmAndamento = new Map<string, Promise<void>>()
const ultimoPull = new Map<string, number>()

function pullEmBackground(table: SyncableTable, forcar = false): Promise<void> {
  if (!navigator.onLine) return Promise.resolve()

  const emAndamento = pullsEmAndamento.get(table)
  if (emAndamento) return emAndamento

  if (!forcar && Date.now() - (ultimoPull.get(table) ?? 0) < PULL_TTL_MS) {
    return Promise.resolve()
  }

  const promise = pullTable(table)
    .then(() => {
      ultimoPull.set(table, Date.now())
    })
    .catch((err) => {
      // sem internet de verdade, RLS etc.: segue com o que já existe local
      console.error(`[pull] falhou para "${table}":`, err)
    })
    .finally(() => {
      pullsEmAndamento.delete(table)
    })

  pullsEmAndamento.set(table, promise)
  return promise
}

const VAZIO: never[] = [] // identidade estável, para não quebrar useMemo nos componentes

export function useOfflineList<T extends { id: string }>(
  repo: Repository<T>,
  table?: SyncableTable // opcional: se passado, busca novidades do Supabase em background
) {
  // Leitura local reativa: responde na hora e se atualiza sozinha quando o Dexie muda
  // (save/remove em qualquer componente, pull em background, botão de sincronizar).
  const dadosLocais = useLiveQuery(() => repo.list(), [repo])
  const [atualizando, setAtualizando] = useState(Boolean(table))

  useEffect(() => {
    if (!table) {
      setAtualizando(false)
      return
    }
    let ativo = true
    setAtualizando(true)
    void pullEmBackground(table).finally(() => {
      if (ativo) setAtualizando(false)
    })
    return () => {
      ativo = false
    }
  }, [table])

  const data = (dadosLocais ?? VAZIO) as T[]

  // "Carregando" só enquanto o IndexedDB responde, ou quando não há nada local
  // e o primeiro pull ainda está em andamento (ex.: primeiro uso num aparelho novo).
  const loading = dadosLocais === undefined || (dadosLocais.length === 0 && atualizando)

  // Mantido por compatibilidade: a lista já é reativa, então não há o que recarregar
  // depois de um save. Assim, `await reload()` não bloqueia mais na rede.
  const reload = useCallback(async () => {}, [])

  // Pull forçado (ignora o intervalo de 30s), se algum dia precisar de "puxar para atualizar".
  const refresh = useCallback(
    () => (table ? pullEmBackground(table, true) : Promise.resolve()),
    [table]
  )

  return { data, loading, atualizando, reload, refresh }
}