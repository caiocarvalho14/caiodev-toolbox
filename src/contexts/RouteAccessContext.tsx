// src/contexts/RouteAccessContext.tsx
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { offlineDb } from '../lib/offlineDb'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import type { Rota } from '../types/rota'

type RouteAccessContextType = {
  rotasPermitidas: Rota[]
  loading: boolean
  temAcesso: (path: string) => boolean
}

const RouteAccessContext = createContext<RouteAccessContextType | undefined>(undefined)

export function RouteAccessProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth() // depende do AuthContext, mas não o contrário
  const [rotasPermitidas, setRotasPermitidas] = useState<Rota[]>([])
  const [loading, setLoading] = useState(true)
  const online = useOnlineStatus()

  const onlineRef = useRef(online)
  useEffect(() => {
    onlineRef.current = online
  }, [online])

  useEffect(() => {
  let mounted = true

  async function loadRotas() {
    if (authLoading) {
      // Mantém o carregamento apenas se a autenticação ainda estiver pendente
      return
    }

    if (!user) {
      setRotasPermitidas([])
      setLoading(false)
      return
    }

    // 1. Tenta carregar o cache local primeiro
    const cached = await offlineDb.rotasPermitidas.get(user.id)
    if (mounted && cached) {
      setRotasPermitidas(cached.rotas)
    }

    // Só define loading como true se NENHUM cache foi encontrado previamente
    if (!cached) {
      setLoading(true)
    }

    // 2. Se estiver offline, encerra sem alterar o estado de loading de forma desnecessária
    if (!onlineRef.current) {
      if (mounted) setLoading(false)
      return
    }

    // 3. Atualização silenciosa em segundo plano
    const { data, error } = await supabase
      .from('sistema_usuario_rota')
      .select('rota(id,nome,descricao,path,ativo)')
      .eq('usuario', user.id)

    if (!mounted) return

    if (!error) {
      const todasRotas = (data?.map(r => r.rota) ?? []) as unknown as Rota[]
      const rotas = todasRotas.filter(r => r.ativo)
      
      setRotasPermitidas(rotas)
      try {
        await offlineDb.rotasPermitidas.put({
          userId: user.id,
          rotas,
          updatedAt: Date.now(),
        })
      } catch {
        // cache é best-effort
      }
    }

    // Finaliza o carregamento inicial se ainda estiver ativo
    setLoading(false)
  }

  loadRotas()

  return () => {
    mounted = false
  }
}, [user, authLoading, online]) // Agora, se `online` mudar, o layout não piscará nem remontará

  const temAcesso = (path: string) => rotasPermitidas.some(r => r.path === path)

  return (
    <RouteAccessContext.Provider value={{ rotasPermitidas, loading, temAcesso }}>
      {children}
    </RouteAccessContext.Provider>
  )
}

export function useRouteAccess() {
  const ctx = useContext(RouteAccessContext)

  if (!ctx) throw new Error('useRouteAccess precisa estar dentro de um RouteAccessProvider')
  return ctx
}