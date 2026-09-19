// src/modules/conferencia/components/MarcaManager.tsx
import { useState } from 'react'
import { Plus, Pencil, Trash2, Search, Tag } from 'lucide-react'
import { useToast } from '../../../../hooks/useToast.ts'
import { Modal } from '../../../../components/ui/Modal.tsx'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog.tsx'
import { useOfflineList } from '../../../../hooks/useOfflineList.ts'
import { marcasRepository } from '../repositories/marcasRepository.ts'
import type { MarcaItem } from '../types/Marcas.ts'

import { useSyncStatusMap } from "../../../../hooks/useSyncStatusMap"
import { SyncBadge } from '../../../../components/ui/SyncBadge'

const empty = { nome: '', tara_emb: '' }

export default function MarcaManager() {
  const { data: marcas, loading, reload } = useOfflineList(marcasRepository)
  const syncMap = useSyncStatusMap('conf_marca_item') // <- tabela do repositório

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MarcaItem | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [toDelete, setToDelete] = useState<MarcaItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const openNew = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  const openEdit = (m: MarcaItem) => {
    setEditing(m)
    setForm({ nome: m.nome || '', tara_emb: m.tara_emb != null ? String(m.tara_emb) : '' })
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
      await marcasRepository.save({
        id: editing?.id,
        nome: form.nome,
        tara_emb: form.tara_emb.trim() ? Number(form.tara_emb) : null,
      })
      toast({ title: editing ? 'Marca atualizada' : 'Marca cadastrada' })
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
      await marcasRepository.remove(toDelete.id)
      toast({ title: 'Marca removida' })
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

  const filtered = marcas.filter((m) => m.nome.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Marcas</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {marcas.length} {marcas.length === 1 ? 'marca cadastrada' : 'marcas cadastradas'}
          </p>
        </div>
        <button
          onClick={openNew}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-colors hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" />
          Nova marca
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
          <Tag className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">
            {search ? 'Nenhuma marca encontrada.' : 'Nenhuma marca cadastrada ainda.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{m.nome}</h3>
                  <SyncBadge status={syncMap.get(m.id) ?? 'synced'} />
                  {m.tara_emb != null && (
                    <span className="inline-block mt-2 text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      Tara: {m.tara_emb} kg
                    </span>
                  )}
                </div>
                <div className="flex gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(m)}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setToDelete(m)}
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
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar marca' : 'Nova marca'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-slate-700 mb-1.5">
              Nome *
            </label>
            <input
              id="nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Friboi"
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            />
          </div>
          <div>
            <label htmlFor="tara_emb" className="block text-sm font-medium text-slate-700 mb-1.5">
              Tara da embalagem (kg)
            </label>
            <input
              id="tara_emb"
              type="number"
              step="0.001"
              min="0"
              value={form.tara_emb}
              onChange={(e) => setForm({ ...form, tara_emb: e.target.value })}
              placeholder="Ex: 0.150"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Peso descontado por embalagem na hora de calcular o líquido. Deixe em branco se não
              aplicável.
            </p>
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
        title="Remover marca?"
        description={
          toDelete
            ? `Tem certeza que deseja remover "${toDelete.nome}"? Itens vinculados a essa marca podem ser afetados. Esta ação não pode ser desfeita.`
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