// src/modules/conferencia/lib/gerarAnalise.ts
import { supabase } from '../../../../lib/supabase'
import type { RelatorioConferencia, RelatorioLinha } from './relatorio'

const MAX_CONFERENCIAS = 10
const MAX_OBS_CHARS = 200
const MAX_NOMES_OK = 40
const MAX_PAYLOAD_CHARS = 20_000
const EPS = 0.001

// evita gastar tokens de novo para a mesma seleção de conferências
const cache = new Map<string, string>()

const fmt = (n: number) => String(Math.round(n * 100) / 100)
const fmtSinal = (n: number) => `${n > 0 ? '+' : ''}${fmt(n)}`
const rotulo = (l: RelatorioLinha) => (l.marcaNome ? `${l.marcaNome} ${l.nome}` : l.nome)

function limpar(texto: string | null | undefined, max = MAX_OBS_CHARS) {
  if (!texto) return ''
  const t = texto.replace(/\s+/g, ' ').replace(/\|/g, '/').trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}

// totais separados por unidade: somar KG com UND não faz sentido
function totaisPorUnidade(rel: RelatorioConferencia) {
  const acc: Record<string, { sis: number; fis: number }> = {}
  for (const l of rel.linhas) {
    const t = (acc[l.tipoContagem] ??= { sis: 0, fis: 0 })
    t.sis += l.sistema
    t.fis += l.fisico
  }
  return Object.entries(acc)
    .map(([un, t]) => `${un} sis=${fmt(t.sis)} fis=${fmt(t.fis)} div=${fmtSinal(t.fis - t.sis)}`)
    .join('; ')
}

function blocoConferencia(rel: RelatorioConferencia): string {
  const { conferencia, linhas, locaisUsados } = rel
  const nomeLocal = new Map(locaisUsados.map((l) => [l.id, l.nome]))

  const cab = [`## ${conferencia.data}`]
  if (conferencia.nome) cab.push(limpar(conferencia.nome, 80))
  if (conferencia.observacao) cab.push(`obs: ${limpar(conferencia.observacao)}`)

  const divergentes = linhas.filter((l) => Math.abs(l.divergencia) >= EPS).length
  const out = [
    cab.join(' | '),
    `tot: ${totaisPorUnidade(rel)} | itens=${linhas.length} divergentes=${divergentes}`,
  ]

  // só entram linhas completas para itens com divergência ou com observação
  const relevantes = linhas
    .filter((l) => Math.abs(l.divergencia) >= EPS || l.observacoes)
    .sort((a, b) => Math.abs(b.divergencia) - Math.abs(a.divergencia))

  for (const l of relevantes) {
    const locais = Object.entries(l.porLocal)
      .map(([id, v]) => `${nomeLocal.get(id) ?? '?'}:${fmt(v)}`)
      .join(';')
    out.push(
      [
        l.codigo ?? '',
        rotulo(l),
        l.tipoContagem,
        fmt(l.sistema),
        fmt(l.fisico),
        fmtSinal(l.divergencia),
        locais,
        limpar(l.observacoes),
      ].join('|')
    )
  }

  // itens sem divergência: só os nomes, em uma linha
  const ok = linhas.filter((l) => Math.abs(l.divergencia) < EPS && !l.observacoes)
  if (ok.length > 0) {
    const nomes = ok.slice(0, MAX_NOMES_OK).map(rotulo).join(', ')
    const resto = ok.length > MAX_NOMES_OK ? ` +${ok.length - MAX_NOMES_OK}` : ''
    out.push(`ok(${ok.length}): ${nomes}${resto}`)
  }

  return out.join('\n')
}

// itens com divergência em 2+ conferências, já calculado aqui para a IA não precisar cruzar
function linhaRecorrentes(relatorios: RelatorioConferencia[]): string | null {
  if (relatorios.length < 2) return null

  const mapa = new Map<string, { nome: string; vezes: number; soma: number }>()
  for (const rel of relatorios) {
    for (const l of rel.linhas) {
      if (Math.abs(l.divergencia) < EPS) continue
      const chave = `${l.marcaNome}__${l.nome}`
      const atual = mapa.get(chave) ?? { nome: rotulo(l), vezes: 0, soma: 0 }
      atual.vezes += 1
      atual.soma += l.divergencia
      mapa.set(chave, atual)
    }
  }

  const rec = [...mapa.values()]
    .filter((r) => r.vezes >= 2)
    .sort((a, b) => b.vezes - a.vezes || Math.abs(b.soma) - Math.abs(a.soma))
    .slice(0, 15)

  if (rec.length === 0) return 'recorrentes: nenhum'
  return `recorrentes: ${rec.map((r) => `${r.nome}(${r.vezes}x,${fmtSinal(r.soma)})`).join('; ')}`
}

/** Texto compacto enviado à IA. O formato é descrito no prompt do servidor (api/gerar-analise.ts). */
export function montarDadosAnalise(relatorios: RelatorioConferencia[]): string {
  return [...relatorios.map(blocoConferencia), linhaRecorrentes(relatorios)]
    .filter(Boolean)
    .join('\n\n')
}

export async function gerarAnalise(
  relatorios: RelatorioConferencia[],
  opcoes: { ignorarCache?: boolean } = {}
): Promise<string> {
  if (relatorios.length === 0) throw new Error('Selecione ao menos uma conferência.')
  if (relatorios.length > MAX_CONFERENCIAS) {
    throw new Error(`Selecione no máximo ${MAX_CONFERENCIAS} conferências para a análise.`)
  }

  const dados = montarDadosAnalise(relatorios)
  if (dados.length > MAX_PAYLOAD_CHARS) {
    throw new Error('Dados muito extensos para a análise. Selecione menos conferências.')
  }

  if (!opcoes.ignorarCache && cache.has(dados)) return cache.get(dados)!

  if (!navigator.onLine) throw new Error('Sem conexão. A análise com IA precisa de internet.')

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Sessão expirada. Faça login novamente.')

  const res = await fetch('/api/gerar-analise', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ dados }),
  })

  if (res.status === 404) {
    throw new Error('Rota /api/gerar-analise não encontrada. Em desenvolvimento, rode com "vercel dev".')
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Erro ${res.status} ao gerar análise.`)

  if (import.meta.env.DEV) {
    console.info(`[análise IA] ${dados.length} chars enviados | tokens:`, json.uso)
  }

  cache.set(dados, json.analise)
  return json.analise as string
}