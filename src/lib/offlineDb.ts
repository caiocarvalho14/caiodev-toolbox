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

// Banco local (IndexedDB) usado como fallback quando o app está offline.
// Guarda a última sessão conhecida e a última lista de rotas permitidas
// por usuário, pra funcionar mesmo sem conexão (PWA).
class OfflineDB extends Dexie {
  authSession!: Table<CachedSession, string>
  rotasPermitidas!: Table<CachedRotas, string>

  constructor() {
    super('toolbox-offline')
    this.version(1).stores({
      authSession: 'id',
      rotasPermitidas: 'userId',
    })
  }
}

export const offlineDb = new OfflineDB()