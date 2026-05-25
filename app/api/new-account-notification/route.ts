import { NextResponse } from 'next/server'
import { emailTemplates } from '@/lib/email-templates'
import { sendEmailToAllAdmins } from '@/lib/email/admin-notify'
import { notifyAllAdmins } from '@/lib/notifications/service'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { clientName, clientEmail, clientPhone, clientCompany } = body

    if (!clientEmail) {
      return NextResponse.json({ error: 'Missing clientEmail' }, { status: 400 })
    }

    await notifyAllAdmins({
      orderId: null,
      type: 'admin_new_signup',
      title: 'New client signup',
      message: `${clientName || clientEmail} registered`,
    }).catch(() => {})

    const emailResult = await sendEmailToAllAdmins({
      kind: 'admin_new_signup',
      subject: `New client signup — ${clientName || clientEmail}`,
      html: emailTemplates.newAccountNotification(
        clientName,
        clientEmail,
        clientPhone,
        clientCompany
      ),
    })
    if (emailResult.errors.length) {
      console.error('Admin signup email issues:', emailResult.errors)
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
