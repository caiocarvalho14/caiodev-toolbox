// src/modules/conferencia/components/dashboard-views/GraficoTendencia.tsx
// Uma coluna por conferência, em ordem cronológica. Clicar seleciona a conferência.
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import type { ResumoConferencia } from '../../lib/dashboardMetricas'
import { fmtData, fmtDataCurta, fmtNum, fmtPct, fmtSinal } from '../../lib/dashboardMetricas'
import { COR } from './dashCores'

type Metrica = 'divergencia' | 'acuracidade' | 'pesagens'

const METRICAS: { id: Metrica; rotulo: string }[] = [
  { id: 'divergencia', rotulo: 'Falta × sobra' },
  { id: 'acuracidade', rotulo: 'Acuracidade' },
  { id: 'pesagens', rotulo: 'Pesagens' },
]

const ALTURA = 240
const M = { topo: 12, base: 28, esq: 48, dir: 8 }

function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [largura, setLargura] = useState(0)
  useLayoutEffect(() => {
    if (!ref.current) return
    // mede já na montagem: o ResizeObserver só avisa no próximo frame (e não avisa com a aba oculta)
    setLargura(ref.current.getBoundingClientRect().width)
    const obs = new ResizeObserver(([e]) => setLargura(e.contentRect.width))
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, largura] as const
}

/** ticks "redondos" entre min e max */
function ticks(min: number, max: number, alvo = 4): number[] {
  const span = max - min || 1
  const passoBruto = span / alvo
  const mag = 10 ** Math.floor(Math.log10(passoBruto))
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => span / p <= alvo) ?? mag * 10
  const out: number[] = []
  for (let v = Math.ceil(min / passo) * passo; v <= max + 1e-9; v += passo) out.push(Number(v.toFixed(6)))
  return out
}

interface Props {
  resumos: ResumoConferencia[]
  selecionadaId: string | null
  onSelecionar: (id: string) => void
  unidade: string
}

