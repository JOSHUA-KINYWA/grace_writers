import { NextResponse } from 'next/server'
import { createClient as createSupabaseService } from '@supabase/supabase-js'
import { sendSignupConfirmationEmail } from '@/lib/auth/send-confirmation'
import { getAppUrl } from '@/lib/app-url'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body.email || '')
      .trim()
      .toLowerCase()
    const password = String(body.password || '')
    const name = String(body.name || '').trim()
    const phone = String(body.phone || '').trim() || null

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const service = createSupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: created, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { name, phone, role: 'client' },
    })

    if (createError) {
      const msg = createError.message || 'Signup failed'
      if (/already|registered|exists/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              'An account with this email already exists. Sign in or use “Resend confirmation” on the login page.',
          },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const userId = created.user.id

    const { data: clientRow, error: clientError } = await service
      .from('clients')
      .insert({
        auth_user_id: userId,
        email,
        name,
        phone,
      })
      .select('id')
      .single()

    if (clientError) {
      console.error('[signup] client insert:', clientError.message)
    }

    if (clientRow?.id) {
      await service.auth.admin.updateUserById(userId, {
        user_metadata: {
          name,
          phone,
          role: 'client',
          client_id: clientRow.id,
        },
      })
    }

    const { sent, error: confirmError } = await sendSignupConfirmationEmail(
      service,
      email,
      password
    )
    if (!sent && confirmError) {
      console.error('[signup] confirmation email failed:', confirmError)
    }
    return NextResponse.json({
      success: true,
      userId,
      needsVerification: true,
      confirmationEmailSent: sent,
      confirmError: confirmError || undefined,
      appUrl: getAppUrl(),
      message: sent
        ? 'Account created. Check your email for the confirmation link (also check spam).'
        : 'Account created but confirmation email could not be sent. Use “Resend confirmation” on the login page.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signup failed'
    console.error('[signup]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
