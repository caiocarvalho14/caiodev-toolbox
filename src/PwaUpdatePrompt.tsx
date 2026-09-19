// src/PwaUpdatePrompt.tsx
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh && !offlineReady) return null

  return (
    <div className="fixed bottom-4 right-4 bg-slate-800 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
      {needRefresh ? (
        <>
          Nova versão disponível.{' '}
          <button className="underline" onClick={() => updateServiceWorker(true)}>
            Atualizar
          </button>
        </>
      ) : (
        'App pronto pra funcionar offline.'
      )}
    </div>
  )
}