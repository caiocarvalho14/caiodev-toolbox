// src/modules/conferencia/components/dashboard-views/ComparacaoUltimas.tsx
// A conferência do panorama comparada com a anterior: o que mudou nos números e em quais itens.
import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react'
import type { Fato, ResumoConferencia } from '../../lib/dashboardMetricas'
import { fmtDataCurta, fmtNum, fmtPct, fmtSinal } from '../../lib/dashboardMetricas'
import { formatarDuracao } from '../../lib/tempoConferencia'
import { COR } from './dashCores'

interface Props {
  anterior: ResumoConferencia
  atual: ResumoConferencia
  fatosAnterior: Fato[]
  fatosAtual: Fato[]
  tempoAnteriorMs: number | null
  tempoAtualMs: number | null
}

interface Par {
  itemId: string
  nome: string
  marca: string
  antes: Fato | null
  depois: Fato | null
  /** quanto o erro (|divergência|) mudou: positivo = piorou */
  deltaErro: number
}

type Lista = 'pioraram' | 'melhoraram' | 'falta-nas-duas'

const rotuloConf = (r: ResumoConferencia) =>
  `${fmtDataCurta(r.conferencia.data)}${r.conferencia.nome?.trim() ? ` · ${r.conferencia.nome.trim()}` : ''}`

