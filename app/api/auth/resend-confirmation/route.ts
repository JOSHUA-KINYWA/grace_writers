import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { sendSignupConfirmationEmail } from '@/lib/auth/send-confirmation'
import { getAppUrl } from '@/lib/app-url'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { sent, error } = await sendSignupConfirmationEmail(service, email)

    if (!sent) {
      if (error?.includes('not configured')) {
        return NextResponse.json(
          { error: 'Email not configured on server.', fallback: true },
          { status: 503 }
        )
      }
      console.error('[resend-confirmation]', error)
      return NextResponse.json({
        success: true,
        message: 'If that email is registered, a confirmation link was sent.',
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent. Check your inbox and spam folder.',
      appUrl: getAppUrl(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send confirmation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
