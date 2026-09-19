// src/components/Toaster.tsx
import { useEffect, useState } from 'react'
import { subscribe, type Toast } from '../lib/toastStore'
import { CheckCircle2, XCircle } from 'lucide-react'

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => subscribe(setToasts), [])

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            t.variant === 'destructive'
              ? 'bg-red-50 border-red-200'
              : 'bg-white border-slate-200'
          }`}
        >
          {t.variant === 'destructive' ? (
            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">{t.title}</p>
            {t.description && (
              <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}