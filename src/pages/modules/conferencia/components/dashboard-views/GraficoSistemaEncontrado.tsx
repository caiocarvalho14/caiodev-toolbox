// src/modules/conferencia/components/dashboard-views/GraficoSistemaEncontrado.tsx
import { Fragment, useMemo, useState } from 'react'
import { BarChart3, ChevronRight, MapPin, Search, X } from 'lucide-react'

export interface PesagemLocal {
  id: string
  localId: string
  localNome: string
  valor: number
}

export interface LinhaGrafico {
  id: string
  nome: string
  unidade: 'KG' | 'UND'
  sistema: number
  fisico: number
  divergencia: number // fisico - sistema (negativo = falta)
  pesagens: PesagemLocal[]
}

interface Props {
  opcoes: { id: string; rotulo: string; data: string }[]
  selecionadaId: string | null
  onSelecionar: (id: string) => void
  linhas: LinhaGrafico[]
}

type Ordenacao = 'falta' | 'sobra' | 'nome' | 'locais'
type FiltroStatus = 'todos' | 'falta' | 'sobra' | 'ok' | 'sem'

const EPS = 0.001
const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const fmtPct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`

// classes completas (o Tailwind só gera o que aparece literalmente no código)
const CORES = [
  { barra: 'bg-sky-500', texto: 'text-sky-700', suave: 'bg-sky-50 border-sky-200' },
  { barra: 'bg-amber-500', texto: 'text-amber-700', suave: 'bg-amber-50 border-amber-200' },
  { barra: 'bg-violet-500', texto: 'text-violet-700', suave: 'bg-violet-50 border-violet-200' },
  { barra: 'bg-emerald-500', texto: 'text-emerald-700', suave: 'bg-emerald-50 border-emerald-200' },
  { barra: 'bg-rose-500', texto: 'text-rose-700', suave: 'bg-rose-50 border-rose-200' },
  { barra: 'bg-teal-500', texto: 'text-teal-700', suave: 'bg-teal-50 border-teal-200' },
  { barra: 'bg-orange-500', texto: 'text-orange-700', suave: 'bg-orange-50 border-orange-200' },
  { barra: 'bg-indigo-500', texto: 'text-indigo-700', suave: 'bg-indigo-50 border-indigo-200' },
]
const COR_OUTROS = { barra: 'bg-slate-400', texto: 'text-slate-600', suave: 'bg-slate-50 border-slate-200' }
type Cor = typeof COR_OUTROS

// área listrada que mostra o que falta para chegar no sistema
const LISTRAS_FALTA = {
  backgroundImage: 'repeating-linear-gradient(135deg, rgb(254 202 202) 0 4px, rgb(254 242 242) 4px 8px)',
}

interface ResumoLocal {
  localId: string
  localNome: string
  total: number
  qtd: number
}

function resumirPorLocal(pesagens: PesagemLocal[]): ResumoLocal[] {
  const map = new Map<string, ResumoLocal>()
  for (const p of pesagens) {
    const atual = map.get(p.localId) ?? { localId: p.localId, localNome: p.localNome, total: 0, qtd: 0 }
    atual.total += p.valor
    atual.qtd += 1
    map.set(p.localId, atual)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

const statusDe = (l: LinhaGrafico): Exclude<FiltroStatus, 'todos'> =>
  l.pesagens.length === 0 ? 'sem' : l.divergencia < -EPS ? 'falta' : l.divergencia > EPS ? 'sobra' : 'ok'

const LIMITE_LINHAS = 10

export function GraficoSistemaEncontrado({ opcoes, selecionadaId, onSelecionar, linhas }: Props) {
  const [unidade, setUnidade] = useState<'KG' | 'UND'>('KG')
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('falta')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')
  const [localFoco, setLocalFoco] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set())
  // lista curta por padrão: a página rola normalmente, sem uma segunda barra de rolagem dentro do card
  const [mostrarTodos, setMostrarTodos] = useState(false)

  // KG e UND não podem dividir a mesma escala: só aparece o seletor se a conferência tiver os dois
  const unidadesDisponiveis = useMemo(
    () => (['KG', 'UND'] as const).filter((u) => linhas.some((l) => l.unidade === u)),
    [linhas]
  )
  const unidadeAtiva = unidadesDisponiveis.includes(unidade) ? unidade : unidadesDisponiveis[0]

  const linhasDaUnidade = useMemo(() => linhas.filter((l) => l.unidade === unidadeAtiva), [linhas, unidadeAtiva])

  // locais da conferência (na unidade ativa), do que mais concentra pesagem ao que menos: define a cor de cada um
  const locais = useMemo(() => resumirPorLocal(linhasDaUnidade.flatMap((l) => l.pesagens)), [linhasDaUnidade])
  const corPorLocal = useMemo(() => {
    const map = new Map<string, Cor>()
    locais.forEach((l, i) => map.set(l.localId, CORES[i] ?? COR_OUTROS))
    return map
  }, [locais])
  const corDe = (localId: string) => corPorLocal.get(localId) ?? COR_OUTROS

  // o local em foco pode não existir na nova conferência/unidade
  const localFocoAtivo = localFoco && locais.some((l) => l.localId === localFoco) ? localFoco : null
  const nomeLocalFoco = locais.find((l) => l.localId === localFocoAtivo)?.localNome

  const contagemStatus = useMemo(() => {
    const c = { todos: linhasDaUnidade.length, falta: 0, sobra: 0, ok: 0, sem: 0 }
    for (const l of linhasDaUnidade) c[statusDe(l)]++
    return c
  }, [linhasDaUnidade])

  const linhasVisiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    const filtradas = linhasDaUnidade
      .filter((l) => filtroStatus === 'todos' || statusDe(l) === filtroStatus)
      .filter((l) => !localFocoAtivo || l.pesagens.some((p) => p.localId === localFocoAtivo))
      .filter((l) => !termo || l.nome.toLocaleLowerCase('pt-BR').includes(termo))
      .map((l) => ({ ...l, porLocal: resumirPorLocal(l.pesagens) }))

    const porNome = (a: LinhaGrafico, b: LinhaGrafico) => a.nome.localeCompare(b.nome, 'pt-BR')
    filtradas.sort((a, b) => {
      switch (ordenacao) {
        case 'nome':
          return porNome(a, b)
        case 'sobra':
          return b.divergencia - a.divergencia || porNome(a, b)
        case 'locais':
          return b.porLocal.length - a.porLocal.length || a.divergencia - b.divergencia || porNome(a, b)
        default:
          return a.divergencia - b.divergencia || porNome(a, b)
      }
    })
    return filtradas
  }, [linhasDaUnidade, filtroStatus, localFocoAtivo, busca, ordenacao])

  const maximo = useMemo(
    () => Math.max(1, ...linhasVisiveis.map((l) => Math.max(l.sistema, l.fisico))),
    [linhasVisiveis]
  )

  const totalNoFoco = localFocoAtivo
    ? linhasVisiveis.reduce(
      (soma, l) => soma + (l.porLocal.find((p) => p.localId === localFocoAtivo)?.total ?? 0),
      0
    )
    : 0

  const alternarExpandido = (id: string) =>
    setExpandidos((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })

  const todosExpandidos = linhasVisiveis.length > 0 && linhasVisiveis.every((l) => expandidos.has(l.id))
  const alternarTodos = () =>
    setExpandidos(todosExpandidos ? new Set() : new Set(linhasVisiveis.map((l) => l.id)))

  const filtrosStatus: { id: FiltroStatus; rotulo: string }[] = [
    { id: 'todos', rotulo: 'Todos' },
    { id: 'falta', rotulo: 'Falta' },
    { id: 'sobra', rotulo: 'Sobra' },
    { id: 'ok', rotulo: 'OK' },
    { id: 'sem', rotulo: 'Sem pesagem' },
  ]

  const classeCampo =
    'px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300'

  return (
    <div id="sistema-encontrado" className="flex flex-col mb-4 bg-white rounded-2xl border border-slate-200 p-5 min-w-0 scroll-mt-16">
      {/* Cabeçalho */}
      <div className="shrink-0 min-w-0">
        <h3 className="text-sm font-semibold text-slate-900">Sistema × Encontrado</h3>
        {linhasDaUnidade.length > 0 && (
          <p className="text-xs text-slate-500 mt-0.5">
            {linhasDaUnidade.length} {linhasDaUnidade.length === 1 ? 'item' : 'itens'} · {contagemStatus.falta} com
            falta · {contagemStatus.sobra} com sobra · {locais.length}{' '}
            {locais.length === 1 ? 'local de pesagem' : 'locais de pesagem'}
          </p>
        )}
      </div>

      {/* Controles */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 mt-4">
        {opcoes.length > 0 && (
          <select
            value={selecionadaId ?? ''}
            onChange={(e) => onSelecionar(e.target.value)}
            aria-label="Conferência"
            className={`max-w-full ${classeCampo}`}
          >
            {/* todas as conferências do período (antes filtrava pelo dia do calendário, que saiu) */}
            {opcoes.map((o) => (
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
                className={`px-3 py-2 text-sm font-medium transition-colors ${u === unidadeAtiva ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
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
          className={classeCampo}
        >
          <option value="falta">Maior falta</option>
          <option value="sobra">Maior sobra</option>
          <option value="locais">Mais locais</option>
          <option value="nome">Nome (A-Z)</option>
        </select>

        <label className="relative flex-1 min-w-[10rem]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar item"
            aria-label="Buscar item"
            className={`w-full pl-9 ${classeCampo}`}
          />
        </label>
      </div>

      {linhasDaUnidade.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">
            {opcoes.length === 0 ? 'Nenhuma conferência cadastrada ainda.' : 'Esta conferência ainda não tem itens.'}
          </p>
        </div>
      ) : (
        <>
          {/* Status */}
          <div className="shrink-0 flex flex-wrap gap-1.5 mt-3">
            {filtrosStatus.map((f) => {
              const ativo = filtroStatus === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroStatus(f.id)}
                  aria-pressed={ativo}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${ativo
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {f.rotulo} <span className={ativo ? 'text-white/70' : 'text-slate-400'}>{contagemStatus[f.id]}</span>
                </button>
              )
            })}
          </div>

          {/* Locais: legenda das cores e filtro por local */}
          {locais.length > 0 && (
            <div className="shrink-0 mt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 mb-1.5">
                Locais de pesagem · toque para focar
              </p>
              <div className="flex flex-wrap gap-1.5">
                {locais.map((l) => {
                  const cor = corDe(l.localId)
                  const ativo = localFocoAtivo === l.localId
                  const apagado = localFocoAtivo !== null && !ativo
                  return (
                    <button
                      key={l.localId}
                      type="button"
                      onClick={() => setLocalFoco(ativo ? null : l.localId)}
                      aria-pressed={ativo}
                      title={`${l.qtd} ${l.qtd === 1 ? 'pesagem' : 'pesagens'}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition ${ativo ? `${cor.suave} ${cor.texto} font-semibold ring-2 ring-slate-900/10` : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        } ${apagado ? 'opacity-50' : ''}`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${cor.barra}`} />
                      {l.localNome}
                      <span className="tabular-nums text-slate-400">
                        {fmt(l.total)} {unidadeAtiva}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Resumo do foco + ações */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 mt-3 mb-2 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {localFocoAtivo ? (
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <MapPin className="w-3.5 h-3.5" />
                  {linhasVisiveis.length} {linhasVisiveis.length === 1 ? 'item pesado' : 'itens pesados'} em{' '}
                  <strong className="font-semibold">{nomeLocalFoco}</strong> · {fmt(totalNoFoco)} {unidadeAtiva}
                  <button
                    type="button"
                    onClick={() => setLocalFoco(null)}
                    className="ml-1 p-0.5 rounded hover:bg-slate-100"
                    aria-label="Limpar foco de local"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-sm bg-slate-300" /> Sistema
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-sm bg-gradient-to-r from-sky-500 via-amber-500 to-violet-500" />
                    Encontrado por local
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-sm" style={LISTRAS_FALTA} /> Falta
                  </span>
                </>
              )}
            </div>
            {linhasVisiveis.length > 0 && (
              <button type="button" onClick={alternarTodos} className="font-medium text-slate-600 hover:text-slate-900">
                {todosExpandidos ? 'Recolher todos' : 'Expandir todos'}
              </button>
            )}
          </div>

          {/* Linhas */}
          {linhasVisiveis.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-10">Nenhum item com esses filtros.</p>
          ) : (
            <>
            <div className="divide-y divide-slate-100">
              {(mostrarTodos ? linhasVisiveis : linhasVisiveis.slice(0, LIMITE_LINHAS)).map((l) => {
                const status = statusDe(l)
                const aberto = expandidos.has(l.id)
                const faltaPct = l.sistema > l.fisico ? ((l.sistema - l.fisico) / maximo) * 100 : 0
                const noFoco = localFocoAtivo ? l.porLocal.find((p) => p.localId === localFocoAtivo) : undefined

                return (
                  <div key={l.id} className="py-2">
                    <button
                      type="button"
                      onClick={() => alternarExpandido(l.id)}
                      aria-expanded={aberto}
                      className="w-full grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] gap-3 items-center text-left rounded-lg -mx-1 px-1 py-1 hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex items-start gap-1">
                        <ChevronRight
                          className={`w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400 transition-transform ${aberto ? 'rotate-90' : ''}`}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate" title={l.nome}>
                            {l.nome}
                          </p>
                          <p className="text-[11px]">
                            <span
                              className={`font-medium ${status === 'falta' || status === 'sem'
                                ? 'text-red-600'
                                : status === 'sobra'
                                  ? 'text-emerald-600'
                                  : 'text-slate-400'
                                }`}
                            >
                              {status === 'sem'
                                ? 'sem pesagem'
                                : status === 'ok'
                                  ? 'ok'
                                  : `${status === 'sobra' ? '+' : ''}${fmt(l.divergencia)} ${l.unidade}`}
                            </span>
                            {l.porLocal.length > 0 && (
                              <span className="text-slate-400">
                                {' · '}
                                {l.porLocal.length} {l.porLocal.length === 1 ? 'local' : 'locais'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1 min-w-0">
                        {/* Sistema */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-slate-300"
                              style={{ width: `${(l.sistema / maximo) * 100}%` }}
                            />
                          </div>
                          <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-slate-500">
                            {fmt(l.sistema)}
                          </span>
                        </div>
                        {/* Encontrado, dividido por local */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
                            {l.porLocal.map((p) => {
                              const apagado = localFocoAtivo !== null && p.localId !== localFocoAtivo
                              return (
                                <div
                                  key={p.localId}
                                  className={`h-full ${corDe(p.localId).barra} ${apagado ? 'opacity-20' : ''} border-r border-white last:border-r-0`}
                                  style={{ width: `${(p.total / maximo) * 100}%` }}
                                  title={`${p.localNome}: ${fmt(p.total)} ${l.unidade}`}
                                />
                              )
                            })}
                            {faltaPct > 0 && (
                              <div
                                className="h-full"
                                style={{ ...LISTRAS_FALTA, width: `${faltaPct}%` }}
                                title={`Falta ${fmt(l.sistema - l.fisico)} ${l.unidade}`}
                              />
                            )}
                          </div>
                          <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-slate-700 font-medium">
                            {noFoco ? (
                              <span className={corDe(noFoco.localId).texto} title={`em ${noFoco.localNome}`}>
                                {fmt(noFoco.total)}
                              </span>
                            ) : (
                              fmt(l.fisico)
                            )}
                          </span>
                        </div>
                      </div>
                    </button>

                    {aberto && (
                      <div className="mt-2 ml-5 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                        {l.pesagens.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            Nenhuma pesagem registrada. Sistema espera {fmt(l.sistema)} {l.unidade}.
                          </p>
                        ) : (
                          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 gap-y-2 items-start text-xs">
                            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Local</span>
                            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 text-right">
                              Total
                            </span>
                            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 text-right">
                              % do encontrado
                            </span>

                            {l.porLocal.map((p) => {
                              const cor = corDe(p.localId)
                              const destaque = localFocoAtivo === p.localId
                              const pesagensDoLocal = l.pesagens.filter((x) => x.localId === p.localId)
                              return (
                                <Fragment key={p.localId}>
                                  <div className="min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => setLocalFoco(destaque ? null : p.localId)}
                                      className={`inline-flex items-center gap-1.5 font-medium hover:underline ${destaque ? cor.texto : 'text-slate-800'}`}
                                      title="Focar neste local"
                                    >
                                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cor.barra}`} />
                                      {p.localNome}
                                    </button>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {pesagensDoLocal.map((x, i) => (
                                        <span
                                          key={x.id}
                                          className={`px-1.5 py-0.5 rounded-md border tabular-nums text-[11px] ${cor.suave} ${cor.texto}`}
                                          title={`Pesagem ${i + 1} em ${p.localNome}`}
                                        >
                                          {fmt(x.valor)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <span className="text-right tabular-nums font-medium text-slate-800">
                                    {fmt(p.total)} {l.unidade}
                                    <span className="block text-[11px] font-normal text-slate-400">
                                      {p.qtd} {p.qtd === 1 ? 'pesagem' : 'pesagens'}
                                    </span>
                                  </span>
                                  <span className="text-right tabular-nums text-slate-600">
                                    {l.fisico > EPS ? fmtPct((p.total / l.fisico) * 100) : '—'}
                                  </span>
                                </Fragment>
                              )
                            })}

                            <div className="col-span-3 border-t border-slate-200" />
                            <span className="font-medium text-slate-700">Encontrado</span>
                            <span className="text-right tabular-nums font-semibold text-slate-900">
                              {fmt(l.fisico)} {l.unidade}
                            </span>
                            <span />
                            <span className="text-slate-500">Sistema</span>
                            <span className="text-right tabular-nums text-slate-600">
                              {fmt(l.sistema)} {l.unidade}
                            </span>
                            <span />
                            <span className="text-slate-500">Divergência</span>
                            <span
                              className={`text-right tabular-nums font-medium ${status === 'falta' ? 'text-red-600' : status === 'sobra' ? 'text-emerald-600' : 'text-slate-500'
                                }`}
                            >
                              {status === 'sobra' ? '+' : ''}
                              {fmt(l.divergencia)} {l.unidade}
                            </span>
                            <span />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {linhasVisiveis.length > LIMITE_LINHAS && (
              <button
                type="button"
                onClick={() => setMostrarTodos((v) => !v)}
                className="mt-3 w-full py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50"
              >
                {mostrarTodos ? 'Mostrar menos' : `Ver todos os ${linhasVisiveis.length} itens`}
              </button>
            )}
            </>
          )}
        </>
      )}
    </div>
  )
}
