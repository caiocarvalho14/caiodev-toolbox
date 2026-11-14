// src/pages/modules/configPage/components/PerfilConfig.tsx
import { useEffect, useState } from 'react'
import { useAuth } from '../../../../contexts/AuthContext'
import { useToast } from '../../../../hooks/useToast'
import { supabase } from '../../../../lib/supabase'
import { pullTable } from '../../../../lib/sync/pullEngine'

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300'

export function PerfilConfig() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [nome, setNome] = useState('')
  const [nomeSalvo, setNomeSalvo] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!user) return
    let ativo = true
    supabase
      .from('sistema_usuario')
      .select('nome')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!ativo) return
        if (error) {
          toast({ variant: 'destructive', title: 'Erro ao carregar perfil', description: error.message })
        } else {
          setNome(data?.nome ?? '')
          setNomeSalvo(data?.nome ?? '')
        }
        setCarregando(false)
      })
    return () => {
      ativo = false
    }
    // só recarrega quando muda o usuário (toast pode não ter identidade estável)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const novoNome = nome.trim()
    if (!novoNome) {
      toast({ variant: 'destructive', title: 'O nome não pode ficar vazio' })
      return
    }

    setSalvando(true)
    const { error } = await supabase.from('sistema_usuario').update({ nome: novoNome }).eq('id', user.id)
    setSalvando(false)

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message })
      return
    }

    setNome(novoNome)
    setNomeSalvo(novoNome)
    toast({ title: 'Nome atualizado' })
    // atualiza o cache offline para o novo nome aparecer nas conferências
    void pullTable('sistema_usuario').catch(() => {})
  }

  const alterado = nome.trim() !== nomeSalvo

  return (
    <div className="max-w-lg">
      <h2 className="text-2xl font-semibold text-slate-900">Perfil</h2>
      <p className="text-sm text-slate-500 mt-0.5 mb-6">
        Este nome aparece para os outros usuários, por exemplo como criador das conferências.
      </p>

      <form onSubmit={salvar} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <label htmlFor="perfil-nome" className="block text-sm font-medium text-slate-700 mb-1.5">
            Nome
          </label>
          <input
            id="perfil-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={carregando || !navigator.onLine}
            placeholder={carregando ? 'Carregando...' : 'Seu nome'}
            maxLength={80}
            className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-500`}
          />
          {!navigator.onLine && (
            <p className="text-xs text-slate-400 mt-1.5">Conecte-se à internet para alterar o nome.</p>
          )}
        </div>

        <div>
          <label htmlFor="perfil-email" className="block text-sm font-medium text-slate-700 mb-1.5">
            E-mail
          </label>
          <input
            id="perfil-email"
            value={user?.email ?? ''}
            disabled
            className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`}
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={salvando || carregando || !alterado}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}
