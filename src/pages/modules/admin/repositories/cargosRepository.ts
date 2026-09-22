// src/modules/admin/repositories/cargosRepository.ts
import { supabase } from '../../../../lib/supabase'
import type { Cargo } from '../../../modules/admin/types/usuario'

export async function listarCargos(): Promise<Cargo[]> {
  const { data, error } = await supabase.from('sistema_cargo').select('*').order('cargo')
  if (error) throw error
  return data
}

export async function listarCargosDoUsuario(usuarioId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('sistema_usuario_cargo')
    .select('cargo')
    .eq('usuario', usuarioId)
  if (error) throw error
  return data.map((c) => c.cargo)
}

export async function definirCargosDoUsuario(usuarioId: string, cargoIds: string[]) {
  await supabase.from('sistema_usuario_cargo').delete().eq('usuario', usuarioId)
  if (cargoIds.length === 0) return
  const { error } = await supabase
    .from('sistema_usuario_cargo')
    .insert(cargoIds.map((cargo) => ({ usuario: usuarioId, cargo })))
  if (error) throw error
}