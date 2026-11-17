// src/pages/modules/cadastros/types/item.ts
export interface Item {
  id: string
  nome: string
  marca: string | null // FK -> cad_marca.id (opcional)
  codigo: string | null
  tipo_contagem: 'UND' | 'KG'
}
