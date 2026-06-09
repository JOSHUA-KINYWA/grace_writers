import { NextResponse } from 'next/server'
import { createPayPalBrowserSafeClientToken } from '@/lib/paypal'

export async function GET() {
  try {
    const token = await createPayPalBrowserSafeClientToken()
    return NextResponse.json(token)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: error || 'Unable to generate browser-safe client token' }, { status: 500 })
  }
}
