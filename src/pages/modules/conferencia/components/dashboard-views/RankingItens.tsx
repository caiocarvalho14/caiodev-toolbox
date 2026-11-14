// src/modules/conferencia/components/dashboard-views/RankingItens.tsx
// Itens com maior erro médio no período: uma lista curta, uma barra (falta + sobra) por item.
import { useState } from 'react'
import { ListOrdered } from 'lucide-react'
import type { ResumoItem } from '../../lib/dashboardMetricas'
import { fmtNum, fmtSinal } from '../../lib/dashboardMetricas'
import { COR } from './dashCores'

const LIMITE = 8

export function RankingItens({ itens }: { itens: ResumoItem[] }) {
  const [verTodos, setVerTodos] = useState(false)
  const ordenados = [...itens].sort((a, b) => b.mediaAbsoluta - a.mediaAbsoluta)
  const visiveis = verTodos ? ordenados : ordenados.slice(0, LIMITE)
  const max = Math.max(0, ...ordenados.map((i) => i.mediaAbsoluta))

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-slate-400" />
            Itens que mais divergem
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Erro médio por conferência, do maior para o menor</p>
        </div>
        <span className="flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: COR.falta }} /> Falta
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: COR.sobra }} /> Sobra
          </span>
        </span>
      </div>

      {ordenados.length === 0 ? (
        <p className="text-sm text-slate-400 mt-4">Nenhum item pesado no período.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {visiveis.map((i, idx) => {
            // a barra (erro médio) é dividida na proporção do que foi falta e do que foi sobra
            const larguraTotal = max > 0 ? (i.mediaAbsoluta / max) * 100 : 0
            const parteFalta = i.absoluta > 0 ? i.faltaTotal / i.absoluta : 0
            return (
              <li key={i.itemId} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3">
                <span className="text-xs text-slate-400 tabular-nums text-right">{idx + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-medium text-sm text-slate-900 truncate">{i.nome}</span>
                    {i.marcaNome && <span className="text-xs text-slate-400 shrink-0">{i.marcaNome}</span>}
                  </div>
                  <div className="flex h-1.5 mt-1.5 rounded-full overflow-hidden bg-slate-100" style={{ width: `${Math.max(2, larguraTotal)}%` }}>
                    <span style={{ width: `${parteFalta * 100}%`, background: COR.falta }} />
                    <span style={{ width: `${(1 - parteFalta) * 100}%`, background: COR.sobra }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    falta em {i.vezesFalta} de {i.conferencias} {i.conferencias === 1 ? 'conferência' : 'conferências'} · saldo{' '}
                    {fmtSinal(i.liquida, 1)} kg
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-900 tabular-nums text-right">
                  {fmtNum(i.mediaAbsoluta, 1)}
                  <span className="block text-[11px] font-normal text-slate-400">kg/conf.</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {ordenados.length > LIMITE && (
        <button
          type="button"
          onClick={() => setVerTodos((v) => !v)}
          className="mt-4 w-full py-2 text-sm text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-50"
        >
          {verTodos ? 'Mostrar menos' : `Ver todos os ${ordenados.length} itens`}
        </button>
      )}
    </div>
  )
}
