// src/modules/conferencia/lib/tempoConferencia.ts
// "Tempo de conferência": da primeira à última contagem (pesagem) ligada à conferência.
import type { RegistroConferencia } from '../types/registro'
import type { Contagem } from '../types/contagem'

export interface TempoConferencia {
  inicio: string // ISO da primeira contagem
  fim: string // ISO da última contagem
  ms: number
  contagens: number
}

/** Tempo de cada conferência (só as que têm contagem com horário). */
export function temposPorConferencia(
  registros: Pick<RegistroConferencia, 'id' | 'conferencia'>[],
  contagens: Pick<Contagem, 'registro' | 'created_at'>[]
): Map<string, TempoConferencia> {
  const confDoRegistro = new Map(registros.map((r) => [r.id, r.conferencia] as const))
  const acc = new Map<string, { ini: number; fim: number; n: number }>()
  for (const c of contagens) {
    const conf = confDoRegistro.get(c.registro)
    const t = c.created_at ? Date.parse(c.created_at) : NaN
    if (!conf || Number.isNaN(t)) continue // contagem antiga ainda sem horário local: ignora
    const a = acc.get(conf) ?? { ini: t, fim: t, n: 0 }
    a.ini = Math.min(a.ini, t)
    a.fim = Math.max(a.fim, t)
    a.n++
    acc.set(conf, a)
  }
  const out = new Map<string, TempoConferencia>()
  for (const [conf, a] of acc) {
    out.set(conf, {
      inicio: new Date(a.ini).toISOString(),
      fim: new Date(a.fim).toISOString(),
      ms: a.fim - a.ini,
      contagens: a.n,
    })
  }
  return out
}

/** 45 s → "menos de 1 min"; 75 min → "1h 15min"; 26 h → "1d 2h" */
export function formatarDuracao(ms: number): string {
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'menos de 1 min'
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  if (d > 0) return `${d}d${h ? ` ${h}h` : ''}`
  if (h > 0) return `${h}h${m ? ` ${m}min` : ''}`
  return `${m} min`
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

/** "09:10 às 10:25" (mesmo dia) ou "12/11 23:40 às 13/11 01:05" */
export function formatarIntervalo(t: TempoConferencia): string {
  if (dia(t.inicio) === dia(t.fim)) {
    return hora(t.inicio) === hora(t.fim) ? hora(t.inicio) : `${hora(t.inicio)} às ${hora(t.fim)}`
  }
  const curto = (iso: string) => `${dia(iso).slice(0, 5)} ${hora(iso)}`
  return `${curto(t.inicio)} às ${curto(t.fim)}`
}

/** Texto completo, ex.: "1h 15min (09:10 às 10:25)" */
export const descreverTempo = (t: TempoConferencia) => `${formatarDuracao(t.ms)} (${formatarIntervalo(t)})`
