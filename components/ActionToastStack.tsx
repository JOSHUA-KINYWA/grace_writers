'use client'

import { useCallback, useEffect, useState } from 'react'
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa'
import type { AppToastDetail, AppToastVariant } from '@/lib/app-toast'

const VARIANT_STYLES: Record<
  AppToastVariant,
  { border: string; bg: string; text: string; icon: typeof FaInfoCircle }
> = {
  success: {
    border: 'border-green-200',
    bg: 'bg-green-50',
    text: 'text-green-900',
    icon: FaCheckCircle,
  },
  error: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    text: 'text-red-900',
    icon: FaExclamationCircle,
  },
  info: {
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    icon: FaInfoCircle,
  },
}

export default function ActionToastStack() {
  const [toasts, setToasts] = useState<AppToastDetail[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<AppToastDetail>).detail
      if (!detail?.message) return

      setToasts((prev) => [...prev.slice(-4), detail])

      if (detail.variant !== 'error') {
        window.setTimeout(() => dismiss(detail.id), 6000)
      }
    }

    window.addEventListener('app-toast', onToast)
    return () => window.removeEventListener('app-toast', onToast)
  }, [dismiss])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[110] flex flex-col gap-2 w-[min(100vw-2rem,400px)] pointer-events-none">
      {toasts.map((toast) => {
        const style = VARIANT_STYLES[toast.variant]
        const Icon = style.icon
        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${style.border} ${style.bg}`}
          >
            <Icon className={`shrink-0 mt-0.5 ${style.text}`} />
            <p className={`flex-1 text-sm font-medium ${style.text}`}>{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="text-slate-400 hover:text-slate-600 shrink-0"
              aria-label="Dismiss"
            >
              <FaTimes size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
