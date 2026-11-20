// src/modules/conferencia/components/ModeloManager.tsx
// Padrões de conferência (tabela conf_modelo): um nome + a lista de itens que entram automaticamente
// quando uma conferência é criada a partir dele. Cada conferência normal fica ligada ao seu padrão
// (conf_conferencia.padrao), o que permite filtrar conferências por padrão.
import { useMemo, useState } from 'react'
import { LayoutTemplate, Pencil, Plus, Search, Trash2, Copy } from 'lucide-react'
import { useToast } from '../../../../hooks/useToast'
import { Modal } from '../../../../components/ui/Modal'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'
import { useOfflineList } from '../../../../hooks/useOfflineList'
import { useSyncStatusMap } from '../../../../hooks/useSyncStatusMap'
import { SyncBadge } from '../../../../components/ui/SyncBadge'
import { modelosRepository } from '../repositories/modeloRepository'
import { modeloItensRepository } from '../repositories/modeloItemRepository'
import { conferenciasRepository } from '../repositories/conferenciaRepository'
import { itensRepository } from '../../cadastros/repositories/itensRepository'
import { marcasRepository } from '../../cadastros/repositories/marcasRepository'
import type { ModeloConferencia } from '../types/modelo'
import type { Item } from '../../cadastros/types/item'

const campo =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300'

