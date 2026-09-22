// api/admin-users.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function usuarioEhAdmin(usuarioId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('sistema_usuario_cargo')
    .select('cargo:sistema_cargo(cargo)')
    .eq('usuario', usuarioId)

  if (error) return false
  return (data ?? []).some((row: any) => row.cargo?.cargo === 'admin')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Token ausente' })
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token)

  if (authError || !user) {
    return res.status(401).json({ error: 'Token inválido' })
  }

  const ehAdmin = await usuarioEhAdmin(user.id)
  if (!ehAdmin) {
    return res.status(403).json({ error: 'Acesso restrito a administradores' })
  }

  const { action, payload } = req.body

  try {
    if (action === 'list') {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers()
      if (error) throw error
      const users = data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
      }))
      return res.status(200).json({ users })
    }

    if (action === 'create') {
      const { email, password } = payload
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' })
      }
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (error) throw error
      return res.status(200).json({
        user: { id: data.user.id, email: data.user.email, created_at: data.user.created_at },
      })
    }

    if (action === 'delete') {
      const { userId } = payload
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Ação desconhecida' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return res.status(400).json({ error: message })
  }
}