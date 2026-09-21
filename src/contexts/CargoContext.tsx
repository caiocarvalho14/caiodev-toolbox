// src/contexts/CargoContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { offlineDb } from '../lib/offlineDb'

interface CargoContextValue {
  cargos: string[]
  loading: boolean
  temCargo: (cargo: string) => boolean
  reload: () => Promise<void>
}

const CargoContext = createContext<CargoContextValue | undefined>(undefined)

export function CargoProvider({ children }: { children: ReactNode }) {
  const [cargos, setCargos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const carregarCargos = async () => {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setCargos([])
      setLoading(false)
      return
    }

    // tenta buscar do servidor se online
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('sistema_usuario_cargo')
          .select('cargo:sistema_cargo(cargo)')
          .eq('usuario', user.id)

        if (error) throw error

        const nomes = (data ?? [])
          .map((row: any) => row.cargo?.cargo)
          .filter((nome): nome is string => Boolean(nome))

        setCargos(nomes)
        await offlineDb.cargosUsuario.put({
          userId: user.id,
          cargos: nomes,
          updatedAt: Date.now(),
        })
        setLoading(false)
        return
      } catch (err) {
        console.error('[cargo] falha ao buscar do servidor, usando cache local:', err)
      }
    }

    // offline ou falha na busca — usa o último cache conhecido
    const cache = await offlineDb.cargosUsuario.get(user.id)
    setCargos(cache?.cargos ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void carregarCargos()
  }, [])

  const temCargo = (cargo: string) => cargos.includes(cargo)

  return (
    <CargoContext.Provider value={{ cargos, loading, temCargo, reload: carregarCargos }}>
      {children}
    </CargoContext.Provider>
  )
}

export function useCargo() {
  const context = useContext(CargoContext)
  if (!context) {
    throw new Error('useCargo deve ser usado dentro de um CargoProvider')
  }
  return context
}