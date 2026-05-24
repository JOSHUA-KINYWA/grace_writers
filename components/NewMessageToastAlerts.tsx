'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { FaComments, FaTimes } from 'react-icons/fa'
import { createClient } from '@/lib/supabase/client'

interface MessageAlert {
  id: string
  orderId: string
  title: string
  preview: string
  href: string
  createdAt: string
}

interface NewMessageToastAlertsProps {
  role: 'admin' | 'client'
  userId?: string
}

export default function NewMessageToastAlerts({ role, userId }: NewMessageToastAlertsProps) {
  const [alerts, setAlerts] = useState<MessageAlert[]>([])
  const seenRef = useRef<Set<string>>(new Set())
  const supabase = useMemo(() => createClient(), [])

  const messageHref = useCallback(
    (orderId: string) =>
      role === 'admin'
        ? `/admin/messages?order=${orderId}`
        : `/dashboard/orders/${orderId}`,
    [role]
  )

  const pushAlert = useCallback(
    async (msg: {
      id: string
      order_id: string
      content?: string | null
      created_at?: string | null
    }) => {
      if (!msg?.id || !msg.order_id || seenRef.current.has(msg.id)) return
      seenRef.current.add(msg.id)

      const { data: order } = await supabase
        .from('orders')
        .select('id, title')
        .eq('id', msg.order_id)
        .maybeSingle()

      const alert: MessageAlert = {
        id: msg.id,
        orderId: msg.order_id,
        title: order?.title || 'Order message',
        preview: String(msg.content || 'New message').slice(0, 140),
        href: messageHref(msg.order_id),
        createdAt: msg.created_at || new Date().toISOString(),
      }

      setAlerts((prev) => [alert, ...prev.filter((a) => a.id !== alert.id)].slice(0, 5))
    },
    [messageHref, supabase]
  )

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`new-message-toasts-${role}-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_messages' },
        (payload) => {
          const msg = payload.new as {
            id: string
            order_id: string
            content?: string
            created_at?: string
            is_admin?: boolean
            sender_id?: string
          }
          if (msg.sender_id === userId) return
          const forMe = role === 'admin' ? !msg.is_admin : Boolean(msg.is_admin)
          if (forMe) void pushAlert(msg)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [role, userId, supabase, pushAlert])

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  if (alerts.length === 0) return null

  return (
    <div className="fixed bottom-4 left-4 z-[100] flex flex-col gap-3 w-[min(100vw-2rem,380px)] pointer-events-none">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="pointer-events-auto bg-white rounded-xl border-2 border-blue-200 shadow-xl p-4"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <FaComments className="text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-slate-900 text-sm leading-snug">{alert.title}</p>
                <button
                  type="button"
                  onClick={() => dismissAlert(alert.id)}
                  className="text-slate-400 hover:text-slate-600 shrink-0"
                  aria-label="Dismiss"
                >
                  <FaTimes size={12} />
                </button>
              </div>
              <p className="text-xs font-semibold text-blue-700 mt-0.5">New message — tap to open</p>
              <p className="text-sm text-slate-600 mt-1 line-clamp-2">{alert.preview}</p>
              <Link
                href={alert.href}
                onClick={() => dismissAlert(alert.id)}
                className="inline-block mt-3 text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                Open chat →
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
