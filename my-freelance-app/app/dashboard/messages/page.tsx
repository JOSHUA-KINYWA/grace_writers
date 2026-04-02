'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { FaArrowLeft, FaComments, FaSpinner } from 'react-icons/fa'
import { formatDateTime } from '@/lib/utils/formatDate'
import { createClient } from '@/lib/supabase/client'
import ClientLayout from '@/components/client/ClientLayout'

interface Message {
  id: string
  order_id: string
  content: string
  sender_id: string
  sender_name: string
  created_at: string
  read_status: string
  orders?: {
    id: string
    title: string
  }
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [groupedMessages, setGroupedMessages] = useState<{ [key: string]: Message[] }>({})
  const supabase = useMemo(() => createClient(), [])

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user?.email) return

      // Get client
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('email', userData.user.email)
        .single()

      if (!clientData || !(clientData as any).id) return

      const clientId = (clientData as any).id

      // Get messages for this client's orders
      const { data: orderData } = await supabase
        .from('orders')
        .select('id')
        .eq('client_id', clientId)

      const orderIds = (orderData as any)?.map((o: any) => o.id) || []

      if (orderIds.length === 0) {
        setMessages([])
        return
      }

      const { data, error } = await supabase
        .from('order_messages')
        .select(`
          *,
          orders!order_id(id, title)
        `)
        .in('order_id', orderIds)
        .order('created_at', { ascending: false })

      if (!error && data) {
        const msgs = (data as any) || []
        setMessages(msgs)
        
        // Group by order
        const grouped: { [key: string]: Message[] } = {}
        msgs.forEach((msg: any) => {
          const orderId = msg.order_id
          if (!grouped[orderId]) {
            grouped[orderId] = []
          }
          grouped[orderId].push(msg)
        })
        setGroupedMessages(grouped)
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_messages' }, () => {
        fetchMessages()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchMessages])

  useEffect(() => {
    const handleMessagesRead = () => fetchMessages()
    window.addEventListener('messagesRead', handleMessagesRead)
    return () => window.removeEventListener('messagesRead', handleMessagesRead)
  }, [fetchMessages])

  const getOrderLink = (orderId: string, messageId?: string) => {
    const params = new URLSearchParams()
    params.set('showChat', 'true')
    if (messageId) params.set('messageId', messageId)
    return `/dashboard/orders/${orderId}?${params.toString()}`
  }

  const unreadCount = messages.filter(m => m.read_status === 'unread').length

  return (
    <ClientLayout clientName="Client">
      <div className="max-w-6xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-purple-700 hover:text-purple-800 mb-6 font-semibold">
          <FaArrowLeft /> Back to Orders
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Messages & Support</h1>
          {unreadCount > 0 && (
            <span className="px-4 py-2 bg-red-100 text-red-800 rounded-full font-semibold">
              {unreadCount} unread
            </span>
          )}
        </div>

        {/* Messages by Order */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <FaSpinner size={32} className="text-purple-600 animate-spin" />
            </div>
          ) : Object.keys(groupedMessages).length > 0 ? (
            Object.entries(groupedMessages).map(([orderId, msgs]) => (
              <div key={orderId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Order: {msgs[0]?.orders?.title || 'Unknown Order'}</h2>
                    <p className="text-sm text-gray-600 mt-1">ID: {orderId} • {msgs.length} message{msgs.length !== 1 ? 's' : ''}</p>
                  </div>
                  <Link
                    href={getOrderLink(orderId)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold text-sm whitespace-nowrap"
                  >
                    View Chat →
                  </Link>
                </div>

                <div className="divide-y divide-gray-100">
                  {msgs.slice(0, 5).map((msg) => (
                    <Link
                      key={msg.id}
                      href={getOrderLink(orderId, msg.id)}
                      className="block px-6 py-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-gray-900">{msg.sender_name}</span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(msg.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{msg.content}</p>
                      {msg.read_status === 'unread' && (
                        <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">NEW</span>
                      )}
                    </Link>
                  ))}
                  {msgs.length > 5 && (
                    <Link
                      href={getOrderLink(orderId)}
                      className="block px-6 py-3 bg-gray-50 text-center hover:bg-gray-100 transition"
                    >
                      <span className="text-sm font-semibold text-purple-600 hover:text-purple-700">
                        View all {msgs.length} messages in chat →
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
              <FaComments size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 mb-4 text-lg">No messages yet</p>
              <p className="text-gray-500 mb-6">Once your orders get responses, they&apos;ll appear here.</p>
              <Link href="/dashboard" className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold">
                Back to Orders
              </Link>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  )
}
