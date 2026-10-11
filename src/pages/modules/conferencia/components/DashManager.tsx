// src/modules/conferencia/components/DashboardManager.tsx
import { useMemo, useState } from 'react'
import { ClipboardList, Package, Scale, type LucideIcon } from 'lucide-react'
import { useOfflineList } from '../../../../hooks/useOfflineList'
import { conferenciasRepository } from '../../../modules/conferencia/repositories/conferenciaRepository'
import { registrosRepository } from '../../../modules/conferencia/repositories/registrosRespoitory'
import { contagensRepository } from '../../../modules/conferencia/repositories/contagensRepository'
import { itensRepository } from '../../../modules/conferencia/repositories/itensRepository'
import { marcasRepository } from '../../../modules/conferencia/repositories/marcasRepository'
import { locaisRepository } from '../../../modules/conferencia/repositories/locaisRepository'
import { CalendarioConferencias } from './dashboard-views/CalendarioConferencias'
import { GraficoSistemaEncontrado, type LinhaGrafico } from './dashboard-views/GraficoSistemaEncontrado'
import { GraficoPizzaLocais, type EstoqueLocal } from './dashboard-views/GraficoPizzaLocais'
import { formatarDataHora } from '../../../../lib/functions'

const formatarData = (iso: string) => iso.split('-').reverse().join('/')


function KpiCard({
  icon: Icon,
  titulo,
  valor,
  detalhe,
}: {
  icon: LucideIcon
  titulo: string
  valor: number
  detalhe?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{titulo}</span>
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
      </div>
      <p className="text-3xl font-semibold text-slate-900 mt-3 tabular-nums">{valor.toLocaleString('pt-BR')}</p>
      {detalhe && <p className="text-xs text-slate-400 mt-1">{detalhe}</p>}
    </div>
  )
}

