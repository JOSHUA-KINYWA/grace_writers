import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { createSmtpTransport } from '@/lib/smtp'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { revisionId } = body

    if (!revisionId) {
      return NextResponse.json({ error: 'Missing revisionId' }, { status: 400 })
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get revision details with client info
    const { data: revision, error: revError } = await service
      .from('revisions')
      .select('*, orders!inner(id, title, client_id, clients!inner(email, name))')
      .eq('id', revisionId)
      .single()

    if (revError || !revision) {
      return NextResponse.json(
        { error: 'Revision not found' },
        { status: 404 }
      )
    }

    // Send notification to admin about revision upload
    try {
      const transporter = createSmtpTransport()
      const adminEmail = process.env.ADMIN_EMAIL || 'gracewriters82@gmail.com'
      const orderTitle = revision.orders.title

      await transporter.sendMail({
        from: process.env.SMTP_USER || process.env.GMAIL_USER,
        to: adminEmail,
        subject: `Revision Uploaded - ${orderTitle}`,
        html: `
          <h2>Revision Uploaded</h2>
          <p>A new revision has been uploaded for the order "<strong>${orderTitle}</strong>".</p>
          <p>Please review the updated files and confirm whether any further action is needed.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/orders/${revision.orders.id}" style="background-color: #7c3aed; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">View Order</a></p>
          <p>Thank you!</p>
        `,
      })
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
