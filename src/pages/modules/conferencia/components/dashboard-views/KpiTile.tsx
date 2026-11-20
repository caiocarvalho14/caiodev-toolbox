// src/modules/conferencia/components/dashboard-views/KpiTile.tsx
import { useId, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Info, Minus } from 'lucide-react'

interface Props {
  titulo: string
  valor: string
  detalhe?: string
  /** variação vs período anterior; `melhorQuando` diz se subir é bom */
  variacao?: { texto: string; delta: number; melhorQuando: 'sobe' | 'desce' } | null
  marcador?: string // cor do pontinho que liga o card ao gráfico (falta/sobra)
  /** o que o número significa (abre ao tocar no "i": funciona no celular, sem depender de hover) */
  ajuda?: string
}

export function KpiTile({ titulo, valor, detalhe, variacao, marcador, ajuda }: Props) {
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const idAjuda = useId()

  let tom = 'text-slate-600'
  let Icone = Minus
  if (variacao && Math.abs(variacao.delta) > 1e-9) {
    const subiu = variacao.delta > 0
    const bom = subiu === (variacao.melhorQuando === 'sobe')
    tom = bom ? 'text-emerald-700' : 'text-red-700'
    Icone = subiu ? ArrowUpRight : ArrowDownRight
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 min-w-0">
      <div className="flex items-center gap-1.5 text-sm text-slate-600">
        {marcador && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: marcador }} />}
        <span className="truncate">{titulo}</span>
        {ajuda && (
          <button
            type="button"
            onClick={() => setAjudaAberta((v) => !v)}
            aria-expanded={ajudaAberta}
            aria-controls={idAjuda}
            aria-label={`O que é ${titulo}?`}
            title={ajuda}
            className="ml-auto -m-1 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <p className="text-2xl font-semibold text-slate-900 mt-2 truncate tabular-nums">{valor}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 min-h-[1rem]">
        {variacao && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${tom}`} title="Comparado com o período anterior de mesmo tamanho">
            <Icone className="w-3.5 h-3.5" />
            {variacao.texto}
          </span>
        )}
        {detalhe && <span className="text-xs text-slate-500 truncate">{detalhe}</span>}
      </div>
      {ajuda && ajudaAberta && (
        <p id={idAjuda} className="mt-2 text-xs text-slate-600 leading-snug border-t border-slate-100 pt-2">
          {ajuda}
        </p>
      )}
    </div>
  )
}
