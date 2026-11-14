// src/modules/conferencia/lib/dashboardMetricas.ts
// Cálculos puros do dashboard: nada aqui conhece React, só dados.
import type { Conferencia } from '../types/Conferencia'
import type { RegistroConferencia } from '../types/registro'
import type { Contagem } from '../types/contagem'
import type { Item } from '../types/item'
import type { MarcaItem } from '../types/Marcas'

export type Status = 'falta' | 'sobra' | 'ok' | 'pendente'

/** Um registro já resolvido: item, marca, físico somado e classificação. */
export interface Fato {
  registroId: string
  conferenciaId: string
  data: string // data da conferência (ISO)
  itemId: string
  itemNome: string
  marcaId: string | null
  marcaNome: string
  unidade: 'KG' | 'UND'
  sistema: number
  fisico: number
  divergencia: number // fisico - sistema (negativo = falta)
  pesagens: number
  status: Status
}

export interface ResumoConferencia {
  conferencia: Conferencia
  conferidos: number // registros com ao menos uma pesagem
  pendentes: number
  ok: number
  falta: number
  sobra: number
  pesagens: number
  sistema: number
  fisico: number
  liquida: number // soma das divergências (falta compensa sobra)
  absoluta: number // soma |divergência| (o erro total, sem compensação)
  faltaTotal: number // soma das faltas (valor positivo)
  sobraTotal: number
  acuracidade: number | null // ok / conferidos, 0..1
}

export interface ResumoItem {
  itemId: string
  nome: string
  marcaNome: string
  unidade: 'KG' | 'UND'
  conferencias: number // em quantas conferências foi pesado
  vezesFalta: number
  vezesSobra: number
  vezesOk: number
  faltaTotal: number
  sobraTotal: number
  liquida: number
  absoluta: number
  mediaAbsoluta: number
  serie: { conferenciaId: string; data: string; divergencia: number }[] // em ordem cronológica
}

export interface Totais {
  conferencias: number
  dias: number
  pesagens: number
  conferidos: number
  pendentes: number
  ok: number
  falta: number
  sobra: number
  liquida: number
  absoluta: number
  faltaTotal: number
  sobraTotal: number
  acuracidade: number | null
}

export const ordemCronologica = (a: Conferencia, b: Conferencia) =>
  a.data.localeCompare(b.data) || String(a.created_at).localeCompare(String(b.created_at))

export function classificar(divergencia: number, pesagens: number, tolerancia: number): Status {
  if (pesagens === 0) return 'pendente'
  if (Math.abs(divergencia) <= tolerancia + 1e-9) return 'ok'
  return divergencia < 0 ? 'falta' : 'sobra'
}

export function montarFatos(
  conferencias: Conferencia[],
  registros: RegistroConferencia[],
  contagens: Contagem[],
  itens: Item[],
  marcas: MarcaItem[],
  tolerancia: number
): Fato[] {
  const confMap = new Map(conferencias.map((c) => [c.id, c] as const))
  const itensMap = new Map(itens.map((i) => [i.id, i] as const))
  const marcasMap = new Map(marcas.map((m) => [m.id, m] as const))

  const porRegistro = new Map<string, { soma: number; qtd: number }>()
  for (const c of contagens) {
    const acc = porRegistro.get(c.registro) ?? { soma: 0, qtd: 0 }
    acc.soma += c.contagem
    acc.qtd += 1
    porRegistro.set(c.registro, acc)
  }

  const fatos: Fato[] = []
  for (const r of registros) {
    const conf = confMap.get(r.conferencia)
    if (!conf) continue // registro de conferência fora do filtro
    const item = itensMap.get(r.item)
    const marca = item?.marca ? marcasMap.get(item.marca) : undefined
    const p = porRegistro.get(r.id) ?? { soma: 0, qtd: 0 }
    const divergencia = p.soma - r.qtd_sistema
    fatos.push({
      registroId: r.id,
      conferenciaId: conf.id,
      data: conf.data,
      itemId: r.item,
      itemNome: item?.nome ?? 'Item removido',
      marcaId: item?.marca ?? null,
      marcaNome: marca?.nome ?? '',
      unidade: item?.tipo_contagem ?? 'KG',
      sistema: r.qtd_sistema,
      fisico: p.soma,
      divergencia,
      pesagens: p.qtd,
      status: classificar(divergencia, p.qtd, tolerancia),
    })
  }
  return fatos
}

function vazioConferencia(conferencia: Conferencia): ResumoConferencia {
  return {
    conferencia,
    conferidos: 0, pendentes: 0, ok: 0, falta: 0, sobra: 0, pesagens: 0,
    sistema: 0, fisico: 0, liquida: 0, absoluta: 0, faltaTotal: 0, sobraTotal: 0,
    acuracidade: null,
  }
}

