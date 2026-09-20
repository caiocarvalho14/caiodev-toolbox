// src/modules/conferencia/types/item.ts


export interface Item {
  id: string
  nome: string
  marca: string | null // FK -> conf_marca_item.id (opcional)
  codigo: string | null
  tipo_contagem: 'UND' | 'KG'
}