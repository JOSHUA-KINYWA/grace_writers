import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { emailTemplates } from '@/lib/email-templates'
import { sendEmailToAllAdmins } from '@/lib/email/admin-notify'
import { notifyAllAdmins } from '@/lib/notifications/service'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: order, error: orderError } = await service
      .from('orders')
      .select('*, clients!inner(id, email, name), services(title)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const clientName = order.clients?.name || 'Client'
    const orderTitle = order.title || 'New order'

    await notifyAllAdmins({
      orderId,
      type: 'new_order',
      title: 'New order received',
      message: `${clientName} placed "${orderTitle}"`,
    })

    const html = emailTemplates.newOrderNotificationAdmin(
      clientName,
      order.clients?.email || '',
      orderTitle,
      order.services?.title || 'N/A',
      order.word_count,
      order.deadline,
      order.description,
      order.requirements,
      order.id
    )
    const emailResult = await sendEmailToAllAdmins({
      kind: 'admin_new_order',
      subject: `New order — ${orderTitle}`,
      html,
    })
    if (emailResult.errors.length) {
      console.error('Admin new-order email issues:', emailResult.errors)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Order notification error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
