// src/modules/conferencia/types/registro.ts
export interface RegistroConferencia {
  id: string
  item: string
  qtd_sistema: number
  observacoes: string | null
  data: string
  conferencia: string
}