// src/modules/conferencia/types/conferencia.ts
export type TipoConferencia = 'normal' | 'rapida'

export interface Conferencia {
  id: string
  nome: string
  data: string
  created_at : string
  observacao: string | null
  criador_id?: string | null
  filial?: string | null
  /** 'rapida' = itens digitados na hora; ausente/'normal' = itens do cadastro */
  tipo?: TipoConferencia
  /** padrão de conferência (tabela conf_modelo) usado para criá-la; null = sem padrão */
  padrao?: string | null
}

export const ehRapida = (c: Pick<Conferencia, 'tipo'>) => c.tipo === 'rapida'
