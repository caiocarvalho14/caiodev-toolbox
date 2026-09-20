// src/modules/conferencia/components/conferencia-views/RegistrosLista.tsx
import { useState } from 'react'
import { Plus, ClipboardList, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useToast } from '../../../../../hooks/useToast'
import { Modal } from '../../../../../components/ui/Modal'
import { useOfflineList } from '../../../../../hooks/useOfflineList'
import { registrosRepository } from '../../../../modules/conferencia/repositories/registrosRespoitory.ts'
import { contagensRepository } from '../../../../modules/conferencia/repositories/contagensRepository'
import { itensRepository } from '../../../../modules/conferencia/repositories/itensRepository'
import { marcasRepository } from '../../repositories/marcasRepository.ts'
import type { Conferencia } from '../../../../modules/conferencia/types/Conferencia'
import type { MarcaItem } from '../../types/Marcas.ts'
import type { RegistroConferencia } from '../../../../modules/conferencia/types/registro'

const empty = { item: '', qtd_sistema: '', observacoes: '', data: new Date().toISOString().slice(0, 10) }

interface Props {
  conferencia: Conferencia
  onSelect: (registro: RegistroConferencia) => void
}

export default function RegistrosLista({ conferencia, onSelect }: Props) {
  const { data: todosRegistros, loading, reload } = useOfflineList(registrosRepository, "conf_registro")
  const { data: contagens } = useOfflineList(contagensRepository, "conf_contagem")
  const { data: itens } = useOfflineList(itensRepository)
  const { data: marcas } = useOfflineList(marcasRepository)

  const registros = todosRegistros.filter((r) => r.conferencia === conferencia.id)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // 1. Função para encontrar o objeto completo do item pelo ID
  const getItem = (itemId: string) => itens.find((i) => i.id === itemId)

  // 2. Função para pegar o nome do item
  const itemNome = (itemId: string) => getItem(itemId)?.nome || 'Item não encontrado'

  // 3. Função para pegar o nome da marca a partir do ID do item
  const itemMarcaPorItemId = (itemId: string) => {
    const item = getItem(itemId)
    if (!item || !item.marca) return 'Sem marca'

    const marca = marcas.find((m) => m.id === item.marca)
    return marca?.nome || 'Marca não encontrada'
  }

  const qtdFisico = (registroId: string) =>
    contagens.filter((c) => c.registro === registroId).reduce((sum, c) => sum + c.contagem, 0)

  const openNew = () => {
    setForm(empty)
    setOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.item) {
      toast({ variant: 'destructive', title: 'Selecione um item' })
      return
    }
    if (!form.qtd_sistema.trim()) {
      toast({ variant: 'destructive', title: 'Quantidade no sistema é obrigatória' })
      return
    }

    try {
      setSaving(true)
      await registrosRepository.save({
        item: form.item,
        qtd_sistema: Number(form.qtd_sistema),
        observacoes: form.observacoes || null,
        data: form.data,
        conferencia: conferencia.id,
      })
      toast({ title: 'Registro criado' })
      setOpen(false)
      await reload()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Registros</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {registros.length} {registros.length === 1 ? 'registro' : 'registros'} nesta conferência
          </p>
        </div>
        <button
          onClick={openNew}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-colors hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" />
          Novo registro
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>
      ) : registros.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl bg-white">
          <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">Nenhum registro criado ainda.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm text-slate-600 min-w-[600px]">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Marca</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">Qtd. Sistema</th>
                <th className="px-4 py-3 text-right">Qtd. Físico</th>
                <th className="px-4 py-3">Status / Divergência</th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registros.map((r) => {
                const fisico = qtdFisico(r.id)
                const divergencia = fisico - r.qtd_sistema
                const ok = Math.abs(divergencia) < 0.001

                return (
                  <tr
                    key={r.id}
                    onClick={() => onSelect(r)}
                    className="group cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 max-w-[200px] truncate">
                      {itemMarcaPorItemId(r.item)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 max-w-[200px] truncate">
                      {itemNome(r.item)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {r.qtd_sistema}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {fisico.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${ok
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                          }`}
                      >
                        {`${divergencia > 0 ? '+' : ''}${divergencia.toFixed(2)}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-300 transition-transform group-hover:translate-x-0.5 inline-block" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo registro">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="item" className="block text-sm font-medium text-slate-700 mb-1.5">
              Item *
            </label>
            <select
              id="item"
              value={form.item}
              onChange={(e) => setForm({ ...form, item: e.target.value })}
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            >
              <option value="">Selecione um item</option>
              {itens.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="qtd_sistema" className="block text-sm font-medium text-slate-700 mb-1.5">
              Quantidade no sistema *
            </label>
            <input
              id="qtd_sistema"
              type="number"
              step="0.1"
              value={form.qtd_sistema}
              onChange={(e) => setForm({ ...form, qtd_sistema: e.target.value })}
              placeholder="Ex: 120.5"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            />
          </div>
          <div>
            <label htmlFor="observacoes" className="block text-sm font-medium text-slate-700 mb-1.5">
              Observações
            </label>
            <textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Opcional"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}