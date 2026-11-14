// src/modules/conferencia/repositories/usuariosRepository.ts
import { createOfflineRepository } from '../../../../lib/sync/offlineRepository'
import type { Usuario } from '../types/usuario'

// Somente leitura no app: a lista vem do pull de sistema_usuario
export const usuariosRepository = createOfflineRepository<Usuario>('sistema_usuario')

export function nomeDoUsuario(usuarios: Usuario[], id: string | null | undefined): string | null {
  if (!id) return null
  return usuarios.find((u) => u.id === id)?.nome ?? null
}
