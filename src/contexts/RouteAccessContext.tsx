// src/contexts/RouteAccessContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

type RouteAccessContextType = {
  rotasPermitidas: string[]
  loading: boolean
  temAcesso: (rota: string) => boolean
}

const RouteAccessContext = createContext<RouteAccessContextType | undefined>(undefined)

export function RouteAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth() // depende do AuthContext, mas não o contrário
  const [rotasPermitidas, setRotasPermitidas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setRotasPermitidas([])
      setLoading(false)
      return
    }

    supabase
      .from('sistema_usuario_rota')
      .select('rota(id,nome,descricao,path,ativo)')
      .eq('usuario', user.id)
      .then(({ data, error }) => {
        if (!error) setRotasPermitidas(data?.map(r => r.rota) ?? [])
        setLoading(false)
      })
  }, [user])

  const temAcesso = (rota: string) => rotasPermitidas.includes(rota)
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