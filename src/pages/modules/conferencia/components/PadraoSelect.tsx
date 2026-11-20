// src/modules/conferencia/components/PadraoSelect.tsx
import type { ModeloConferencia } from '../types/modelo'
import { SEM_PADRAO } from '../hooks/usePadraoFiltro'

interface Props {
  padroes: ModeloConferencia[]
  value: string
  onChange: (id: string) => void
  /** true = filtro (com "Todos os padrões" e "Sem padrão"); false = escolha obrigatória num formulário */
  filtro?: boolean
  id?: string
  className?: string
}

export function PadraoSelect({ padroes, value, onChange, filtro = true, id, className = '' }: Props) {
  const ordenados = [...padroes].sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR'))
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={filtro ? 'Filtrar por padrão' : undefined}
      className={`px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 ${className}`}
    >
      {filtro ? <option value="">Todos os padrões</option> : <option value="">Selecione o padrão</option>}
      {filtro && <option value={SEM_PADRAO}>Sem padrão</option>}
      {ordenados.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nome}
        </option>
      ))}
    </select>
  )
}
