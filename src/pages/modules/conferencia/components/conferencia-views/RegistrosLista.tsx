// src/modules/conferencia/components/conferencia-views/RegistrosLista.tsx
import { useMemo, useState } from 'react'
import { Plus, ClipboardList, ChevronRight, Trash2, Pencil, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
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
import type { Item } from '../../types/item'
import type { MarcaItem } from '../../types/Marcas.ts'

const SEM_MARCA = '__sem_marca__'

const empty = { item: '', qtd_sistema: '', observacoes: '', data: new Date().toISOString().slice(0, 10) }

type SortKey = 'codigo' | 'marca' | 'item' | 'qtd_sistema' | 'qtd_fisico' | 'divergencia'
type SortDirection = 'asc' | 'desc'

interface LinhaRegistro {
  registro: RegistroConferencia
  codigo: string
  marca: string
  nome: string
  qtdFisico: number
  divergencia: number
}

interface Props {
  conferencia: Conferencia
  onSelect: (registro: RegistroConferencia) => void
}

export default function RegistrosLista({ conferencia, onSelect }: Props) {
  const { data: todosRegistros, loading, reload } = useOfflineList(registrosRepository, "conf_registro")
  const { data: contagens } = useOfflineList(contagensRepository, "conf_contagem")
  const { data: itens } = useOfflineList(itensRepository, "conf_item")
  const { data: marcas } = useOfflineList(marcasRepository, "conf_marca_item")

  // --- Lookups O(1), construídos uma vez por mudança de dados ---
  const itensMap = useMemo(() => {
    const map = new Map<string, Item>()
    for (const i of itens) map.set(i.id, i)
    return map
  }, [itens])

  const marcasMap = useMemo(() => {
    const map = new Map<string, MarcaItem>()
    for (const m of marcas) map.set(m.id, m)
    return map
  }, [marcas])

  // soma de contagens por registro, calculada uma vez (evita filter+reduce repetido por linha)
  const fisicoPorRegistro = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of contagens) {
      map.set(c.registro, (map.get(c.registro) ?? 0) + c.contagem)
    }
    return map
  }, [contagens])

  const nomeItem = (itemId: string) => itensMap.get(itemId)?.nome || 'Item não encontrado'
  const nomeMarcaDoItem = (itemId: string) => {
    const item = itensMap.get(itemId)
    if (!item?.marca) return 'Sem marca'
    return marcasMap.get(item.marca)?.nome || ''
  }
  const codigoDoItem = (itemId: string) => itensMap.get(itemId)?.codigo || ''

  const registrosDaConferencia = useMemo(
    () => todosRegistros.filter((r) => r.conferencia === conferencia.id),
    [todosRegistros, conferencia.id]
  )

  const itensJaUsados = useMemo(
    () => new Set(registrosDaConferencia.map((r) => r.item)),
    [registrosDaConferencia]
  )

  const [filtroMarca, setFiltroMarca] = useState('')

  const marcasDisponiveis = useMemo(() => {
    const marcaIds = new Set<string>()
    for (const r of registrosDaConferencia) {
      const item = itensMap.get(r.item)
      if (item?.marca) marcaIds.add(item.marca)
    }
    return marcas.filter((m) => marcaIds.has(m.id))
  }, [registrosDaConferencia, itensMap, marcas])

  // --- Ordenação ---
  const [sortKey, setSortKey] = useState<SortKey>('item')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  // Uma única passada: filtra por marca, enriquece cada linha (nome/marca/código/físico/divergência)
  // e ordena — tudo calculado uma vez, reaproveitado direto no render da tabela.
  const linhas = useMemo<LinhaRegistro[]>(() => {
    const base = filtroMarca
      ? registrosDaConferencia.filter((r) => itensMap.get(r.item)?.marca === filtroMarca)
      : registrosDaConferencia

    const enriquecidas = base.map((r): LinhaRegistro => {
      const fisico = fisicoPorRegistro.get(r.id) ?? 0
      return {
        registro: r,
        codigo: codigoDoItem(r.item),
        marca: nomeMarcaDoItem(r.item),
        nome: nomeItem(r.item),
        qtdFisico: fisico,
        divergencia: fisico - r.qtd_sistema,
      }
    })

    enriquecidas.sort((a, b) => {
      let comp = 0
      switch (sortKey) {
        case 'codigo':
          comp = Number(a.codigo) - Number(b.codigo)
          break
        case 'marca':
          comp = a.marca.localeCompare(b.marca, 'pt-BR')
          break
        case 'item':
          comp = a.nome.localeCompare(b.nome, 'pt-BR')
          break
        case 'qtd_sistema':
          comp = a.registro.qtd_sistema - b.registro.qtd_sistema
          break
        case 'qtd_fisico':
          comp = a.qtdFisico - b.qtdFisico
          break
        case 'divergencia':
          comp = a.divergencia - b.divergencia
          break
      }
      return sortDirection === 'asc' ? comp : -comp
    })

    return enriquecidas
  }, [registrosDaConferencia, filtroMarca, itensMap, fisicoPorRegistro, sortKey, sortDirection])

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [filtroMarcaModal, setFiltroMarcaModal] = useState('')
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<RegistroConferencia | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const [editandoSistema, setEditandoSistema] = useState<RegistroConferencia | null>(null)
  const [qtdSistemaEditada, setQtdSistemaEditada] = useState('')
  const [salvandoSistema, setSalvandoSistema] = useState(false)

  const marcasDoModal = useMemo(() => {
    const marcaIds = new Set(itens.map((i) => i.marca).filter((id): id is string => Boolean(id)))
    return marcas.filter((m) => marcaIds.has(m.id))
  }, [itens, marcas])

  const itensFiltradosModal = useMemo(() => {
    if (!filtroMarcaModal) return itens
    if (filtroMarcaModal === SEM_MARCA) return itens.filter((i) => !i.marca)
    return itens.filter((i) => i.marca === filtroMarcaModal)
  }, [itens, filtroMarcaModal])

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

  const abrirEdicaoSistema = (r: RegistroConferencia, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditandoSistema(r)
    setQtdSistemaEditada(String(r.qtd_sistema))
  }

  const salvarQtdSistema = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editandoSistema) return

    const novoValor = Number(qtdSistemaEditada)
    if (Number.isNaN(novoValor)) {
      toast({ variant: 'destructive', title: 'Informe um valor numérico válido' })
      return
    }

    try {
      setSalvandoSistema(true)
      await registrosRepository.save({
        id: editandoSistema.id,
        item: editandoSistema.item,
        qtd_sistema: novoValor,
        observacoes: editandoSistema.observacoes,
        data: editandoSistema.data,
        conferencia: editandoSistema.conferencia,
      })
      toast({ title: 'Quantidade do sistema atualizada' })
      setEditandoSistema(null)
      await reload()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSalvandoSistema(false)
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3 h-3 text-slate-300" />
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-slate-700" />
    ) : (
      <ArrowDown className="w-3 h-3 text-slate-700" />
    )
  }

  const SortableHeader = ({
    column,
    label,
    align = 'left',
  }: {
    column: SortKey
    label: string
    align?: 'left' | 'right'
  }) => (
    <th className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        onClick={() => toggleSort(column)}
        className={`inline-flex items-center gap-1 hover:text-slate-900 transition-colors ${align === 'right' ? 'flex-row-reverse' : ''
          }`}
      >
        {label}
        <SortIcon column={column} />
      </button>
    </th>
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Registros</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {linhas.length} {linhas.length === 1 ? 'registro' : 'registros'} nesta conferência
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
      ) : linhas.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl bg-white">
          <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">
            {filtroMarca ? 'Nenhum registro para essa marca.' : 'Nenhum registro criado ainda.'}
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <SortableHeader column="codigo" label="Código" />
                <SortableHeader column="marca" label="Marca" />
                <SortableHeader column="item" label="Item" />
                <SortableHeader column="qtd_sistema" label="Qtd. Sistema" align="right" />
                <SortableHeader column="qtd_fisico" label="Qtd. Físico" align="right" />
                <SortableHeader column="divergencia" label="Status / Divergência" />
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map(({ registro: r, codigo, marca, nome, qtdFisico, divergencia }) => {
                const ok = Math.abs(divergencia) < 0.001

                return (
                  <tr
                    key={r.id}
                    onClick={() => onSelect(r)}
                    className="group cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 max-w-[200px] truncate">
                      {codigo}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 max-w-[200px] truncate">
                      {marca}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 max-w-[200px] truncate">
                      {nome}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      <button
                        onClick={(e) => abrirEdicaoSistema(r, e)}
                        className="inline-flex items-center gap-1 hover:text-slate-900 hover:underline underline-offset-2 transition-colors"
                        title="Editar quantidade do sistema"
                      >
                        {r.qtd_sistema}
                        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {qtdFisico.toFixed(2)}
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
                  {nomeMarcaDoItem(i.id) || ""} - {i.nome}
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

      <Modal
        open={!!editandoSistema}
        onClose={() => setEditandoSistema(null)}
        title={editandoSistema ? `Quantidade do sistema — ${nomeItem(editandoSistema.item)}` : ''}
      >
        <form onSubmit={salvarQtdSistema} className="space-y-4">
          <div>
            <label htmlFor="qtdSistemaEditada" className="block text-sm font-medium text-slate-700 mb-1.5">
              Quantidade *
            </label>
            <input
              id="qtdSistemaEditada"
              type="number"
              step="0.01"
              value={qtdSistemaEditada}
              onChange={(e) => setQtdSistemaEditada(e.target.value)}
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditandoSistema(null)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvandoSistema}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              {salvandoSistema ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Remover registro?"
        description={
          toDelete
            ? `Tem certeza que deseja remover o registro de "${nomeItem(toDelete.item)}"? Todas as pesagens/contagens vinculadas também serão perdidas. Esta ação não pode ser desfeita.`
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