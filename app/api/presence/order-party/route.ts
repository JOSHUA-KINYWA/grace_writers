import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { isUserOnline } from '@/lib/presence'

export async function GET(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = new URL(req.url).searchParams.get('orderId')
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: order, error: orderError } = await service
      .from('orders')
      .select('client_id, clients!client_id(auth_user_id)')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ isOnline: false, label: 'Unknown' })
    }

    const isAdmin = isAdminUser(user)
    let targetUserIds: string[] = []

    if (isAdmin) {
      const clients = order.clients as
        | { auth_user_id?: string | null }
        | { auth_user_id?: string | null }[]
        | null
      let clientAuthId: string | null = null
      if (Array.isArray(clients) && clients[0]?.auth_user_id) {
        clientAuthId = clients[0].auth_user_id
      } else if (clients && !Array.isArray(clients) && clients.auth_user_id) {
        clientAuthId = clients.auth_user_id
      }
      if (!clientAuthId && order.client_id) {
        const { data: clientRow } = await service
          .from('clients')
          .select('auth_user_id')
          .eq('id', order.client_id)
          .maybeSingle()
        clientAuthId = clientRow?.auth_user_id || null
      }
      if (clientAuthId) {
        targetUserIds = [clientAuthId]
      } else {
        return NextResponse.json({ isOnline: false, label: 'Client' })
      }
    } else {
      const { data: authData } = await service.auth.admin.listUsers({ perPage: 1000 })
      for (const authUser of authData?.users || []) {
        if (isAdminUser(authUser)) {
          targetUserIds.push(authUser.id)
        }
      }
      if (targetUserIds.length === 0) {
        return NextResponse.json({ isOnline: false, label: 'Support team' })
      }
    }

    const { data: statuses } = await service
      .from('user_status')
      .select('user_id, is_online, last_seen')
      .in('user_id', targetUserIds)

    const online = (statuses || []).some((row) =>
      isUserOnline(row.is_online, row.last_seen)
    )

    return NextResponse.json({
      isOnline: online,
      is_online: online,
      label: isAdmin ? 'Client' : 'Support team',
    })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json(
      { error: error.message, isOnline: false, label: 'User' },
      { status: 500 }
    )
  }
}
