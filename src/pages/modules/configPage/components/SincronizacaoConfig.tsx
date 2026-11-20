// src/pages/modules/configPage/components/SincronizacaoConfig.tsx
// Mostra a fila de envio (syncQueue do IndexedDB) e permite descartá-la.
// Apaga SOMENTE os itens da fila: os registros locais (tabela records) continuam como estão;
// no próximo pull, o que estava pendente é substituído pela versão do servidor.
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CloudOff, Trash2 } from 'lucide-react'
import { offlineDb } from '../../../../lib/offlineDb'
import { useToast } from '../../../../hooks/useToast'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'

const NOMES: Record<string, string> = {
  conf_conferencia: 'Conferências',
  conf_registro: 'Registros',
  conf_contagem: 'Contagens',
  cad_item: 'Itens',
  cad_marca: 'Marcas',
  cad_local: 'Locais',
  cad_filial: 'Filiais',
  conf_modelo: 'Padrões de conferência',
  conf_modelo_item: 'Itens de padrão',
}

export function SincronizacaoConfig() {
  const { toast } = useToast()
  const [confirmando, setConfirmando] = useState(false)
  const [apagando, setApagando] = useState(false)

  const fila = useLiveQuery(() => offlineDb.syncQueue.toArray(), [])
  const total = fila?.length ?? 0

  const porTabela = new Map<string, { upsert: number; delete: number; erro: number }>()
  for (const item of fila ?? []) {
    const t = porTabela.get(item.table) ?? { upsert: 0, delete: 0, erro: 0 }
    t[item.operation]++
    if (item.status === 'error') t.erro++
    porTabela.set(item.table, t)
  }

  const apagarFila = async () => {
    try {
      setApagando(true)
      const qtd = await offlineDb.syncQueue.count()
      await offlineDb.syncQueue.clear() // só a fila; records, sessão e cache ficam intactos
      toast({ title: 'Fila de envio apagada', description: `${qtd} ${qtd === 1 ? 'item descartado' : 'itens descartados'}.` })
      setConfirmando(false)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao apagar a fila',
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setApagando(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-2xl font-semibold text-slate-900">Sincronização</h2>
      <p className="text-sm text-slate-500 mt-0.5 mb-6">
        Alterações feitas neste aparelho que ainda não foram enviadas ao servidor.
      </p>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-slate-700">Pendentes de envio</span>
          <span className="text-2xl font-semibold text-slate-900">{fila === undefined ? '…' : total}</span>
        </div>

        {total > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
            {[...porTabela.entries()]
              .sort((a, b) => b[1].upsert + b[1].delete - (a[1].upsert + a[1].delete))
              .map(([tabela, t]) => (
                <li key={tabela} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-slate-700">{NOMES[tabela] ?? tabela}</span>
                  <span className="text-slate-500 tabular-nums text-xs">
                    {t.upsert > 0 && `${t.upsert} ${t.upsert === 1 ? 'alteração' : 'alterações'}`}
                    {t.upsert > 0 && t.delete > 0 && ' · '}
                    {t.delete > 0 && `${t.delete} ${t.delete === 1 ? 'exclusão' : 'exclusões'}`}
                    {t.erro > 0 && <span className="text-red-600"> · {t.erro} com erro</span>}
                  </span>
                </li>
              ))}
          </ul>
        )}

        {total === 0 && fila !== undefined && (
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-400">
            <CloudOff className="w-4 h-4" />
            Nada pendente: tudo já foi enviado.
          </p>
        )}

        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Apagar a fila descarta essas alterações sem enviá-las. Os dados já salvos no servidor não são afetados, e na
            próxima atualização este aparelho volta a mostrar a versão do servidor.
          </p>
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            disabled={total === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium transition-colors hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <Trash2 className="w-4 h-4" />
            Apagar fila de envio
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmando}
        title="Apagar a fila de envio?"
        description={`${total} ${total === 1 ? 'alteração pendente será descartada' : 'alterações pendentes serão descartadas'} sem ir para o servidor. Esta ação não pode ser desfeita.`}
        confirmLabel="Apagar fila"
        loading={apagando}
        onCancel={() => setConfirmando(false)}
        onConfirm={apagarFila}
      />
    </div>
  )
}