export function GraficoTendencia({ resumos, selecionadaId, onSelecionar, unidade }: Props) {
  const [metrica, setMetrica] = useState<Metrica>('divergencia')
  const [hover, setHover] = useState<number | null>(null)
  const [ref, largura] = useLargura<HTMLDivElement>()

  const dados = resumos.filter((r) => r.conferidos > 0)

  const escala = useMemo(() => {
    if (metrica === 'acuracidade') return { min: 0, max: 1 }
    if (metrica === 'pesagens') return { min: 0, max: Math.max(1, ...dados.map((d) => d.pesagens)) }
    const max = Math.max(1, ...dados.map((d) => d.sobraTotal))
    const min = -Math.max(1, ...dados.map((d) => d.faltaTotal))
    return { min, max }
  }, [dados, metrica])

  const marcas = ticks(escala.min, escala.max)
  const yMin = Math.min(escala.min, marcas[0] ?? escala.min)
  const yMax = Math.max(escala.max, marcas[marcas.length - 1] ?? escala.max)
  const plotH = ALTURA - M.topo - M.base
  const plotW = Math.max(0, largura - M.esq - M.dir)
  const y = (v: number) => M.topo + ((yMax - v) / (yMax - yMin || 1)) * plotH
  const passoX = dados.length > 0 ? plotW / dados.length : 0
  const larguraBarra = Math.max(3, Math.min(28, passoX - 4)) // 4px de respiro entre colunas
  const xCentro = (i: number) => M.esq + passoX * i + passoX / 2
  // rótulos do eixo X: no máximo ~8, para não encavalar
  const cadaN = Math.max(1, Math.ceil(dados.length / Math.max(1, Math.floor(plotW / 64))))
  const fmtEixo = (v: number) => (metrica === 'acuracidade' ? `${Math.round(v * 100)}%` : fmtNum(v, 0))

  const ativo = hover != null ? dados[hover] : null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            Evolução por conferência
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {metrica === 'divergencia' && (
              <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                <Legenda cor={COR.sobra} texto={`Sobra (${unidade})`} />
                <Legenda cor={COR.falta} texto={`Falta (${unidade})`} />
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-slate-900" /> Saldo líquido
                </span>
              </span>
            )}
            {metrica === 'acuracidade' && 'Itens dentro da tolerância ÷ itens conferidos'}
            {metrica === 'pesagens' && 'Quantidade de pesagens registradas'}
            <span className="text-slate-400"> · clique numa coluna para detalhar</span>
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50" role="group" aria-label="Métrica">
          {METRICAS.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={metrica === m.id}
              onClick={() => setMetrica(m.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                metrica === m.id ? 'bg-white text-slate-900 font-medium shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {m.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div ref={ref} className="relative w-full" style={{ height: ALTURA }}>
        {dados.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            Nenhuma conferência com pesagens no período.
          </div>
        ) : (
          largura > 0 && (
            <svg width={largura} height={ALTURA} role="img" aria-label="Gráfico de evolução por conferência">
              {marcas.map((t) => (
                <g key={t}>
                  <line x1={M.esq} x2={largura - M.dir} y1={y(t)} y2={y(t)} stroke={t === 0 ? COR.eixo : COR.grade} strokeWidth={1} />
                  <text x={M.esq - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={COR.textoSec} className="tabular-nums">
                    {fmtEixo(t)}
                  </text>
                </g>
              ))}

              {dados.map((d, i) => {
                const cx = xCentro(i)
                const x = cx - larguraBarra / 2
                const sel = d.conferencia.id === selecionadaId
                const apagado = (hover != null && hover !== i) || (selecionadaId != null && !sel && hover == null)
                const opac = apagado ? 0.45 : 1
                return (
                  <g key={d.conferencia.id} opacity={opac}>
                    {metrica === 'divergencia' && (
                      <>
                        {d.sobraTotal > 0 && (
                          <rect x={x} width={larguraBarra} y={y(d.sobraTotal)} height={Math.max(1, y(0) - y(d.sobraTotal) - 1)} rx={Math.min(4, larguraBarra / 2)} fill={COR.sobra} />
                        )}
                        {d.faltaTotal > 0 && (
                          <rect x={x} width={larguraBarra} y={y(0) + 1} height={Math.max(1, y(-d.faltaTotal) - y(0) - 1)} rx={Math.min(4, larguraBarra / 2)} fill={COR.falta} />
                        )}
                        <line x1={x - 2} x2={x + larguraBarra + 2} y1={y(d.liquida)} y2={y(d.liquida)} stroke={COR.texto} strokeWidth={2} strokeLinecap="round" />
                      </>
                    )}
                    {metrica === 'acuracidade' && d.acuracidade != null && (
                      <rect x={x} width={larguraBarra} y={y(d.acuracidade)} height={Math.max(1, y(0) - y(d.acuracidade))} rx={Math.min(4, larguraBarra / 2)} fill={COR.serie} />
                    )}
                    {metrica === 'pesagens' && (
                      <rect x={x} width={larguraBarra} y={y(d.pesagens)} height={Math.max(1, y(0) - y(d.pesagens))} rx={Math.min(4, larguraBarra / 2)} fill={COR.serie} />
                    )}
                    {sel && (
                      <rect x={cx - passoX / 2 + 1} width={passoX - 2} y={M.topo} height={plotH} fill="none" stroke={COR.texto} strokeWidth={1} rx={6} strokeOpacity={0.35} />
                    )}
                    {i % cadaN === 0 && (
                      <text x={cx} y={ALTURA - 8} textAnchor="middle" fontSize={11} fill={COR.textoSec} className="tabular-nums">
                        {fmtDataCurta(d.conferencia.data)}
                      </text>
                    )}
                    {/* área de clique/hover: a coluna inteira, bem maior que a barra */}
                    <rect
                      x={cx - passoX / 2}
                      width={passoX}
                      y={M.topo}
                      height={plotH}
                      fill="transparent"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => onSelecionar(d.conferencia.id)}
                    />
                  </g>
                )
              })}
            </svg>
          )
        )}

        {ativo && hover != null && (
          <div
            className="pointer-events-none absolute z-10 bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs w-56"
            style={{
              left: Math.min(Math.max(0, xCentro(hover) - 112), Math.max(0, largura - 224)),
              top: 0,
            }}
          >
            <p className="font-semibold text-slate-900">
              {fmtData(ativo.conferencia.data)}
              {ativo.conferencia.nome ? ` · ${ativo.conferencia.nome}` : ''}
            </p>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 tabular-nums">
              <dt className="text-slate-500">Itens conferidos</dt>
              <dd className="text-right text-slate-900">{ativo.conferidos}</dd>
              <dt className="text-slate-500">Acuracidade</dt>
              <dd className="text-right text-slate-900">{fmtPct(ativo.acuracidade)}</dd>
              <dt className="text-slate-500 flex items-center gap-1"><Ponto cor={COR.sobra} />Sobra</dt>
              <dd className="text-right text-slate-900">{fmtNum(ativo.sobraTotal)} ({ativo.sobra})</dd>
              <dt className="text-slate-500 flex items-center gap-1"><Ponto cor={COR.falta} />Falta</dt>
              <dd className="text-right text-slate-900">{fmtNum(ativo.faltaTotal)} ({ativo.falta})</dd>
              <dt className="text-slate-500">Saldo líquido</dt>
              <dd className="text-right font-medium text-slate-900">{fmtSinal(ativo.liquida)}</dd>
              <dt className="text-slate-500">Pesagens</dt>
              <dd className="text-right text-slate-900">{ativo.pesagens}</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}

function Ponto({ cor }: { cor: string }) {
  return <span className="w-2 h-2 rounded-full inline-block" style={{ background: cor }} />
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Ponto cor={cor} />
      {texto}
    </span>
  )
}
