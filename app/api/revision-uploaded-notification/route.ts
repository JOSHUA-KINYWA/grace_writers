import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { sendRevisionUploadedNotification } from '@/lib/notifications/revision-upload'

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { revisionId } = body

    if (!revisionId) {
      return NextResponse.json(
        { error: 'Missing revisionId' },
        { status: 400 }
      )
    }

    const isAdmin = user.user_metadata?.role === 'admin'
    if (!isAdmin) {
      const service = createSupabaseService(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: revision } = await service
        .from('revisions')
        .select('orders!inner(client_id)')
        .eq('id', revisionId)
        .maybeSingle()
      const order = Array.isArray(revision?.orders) ? revision.orders[0] : revision?.orders
      if (!order?.client_id) {
        return NextResponse.json({ error: 'Revision not found' }, { status: 404 })
      }
      const { data: client } = await service
        .from('clients')
        .select('auth_user_id, email')
        .eq('id', order.client_id)
        .maybeSingle()
      const ownsRevision =
        client?.auth_user_id === user.id ||
        (client?.email && user.email && client.email.toLowerCase() === user.email.toLowerCase())
      if (!ownsRevision) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    try {
      await sendRevisionUploadedNotification(revisionId, user.id)
    } catch (emailErr) {
      console.error('Error sending revision notification:', emailErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Revision notification error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
