import { NextResponse } from 'next/server'
import {
  getAppUrl,
  getPasswordResetRedirectUrl,
  getSignupConfirmRedirectUrl,
} from '@/lib/app-url'

/** Server-side app URLs for client auth fallbacks (avoids localhost baked at build time). */
export async function GET() {
  return NextResponse.json({
    appUrl: getAppUrl(),
    passwordResetRedirect: getPasswordResetRedirectUrl(),
    signupConfirmRedirect: getSignupConfirmRedirectUrl(),
  })
}
