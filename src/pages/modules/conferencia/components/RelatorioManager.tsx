// src/modules/conferencia/components/RelatorioManager.tsx
import { useMemo, useState, useRef } from 'react'
import { FileDown, FileSpreadsheet, BarChart3, Sparkles, Loader2 } from 'lucide-react'
import { useOfflineList } from '../../../../hooks/useOfflineList'
import { conferenciasRepository } from '../../../modules/conferencia/repositories/conferenciaRepository'
import { registrosRepository } from '../../../modules/conferencia/repositories/registrosRespoitory'
import { contagensRepository } from '../../../modules/conferencia/repositories/contagensRepository'
import { itensRepository } from '../../../modules/conferencia/repositories/itensRepository'
import { marcasRepository } from '../../../modules/conferencia/repositories/marcasRepository'
import { locaisRepository } from '../../../modules/conferencia/repositories/locaisRepository'
import { montarRelatorio } from '../../../modules/conferencia/lib/relatorio'
import { exportarRelatorioPdf } from '../../../modules/conferencia/lib/exportarRelatorioPdf'
import { RelatorioTabela } from './relatorio-views/RelatorioTabela'
import { RelatorioInsights } from './relatorio-views/RelatorioInsights'
import { gerarAnalise } from '../lib/gerarAnalise'

export default function RelatorioManager() {
  const { data: conferencias, loading } = useOfflineList(conferenciasRepository, "conf_conferencia")
  const { data: registros } = useOfflineList(registrosRepository, "conf_registro")
  const { data: contagens } = useOfflineList(contagensRepository, "conf_contagem")
  const { data: itens } = useOfflineList(itensRepository, "conf_item")
  const { data: marcas } = useOfflineList(marcasRepository, "conf_marca_item")
  const { data: locais } = useOfflineList(locaisRepository, "conf_local_contagem")

  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())

  const [analise, setAnalise] = useState<string | null>(null)
  const [analisando, setAnalisando] = useState(false)
  const [erroAnalise, setErroAnalise] = useState<string | null>(null)
  const analiseIdRef = useRef(0) // descarta respostas de requisições que ficaram velhas

  const conferenciasOrdenadas = useMemo(
    () => [...conferencias].sort((a, b) => (a.data < b.data ? 1 : -1)),
    [conferencias]
  )

  const relatorios = useMemo(() => {
    return conferenciasOrdenadas
      .filter((c) => selecionadas.has(c.id))
      .sort((a, b) => (a.data < b.data ? -1 : 1))
      .map((c) => montarRelatorio(c, registros, contagens, itens, marcas, locais))
  }, [conferenciasOrdenadas, selecionadas, registros, contagens, itens, marcas, locais])

  const toggle = (id: string) => {
    setSelecionadas((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    // a seleção mudou: a análise anterior não vale mais
    analiseIdRef.current++
    setAnalise(null)
    setErroAnalise(null)
    setAnalisando(false)
  }

  const exportarPdf = () => {
    if (relatorios.length === 0) return
    exportarRelatorioPdf(relatorios)
  }

  const gerarAnaliseIA = async () => {
    if (relatorios.length === 0 || analisando) return

    const id = ++analiseIdRef.current
    setAnalisando(true)
    setErroAnalise(null)

    try {
      const texto = await gerarAnalise(relatorios, { ignorarCache: analise !== null })
      if (id !== analiseIdRef.current) return
      setAnalise(texto)
    } catch (err) {
      if (id !== analiseIdRef.current) return
      setErroAnalise(err instanceof Error ? err.message : 'Erro ao gerar análise.')
    } finally {
      if (id === analiseIdRef.current) setAnalisando(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6 min-w-0">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 h-fit lg:sticky lg:top-24 min-w-0">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Conferências</h3>
        {loading ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : conferenciasOrdenadas.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma conferência cadastrada.</p>
        ) : (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {conferenciasOrdenadas.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={selecionadas.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="rounded border-slate-300 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block text-slate-900 font-medium truncate">
                    {c.nome || new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-slate-900">Relatório</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {selecionadas.size === 0
                ? 'Selecione uma ou mais conferências'
                : `${selecionadas.size} ${selecionadas.size === 1 ? 'conferência selecionada' : 'conferências selecionadas'}`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={gerarAnaliseIA}
              // disabled={relatorios.length === 0 || analisando}
              disabled
              title="Gera uma análise dos dados selecionados com IA"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:border-slate-300 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              {analisando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {analisando ? 'Analisando...' : analise ? 'Gerar novamente' : 'Análise com IA'}
            </button>

            <button
              disabled
              title="Em breve — exportação em Excel de uma conferência por vez"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-400 text-sm font-medium cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
            </button>

            <button
              onClick={exportarPdf}
              disabled={relatorios.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              Exportar PDF
            </button>

          </div>
        </div>

        {relatorios.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl bg-white">
            <BarChart3 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">Selecione ao menos uma conferência para ver o relatório.</p>
          </div>
        ) : (
          <>
            <RelatorioInsights relatorios={relatorios} />
            {relatorios.map((r) => (
              <RelatorioTabela key={r.conferencia.id} relatorio={r} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}