export default function ModeloManager() {
  const { data: modelos, loading } = useOfflineList(modelosRepository, 'conf_modelo')
  const { data: modeloItens } = useOfflineList(modeloItensRepository, 'conf_modelo_item')
  const { data: itens } = useOfflineList(itensRepository, 'cad_item')
  const { data: marcas } = useOfflineList(marcasRepository, 'cad_marca')
  const { data: conferencias } = useOfflineList(conferenciasRepository, 'conf_conferencia')
  const syncMap = useSyncStatusMap('conf_modelo')
  const qtdConferencias = (padraoId: string) => conferencias.filter((c) => c.padrao === padraoId).length
  const { toast } = useToast()

  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const [editando, setEditando] = useState<ModeloConferencia | null>(null)
  const [nome, setNome] = useState('')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [buscaItem, setBuscaItem] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [apagar, setApagar] = useState<ModeloConferencia | null>(null)
  const [apagando, setApagando] = useState(false)

  const itensDoModelo = (modeloId: string) => modeloItens.filter((mi) => mi.modelo === modeloId)
  const nomeMarca = (id: string | null) => marcas.find((m) => m.id === id)?.nome ?? 'Sem marca'

  // itens agrupados por marca para o seletor do formulário
  const grupos = useMemo(() => {
    const termo = buscaItem.trim().toLowerCase()
    const filtrados = itens.filter(
      (i) => !termo || i.nome.toLowerCase().includes(termo) || (i.codigo ?? '').toLowerCase().includes(termo)
    )
    const map = new Map<string, Item[]>()
    for (const i of filtrados) {
      const chave = i.marca ?? ''
      map.set(chave, [...(map.get(chave) ?? []), i])
    }
    return [...map.entries()]
      .map(([marcaId, lista]) => ({
        marcaId,
        nome: marcaId ? nomeMarca(marcaId) : 'Sem marca',
        itens: lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, marcas, buscaItem])

  const abrir = (modelo: ModeloConferencia | null, copiar = false) => {
    setEditando(copiar ? null : modelo)
    setNome(modelo ? (copiar ? `${modelo.nome} (cópia)` : modelo.nome) : '')
    setSelecionados(new Set(modelo ? itensDoModelo(modelo.id).map((mi) => mi.item) : []))
    setBuscaItem('')
    setAberto(true)
  }

  const alternar = (ids: string[], marcar: boolean) =>
    setSelecionados((atual) => {
      const novo = new Set(atual)
      for (const id of ids) (marcar ? novo.add(id) : novo.delete(id))
      return novo
    })

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({ variant: 'destructive', title: 'Nome é obrigatório' })
      return
    }
    if (selecionados.size === 0) {
      toast({ variant: 'destructive', title: 'Escolha ao menos um item' })
      return
    }
    try {
      setSalvando(true)
      // o modelo vai antes dos itens: a fila sobe na ordem em que foi gravada (FK modelo → item)
      const modelo = await modelosRepository.save({ id: editando?.id, nome: nome.trim() })
      const atuais = itensDoModelo(modelo.id)
      const jaTem = new Set(atuais.map((mi) => mi.item))
      for (const itemId of selecionados) {
        if (!jaTem.has(itemId)) await modeloItensRepository.save({ modelo: modelo.id, item: itemId })
      }
      for (const mi of atuais) {
        if (!selecionados.has(mi.item)) await modeloItensRepository.remove(mi.id)
      }
      toast({ title: editando ? 'Padrão atualizado' : 'Padrão criado' })
      setAberto(false)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err instanceof Error ? err.message : undefined })
    } finally {
      setSalvando(false)
    }
  }

  const confirmarApagar = async () => {
    if (!apagar) return
    try {
      setApagando(true)
      for (const mi of itensDoModelo(apagar.id)) await modeloItensRepository.remove(mi.id)
      await modelosRepository.remove(apagar.id)
      toast({ title: 'Padrão removido' })
      setApagar(null)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao remover', description: err instanceof Error ? err.message : undefined })
    } finally {
      setApagando(false)
    }
  }

  const filtrados = modelos
    .filter((m) => (m.nome ?? '').toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR'))

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Padrões de conferência</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Toda conferência é criada a partir de um padrão: os itens dele entram automaticamente e a conferência fica ligada ao padrão.
          </p>
        </div>
        <button
          onClick={() => abrir(null)}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-colors hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" />
          Novo padrão
        </button>
      </div>

      {modelos.length > 3 && (
        <div className="relative mb-5 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar padrão..." className={`${campo} pl-9`} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl bg-white">
          <LayoutTemplate className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">{busca ? 'Nenhum padrão encontrado.' : 'Nenhum padrão cadastrado ainda.'}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((m) => {
            const lista = itensDoModelo(m.id)
              .map((mi) => itens.find((i) => i.id === mi.item))
              .filter((i): i is Item => !!i)
            const porMarca = new Map<string, number>()
            for (const i of lista) porMarca.set(nomeMarca(i.marca), (porMarca.get(nomeMarca(i.marca)) ?? 0) + 1)
            return (
              <div key={m.id} className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{m.nome}</h3>
                      <SyncBadge status={syncMap.get(m.id) ?? 'synced'} />
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {lista.length} {lista.length === 1 ? 'item' : 'itens'}
                      {' · '}
                      {qtdConferencias(m.id)} {qtdConferencias(m.id) === 1 ? 'conferência' : 'conferências'}
                    </p>
                    {porMarca.size > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {[...porMarca.entries()].map(([marca, n]) => `${marca} (${n})`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => abrir(m, true)} title="Duplicar" className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => abrir(m)} title="Editar" className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setApagar(m)}
                      title="Remover"
                      className="p-1.5 rounded-md hover:bg-red-50 text-slate-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={aberto} onClose={() => setAberto(false)} title={editando ? 'Editar padrão' : 'Novo padrão'}>
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label htmlFor="modelo-nome" className="block text-sm font-medium text-slate-700 mb-1.5">
              Nome *
            </label>
            <input
              id="modelo-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Carnes resfriadas"
              autoFocus
              className={campo}
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm font-medium text-slate-700">Itens *</span>
              <span className="text-xs text-slate-500">
                {selecionados.size} de {itens.length} selecionados
              </span>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={buscaItem}
                onChange={(e) => setBuscaItem(e.target.value)}
                placeholder="Buscar por nome ou código..."
                className={`${campo} pl-9 !py-2`}
              />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {grupos.length === 0 && <p className="px-3 py-4 text-sm text-slate-400 text-center">Nenhum item encontrado.</p>}
              {grupos.map((g) => {
                const ids = g.itens.map((i) => i.id)
                const marcados = ids.filter((id) => selecionados.has(id)).length
                const todos = marcados === ids.length
                return (
                  <div key={g.marcaId}>
                    <label className="sticky top-0 z-10 flex items-center gap-2.5 px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={todos}
                        ref={(el) => {
                          if (el) el.indeterminate = marcados > 0 && !todos
                        }}
                        onChange={() => alternar(ids, !todos)}
                        className="rounded border-slate-300"
                      />
                      {g.nome}
                      <span className="font-normal text-slate-400">
                        {marcados}/{ids.length}
                      </span>
                    </label>
                    {g.itens.map((i) => (
                      <label key={i.id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={selecionados.has(i.id)}
                          onChange={(e) => alternar([i.id], e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        <span className="text-slate-900 truncate">{i.nome}</span>
                        {i.codigo && <span className="ml-auto text-xs text-slate-400 font-mono shrink-0">{i.codigo}</span>}
                      </label>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!apagar}
        title="Remover padrão?"
        description={
          apagar
            ? `O padrão "${apagar.nome}" e a lista de itens dele serão removidos.${
                qtdConferencias(apagar.id) > 0
                  ? ` As ${qtdConferencias(apagar.id)} conferências ligadas a ele continuam existindo, mas ficam "sem padrão".`
                  : ''
              }`
            : ''
        }
        confirmLabel="Remover"
        loading={apagando}
        onCancel={() => setApagar(null)}
        onConfirm={confirmarApagar}
      />
    </div>
  )
}
