// src/modules/conferencia/components/ItemManager.tsx
import { useState } from 'react'
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react'
import { useToast } from '../../../../hooks/useToast'
import { Modal } from '../../../../components/ui/Modal'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'
import { useOfflineList } from '../../../../hooks/useOfflineList'
import { useSyncStatusMap } from '../../../../hooks/useSyncStatusMap'
import { SyncBadge } from '../../../../components/ui/SyncBadge'
import { itensRepository } from '../../../modules/conferencia/repositories/itensRepository'
import { marcasRepository } from '../../../modules/conferencia/repositories/marcasRepository'
import type { Item } from '../types/item'

const empty = { nome: '', marca: '', codigo: '', tipo_contagem: 'KG' as 'UND' | 'KG' }

export default function ItemManager() {
  const { data: itens, loading, reload } = useOfflineList(itensRepository)
  const { data: marcas } = useOfflineList(marcasRepository)
  const syncMap = useSyncStatusMap('conf_item')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [toDelete, setToDelete] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const openNew = () => {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  const openEdit = (i: Item) => {
    setEditing(i)
    setForm({
      nome: i.nome || '',
      marca: i.marca || '',
      codigo: i.codigo || '',
      tipo_contagem: i.tipo_contagem || 'KG',
    })
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
      await itensRepository.save({
        id: editing?.id,
        nome: form.nome,
        marca: form.marca || null,
        codigo: form.codigo || null,
        tipo_contagem: form.tipo_contagem,
      })
      toast({ title: editing ? 'Item atualizado' : 'Item cadastrado' })
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
      await itensRepository.remove(toDelete.id)
      toast({ title: 'Item removido' })
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

  const marcaNome = (id: string | null) => marcas.find((m) => m.id === id)?.nome || ''

  const filtered = itens.filter((i) =>
    [i.nome, marcaNome(i.marca), i.codigo].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Itens</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {itens.length} {itens.length === 1 ? 'item cadastrado' : 'itens cadastrados'}
          </p>
        </div>
        <button
          onClick={openNew}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-colors hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" />
          Novo item
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, marca ou código..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl bg-white">
          <Package className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">
            {search ? 'Nenhum item encontrado.' : 'Nenhum item cadastrado ainda.'}
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Marca</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Sincronização</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((i) => (
                <tr
                  key={i.id}
                  className="group hover:bg-slate-50 transition-colors"
                >
                  {/* Marca */}
                  <td className="px-4 py-3">
                    <span className="text-slate-500 max-w-[180px] truncate block">
                      {marcaNome(i.marca) || '—'}
                    </span>
                  </td>
                  
                  {/* Item */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 max-w-[220px] truncate">
                      {i.nome}
                    </div>
                  </td>

                  {/* Tipo */}
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {i.tipo_contagem}
                    </span>
                  </td>

                  {/* Código */}
                  <td className="px-4 py-3">
                    {i.codigo ? (
                      <span className="inline-block text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {i.codigo}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Sincronização */}
                  <td className="px-4 py-3 ">
                    <SyncBadge
                      status={syncMap.get(i.id) ?? 'synced'}
                    />
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(i)}
                        className="p-1.5 rounded-md text-slate-400 sm:opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-700 transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setToDelete(i)}
                        className="p-1.5 rounded-md text-slate-400 sm:opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de criação/edição */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar item' : 'Novo item'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-slate-700 mb-1.5">
              Nome *
            </label>
            <input
              id="nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Coxão Mole"
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            />
          </div>

          <div>
            <label htmlFor="tipo_contagem" className="block text-sm font-medium text-slate-700 mb-1.5">
              Tipo de contagem *
            </label>
            <select
              id="tipo_contagem"
              value={form.tipo_contagem}
              onChange={(e) =>
                setForm({ ...form, tipo_contagem: e.target.value as 'UND' | 'KG' })
              }
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            >
              <option value="KG">KG</option>
              <option value="UND">UND</option>
            </select>
            <p className="text-xs text-slate-400 mt-1.5">
              Define se as pesagens desse item usam tara (KG) ou são contadas por unidade (UND).
            </p>
          </div>

          <div>
            <label htmlFor="marca" className="block text-sm font-medium text-slate-700 mb-1.5">
              Marca
            </label>
            <select
              id="marca"
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            >
              <option value="">Sem marca</option>
              {marcas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                  {m.tara_emb != null ? ` (tara ${m.tara_emb} kg)` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1.5">
              Opcional. Cadastre novas marcas na aba "Marcas".
            </p>
          </div>

          <div>
            <label htmlFor="codigo" className="block text-sm font-medium text-slate-700 mb-1.5">
              Código
            </label>
            <input
              id="codigo"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              placeholder="Ex: 001"
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
        title="Remover item?"
        description={
          toDelete
            ? `Tem certeza que deseja remover "${toDelete.nome}"? Registros vinculados a esse item podem ser afetados. Esta ação não pode ser desfeita.`
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