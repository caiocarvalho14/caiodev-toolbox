// src/modules/admin/repositories/rotasRepository.ts
import { supabase } from '../../../../lib/supabase'
import type { Rota } from '../../../modules/admin/types/usuario'

export async function listarRotas(): Promise<Rota[]> {
  const { data, error } = await supabase.from('sistema_rotas').select('*').order('nome')
  if (error) throw error
  return data
}

export async function listarRotasDoUsuario(usuarioId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('sistema_usuario_rota')
    .select('rota')
    .eq('usuario', usuarioId)
  if (error) throw error
  return data.map((r) => r.rota)
}

export async function definirRotasDoUsuario(usuarioId: string, rotaIds: string[]) {
  await supabase.from('sistema_usuario_rota').delete().eq('usuario', usuarioId)
  if (rotaIds.length === 0) return
  const { error } = await supabase
    .from('sistema_usuario_rota')
    .insert(rotaIds.map((rota) => ({ usuario: usuarioId, rota })))
  if (error) throw error
}