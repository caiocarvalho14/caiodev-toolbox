// src/lib/sync/offlineRepository.ts
import { offlineDb } from '../offlineDb'
import { requestSync } from './syncEngine'

/**
 * Repositório genérico pra qualquer entidade sincronizável (carnes, marcas, etc).
 * Toda escrita passa por: grava local -> enfileira -> tenta sincronizar (se online).
 * A UI nunca espera o Supabase responder pra considerar a ação concluída.
 */
export function createOfflineRepository<T extends { id: string }>(table: string) {
  async function list(): Promise<T[]> {
    const records = await offlineDb.records.where('table').equals(table).toArray()
    return records
      .filter((r) => !r.deletedAt)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((r) => r.data as T)
  }

  async function get(id: string): Promise<T | undefined> {
    const record = await offlineDb.records.get([table, id])
    return record && !record.deletedAt ? (record.data as T) : undefined
  }

  async function save(data: Omit<T, 'id'> & { id?: string }): Promise<T> {
    const id = data.id ?? crypto.randomUUID()
    const fullData = { ...data, id } as T
    const now = Date.now()

    await offlineDb.records.put({ table, id, data: fullData, updatedAt: now })
    await offlineDb.syncQueue.add({
      id: crypto.randomUUID(),
      table,
      recordId: id,
      operation: 'upsert',
      payload: fullData as Record<string, unknown>,
      status: 'pending',
      attempts: 0,
      createdAt: now,
    })

    void requestSync()
    return fullData
  }

  async function remove(id: string): Promise<void> {
    const now = Date.now()

    await offlineDb.records.update([table, id], { deletedAt: now })
    await offlineDb.syncQueue.add({
      id: crypto.randomUUID(),
      table,
      recordId: id,
      operation: 'delete',
      payload: null,
      status: 'pending',
      attempts: 0,
      createdAt: now,
    })

    void requestSync()
  }

  return { list, get, save, remove }
}