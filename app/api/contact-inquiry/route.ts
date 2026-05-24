import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { emailTemplates } from '@/lib/email-templates'
import { getAdminEmail, isSmtpConfigured } from '@/lib/email/config'
import { sendAppEmail } from '@/lib/email/send'
import { notifyAllAdmins } from '@/lib/notifications/service'

function buildMessageBody(service: string | undefined, message: string) {
  const trimmed = message.trim()
  if (service?.trim()) {
    return `[Service: ${service.trim()}]\n\n${trimmed}`
  }
  return trimmed
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = String(body?.name ?? '').trim()
    const email = String(body?.email ?? '').trim()
    const phone = String(body?.phone ?? '').trim() || null
    const service = String(body?.service ?? '').trim() || undefined
    const message = String(body?.message ?? '').trim()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      )
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!emailOk) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const serviceClient = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const fullMessage = buildMessageBody(service, message)

    const { data: inquiry, error: insertError } = await serviceClient
      .from('inquiries')
      .insert({
        name,
        email,
        phone,
        message: fullMessage,
        status: 'new',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[contact-inquiry] insert failed:', insertError)
      return NextResponse.json(
        { error: insertError.message || 'Could not save your message.' },
        { status: 500 }
      )
    }

    const preview =
      fullMessage.length > 120 ? `${fullMessage.slice(0, 120)}…` : fullMessage

    await notifyAllAdmins({
      type: 'contact_inquiry',
      title: 'New contact form message',
      message: `${name} (${email}): ${preview}`,
    })

    const adminEmail = getAdminEmail()
    if (adminEmail && isSmtpConfigured()) {
      try {
        await sendAppEmail({
          kind: 'admin_contact_inquiry',
          to: adminEmail,
          subject: `Contact form — ${name}`,
          html: emailTemplates.contactInquiryNotification(
            name,
            email,
            phone ?? undefined,
            service,
            fullMessage
          ),
        })
      } catch (emailErr) {
        console.error('[contact-inquiry] admin email failed:', emailErr)
      }
    }

    return NextResponse.json({ success: true, id: inquiry?.id })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('[contact-inquiry] error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
