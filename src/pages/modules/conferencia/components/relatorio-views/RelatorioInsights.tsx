// src/modules/conferencia/components/relatorio-views/RelatorioInsights.tsx
import type { RelatorioConferencia } from '../../../../modules/conferencia/lib/relatorio'

interface Props {
  relatorios: RelatorioConferencia[]
}

export function RelatorioInsights({ relatorios }: Props) {
  const mapa = new Map<string, { nome: string; marcaNome: string; totalDivergencia: number; ocorrencias: number }>()

  for (const rel of relatorios) {
    for (const l of rel.linhas) {
      const chave = `${l.marcaNome}__${l.nome}`
      const atual = mapa.get(chave) ?? { nome: l.nome, marcaNome: l.marcaNome, totalDivergencia: 0, ocorrencias: 0 }
      atual.totalDivergencia += l.divergencia
      atual.ocorrencias += 1
      mapa.set(chave, atual)
    }
  }

  const ranking = Array.from(mapa.values())
    .sort((a, b) => Math.abs(b.totalDivergencia) - Math.abs(a.totalDivergencia))
    .slice(0, 8)

  if (ranking.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Maiores divergências (selecionadas)</h3>
      <div className="space-y-2">
        {ranking.map((r, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-slate-700 truncate">
              {r.marcaNome ? `${r.marcaNome} · ` : ''}
              {r.nome}
            </span>
            <span className={`font-medium ${r.totalDivergencia < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {r.totalDivergencia > 0 ? '+' : ''}
              {r.totalDivergencia.toFixed(2)}
              {r.ocorrencias > 1 ? <span className="text-slate-400 font-normal"> · {r.ocorrencias}x</span> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}