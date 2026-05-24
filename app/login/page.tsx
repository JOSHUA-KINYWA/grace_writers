'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // User is already logged in - check role and redirect
          const { data: clientData } = await supabase
            .from('clients')
            .select('id')
            .eq('auth_user_id', user.id)
            .single()

          const userRole = user.user_metadata?.role || 'client'
          const dest = userRole === 'admin' ? '/admin' : '/dashboard'
          window.location.replace(dest)
          return
        }
      } catch (err) {
        console.error('Auth check error:', err)
      } finally {
        setChecking(false)
      }
    }

    checkAuth()
  }, [supabase, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // If a `next` param exists, navigate there after login
      const params = new URLSearchParams(window.location.search)
      const next = params.get('next')
      const serviceParam = params.get('service')

      if (next) {
        let dest = next
        if (serviceParam) {
          dest += dest.includes('?') ? `&service=${encodeURIComponent(serviceParam)}` : `?service=${encodeURIComponent(serviceParam)}`
        }
        router.push(dest)
        return
      }

      // Fallback: redirect based on role
      const { data: userData } = await supabase.auth.getUser()
      const role = userData.user?.user_metadata?.role
      if (role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    }
  }

  return (
    <>
      {checking ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
            <p className="text-gray-300 mt-4">Loading...</p>
          </div>
        </div>
      ) : (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-screen">
        {/* Left Side - Hero Section with Image */}
        <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-purple-600 to-blue-600 p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10 text-center text-white max-w-md">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full border-2 border-white/30 mb-6">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold mb-4">Welcome Back!</h2>
              <p className="text-xl text-white/90 leading-relaxed">
                Access your projects, manage orders, and collaborate with our team. Your dashboard awaits.
              </p>
            </div>

            <div className="mt-12 space-y-4 text-left bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold">Real-time Notifications</p>
                  <p className="text-sm text-white/80">Stay updated on your orders</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold">Secure & Encrypted</p>
                  <p className="text-sm text-white/80">Your data is always protected</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold">24/7 Support</p>
                  <p className="text-sm text-white/80">We&apos;re here to help anytime</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex flex-col justify-center items-center p-6 sm:p-12">
          <div className="w-full max-w-sm">
            {/* Logo/Brand */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
              <p className="text-gray-600 text-sm">Enter your credentials to access your dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-4 rounded-lg flex gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-sm">Login Error</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition outline-none"
                    placeholder="you@example.com"
                  />
                  <svg className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-900">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-xs text-purple-600 hover:text-purple-700 font-medium">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M15.171 13.576l1.474 1.474a1 1 0 01-1.414 1.414l-1.474-1.474M7 6l-6 6m11.172 4.879L10 10.18" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1 border-t border-gray-200"></div>
              <p className="text-xs text-gray-500 font-medium">OR</p>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* Additional Links */}
            <div className="mt-6 space-y-3">
              <div className="text-center">
                <p className="text-sm text-gray-700">
                  Don&apos;t have an account?{' '}
                  <Link href="/signup" className="text-purple-600 hover:text-purple-700 font-semibold">
                    Create one
                  </Link>
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500 text-center mb-2">Admin Users</p>
                <Link href="/admin/login" className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-800 py-2.5 rounded-lg font-medium transition text-sm">
                  Admin Login
                </Link>
              </div>
            </div>

            {/* Security Note */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-800 text-center">
                🔒 Your connection is secure and encrypted. We never store your password in plaintext.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
      )}
    </>
  )
}
