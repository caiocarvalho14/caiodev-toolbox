// src/pages/modules/cadastros/lib/referencias.ts
// Quem usa cada cadastro base. Serve para bloquear a exclusão de algo em uso
// (o banco também bloqueia com ON DELETE RESTRICT; aqui o aviso vem antes, ainda offline).
// Consulta o cache local pelo nome da tabela, sem depender do código dos outros módulos:
// um módulo novo que use a base só precisa se registrar aqui.
import { offlineDb } from '../../../../lib/offlineDb'

type TabelaBase = 'cad_item' | 'cad_marca' | 'cad_local' | 'cad_filial'

interface Referencia {
  tabela: string
  coluna: string
  rotulo: [string, string] // singular, plural
}

const USOS: Record<TabelaBase, Referencia[]> = {
  cad_item: [{ tabela: 'conf_registro', coluna: 'item', rotulo: ['registro de conferência', 'registros de conferência'] }],
  cad_marca: [
    { tabela: 'cad_item', coluna: 'marca', rotulo: ['item', 'itens'] },
    { tabela: 'conf_registro', coluna: 'item_marca', rotulo: ['item de conferência rápida', 'itens de conferência rápida'] },
  ],
  cad_local: [{ tabela: 'conf_contagem', coluna: 'local', rotulo: ['contagem', 'contagens'] }],
  cad_filial: [{ tabela: 'conf_conferencia', coluna: 'filial', rotulo: ['conferência', 'conferências'] }],
}

/** Contagem por tipo de uso, ex.: { 'conferências': 12 }. Vazio = pode excluir. */
export async function usosDe(tabela: TabelaBase, id: string): Promise<Record<string, number>> {
  const resultado: Record<string, number> = {}
  for (const ref of USOS[tabela]) {
    const n = await offlineDb.records
      .where('table')
      .equals(ref.tabela)
      .filter((r) => !r.deletedAt && (r.data as Record<string, unknown>)[ref.coluna] === id)
      .count()
    if (n > 0) resultado[n === 1 ? ref.rotulo[0] : ref.rotulo[1]] = n
  }
  return resultado
}

/** Texto pronto para o aviso, ou null se não estiver em uso. */
export async function motivoParaNaoExcluir(tabela: TabelaBase, id: string): Promise<string | null> {
  const usos = Object.entries(await usosDe(tabela, id))
  if (usos.length === 0) return null
  return `Em uso por ${usos.map(([rotulo, n]) => `${n} ${rotulo}`).join(' e ')}.`
}
