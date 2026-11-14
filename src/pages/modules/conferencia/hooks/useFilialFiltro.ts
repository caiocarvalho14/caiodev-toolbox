// src/modules/conferencia/hooks/useFilialFiltro.ts
import { useEffect, useState } from 'react'

// Filial escolhida no filtro, compartilhada entre as abas do módulo (Conferências, Dashboard, Relatórios).
// '' = todas as filiais.
const CHAVE = 'conf_filial_filtro'

function ler(): string {
  try {
    return localStorage.getItem(CHAVE) ?? ''
  } catch {
    return ''
  }
}

export function useFilialFiltro() {
  const [filial, setFilial] = useState<string>(ler)

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, filial)
    } catch {
      // armazenamento indisponível: o filtro só não fica lembrado
    }
  }, [filial])

  return [filial, setFilial] as const
}
