// src/modules/conferencia/components/conferencia-views/ConferenciasLista.tsx
import { useState } from 'react'
import { Plus, Pencil, Trash2, ClipboardList, ChevronRight } from 'lucide-react'
import { useToast } from '../../../../../hooks/useToast'
import { Modal } from '../../../../../components/ui/Modal'
import { ConfirmDialog } from '../../../../../components/ui/ConfirmDialog'
import { useOfflineList } from '../../../../../hooks/useOfflineList'
import { conferenciasRepository } from '../../../../modules/conferencia/repositories/conferenciaRepository'
import type { Conferencia } from '../../../../modules/conferencia/types/Conferencia'

const empty = { nome: '', data: new Date().toISOString().slice(0, 10), observacao: '' }

interface Props {
  onSelect: (conferencia: Conferencia) => void
}

export default function ConferenciasLista({ onSelect }: Props) {
  const { data: conferencias, loading, reload } = useOfflineList(conferenciasRepository)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Conferencia | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Conferencia | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const openNew = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  const openEdit = (c: Conferencia, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing(c)
    setForm({ nome: c.nome || '', data: c.data, observacao: c.observacao || '' })
    setOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.data) {
      toast({ variant: 'destructive', title: 'Data é obrigatória' })
      return
    }
    try {
      setSaving(true)
      await conferenciasRepository.save({
        id: editing?.id,
        nome: form.nome,
        data: form.data,
        observacao: form.observacao,
      })
      toast({ title: editing ? 'Conferência atualizada' : 'Conferência criada' })
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

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      setDeleting(true)
      await conferenciasRepository.remove(toDelete.id)
      toast({ title: 'Conferência removida' })
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
          <h2 className="text-2xl font-semibold text-slate-900">Conferências</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {conferencias.length}{' '}
            {conferencias.length === 1 ? 'conferência registrada' : 'conferências registradas'}
          </p>
        </div>
        <button
          onClick={openNew}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-colors hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" />
          Nova conferência
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>
      ) : conferencias.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl bg-white">
          <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">Nenhuma conferência registrada ainda.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {conferencias.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="group text-left bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">
                    {new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </h3>
                  {c.nome && <p className="text-sm text-slate-500 mt-0.5">{c.nome}</p>}
                  {c.observacao && (
                    <p className="text-xs text-slate-400 truncate mt-1">{c.observacao}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span
                  onClick={(e) => openEdit(c, e)}
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                >
                  <Pencil className="w-4 h-4" />
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    setToDelete(c)
                  }}
                  className="p-1.5 rounded-md hover:bg-red-50 text-slate-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar conferência' : 'Nova conferência'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="data" className="block text-sm font-medium text-slate-700 mb-1.5">
              Data *
            </label>
            <input
              id="data"
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            />
          </div>
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-slate-700 mb-1.5">
              Nome
            </label>
            <input
              id="nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Opcional"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            />
          </div>
          <div>
            <label htmlFor="observacao" className="block text-sm font-medium text-slate-700 mb-1.5">
              Observação
            </label>
            <input
              id="observacao"
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              placeholder="Opcional"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
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
        title="Remover conferência?"
        description={
          toDelete
            ? `Tem certeza que deseja remover a conferência de ${new Date(
                toDelete.data + 'T00:00:00'
              ).toLocaleDateString('pt-BR')}? Registros vinculados podem ser afetados. Esta ação não pode ser desfeita.`
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