// src/lib/sync/syncEngine.ts
import { offlineDb, type SyncQueueItem } from '../offlineDb'
import { supabase } from '../supabase'

let syncing = false
let pendingRerun = false

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message

  // PostgrestError do Supabase: objeto plano com message/details/hint/code
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const e = err as { message?: string; details?: string; hint?: string; code?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' — ') || 'Erro sem mensagem'
  }

  return 'Erro desconhecido ao sincronizar'
}

/**
 * Dispara o processamento da fila de sincronização.
 * Seguro pra chamar várias vezes seguidas (ex: salvar 3 registros em sequência) —
 * se já estiver sincronizando, marca que precisa rodar de novo assim que terminar,
 * em vez de rodar N vezes em paralelo.
 */
export async function requestSync() {
  if (syncing) {
    pendingRerun = true
    return
  }

  syncing = true
  try {
    await processQueue()
  } finally {
    syncing = false
    if (pendingRerun) {
      pendingRerun = false
      void requestSync()
    }
  }
}

async function processQueue() {
  const items = await offlineDb.syncQueue
    .where('status')
    .anyOf(['pending', 'error'])
    .sortBy('createdAt')

  for (const item of items) {
    await processItem(item)
  }
}

async function processItem(item: SyncQueueItem) {
  await offlineDb.syncQueue.update(item.id, { status: 'syncing' })

  try {
    if (item.operation === 'delete') {
      const { error } = await supabase.from(item.table).delete().eq('id', item.recordId)
      if (error) throw error

      await offlineDb.records.delete([item.table, item.recordId])
    } else {
      if (!item.payload) {
        throw new Error('Payload ausente para operação de upsert')
      }

      // upsert + select: pega de volta a versão canônica do servidor
      // (campos default, triggers, created_at etc.) e já deixa o registro
      // local consistente com o que está no banco.
      const { data, error } = await supabase
        .from(item.table)
        .upsert(item.payload)
        .select()
        .single()

      if (error) throw error

      await offlineDb.records.update([item.table, item.recordId], {
        data,
        updatedAt: Date.now(),
      })
    }

    await offlineDb.syncQueue.delete(item.id)
  } catch (err) {
    const message = extractErrorMessage(err)
    await offlineDb.syncQueue.update(item.id, {
      status: 'error',
      attempts: item.attempts + 1,
      lastError: message,
    })
  }
}

/** Útil pra UI mostrar "sincronizando..." num registro específico. */
export async function isPendingSync(table: string, id: string): Promise<boolean> {
  const items = await offlineDb.syncQueue.where('table').equals(table).toArray()
  return items.some((i) => i.recordId === id)
}