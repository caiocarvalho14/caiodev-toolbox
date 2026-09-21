// src/lib/offlineDb.ts
import Dexie, { type Table } from 'dexie'
import type { Session } from '@supabase/supabase-js'
import type { Rota } from '../types/rota'

export type CachedSession = {
  id: 'current'
  session: Session | null
  updatedAt: number
}

export type CachedRotas = {
  userId: string
  rotas: Rota[]
  updatedAt: number
}

export type CachedCargos = {
  userId: string
  cargos: string[] // nomes dos cargos (ex: ['admin', 'conferente'])
  updatedAt: number
}

// Estado local "atual" de qualquer registro sincronizável (carnes, marcas, etc.)
// `table` é o nome da tabela no Supabase — permite usar um único store do Dexie
// pra qualquer entidade futura, sem precisar mexer no schema a cada módulo novo.
export interface LocalRecord<T = Record<string, unknown>> {
  table: string
  id: string // mesmo id usado no Supabase (uuid gerado no client)
  data: T
  updatedAt: number
  deletedAt?: number // soft-delete local: some da UI, mas fica até confirmar no servidor
}

export type SyncOperation = 'upsert' | 'delete'
export type SyncStatus = 'pending' | 'syncing' | 'error'

export interface SyncQueueItem {
  id: string // uuid da entrada na fila (não é o id do registro)
  table: string
  recordId: string
  operation: SyncOperation
  payload: Record<string, unknown> | null // null quando operation = 'delete'
  status: SyncStatus
  attempts: number
  lastError?: string
  createdAt: number
}

// Reservado pra quando formos sincronizar Supabase -> local (pull).
// Vai guardar, por tabela, quando foi a última vez que puxamos dados do servidor.
export interface SyncMeta {
  table: string
  lastPulledAt: number
}

class OfflineDB extends Dexie {
  authSession!: Table<CachedSession, string>
  rotasPermitidas!: Table<CachedRotas, string>
  records!: Table<LocalRecord, [string, string]>
  syncQueue!: Table<SyncQueueItem, string>
  syncMeta!: Table<SyncMeta, string>
  cargosUsuario!: Table<CachedCargos, string>

  constructor() {
    super('toolbox-offline')

    this.version(1).stores({
      authSession: 'id',
      rotasPermitidas: 'userId',
    })

    this.version(2).stores({
      records: '[table+id], table',
      syncQueue: 'id, table, status, createdAt',
      syncMeta: 'table',
    })

    // v3: cache de cargos do usuário
    this.version(3).stores({
      cargosUsuario: 'userId',
    })
  }
}

export const offlineDb = new OfflineDB()