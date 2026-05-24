export type AppToastVariant = 'success' | 'error' | 'info'

export type AppToastDetail = {
  id: string
  message: string
  variant: AppToastVariant
}

export function showAppToast(message: string, variant: AppToastVariant = 'info') {
  if (typeof window === 'undefined') return
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `toast-${Date.now()}`
  window.dispatchEvent(
    new CustomEvent('app-toast', {
      detail: { id, message, variant } satisfies AppToastDetail,
    })
  )
}
