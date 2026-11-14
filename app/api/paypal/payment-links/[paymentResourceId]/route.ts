import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deletePayPalPaymentLink, getPayPalPaymentLink, updatePayPalPaymentLink } from '@/lib/paypal'

export async function GET(req: Request, { params }: { params: Promise<{ paymentResourceId: string }> }) {
  try {
    const { paymentResourceId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await getPayPalPaymentLink(paymentResourceId)
    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    const error = typeof err?.message === 'string'
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Unable to fetch PayPal payment link details'

    return NextResponse.json({ error }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ paymentResourceId: string }> }) {
  try {
    const { paymentResourceId } = await params
    const body = await req.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = {
      reusable: body?.reusable,
      returnUrl: body?.returnUrl,
      line_items: body?.line_items,
      status: body?.status,
    }

    const data = await updatePayPalPaymentLink(paymentResourceId, payload)
    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    const error = typeof err?.message === 'string'
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Unable to update PayPal payment link'

    return NextResponse.json({ error }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ paymentResourceId: string }> }) {
  try {
    const { paymentResourceId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await deletePayPalPaymentLink(paymentResourceId)
    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    const error = typeof err?.message === 'string'
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Unable to delete PayPal payment link'

    return NextResponse.json({ error }, { status: 500 })
  }
}
