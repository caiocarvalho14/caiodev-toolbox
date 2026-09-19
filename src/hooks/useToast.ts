// src/hooks/useToast.ts
import { pushToast, type Toast } from '../lib/toastStore'

export function useToast() {
  function toast(options: Omit<Toast, 'id'>) {
    pushToast(options)
  }
  return { toast }
}