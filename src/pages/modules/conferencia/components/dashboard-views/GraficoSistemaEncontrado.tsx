// src/modules/conferencia/components/dashboard-views/GraficoSistemaEncontrado.tsx
import { useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'

export interface LinhaGrafico {
  id: string
  nome: string
  unidade: 'KG' | 'UND'
  sistema: number
  fisico: number
  divergencia: number // fisico - sistema (negativo = falta)
}

interface Props {
  opcoes: { id: string; rotulo: string; data: string }[]
  dataConferenciaSelecionada: string | null
  selecionadaId: string | null
  onSelecionar: (id: string) => void
  linhas: LinhaGrafico[]
}

type Ordenacao = 'divergencia' | 'nome'

const EPS = 0.001
const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

function Barra({ valor, maximo, cor }: { valor: number; maximo: number; cor: string }) {
  const pct = Math.max(0, Math.min(100, (valor / maximo) * 100))
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-slate-500">{fmt(valor)}</span>
    </div>
  )
}

export function GraficoSistemaEncontrado({ opcoes, selecionadaId, onSelecionar, linhas, dataConferenciaSelecionada }: Props) {
  const [unidade, setUnidade] = useState<'KG' | 'UND'>('KG')
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('divergencia')

  // KG e UND não podem dividir a mesma escala: só aparece o seletor se a conferência tiver os dois
  const unidadesDisponiveis = useMemo(
    () => (['KG', 'UND'] as const).filter((u) => linhas.some((l) => l.unidade === u)),
    [linhas]
  )
  const unidadeAtiva = unidadesDisponiveis.includes(unidade) ? unidade : unidadesDisponiveis[0]

  const linhasVisiveis = useMemo(() => {
    const filtradas = linhas.filter((l) => l.unidade === unidadeAtiva)
    filtradas.sort((a, b) =>
      ordenacao === 'nome'
        ? a.nome.localeCompare(b.nome, 'pt-BR')
        : Math.abs(b.divergencia) - Math.abs(a.divergencia) || a.nome.localeCompare(b.nome, 'pt-BR')
    )
    return filtradas
  }, [linhas, unidadeAtiva, ordenacao])

  const maximo = useMemo(
    () => Math.max(1, ...linhasVisiveis.map((l) => Math.max(l.sistema, l.fisico))),
    [linhasVisiveis]
  )

  const comDivergencia = linhasVisiveis.filter((l) => Math.abs(l.divergencia) >= EPS).length

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Sistema × Encontrado</h3>
          {linhasVisiveis.length > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">
              {linhasVisiveis.length} {linhasVisiveis.length === 1 ? 'item' : 'itens'} · {comDivergencia} com divergência
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {opcoes.length > 0 && (
            <select
              value={selecionadaId ?? ''}
              onChange={(e) => onSelecionar(e.target.value)}
              aria-label="Conferência"
              className="max-w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            >
              {opcoes.filter((d) => d.data == dataConferenciaSelecionada).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          )}

          {unidadesDisponiveis.length > 1 && (
            <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden">
              {unidadesDisponiveis.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnidade(u)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    u === unidadeAtiva ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          )}

          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
            aria-label="Ordenar por"
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
          >
            <option value="divergencia">Maior divergência</option>
            <option value="nome">Nome (A-Z)</option>
          </select>
        </div>
      </div>

      {linhasVisiveis.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">
            {opcoes.length === 0
              ? 'Nenhuma conferência cadastrada ainda.'
              : 'Esta conferência ainda não tem itens.'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              Sistema
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Encontrado
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Encontrado (falta)
            </span>
          </div>

          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-2">
            {linhasVisiveis.map((l) => {
              const falta = l.divergencia < -EPS
              const sobra = l.divergencia > EPS

              return (
                <div
                  key={l.id}
                  className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] gap-3 items-center"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate" title={l.nome}>
                      {l.nome}
                    </p>
                    <p
                      className={`text-[11px] font-medium ${
                        falta ? 'text-red-600' : sobra ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {falta || sobra ? `${sobra ? '+' : ''}${fmt(l.divergencia)} ${l.unidade}` : 'ok'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Barra valor={l.sistema} maximo={maximo} cor="bg-slate-400" />
                    <Barra valor={l.fisico} maximo={maximo} cor={falta ? 'bg-red-500' : 'bg-emerald-500'} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}