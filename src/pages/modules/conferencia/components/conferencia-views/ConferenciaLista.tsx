// src/modules/conferencia/components/conferencia-views/ConferenciasLista.tsx
import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, ClipboardList, ChevronRight, Search, X, Timer, Copy } from 'lucide-react'
import CopiarConferenciaModal from './CopiarConferenciaModal'
import { itensRepository } from '../../../cadastros/repositories/itensRepository'
import { marcasRepository } from '../../../cadastros/repositories/marcasRepository'
import { useToast } from '../../../../../hooks/useToast'
import { Modal } from '../../../../../components/ui/Modal'
import { ConfirmDialog } from '../../../../../components/ui/ConfirmDialog'
import { useOfflineList } from '../../../../../hooks/useOfflineList'
import { conferenciasRepository } from '../../../../modules/conferencia/repositories/conferenciaRepository'
import { modelosRepository } from '../../../../modules/conferencia/repositories/modeloRepository'
import { modeloItensRepository } from '../../../../modules/conferencia/repositories/modeloItemRepository'
import { registrosRepository } from '../../../../modules/conferencia/repositories/registrosRespoitory'
import { contagensRepository } from '../../repositories/contagensRepository'
import { temposPorConferencia, formatarDuracao, formatarIntervalo } from '../../lib/tempoConferencia'
import { ehRapida, type Conferencia, type TipoConferencia } from '../../../../modules/conferencia/types/Conferencia'
import { formatarDataAtual } from '../../../../../lib/functions'
import { useAuth } from '../../../../../contexts/AuthContext'
import { filiaisRepository } from '../../../cadastros/repositories/filiaisRepository'
import { useFilialFiltro } from '../../hooks/useFilialFiltro'
import { usePadraoFiltro, batePadrao, SEM_PADRAO } from '../../hooks/usePadraoFiltro'
import { PadraoSelect } from '../PadraoSelect'
import { FilialSelect } from '../../../cadastros/components/FilialSelect'
import { usuariosRepository, nomeDoUsuario } from '../../../../modules/conferencia/repositories/usuariosRepository'

const empty = { nome: '', data: new Date().toISOString().slice(0, 10), observacao: '', padrao: '', filial: '' }

interface Props {
  /** 'rapida' mostra só conferências rápidas (itens digitados na hora); 'normal' as demais */
  tipo?: TipoConferencia
  onSelect: (conferencia: Conferencia) => void
}

