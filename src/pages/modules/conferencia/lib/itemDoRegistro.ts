// src/modules/conferencia/lib/itemDoRegistro.ts
// Um registro aponta para um item do cadastro (conferência normal) OU traz o item digitado na hora
// (conferência rápida). Toda tela que mostra nome/código/marca/unidade passa por aqui.
import type { RegistroConferencia } from '../types/registro'
import type { Item } from '../../cadastros/types/item'
import type { MarcaItem } from '../../cadastros/types/marca'

export interface ItemResolvido {
  /** chave estável para agrupar: id do cadastro, ou "avulso:<código|nome>" */
  chave: string
  nome: string
  codigo: string | null
  marcaId: string | null
  marcaNome: string
  tara: number | null
  unidade: 'KG' | 'UND'
  avulso: boolean
}

type Mapa<T> = Map<string, T> | T[]
const buscar = <T extends { id: string }>(m: Mapa<T>, id: string | null | undefined) =>
  !id ? undefined : m instanceof Map ? m.get(id) : m.find((x) => x.id === id)

export function itemDoRegistro(r: RegistroConferencia, itens: Mapa<Item>, marcas: Mapa<MarcaItem>): ItemResolvido {
  if (r.item) {
    const item = buscar(itens, r.item)
    const marca = buscar(marcas, item?.marca)
    return {
      chave: r.item,
      nome: item?.nome ?? 'Item removido',
      codigo: item?.codigo ?? null,
      marcaId: item?.marca ?? null,
      marcaNome: marca?.nome ?? '',
      tara: marca?.tara_emb ?? null,
      unidade: item?.tipo_contagem ?? 'KG',
      avulso: false,
    }
  }
  const marca = buscar(marcas, r.item_marca)
  const nome = r.item_nome?.trim() || 'Item sem nome'
  const codigo = r.item_codigo?.trim() || null
  return {
    chave: `avulso:${(codigo ?? nome).toLowerCase()}`,
    nome,
    codigo,
    marcaId: r.item_marca ?? null,
    marcaNome: marca?.nome ?? '',
    tara: marca?.tara_emb ?? null,
    unidade: r.item_tipo_contagem ?? 'KG',
    avulso: true,
  }
}
