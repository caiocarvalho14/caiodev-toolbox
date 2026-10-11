// src/modules/conferencia/components/dashboard-views/GraficoPizzaLocais.tsx
import { useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'

export interface EstoqueLocal {
  id: string
  nome: string
  unidade: 'KG' | 'UND'
  valor: number
}

interface Props {
  dados: EstoqueLocal[]
}

const MAX_FATIAS = 10
const RAIO = 42
const CIRCUNFERENCIA = 2 * Math.PI * RAIO

// classes completas (o Tailwind só gera o que aparece literalmente no código)
const CORES = [
  { fatia: 'stroke-emerald-500', ponto: 'bg-emerald-500' },
  { fatia: 'stroke-sky-500', ponto: 'bg-sky-500' },
  { fatia: 'stroke-amber-500', ponto: 'bg-amber-500' },
  { fatia: 'stroke-violet-500', ponto: 'bg-violet-500' },
  { fatia: 'stroke-rose-500', ponto: 'bg-rose-500' },
]
const COR_OUTROS = { fatia: 'stroke-slate-300', ponto: 'bg-slate-300' }

const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const fmtPct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

export function GraficoPizzaLocais({ dados }: Props) {
  const [unidade, setUnidade] = useState<'KG' | 'UND'>('KG')

  // KG e UND não se misturam: o seletor só aparece se existirem os dois
  const unidadesDisponiveis = useMemo(
    () => (['KG', 'UND'] as const).filter((u) => dados.some((d) => d.unidade === u && d.valor > 0)),
    [dados]
  )
  const unidadeAtiva = unidadesDisponiveis.includes(unidade) ? unidade : unidadesDisponiveis[0]

  const { fatias, total } = useMemo(() => {
    const ordenados = dados
      .filter((d) => d.unidade === unidadeAtiva && d.valor > 0)
      .sort((a, b) => b.valor - a.valor)

    const total = ordenados.reduce((soma, d) => soma + d.valor, 0)

    const principais = ordenados.slice(0, MAX_FATIAS).map((d, i) => ({
      id: d.id,
      nome: d.nome,
      valor: d.valor,
      cor: CORES[i % CORES.length],
    }))

    const resto = ordenados.slice(MAX_FATIAS)
    if (resto.length > 0) {
      principais.push({
        id: 'outros',
        nome: `Outros (${resto.length})`,
        valor: resto.reduce((soma, d) => soma + d.valor, 0),
        cor: COR_OUTROS,
      })
    }

    // onde cada fatia começa, para posicionar o arco
    let acumulado = 0
    const fatias = principais.map((f) => {
      const inicio = acumulado
      acumulado += f.valor
      return { ...f, inicio }
    })

    return { fatias, total }
  }, [dados, unidadeAtiva])

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 min-w-0">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Estoque por local</h3>
          <p className="text-xs text-slate-500 mt-0.5">Todas as conferências</p>
        </div>

        {unidadesDisponiveis.length > 1 && (
          <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden shrink-0">
            {unidadesDisponiveis.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnidade(u)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  u === unidadeAtiva ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        )}
      </div>

      {fatias.length === 0 ? (
        <div className="text-center py-10">
          <MapPin className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500 text-sm">Nenhuma contagem registrada ainda.</p>
        </div>
      ) : (
        <>
          <div className="relative w-40 h-40 mx-auto">
            <svg viewBox="0 0 120 120" className="w-full h-full">
              <circle cx="60" cy="60" r={RAIO} fill="none" strokeWidth="18" className="stroke-slate-100" />
              {fatias.map((f) => {
                const comprimento = (f.valor / total) * CIRCUNFERENCIA
                const deslocamento = -(f.inicio / total) * CIRCUNFERENCIA

                return (
                  <circle
                    key={f.id}
                    cx="60"
                    cy="60"
                    r={RAIO}
                    fill="none"
                    strokeWidth="18"
                    className={f.cor.fatia}
                    strokeDasharray={`${comprimento} ${CIRCUNFERENCIA - comprimento}`}
                    strokeDashoffset={deslocamento}
                    transform="rotate(-90 60 60)"
                  >
                    <title>{`${f.nome}: ${fmt(f.valor)} ${unidadeAtiva} (${fmtPct((f.valor / total) * 100)})`}</title>
                  </circle>
                )
              })}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-semibold text-slate-900 leading-none">{unidadeAtiva}</span>
              <span className="text-[10px] text-slate-400 mt-1">acumulado</span>
            </div>
          </div>

          <ul className="mt-5 space-y-2">
            {fatias.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-sm">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${f.cor.ponto}`} />
                <span className="flex-1 min-w-0 truncate text-slate-700" title={f.nome}>
                  {f.nome}
                </span>
                <span className="text-xs text-slate-400 tabular-nums">{fmt(f.valor)}</span>
                <span className="w-12 text-right text-xs font-medium text-slate-700 tabular-nums">
                  {fmtPct((f.valor / total) * 100)}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Soma de todas as conferências: use como proporção entre os locais.
          </p>
        </>
      )}
    </div>
  )
}