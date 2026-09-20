// src/modules/conferencia/components/conferencia-views/ContagensDetalhe.tsx
import { useState , useEffect } from 'react'
import { Minus, Plus, Trash2, Scale, Save } from 'lucide-react'
import { useToast } from '../../../../../hooks/useToast'
import { useOfflineList } from '../../../../../hooks/useOfflineList'
import { registrosRepository } from '../../../../modules/conferencia/repositories/registrosRespoitory'
import { contagensRepository } from '../../../../modules/conferencia/repositories/contagensRepository'
import { itensRepository } from '../../../../modules/conferencia/repositories/itensRepository'
import { marcasRepository } from '../../../../modules/conferencia/repositories/marcasRepository'
import { locaisRepository } from '../../../../modules/conferencia/repositories/locaisRepository'
import type { RegistroConferencia } from '../../../../modules/conferencia/types/registro'

interface Props {
  registro: RegistroConferencia
}

export default function ContagensDetalhe({ registro: registroProp }: Props) {
  const { data: registros, reload: reloadRegistros } = useOfflineList(registrosRepository, "conf_registro")
  const { data: todasContagens, loading, reload: reloadContagens } = useOfflineList(contagensRepository, "conf_contagem")
  const { data: itens } = useOfflineList(itensRepository)
  const { data: marcas } = useOfflineList(marcasRepository)
  const { data: locais } = useOfflineList(locaisRepository)

  const registro = registros.find((r) => r.id === registroProp.id) ?? registroProp
  const contagens = todasContagens.filter((c) => c.registro === registro.id)

  const item = itens.find((i) => i.id === registro.item)
  const marca = item?.marca ? marcas.find((m) => m.id === item.marca) : null
  const taraPadrao = marca?.tara_emb ?? 0

  // Nova pesagem
  const [quantidade, setQuantidade] = useState(0)
  const [tipoContagem, setTipoContagem] = useState<'KG' | 'UND'>('KG')
  const [taraValor, setTaraValor] = useState(taraPadrao)
  const [taraQtd, setTaraQtd] = useState(1)
  const [localSelecionado, setLocalSelecionado] = useState(locais[0]?.id ?? '')
  const [registrando, setRegistrando] = useState(false)

  // sempre que trocar de item/registro, reseta a tara sugerida pra o padrão da marca
  useEffect(() => {
    setTaraValor(taraPadrao)
  }, [taraPadrao])

  const [observacoes, setObservacoes] = useState(registro.observacoes || '')
  const [qtdSistema, setQtdSistema] = useState(String(registro.qtd_sistema))
  const [salvandoInfo, setSalvandoInfo] = useState(false)

  const { toast } = useToast()

  const qtdFisico = contagens.reduce((sum, c) => sum + c.contagem, 0)
  const divergencia = qtdFisico - registro.qtd_sistema
  const taraTotal = Math.round(taraValor * taraQtd * 100) / 100

  const localNome = (id: string) => locais.find((l) => l.id === id)?.nome || 'Local removido'

  const ajustarTara = (delta: number) => {
    setTaraValor((prev) => Math.max(0, Math.round((prev + delta) * 10) / 10))
  }

  const registrarContagem = async (valor: number) => {
    if (!localSelecionado) {
      toast({ variant: 'destructive', title: 'Selecione um local' })
      return
    }
    if (valor <= 0) {
      toast({ variant: 'destructive', title: 'Informe uma quantidade válida' })
      return
    }

    try {
      setRegistrando(true)
      await contagensRepository.save({
        registro: registro.id,
        local: localSelecionado,
        contagem: Math.round(valor * 100) / 100,
        tipo_contagem: tipoContagem,
      })
      setQuantidade(0)
      await reloadContagens()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar pesagem',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setRegistrando(false)
    }
  }

  const removerContagem = async (id: string) => {
    await contagensRepository.remove(id)
    await reloadContagens()
  }

  const salvarInfo = async () => {
    try {
      setSalvandoInfo(true)
      await registrosRepository.save({
        id: registro.id,
        item: registro.item,
        qtd_sistema: Number(qtdSistema) || 0,
        observacoes: observacoes || null,
        data: registro.data,
        conferencia: registro.conferencia,
      })
      toast({ title: 'Registro atualizado' })
      await reloadRegistros()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSalvandoInfo(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do item */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">{item?.nome ?? 'Item removido'}</h2>
        {marca && (
          <p className="text-sm text-slate-500 mt-0.5">
            {marca.nome}
            {taraPadrao > 0 ? ` · tara padrão ${taraPadrao} kg` : ''}
          </p>
        )}

        <div className="grid sm:grid-cols-3 gap-4 mt-5">
          <div>
            <label htmlFor="qtd_sistema" className="block text-xs font-medium text-slate-500 mb-1">
              Sistema
            </label>
            <input
              id="qtd_sistema"
              type="number"
              step="0.1"
              value={qtdSistema}
              onChange={(e) => setQtdSistema(e.target.value)}
              onBlur={salvarInfo}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Físico (soma)</label>
            <div className="px-3 py-2 rounded-lg bg-slate-50 text-sm font-medium text-slate-900">
              {qtdFisico.toFixed(2)}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Divergência</label>
            <div
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                Math.abs(divergencia) < 0.001
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {divergencia > 0 ? '+' : ''}
              {divergencia.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="observacoes" className="block text-xs font-medium text-slate-500 mb-1">
            Observações
          </label>
          <div className="flex gap-2">
            <textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Opcional"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 resize-none"
            />
            <button
              onClick={salvarInfo}
              disabled={salvandoInfo}
              title="Salvar observação"
              className="shrink-0 h-fit px-3 py-2 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Nova pesagem */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-1.5">
          <Scale className="w-4 h-4" />
          Nova pesagem
        </h3>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="local" className="block text-xs font-medium text-slate-500 mb-1">
              Local
            </label>
            <select
              id="local"
              value={localSelecionado}
              onChange={(e) => setLocalSelecionado(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            >
              <option value="">Selecione</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tipo_contagem" className="block text-xs font-medium text-slate-500 mb-1">
              Tipo
            </label>
            <select
              id="tipo_contagem"
              value={tipoContagem}
              onChange={(e) => setTipoContagem(e.target.value as 'KG' | 'UND')}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            >
              <option value="KG">KG</option>
              <option value="UND">UND</option>
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="quantidade" className="block text-xs font-medium text-slate-500 mb-1">
              Quantidade ({tipoContagem})
            </label>
            <input
              id="quantidade"
              type="number"
              step="1"
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tara</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => ajustarTara(-0.1)}
                  className="px-2.5 py-2.5 text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  step="0.1"
                  value={taraValor}
                  onChange={(e) => setTaraValor(Number(e.target.value))}
                  className="w-16 text-center px-1 py-2.5 text-sm font-medium text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => ajustarTara(0.1)}
                  className="px-2.5 py-2.5 text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-slate-400 text-sm">x</span>
              <input
                type="number"
                step="1"
                min="0"
                value={taraQtd}
                onChange={(e) => setTaraQtd(Number(e.target.value))}
                title="Quantidade de embalagens"
                className="w-14 text-center px-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
              />
            </div>
            {taraTotal > 0 && (
              <p className="text-xs text-slate-400 mt-1">Tara total: {taraTotal.toFixed(2)}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={() => registrarContagem(quantidade)}
            disabled={registrando}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:border-slate-300 transition-colors disabled:opacity-50"
          >
            Registrar bruto
          </button>
          <button
            onClick={() => registrarContagem(quantidade - taraTotal)}
            disabled={registrando || quantidade == 0}
            title={taraTotal > 0 ? `Desconta ${taraTotal.toFixed(2)} no total` : 'Sem tara informada'}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Registrar líquido {(quantidade > 0 ? `(${quantidade - taraTotal})` : "")}
          </button>
        </div>
      </div>

      {/* Pesagens registradas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          Pesagens ({contagens.length})
        </h3>

        {loading ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : contagens.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma pesagem registrada ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {contagens.map((c) => (
              <span
                key={c.id}
                className="group inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-slate-100 text-sm text-slate-700"
              >
                <span className="font-medium">
                  {c.contagem} {c.tipo_contagem}
                </span>
                <span className="text-slate-400">· {localNome(c.local)}</span>
                <button
                  onClick={() => removerContagem(c.id)}
                  className="ml-0.5 p-0.5 rounded-full text-slate-400 sm:opacity-0 group-hover:opacity-100 hover:bg-slate-200 hover:text-red-600 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}