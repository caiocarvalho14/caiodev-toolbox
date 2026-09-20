// src/modules/conferencia/components/relatorio-views/RelatorioTabela.tsx
import type { RelatorioConferencia } from '../../../../modules/conferencia/lib/relatorio'

interface Props {
  relatorio: RelatorioConferencia
}

export function RelatorioTabela({ relatorio }: Props) {
  const { conferencia, locaisUsados, linhas, totalFisico, totalSistema, totalDivergencia } = relatorio

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">
            {conferencia.nome || new Date(conferencia.data + 'T00:00:00').toLocaleDateString('pt-BR')}
          </h3>
          <p className="text-xs text-slate-500">
            {new Date(conferencia.data + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
        </div>
        <span
          className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${
            totalDivergencia < -0.001
              ? 'bg-red-100 text-red-700'
              : totalDivergencia > 0.001
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          {totalDivergencia > 0 ? '+' : ''}
          {totalDivergencia.toFixed(2)}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2.5">Código</th>
              <th className="px-4 py-2.5">Produto</th>
              <th className="px-4 py-2.5 text-right">Físico</th>
              <th className="px-4 py-2.5 text-right">Sistema</th>
              <th className="px-4 py-2.5 text-right">Divergência</th>
              {locaisUsados.map((l) => (
                <th key={l.id} className="px-4 py-2.5 text-right">
                  {l.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {linhas.map((l) => {
              const divNeg = l.divergencia < -0.001
              const divPos = l.divergencia > 0.001
              return (
                <tr key={l.registroId}>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{l.codigo ?? '-'}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {l.marcaNome ? `${l.marcaNome} · ` : ''}
                    {l.nome}
                  </td>
                  <td className="px-4 py-2.5 text-right">{l.fisico.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right">{l.sistema.toFixed(2)}</td>
                  <td
                    className={`px-4 py-2.5 text-right font-medium ${
                      divNeg ? 'bg-red-50 text-red-700' : divPos ? 'bg-emerald-50 text-emerald-700' : ''
                    }`}
                  >
                    {l.divergencia > 0 ? '+' : ''}
                    {l.divergencia.toFixed(2)}
                  </td>
                  {locaisUsados.map((loc) => (
                    <td key={loc.id} className="px-4 py-2.5 text-right text-slate-500">
                      {l.porLocal[loc.id] != null ? `${l.porLocal[loc.id].toFixed(2)} ${l.tipoContagem}` : '-'}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t border-slate-200 font-semibold text-slate-900">
            <tr>
              <td className="px-4 py-2.5" colSpan={2}>
                Total
              </td>
              <td className="px-4 py-2.5 text-right">{totalFisico.toFixed(2)}</td>
              <td className="px-4 py-2.5 text-right">{totalSistema.toFixed(2)}</td>
              <td className="px-4 py-2.5 text-right">
                {totalDivergencia > 0 ? '+' : ''}
                {totalDivergencia.toFixed(2)}
              </td>
              {locaisUsados.map((l) => (
                <td key={l.id} />
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}