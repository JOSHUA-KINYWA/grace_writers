import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { emailTemplates } from '@/lib/email-templates'
import { getAppUrl, isSmtpConfigured } from '@/lib/email/config'
import { notifyAllAdmins } from '@/lib/notifications/service'
import { sendEmailToAllAdmins } from '@/lib/email/admin-notify'
import { sendAppEmail } from '@/lib/email/send'

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { orderId, content } = body
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const isAdmin = user.user_metadata?.role === 'admin'
    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: order, error: orderError } = await service
      .from('orders')
      .select('id, title, client_id, clients!client_id(auth_user_id, email, name)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const clientRow = Array.isArray(order.clients) ? order.clients[0] : order.clients
    if (!isAdmin) {
      const ownsOrder =
        clientRow?.auth_user_id === user.id ||
        (clientRow?.email && user.email && clientRow.email.toLowerCase() === user.email.toLowerCase())
      if (!ownsOrder) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const preview = String(content || 'New message').slice(0, 120)
    const appUrl = getAppUrl()

    if (isAdmin) {
      const notifyUserId = clientRow?.auth_user_id || order.client_id
      if (notifyUserId) {
        await service.from('notifications').insert({
          user_id: notifyUserId,
          order_id: orderId,
          type: 'new_message',
          title: 'Clarification from support',
          message: preview,
          read: false,
        })
      }

      if (clientRow?.email && isSmtpConfigured()) {
        try {
          await sendAppEmail({
            kind: 'clarification_message',
            to: clientRow.email,
            subject: `Clarification needed — ${order.title}`,
            html: emailTemplates.orderMessageNotification(
              clientRow.name || 'Valued Client',
              order.title || 'Your order',
              preview,
              `${appUrl}/dashboard/orders/${orderId}`,
              'Grace Tutors support'
            ),
          })
        } catch (emailErr) {
          console.error('Client clarification email failed:', emailErr)
        }
      }
    } else {
      await notifyAllAdmins({
        orderId,
        type: 'new_message',
        title: `Message from ${clientRow?.name || 'Client'}`,
        message: preview,
      })

      const adminHtml = emailTemplates.orderMessageNotification(
        'Admin',
        order.title || 'Order',
        preview,
        `${appUrl}/admin/messages?order=${orderId}`,
        clientRow?.name || 'A client'
      )
      const emailResult = await sendEmailToAllAdmins({
        kind: 'clarification_message',
        subject: `Client message: ${order.title}`,
        html: adminHtml,
      })
      if (emailResult.errors.length) {
        console.error('Admin message email issues:', emailResult.errors)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
