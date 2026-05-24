import { NextResponse } from 'next/server'
import { emailTemplates } from '@/lib/email-templates'
import { getAdminEmail, isSmtpConfigured } from '@/lib/email/config'
import { sendAppEmail } from '@/lib/email/send'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { clientName, clientEmail, clientPhone, clientCompany } = body

    if (!clientEmail) {
      return NextResponse.json({ error: 'Missing clientEmail' }, { status: 400 })
    }

    const adminEmail = getAdminEmail()
    if (adminEmail && isSmtpConfigured()) {
      try {
        await sendAppEmail({
          kind: 'admin_new_signup',
          to: adminEmail,
          subject: `New client signup — ${clientName || clientEmail}`,
          html: emailTemplates.newAccountNotification(
            clientName,
            clientEmail,
            clientPhone,
            clientCompany
          ),
        })
      } catch (emailErr) {
        console.error('Error sending admin signup notification:', emailErr)
      }
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
