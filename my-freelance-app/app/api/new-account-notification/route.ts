import { NextResponse } from 'next/server'
import { createSmtpTransport } from '@/lib/smtp'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { clientName, clientEmail, clientPhone, clientCompany } = body

    if (!clientEmail) {
      return NextResponse.json({ error: 'Missing clientEmail' }, { status: 400 })
    }

    // Send notification to admin about new account
    try {
      const transporter = createSmtpTransport()
      const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER

      await transporter.sendMail({
        from: process.env.SMTP_USER || process.env.GMAIL_USER,
        to: adminEmail,
        subject: `New Client Account Created - ${clientName || clientEmail}`,
        html: `
          <h2>New Client Account</h2>
          <p>A new client has created an account on Grace Writers.</p>
          <p><strong>Client Details:</strong></p>
          <ul>
            <li><strong>Name:</strong> ${clientName || 'Not provided'}</li>
            <li><strong>Email:</strong> ${clientEmail}</li>
            ${clientPhone ? `<li><strong>Phone:</strong> ${clientPhone}</li>` : ''}
            ${clientCompany ? `<li><strong>Company:</strong> ${clientCompany}</li>` : ''}
          </ul>
          <p>This client is now ready to place orders.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/clients" style="background-color: #7c3aed; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">View All Clients</a></p>
        `,
      })
    } catch (emailErr) {
      console.error('Error sending admin notification:', emailErr)
      // Don't fail the request if email fails
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Account notification error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
