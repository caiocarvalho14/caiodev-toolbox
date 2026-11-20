// src/lib/sync/syncEngine.ts
import { offlineDb, type SyncQueueItem } from '../offlineDb'
import { supabase } from '../supabase'
import { pullAll } from './pullEngine'
import { ehFalhaDeConexao, marcarOffline, marcarOnline, dispensarAvisoVoltou } from '../conexao'

// O botão Sincronizar é um pedido explícito do usuário: cada pedido ao servidor pode levar
// até 10s (as buscas automáticas ao abrir telas desistem em 2s e usam os dados locais).
const TOLERANCIA_SINCRONIZAR_MS = 10_000

/** Erro lançado quando a sincronização para por falta de conexão. */
export class SemConexaoError extends Error {
  constructor() {
    super('Sem conexão com o servidor')
    this.name = 'SemConexaoError'
  }
}

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
  } catch (err) {
    // envio em segundo plano: sem conexão, a fila fica para depois
    if (!(err instanceof SemConexaoError)) throw err
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
    const resultado = await processItem(item)
    // caiu a conexão: para aqui (os próximos falhariam um a um) e mantém o resto na fila
    if (resultado === 'sem-conexao') throw new SemConexaoError()
  }
}

async function processItem(item: SyncQueueItem): Promise<'ok' | 'erro' | 'sem-conexao'> {
  const prazo = () => AbortSignal.timeout(TOLERANCIA_SINCRONIZAR_MS)
  await offlineDb.syncQueue.update(item.id, { status: 'syncing' })

  try {
    if (item.operation === 'delete') {
      const { error } = await supabase.from(item.table).delete().eq('id', item.recordId).abortSignal(prazo())
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
        .abortSignal(prazo())
        .single()

      if (error) throw error

      await offlineDb.records.update([item.table, item.recordId], {
        data,
        updatedAt: Date.now(),
      })
    }

    await offlineDb.syncQueue.delete(item.id)
    marcarOnline()
    return 'ok'
  } catch (err) {
    if (ehFalhaDeConexao(err)) {
      // não é erro do registro: volta para a fila sem contar tentativa
      await offlineDb.syncQueue.update(item.id, { status: 'pending' })
      marcarOffline()
      return 'sem-conexao'
    }
    const message = extractErrorMessage(err)
    await offlineDb.syncQueue.update(item.id, {
      status: 'error',
      attempts: item.attempts + 1,
      lastError: message,
    })
    return 'erro'
  }
}

/** Útil pra UI mostrar "sincronizando..." num registro específico. */
export async function isPendingSync(table: string, id: string): Promise<boolean> {
  const items = await offlineDb.syncQueue.where('table').equals(table).toArray()
  return items.some((i) => i.recordId === id)
}

/** Fluxo completo: envia pendências locais, depois busca atualizações do servidor. */
export async function fullSync() {
  try {
    await processQueueExclusivo() // push
    await pullAll(TOLERANCIA_SINCRONIZAR_MS) // pull
    dispensarAvisoVoltou() // sincronizou: o aviso de "internet voltou" já cumpriu o papel
  } catch (err) {
    if (ehFalhaDeConexao(err) || err instanceof SemConexaoError) throw new SemConexaoError()
    throw err
  }
}

/** Envia a fila respeitando o controle de execução única do requestSync, mas propagando a falta de conexão. */
async function processQueueExclusivo() {
  if (syncing) {
    // já tem um envio rodando: espera ele terminar e roda de novo para pegar o que entrou depois
    while (syncing) await new Promise((r) => setTimeout(r, 100))
  }
  syncing = true
  try {
    await processQueue()
  } finally {
    syncing = false
  }
}