export default function DashboardManager() {
  const { data: conferencias, loading: l1 } = useOfflineList(conferenciasRepository, 'conf_conferencia')
  const { data: registros, loading: l2 } = useOfflineList(registrosRepository, 'conf_registro')
  const { data: contagens, loading: l3 } = useOfflineList(contagensRepository, 'conf_contagem')
  const { data: itens, loading: l4 } = useOfflineList(itensRepository, 'conf_item')
  const { data: marcas, loading: l5 } = useOfflineList(marcasRepository, 'conf_marca_item')
  const { data: locais, loading: l6 } = useOfflineList(locaisRepository, 'conf_local_contagem')

  const [selecionadaId, setSelecionadaId] = useState<string | null>(null)
  const [mesManual, setMesManual] = useState<{ ano: number; mes: number } | null>(null)

  // mais recentes primeiro (datas ISO ordenam como texto)
  const conferenciasOrdenadas = useMemo(
    () => [...conferencias].sort((a, b) => b.data.localeCompare(a.data)),
    [conferencias]
  )

  // sem seleção explícita (ou se a selecionada sumiu), usa a mais recente
  const conferenciaSelecionada =
    conferenciasOrdenadas.find((c) => c.id === selecionadaId) ?? conferenciasOrdenadas[0] ?? null

  // --- KPIs ---
  const itensConferidos = useMemo(() => new Set(registros.map((r) => r.item)).size, [registros])
  const mediaPesagens = conferencias.length > 0 ? contagens.length / conferencias.length : 0

  // --- Calendário ---
  const diasComConferencia = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of conferencias) map.set(c.data, (map.get(c.data) ?? 0) + 1)
    return map
  }, [conferencias])

  const hoje = new Date()
  const mesBase = conferenciaSelecionada
    ? {
        ano: Number(conferenciaSelecionada.data.slice(0, 4)),
        mes: Number(conferenciaSelecionada.data.slice(5, 7)) - 1,
      }
    : { ano: hoje.getFullYear(), mes: hoje.getMonth() }
  const mesVisivel = mesManual ?? mesBase // o calendário acompanha a conferência até o usuário navegar

  const mudarMes = (delta: number) => {
    const d = new Date(mesVisivel.ano, mesVisivel.mes + delta, 1)
    setMesManual({ ano: d.getFullYear(), mes: d.getMonth() })
  }

  const selecionarDia = (dataIso: string) => {
    const doDia = conferenciasOrdenadas.filter((c) => c.data === dataIso)
    if (doDia.length === 0) return
    // vários no mesmo dia: cada clique avança para a próxima
    const atual = doDia.findIndex((c) => c.id === conferenciaSelecionada?.id)
    setSelecionadaId(doDia[(atual + 1) % doDia.length].id)
    setMesManual(null)
  }

  const selecionarConferencia = (id: string) => {
    setSelecionadaId(id)
    setMesManual(null)
  }

  // --- Lookups O(1) e somas numa passada só ---
  const itensMap = useMemo(() => new Map(itens.map((i) => [i.id, i] as const)), [itens])
  const marcasMap = useMemo(() => new Map(marcas.map((m) => [m.id, m] as const)), [marcas])
  const locaisMap = useMemo(() => new Map(locais.map((l) => [l.id, l] as const)), [locais])
  const registrosMap = useMemo(() => new Map(registros.map((r) => [r.id, r] as const)), [registros])

  const fisicoPorRegistro = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of contagens) map.set(c.registro, (map.get(c.registro) ?? 0) + c.contagem)
    return map
  }, [contagens])

  // --- Gráfico de barras: itens da conferência selecionada ---
  const linhasGrafico = useMemo<LinhaGrafico[]>(() => {
    if (!conferenciaSelecionada) return []

    return registros
      .filter((r) => r.conferencia === conferenciaSelecionada.id)
      .map((r): LinhaGrafico => {
        const item = itensMap.get(r.item)
        const marca = item?.marca ? marcasMap.get(item.marca) : undefined
        const fisico = fisicoPorRegistro.get(r.id) ?? 0

        return {
          id: r.id,
          nome: item ? (marca ? `${marca.nome} ${item.nome}` : item.nome) : 'Item removido',
          unidade: item?.tipo_contagem ?? 'KG',
          sistema: r.qtd_sistema,
          fisico,
          divergencia: fisico - r.qtd_sistema,
        }
      })
  }, [conferenciaSelecionada, registros, itensMap, marcasMap, fisicoPorRegistro])

  const opcoesConferencia = useMemo(
    () =>
      conferenciasOrdenadas.map((c) => ({
        id: c.id,
        rotulo: `${formatarDataHora(c.created_at)}${c.nome ? ` — ${c.nome}` : ''}`,
        data: c.data
      })),
    [conferenciasOrdenadas]
  )

  // --- Pizza: quantidade contada por local (todas as conferências), separada por unidade ---
  const estoquePorLocal = useMemo<EstoqueLocal[]>(() => {
    const acumulado = new Map<string, EstoqueLocal>()

    for (const c of contagens) {
      const registro = registrosMap.get(c.registro)
      if (!registro) continue // contagem sem registro (órfã)

      const unidade = itensMap.get(registro.item)?.tipo_contagem ?? 'KG'
      const chave = `${c.local}|${unidade}`
      const atual = acumulado.get(chave) ?? {
        id: chave,
        nome: locaisMap.get(c.local)?.nome ?? 'Local removido',
        unidade,
        valor: 0,
      }
      atual.valor += c.contagem
      acumulado.set(chave, atual)
    }

    return [...acumulado.values()]
  }, [contagens, registrosMap, itensMap, locaisMap])

  if ([l1, l2, l3, l4, l5, l6].some(Boolean)) {
    return <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>
  }

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-0.5">Visão geral das conferências</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={ClipboardList}
          titulo="Conferências"
          valor={conferencias.length}
          detalhe={conferenciasOrdenadas[0] ? `Última em ${formatarData(conferenciasOrdenadas[0].data)}` : undefined}
        />
        <KpiCard
          icon={Scale}
          titulo="Pesagens"
          valor={contagens.length}
          detalhe={
            conferencias.length > 0
              ? `${mediaPesagens.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por conferência`
              : undefined
          }
        />
        <KpiCard icon={Package} titulo="Itens" valor={itens.length} detalhe={`${itensConferidos} já conferidos`} />
      </div>

      <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start min-w-0">
        <div className="space-y-6 min-w-0">
          <CalendarioConferencias
            ano={mesVisivel.ano}
            mes={mesVisivel.mes}
            diasComConferencia={diasComConferencia}
            diaSelecionado={conferenciaSelecionada?.data ?? null}
            onMudarMes={mudarMes}
            onSelecionarDia={selecionarDia}
          />
          <GraficoPizzaLocais dados={estoquePorLocal} />
        </div>

        <GraficoSistemaEncontrado
          opcoes={opcoesConferencia}
          selecionadaId={conferenciaSelecionada?.id ?? null}
          dataConferenciaSelecionada={conferenciaSelecionada?.data ?? null}
          onSelecionar={selecionarConferencia}
          linhas={linhasGrafico}
        />
      </div>
    </div>
  )
}