'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaSave, FaUpload } from 'react-icons/fa'
import Link from 'next/link'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    bio: '',
  })
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarUrl, setAvatarUrl] = useState('')

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push('/login')
        return
      }

      setUser(authUser)
      const userEmail = authUser.email || ''

      const { data: clientMatches, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .or(`auth_user_id.eq.${authUser.id},email.eq.${userEmail}`)
        .limit(1)

      if (clientError) throw clientError

      const clientData = Array.isArray(clientMatches) ? clientMatches[0] : clientMatches

      if (clientData) {
        const cd: any = clientData
        setProfile({
          name: cd.name || '',
          email: cd.email || userEmail,
          phone: cd.phone || '',
          company: cd.company || '',
          bio: cd.bio ?? authUser.user_metadata?.bio ?? '',
        })
        const rawAvatar = cd.avatar_url ?? authUser.user_metadata?.avatar_url ?? ''
        if (rawAvatar && !rawAvatar.startsWith('http') && !rawAvatar.startsWith('data:')) {
          const { data: signed } = await supabase.storage
            .from('order-files')
            .createSignedUrl(rawAvatar, 60 * 60)
          setAvatarUrl(signed?.signedUrl || rawAvatar)
        } else {
          setAvatarUrl(rawAvatar)
        }
      } else {
        setProfile({
          name: authUser.user_metadata?.name || '',
          email: userEmail,
          phone: authUser.user_metadata?.phone || '',
          company: '',
          bio: authUser.user_metadata?.bio || '',
        })
        const rawAvatar = authUser.user_metadata?.avatar_url || ''
        if (rawAvatar && !rawAvatar.startsWith('http') && !rawAvatar.startsWith('data:')) {
          const { data: signed } = await supabase.storage
            .from('order-files')
            .createSignedUrl(rawAvatar, 60 * 60)
          setAvatarUrl(signed?.signedUrl || rawAvatar)
        } else {
          setAvatarUrl(rawAvatar)
        }
      }
    } catch (error: Error | unknown) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    fetchUserProfile()
  }, [fetchUserProfile])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setAvatar(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleSaveProfile() {
    if (!user?.id) {
      alert('Session expired. Please sign in again.')
      router.push('/login')
      return
    }
    if (!profile.email) {
      alert('Email is required')
      return
    }

    setSaving(true)
    try {
      let avatarPath = avatarUrl

      // Upload avatar if new file selected
      if (avatar) {
        const safeName = avatar.name.replace(/[^\w.\-]+/g, '_')
        const fileName = `avatars/${user.id}/${Date.now()}_${safeName}`
        const { error: uploadError } = await supabase.storage
          .from('order-files')
          .upload(fileName, avatar, { cacheControl: '3600', upsert: true })

        if (uploadError) throw uploadError
        avatarPath = fileName
      } else if (avatarUrl.startsWith('data:')) {
        avatarPath = user.user_metadata?.avatar_url || ''
      }

      const clientData = {
        auth_user_id: user.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        company: profile.company,
      }

      let existingClientId: string | null = null
      const userEmail = profile.email

      const { data: existingClient, error: existingClientError } = await supabase
        .from('clients')
        .select('id')
        .or(`auth_user_id.eq.${user.id},email.eq.${userEmail}`)
        .limit(1)

      if (existingClientError) throw existingClientError
      if (Array.isArray(existingClient) && existingClient.length > 0) {
        existingClientId = existingClient[0].id
      } else if (existingClient && 'id' in existingClient) {
        existingClientId = existingClient.id
      }

      let error
      if (existingClientId) {
        const result = await supabase
          .from('clients')
          .update({
            ...clientData,
            auth_user_id: user.id,
            avatar_url: avatarPath.startsWith('data:') ? undefined : avatarPath,
          })
          .eq('id', existingClientId)
        error = result.error
      } else {
        const result = await supabase.from('clients').insert({
          ...clientData,
          auth_user_id: user.id,
          avatar_url: avatarPath.startsWith('data:') ? null : avatarPath,
          date_registered: new Date().toISOString(),
        })
        error = result.error
      }

      if (error) throw error

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          bio: profile.bio,
          avatar_url: avatarPath,
        },
      })

      if (metadataError) throw metadataError

      if (avatarPath && !avatarPath.startsWith('data:')) {
        try {
          const { data: signed } = await supabase.storage
            .from('order-files')
            .createSignedUrl(avatarPath, 60 * 60)
          if (signed?.signedUrl) setAvatarUrl(signed.signedUrl)
        } catch {
          /* keep preview */
        }
      }
      window.dispatchEvent(new CustomEvent('profile-updated'))
      alert('Profile updated successfully!')
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : JSON.stringify(error)
      alert(`Error: ${message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href={user?.app_metadata?.role === 'admin' ? '/admin' : '/dashboard'}
          className="inline-flex items-center gap-2 text-purple-700 hover:text-purple-800 mb-6 font-bold">
          <FaArrowLeft /> Back
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

          {/* Avatar Upload */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-4">Profile Picture</label>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" width={96} height={96} />
                ) : (
                  <FaUser className="text-4xl text-gray-400" />
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <label
                  htmlFor="avatar-upload"
                  className="cursor-pointer inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-semibold"
                >
                  <FaUpload /> Upload Photo
                </label>
                <p className="text-xs text-gray-500 mt-2">Max 5MB, PNG or JPG</p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <FaUser size={14} /> Full Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <FaEnvelope size={14} /> Email
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <FaPhone size={14} /> Phone Number
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                value={profile.company}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                placeholder="Your company (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Bio</label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                placeholder="Tell us about yourself..."
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FaSave /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
