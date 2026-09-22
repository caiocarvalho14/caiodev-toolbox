// src/modules/admin/components/UsuarioManager.tsx
import { useEffect, useMemo, useState } from 'react'
import { Plus, User, Settings2, Mail, Trash2 } from 'lucide-react'
import { useToast } from '../../../../hooks/useToast'
import { Modal } from '../../../../components/ui/Modal'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'
import { listarUsuarios, criarUsuario, removerUsuario } from '../services/adminUsersService'
import {
  listarRotas,
  listarRotasDoUsuario,
  definirRotasDoUsuario,
} from '../repositories/rotasRepository'
import {
  listarCargos,
  listarCargosDoUsuario,
  definirCargosDoUsuario,
} from '../repositories/cargosRepository'
import type { Usuario, Rota, Cargo } from '../types/usuario'

export default function UsuarioManager() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const carregar = async () => {
    setLoading(true)
    try {
      const data = await listarUsuarios()
      setUsuarios(data)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar usuários',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void carregar()
  }, [])

  // --- Novo usuário ---
  const [openNovo, setOpenNovo] = useState(false)
  const [formNovo, setFormNovo] = useState({ email: '', password: '' })
  const [criando, setCriando] = useState(false)

  const abrirNovo = () => {
    setFormNovo({ email: '', password: '' })
    setOpenNovo(true)
  }

  const salvarNovo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNovo.email.trim() || !formNovo.password.trim()) {
      toast({ variant: 'destructive', title: 'Preencha email e senha' })
      return
    }
    try {
      setCriando(true)
      await criarUsuario(formNovo.email, formNovo.password)
      toast({ title: 'Usuário criado' })
      setOpenNovo(false)
      await carregar()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar usuário',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setCriando(false)
    }
  }

  // --- Remover usuário ---
  const [toDelete, setToDelete] = useState<Usuario | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirmarDelete = async () => {
    if (!toDelete) return
    try {
      setDeleting(true)
      await removerUsuario(toDelete.id)
      toast({ title: 'Usuário removido' })
      setToDelete(null)
      await carregar()
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

  // --- Permissões (rotas/cargo) ---
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [rotas, setRotas] = useState<Rota[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [rotasSelecionadas, setRotasSelecionadas] = useState<Set<string>>(new Set())
  const [cargosSelecionados, setCargosSelecionados] = useState<Set<string>>(new Set())
  const [carregandoPermissoes, setCarregandoPermissoes] = useState(false)
  const [salvandoPermissoes, setSalvandoPermissoes] = useState(false)

  const abrirPermissoes = async (u: Usuario) => {
    setEditando(u)
    setCarregandoPermissoes(true)
    try {
      const [todasRotas, todosCargos, rotasUsuario, cargosUsuario] = await Promise.all([
        listarRotas(),
        listarCargos(),
        listarRotasDoUsuario(u.id),
        listarCargosDoUsuario(u.id),
      ])
      setRotas(todasRotas)
      setCargos(todosCargos)
      setRotasSelecionadas(new Set(rotasUsuario))
      setCargosSelecionados(new Set(cargosUsuario))
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar permissões',
        description: err instanceof Error ? err.message : undefined,
      })
      setEditando(null)
    } finally {
      setCarregandoPermissoes(false)
    }
  }

  const toggleRota = (id: string) => {
    setRotasSelecionadas((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleCargo = (id: string) => {
    setCargosSelecionados((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const salvarPermissoes = async () => {
    if (!editando) return
    try {
      setSalvandoPermissoes(true)
      await Promise.all([
        definirRotasDoUsuario(editando.id, Array.from(rotasSelecionadas)),
        definirCargosDoUsuario(editando.id, Array.from(cargosSelecionados)),
      ])
      toast({ title: 'Permissões atualizadas' })
      setEditando(null)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar permissões',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setSalvandoPermissoes(false)
    }
  }

  const usuariosOrdenados = useMemo(
    () => [...usuarios].sort((a, b) => a.email.localeCompare(b.email, 'pt-BR')),
    [usuarios]
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Usuários</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {usuarios.length} {usuarios.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-colors hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" />
          Novo usuário
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>
      ) : usuariosOrdenados.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl bg-white">
          <User className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">Nenhum usuário cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {usuariosOrdenados.map((u) => (
            <div
              key={u.id}
              className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-sm font-medium text-slate-900 truncate">{u.email}</span>
                </div>
                <div className="flex gap-1 shrink-0 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => abrirPermissoes(u)}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                    title="Gerenciar permissões"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setToDelete(u)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-slate-500 hover:text-red-600"
                    title="Remover usuário"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Novo usuário */}
      <Modal open={openNovo} onClose={() => setOpenNovo(false)} title="Novo usuário">
        <form onSubmit={salvarNovo} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={formNovo.email}
              onChange={(e) => setFormNovo({ ...formNovo, email: e.target.value })}
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
              Senha inicial *
            </label>
            <input
              id="password"
              type="text"
              value={formNovo.password}
              onChange={(e) => setFormNovo({ ...formNovo, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpenNovo(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:border-slate-300 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={criando}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
            >
              {criando ? 'Criando...' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Permissões (rotas + cargo) */}
      <Modal
        open={!!editando}
        onClose={() => setEditando(null)}
        title={editando ? `Permissões — ${editando.email}` : ''}
      >
        {carregandoPermissoes ? (
          <p className="text-sm text-slate-400 py-4">Carregando...</p>
        ) : (
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Rotas permitidas</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2">
                {rotas.map((r) => (
                  <label
                    key={r.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={rotasSelecionadas.has(r.id)}
                      onChange={() => toggleRota(r.id)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-slate-700">{r.nome}</span>
                    <span className="text-slate-400 text-xs">{r.path}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Cargo</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2">
                {cargos.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={cargosSelecionados.has(c.id)}
                      onChange={() => toggleCargo(c.id)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-slate-700">{c.cargo}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditando(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:border-slate-300 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                onClick={salvarPermissoes}
                disabled={salvandoPermissoes}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
              >
                {salvandoPermissoes ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Remover usuário?"
        description={
          toDelete
            ? `Tem certeza que deseja remover "${toDelete.email}"? Isso apaga o login dele permanentemente. Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Remover"
        loading={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmarDelete}
      />
    </div>
  )
}