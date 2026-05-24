import { NextResponse } from 'next/server'

/** Status changes: in-app notification only — no email (saves Brevo quota). */
export async function POST() {
  return NextResponse.json({
    success: true,
    skipped: true,
    reason: 'order_status_email_disabled',
  })
}
