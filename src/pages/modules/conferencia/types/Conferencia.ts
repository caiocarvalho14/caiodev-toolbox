// src/modules/conferencia/types/conferencia.ts
export interface Conferencia {
  id: string
  nome: string
  data: string
  created_at : string
  observacao: string | null
  criador_id?: string | null
  filial?: string | null
}
