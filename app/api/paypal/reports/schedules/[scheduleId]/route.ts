import { isAdminUser } from '@/lib/auth/admin'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deletePayPalReportSchedule, updatePayPalReportSchedule } from '@/lib/paypal'

export async function PATCH(req: Request, { params }: { params: Promise<{ scheduleId: string }> }) {
  try {
    const { scheduleId: routeScheduleId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scheduleId = String(routeScheduleId || '').trim()
    const updates = await req.json()

    if (!scheduleId || !updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Missing schedule ID or update payload' }, { status: 400 })
    }

    const data = await updatePayPalReportSchedule(scheduleId, updates)
    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    const error = typeof err?.message === 'string' ? err.message : 'Unable to update PayPal report schedule'
    return NextResponse.json({ error }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ scheduleId: string }> }) {
  try {
    const { scheduleId: routeScheduleId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scheduleId = String(routeScheduleId || '').trim()
    if (!scheduleId) {
      return NextResponse.json({ error: 'Missing schedule ID' }, { status: 400 })
    }

    const data = await deletePayPalReportSchedule(scheduleId)
    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    const error = typeof err?.message === 'string' ? err.message : 'Unable to delete PayPal report schedule'
    return NextResponse.json({ error }, { status: 500 })
  }
}
