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
  const [templates, setTemplates] = useState<any[]>([])
  const [templateName, setTemplateName] = useState('')
  const [repeatLabel, setRepeatLabel] = useState('')

  useEffect(() => {
    checkAuth()
    loadServices()
    loadTemplates()

    const urlParams = new URLSearchParams(window.location.search)
    const serviceId = urlParams.get('service')
    const repeatId = urlParams.get('repeat')
    const templateId = urlParams.get('template')

    if (serviceId) {
      setFormData(prev => ({ ...prev, service_id: serviceId }))
    }

    if (repeatId) {
      const stored = window.localStorage.getItem(`grace_writers_order_repeat_${repeatId}`)
      if (stored) {
        const repeatData = JSON.parse(stored)
        setFormData({
          service_id: repeatData.service_id || '',
          title: repeatData.title || '',
          description: repeatData.description || '',
          requirements: repeatData.requirements || '',
          word_count: repeatData.word_count || '',
          deadline: repeatData.deadline || '',
        })
        setRepeatLabel('Repeat order loaded from previous order')
      }
    }

    if (templateId) {
      const templatesJson = window.localStorage.getItem('grace_writers_order_templates')
      if (templatesJson) {
        const savedTemplates = JSON.parse(templatesJson) as any[]
        const match = savedTemplates.find((item) => item.id === templateId)
        if (match) {
          setFormData({
            service_id: match.service_id || '',
            title: match.title || '',
            description: match.description || '',
            requirements: match.requirements || '',
            word_count: match.word_count || '',
            deadline: match.deadline || '',
          })
          setRepeatLabel(`Template loaded: ${match.name || 'Saved template'}`)
        }
      }
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

  function loadTemplates() {
    const saved = window.localStorage.getItem('grace_writers_order_templates')
    if (saved) {
      try {
        setTemplates(JSON.parse(saved))
      } catch {
        setTemplates([])
      }
    }
  }

  function saveTemplate() {
    if (!formData.title.trim()) {
      setError('Give the template a title before saving it.')
      return
    }

    const savedTemplate = {
      id: `template_${Date.now()}`,
      name: templateName.trim() || formData.title,
      service_id: formData.service_id,
      title: formData.title,
      description: formData.description,
      requirements: formData.requirements,
      word_count: formData.word_count,
      deadline: formData.deadline,
    }

    const nextTemplates = [savedTemplate, ...templates]
    window.localStorage.setItem('grace_writers_order_templates', JSON.stringify(nextTemplates))
    setTemplates(nextTemplates)
    setTemplateName('')
    setError('')
  }

  function deleteTemplate(templateId: string) {
    const nextTemplates = templates.filter((template) => template.id !== templateId)
    window.localStorage.setItem('grace_writers_order_templates', JSON.stringify(nextTemplates))
    setTemplates(nextTemplates)
  }

  function applyTemplate(template: any) {
    setFormData({
      service_id: template.service_id || '',
      title: template.title || '',
      description: template.description || '',
      requirements: template.requirements || '',
      word_count: template.word_count || '',
      deadline: template.deadline || '',
    })
    setRepeatLabel(`Template loaded: ${template.name}`)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Don't upload yet. We upload after the order is created so we can store
    // files under order-<orderId>/... (works with private bucket + signed URLs).
    setUploadedFiles((prev) => [...prev, ...files])

    // Reset input so selecting the same file again works
    e.target.value = ''
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
      // Create order
      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: client.id,
          service_id: formData.service_id || null,
          title: formData.title,
          description: formData.description,
          requirements: formData.requirements,
          word_count: formData.word_count ? parseInt(formData.word_count) : null,
          deadline: formData.deadline || null,
          status: 'pending',
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Upload files after order is created (store bucket-relative paths)
      if (uploadedFiles.length > 0 && createdOrder?.id) {
        setUploadingFiles(true)
        const filePaths: string[] = []

        for (const file of uploadedFiles) {
          const safeName = (file.name || 'attachment').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '_')
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${safeName}`
          const filePath = `order-${createdOrder.id}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('order-files')
            .upload(filePath, file, { cacheControl: '3600', upsert: false })

          if (uploadError) throw uploadError
          filePaths.push(filePath)
        }

        const { error: filesUpdateError } = await supabase
          .from('orders')
          .update({ files_uploaded: filePaths, updated_at: new Date().toISOString() })
          .eq('id', createdOrder.id)

        if (filesUpdateError) throw filesUpdateError
      }

      // Send order notification email
      if (createdOrder?.id) {
        try {
          await fetch('/api/new-order-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: createdOrder.id }),
          })
        } catch (notifyErr) {
          console.error('Failed to send order notification:', notifyErr)
          // Don't fail the order creation if notification fails
        }
      }

      router.push('/dashboard?order=created')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploadingFiles(false)
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

          {repeatLabel && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-lg mb-6">
              <strong>{repeatLabel}</strong>
            </div>
          )}

          {templates.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Saved Order Templates</p>
                  <p className="text-xs text-slate-500">Reuse saved templates to create new orders faster.</p>
                </div>
                <span className="text-xs text-slate-500">{templates.length} saved</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {templates.map((template) => (
                  <div key={template.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 truncate">{template.name}</p>
                        <p className="text-xs text-slate-500 mt-1 truncate">{template.title}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="mt-4 flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className="px-3 py-2 rounded-full bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700"
                      >
                        Use template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Save as template</p>
                  <p className="text-xs text-slate-500">Save the current order fields for reuse later.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                <button
                  type="button"
                  onClick={saveTemplate}
                  className="rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 transition"
                >
                  Save Template
                </button>
              </div>
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
