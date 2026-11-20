// src/modules/conferencia/components/DashManager.tsx
import { useEffect, useMemo, useState } from 'react'
import { useOfflineList } from '../../../../hooks/useOfflineList'
import { conferenciasRepository } from '../repositories/conferenciaRepository'
import { registrosRepository } from '../repositories/registrosRespoitory'
import { contagensRepository } from '../repositories/contagensRepository'
import { itensRepository } from '../../cadastros/repositories/itensRepository'
import { marcasRepository } from '../../cadastros/repositories/marcasRepository'
import { locaisRepository } from '../../cadastros/repositories/locaisRepository'
import { filiaisRepository } from '../../cadastros/repositories/filiaisRepository'
import { useFilialFiltro } from '../hooks/useFilialFiltro'
import { ehRapida } from '../types/Conferencia'
import { formatarDataHora } from '../../../../lib/functions'
import {
  dentroDoPeriodo,
  fmtData,
  fmtNum,
  fmtPct,
  fmtSinal,
  montarFatos,
  ordemCronologica,
  periodoAnterior,
  periodoDoPreset,
  resumirConferencias,
  resumirItens,
  totalizar,
  type Periodo,
  type Totais,
} from '../lib/dashboardMetricas'
import { FILTROS_PADRAO, FiltrosDashboard, type EstadoFiltros } from './dashboard-views/FiltrosDashboard'
import { usePadraoFiltro, batePadrao } from '../hooks/usePadraoFiltro'
import { modelosRepository } from '../repositories/modeloRepository'
import { KpiTile } from './dashboard-views/KpiTile'
import { GraficoTendencia } from './dashboard-views/GraficoTendencia'
import { RankingItens } from './dashboard-views/RankingItens'
import { ComparativoConferencias } from './dashboard-views/ComparativoConferencias'
import { GraficoSistemaEncontrado, type LinhaGrafico } from './dashboard-views/GraficoSistemaEncontrado'
import { COR } from './dashboard-views/dashCores'

const CHAVE_FILTROS = 'conf_dash_filtros'

function lerFiltros(): EstadoFiltros {
  try {
    const salvo = localStorage.getItem(CHAVE_FILTROS)
    if (!salvo) return FILTROS_PADRAO
    const { preset, custom, tolerancia } = { ...FILTROS_PADRAO, ...JSON.parse(salvo) }
    return { preset, custom, tolerancia }
  } catch {
    return FILTROS_PADRAO
  }
}

/** variação para o KpiTile; null quando não há período anterior comparável */
function variacao(atual: number | null, anterior: number | null, formatar: (d: number) => string, melhorQuando: 'sobe' | 'desce') {
  if (atual == null || anterior == null) return null
  const delta = atual - anterior
  return { delta, texto: `${formatar(delta)} vs anterior`, melhorQuando }
}

