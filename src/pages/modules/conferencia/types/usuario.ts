// src/modules/conferencia/types/usuario.ts
// Perfil público (tabela sistema_usuario): só id + nome, sem e-mail
export interface Usuario {
  id: string
  nome: string
  created_at?: string
}
