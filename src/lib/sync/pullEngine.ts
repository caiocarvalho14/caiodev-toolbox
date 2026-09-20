// src/lib/sync/pullEngine.ts
import { offlineDb } from '../offlineDb'
import { supabase } from '../supabase'

const SYNCABLE_TABLES = [
  'conf_marca_item',
  'conf_item',
  'conf_conferencia',
  'conf_local_contagem',
  'conf_registro',
  'conf_contagem',
] as const

export type SyncableTable = (typeof SYNCABLE_TABLES)[number]

async function pullTable(table: SyncableTable) {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw error

  // ids que têm mutação local ainda não enviada — não sobrescrever esses
  const pendingItems = await offlineDb.syncQueue.where('table').equals(table).toArray()
  const pendingIds = new Set(pendingItems.map((i) => i.recordId))

  const localRecords = await offlineDb.records.where('table').equals(table).toArray()
  const localIds = new Set(localRecords.map((r) => r.id))
  const serverIds = new Set((data ?? []).map((d: any) => d.id))

  const now = Date.now()

  await offlineDb.transaction('rw', offlineDb.records, offlineDb.syncMeta, async () => {
    // upsert do que veio do servidor, exceto o que tem pendência local
    for (const row of data ?? []) {
      if (pendingIds.has(row.id)) continue

      await offlineDb.records.put({
        table,
        id: row.id,
        data: row,
        updatedAt: now,
      })
    }

    // remove local o que não existe mais no servidor (e não é criação local pendente)
    for (const localId of localIds) {
      if (!serverIds.has(localId) && !pendingIds.has(localId)) {
        await offlineDb.records.delete([table, localId])
      }
    }

    await offlineDb.syncMeta.put({ table, lastPulledAt: now })
  })
}

export async function pullAll() {
  for (const table of SYNCABLE_TABLES) {
    await pullTable(table)
  }
}

export { pullTable }