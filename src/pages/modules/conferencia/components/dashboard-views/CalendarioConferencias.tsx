// src/modules/conferencia/components/dashboard-views/CalendarioConferencias.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  ano: number
  mes: number // 0-11
  diasComConferencia: Map<string, number> // 'yyyy-mm-dd' -> quantidade de conferências no dia
  diaSelecionado: string | null
  onMudarMes: (delta: number) => void
  onSelecionarDia: (dataIso: string) => void
}

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const pad = (n: number) => String(n).padStart(2, '0')

export function CalendarioConferencias({
  ano,
  mes,
  diasComConferencia,
  diaSelecionado,
  onMudarMes,
  onSelecionarDia,
}: Props) {
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay()
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const titulo = new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const hoje = new Date()
  const hojeIso = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`

  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ]

  const prefixoMes = `${ano}-${pad(mes + 1)}-`
  let totalNoMes = 0
  for (const [iso, qtd] of diasComConferencia) {
    if (iso.startsWith(prefixoMes)) totalNoMes += qtd
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 h-fit min-w-0">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => onMudarMes(-1)}
          aria-label="Mês anterior"
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold text-slate-900 first-letter:uppercase">{titulo}</h3>
        <button
          type="button"
          onClick={() => onMudarMes(1)}
          aria-label="Próximo mês"
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {SEMANA.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-slate-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={`vazio-${i}`} />

          const iso = `${ano}-${pad(mes + 1)}-${pad(dia)}`
          const qtd = diasComConferencia.get(iso) ?? 0
          const temConferencia = qtd > 0
          const selecionado = iso === diaSelecionado
          const ehHoje = iso === hojeIso

          return (
            <button
              key={iso}
              type="button"
              disabled={!temConferencia}
              onClick={() => onSelecionarDia(iso)}
              title={temConferencia ? `${qtd} ${qtd === 1 ? 'conferência' : 'conferências'}` : undefined}
              className={`relative aspect-square rounded-lg text-sm transition-colors disabled:cursor-default ${
                selecionado
                  ? 'bg-slate-900 text-white font-semibold'
                  : temConferencia
                    ? 'bg-emerald-100 text-emerald-800 font-medium hover:bg-emerald-200'
                    : 'text-slate-500'
              } ${ehHoje && !selecionado ? 'ring-1 ring-slate-400' : ''}`}
            >
              {dia}
              {qtd > 1 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-slate-700 text-white text-[10px] leading-4 font-semibold">
                  {qtd}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-emerald-200" />
          Dia com conferência
        </span>
        <span>
          {totalNoMes} {totalNoMes === 1 ? 'neste mês' : 'neste mês'}
        </span>
      </div>
    </div>
  )
}