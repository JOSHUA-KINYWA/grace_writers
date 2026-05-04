import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { createSmtpTransport } from '@/lib/smtp'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, newStatus, message } = body

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'Missing orderId or newStatus' }, { status: 400 })
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get order details with client info
    const { data: order, error: orderError } = await service
      .from('orders')
      .select('*, clients!inner(id, email, name)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Send notification to client
    try {
      const transporter = createSmtpTransport()
      const clientEmail = order.clients.email
      const clientName = order.clients.name
      const statusLabel = newStatus.replace('_', ' ').toUpperCase()

      const statusMessages: { [key: string]: string } = {
        'pending': 'Your order has been received and is awaiting review.',
        'in_progress': 'We are working on your order.',
        'completed': 'Your order is complete and ready for delivery!',
        'revision': 'Your order requires revisions. Please review the details.',
        'delivered': 'Your order has been delivered. Thank you!',
        'on_hold': 'Your order has been placed on hold.',
      }

      await transporter.sendMail({
        from: process.env.SMTP_USER || process.env.GMAIL_USER,
        to: clientEmail,
        subject: `Order Status Updated - ${order.title}`,
        html: `
          <h2>Order Status Updated</h2>
          <p>Hi ${clientName},</p>
          <p>Your order "<strong>${order.title}</strong>" status has been updated to: <strong style="color: #7c3aed;">${statusLabel}</strong></p>
          <p>${message || statusMessages[newStatus] || 'Your order status has been updated.'}</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/orders/${order.id}" style="background-color: #7c3aed; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">View Order</a></p>
          <p>Thank you for choosing Grace Writers!</p>
        `,
      })
    } catch (emailErr) {
      console.error('Error sending status notification:', emailErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Order status notification error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
