// src/modules/conferencia/components/dashboard-views/KpiTile.tsx
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

interface Props {
  titulo: string
  valor: string
  detalhe?: string
  /** variação vs período anterior; `melhorQuando` diz se subir é bom */
  variacao?: { texto: string; delta: number; melhorQuando: 'sobe' | 'desce' } | null
  marcador?: string // cor do pontinho que liga o card ao gráfico (falta/sobra)
}

export function KpiTile({ titulo, valor, detalhe, variacao, marcador }: Props) {
  let tom = 'text-slate-500'
  let Icone = Minus
  if (variacao && Math.abs(variacao.delta) > 1e-9) {
    const subiu = variacao.delta > 0
    const bom = subiu === (variacao.melhorQuando === 'sobe')
    tom = bom ? 'text-emerald-700' : 'text-red-700'
    Icone = subiu ? ArrowUpRight : ArrowDownRight
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 min-w-0">
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        {marcador && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: marcador }} />}
        <span className="truncate">{titulo}</span>
      </div>
      <p className="text-2xl font-semibold text-slate-900 mt-2 truncate">{valor}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 min-h-[1rem]">
        {variacao && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${tom}`}>
            <Icone className="w-3.5 h-3.5" />
            {variacao.texto}
          </span>
        )}
        {detalhe && <span className="text-xs text-slate-400 truncate">{detalhe}</span>}
      </div>
    </div>
  )
}
