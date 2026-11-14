import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { notifyNewAccount } from '@/lib/notifications/new-account'

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { clientName, clientEmail, clientPhone, clientCompany } = body

    if (!clientEmail) {
      return NextResponse.json({ error: 'Missing clientEmail' }, { status: 400 })
    }

    await notifyNewAccount({
      clientName: String(clientName || clientEmail),
      clientEmail: String(clientEmail),
      clientPhone: clientPhone ? String(clientPhone) : null,
      clientCompany: clientCompany ? String(clientCompany) : null,
    })

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
