import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { resolveClientNotifyTarget, notifyAllAdmins } from '@/lib/notifications/service'
import { sendAppEmail } from '@/lib/email/send'
import { isSmtpConfigured } from '@/lib/email/config'
import { getAppUrl } from '@/lib/email/config'

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orderId, deliverables, fileCount = 1 } = await req.json()
    if (!orderId || !Array.isArray(deliverables)) {
      return NextResponse.json({ error: 'orderId and deliverables required' }, { status: 400 })
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: order, error: fetchErr } = await service
      .from('orders')
      .select('id, title, status, client_id')
      .eq('id', orderId)
      .single()

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const autoComplete = ['in_progress', 'revision', 'delivered'].includes(String(order.status))
    const payload: Record<string, unknown> = {
      deliverables,
      updated_at: new Date().toISOString(),
    }

    if (autoComplete) {
      payload.status = 'completed'
      payload.completed_at = new Date().toISOString()
    }

    const { data: updated, error: updateErr } = await service
      .from('orders')
      .update(payload)
      .eq('id', orderId)
      .select()
      .single()

    if (updateErr) throw updateErr

    const target = order.client_id
      ? await resolveClientNotifyTarget(service, order.client_id)
      : null

    const count = Number(fileCount) || 1
    const msg = autoComplete
      ? `${count} file(s) uploaded. Your order is now completed.`
      : `${count} file(s) uploaded for "${order.title}".`

    if (target?.userId) {
      await service.from('notifications').insert({
        user_id: target.userId,
        order_id: orderId,
        type: 'file_upload',
        title: autoComplete ? 'Order completed' : 'New deliverables',
        message: msg,
        read: false,
      })
    }

    if (autoComplete) {
      await notifyAllAdmins({
        orderId,
        type: 'order_update',
        title: 'Order completed',
        message: `"${order.title}" marked completed after file upload`,
      })
    }

    if (target?.email && isSmtpConfigured()) {
      const appUrl = getAppUrl()
      try {
        await sendAppEmail({
          kind: 'deliverable_upload',
          to: target.email,
          subject: autoComplete
            ? `Order completed — ${order.title}`
            : `New deliverables — ${order.title}`,
          html: `<p>${msg}</p><p><a href="${appUrl}/dashboard/orders/${orderId}">View your order</a></p>`,
        })
      } catch (e) {
        console.error('[complete-on-upload] client email failed:', e)
      }
    }

    return NextResponse.json({ order: updated, autoCompleted: autoComplete })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