export default function ConferenciasLista({ tipo = 'normal', onSelect }: Props) {
  const rapida = tipo === 'rapida'
  const { data: conferencias, loading, reload } = useOfflineList(conferenciasRepository, "conf_conferencia")
  const { data: modelos } = useOfflineList(modelosRepository, 'conf_modelo')
  const { data: modeloItens } = useOfflineList(modeloItensRepository, 'conf_modelo_item')
  const { data: usuarios } = useOfflineList(usuariosRepository, 'sistema_usuario')
  const { user } = useAuth()
  const { data: filiais } = useOfflineList(filiaisRepository, 'cad_filial')
  const [filialFiltro, setFilialFiltro] = useFilialFiltro()
  const [padraoFiltro, setPadraoFiltro] = usePadraoFiltro()
  const nomePadrao = (id: string | null | undefined) => (id ? modelos.find((m) => m.id === id)?.nome ?? null : null)
  const nomeFilial = (id: string | null | undefined) => filiais.find((f) => f.id === id)?.nome ?? null
  // tempo de conferência: da primeira à última contagem de cada conferência
  const { data: todosRegistros } = useOfflineList(registrosRepository, 'conf_registro')
  const { data: todasContagens } = useOfflineList(contagensRepository, 'conf_contagem')
  const tempos = useMemo(() => temposPorConferencia(todosRegistros, todasContagens), [todosRegistros, todasContagens])

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Conferencia | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Conferencia | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toCopy, setToCopy] = useState<Conferencia | null>(null)
  const { data: itens } = useOfflineList(itensRepository, 'cad_item')
  const { data: marcas } = useOfflineList(marcasRepository, 'cad_marca')
  const { toast } = useToast()
  const hoje = new Date()
  const dataFormatada = hoje.toISOString().split('T')[0];
  // const [dataFiltro, setDataFiltro] = useState(dataFormatada)

  const [dataFiltro, setDataFiltro] = useState(() => {
    const salvo = sessionStorage.getItem('dataFiltro')
    return salvo ?? dataFormatada ?? ''
  })

  useEffect(() => {
    sessionStorage.setItem('dataFiltro', dataFiltro)
  }, [dataFiltro])

  const limparFiltros = () => {
    setSearch('')
    setDataFiltro('')
    setFilialFiltro('')
    setPadraoFiltro('')
  }

  const [search, setSearch] = useState('')

  const openNew = () => {
    setEditing(null)
    // nova conferência já vem na filial filtrada (ou na única que existir)
    setForm({
      ...empty,
      filial: filialFiltro || (filiais.length === 1 ? filiais[0].id : ''),
      // nova conferência já vem com o padrão filtrado (ou o único que existir)
      padrao: padraoFiltro && padraoFiltro !== SEM_PADRAO ? padraoFiltro : modelos.length === 1 ? modelos[0].id : '',
    })
    setOpen(true)
  }

  const openEdit = (c: Conferencia, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing(c)
    setForm({ nome: c.nome || '', data: c.data, observacao: c.observacao || '', padrao: c.padrao ?? '', filial: c.filial ?? '' })
    setOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    const currentConferencia = conferencias.find((c) => c.id === editing?.id);
    e.preventDefault()
    if (!form.data) {
      toast({ variant: 'destructive', title: 'Data é obrigatória' })
      return
    }
    if (!form.filial) {
      toast({ variant: 'destructive', title: 'Filial é obrigatória' })
      return
    }
    // toda conferência normal nova nasce de um padrão (conferências antigas podem continuar sem)
    if (!rapida && !editing && !form.padrao) {
      toast({
        variant: 'destructive',
        title: 'Padrão é obrigatório',
        description: modelos.length === 0 ? 'Cadastre um padrão na aba Padrões antes de criar conferências.' : undefined,
      })
      return
    }
    try {
      setSaving(true)
      const conferenciaSalva = await conferenciasRepository.save({
        id: editing?.id,
        nome: form.nome,
        data: form.data,
        observacao: form.observacao,
        filial: form.filial,
        tipo: editing ? currentConferencia?.tipo ?? 'normal' : tipo,
        padrao: rapida ? null : form.padrao || null,
        // edição mantém o criador original; criação grava o usuário logado
        criador_id: editing ? currentConferencia?.criador_id ?? null : user?.id ?? null,
        created_at:currentConferencia != undefined ? String(currentConferencia?.created_at) : formatarDataAtual()
      })

      // só na criação (não na edição) traz os itens do padrão selecionado
      if (!editing && form.padrao) {
        const itensDoModelo = modeloItens.filter((mi) => mi.modelo === form.padrao)
        for (const mi of itensDoModelo) {
          await registrosRepository.save({
            item: mi.item,
            qtd_sistema: 0,
            observacoes: null,
            data: form.data,
            conferencia: conferenciaSalva.id,
            
          })
        }
      }

      toast({
        title: editing
          ? 'Conferência atualizada'
          : form.padrao
            ? 'Conferência criada com os itens do padrão'
            : 'Conferência criada',
      })
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

  // cada aba mostra só o seu tipo (conferências antigas, sem tipo, são normais)
  const doTipo = conferencias.filter((c) => ehRapida(c) === rapida)
  const filtered = doTipo.sort((a, b) => (b.data.localeCompare(a.data))).filter((c) => {
    const bateNome = c.nome.toLowerCase().includes(search.toLowerCase())
    const bateData = !dataFiltro || c.data === dataFiltro
    const bateFilial = !filialFiltro || c.filial === filialFiltro
    // conferência rápida não tem padrão: o filtro só vale na aba de conferências normais
    return bateNome && bateData && bateFilial && (rapida || batePadrao(c, padraoFiltro))
  })

  const temFiltroAtivo =
    search.trim() !== '' || dataFiltro !== '' || filialFiltro !== '' || (!rapida && padraoFiltro !== '')

  const qtdItensDoModelo = (modeloId: string) =>
    modeloItens.filter((mi) => mi.modelo === modeloId).length

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{rapida ? 'Conferências rápidas' : 'Conferências'}</h2>
          {rapida && (
            <p className="text-sm text-slate-500">Itens digitados na hora, sem usar o cadastro de itens.</p>
          )}
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length}{' '}
            {filtered.length === 1 ? 'conferência registrada' : 'conferências registradas'}
            {temFiltroAtivo && doTipo.length !== filtered.length && (
              <span className="text-slate-400"> de {doTipo.length}</span>
            )}
          </p>
        </div>
        <button
          onClick={openNew}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-colors hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" />
          {rapida ? 'Nova conferência rápida' : 'Nova conferência'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
          />
        </div>
        <FilialSelect filiais={filiais} value={filialFiltro} onChange={setFilialFiltro} />
        {!rapida && <PadraoSelect padroes={modelos} value={padraoFiltro} onChange={setPadraoFiltro} />}
        <input
          type="date"
          value={dataFiltro}
          onChange={(e) => setDataFiltro(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
        />
        {temFiltroAtivo && (
          <button
            onClick={limparFiltros}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
            Limpar
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl bg-white">
          <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">
            {temFiltroAtivo ? (dataFiltro == dataFormatada ? 'Nenhuma conferência registrada hoje.' : 'Nenhuma conferência encontrada.') : 'Nenhuma conferência registrada ainda.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 " >
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="group text-left bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {c.nome && <h3 className="font-semibold text-slate-900">{c.nome}</h3>}
                  {c.created_at != 'undefined' ? new Date(c.created_at).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) : '(Sincronize para atualizar a data.)'}
                  {tempos.get(c.id) && (
                    <p
                      className="flex items-center gap-1 text-xs text-slate-500 mt-1"
                      title={`Tempo de conferência: da primeira à última contagem (${formatarIntervalo(tempos.get(c.id)!)})`}
                    >
                      <Timer className="w-3.5 h-3.5 text-slate-400" />
                      {formatarDuracao(tempos.get(c.id)!.ms)}
                      <span className="text-slate-400">· {formatarIntervalo(tempos.get(c.id)!)}</span>
                    </p>
                  )}
                  {(nomeFilial(c.filial) || (!rapida && nomePadrao(c.padrao))) && (
                    <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-600 mt-1">
                      {nomeFilial(c.filial)}
                      {!rapida && nomePadrao(c.padrao) && (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">{nomePadrao(c.padrao)}</span>
                      )}
                    </p>
                  )}
                  {nomeDoUsuario(usuarios, c.criador_id) && (
                    <p className="text-xs text-slate-500 mt-1">
                      Criada por {nomeDoUsuario(usuarios, c.criador_id)}
                    </p>
                  )}
                  {c.observacao && (
                    <p className="text-xs text-slate-400 truncate mt-1">{c.observacao}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="flex gap-1 mt-3 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <span
                  onClick={(e) => openEdit(c, e)}
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                >
                  <Pencil className="w-4 h-4" />
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    setToCopy(c)
                  }}
                  title="Copiar conferência"
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                >
                  <Copy className="w-4 h-4" />
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar conferência' : rapida ? 'Nova conferência rápida' : 'Nova conferência'}>
        <form onSubmit={save} className="space-y-4">
          <div className='hidden'>
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
            <label htmlFor="filial" className="block text-sm font-medium text-slate-700 mb-1.5">
              Filial *
            </label>
            <FilialSelect
              id="filial"
              filiais={filiais}
              value={form.filial}
              onChange={(filial) => setForm({ ...form, filial })}
              incluirTodas={false}
              className="w-full"
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

          {!rapida && (
            <div>
              <label htmlFor="padrao" className="block text-sm font-medium text-slate-700 mb-1.5">
                Padrão de conferência{!editing && ' *'}
              </label>
              {modelos.length === 0 ? (
                <p className="text-sm text-slate-600 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  Nenhum padrão cadastrado. Crie um na aba <span className="font-medium">Padrões</span> para poder criar conferências.
                </p>
              ) : (
                <select
                  id="padrao"
                  value={form.padrao}
                  onChange={(e) => setForm({ ...form, padrao: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                >
                  <option value="">{editing ? 'Sem padrão' : 'Selecione o padrão'}</option>
                  {[...modelos]
                    .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR'))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome} ({qtdItensDoModelo(m.id)} {qtdItensDoModelo(m.id) === 1 ? 'item' : 'itens'})
                      </option>
                    ))}
                </select>
              )}
              <p className="text-xs text-slate-500 mt-1.5">
                {editing
                  ? 'Trocar o padrão só muda o vínculo da conferência; os itens já lançados não mudam.'
                  : 'Os itens do padrão entram automaticamente e a conferência fica ligada a ele.'}
              </p>
            </div>
          )}

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

      {toCopy && (
      <CopiarConferenciaModal
        key={toCopy.id}
        origem={toCopy}
        registros={todosRegistros}
        itens={itens}
        marcas={marcas}
        filiais={filiais}
        onClose={() => setToCopy(null)}
        onCopiada={async (nova) => {
          setToCopy(null)
          // garante que a cópia (criada hoje) apareça mesmo com filtro de data/filial ativo
          if (dataFiltro && dataFiltro !== nova.data) setDataFiltro(nova.data)
          if (filialFiltro && filialFiltro !== nova.filial) setFilialFiltro(nova.filial ?? '')
          await reload()
        }}
      />
      )}

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