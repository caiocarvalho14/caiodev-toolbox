// src/modules/conferencia/hooks/usePadraoFiltro.ts
import { useEffect, useState } from 'react'
import type { Conferencia } from '../types/Conferencia'

// Padrão escolhido no filtro, compartilhado entre as abas do módulo (Conferências, Dashboard, Relatórios).
// '' = todos os padrões; SEM_PADRAO = só conferências sem padrão.
const CHAVE = 'conf_padrao_filtro'
export const SEM_PADRAO = '__sem_padrao__'

function ler(): string {
  try {
    return localStorage.getItem(CHAVE) ?? ''
  } catch {
    return ''
  }
}

export function usePadraoFiltro() {
  const [padrao, setPadrao] = useState<string>(ler)

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, padrao)
    } catch {
      // armazenamento indisponível: o filtro só não fica lembrado
    }
  }, [padrao])

  return [padrao, setPadrao] as const
}

export const batePadrao = (c: Pick<Conferencia, 'padrao'>, filtro: string) =>
  !filtro || (filtro === SEM_PADRAO ? !c.padrao : c.padrao === filtro)
