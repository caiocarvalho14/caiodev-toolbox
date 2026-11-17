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

    // v4: itens/marcas/locais/filiais viraram o módulo Cadastros (tabelas cad_*).
    // Leva o cache local e a fila de envio para os nomes novos, sem perder nada pendente.
    this.version(4)
      .stores({})
      .upgrade(async (tx) => {
        const records = tx.table<LocalRecord, [string, string]>('records')
        for (const [antiga, nova] of Object.entries(TABELAS_RENOMEADAS)) {
          const lista = await records.where('table').equals(antiga).toArray()
          if (lista.length === 0) continue
          // `table` faz parte da chave primária: grava com o nome novo e apaga o antigo
          await records.bulkPut(lista.map((r) => ({ ...r, table: nova })))
          await records.bulkDelete(lista.map((r) => [antiga, r.id] as [string, string]))
        }
        await tx
          .table<SyncQueueItem, string>('syncQueue')
          .toCollection()
          .modify((item) => {
            const nova = TABELAS_RENOMEADAS[item.table]
            if (nova) item.table = nova
          })
        // força um pull completo das tabelas renomeadas
        await tx.table<SyncMeta, string>('syncMeta').bulkDelete(Object.keys(TABELAS_RENOMEADAS))
      })
  }
}

export const TABELAS_RENOMEADAS: Record<string, string> = {
  conf_item: 'cad_item',
  conf_marca_item: 'cad_marca',
  conf_local_contagem: 'cad_local',
  conf_filial: 'cad_filial',
}

export const offlineDb = new OfflineDB()