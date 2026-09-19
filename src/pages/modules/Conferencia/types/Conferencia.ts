// src/modules/acougue/types/conferencia.ts
export interface Conferencia {
  id: string
  data: string // ISO date (yyyy-mm-dd)
  observacao?: string
  status: 'aberta' | 'finalizada'
}