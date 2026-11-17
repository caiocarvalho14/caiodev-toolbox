// src/modules/conferencia/lib/relatorio.ts
import type { Conferencia } from '../../../modules/conferencia/types/Conferencia'
import type { RegistroConferencia } from '../../../modules/conferencia/types/registro'
import type { Contagem } from '../../../modules/conferencia/types/contagem'
import type { Item } from '../../cadastros/types/item'
import type { MarcaItem } from '../../cadastros/types/marca'
import type { LocalContagem } from '../../cadastros/types/local'
import type { Usuario } from '../types/usuario'
import type { Filial } from '../../cadastros/types/filial'
import { nomeDoUsuario } from '../repositories/usuariosRepository'
import { itemDoRegistro } from './itemDoRegistro'
import { temposPorConferencia, type TempoConferencia } from './tempoConferencia'

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
  observacoes: string | null // <- novo
}

export interface RelatorioConferencia {
  conferencia: Conferencia
  criadorNome: string | null
  tempo: TempoConferencia | null // primeira → última contagem
  filialNome: string | null
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
  locais: LocalContagem[],
  usuarios: Usuario[] = [],
  filiais: Filial[] = []
): RelatorioConferencia {
  const registros = todosRegistros.filter((r) => r.conferencia === conferencia.id)
  const localIdsUsados = new Set<string>()

  const linhas: RelatorioLinha[] = registros
    .map((r) => {
      const item = itemDoRegistro(r, itens, marcas) // cadastro ou digitado (conferência rápida)
      const contagensDoRegistro = todasContagens.filter((c) => c.registro === r.id)

      const porLocal: Record<string, number> = {}

      for (const c of contagensDoRegistro) {
        localIdsUsados.add(c.local)
        porLocal[c.local] = (porLocal[c.local] ?? 0) + c.contagem
      }

      const fisico = contagensDoRegistro.reduce((sum, c) => sum + c.contagem, 0)

      return {
        registroId: r.id,
        codigo: item.codigo,
        nome: item.nome,
        marcaNome: item.marcaNome,
        tipoContagem: item.unidade,
        sistema: r.qtd_sistema,
        fisico,
        divergencia: fisico - r.qtd_sistema,
        porLocal,
        observacoes: r.observacoes?.trim() || null, // <- novo
      }
    })
    .sort((a, b) => a.marcaNome.localeCompare(b.marcaNome, 'pt-BR'))

  const locaisUsados = locais.filter((l) => localIdsUsados.has(l.id))
  const totalFisico = linhas.reduce((s, l) => s + l.fisico, 0)
  const totalSistema = linhas.reduce((s, l) => s + l.sistema, 0)

  return {
    conferencia,
    criadorNome: nomeDoUsuario(usuarios, conferencia.criador_id),
    tempo: temposPorConferencia(registros, todasContagens).get(conferencia.id) ?? null,
    filialNome: filiais.find((f) => f.id === conferencia.filial)?.nome ?? null,
    locaisUsados,
    linhas,
    totalFisico,
    totalSistema,
    totalDivergencia: totalFisico - totalSistema,
  }
}