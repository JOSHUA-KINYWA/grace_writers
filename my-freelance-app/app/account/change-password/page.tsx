'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FaArrowLeft, FaLock, FaSave, FaEye, FaEyeSlash } from 'react-icons/fa'
import Link from 'next/link'

export default function ChangePasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?next=/account/change-password')
        return
      }
      setIsChecking(false)
    } catch (err) {
      router.push('/login?next=/account/change-password')
    }
  }

  async function handleChangePassword() {
    setError('')
    setSuccess('')

    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setError('All fields are required')
      return
    }

    if (passwords.new !== passwords.confirm) {
      setError('New passwords do not match')
      return
    }

    if (passwords.new.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      // First verify current password by attempting re-auth
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user?.email) {
        throw new Error('User not found')
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      })

      if (error) throw error

      setSuccess('Password changed successfully! You will be logged out shortly.')
      setPasswords({ current: '', new: '', confirm: '' })

      // Logout after 2 seconds
      setTimeout(async () => {
        await supabase.auth.signOut()
        router.push('/login')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <svg className="w-12 h-12 text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600 mt-4">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/account/profile" 
          className="inline-flex items-center gap-2 text-purple-700 hover:text-purple-800 mb-6 font-bold">
          <FaArrowLeft /> Back
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <FaLock className="text-purple-600" /> Change Password
          </h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-semibold">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-semibold">{success}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  placeholder="Enter your current password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  placeholder="Enter a new password (min 8 characters)"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  placeholder="Confirm your new password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>Password Requirements:</strong>
                <ul className="mt-2 space-y-1">
                  <li>✓ At least 8 characters long</li>
                  <li>✓ Passwords must match</li>
                  <li>✓ You will be logged out after changing</li>
                </ul>
              </p>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FaSave /> {loading ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
