// src/modules/conferencia/components/FilialSelect.tsx
import type { Filial } from '../types/filial'

interface Props {
  filiais: Filial[]
  value: string
  onChange: (id: string) => void
  incluirTodas?: boolean
  id?: string
  className?: string
}

export function FilialSelect({ filiais, value, onChange, incluirTodas = true, id, className = '' }: Props) {
  const ordenadas = [...filiais].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 ${className}`}
    >
      {incluirTodas ? <option value="">Todas as filiais</option> : <option value="">Selecione a filial</option>}
      {ordenadas.map((f) => (
        <option key={f.id} value={f.id}>
          {f.nome}
        </option>
      ))}
    </select>
  )
}
