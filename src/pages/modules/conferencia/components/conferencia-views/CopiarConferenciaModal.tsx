// src/modules/conferencia/components/conferencia-views/CopiarConferenciaModal.tsx
// Cria uma nova conferência a partir de outra, copiando só os itens escolhidos.
// Contagens nunca são copiadas; o valor do sistema (qtd_sistema) é copiado se o usuário quiser.
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Modal } from '../../../../../components/ui/Modal'
import { useToast } from '../../../../../hooks/useToast'
import { useAuth } from '../../../../../contexts/AuthContext'
import { formatarDataAtual } from '../../../../../lib/functions'
import { conferenciasRepository } from '../../repositories/conferenciaRepository'
import { registrosRepository } from '../../repositories/registrosRespoitory'
import { itemDoRegistro } from '../../lib/itemDoRegistro'
import { FilialSelect } from '../../../cadastros/components/FilialSelect'
import type { Conferencia } from '../../types/Conferencia'
import type { RegistroConferencia } from '../../types/registro'
import type { Item } from '../../../cadastros/types/item'
import type { MarcaItem } from '../../../cadastros/types/marca'
import type { Filial } from '../../../cadastros/types/filial'

interface Props {
  /** conferência de origem (o pai monta o modal com key={origem.id}, então o estado reinicia a cada abertura) */
  origem: Conferencia
  registros: RegistroConferencia[]
  itens: Item[]
  marcas: MarcaItem[]
  filiais: Filial[]
  onClose: () => void
  onCopiada: (nova: Conferencia) => void
}

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300'

export default function CopiarConferenciaModal({ origem, registros, itens, marcas, filiais, onClose, onCopiada }: Props) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [nome, setNome] = useState(origem.nome ? `${origem.nome} (cópia)` : '')
  const [filial, setFilial] = useState(origem.filial ?? '')
  const [observacao, setObservacao] = useState(origem.observacao ?? '')
  const [copiarSistema, setCopiarSistema] = useState(true)
  // por padrão todos os itens da conferência de origem vêm marcados
  const [selecionados, setSelecionados] = useState<Set<string>>(
    () => new Set(registros.filter((r) => r.conferencia === origem.id).map((r) => r.id))
  )
  const [busca, setBusca] = useState('')
  const [saving, setSaving] = useState(false)

  const itensMap = useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens])
  const marcasMap = useMemo(() => new Map(marcas.map((m) => [m.id, m])), [marcas])

  const linhas = useMemo(() => {
    return registros
      .filter((r) => r.conferencia === origem.id)
      .map((r) => ({ registro: r, item: itemDoRegistro(r, itensMap, marcasMap) }))
      .sort((a, b) => a.item.nome.localeCompare(b.item.nome, 'pt-BR'))
  }, [origem, registros, itensMap, marcasMap])

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return linhas
    return linhas.filter(
      ({ item }) =>
        item.nome.toLowerCase().includes(termo) ||
        (item.codigo ?? '').toLowerCase().includes(termo) ||
        item.marcaNome.toLowerCase().includes(termo)
    )
  }, [linhas, busca])

  const todosVisiveisMarcados = visiveis.length > 0 && visiveis.every((l) => selecionados.has(l.registro.id))

  const alternar = (id: string) =>
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const alternarTodos = () =>
    setSelecionados((prev) => {
      const next = new Set(prev)
      for (const l of visiveis) {
        if (todosVisiveisMarcados) next.delete(l.registro.id)
        else next.add(l.registro.id)
      }
      return next
    })

  const copiar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!filial) {
      toast({ variant: 'destructive', title: 'Filial é obrigatória' })
      return
    }
    const escolhidos = linhas.filter((l) => selecionados.has(l.registro.id)).map((l) => l.registro)
    try {
      setSaving(true)
      const data = new Date().toISOString().slice(0, 10)
      const nova = await conferenciasRepository.save({
        nome: nome.trim(),
        data,
        observacao: observacao.trim() || null,
        filial,
        tipo: origem.tipo ?? 'normal',
        // a cópia continua no mesmo padrão da conferência de origem
        padrao: origem.padrao ?? null,
        criador_id: user?.id ?? null,
        created_at: formatarDataAtual(),
      })
      for (const r of escolhidos) {
        await registrosRepository.save({
          item: r.item,
          item_nome: r.item_nome ?? null,
          item_codigo: r.item_codigo ?? null,
          item_marca: r.item_marca ?? null,
          item_tipo_contagem: r.item_tipo_contagem ?? null,
          qtd_sistema: copiarSistema ? r.qtd_sistema : 0,
          observacoes: null,
          data,
          conferencia: nova.id,
        })
      }
      toast({
        title: 'Conferência copiada',
        description: `${escolhidos.length} ${escolhidos.length === 1 ? 'item copiado' : 'itens copiados'}${copiarSistema ? ' com valor do sistema' : ''}.`,
      })
      onCopiada(nova)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao copiar',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Copiar conferência">
      <form onSubmit={copiar} className="space-y-4">
        <div>
          <label htmlFor="copia-filial" className="block text-sm font-medium text-slate-700 mb-1.5">
            Filial *
          </label>
          <FilialSelect
            id="copia-filial"
            filiais={filiais}
            value={filial}
            onChange={setFilial}
            incluirTodas={false}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="copia-nome" className="block text-sm font-medium text-slate-700 mb-1.5">
            Nome
          </label>
          <input
            id="copia-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Opcional"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="copia-obs" className="block text-sm font-medium text-slate-700 mb-1.5">
            Observação
          </label>
          <input
            id="copia-obs"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Opcional"
            className={inputCls}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-slate-700">Itens a copiar</span>
            <span className="text-xs text-slate-500">
              {selecionados.size} de {linhas.length}
            </span>
          </div>
          {linhas.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-xl">
              Esta conferência não tem itens. Será criada uma conferência em branco.
            </p>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {linhas.length > 6 && (
                <div className="relative border-b border-slate-100">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar item..."
                    className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              )}
              <label className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border-b border-slate-100 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={todosVisiveisMarcados}
                  onChange={alternarTodos}
                  disabled={visiveis.length === 0}
                  className="w-4 h-4 accent-slate-900"
                />
                {busca.trim() ? 'Marcar resultados' : 'Marcar todos'}
              </label>
              <ul className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                {visiveis.map(({ registro, item }) => (
                  <li key={registro.id}>
                    <label className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selecionados.has(registro.id)}
                        onChange={() => alternar(registro.id)}
                        className="w-4 h-4 accent-slate-900 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-slate-900">{item.nome}</span>
                        {(item.codigo || item.marcaNome) && (
                          <span className="block truncate text-xs text-slate-400">
                            {[item.codigo, item.marcaNome].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-slate-500 shrink-0 tabular-nums">
                        Sist.: {registro.qtd_sistema} {item.unidade}
                      </span>
                    </label>
                  </li>
                ))}
                {visiveis.length === 0 && (
                  <li className="px-3 py-3 text-xs text-slate-400 text-center">Nenhum item encontrado.</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={copiarSistema}
            onChange={(e) => setCopiarSistema(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-slate-900"
          />
          <span>
            <span className="block font-medium text-slate-700">Copiar valor do sistema</span>
            <span className="block text-xs text-slate-400">
              Se desmarcado, os itens começam com valor do sistema zerado. As contagens nunca são copiadas.
            </span>
          </span>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-colors hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? 'Copiando...' : 'Copiar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
