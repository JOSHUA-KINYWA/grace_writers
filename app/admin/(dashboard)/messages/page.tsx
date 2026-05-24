import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminOrderChat from '@/components/admin/AdminOrderChat'
import AdminOrderRating from '@/components/admin/AdminOrderRating'
import AdminMessagesLiveThreads from '@/components/admin/AdminMessagesLiveThreads'
import { Suspense } from 'react'

interface MessageRow {
  id: string
  order_id: string
  sender_name: string
  content: string
  created_at: string
  is_admin: boolean
  read_status: string
}

interface OrderRow {
  id: string
  title: string
  client_id?: string | null
  clients?:
    | {
        name?: string | null
        email?: string | null
      }
    | Array<{
    name?: string | null
    email?: string | null
      }>
    | null
}

interface AdminMessagesPageProps {
  searchParams?: Promise<{
    q?: string
    unread?: string
    order?: string
  }>
}

export default async function AdminMessagesPage({ searchParams }: Readonly<AdminMessagesPageProps>) {
  const params = (await searchParams) || {}
  const query = (params.q || '').trim().toLowerCase()
  const unreadOnly = params.unread === '1'
  const requestedOrderId = (params.order || '').trim()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'admin') {
    redirect('/admin/login')
  }

  const { data: messageRows, error: messagesError } = await supabase
    .from('order_messages')
    .select('id, order_id, sender_name, content, created_at, is_admin, read_status')
    .order('created_at', { ascending: false })
    .limit(500)

  const orderIds = Array.from(new Set(((messageRows || []) as MessageRow[]).map((m) => m.order_id).filter(Boolean)))

  let orderMap = new Map<string, OrderRow>()
  if (orderIds.length > 0) {
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, title, client_id, clients!client_id(name, email)')
      .in('id', orderIds)

    orderMap = new Map(((ordersData || []) as OrderRow[]).map((o) => [o.id, o]))
  }

  const grouped = new Map<string, { orderId: string; messages: MessageRow[] }>()
  ;((messageRows || []) as MessageRow[]).forEach((m) => {
    if (!grouped.has(m.order_id)) {
      grouped.set(m.order_id, { orderId: m.order_id, messages: [] })
    }
    grouped.get(m.order_id)!.messages.push(m)
  })

  const threads = Array.from(grouped.values())
    .map((thread) => {
      const sorted = [...thread.messages].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const latest = sorted[0]
      const unreadClientCount = sorted.filter((m) => !m.is_admin && m.read_status === 'unread').length
      const order = orderMap.get(thread.orderId)
      const clientData = Array.isArray(order?.clients) ? order?.clients[0] : order?.clients
      return {
        orderId: thread.orderId,
        clientId: order?.client_id || null,
        latest,
        unreadClientCount,
        totalMessages: sorted.length,
        orderTitle: order?.title || 'Untitled order',
        clientName: clientData?.name || latest?.sender_name || 'Client',
        clientEmail: clientData?.email || '',
      }
    })
    .sort((a, b) => new Date(b.latest?.created_at || 0).getTime() - new Date(a.latest?.created_at || 0).getTime())

  const filteredThreads = threads.filter((thread) => {
    if (unreadOnly && thread.unreadClientCount === 0) return false
    if (!query) return true

    const haystack = [
      thread.orderTitle,
      thread.clientName,
      thread.clientEmail,
      thread.latest?.content || '',
      thread.orderId,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(query)
  })

  const selectedThread =
    filteredThreads.find((thread) => thread.orderId === requestedOrderId) ||
    filteredThreads[0] ||
    null

  const buildThreadHref = (orderId: string) => {
    const url = new URLSearchParams()
    if (params.q) url.set('q', params.q)
    if (unreadOnly) url.set('unread', '1')
    url.set('order', orderId)
    return `/admin/messages?${url.toString()}`
  }

  const threadLabel = filteredThreads.length === 1 ? 'thread' : 'threads'

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Messages</h1>
          <p className="mt-2 text-gray-600">
            Manage multiple client conversations by order from a single inbox.
          </p>
        </div>

        {messagesError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            Failed to load messages.
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5">
          <form method="GET" className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              type="text"
              name="q"
              defaultValue={params.q || ''}
              placeholder="Search by order, client, email, message..."
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="unread"
                value="1"
                defaultChecked={unreadOnly}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              Unread only
            </label>
            <button
              type="submit"
              className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 text-sm font-semibold transition"
            >
              Apply
            </button>
            <Link
              href="/admin/messages"
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition text-center"
            >
              Clear
            </Link>
          </form>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-5">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
              <p className="text-sm font-bold text-slate-800">Conversation Queue</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredThreads.length} {threadLabel} shown
              </p>
            </div>

            <div className="max-h-[72vh] overflow-y-auto divide-y divide-gray-100">
              <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading threads...</div>}>
                <AdminMessagesLiveThreads
                  initialThreads={filteredThreads.map((thread) => ({
                    orderId: thread.orderId,
                    href: buildThreadHref(thread.orderId),
                    clientId: thread.clientId,
                    clientName: thread.clientName,
                    clientEmail: thread.clientEmail,
                    orderTitle: thread.orderTitle,
                    latestContent: thread.latest?.content || '',
                    latestAt: thread.latest?.created_at
                      ? new Date(thread.latest.created_at).toLocaleString()
                      : 'Unknown time',
                    unreadClientCount: thread.unreadClientCount,
                  }))}
                  selectedOrderId={selectedThread?.orderId}
                />
              </Suspense>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5">
            {selectedThread ? (
              <>
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Active Conversation</p>
                  <h2 className="mt-1 text-lg font-bold text-gray-900">{selectedThread.orderTitle}</h2>
                  <p className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                    <span>
                      {selectedThread.clientName}
                      {selectedThread.clientEmail ? ` • ${selectedThread.clientEmail}` : ''}
                    </span>
                  </p>
                </div>

                <div className="mb-4">
                  <AdminOrderRating orderId={selectedThread.orderId} />
                </div>

                <AdminOrderChat
                  orderId={selectedThread.orderId}
                  clientName={selectedThread.clientName}
                />
              </>
            ) : (
              <div className="h-[60vh] flex items-center justify-center text-center text-gray-500">
                <div>
                  <p className="font-semibold">No conversation selected</p>
                  <p className="text-sm mt-1">Pick a thread from the queue to view and reply.</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
