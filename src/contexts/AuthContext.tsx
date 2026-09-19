// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { offlineDb } from '../lib/offlineDb'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  online: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const online = useOnlineStatus()

  // ref sincronizada com `online`, pra usar o valor mais atual dentro de
  // effects/callbacks sem precisar recriar listeners a cada mudança
  const onlineRef = useRef(online)
  useEffect(() => {
    onlineRef.current = online
  }, [online])

  // Grava a sessão no cache local (IndexedDB) só quando há conexão de
  // verdade (não só a interface de rede ativa), pra não sobrescrever o
  // cache com um valor potencialmente desatualizado enquanto offline.
  const cacheSession = async (value: Session | null) => {
    if (!onlineRef.current) return
    try {
      await offlineDb.authSession.put({ id: 'current', session: value, updatedAt: Date.now() })
    } catch {
      // cache é best-effort; falha aqui não pode travar o fluxo de auth
    }
  }

  useEffect(() => {
    let mounted = true

    async function init() {
      // 1. supabase-js guarda a sessão em localStorage e getSession() lê
      // esse valor local primeiro (síncrono na prática), então isso já
      // funciona offline sem precisar de rede.
      const { data: { session: localSession } } = await supabase.auth.getSession()

      if (!mounted) return
      setSession(localSession)
      setLoading(false)
      await cacheSession(localSession)
    }

    init()

    // 2. escuta mudanças futuras (login, logout, refresh de token).
    // Refresh de token exige rede, então esse evento só dispara de fato
    // quando há conexão — offline, a sessão local simplesmente permanece.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      cacheSession(newSession)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // recebe email/senha, tenta autenticar no Supabase e devolve uma mensagem
  // de erro em português (ou null se deu certo) pra página de login exibir
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!onlineRef.current) {
      return { error: 'Sem conexão com a internet. Conecte-se para entrar.' }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (!error) return { error: null }

    if (error.message === 'Invalid login credentials') {
      return { error: 'E-mail ou senha incorretos.' }
    }
    if (error.message === 'Email not confirmed') {
      return { error: 'Confirme seu e-mail antes de entrar.' }
    }
    return { error: 'Não foi possível entrar agora. Tente novamente.' }
  }

  // Sempre limpa a sessão local, mesmo offline — só tenta avisar o Supabase
  // se houver conexão. Assim o usuário consegue "sair" do app mesmo sem rede.
  const signOut = async () => {
    setSession(null)
    await cacheSession(null)

    if (onlineRef.current) {
      try {
        await supabase.auth.signOut()
      } catch {
        // já limpamos o estado local; erro de rede aqui não deve bloquear o logout
      }
    }
  }

  const value: AuthContextType = {
    session,
    user: session?.user ?? null,
    loading,
    online,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de um AuthProvider')
  return ctx
}