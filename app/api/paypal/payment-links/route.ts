import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPayPalPaymentLink, listPayPalPaymentLinks } from '@/lib/paypal'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const query: Record<string, string | number | boolean> = {}
    url.searchParams.forEach((value, key) => {
      if (value) query[key] = value
    })

    const data = await listPayPalPaymentLinks(query)
    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    const error = typeof err?.message === 'string'
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Unable to list PayPal payment links'

    return NextResponse.json({ error }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const returnUrl = String(body?.returnUrl || '').trim()
    const lineItems = Array.isArray(body?.line_items) ? body.line_items : []

    if (!returnUrl || lineItems.length === 0) {
      return NextResponse.json({ error: 'Missing returnUrl or line_items' }, { status: 400 })
    }

    const data = await createPayPalPaymentLink({
      integrationMode: body?.integrationMode,
      type: body?.type,
      reusable: body?.reusable,
      returnUrl,
      line_items: lineItems,
    })

    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    const error = typeof err?.message === 'string'
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Unable to create PayPal payment link'

    return NextResponse.json({ error }, { status: 500 })
  }
}
