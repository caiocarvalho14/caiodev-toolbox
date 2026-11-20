// src/components/SyncButton.tsx
import { useState } from 'react'
import { RefreshCw, WifiOff, CloudDownload, Wifi, X } from 'lucide-react'
import { useConexao, dispensarAvisoVoltou } from '../lib/conexao'
import { usePendingSyncCount } from '../hooks/usePendingSyncCount'
import { useToast } from '../hooks/useToast'
import { fullSync, SemConexaoError } from '../lib/sync/syncEngine'

export function SyncButton() {
  const { online, voltou } = useConexao()
  const pendingCount = usePendingSyncCount()
  const [syncing, setSyncing] = useState(false)
  const { toast } = useToast()

  const disabled = !online || syncing

  async function handleSync() {
    if (disabled) return
    setSyncing(true)
    try {
      await fullSync()
      toast({ title: 'Sincronização concluída' })
    } catch (err) {
      if (err instanceof SemConexaoError) {
        toast({
          variant: 'destructive',
          title: 'Sem conexão com o servidor',
          description: 'Os dados deste aparelho continuam disponíveis. Tente de novo quando a internet voltar.',
        })
      } else {
        toast({ variant: 'destructive', title: 'Erro ao sincronizar' })
      }
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleSync}
        disabled={disabled}
        title={
          !online
            ? 'Sem conexão com o servidor — usando os dados deste aparelho'
            : pendingCount > 0
              ? `${pendingCount} pendente(s) — clique para sincronizar`
              : 'Clique para buscar atualizações'
        }
        className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          voltou && !syncing
            ? 'border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 disabled:hover:border-slate-200 disabled:hover:text-slate-600'
        }`}
      >
        {!online ? (
          <WifiOff className="w-4 h-4" />
        ) : syncing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <CloudDownload className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">{online ? 'Sincronizar' : 'Sem conexão'}</span>
        <span className="sm:hidden">{online ? 'Sincronizar' : 'Offline'}</span>
        {pendingCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      {/* Aviso verde: a conexão caiu e voltou — hora de sincronizar */}
      {voltou && online && !syncing && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-0 top-full mt-2 z-30 w-64 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          {/* setinha apontando para o botão */}
          <span className="absolute -top-1.5 right-6 w-3 h-3 rotate-45 bg-emerald-600" aria-hidden />
          <div className="relative flex items-start gap-2 p-3">
            <Wifi className="w-5 h-5 shrink-0 mt-0.5" />
            <button type="button" onClick={handleSync} className="flex-1 min-w-0 text-left">
              <span className="block text-sm font-semibold">A internet voltou!</span>
              <span className="block text-xs text-emerald-50">
                {pendingCount > 0
                  ? `${pendingCount} ${pendingCount === 1 ? 'alteração pendente' : 'alterações pendentes'}. Toque para sincronizar.`
                  : 'Toque para sincronizar e atualizar os dados.'}
              </span>
            </button>
            <button
              type="button"
              onClick={dispensarAvisoVoltou}
              aria-label="Dispensar aviso"
              className="-m-1 p-1 rounded-lg text-emerald-50 hover:bg-emerald-700 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
