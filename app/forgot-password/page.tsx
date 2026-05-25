"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { FaEnvelope, FaArrowLeft, FaClock } from 'react-icons/fa'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [lastSubmitTime, setLastSubmitTime] = useState<number | null>(null)

  // Load countdown from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('passwordResetCountdown')
    if (saved) {
      const timeLeft = parseInt(saved) - Date.now()
      if (timeLeft > 0) {
        setCountdown(Math.ceil(timeLeft / 1000))
        setLastSubmitTime(Date.now())
      } else {
        localStorage.removeItem('passwordResetCountdown')
      }
    }
  }, [])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown])

  // Save countdown to localStorage
  useEffect(() => {
    if (countdown > 0) {
      localStorage.setItem('passwordResetCountdown', String(Date.now() + countdown * 1000))
    }
  }, [countdown])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    
    if (!email) return setError('Please enter your email')

    // Check cooldown
    if (countdown > 0) {
      setError(`Please wait ${countdown} seconds before requesting another link`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok && data.fallback) {
        const urlRes = await fetch('/api/app-url')
        const urlData = urlRes.ok ? await urlRes.json() : {}
        const redirectTo =
          urlData.passwordResetRedirect || `${window.location.origin}/auth/callback?next=%2Faccount%2Fchange-password&flow=recovery`
        const { error: supaError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        })
        if (supaError) {
          if (supaError.message.includes('rate limit')) {
            setError('Too many requests. Please wait before trying again.')
            setLoading(false)
            return
          }
          setError(supaError.message || 'Error sending recovery email')
          setLoading(false)
          return
        }
      } else if (!res.ok) {
        if (String(data.error || '').includes('rate limit')) {
          setError('Too many requests. Please wait before trying again.')
          setLoading(false)
          return
        }
        setError(data.error || 'Error sending recovery email')
        setLoading(false)
        return
      }

      setMessage(
        data.message ||
          '✓ If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.'
      )
      setEmail('')
      
      // Set 120-second countdown (increased from 60s to avoid rate limiting)
      setCountdown(120)
      setLastSubmitTime(Date.now())
      
    } catch (err: any) {
      console.error('Password reset error:', err)
      const errorMsg = err.message || 'Failed to request password reset'
      
      // More user-friendly error messages
      if (errorMsg.includes('rate limit')) {
        setError('Too many requests. Please wait at least 1 hour before requesting another reset for this email.')
      } else if (errorMsg.includes('registered')) {
        setError('This email is not registered. Please check and try again.')
      } else {
        setError(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Link href="/login" className="inline-flex items-center gap-2 text-purple-700 hover:text-purple-800 mb-6 font-bold transition">
          <FaArrowLeft /> Back to login
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8 border border-purple-100">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-100 rounded-full mb-6">
            <FaEnvelope className="text-purple-600 text-xl" />
          </div>

          <h1 className="text-3xl font-bold mb-2 text-gray-900">Reset Password</h1>
          <p className="text-gray-600 text-sm mb-6">Enter your email address and we'll send you a link to reset your password.</p>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <p className="text-red-700 font-semibold text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
              <p className="text-green-700 font-semibold text-sm">{message}</p>
              {countdown > 0 && (
                <p className="text-green-600 text-xs mt-2 flex items-center gap-2">
                  <FaClock className="text-xs" />
                  Next request available in {countdown}s
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || countdown > 0}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 transition"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading || countdown > 0}
              className={`w-full py-3 rounded-lg font-bold transition text-white flex items-center justify-center gap-2 ${
                loading || countdown > 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 active:scale-95'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : countdown > 0 ? (
                <>
                  <FaClock className="text-sm" />
                  Wait {countdown}s
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          {/* Security & Rate Limit Notice */}
          <div className="mt-6 space-y-3">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700 flex items-start gap-2">
                <span className="font-bold mt-0.5">ℹ️</span>
                <span>For security reasons, password reset links expire in 1 hour. If you don't receive an email, check your spam folder.</span>
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-800 flex items-start gap-2">
                <span className="font-bold mt-0.5">⚠️</span>
                <span>
                  <strong>Rate Limiting:</strong> Supabase limits password reset requests to 1 per email per hour to protect your account. If you've already requested a reset, check your email or wait 1 hour before requesting another.
                </span>
              </p>
            </div>
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{' '}
            <Link href="/signup" className="text-purple-700 hover:text-purple-800 font-bold transition">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
