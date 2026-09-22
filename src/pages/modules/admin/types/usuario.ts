// src/modules/admin/types/usuario.ts
export interface Usuario {
  id: string
  email: string
  created_at: string
}

export interface Rota {
  id: string
  nome: string
  descricao: string | null
  path: string
  ativo: boolean
}

export interface Cargo {
  id: string
  cargo: string
}