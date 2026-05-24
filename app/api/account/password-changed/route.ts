import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { emailTemplates } from '@/lib/email-templates'
import { isSmtpConfigured } from '@/lib/email/config'
import { sendAppEmail } from '@/lib/email/send'
import { insertAppNotification } from '@/lib/notifications/service'

export async function POST() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await insertAppNotification({
      userId: user.id,
      orderId: null,
      type: 'password_changed',
      title: 'Password changed',
      message: 'Your account password was updated successfully.',
    }).catch((err) => console.error('Password changed in-app notify failed:', err))

    if (isSmtpConfigured()) {
      await sendAppEmail({
        kind: 'password_changed',
        to: user.email,
        subject: 'Your Grace Tutors password was changed',
        html: emailTemplates.passwordChanged(user.email),
        text: 'Your account password was changed successfully. If you did not make this change, contact support immediately.',
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
