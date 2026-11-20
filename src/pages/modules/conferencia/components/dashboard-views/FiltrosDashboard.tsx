// src/modules/conferencia/components/dashboard-views/FiltrosDashboard.tsx
import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type { Filial } from '../../../cadastros/types/filial'
import type { Periodo, Preset } from '../../lib/dashboardMetricas'
import { FilialSelect } from '../../../cadastros/components/FilialSelect'
import { PadraoSelect } from '../PadraoSelect'
import type { ModeloConferencia } from '../../types/modelo'

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
  { id: '7', rotulo: '7d' },
  { id: '30', rotulo: '30d' },
  { id: '90', rotulo: '90d' },
  { id: 'tudo', rotulo: 'Tudo' },
  { id: 'custom', rotulo: 'Período' },
]

const controle =
  'px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300'

/** Filtros do topo: de qual filial e padrão são as conferências, e as regras de análise. */
export function FiltrosBase({
  filiais,
  filial,
  onFilial,
  padroes,
  padrao,
  onPadrao,
  tolerancia,
  onTolerancia,
}: {
  filiais: Filial[]
  filial: string
  onFilial: (id: string) => void
  padroes: ModeloConferencia[]
  padrao: string
  onPadrao: (id: string) => void
  tolerancia: number
  onTolerancia: (v: number) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilialSelect filiais={filiais} value={filial} onChange={onFilial} className="!py-2" />
      <PadraoSelect padroes={padroes} value={padrao} onChange={onPadrao} className="!py-2" />
      <RegrasAnalise tolerancia={tolerancia} onTolerancia={onTolerancia} />
    </div>
  )
}

/** Período do histórico (evolução e ranking). */
export function FiltroPeriodo({ filtros, onChange }: { filtros: EstadoFiltros; onChange: (f: EstadoFiltros) => void }) {
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
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              filtros.preset === p.id ? 'bg-slate-900 text-white font-medium' : 'text-slate-600 hover:text-slate-900'
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
          <span className="text-slate-500 text-sm">até</span>
          <input
            type="date"
            aria-label="Fim do período"
            value={filtros.custom.fim ?? ''}
            onChange={(e) => set({ custom: { ...filtros.custom, fim: e.target.value || null } })}
            className={controle}
          />
        </div>
      )}
    </div>
  )
}

/** Regras que mudam como os números são calculados, separadas dos filtros do dia a dia. */
function RegrasAnalise({ tolerancia, onTolerancia }: { tolerancia: number; onTolerancia: (v: number) => void }) {
  const [aberto, setAberto] = useState(false)
  const [alinharDireita, setAlinharDireita] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const alternar = () => {
    // abre para o lado que tem espaço: o botão fica à esquerda quando os filtros quebram de linha
    const caixa = ref.current?.getBoundingClientRect()
    if (caixa) setAlinharDireita(caixa.left + 288 > window.innerWidth - 16)
    setAberto((v) => !v)
  }

  // fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  const mudou = Math.abs(tolerancia - FILTROS_PADRAO.tolerancia) > 1e-9

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        className={`${controle} inline-flex items-center gap-1.5 hover:border-slate-300`}
      >
        <SlidersHorizontal className="w-4 h-4 text-slate-500" />
        Regras
        <span className="text-xs text-slate-500 tabular-nums">± {tolerancia.toLocaleString('pt-BR')} kg</span>
        {mudou && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-label="alterado" />}
      </button>
      {aberto && (
        <div
          role="dialog"
          aria-label="Regras de análise"
          className={`absolute ${alinharDireita ? 'right-0' : 'left-0'} top-full mt-2 z-30 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-lg p-4`}
        >
          <h4 className="text-sm font-semibold text-slate-900">Regras de análise</h4>
          <label htmlFor="tolerancia-dash" className="block text-sm font-medium text-slate-700 mt-3 mb-1.5">
            Tolerância de acerto
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">±</span>
            <input
              id="tolerancia-dash"
              type="number"
              min={0}
              step={0.1}
              value={tolerancia}
              onChange={(e) => onTolerancia(Math.max(0, Number(e.target.value) || 0))}
              className={`${controle} w-24 tabular-nums`}
            />
            <span className="text-sm text-slate-600">kg</span>
          </div>
          <p className="text-xs text-slate-600 mt-2 leading-snug">
            Um item conta como acerto quando a diferença entre o encontrado e o sistema fica dentro desse valor. Muda a
            acuracidade e a cor dos itens.
          </p>
          {mudou && (
            <button
              type="button"
              onClick={() => onTolerancia(FILTROS_PADRAO.tolerancia)}
              className="mt-3 text-xs font-medium text-slate-700 underline underline-offset-2 hover:no-underline"
            >
              Voltar ao padrão (± {FILTROS_PADRAO.tolerancia.toLocaleString('pt-BR')} kg)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
