import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendAppEmail } from '@/lib/email/send'
import type { AppEmailKind } from '@/lib/email/policy'
import { canSendEmail } from '@/lib/email/policy'

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const raw = await req.text()
    let body: Record<string, unknown>
    try {
      body = raw ? JSON.parse(raw) : {}
    } catch (parseErr) {
      console.error('Send email exception: failed to parse JSON body. Raw body:', raw)
      throw parseErr
    }

    const { kind, to, subject, text, html } = body as {
      kind?: AppEmailKind
      to?: string | string[]
      subject?: string
      text?: string
      html?: string
    }

    if (!kind || !canSendEmail(kind)) {
      return NextResponse.json(
        {
          error:
            'Invalid or disabled email kind. See lib/email/policy.ts for allowed kinds.',
        },
        { status: 400 }
      )
    }

    if (!to || !subject || (!text && !html)) {
      return NextResponse.json({ error: 'Missing to/subject/text/html' }, { status: 400 })
    }

    const result = await sendAppEmail({
      kind,
      to,
      subject,
      text,
      html,
    })

    return NextResponse.json(result)
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Send email exception:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
