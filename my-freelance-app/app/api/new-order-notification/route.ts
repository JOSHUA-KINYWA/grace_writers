import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { createSmtpTransport } from '@/lib/smtp'

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

    // Get order details with client info
    const { data: order, error: orderError } = await service
      .from('orders')
      .select('*, clients!inner(id, email, name), services!inner(title)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Send email to admin
    try {
      const transporter = createSmtpTransport()
      const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER

      await transporter.sendMail({
        from: process.env.SMTP_USER || process.env.GMAIL_USER,
        to: adminEmail,
        subject: `New Order Created - ${order.title}`,
        html: `
          <h2>New Order Notification</h2>
          <p><strong>Client:</strong> ${order.clients.name} (${order.clients.email})</p>
          <p><strong>Order Title:</strong> ${order.title}</p>
          <p><strong>Service:</strong> ${order.services?.title || 'N/A'}</p>
          <p><strong>Description:</strong> ${order.description || 'No description'}</p>
          <p><strong>Requirements:</strong> ${order.requirements || 'No specific requirements'}</p>
          ${order.word_count ? `<p><strong>Word Count:</strong> ${order.word_count}</p>` : ''}
          ${order.deadline ? `<p><strong>Deadline:</strong> ${new Date(order.deadline).toLocaleDateString()}</p>` : ''}
          <p><strong>Status:</strong> ${order.status}</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/orders/${order.id}" style="background-color: #7c3aed; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">View Order</a></p>
        `,
      })
    } catch (adminEmailErr) {
      console.error('Error sending admin notification:', adminEmailErr)
      // Don't fail the request if admin email fails
    }

    // Send confirmation email to client
    try {
      const transporter = createSmtpTransport()

      await transporter.sendMail({
        from: process.env.SMTP_USER || process.env.GMAIL_USER,
        to: order.clients.email,
        subject: `Order Received - ${order.title}`,
        html: `
          <h2>Order Received!</h2>
          <p>Hi ${order.clients.name},</p>
          <p>Thank you for placing your order! We've received your request for "<strong>${order.title}</strong>".</p>
          <p><strong>Order Details:</strong></p>
          <ul>
            <li><strong>Service:</strong> ${order.services?.title || 'Custom Service'}</li>
            ${order.word_count ? `<li><strong>Word Count:</strong> ${order.word_count}</li>` : ''}
            ${order.deadline ? `<li><strong>Deadline:</strong> ${new Date(order.deadline).toLocaleDateString()}</li>` : ''}
          </ul>
          <p>Our team will review your order shortly and contact you via WhatsApp or email with a quote and timeline.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="background-color: #7c3aed; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">View Your Orders</a></p>
          <p>Thank you for choosing Grace Writers!</p>
        `,
      })
    } catch (clientEmailErr) {
      console.error('Error sending client confirmation:', clientEmailErr)
      // Don't fail the request
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