export default function DashboardManager() {
  const { data: todasConferencias, loading: l1 } = useOfflineList(conferenciasRepository, 'conf_conferencia')
  const { data: registros, loading: l2 } = useOfflineList(registrosRepository, 'conf_registro')
  const { data: contagens, loading: l3 } = useOfflineList(contagensRepository, 'conf_contagem')
  const { data: itens, loading: l4 } = useOfflineList(itensRepository, 'cad_item')
  const { data: marcas, loading: l5 } = useOfflineList(marcasRepository, 'cad_marca')
  const { data: locais, loading: l6 } = useOfflineList(locaisRepository, 'cad_local')
  const { data: filiais } = useOfflineList(filiaisRepository, 'cad_filial')
  const [filial, setFilial] = useFilialFiltro()
  const { data: padroes } = useOfflineList(modelosRepository, 'conf_modelo')
  const [padrao, setPadrao] = usePadraoFiltro()

  const [filtros, setFiltros] = useState<EstadoFiltros>(lerFiltros)
  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_FILTROS, JSON.stringify(filtros))
    } catch {
      // sem armazenamento: o filtro só não fica lembrado
    }
  }, [filtros])

  // Seleções independentes: mudar uma seção não mexe nas outras (nem no tamanho delas),
  // assim a página não "pula" quando o usuário troca a conferência lá embaixo.
  const [destaqueId, setDestaqueId] = useState<string | null>(null) // coluna marcada na evolução
  const [comparar, setComparar] = useState<{ a: string | null; b: string | null } | null>(null)
  const [detalheId, setDetalheId] = useState<string | null>(null) // Sistema × Encontrado

  const periodo = useMemo(() => periodoDoPreset(filtros.preset, filtros.custom), [filtros.preset, filtros.custom])
  const anterior = useMemo(() => periodoAnterior(periodo), [periodo])

  const daFilial = useMemo(
    // conferências rápidas ficam fora: itens digitados na hora não têm cadastro comum para comparar
    () => todasConferencias.filter((c) => !ehRapida(c) && (!filial || c.filial === filial) && batePadrao(c, padrao)),
    [todasConferencias, filial, padrao]
  )

  const recorte = (p: Periodo) => {
    const conferencias = daFilial.filter((c) => dentroDoPeriodo(c.data, p)).sort(ordemCronologica)
    const fatos = montarFatos(conferencias, registros, contagens, itens, marcas, filtros.tolerancia)
    const resumos = resumirConferencias(conferencias, fatos)
    return { conferencias, fatos, resumos, totais: totalizar(resumos) }
  }

  const atual = useMemo(
    () => recorte(periodo),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [daFilial, registros, contagens, itens, marcas, filtros.tolerancia, periodo]
  )
  const prev = useMemo<Totais | null>(
    () => (anterior ? recorte(anterior).totais : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [daFilial, registros, contagens, itens, marcas, filtros.tolerancia, anterior]
  )

  const itensResumo = useMemo(() => resumirItens(atual.fatos, atual.conferencias), [atual])
  const comPesagem = useMemo(() => atual.resumos.filter((r) => r.conferidos > 0), [atual.resumos])
  const ultimaId = comPesagem[comPesagem.length - 1]?.conferencia.id ?? null
  const existe = (id: string | null) => (id && comPesagem.some((r) => r.conferencia.id === id) ? id : null)
  const anteriorDe = (id: string | null) => {
    const i = comPesagem.findIndex((r) => r.conferencia.id === id)
    return i > 0 ? comPesagem[i - 1].conferencia.id : null
  }

  const destaque = existe(destaqueId)
  const detalhe = existe(detalheId) ?? ultimaId
  // comparação padrão: a penúltima contra a última conferência
  const compB = comparar ? existe(comparar.b) : ultimaId
  const compA = comparar ? existe(comparar.a) : anteriorDe(ultimaId)

  // clicar numa coluna da evolução leva a conferência para a comparação e para o detalhe
  const selecionarNaEvolucao = (id: string) => {
    setDestaqueId(id)
    setComparar({ a: anteriorDe(id), b: id })
    setDetalheId(id)
  }

  const resetarSelecoes = () => {
    setDestaqueId(null)
    setComparar(null)
    setDetalheId(null)
  }

  // ---------- Sistema × Encontrado ----------
  const linhasDetalhe = useMemo<LinhaGrafico[]>(() => {
    if (!detalhe) return []
    const nomesLocais = new Map(locais.map((l) => [l.id, l.nome] as const))
    const pesagens = new Map<string, LinhaGrafico['pesagens']>()
    for (const c of contagens) {
      const lista = pesagens.get(c.registro) ?? []
      lista.push({ id: c.id, localId: c.local, localNome: nomesLocais.get(c.local) ?? 'Local removido', valor: c.contagem })
      pesagens.set(c.registro, lista)
    }
    return atual.fatos
      .filter((f) => f.conferenciaId === detalhe)
      .map((f) => ({
        id: f.registroId,
        nome: f.marcaNome ? `${f.marcaNome} ${f.itemNome}` : f.itemNome,
        unidade: f.unidade,
        sistema: f.sistema,
        fisico: f.fisico,
        divergencia: f.divergencia,
        pesagens: pesagens.get(f.registroId) ?? [],
      }))
  }, [detalhe, atual.fatos, contagens, locais])

  const opcoesDetalhe = useMemo(
    () =>
      [...comPesagem].reverse().map((r) => ({
        id: r.conferencia.id,
        rotulo: `${formatarDataHora(r.conferencia.created_at)}${r.conferencia.nome ? ` — ${r.conferencia.nome}` : ''}`,
        data: r.conferencia.data,
      })),
    [comPesagem]
  )

  if ([l1, l2, l3, l4, l5, l6].some(Boolean)) {
    return <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>
  }

  const t = atual.totais
  const textoPeriodo =
    periodo.inicio && periodo.fim
      ? `${fmtData(periodo.inicio)} a ${fmtData(periodo.fim)}`
      : periodo.inicio
        ? `desde ${fmtData(periodo.inicio)}`
        : periodo.fim
          ? `até ${fmtData(periodo.fim)}`
          : 'todo o histórico'
  const pts = (d: number) => `${d > 0 ? '+' : ''}${(d * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.`

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {textoPeriodo} · {t.conferencias} {t.conferencias === 1 ? 'conferência' : 'conferências'}
          </p>
        </div>
        <FiltrosDashboard
          filtros={filtros}
          onChange={(f) => {
            setFiltros(f)
            resetarSelecoes()
          }}
          filiais={filiais}
          filial={filial}
          onFilial={(id) => {
            setFilial(id)
            resetarSelecoes()
          }}
          padroes={padroes}
          padrao={padrao}
          onPadrao={(id) => {
            setPadrao(id)
            resetarSelecoes()
          }}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          titulo="Acuracidade"
          valor={fmtPct(t.acuracidade)}
          detalhe={`${t.ok} de ${t.conferidos} itens`}
          variacao={variacao(t.acuracidade, prev?.acuracidade ?? null, pts, 'sobe')}
        />
        <KpiTile
          titulo="Erro total (kg)"
          valor={fmtNum(t.absoluta, 1)}
          detalhe={t.conferidos > 0 ? `${fmtNum(t.absoluta / t.conferidos)} por item` : undefined}
          variacao={variacao(t.absoluta, prev?.absoluta ?? null, (d) => fmtSinal(d, 1), 'desce')}
        />
        <KpiTile
          titulo="Falta (kg)"
          marcador={COR.falta}
          valor={fmtNum(t.faltaTotal, 1)}
          detalhe={`${t.falta} ${t.falta === 1 ? 'item' : 'itens'}`}
          variacao={variacao(t.faltaTotal, prev?.faltaTotal ?? null, (d) => fmtSinal(d, 1), 'desce')}
        />
        <KpiTile
          titulo="Sobra (kg)"
          marcador={COR.sobra}
          valor={fmtNum(t.sobraTotal, 1)}
          detalhe={`${t.sobra} ${t.sobra === 1 ? 'item' : 'itens'}`}
          variacao={variacao(t.sobraTotal, prev?.sobraTotal ?? null, (d) => fmtSinal(d, 1), 'desce')}
        />
      </div>

      <GraficoTendencia resumos={atual.resumos} selecionadaId={destaque} onSelecionar={selecionarNaEvolucao} unidade="KG" />

      <div className="grid xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-5 items-start">
        <RankingItens itens={itensResumo} />
        <ComparativoConferencias
          resumos={atual.resumos}
          fatos={atual.fatos}
          aId={compA}
          bId={compB}
          onChange={(a, b) => setComparar({ a, b })}
        />
      </div>

      <GraficoSistemaEncontrado
        opcoes={opcoesDetalhe}
        selecionadaId={detalhe}
        onSelecionar={setDetalheId}
        linhas={linhasDetalhe}
      />
    </div>
  )
}
