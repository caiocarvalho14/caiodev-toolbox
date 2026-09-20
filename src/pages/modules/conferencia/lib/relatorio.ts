// src/modules/conferencia/lib/relatorio.ts
import type { Conferencia } from '../../../modules/conferencia/types/Conferencia'
import type { RegistroConferencia } from '../../../modules/conferencia/types/registro'
import type { Contagem } from '../../../modules/conferencia/types/contagem'
import type { Item } from '../../../modules/conferencia/types/item'
import type { MarcaItem } from '../../../modules/conferencia/types/Marcas'
import type { LocalContagem } from '../../../modules/conferencia/types/localContagem'

export interface RelatorioLinha {
  registroId: string
  codigo: string | null
  nome: string
  marcaNome: string
  tipoContagem: 'KG' | 'UND'
  sistema: number
  fisico: number
  divergencia: number
  porLocal: Record<string, number> // localId -> soma das contagens naquele local
}

export interface RelatorioConferencia {
  conferencia: Conferencia
  locaisUsados: LocalContagem[]
  linhas: RelatorioLinha[]
  totalFisico: number
  totalSistema: number
  totalDivergencia: number
}

export function montarRelatorio(
  conferencia: Conferencia,
  todosRegistros: RegistroConferencia[],
  todasContagens: Contagem[],
  itens: Item[],
  marcas: MarcaItem[],
  locais: LocalContagem[]
): RelatorioConferencia {
  const registros = todosRegistros.filter((r) => r.conferencia === conferencia.id)
  const localIdsUsados = new Set<string>()

  const linhas: RelatorioLinha[] = registros.map((r) => {
    const item = itens.find((i) => i.id === r.item)
    const marca = item?.marca ? marcas.find((m) => m.id === item.marca) : null
    const contagensDoRegistro = todasContagens.filter((c) => c.registro === r.id)

    const porLocal: Record<string, number> = {}
    for (const c of contagensDoRegistro) {
      localIdsUsados.add(c.local)
      porLocal[c.local] = (porLocal[c.local] ?? 0) + c.contagem
    }

    const fisico = contagensDoRegistro.reduce((sum, c) => sum + c.contagem, 0)

    return {
      registroId: r.id,
      codigo: item?.codigo ?? null,
      nome: item?.nome ?? 'Item removido',
      marcaNome: marca?.nome ?? '',
      tipoContagem: item?.tipo_contagem ?? 'KG',
      sistema: r.qtd_sistema,
      fisico,
      divergencia: fisico - r.qtd_sistema,
      porLocal,
    }
  })

  const locaisUsados = locais.filter((l) => localIdsUsados.has(l.id))
  const totalFisico = linhas.reduce((s, l) => s + l.fisico, 0)
  const totalSistema = linhas.reduce((s, l) => s + l.sistema, 0)

  return {
    conferencia,
    locaisUsados,
    linhas,
    totalFisico,
    totalSistema,
    totalDivergencia: totalFisico - totalSistema,
  }
}