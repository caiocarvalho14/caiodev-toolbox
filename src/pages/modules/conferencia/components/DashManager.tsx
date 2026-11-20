// src/modules/conferencia/components/DashManager.tsx
// Dashboard focado nas duas últimas conferências:
//   1. Panorama da última (ou da escolhida)
//   2. Comparação com a anterior (do mesmo padrão, quando houver)
//   3. Todos os itens dessa conferência (Sistema × Encontrado)
//   4. Histórico do período (evolução e itens que mais divergem)
import { useEffect, useMemo, useState } from 'react'
import { useOfflineList } from '../../../../hooks/useOfflineList'
import { conferenciasRepository } from '../repositories/conferenciaRepository'
import { registrosRepository } from '../repositories/registrosRespoitory'
import { contagensRepository } from '../repositories/contagensRepository'
import { itensRepository } from '../../cadastros/repositories/itensRepository'
import { marcasRepository } from '../../cadastros/repositories/marcasRepository'
import { locaisRepository } from '../../cadastros/repositories/locaisRepository'
import { filiaisRepository } from '../../cadastros/repositories/filiaisRepository'
import { usuariosRepository, nomeDoUsuario } from '../repositories/usuariosRepository'
import { modelosRepository } from '../repositories/modeloRepository'
import { useFilialFiltro } from '../hooks/useFilialFiltro'
import { usePadraoFiltro, batePadrao } from '../hooks/usePadraoFiltro'
import { ehRapida, type Conferencia } from '../types/Conferencia'
import { formatarDataHora } from '../../../../lib/functions'
import { temposPorConferencia, formatarDuracao } from '../lib/tempoConferencia'
import {
  dentroDoPeriodo,
  fmtData,
  montarFatos,
  ordemCronologica,
  periodoDoPreset,
  resumirConferencias,
  resumirItens,
} from '../lib/dashboardMetricas'
import { FILTROS_PADRAO, FiltrosBase, FiltroPeriodo, type EstadoFiltros } from './dashboard-views/FiltrosDashboard'
import { PanoramaConferencia } from './dashboard-views/PanoramaConferencia'
import { ComparacaoUltimas } from './dashboard-views/ComparacaoUltimas'
import { GraficoTendencia } from './dashboard-views/GraficoTendencia'
import { RankingItens } from './dashboard-views/RankingItens'
import { GraficoSistemaEncontrado, type LinhaGrafico } from './dashboard-views/GraficoSistemaEncontrado'

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

const rotuloConferencia = (c: Conferencia) =>
  `${formatarDataHora(c.created_at)}${c.nome?.trim() ? ` — ${c.nome.trim()}` : ''}`

