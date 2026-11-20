// src/hooks/useUltimaAtualizacao.ts
import { useLiveQuery } from 'dexie-react-hooks'
import { offlineDb } from '../lib/offlineDb'
import type { SyncableTable } from '../lib/sync/pullEngine'

/**
 * Quando os dados destas tabelas foram buscados do servidor pela última vez.
 * Usa a busca MAIS ANTIGA entre elas: tudo o que a tela mostra é pelo menos tão recente quanto isso.
 * Atualiza sozinho a cada busca (abrir telas, botão Sincronizar).
 * - undefined: ainda lendo o armazenamento local
 * - null: alguma das tabelas nunca foi buscada neste aparelho
 */
export function useUltimaAtualizacao(tabelas: readonly SyncableTable[]): number | null | undefined {
  const chave = tabelas.join(',')
  return useLiveQuery(async () => {
    const metas = await offlineDb.syncMeta.bulkGet([...tabelas])
    if (metas.some((m) => !m)) return null
    return Math.min(...metas.map((m) => m!.lastPulledAt))
  }, [chave])
}

/** "20/11/2026 às 22:04" */
export function formatarAtualizacao(ms: number) {
  const d = new Date(ms)
  const data = d.toLocaleDateString('pt-BR')
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${data} às ${hora}`
}