/** Uma linha por conferência, em ordem cronológica (inclusive as sem registro). */
export function resumirConferencias(conferencias: Conferencia[], fatos: Fato[]): ResumoConferencia[] {
  const map = new Map(conferencias.map((c) => [c.id, vazioConferencia(c)] as const))
  for (const f of fatos) {
    const r = map.get(f.conferenciaId)
    if (!r) continue
    if (f.status === 'pendente') {
      r.pendentes++
      continue
    }
    r.conferidos++
    r[f.status]++
    r.pesagens += f.pesagens
    r.sistema += f.sistema
    r.fisico += f.fisico
    r.liquida += f.divergencia
    r.absoluta += Math.abs(f.divergencia)
    if (f.divergencia < 0) r.faltaTotal += -f.divergencia
    else r.sobraTotal += f.divergencia
  }
  for (const r of map.values()) r.acuracidade = r.conferidos > 0 ? r.ok / r.conferidos : null
  return [...map.values()].sort((a, b) => ordemCronologica(a.conferencia, b.conferencia))
}

export function resumirItens(fatos: Fato[], conferenciasCrono: Conferencia[]): ResumoItem[] {
  const posicao = new Map(conferenciasCrono.map((c, i) => [c.id, i] as const))
  const map = new Map<string, ResumoItem>()
  for (const f of fatos) {
    if (f.status === 'pendente') continue
    const r = map.get(f.itemId) ?? {
      itemId: f.itemId, nome: f.itemNome, marcaNome: f.marcaNome, unidade: f.unidade,
      conferencias: 0, vezesFalta: 0, vezesSobra: 0, vezesOk: 0,
      faltaTotal: 0, sobraTotal: 0, liquida: 0, absoluta: 0, mediaAbsoluta: 0, serie: [],
    }
    r.conferencias++
    if (f.status === 'falta') r.vezesFalta++
    else if (f.status === 'sobra') r.vezesSobra++
    else r.vezesOk++
    if (f.divergencia < 0) r.faltaTotal += -f.divergencia
    else r.sobraTotal += f.divergencia
    r.liquida += f.divergencia
    r.absoluta += Math.abs(f.divergencia)
    r.serie.push({ conferenciaId: f.conferenciaId, data: f.data, divergencia: f.divergencia })
    map.set(f.itemId, r)
  }
  for (const r of map.values()) {
    r.mediaAbsoluta = r.conferencias > 0 ? r.absoluta / r.conferencias : 0
    r.serie.sort((a, b) => (posicao.get(a.conferenciaId) ?? 0) - (posicao.get(b.conferenciaId) ?? 0))
  }
  return [...map.values()]
}

export function totalizar(resumos: ResumoConferencia[]): Totais {
  const t: Totais = {
    conferencias: resumos.length,
    dias: new Set(resumos.map((r) => r.conferencia.data)).size,
    pesagens: 0, conferidos: 0, pendentes: 0, ok: 0, falta: 0, sobra: 0,
    liquida: 0, absoluta: 0, faltaTotal: 0, sobraTotal: 0, acuracidade: null,
  }
  for (const r of resumos) {
    t.pesagens += r.pesagens
    t.conferidos += r.conferidos
    t.pendentes += r.pendentes
    t.ok += r.ok
    t.falta += r.falta
    t.sobra += r.sobra
    t.liquida += r.liquida
    t.absoluta += r.absoluta
    t.faltaTotal += r.faltaTotal
    t.sobraTotal += r.sobraTotal
  }
  t.acuracidade = t.conferidos > 0 ? t.ok / t.conferidos : null
  return t
}

// ---------- período ----------

export type Preset = '7' | '30' | '90' | 'tudo' | 'custom'

export interface Periodo {
  inicio: string | null // ISO inclusive; null = sem limite
  fim: string | null
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function periodoDoPreset(preset: Preset, custom: Periodo, hoje = new Date()): Periodo {
  if (preset === 'tudo') return { inicio: null, fim: null }
  if (preset === 'custom') return custom
  const inicio = new Date(hoje)
  inicio.setDate(inicio.getDate() - (Number(preset) - 1))
  return { inicio: iso(inicio), fim: iso(hoje) }
}

/** Janela imediatamente anterior, de mesmo tamanho (para a variação nos KPIs). */
export function periodoAnterior(p: Periodo): Periodo | null {
  if (!p.inicio || !p.fim) return null
  const ini = new Date(p.inicio + 'T00:00:00')
  const fim = new Date(p.fim + 'T00:00:00')
  const dias = Math.round((fim.getTime() - ini.getTime()) / 86_400_000) + 1
  const antFim = new Date(ini)
  antFim.setDate(antFim.getDate() - 1)
  const antIni = new Date(antFim)
  antIni.setDate(antIni.getDate() - (dias - 1))
  return { inicio: iso(antIni), fim: iso(antFim) }
}

export const dentroDoPeriodo = (data: string, p: Periodo) =>
  (!p.inicio || data >= p.inicio) && (!p.fim || data <= p.fim)

// ---------- formatação ----------

export const fmtNum = (n: number, casas = 2) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas })
export const fmtSinal = (n: number, casas = 2) => `${n > 0.0005 ? '+' : ''}${fmtNum(n, casas)}`
export const fmtPct = (n: number | null) =>
  n == null ? '—' : `${(n * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
export const fmtData = (isoData: string) => isoData.split('-').reverse().join('/')
export const fmtDataCurta = (isoData: string) => isoData.slice(8, 10) + '/' + isoData.slice(5, 7)
