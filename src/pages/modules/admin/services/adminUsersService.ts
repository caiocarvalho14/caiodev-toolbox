// src/modules/admin/services/adminUsersService.ts
import { supabase } from '../../../../lib/supabase'
import type { Usuario } from '../types/usuario'

async function chamarApi(action: string, payload?: unknown) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) throw new Error('Não autenticado')

  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, payload }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro na requisição')
  return data
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const { users } = await chamarApi('list')
  return users
}

export async function criarUsuario(email: string, password: string): Promise<Usuario> {
  const { user } = await chamarApi('create', { email, password })
  return user
}

export async function removerUsuario(userId: string): Promise<void> {
  await chamarApi('delete', { userId })
}