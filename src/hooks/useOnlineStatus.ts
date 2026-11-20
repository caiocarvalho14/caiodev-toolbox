// src/hooks/useOnlineStatus.ts
// Mantido por compatibilidade: o estado da conexão agora é único para o app inteiro
// (src/lib/conexao.ts), com tolerância de 2s para o servidor responder.
import { useConexao } from '../lib/conexao'

export function useOnlineStatus() {
  return useConexao().online
}
