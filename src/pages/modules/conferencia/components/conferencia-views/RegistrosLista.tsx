// src/modules/conferencia/components/conferencia-views/RegistrosLista.tsx
import { useState } from 'react'
import { Plus, ClipboardList, ChevronRight, Trash2 } from 'lucide-react'
import { useToast } from '../../../../../hooks/useToast'
import { Modal } from '../../../../../components/ui/Modal'
import { ConfirmDialog } from '../../../../../components/ui/ConfirmDialog'
import { useOfflineList } from '../../../../../hooks/useOfflineList'
import { registrosRepository } from '../../../../modules/conferencia/repositories/registrosRespoitory.ts'
import { contagensRepository } from '../../../../modules/conferencia/repositories/contagensRepository'
import { itensRepository } from '../../../../modules/conferencia/repositories/itensRepository'
import { marcasRepository } from '../../repositories/marcasRepository.ts'
import type { Conferencia } from '../../../../modules/conferencia/types/Conferencia'
import type { RegistroConferencia } from '../../../../modules/conferencia/types/registro'

const SEM_MARCA = '__sem_marca__'

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

  const getItem = (itemId: string) => itens.find((i) => i.id === itemId)
  const itemNome = (itemId: string) => getItem(itemId)?.nome || 'Item não encontrado'

  const itemMarcaPorItemId = (itemId: string) => {
    const item = getItem(itemId)
    if (!item || !item.marca) return 'Sem marca'

    const marca = marcas.find((m) => m.id === item.marca)
    return marca?.nome || ""
  }

  const registrosDaConferencia = todosRegistros.filter((r) => r.conferencia === conferencia.id)
  const itensJaUsados = new Set(registrosDaConferencia.map((r) => r.item))

  const [filtroMarca, setFiltroMarca] = useState('')

  // marcas que realmente aparecem nesta conferência, para não poluir o select
  const marcasDisponiveis = marcas.filter((m) =>
    registrosDaConferencia.some((r) => getItem(r.item)?.marca === m.id)
  )

  const registros = filtroMarca
    ? registrosDaConferencia.filter((r) => getItem(r.item)?.marca === filtroMarca)
    : registrosDaConferencia

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [filtroMarcaModal, setFiltroMarcaModal] = useState('')
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<RegistroConferencia | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  // marcas usadas por itens cadastrados (para o filtro do modal)
  const marcasDoModal = marcas.filter((m) => itens.some((i) => i.marca === m.id))

  const itensFiltradosModal = itens.filter((i) => {
    if (!filtroMarcaModal) return true
    if (filtroMarcaModal === SEM_MARCA) return !i.marca
    return i.marca === filtroMarcaModal
  })

  const qtdFisico = (registroId: string) =>
    contagens.filter((c) => c.registro === registroId).reduce((sum, c) => sum + c.contagem, 0)

  const openNew = () => {
    setForm(empty)
    setFiltroMarcaModal('')
    setOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.item) {
      toast({ variant: 'destructive', title: 'Selecione um item' })
      return
    }
    if (itensJaUsados.has(form.item)) {
      toast({
        variant: 'destructive',
        title: 'Item já incluído',
        description: 'Esse item já possui um registro nesta conferência.',
      })
      return
    }

    try {
      setSaving(true)
      const novoRegistro = await registrosRepository.save({
      item: form.item,
      qtd_sistema: 0,
      observacoes: form.observacoes || null,
      data: form.data,
      conferencia: conferencia.id,
    })
    toast({ title: 'Registro criado' })
    setOpen(false)
    await reload()
    onSelect(novoRegistro)
      
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

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      setDeleting(true)
      await registrosRepository.remove(toDelete.id)
      toast({ title: 'Registro removido' })
      setToDelete(null)
      await reload()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setDeleting(false)
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
        <div className="flex items-center gap-3">
          {marcasDisponiveis.length > 0 && (
            <select
              value={filtroMarca}
              onChange={(e) => setFiltroMarca(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            >
              <option value="">Todas as marcas</option>
              {marcasDisponiveis.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={openNew}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-colors hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" />
            Novo registro
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>
      ) : registros.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl bg-white">
          <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">
            {filtroMarca ? 'Nenhum registro para essa marca.' : 'Nenhum registro criado ainda.'}
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm text-slate-600 min-w-[650px]">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Marca</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">Qtd. Sistema</th>
                <th className="px-4 py-3 text-right">Qtd. Físico</th>
                <th className="px-4 py-3">Status / Divergência</th>
                <th className="px-4 py-3 w-16"></th>
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
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setToDelete(r)
                          }}
                          className="p-1.5 rounded-md text-slate-400 sm:opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-300 transition-transform group-hover:translate-x-0.5" />
                      </div>
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
            <label htmlFor="marcaFiltro" className="block text-sm font-medium text-slate-700 mb-1.5">
              Marca
            </label>
            <select
              id="marcaFiltro"
              value={filtroMarcaModal}
              onChange={(e) => {
                setFiltroMarcaModal(e.target.value)
                setForm((f) => ({ ...f, item: '' }))
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            >
              <option value="">Todas as marcas</option>
              <option value={SEM_MARCA}>Sem marca</option>
              {marcasDoModal.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
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
              {itensFiltradosModal.map((i) => (
                <option key={i.id} value={i.id} disabled={itensJaUsados.has(i.id)}>
                  {itemMarcaPorItemId(i.id) || ""} - {i.nome}
                  {itensJaUsados.has(i.id) ? ' (já incluído)' : ''}
                </option>
              ))}
            </select>
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

      <ConfirmDialog
        open={!!toDelete}
        title="Remover registro?"
        description={
          toDelete
            ? `Tem certeza que deseja remover o registro de "${itemNome(toDelete.item)}"? Todas as pesagens/contagens vinculadas também serão perdidas. Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Remover"
        loading={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}