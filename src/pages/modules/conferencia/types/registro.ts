// src/modules/conferencia/types/registro.ts
export interface RegistroConferencia {
  id: string
  /** item do cadastro (cad_item). Null em conferência rápida, onde o item é digitado na hora. */
  item: string | null
  qtd_sistema: number
  observacoes: string | null
  data: string
  conferencia: string
  // item digitado na hora (conferência rápida): não cria nada no cadastro de itens
  item_nome?: string | null
  item_codigo?: string | null
  item_marca?: string | null // FK -> cad_marca.id (opcional)
  item_tipo_contagem?: 'KG' | 'UND' | null
}
