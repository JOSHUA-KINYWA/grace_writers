import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPayPalSetupToken, PayPalCardVerificationMethod } from '@/lib/paypal'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const returnUrl = String(body?.returnUrl || '').trim() || undefined
    const cancelUrl = String(body?.cancelUrl || '').trim() || undefined
    const verificationMethod = String(body?.verificationMethod || 'SCA_WHEN_REQUIRED').toUpperCase() as PayPalCardVerificationMethod

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const setupTokenResponse = await createPayPalSetupToken({
      verificationMethod,
      experienceContext: {
        returnUrl,
        cancelUrl,
      },
    })

    const token = String(setupTokenResponse?.id || setupTokenResponse?.setup_token || setupTokenResponse?.setupToken || '')

    return NextResponse.json({ setupToken: token, data: setupTokenResponse })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: error || 'Server error' }, { status: 500 })
  }
}
