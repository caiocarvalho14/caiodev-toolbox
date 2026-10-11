// src/lib/sync/pullEngine.ts
import { offlineDb , type LocalRecord } from '../offlineDb'
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

export async function pullTable(table: SyncableTable) {
  // 1) rede primeiro, fora de qualquer transação do Dexie
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw error
  const linhasServidor = (data ?? []) as Array<{ id: string; created_at?: string }>

  // 2) leitura do estado local + escrita na mesma transação: se o usuário salvar algo
  //    enquanto o fetch estava em andamento, a fila já aparece aqui e o registro não é sobrescrito
  await offlineDb.transaction(
    'rw',
    offlineDb.records,
    offlineDb.syncQueue,
    offlineDb.syncMeta,
    async () => {
      const pendentes = new Set(
        (await offlineDb.syncQueue.where('table').equals(table).toArray()).map((i) => i.recordId)
      )
      const locais = new Map(
        (await offlineDb.records.where('table').equals(table).toArray()).map((r) => [r.id, r] as const)
      )

      const agora = Date.now()
      const idsServidor = new Set<string>()
      const paraGravar: LocalRecord[] = []

      for (const row of linhasServidor) {
        idsServidor.add(row.id)
        if (pendentes.has(row.id)) continue // mutação local ainda não enviada vence

        const local = locais.get(row.id)
        if (local && JSON.stringify(local.data) === JSON.stringify(row)) continue // nada mudou

        // registro novo neste aparelho: usa a data de criação (ordem estável);
        // registro alterado no servidor: sobe pro topo
        const criadoEm = row.created_at ? Date.parse(row.created_at) : NaN
        paraGravar.push({
          table,
          id: row.id,
          data: row,
          updatedAt: local || Number.isNaN(criadoEm) ? agora : criadoEm,
        })
      }

      const paraRemover: [string, string][] = []
      for (const id of locais.keys()) {
        if (!idsServidor.has(id) && !pendentes.has(id)) paraRemover.push([table, id])
      }

      // só escreve quando houve mudança de verdade: sem isso, toda lista re-renderiza a cada pull
      if (paraGravar.length) await offlineDb.records.bulkPut(paraGravar)
      if (paraRemover.length) await offlineDb.records.bulkDelete(paraRemover)
      await offlineDb.syncMeta.put({ table, lastPulledAt: agora })
    }
  )
}