export default function DashboardManager() {
  const { data: todasConferencias, loading: l1 } = useOfflineList(conferenciasRepository, 'conf_conferencia')
  const { data: registros, loading: l2 } = useOfflineList(registrosRepository, 'conf_registro')
  const { data: contagens, loading: l3 } = useOfflineList(contagensRepository, 'conf_contagem')
  const { data: itens, loading: l4 } = useOfflineList(itensRepository, 'cad_item')
  const { data: marcas, loading: l5 } = useOfflineList(marcasRepository, 'cad_marca')
  const { data: locais, loading: l6 } = useOfflineList(locaisRepository, 'cad_local')
  const { data: filiais } = useOfflineList(filiaisRepository, 'cad_filial')
  const { data: usuarios } = useOfflineList(usuariosRepository, 'sistema_usuario')
  const { data: padroes } = useOfflineList(modelosRepository, 'conf_modelo')
  const [filial, setFilial] = useFilialFiltro()
  const [padrao, setPadrao] = usePadraoFiltro()

  const [filtros, setFiltros] = useState<EstadoFiltros>(lerFiltros)
  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_FILTROS, JSON.stringify(filtros))
    } catch {
      // sem armazenamento: o filtro só não fica lembrado
    }
  }, [filtros])

  // conferência do panorama; null = a mais recente
  const [escolhidaId, setEscolhidaId] = useState<string | null>(null)

  // conferências rápidas ficam fora: itens digitados na hora não têm cadastro comum para comparar
  const base = useMemo(
    () =>
      todasConferencias
        .filter((c) => !ehRapida(c) && (!filial || c.filial === filial) && batePadrao(c, padrao))
        .sort(ordemCronologica),
    [todasConferencias, filial, padrao]
  )

  // todo o histórico do filtro: panorama e comparação não dependem do período
  const fatosTodos = useMemo(
    () => montarFatos(base, registros, contagens, itens, marcas, filtros.tolerancia),
    [base, registros, contagens, itens, marcas, filtros.tolerancia]
  )
  const resumosTodos = useMemo(() => resumirConferencias(base, fatosTodos), [base, fatosTodos])
  const comPesagem = useMemo(() => resumosTodos.filter((r) => r.conferidos > 0), [resumosTodos])
  const tempos = useMemo(() => temposPorConferencia(registros, contagens), [registros, contagens])

  const atualRes =
    comPesagem.find((r) => r.conferencia.id === escolhidaId) ?? comPesagem[comPesagem.length - 1] ?? null
  // anterior: a última antes dela do MESMO padrão (reconferências e outros padrões não servem de base);
  // sem padrão, a imediatamente anterior
  const anteriorRes = useMemo(() => {
    if (!atualRes) return null
    const i = comPesagem.indexOf(atualRes)
    const anteriores = comPesagem.slice(0, i).reverse()
    const p = atualRes.conferencia.padrao
    return (p ? anteriores.find((r) => r.conferencia.padrao === p) : null) ?? anteriores[0] ?? null
  }, [atualRes, comPesagem])

  const fatosDe = (id: string | undefined) => (id ? fatosTodos.filter((f) => f.conferenciaId === id) : [])
  const fatosAtual = useMemo(() => fatosDe(atualRes?.conferencia.id), [atualRes, fatosTodos]) // eslint-disable-line react-hooks/exhaustive-deps
  const fatosAnterior = useMemo(() => fatosDe(anteriorRes?.conferencia.id), [anteriorRes, fatosTodos]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- histórico do período ----------
  const periodo = useMemo(() => periodoDoPreset(filtros.preset, filtros.custom), [filtros.preset, filtros.custom])
  const historico = useMemo(() => {
    const ids = new Set(base.filter((c) => dentroDoPeriodo(c.data, periodo)).map((c) => c.id))
    const resumos = resumosTodos.filter((r) => ids.has(r.conferencia.id))
    const fatos = fatosTodos.filter((f) => ids.has(f.conferenciaId))
    return { resumos, itens: resumirItens(fatos, resumos.map((r) => r.conferencia)) }
  }, [base, periodo, resumosTodos, fatosTodos])

  // ---------- Sistema × Encontrado da conferência do panorama ----------
  const linhasDetalhe = useMemo<LinhaGrafico[]>(() => {
    if (!atualRes) return []
    const nomesLocais = new Map(locais.map((l) => [l.id, l.nome] as const))
    const doRegistro = new Set(fatosAtual.map((f) => f.registroId))
    const pesagens = new Map<string, LinhaGrafico['pesagens']>()
    for (const c of contagens) {
      if (!doRegistro.has(c.registro)) continue
      const lista = pesagens.get(c.registro) ?? []
      lista.push({ id: c.id, localId: c.local, localNome: nomesLocais.get(c.local) ?? 'Local removido', valor: c.contagem })
      pesagens.set(c.registro, lista)
    }
    return fatosAtual.map((f) => ({
      id: f.registroId,
      nome: f.marcaNome ? `${f.marcaNome} ${f.itemNome}` : f.itemNome,
      unidade: f.unidade,
      sistema: f.sistema,
      fisico: f.fisico,
      divergencia: f.divergencia,
      pesagens: pesagens.get(f.registroId) ?? [],
    }))
  }, [atualRes, fatosAtual, contagens, locais])

  const opcoes = useMemo(
    () =>
      [...comPesagem].reverse().map((r) => ({
        id: r.conferencia.id,
        rotulo: rotuloConferencia(r.conferencia),
        data: r.conferencia.data,
      })),
    [comPesagem]
  )

  const escolher = (id: string) => {
    setEscolhidaId(id)
    requestAnimationFrame(() => document.getElementById('dash-topo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  if ([l1, l2, l3, l4, l5, l6].some(Boolean)) {
    return <div className="text-center py-16 text-slate-500 text-sm">Carregando...</div>
  }

  const ultimaId = comPesagem[comPesagem.length - 1]?.conferencia.id
  const meta = atualRes && {
    quando: formatarDataHora(atualRes.conferencia.created_at),
    filial: filiais.find((f) => f.id === atualRes.conferencia.filial)?.nome ?? null,
    padrao: padroes.find((p) => p.id === atualRes.conferencia.padrao)?.nome ?? null,
    criador: nomeDoUsuario(usuarios, atualRes.conferencia.criador_id),
    tempo: tempos.get(atualRes.conferencia.id) ? formatarDuracao(tempos.get(atualRes.conferencia.id)!.ms) : null,
  }

  const textoPeriodo =
    periodo.inicio && periodo.fim
      ? `${fmtData(periodo.inicio)} a ${fmtData(periodo.fim)}`
      : periodo.inicio
        ? `desde ${fmtData(periodo.inicio)}`
        : periodo.fim
          ? `até ${fmtData(periodo.fim)}`
          : 'todo o histórico'

  return (
    <div className="space-y-8 min-w-0">
      <div id="dash-topo" className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 scroll-mt-16">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {comPesagem.length} {comPesagem.length === 1 ? 'conferência pesada' : 'conferências pesadas'} neste filtro
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {opcoes.length > 0 && (
            <select
              aria-label="Conferência do panorama"
              value={atualRes?.conferencia.id ?? ''}
              onChange={(e) => setEscolhidaId(e.target.value === ultimaId ? null : e.target.value)}
              className="max-w-full sm:max-w-xs px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              {opcoes.map((o, i) => (
                <option key={o.id} value={o.id}>
                  {i === 0 ? `Última: ${o.rotulo}` : o.rotulo}
                </option>
              ))}
            </select>
          )}
          <FiltrosBase
            filiais={filiais}
            filial={filial}
            onFilial={(id) => {
              setFilial(id)
              setEscolhidaId(null)
            }}
            padroes={padroes}
            padrao={padrao}
            onPadrao={(id) => {
              setPadrao(id)
              setEscolhidaId(null)
            }}
            tolerancia={filtros.tolerancia}
            onTolerancia={(tolerancia) => setFiltros({ ...filtros, tolerancia })}
          />
        </div>
      </div>

      {!atualRes || !meta ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-white">
          <p className="text-slate-600 text-sm">Nenhuma conferência pesada com esses filtros.</p>
        </div>
      ) : (
        <>
          <PanoramaConferencia
            resumo={atualRes}
            fatos={fatosAtual}
            meta={meta}
            tolerancia={filtros.tolerancia}
            ehUltima={atualRes.conferencia.id === ultimaId}
          />

          {anteriorRes ? (
            <ComparacaoUltimas
              anterior={anteriorRes}
              atual={atualRes}
              fatosAnterior={fatosAnterior}
              fatosAtual={fatosAtual}
              tempoAnteriorMs={tempos.get(anteriorRes.conferencia.id)?.ms ?? null}
              tempoAtualMs={tempos.get(atualRes.conferencia.id)?.ms ?? null}
            />
          ) : (
            <p className="text-sm text-slate-600 rounded-xl bg-slate-100 px-4 py-3">
              Não há uma conferência anterior com esses filtros para comparar.
            </p>
          )}

          <GraficoSistemaEncontrado
            opcoes={opcoes}
            selecionadaId={atualRes.conferencia.id}
            onSelecionar={(id) => setEscolhidaId(id === ultimaId ? null : id)}
            linhas={linhasDetalhe}
          />
        </>
      )}

      <section aria-labelledby="historico-titulo" className="space-y-4 border-t border-slate-200 pt-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Histórico</p>
            <h3 id="historico-titulo" className="text-base font-semibold text-slate-900 mt-0.5">
              {textoPeriodo} · {historico.resumos.filter((r) => r.conferidos > 0).length} conferências
            </h3>
          </div>
          <FiltroPeriodo filtros={filtros} onChange={setFiltros} />
        </div>
        <GraficoTendencia
          resumos={historico.resumos}
          selecionadaId={atualRes?.conferencia.id ?? null}
          onSelecionar={escolher}
          unidade="KG"
        />
        <RankingItens itens={historico.itens} />
      </section>
    </div>
  )
}
