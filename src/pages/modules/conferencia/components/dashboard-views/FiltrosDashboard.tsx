// src/modules/conferencia/components/dashboard-views/FiltrosDashboard.tsx
import type { Filial } from '../../../cadastros/types/filial'
import type { Periodo, Preset } from '../../lib/dashboardMetricas'
import { FilialSelect } from '../../../cadastros/components/FilialSelect'

export interface EstadoFiltros {
  preset: Preset
  custom: Periodo
  tolerancia: number // |divergência| até este valor conta como "ok"
}

export const FILTROS_PADRAO: EstadoFiltros = {
  preset: '30',
  custom: { inicio: null, fim: null },
  tolerancia: 0.5,
}

const PRESETS: { id: Preset; rotulo: string }[] = [
  { id: '7', rotulo: '7 dias' },
  { id: '30', rotulo: '30 dias' },
  { id: '90', rotulo: '90 dias' },
  { id: 'tudo', rotulo: 'Tudo' },
  { id: 'custom', rotulo: 'Período' },
]

const controle =
  'px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300'

interface Props {
  filtros: EstadoFiltros
  onChange: (f: EstadoFiltros) => void
  filiais: Filial[]
  filial: string
  onFilial: (id: string) => void
}

export function FiltrosDashboard({ filtros, onChange, filiais, filial, onFilial }: Props) {
  const set = (parcial: Partial<EstadoFiltros>) => onChange({ ...filtros, ...parcial })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-white" role="group" aria-label="Período">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => set({ preset: p.id })}
            aria-pressed={filtros.preset === p.id}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filtros.preset === p.id ? 'bg-slate-900 text-white font-medium' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {p.rotulo}
          </button>
        ))}
      </div>

      {filtros.preset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="Início do período"
            value={filtros.custom.inicio ?? ''}
            onChange={(e) => set({ custom: { ...filtros.custom, inicio: e.target.value || null } })}
            className={controle}
          />
          <span className="text-slate-400 text-sm">até</span>
          <input
            type="date"
            aria-label="Fim do período"
            value={filtros.custom.fim ?? ''}
            onChange={(e) => set({ custom: { ...filtros.custom, fim: e.target.value || null } })}
            className={controle}
          />
        </div>
      )}

      <FilialSelect filiais={filiais} value={filial} onChange={onFilial} className="!py-2" />

      <label className="flex items-center gap-1.5 text-sm text-slate-500" title="Divergência até este valor conta como acerto">
        Tolerância ±
        <input
          type="number"
          min={0}
          step={0.1}
          value={filtros.tolerancia}
          onChange={(e) => set({ tolerancia: Math.max(0, Number(e.target.value) || 0) })}
          className={`${controle} w-20 tabular-nums`}
        />
        kg
      </label>
    </div>
  )
}
