import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPayPalReportSchedule, fetchPayPalReportSchedules } from '@/lib/paypal'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await fetchPayPalReportSchedules()
    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    const error = typeof err?.message === 'string' ? err.message : 'Unable to fetch PayPal report schedules'
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

    const templateId = String(body?.templateId || '').trim()
    const scheduleType = String(body?.scheduleType || 'DAILY').trim() as 'DAILY' | 'WEEKLY' | 'MONTHLY'
    const deliveryMethod = String(body?.deliveryMethod || 'SFTP').trim() as 'SFTP'
    const startDate = String(body?.startDate || '').trim()
    const frequency = Number(body?.frequency || 1)

    if (!templateId || !startDate || frequency <= 0) {
      return NextResponse.json({ error: 'Missing required schedule parameters' }, { status: 400 })
    }

    const data = await createPayPalReportSchedule({ templateId, scheduleType, deliveryMethod, startDate, frequency })
    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    const error = typeof err?.message === 'string' ? err.message : 'Unable to create PayPal report schedule'
    return NextResponse.json({ error }, { status: 500 })
  }
}
