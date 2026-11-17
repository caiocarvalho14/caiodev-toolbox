// src/modules/conferencia/types/contagem.ts
export interface Contagem {
  id: string
  registro: string
  local: string
  contagem: number
  /** horário da pesagem, gravado no aparelho na hora (não na sincronização) */
  created_at?: string
}
