import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { testPayPalAuthentication, testPayPalTransactionSearch, fetchPayPalReportSchedules } from '@/lib/paypal'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authResult = await testPayPalAuthentication()
    const transactionResult = await testPayPalTransactionSearch()
    let scheduleResult:
      | { ok: true; count?: number; raw: any }
      | { ok: false; error: string }
      | null = null

    try {
      const schedules = await fetchPayPalReportSchedules()
      scheduleResult = {
        ok: true,
        count: Array.isArray(schedules?.schedules) ? schedules.schedules.length : undefined,
        raw: schedules,
      }
    } catch (scheduleError: any) {
      scheduleResult = {
        ok: false,
        error: scheduleError?.message || String(scheduleError),
      }
    }

    return NextResponse.json({ ok: true, authResult, transactionResult, scheduleResult })
  } catch (err: any) {
    const error = typeof err?.message === 'string' ? err.message : 'Unable to run PayPal report tests'
    return NextResponse.json({ error }, { status: 500 })
  }
}
