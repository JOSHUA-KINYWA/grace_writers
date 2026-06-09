import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchPayPalTransactions } from '@/lib/paypal'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startDate = String(body?.startDate || '').trim()
    const endDate = String(body?.endDate || '').trim()
    const transactionStatus = String(body?.transactionStatus || '').trim()
    const transactionId = String(body?.transactionId || '').trim()
    const page = Number(body?.page || 1)
    let pageSize = Number(body?.pageSize || 50)

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Missing startDate or endDate' }, { status: 400 })
    }

    if (pageSize < 1) pageSize = 1
    if (pageSize > 200) pageSize = 200

    const params: Record<string, string | number> = {
      start_date: startDate,
      end_date: endDate,
      page: page > 0 ? page : 1,
      page_size: pageSize,
    }

    if (transactionStatus) params.transaction_status = transactionStatus
    if (transactionId) params.transaction_id = transactionId

    const data = await searchPayPalTransactions(params)
    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    const error = typeof err?.message === 'string'
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Unable to fetch PayPal transaction report'

    return NextResponse.json({ error }, { status: 500 })
  }
}
