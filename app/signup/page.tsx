'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function SignupPageContent() {
  const [checking, setChecking] = useState(true)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [step, setStep] = useState(1)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const referralCode = useMemo(() => {
    const raw = searchParams?.get('ref')
    return raw ? raw.trim() : ''
  }, [searchParams])

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // User is already logged in - redirect to dashboard
          router.replace('/dashboard')
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          name: formData.name,
          phone: formData.phone
        }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Create client record (link to auth user)
      const { data: clientRow, error: clientError } = await supabase
        .from('clients')
        .insert({
          auth_user_id: data.user.id,
          email: formData.email,
          name: formData.name,
          phone: formData.phone
        })
        .select('id')
        .single()

      if (!clientError && clientRow?.id) {
        // Store client_id into auth metadata for easier filtering elsewhere in the app
        try {
          await supabase.auth.updateUser({
            data: {
              client_id: clientRow.id,
              role: 'client',
            },
          })
        } catch (error_) {
          console.error('Failed to update user metadata:', error_)
        }
      }

      // If user signed up with a referral code, claim it (best-effort)
      if (referralCode) {
        try {
          await fetch('/api/referrals/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: referralCode }),
          })
        } catch (error_) {
          console.error('Failed to claim referral:', error_)
        }
      }

      // Ensure the new client has their own referral code (best-effort)
      try {
        await fetch('/api/referrals/ensure-code', { method: 'POST' })
      } catch (error_) {
        console.error('Failed to ensure referral code:', error_)
      }

      // Send admin notification about new account
      try {
        await fetch('/api/new-account-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: formData.name,
            clientEmail: formData.email,
            clientPhone: formData.phone,
          }),
        })
      } catch (error_) {
        console.error('Failed to send account notification:', error_)
      }

      router.push('/dashboard')
    }
  }

  const handleNextStep = () => {
    if (!formData.name) {
      setError('Please enter your full name')
      return
    }
    if (!formData.email) {
      setError('Please enter your email')
      return
    }
    setError('')
    setStep(2)
  }

  // Show loading spinner while checking authentication
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-12 h-12 text-purple-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-screen">
        {/* Left Side - Hero Section with Features */}
        <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-blue-600 to-purple-600 p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 text-center text-white max-w-md">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full border-2 border-white/30 mb-6">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold mb-4">Join Grace Writers</h2>
              <p className="text-xl text-white/90 leading-relaxed">
                Start your journey with professional writing services. Quick, easy, and secure registration.
              </p>
            </div>

            <div className="mt-12 space-y-4 text-left bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-300 bg-opacity-20">
                    <svg className="h-6 w-6 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M1.414 10.414a2 2 0 112.828-2.828L10 7.172l5.758-5.758a2 2 0 112.828 2.828L12.828 10l5.758 5.758a2 2 0 11-2.828 2.828L10 12.828l-5.758 5.758a2 2 0 01-2.828-2.828L7.172 10 1.414 10.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-lg">Instant Access</p>
                  <p className="text-sm text-white/80">Get started right away</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-300 bg-opacity-20">
                    <svg className="h-6 w-6 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 112 0v1h8V3a1 1 0 112 0v1h1z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-lg">Track Orders</p>
                  <p className="text-sm text-white/80">Monitor your projects in real-time</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-purple-300 bg-opacity-20">
                    <svg className="h-6 w-6 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999a11.954 11.954 0 010 11.002A11.954 11.954 0 1015 10c.001-.164.001-.328 0-.492a9.935 9.935 0 10-1.523 5.027m-2.869-7.431h2.922a9 9 0 110-2v2.468a.466.466 0 00-.466.466v1.064h-2v-1.064a.466.466 0 00-.466-.466H4.35a.466.466 0 00-.466.466v1.064h-2v-1.064a.466.466 0 00-.466-.466V4.5a.466.466 0 00.466-.466zm10.317 7.906a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-lg">Chat Support</p>
                  <p className="text-sm text-white/80">24/7 customer assistance</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-cyan-300 bg-opacity-20">
                    <svg className="h-6 w-6 text-cyan-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1V3a1 1 0 112 0v1h1V3a1 1 0 112 0v1h1V3a1 1 0 012 0v1h1V3a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v1h1a1 1 0 110 2h-1v1h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1h-1v1a1 1 0 11-2 0v-1h-1v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1v-1H2a1 1 0 110-2h1V9H2a1 1 0 110-2h1V6a2 2 0 012-2h2V3a1 1 0 011-1zm0 5h10v10H5V7z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-lg">Secure & Private</p>
                  <p className="text-sm text-white/80">Your data is always protected</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="flex flex-col justify-center items-center p-6 sm:p-12">
          <div className="w-full max-w-sm">
            {/* Logo/Brand */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
              <p className="text-gray-600 text-sm">Join our community of satisfied clients</p>
            </div>

            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`flex items-center justify-center h-8 w-8 rounded-full ${step === 1 ? 'bg-purple-600 text-white' : 'bg-green-500 text-white'}`}>
                    {step === 1 ? '1' : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </div>
                  <span className="text-sm font-medium text-gray-700">Personal Info</span>
                </div>
                <div className={`w-16 h-1 ${step === 1 ? 'bg-gray-200' : 'bg-purple-600'}`}></div>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center justify-center h-8 w-8 rounded-full ${step === 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    2
                  </div>
                  <span className="text-sm font-medium text-gray-700">Security</span>
                </div>
              </div>
            </div>

            <form onSubmit={step === 2 ? handleSignup : (e) => { e.preventDefault(); handleNextStep(); }} className="space-y-5">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-4 rounded-lg flex gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold text-sm">Form Error</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              {step === 1 ? (
                // Step 1: Personal Information
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition outline-none"
                        placeholder="John Doe"
                      />
                      <svg className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                      </svg>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                      Phone Number (WhatsApp)
                    </label>
                    <div className="relative">
                      <input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+254712345678"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition outline-none"
                      />
                      <svg className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-2.404 1.044a8 8 0 006.854 6.854l1.044-2.404a1 1 0 011.06-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2.57a8 8 0 01-7.92-9.428L2 3z" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">We use this for order updates and support</p>
                  </div>
                </>
              ) : (
                // Step 2: Security
                <>
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      <p className={`${formData.password.length >= 6 ? 'text-green-600' : 'text-gray-600'}`}>
                        ✓ At least 6 characters
                      </p>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition outline-none"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      <p className={`${formData.password === formData.confirmPassword && formData.confirmPassword ? 'text-green-600' : 'text-gray-600'}`}>
                        {formData.password === formData.confirmPassword && formData.confirmPassword ? '✓ Passwords match' : 'Passwords must match'}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {step === 1 ? 'Next' : 'Creating...'}
                  </>
                ) : (
                  step === 1 ? 'Next' : 'Create Account'
                )}
              </button>

              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold transition"
                >
                  Back
                </button>
              )}
            </form>

            {/* Divider */}
            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1 border-t border-gray-200"></div>
              <p className="text-xs text-gray-500 font-medium">OR</p>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-700">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Terms & Privacy */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-800 text-center">
                By signing up, you agree to our{' '}
                <Link href="/terms" className="underline font-semibold hover:text-blue-900">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" className="underline font-semibold hover:text-blue-900">Privacy Policy</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <svg className="animate-spin w-12 h-12 text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      }
    >
      <SignupPageContent />
    </Suspense>
  )
}

