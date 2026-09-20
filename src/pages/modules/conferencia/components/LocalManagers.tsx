// src/modules/conferencia/components/LocalManager.tsx
import { useState } from 'react'
import { Plus, Pencil, Trash2, Search, MapPin } from 'lucide-react'
import { useToast } from '../../../../hooks/useToast'
import { Modal } from '../../../../components/ui/Modal'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'
import { useOfflineList } from '../../../../hooks/useOfflineList'
import { useSyncStatusMap } from '../../../../hooks/useSyncStatusMap'
import { SyncBadge } from '../../../../components/ui/SyncBadge'
import { locaisRepository } from '../../../modules/conferencia/repositories/locaisRepository'
import type { LocalContagem } from '../../../modules/conferencia/types/localContagem'

const empty = { nome: '' }

export default function LocalManager() {
  const { data: locais, loading, reload } = useOfflineList(locaisRepository)
  const syncMap = useSyncStatusMap('conf_local_contagem')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<LocalContagem | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [toDelete, setToDelete] = useState<LocalContagem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const openNew = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  const openEdit = (l: LocalContagem) => {
    setEditing(l)
    setForm({ nome: l.nome || '' })
    setOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) {
      toast({ variant: 'destructive', title: 'Nome é obrigatório' })
      return
    }

    try {
      setSaving(true)
      await locaisRepository.save({
        id: editing?.id,
        nome: form.nome,
      })
      toast({ title: editing ? 'Local atualizado' : 'Local cadastrado' })
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
      await locaisRepository.remove(toDelete.id)
      toast({ title: 'Local removido' })
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

  const filtered = locais.filter((l) => l.nome.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Locais de contagem</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {locais.length} {locais.length === 1 ? 'local cadastrado' : 'locais cadastrados'}
          </p>
        </div>
        <button
          onClick={openNew}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-colors hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" />
          Novo local
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl bg-white">
          <MapPin className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">
            {search ? 'Nenhum local encontrado.' : 'Nenhum local cadastrado ainda.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((l) => (
            <div
              key={l.id}
              className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <h3 className="font-semibold text-slate-900 truncate">{l.nome}</h3>
                  <SyncBadge status={syncMap.get(l.id) ?? 'synced'} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => openEdit(l)}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setToDelete(l)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-slate-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação/edição */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar local' : 'Novo local'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-slate-700 mb-1.5">
              Nome *
            </label>
            <input
              id="nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Câmara 1"
              autoFocus
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

      {/* Confirmação de exclusão */}
      <ConfirmDialog
        open={!!toDelete}
        title="Remover local?"
        description={
          toDelete
            ? `Tem certeza que deseja remover "${toDelete.nome}"? Contagens vinculadas a esse local podem ser afetadas. Esta ação não pode ser desfeita.`
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