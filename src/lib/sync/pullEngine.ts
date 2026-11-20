// src/lib/sync/pullEngine.ts
import { offlineDb, type LocalRecord } from '../offlineDb'
import { supabase } from '../supabase'

const SYNCABLE_TABLES = [
  'cad_marca',
  'cad_item',
  'cad_filial',
  'conf_modelo',
  'conf_modelo_item',
  'conf_conferencia',
  'cad_local',
  'conf_registro',
  'conf_contagem',
  'sistema_usuario',
] as const

export type SyncableTable = (typeof SYNCABLE_TABLES)[number]

type LinhaServidor = { id: string; created_at?: string }

// A API do Supabase corta cada resposta em "Max rows" linhas (padrão 1000) sem avisar.
// Por isso a tabela é baixada em blocos, sempre continuando a partir do último id recebido.
const PAGINA = 1000
const TENTATIVAS = 3

async function comTentativas<T>(fn: () => Promise<T>): Promise<T> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await fn()
    } catch (err) {
      if (tentativa >= TENTATIVAS) throw err
      // sinal ruim costuma voltar em instantes: espera 0,5s, depois 1s
      await new Promise((r) => setTimeout(r, 500 * 2 ** (tentativa - 1)))
    }
  }
}

/**
 * Baixa a tabela inteira em blocos de PAGINA linhas.
 * - Paginação por "id > último id" (não por posição): inserir ou apagar algo no servidor durante o
 *   download não faz pular nenhum registro que já existia.
 * - Para no bloco vazio (funciona mesmo se o "Max rows" do projeto for menor que PAGINA)
 *   ou quando já recebeu o total informado pela contagem (evita um pedido a mais).
 * - `completa` = recebeu pelo menos o total que o servidor disse ter. Se não, quem chama
 *   não deve apagar nada local com base nesta leitura.
 */
async function baixarTabela(table: SyncableTable) {
  const total = await comTentativas(async () => {
    const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true })
    if (error) throw error
    return count
  })

  const linhas: LinhaServidor[] = []
  let ultimoId: string | null = null

  while (true) {
    const depoisDe: string | null = ultimoId
    const bloco = await comTentativas(async () => {
      let consulta = supabase.from(table).select('*').order('id', { ascending: true }).limit(PAGINA)
      if (depoisDe) consulta = consulta.gt('id', depoisDe)
      const { data, error } = await consulta
      if (error) throw error
      return (data ?? []) as LinhaServidor[]
    })

    if (bloco.length === 0) break
    linhas.push(...bloco)
    ultimoId = bloco[bloco.length - 1].id
    if (total != null && linhas.length >= total) break
  }

  return { linhas, completa: total != null && linhas.length >= total }
}

export async function pullTable(table: SyncableTable) {
  // registros mexidos no aparelho depois deste instante (salvos, editados ou enviados durante o
  // download) não são tocados: a leitura do servidor pode ser anterior a essa mudança
  const inicio = Date.now()

  // 1) rede primeiro, fora de qualquer transação do Dexie
  const { linhas: linhasServidor, completa } = await baixarTabela(table)

  // 2) leitura do estado local + escrita na mesma transação: se o usuário salvar algo
  //    enquanto o fetch estava em andamento, a fila já aparece aqui e o registro não é sobrescrito
  await offlineDb.transaction('rw', offlineDb.records, offlineDb.syncQueue, offlineDb.syncMeta, async () => {
    const pendentes = new Set(
      (await offlineDb.syncQueue.where('table').equals(table).toArray()).map((i) => i.recordId)
    )
    const locais = new Map(
      (await offlineDb.records.where('table').equals(table).toArray()).map((r) => [r.id, r] as const)
    )
    const mexidoDuranteDownload = (r: LocalRecord | undefined) => !!r && r.updatedAt > inicio

    const agora = Date.now()
    const idsServidor = new Set<string>()
    const paraGravar: LocalRecord[] = []

    for (const row of linhasServidor) {
      idsServidor.add(row.id)
      if (pendentes.has(row.id)) continue // mutação local ainda não enviada vence

      const local = locais.get(row.id)
      if (mexidoDuranteDownload(local)) continue // versão local é mais nova que a baixada

      // nada mudou — exceto se o registro está escondido por uma exclusão local que não está mais na fila
      // (ex.: fila de envio apagada nas configurações): aí a versão do servidor volta a aparecer
      if (local && !local.deletedAt && JSON.stringify(local.data) === JSON.stringify(row)) continue

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

    // só remove o que sumiu do servidor se a leitura veio completa: com leitura parcial,
    // "não veio" não significa "foi apagado"
    const paraRemover: [string, string][] = []
    if (completa) {
      for (const [id, local] of locais) {
        if (!idsServidor.has(id) && !pendentes.has(id) && !mexidoDuranteDownload(local)) {
          paraRemover.push([table, id])
        }
      }
    } else {
      console.warn(`[pull] "${table}": leitura incompleta (${linhasServidor.length} linhas); nada local foi removido`)
    }

    // só escreve quando houve mudança de verdade: sem isso, toda lista re-renderiza a cada pull
    if (paraGravar.length) await offlineDb.records.bulkPut(paraGravar)
    if (paraRemover.length) await offlineDb.records.bulkDelete(paraRemover)
    await offlineDb.syncMeta.put({ table, lastPulledAt: agora })
  })
}

/** Busca todas as tabelas sincronizáveis (usado pelo botão Sincronizar, depois do envio). */
export async function pullAll() {
  // uma tabela com problema não impede as outras de atualizar; o erro sobe no fim
  const falhas: string[] = []
  for (const table of SYNCABLE_TABLES) {
    try {
      await pullTable(table)
    } catch (err) {
      console.error(`[pull] falhou para "${table}":`, err)
      falhas.push(table)
    }
  }
  if (falhas.length) throw new Error(`Falha ao buscar: ${falhas.join(', ')}`)
}
