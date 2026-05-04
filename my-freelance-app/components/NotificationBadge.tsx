'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FaBell, FaEnvelope, FaTicketAlt, FaTimes } from 'react-icons/fa'

interface MessageNotification {
  id: string
  orderId: string | null
  lastSender?: string
  title?: string
  lastMessage: string
  unreadCount: number
  timestamp: string
  type: 'order' | 'ticket' | 'system'
}

interface NotificationSummary {
  unreadOrderMessages: number
  unreadTicketMessages: number
  notificationAlerts: number
  pendingTickets: number
  openTickets: number
}

interface NotificationBadgeProps {
  clientId?: string
  userId?: string
}

export default function NotificationBadge({ clientId, userId }: NotificationBadgeProps) {
  const [summary, setSummary] = useState<NotificationSummary>({
    unreadOrderMessages: 0,
    unreadTicketMessages: 0,
    notificationAlerts: 0,
    pendingTickets: 0,
    openTickets: 0
  })
  const [showPanel, setShowPanel] = useState(false)
  const [notifications, setNotifications] = useState<MessageNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [resolvedClientId, setResolvedClientId] = useState<string | undefined>(clientId)
  const supabaseRef = useRef<any>(null)
  const channelRef = useRef<any | null>(null)

  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  useEffect(() => {
    let cancelled = false

    async function resolveClientId() {
      if (clientId) {
        setResolvedClientId(clientId)
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        const authUser = user
        if (!authUser) return

        const metaClientId = (authUser as any).user_metadata?.client_id as string | undefined
        if (metaClientId) {
          if (!cancelled) setResolvedClientId(metaClientId)
          return
        }

        // Fallback: resolve via clients table (best-effort; may be blocked by RLS)
        let q = supabase.from('clients').select('id')
        if (userId) {
          q = q.eq('auth_user_id', userId)
        } else if (authUser.email) {
          q = q.eq('email', authUser.email)
        } else {
          return
        }

        const { data, error } = await q.limit(1)
        if (error) return
        const row = Array.isArray(data) ? data[0] : data
        if (!cancelled) setResolvedClientId((row as any)?.id)
      } catch {
        // ignore; badge will work without client scoping where possible
      }
    }

    resolveClientId()
    return () => {
      cancelled = true
    }
  }, [clientId, userId, supabase])


  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)

      if (!resolvedClientId && !userId) {
        setLoading(false)
        return
      }

      // Get unread order messages
      let orderMsgQuery = supabase
        .from('order_messages')
        .select('order_id, content, sender_name, created_at, read_status, sender_id, orders!inner(client_id)', { count: 'exact' })
        .eq('read_status', 'unread')
        .order('created_at', { ascending: false })

      if (userId) {
        orderMsgQuery = orderMsgQuery.neq('sender_id', userId)
      }

      if (resolvedClientId) {
        orderMsgQuery = orderMsgQuery.eq('orders.client_id', resolvedClientId)
      }

      const { data: orderMsgs, count: orderCount } = await orderMsgQuery

      // Get unread ticket messages
      let ticketMsgQuery = supabase
        .from('support_ticket_messages')
        .select('ticket_id, content, sender_name, created_at, read_status, sender_id, support_tickets!inner(client_id)', { count: 'exact' })
        .eq('read_status', 'unread')
        .order('created_at', { ascending: false })

      if (userId) {
        ticketMsgQuery = ticketMsgQuery.neq('sender_id', userId)
      }

      if (resolvedClientId) {
        ticketMsgQuery = ticketMsgQuery.eq('support_tickets.client_id', resolvedClientId)
      }

      const { data: ticketMsgs, count: ticketCount } = await ticketMsgQuery

      // Get notification alerts from the notifications table
      let notifQuery = supabase
        .from('notifications')
        .select('id, order_id, title, message, created_at, type, read')

      const userKey = userId || clientId
      if (userKey) {
        notifQuery = notifQuery.eq('user_id', userKey)
      }

      const { data: notificationRows } = await notifQuery
      const notificationAlertCount = notificationRows?.filter((row: any) => row.read === false || row.read === null).length || 0

      // Get ticket status counts
      let ticketsQuery = supabase
        .from('support_tickets')
        .select('status', { count: 'exact' })

      if (resolvedClientId) {
        ticketsQuery = ticketsQuery.in('status', ['open', 'in-progress'])
      }

      const { count: openCount } = await ticketsQuery

      setSummary({
        unreadOrderMessages: orderCount || 0,
        unreadTicketMessages: ticketCount || 0,
        notificationAlerts: notificationAlertCount,
        pendingTickets: openCount || 0,
        openTickets: openCount || 0
      })

      // Build notification list
      const allNotifications: MessageNotification[] = []

      if (orderMsgs) {
        const grouped = new Map<string, MessageNotification>()
        orderMsgs.forEach((msg: any) => {
          if (!grouped.has(msg.order_id)) {
            grouped.set(msg.order_id, {
              id: `order-${msg.order_id}`,
              orderId: msg.order_id,
              lastSender: msg.sender_name,
              lastMessage: msg.content.substring(0, 60) + (msg.content.length > 60 ? '...' : ''),
              unreadCount: 0,
              timestamp: msg.created_at,
              type: 'order'
            })
          }
          grouped.get(msg.order_id)!.unreadCount++
        })
        allNotifications.push(...Array.from(grouped.values()))
      }

      if (ticketMsgs) {
        const grouped = new Map<string, MessageNotification>()
        ticketMsgs.forEach((msg: any) => {
          if (!grouped.has(msg.ticket_id)) {
            grouped.set(msg.ticket_id, {
              id: `ticket-${msg.ticket_id}`,
              orderId: msg.ticket_id,
              lastSender: msg.sender_name,
              lastMessage: msg.content.substring(0, 60) + (msg.content.length > 60 ? '...' : ''),
              unreadCount: 0,
              timestamp: msg.created_at,
              type: 'ticket'
            })
          }
          grouped.get(msg.ticket_id)!.unreadCount++
        })
        allNotifications.push(...Array.from(grouped.values()))
      }

      if (notificationRows) {
        notificationRows.forEach((row: any) => {
          allNotifications.push({
            id: row.id,
            orderId: row.order_id || null,
            title: row.title || 'Order update',
            lastMessage: row.message || 'You have a new notification.',
            unreadCount: 1,
            timestamp: row.created_at,
            type: 'system'
          })
        })
      }

      // Sort by timestamp descending
      allNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setNotifications(allNotifications)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [resolvedClientId, userId, clientId, supabase])

  const subscribeToChanges = useCallback(() => {
    if (!channelRef.current) {
      channelRef.current = supabase
        .channel('notification-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_messages' }, () => {
          fetchNotifications()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket_messages' }, () => {
          fetchNotifications()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
          fetchNotifications()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          fetchNotifications()
        })
        .subscribe()
    }
  }, [fetchNotifications, supabase])

  useEffect(() => {
    if (!userId && !resolvedClientId) return

    fetchNotifications()
    subscribeToChanges()

    return () => {
      if (channelRef.current) channelRef.current.unsubscribe()
    }
  }, [resolvedClientId, userId, fetchNotifications, subscribeToChanges])

  // Listen for message read events from other components
  useEffect(() => {
    const handleMessageRead = () => {
      fetchNotifications()
    }

    window.addEventListener('messagesRead', handleMessageRead)
    return () => window.removeEventListener('messagesRead', handleMessageRead)
  }, [fetchNotifications])

  const totalUnread = summary.unreadOrderMessages + summary.unreadTicketMessages + summary.notificationAlerts

  if (!resolvedClientId && !userId) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-gray-100 hover:text-white transition"
        title="Notifications"
      >
        <FaBell size={20} />
        {totalUnread > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaBell size={18} />
              <h3 className="font-bold">Notifications</h3>
              {totalUnread > 0 && (
                <span className="bg-white text-blue-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {totalUnread}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="text-white hover:bg-blue-600 p-1 rounded"
            >
              <FaTimes size={16} />
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 border-b border-gray-200">
            {summary.unreadOrderMessages > 0 && (
              <div className="text-center p-2 bg-blue-50 rounded">
                <p className="text-2xl font-bold text-blue-600">{summary.unreadOrderMessages}</p>
                <p className="text-xs text-blue-700">Order Messages</p>
              </div>
            )}
            {summary.unreadTicketMessages > 0 && (
              <div className="text-center p-2 bg-purple-50 rounded">
                <p className="text-2xl font-bold text-purple-600">{summary.unreadTicketMessages}</p>
                <p className="text-xs text-purple-700">Ticket Messages</p>
              </div>
            )}
            {summary.notificationAlerts > 0 && (
              <div className="text-center p-2 bg-green-50 rounded">
                <p className="text-2xl font-bold text-green-600">{summary.notificationAlerts}</p>
                <p className="text-xs text-green-700">Order Alerts</p>
              </div>
            )}
            {summary.openTickets > 0 && (
              <div className="text-center p-2 bg-yellow-50 rounded">
                <p className="text-2xl font-bold text-yellow-600">{summary.openTickets}</p>
                <p className="text-xs text-yellow-700">Open Tickets</p>
              </div>
            )}
            {totalUnread === 0 && (
              <div className="col-span-2 text-center p-3 text-gray-500">
                <p className="text-sm">No new notifications</p>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <p className="text-sm">Loading...</p>
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {notifications.map((notif) => (
                  <a
                    key={notif.id}
                    href={
                      notif.type === 'order'
                        ? `/dashboard/orders/${notif.orderId}`
                        : notif.type === 'ticket'
                        ? `/dashboard/support/${notif.orderId}`
                        : notif.orderId
                        ? `/dashboard/orders/${notif.orderId}`
                        : '/dashboard'
                    }
                    onClick={() => setShowPanel(false)}
                    className="block p-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`mt-1 ${
                          notif.type === 'order'
                            ? 'text-blue-600'
                            : notif.type === 'ticket'
                            ? 'text-purple-600'
                            : 'text-green-600'
                        }`}
                      >
                        {notif.type === 'order' ? (
                          <FaEnvelope size={14} />
                        ) : notif.type === 'ticket' ? (
                          <FaTicketAlt size={14} />
                        ) : (
                          <FaBell size={14} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 flex items-center gap-1">
                          {notif.title || notif.lastSender || 'Order update'}
                          {notif.unreadCount > 1 && (
                            <span className="bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                              +{notif.unreadCount - 1}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{notif.lastMessage}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <p className="text-sm">No notifications</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
