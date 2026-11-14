import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'

export async function GET(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const query = (searchParams.get('q') || '').trim().toLowerCase()
    const unreadOnly = searchParams.get('unread') === '1'

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: messageRows, error: messagesError } = await service
      .from('order_messages')
      .select('id, order_id, sender_name, content, created_at, is_admin, read_status')
      .order('created_at', { ascending: false })
      .limit(500)

    if (messagesError) throw messagesError

    const orderIds = Array.from(
      new Set((messageRows || []).map((m) => m.order_id).filter(Boolean))
    )

    let orderMap = new Map<string, { id: string; title: string; client_id: string | null; clients: any }>()
    if (orderIds.length > 0) {
      const { data: ordersData } = await service
        .from('orders')
        .select('id, title, client_id, clients!client_id(name, email)')
        .in('id', orderIds)

      orderMap = new Map((ordersData || []).map((o: any) => [o.id, o]))
    }

    const grouped = new Map<string, { orderId: string; messages: any[] }>()
    ;(messageRows || []).forEach((m) => {
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
        const unreadClientCount = sorted.filter(
          (m) => !m.is_admin && m.read_status === 'unread'
        ).length
        const order = orderMap.get(thread.orderId)
        const clientData = Array.isArray(order?.clients) ? order?.clients[0] : order?.clients

        return {
          orderId: thread.orderId,
          href: `/admin/messages?order=${thread.orderId}${unreadOnly ? '&unread=1' : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}`,
          clientId: order?.client_id || null,
          clientName: clientData?.name || latest?.sender_name || 'Client',
          clientEmail: clientData?.email || '',
          orderTitle: order?.title || 'Untitled order',
          latestContent: latest?.content || '',
          latestAt: latest?.created_at
            ? new Date(latest.created_at).toLocaleString()
            : 'Unknown time',
          unreadClientCount,
        }
      })
      .sort(
        (a, b) =>
          new Date(
            grouped.get(b.orderId)?.messages[0]?.created_at || 0
          ).getTime() -
          new Date(grouped.get(a.orderId)?.messages[0]?.created_at || 0).getTime()
      )

    let filtered = threads
    if (unreadOnly) {
      filtered = filtered.filter((t) => t.unreadClientCount > 0)
    }
    if (query) {
      filtered = filtered.filter((thread) => {
        const haystack = [
          thread.orderTitle,
          thread.clientName,
          thread.clientEmail,
          thread.latestContent,
          thread.orderId,
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(query)
      })
    }

    return NextResponse.json({ threads: filtered })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
