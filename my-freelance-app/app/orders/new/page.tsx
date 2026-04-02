'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { FaArrowLeft, FaUpload, FaTimes } from 'react-icons/fa'

export default function NewOrderPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    service_id: '',
    title: '',
    description: '',
    requirements: '',
    word_count: '',
    deadline: '',
  })
  
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)

  useEffect(() => {
    checkAuth()
    loadServices()
    
    // Check for service query parameter
    const urlParams = new URLSearchParams(window.location.search)
    const serviceId = urlParams.get('service')
    if (serviceId) {
      setFormData(prev => ({ ...prev, service_id: serviceId }))
    }
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login?next=/orders/new')
      return
    }
    setUser(user)
  }

  async function loadServices() {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'active')
        .order('title')
      
      if (error) throw error
      setServices(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploadingFiles(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const uploadedUrls: string[] = []
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('order-files')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('order-files')
          .getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
        setUploadedFiles(prev => [...prev, file])
      }
    } catch (err: any) {
      setError(`File upload failed: ${err.message}`)
    } finally {
      setUploadingFiles(false)
    }
  }

  function removeFile(index: number) {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get or create client record
      let { data: client } = await supabase
        .from('clients')
        .select('*')
        .or(`email.eq.${user.email},username.eq.${user.email}`)
        .single()

      if (!client) {
        const userKey = user.email?.split('@')[0] || ''
        const { data: altClient } = await supabase
          .from('clients')
          .select('*')
          .or(`username.eq.${userKey},email.eq.${userKey}`)
          .single()

        if (altClient) {
          client = altClient
        }
      }

      if (!client) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            email: user.email || '',
            username: user.email || '',
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Client',
            auth_user_id: user.id,
          })
          .select()
          .single()

        if (clientError) throw clientError
        client = newClient
      }

      // Upload files and get URLs
      const fileUrls: string[] = []
      for (const file of uploadedFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('order-files')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('order-files')
          .getPublicUrl(filePath)

        fileUrls.push(publicUrl)
      }

      // Create order
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: client.id,
          service_id: formData.service_id || null,
          title: formData.title,
          description: formData.description,
          requirements: formData.requirements,
          word_count: formData.word_count ? parseInt(formData.word_count) : null,
          deadline: formData.deadline || null,
          files_uploaded: fileUrls,
          status: 'pending',
        })

      if (orderError) throw orderError

      router.push('/dashboard?order=created')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6 font-medium">
          <FaArrowLeft /> Back to Dashboard
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Order</h1>
          <p className="text-gray-600 mb-8">Fill in the details below to place your order</p>

          {error && (
            <div className="bg-red-50 border-2 border-red-400 text-red-800 px-4 py-3 rounded-lg mb-6 font-semibold">
              <strong>Error:</strong> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Service Type (Optional)
              </label>
              <select
                value={formData.service_id}
                onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">Select a service...</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Order Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Research Paper on Climate Change"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Description *
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what you need..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Detailed Requirements
              </label>
              <textarea
                rows={6}
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="Include specific requirements, style guidelines, references, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Word Count (if applicable)
                </label>
                <input
                  type="number"
                  value={formData.word_count}
                  onChange={(e) => setFormData({ ...formData, word_count: e.target.value })}
                  placeholder="e.g., 3000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Deadline
                </label>
                <input
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Upload Files (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingFiles}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold"
                >
                  <FaUpload /> {uploadingFiles ? 'Uploading...' : 'Choose Files'}
                </label>
                <p className="text-sm text-gray-700 mt-2 font-medium">
                  Upload reference materials, guidelines, or requirements
                </p>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
              >
                {submitting ? 'Creating Order...' : 'Create Order'}
              </button>
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
