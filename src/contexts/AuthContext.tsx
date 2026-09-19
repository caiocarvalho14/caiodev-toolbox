// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. pega a sessão já existente ao carregar a página
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. escuta mudanças futuras (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // recebe email/senha, tenta autenticar no Supabase e devolve uma mensagem
  // de erro em português (ou null se deu certo) pra página de login exibir
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
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
 
  const signOut = () => supabase.auth.signOut().then(() => { })
 
  const value: AuthContextType = {
    session,
    user: session?.user ?? null,
    loading,
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