'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FaTimes } from 'react-icons/fa'
import { createClient } from '@/lib/supabase/client'
import { notificationToToast, type OrderToastItem } from '@/lib/order-toast-utils'

interface OrderToastStackProps {
  role: 'admin' | 'client'
  userId?: string
  clientId?: string
}

export default function OrderToastStack({ role, userId, clientId }: OrderToastStackProps) {
  const [toasts, setToasts] = useState<OrderToastItem[]>([])
  const seenRef = useRef<Set<string>>(new Set())
  const supabaseRef = useRef(createClient())

  const dismissToast = useCallback(async (toast: OrderToastItem) => {
    setToasts((prev) => prev.filter((t) => t.id !== toast.id))
    if (toast.id.startsWith('msg-') || toast.badge === 'New message') return
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: toast.id }),
      })
    } catch {
      // non-blocking
    }
  }, [])

  const pushToast = useCallback(async (row: any) => {
    if (!row?.id || seenRef.current.has(row.id)) return
    seenRef.current.add(row.id)

    const supabase = supabaseRef.current
    let order = null
    if (row.order_id) {
      const { data } = await supabase
        .from('orders')
        .select('id, title, deadline, services:service_id(title, category)')
        .eq('id', row.order_id)
        .maybeSingle()
      order = data
    }

    const toast = notificationToToast(row, order, role)
    if (!toast) return

    setToasts((prev) => [toast, ...prev.filter((t) => t.id !== toast.id)].slice(0, 4))

    const isMessageToast =
      row.type === 'new_message' || String(row.id || '').startsWith('msg-')
    if (!isMessageToast) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, 12000)
    }
  }, [role])

  useEffect(() => {
    if (!userId && !clientId) return

    const supabase = supabaseRef.current
    let cancelled = false

    async function loadRecent() {
      if (role === 'admin' && userId) {
        try {
          const res = await fetch('/api/admin/in-app-alerts', { cache: 'no-store' })
          if (res.ok) {
            const data = await res.json()
            const rows = (data.recentNotifications || []).slice(0, 3)
            for (const row of rows.reverse()) {
              await pushToast(row)
            }
          }
        } catch {
          /* fallback below */
        }
        return
      }

      let query = supabase
        .from('notifications')
        .select('id, order_id, title, message, type, created_at, read')
        .or('read.eq.false,read.is.null')
        .order('created_at', { ascending: false })
        .limit(8)

      if (userId && clientId) {
        query = query.or(`user_id.eq.${userId},user_id.eq.${clientId}`)
      } else if (userId) {
        query = query.eq('user_id', userId)
      } else if (clientId) {
        query = query.eq('user_id', clientId)
      }

      const { data } = await query
      if (cancelled || !data?.length) return

      for (const row of data.reverse().slice(-2)) {
        await pushToast(row)
      }
    }

    loadRecent()

    const adminPoll =
      role === 'admin' && userId
        ? setInterval(() => {
            if (!cancelled) void loadRecent()
          }, 5000)
        : null

    const channel = supabase
      .channel(`order-toasts-${role}-${userId || clientId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const row = payload.new as any
          const matchesUser =
            (userId && row.user_id === userId) ||
            (clientId && row.user_id === clientId)
          if (matchesUser) void pushToast(row)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_messages' },
        async (payload) => {
          const msg = payload.new as any
          if (!msg?.order_id || msg.sender_id === userId) return

          const isForAdmin = role === 'admin' && !msg.is_admin
          const isForClient = role === 'client' && msg.is_admin
          if (!isForAdmin && !isForClient) return

          const synthetic = {
            id: `msg-${msg.id}`,
            order_id: msg.order_id,
            title: 'New message',
            message: String(msg.content || '').slice(0, 120),
            type: 'new_message',
            created_at: msg.created_at,
          }
          await pushToast(synthetic)
        }
      )

    if (role === 'admin') {
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new as {
            id: string
            message?: string
            user_id?: string
            chat_room_id?: string
            inserted_at?: string
          }
          if (!msg?.id || msg.user_id === userId) return
          const synthetic = {
            id: `live-${msg.id}`,
            order_id: null,
            title: 'New live chat message',
            message: String(msg.message || '').slice(0, 120),
            type: 'live_chat_message',
            created_at: msg.inserted_at,
          }
          await pushToast(synthetic)
        }
      )
    }

    channel.subscribe()

    return () => {
      cancelled = true
      if (adminPoll) clearInterval(adminPoll)
      supabase.removeChannel(channel)
    }
  }, [userId, clientId, role, pushToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 w-[min(100vw-2rem,380px)] pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white rounded-xl border border-slate-200 shadow-xl p-4 animate-in slide-in-from-right"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-slate-900 text-sm leading-snug pr-2">{toast.title}</h3>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400">
                {new Date(toast.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                type="button"
                onClick={() => dismissToast(toast)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Dismiss"
              >
                <FaTimes size={12} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {toast.badge && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-blue-300 text-blue-700 bg-blue-50">
                {toast.badge}
              </span>
            )}
            {toast.tag && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-slate-300 text-slate-700">
                {toast.tag}
              </span>
            )}
          </div>

          <div className="mt-3 space-y-1 text-sm">
            <p>
              <span className="text-slate-500">Subject: </span>
              <span className="text-slate-900 font-medium">{toast.subject}</span>
            </p>
            <p>
              <span className="text-slate-500">Deadline: </span>
              <span className={toast.deadlineUrgent ? 'text-red-600 font-semibold' : 'text-slate-900'}>
                {toast.deadlineText}
              </span>
            </p>
          </div>

          <p className="text-xs text-slate-600 mt-2 line-clamp-2">{toast.message}</p>

          <div className="mt-3 flex justify-end">
            <Link
              href={toast.href}
              onClick={() => dismissToast(toast)}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              {toast.badge === 'New message' || toast.badge === 'Live chat'
                ? 'Open chat ↗'
                : 'View order ↗'}
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