export function ComparacaoUltimas({ anterior: a, atual: b, fatosAnterior, fatosAtual, tempoAnteriorMs, tempoAtualMs }: Props) {
  const [lista, setLista] = useState<Lista>('pioraram')
  const [verTodos, setVerTodos] = useState(false)

  const pares = useMemo(() => {
    // só itens pesados entram (não pesado = sem estoque, não tem divergência para comparar)
    const pesados = (fs: Fato[]) => new Map(fs.filter((f) => f.status !== 'pendente').map((f) => [f.itemId, f] as const))
    const mA = pesados(fatosAnterior)
    const mB = pesados(fatosAtual)
    const ids = new Set([...mA.keys(), ...mB.keys()])
    const out: Par[] = []
    for (const id of ids) {
      const antes = mA.get(id) ?? null
      const depois = mB.get(id) ?? null
      const ref = depois ?? antes!
      out.push({
        itemId: id,
        nome: ref.itemNome,
        marca: ref.marcaNome,
        antes,
        depois,
        deltaErro: Math.abs(depois?.divergencia ?? 0) - Math.abs(antes?.divergencia ?? 0),
      })
    }
    return out
  }, [fatosAnterior, fatosAtual])

  const listas: Record<Lista, Par[]> = {
    pioraram: pares.filter((p) => p.antes && p.depois && p.deltaErro > 0.5).sort((x, y) => y.deltaErro - x.deltaErro),
    melhoraram: pares.filter((p) => p.antes && p.depois && p.deltaErro < -0.5).sort((x, y) => x.deltaErro - y.deltaErro),
    'falta-nas-duas': pares
      .filter((p) => p.antes?.status === 'falta' && p.depois?.status === 'falta')
      .sort((x, y) => x.depois!.divergencia + x.antes!.divergencia - (y.depois!.divergencia + y.antes!.divergencia)),
  }
  const visiveis = verTodos ? listas[lista] : listas[lista].slice(0, 5)

  const metricas: {
    titulo: string
    antes: string
    depois: string
    /** compara com melhorQuando para decidir a cor */
    delta: number
    /** sinal da diferença mostrada (direção da seta); padrão = sinal de delta */
    direcao?: number
    texto: string
    melhorQuando: 'sobe' | 'desce' | 'neutro'
  }[] = [
    {
      titulo: 'Saldo',
      antes: `${fmtSinal(a.liquida, 1)} kg`,
      depois: `${fmtSinal(b.liquida, 1)} kg`,
      // saldo melhora quando se aproxima de zero
      delta: Math.abs(b.liquida) - Math.abs(a.liquida),
      direcao: b.liquida - a.liquida,
      texto: `${fmtSinal(b.liquida - a.liquida, 1)} kg`,
      melhorQuando: 'desce',
    },
    {
      titulo: 'Acuracidade',
      antes: fmtPct(a.acuracidade),
      depois: fmtPct(b.acuracidade),
      delta: (b.acuracidade ?? 0) - (a.acuracidade ?? 0),
      texto: `${fmtSinal(((b.acuracidade ?? 0) - (a.acuracidade ?? 0)) * 100, 1)} p.p.`,
      melhorQuando: 'sobe',
    },
    {
      titulo: 'Falta',
      antes: `${fmtNum(a.faltaTotal, 1)} kg`,
      depois: `${fmtNum(b.faltaTotal, 1)} kg`,
      delta: b.faltaTotal - a.faltaTotal,
      texto: `${fmtSinal(b.faltaTotal - a.faltaTotal, 1)} kg`,
      melhorQuando: 'desce',
    },
    {
      titulo: 'Sobra',
      antes: `${fmtNum(a.sobraTotal, 1)} kg`,
      depois: `${fmtNum(b.sobraTotal, 1)} kg`,
      delta: b.sobraTotal - a.sobraTotal,
      texto: `${fmtSinal(b.sobraTotal - a.sobraTotal, 1)} kg`,
      melhorQuando: 'desce',
    },
    {
      titulo: 'Itens pesados',
      antes: String(a.conferidos),
      depois: String(b.conferidos),
      delta: b.conferidos - a.conferidos,
      texto: fmtSinal(b.conferidos - a.conferidos, 0),
      melhorQuando: 'neutro',
    },
    ...(tempoAnteriorMs != null && tempoAtualMs != null
      ? [
          {
            titulo: 'Tempo',
            antes: formatarDuracao(tempoAnteriorMs),
            depois: formatarDuracao(tempoAtualMs),
            delta: tempoAtualMs - tempoAnteriorMs,
            texto: `${tempoAtualMs >= tempoAnteriorMs ? '+' : '−'}${formatarDuracao(Math.abs(tempoAtualMs - tempoAnteriorMs))}`,
            melhorQuando: 'desce' as const,
          },
        ]
      : []),
  ]

  const abas: { id: Lista; rotulo: string }[] = [
    { id: 'pioraram', rotulo: 'Pioraram' },
    { id: 'melhoraram', rotulo: 'Melhoraram' },
    { id: 'falta-nas-duas', rotulo: 'Falta nas duas' },
  ]

  return (
    <section aria-labelledby="comparacao-titulo" className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Comparação com a anterior</p>
        <h3 id="comparacao-titulo" className="flex flex-wrap items-center gap-x-2 text-base font-semibold text-slate-900 mt-0.5">
          <span className="text-slate-500 font-medium">{rotuloConf(a)}</span>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <span>{rotuloConf(b)}</span>
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {metricas.map((m) => {
          const igual = Math.abs(m.delta) < 1e-6
          const bom = m.melhorQuando === 'neutro' || igual ? null : (m.delta > 0) === (m.melhorQuando === 'sobe')
          const direcao = m.direcao ?? m.delta
          const Icone = igual ? Minus : direcao > 0 ? ArrowUpRight : ArrowDownRight
          const tom = bom == null ? 'text-slate-600' : bom ? 'text-emerald-700' : 'text-red-700'
          return (
            <div key={m.titulo} className="rounded-xl bg-white border border-slate-200 px-3 py-2.5 min-w-0">
              <p className="text-xs text-slate-600">{m.titulo}</p>
              <p className="text-lg font-semibold text-slate-900 tabular-nums truncate">{m.depois}</p>
              <p className="text-[11px] text-slate-500 tabular-nums truncate">antes {m.antes}</p>
              <p className={`mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${tom}`}>
                <Icone className="w-3.5 h-3.5" />
                {igual ? 'igual' : m.texto}
              </p>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 p-0.5" role="tablist" aria-label="Itens">
            {abas.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={lista === t.id}
                onClick={() => {
                  setLista(t.id)
                  setVerTodos(false)
                }}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  lista === t.id ? 'bg-slate-900 text-white font-medium' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.rotulo} <span className="tabular-nums opacity-70">{listas[t.id].length}</span>
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">divergência antes → agora</span>
        </div>

        {visiveis.length === 0 ? (
          <p className="text-sm text-slate-500 mt-4">
            {lista === 'pioraram'
              ? 'Nenhum item piorou mais de 0,5 kg.'
              : lista === 'melhoraram'
                ? 'Nenhum item melhorou mais de 0,5 kg.'
                : 'Nenhum item teve falta nas duas conferências.'}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {visiveis.map((p) => (
              <li key={p.itemId} className="py-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 items-center">
                <p className="text-sm text-slate-900 truncate">
                  {p.nome} {p.marca && <span className="text-xs text-slate-500">{p.marca}</span>}
                </p>
                <p className="flex items-center gap-1.5 text-sm tabular-nums">
                  <Valor f={p.antes} />
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <Valor f={p.depois} forte />
                </p>
              </li>
            ))}
          </ul>
        )}
        {listas[lista].length > 5 && (
          <button
            type="button"
            onClick={() => setVerTodos((v) => !v)}
            className="mt-2 w-full py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50"
          >
            {verTodos ? 'Mostrar menos' : `Ver todos os ${listas[lista].length}`}
          </button>
        )}
      </div>
    </section>
  )
}

function Valor({ f, forte }: { f: Fato | null; forte?: boolean }) {
  if (!f) return <span className="text-slate-400 text-xs">não pesado</span>
  const cor = f.status === 'falta' ? COR.falta : f.status === 'sobra' ? COR.sobra : undefined
  return (
    <span className={forte ? 'font-semibold' : 'text-slate-600'} style={cor ? { color: cor } : undefined}>
      {fmtSinal(f.divergencia, 1)}
    </span>
  )
}
