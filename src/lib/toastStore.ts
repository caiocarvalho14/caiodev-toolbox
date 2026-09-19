// src/lib/toastStore.ts
export type Toast = {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

type Listener = (toasts: Toast[]) => void

let toasts: Toast[] = []
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l(toasts))
}

export function pushToast(toast: Omit<Toast, 'id'>) {
  const id = crypto.randomUUID()
  toasts = [...toasts, { ...toast, id }]
  emit()
  window.setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, 4000)
}

export function subscribe(listener: Listener) {
  listeners.add(listener)
  listener(toasts)
  return () => listeners.delete(listener)
}