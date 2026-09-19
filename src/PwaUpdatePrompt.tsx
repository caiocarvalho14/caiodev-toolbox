// src/PwaUpdatePrompt.tsx
import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'
import RippleButton from './components/RippleButton'

const DISMISS_KEY = 'pwa-update-modal-dismissed'

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  // Controla se o modal já foi mostrado/dispensado nesta sessão de app.
  // sessionStorage garante que não reaparece ao navegar entre páginas,
  // mas volta a perguntar numa nova sessão/reload.
  const [showModal, setShowModal] = useState(false)
  const hasEvaluated = useRef(false)

  useEffect(() => {
    if (!needRefresh || hasEvaluated.current) return
    hasEvaluated.current = true

    const alreadyDismissed = sessionStorage.getItem(DISMISS_KEY) === 'true'
    if (!alreadyDismissed) {
      setShowModal(true)
    }
  }, [needRefresh])

  function handleUpdateNow() {
    updateServiceWorker(true)
  }

  function handleLater() {
    sessionStorage.setItem(DISMISS_KEY, 'true')
    setShowModal(false)
  }

  // Toast simples de "app pronto para uso offline" — desaparece sozinho
  useEffect(() => {
    if (!offlineReady) return
    const timer = setTimeout(() => setOfflineReady(false), 4000)
    return () => clearTimeout(timer)
  }, [offlineReady, setOfflineReady])

  return (
    <>
      {/* Modal — aparece 1x quando há atualização disponível */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={handleLater}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-4 shadow-sm">
              <RefreshCw className="w-6 h-6 text-white" />
            </div>

            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Nova versão disponível
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Uma atualização do aplicativo está pronta. Atualize agora para
              acessar as últimas melhorias.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleLater}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                Atualizar depois
              </button>
              <RippleButton onClick={handleUpdateNow}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium transition-colors hover:bg-slate-800" >Atualizar Agora</RippleButton>
            </div>
          </div>
        </div>
      )}

      {/* Botão do canto — só ícone, some quando o modal está aberto */}
      {needRefresh && !showModal && (
        <button
          onClick={handleUpdateNow}
          title="Atualizar aplicativo"
          className="fixed bottom-4 right-4 z-40 w-11 h-11 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 hover:bg-slate-700"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}

      {/* Toast de app pronto offline (opcional, discreto) */}
      {offlineReady && (
        <div className="fixed bottom-4 right-4 z-40 bg-slate-800 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
          App pronto para uso offline.
        </div>
      )}
    </>
  )
}