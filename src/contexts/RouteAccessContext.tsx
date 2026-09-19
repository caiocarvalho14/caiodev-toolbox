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
      // o AuthContext ainda não sabe se tem usuário ou não — espera, pra
      // não zerar rotasPermitidas com um `user` que é só temporariamente nulo
      if (authLoading) {
        setLoading(true)
        return
      }

      if (!user) {
        setRotasPermitidas([])
        setLoading(false)
        return
      }

      setLoading(true)

      // 1. carrega o cache local primeiro — disponível instantaneamente e
      // funciona offline, sem depender de rede
      const cached = await offlineDb.rotasPermitidas.get(user.id)
      if (mounted && cached) {
        setRotasPermitidas(cached.rotas)
      }

      // 2. sem conexão de verdade, fica só com o que já está em cache no navegador
      if (!onlineRef.current) {
        if (mounted) setLoading(false)
        return
      }

      // 3. com conexão, busca o valor atualizado no banco e atualiza o cache
      const { data, error } = await supabase
        .from('sistema_usuario_rota')
        .select('rota(id,nome,descricao,path,ativo)')
        .eq('usuario', user.id)

      if (!mounted) return

      if (!error) {
        // sem tipos gerados do Supabase (`supabase gen types`), o select
        // tipado como relação (`rota(...)`) volta como `any` — o cast
        // documenta a forma esperada da resposta
        const todasRotas = (data?.map(r => r.rota) ?? []) as unknown as Rota[]
        // descarta rotas desativadas — o vínculo em `sistema_usuario_rota`
        // pode continuar existindo mesmo depois que a rota é desligada
        const rotas = todasRotas.filter(r => r.ativo)
        setRotasPermitidas(rotas)
        try {
          await offlineDb.rotasPermitidas.put({
            userId: user.id,
            rotas,
            updatedAt: Date.now(),
          })
        } catch {
          // cache é best-effort; falha aqui não deve travar o app
        }
      } else if (cached) {
        // erro de rede/servidor: mantém o que já tinha em cache
        setRotasPermitidas(cached.rotas)
      }

      setLoading(false)
    }

    loadRotas()

    return () => {
      mounted = false
    }
    // reexecuta quando o auth termina de carregar, o usuário muda, ou a
    // conexão volta, pra sincronizar o cache assim que possível
  }, [user, authLoading, online])

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