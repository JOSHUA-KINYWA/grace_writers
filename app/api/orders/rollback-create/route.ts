import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const orderId = String(body?.orderId || '').trim()
    const requestedPaths = Array.isArray(body?.filePaths)
      ? body.filePaths.map((path: unknown) => String(path))
      : []
    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    if (requestedPaths.some((path: string) => !path.startsWith(`order-${orderId}/`) || path.includes('..'))) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: order, error: orderError } = await service
      .from('orders')
      .select('id, client_id, status, paid_amount, clients!client_id(auth_user_id, email)')
      .eq('id', orderId)
      .maybeSingle()
    if (orderError) throw orderError
    if (!order) return NextResponse.json({ ok: true })

    const clientValue = order.clients as { auth_user_id?: string | null; email?: string | null } | { auth_user_id?: string | null; email?: string | null }[] | null
    const client = Array.isArray(clientValue) ? clientValue[0] : clientValue
    const owned = client?.auth_user_id === user.id || (
      !client?.auth_user_id && String(client?.email || '').toLowerCase() === String(user.email || '').toLowerCase()
    )
    if (!owned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (order.status !== 'pending' || Number(order.paid_amount || 0) > 0) {
      return NextResponse.json({ error: 'Order is no longer eligible for rollback' }, { status: 409 })
    }

    if (requestedPaths.length) {
      const { error: storageError } = await service.storage.from('order-files').remove(requestedPaths)
      if (storageError) throw storageError
    }
    const { error: deleteError } = await service.from('orders').delete().eq('id', orderId)
    if (deleteError) throw deleteError
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[orders/rollback-create]', message)
    return NextResponse.json({ error: 'Could not fully clean up the incomplete order' }, { status: 500 })
  }
}
