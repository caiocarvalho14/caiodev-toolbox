// src/modules/conferencia/components/dashboard-views/ComparativoConferencias.tsx
// Duas conferências lado a lado: físico e divergência de cada item, e se o erro subiu ou caiu.
import { useMemo } from 'react'
import { ArrowDownRight, ArrowLeftRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import type { Fato, ResumoConferencia } from '../../lib/dashboardMetricas'
import { fmtData, fmtNum, fmtPct, fmtSinal } from '../../lib/dashboardMetricas'
import { COR } from './dashCores'

interface Props {
  resumos: ResumoConferencia[] // cronológico
  fatos: Fato[]
  aId: string | null
  bId: string | null
  onChange: (a: string | null, b: string | null) => void
}

interface Linha {
  itemId: string
  nome: string
  marcaNome: string
  a: Fato | null
  b: Fato | null
  deltaErro: number | null // |div B| − |div A|; negativo = melhorou
}

const rotulo = (r: ResumoConferencia) =>
  `${fmtData(r.conferencia.data)}${r.conferencia.nome ? ` · ${r.conferencia.nome}` : ''}`

export function ComparativoConferencias({ resumos, fatos, aId, bId, onChange }: Props) {
  const opcoes = [...resumos].reverse().filter((r) => r.conferidos > 0)
  const resA = resumos.find((r) => r.conferencia.id === aId) ?? null
  const resB = resumos.find((r) => r.conferencia.id === bId) ?? null

  const linhas = useMemo<Linha[]>(() => {
    const map = new Map<string, Linha>()
    for (const f of fatos) {
      if (f.status === 'pendente') continue
      const lado = f.conferenciaId === aId ? 'a' : f.conferenciaId === bId ? 'b' : null
      if (!lado) continue
      const l = map.get(f.itemId) ?? { itemId: f.itemId, nome: f.itemNome, marcaNome: f.marcaNome, a: null, b: null, deltaErro: null }
      l[lado] = f
      map.set(f.itemId, l)
    }
    for (const l of map.values()) {
      l.deltaErro = l.a && l.b ? Math.abs(l.b.divergencia) - Math.abs(l.a.divergencia) : null
    }
    // maiores mudanças primeiro; itens que só aparecem de um lado vão para o fim
    return [...map.values()].sort(
      (x, y) =>
        (x.deltaErro == null ? 1 : 0) - (y.deltaErro == null ? 1 : 0) ||
        Math.abs(y.deltaErro ?? 0) - Math.abs(x.deltaErro ?? 0) ||
        x.nome.localeCompare(y.nome, 'pt-BR')
    )
  }, [fatos, aId, bId])

  const select = (valor: string | null, onSel: (id: string) => void, letra: string) => (
    <select
      aria-label={`Conferência ${letra}`}
      value={valor ?? ''}
      onChange={(e) => onSel(e.target.value)}
      className="min-w-0 flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
    >
      <option value="">Escolha…</option>
      {opcoes.map((r) => (
        <option key={r.conferencia.id} value={r.conferencia.id}>
          {rotulo(r)}
        </option>
      ))}
    </select>
  )

  return (
    <div className="bg-white rounded-2xl border border-slate-200 min-w-0 overflow-hidden">
      <div className="p-5 pb-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-slate-400" />
          Comparar conferências
        </h3>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 w-4">A</span>
          {select(aId, (id) => onChange(id || null, bId), 'A')}
          <button
            type="button"
            title="Trocar A e B"
            onClick={() => onChange(bId, aId)}
            className="self-center p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 shrink-0"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-500 w-4">B</span>
          {select(bId, (id) => onChange(aId, id || null), 'B')}
        </div>

        {resA && resB && (
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <Resumo titulo="Acuracidade" a={fmtPct(resA.acuracidade)} b={fmtPct(resB.acuracidade)} melhorou={(resB.acuracidade ?? 0) > (resA.acuracidade ?? 0)} igual={resA.acuracidade === resB.acuracidade} />
            <Resumo titulo="Erro total" a={`${fmtNum(resA.absoluta, 1)} kg`} b={`${fmtNum(resB.absoluta, 1)} kg`} melhorou={resB.absoluta < resA.absoluta} igual={Math.abs(resB.absoluta - resA.absoluta) < 0.001} />
          </div>
        )}
      </div>

      {!resA || !resB ? (
        <p className="px-5 pb-6 text-sm text-slate-400">Escolha as duas conferências.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50 text-xs text-slate-500">
                <th className="px-3 pl-5 py-2 text-left font-medium">Item</th>
                <th className="px-3 py-2 text-right font-medium">Físico A</th>
                <th className="px-3 py-2 text-right font-medium">Div. A</th>
                <th className="px-3 py-2 text-right font-medium border-l border-slate-200">Físico B</th>
                <th className="px-3 py-2 text-right font-medium">Div. B</th>
                <th className="px-3 pr-5 py-2 text-right font-medium border-l border-slate-200" title="Quanto o erro (|divergência|) mudou de A para B">
                  Erro A → B
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((l) => (
                <tr key={l.itemId}>
                  <td className="px-3 pl-5 py-2.5 text-slate-900">
                    <span className="font-medium">{l.nome}</span>
                    {l.marcaNome && <span className="ml-1.5 text-xs text-slate-400">{l.marcaNome}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{l.a ? fmtNum(l.a.fisico) : <Vazio />}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums"><Div f={l.a} /></td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 border-l border-slate-100">{l.b ? fmtNum(l.b.fisico) : <Vazio />}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums"><Div f={l.b} /></td>
                  <td className="px-3 pr-5 py-2.5 text-right tabular-nums whitespace-nowrap border-l border-slate-100">
                    <Mudanca delta={l.deltaErro} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const Vazio = () => <span className="text-slate-300">—</span>

function Div({ f }: { f: Fato | null }) {
  if (!f) return <Vazio />
  if (f.status === 'ok') return <span className="text-slate-400">{fmtSinal(f.divergencia)}</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-900">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: f.divergencia < 0 ? COR.falta : COR.sobra }} />
      {fmtSinal(f.divergencia)}
    </span>
  )
}

function Mudanca({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-xs text-slate-400">só em uma</span>
  if (Math.abs(delta) <= 0.001) return <span className="text-slate-400">igual</span>
  const melhorou = delta < 0
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${melhorou ? 'text-emerald-700' : 'text-red-700'}`}>
      {melhorou ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
      {fmtSinal(delta)}
    </span>
  )
}

function Resumo({ titulo, a, b, melhorou, igual }: { titulo: string; a: string; b: string; melhorou: boolean; igual: boolean }) {
  return (
    <div>
      <span className="text-xs text-slate-500">{titulo}</span>
      <p className="flex items-center gap-1.5">
        <span className="text-slate-500">{a}</span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
        <span className={`font-semibold ${igual ? 'text-slate-900' : melhorou ? 'text-emerald-700' : 'text-red-700'}`}>{b}</span>
      </p>
    </div>
  )
}
