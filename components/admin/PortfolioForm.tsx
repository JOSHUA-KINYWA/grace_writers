'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { showAppToast } from '@/lib/app-toast'

type ServiceOption = { id: string; title: string; category: string | null }

type PortfolioFormProps = {
  itemId?: string
}

export default function PortfolioForm({ itemId }: PortfolioFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = Boolean(itemId)

  const [services, setServices] = useState<ServiceOption[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [clientName, setClientName] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [technologies, setTechnologies] = useState('')
  const [results, setResults] = useState('')
  const [featured, setFeatured] = useState(false)
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [images, setImages] = useState<File[]>([])
  const [loading, setLoading] = useState(Boolean(itemId))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadServices() {
      const { data } = await supabase
        .from('services')
        .select('id, title, category')
        .eq('status', 'active')
        .order('category')
        .order('title')
      setServices((data || []) as ServiceOption[])
    }
    loadServices()
  }, [supabase])

  useEffect(() => {
    if (!itemId) return
    async function loadItem() {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/portfolio/${itemId}`)
        if (!res.ok) throw new Error('Work sample not found')
        const data = await res.json()
        const item = data.item
        setTitle(item.title || '')
        setDescription(item.description || '')
        setClientName(item.client_name || '')
        setServiceId(item.service_id || '')
        setTechnologies((item.technologies || []).join(', '))
        setResults(item.results || '')
        setFeatured(Boolean(item.featured))
        setExistingImages(item.images || [])
      } catch (err) {
        showAppToast(err instanceof Error ? err.message : 'Failed to load', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadItem()
  }, [itemId])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    setImages(Array.from(files))
  }

  function removeExistingImage(path: string) {
    setExistingImages((prev) => prev.filter((p) => p !== path))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const uploadedPaths: string[] = [...existingImages]

      if (images.length > 0) {
        for (const file of images) {
          const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
          const path = `portfolio/${fileName}`
          const { error: uploadErr } = await supabase.storage
            .from('order-files')
            .upload(path, file, { upsert: false })
          if (uploadErr) throw uploadErr
          uploadedPaths.push(path)
        }
      }

      const payload = {
        title,
        description,
        client_name: clientName || null,
        service_id: serviceId || null,
        technologies: technologies ? technologies.split(',').map((t) => t.trim()) : [],
        results,
        featured,
        images: uploadedPaths,
      }

      const res = isEdit
        ? await fetch(`/api/admin/portfolio/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/portfolio/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Save failed')
      }

      showAppToast(isEdit ? 'Work sample updated' : 'Work sample created', 'success')
      router.push('/admin/portfolio')
      router.refresh()
    } catch (err: unknown) {
      showAppToast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!itemId || !confirm('Delete this work sample permanently?')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/portfolio/${itemId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      showAppToast('Work sample deleted', 'success')
      router.push('/admin/portfolio')
    } catch (err: unknown) {
      showAppToast(err instanceof Error ? err.message : 'Delete failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-slate-600">Loading work sample...</p>
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl bg-white p-6 rounded-lg shadow border border-slate-200">
      <p className="text-sm text-slate-600 mb-4">
        Work samples are shared with <strong>all clients</strong> on the dashboard — not tied to one account.
        Use &quot;Sample label&quot; only as a display name (e.g. field or project type).
      </p>
      <div className="grid grid-cols-1 gap-4">
        <label className="block">
          <div className="text-sm font-semibold text-slate-800">Title *</div>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full border rounded-lg p-2 text-slate-900"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-slate-800">Description</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full border rounded-lg p-2 text-slate-900"
            rows={4}
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-slate-800">Sample label (optional)</div>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. Nursing, Business, Engineering"
            className="mt-1 w-full border rounded-lg p-2 text-slate-900"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-slate-800">Category (via service)</div>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="mt-1 w-full border rounded-lg p-2 bg-white text-slate-900"
          >
            <option value="">Select a category / service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.category ? `${service.category} — ` : ''}
                {service.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-slate-800">Technologies (comma separated)</div>
          <input
            value={technologies}
            onChange={(e) => setTechnologies(e.target.value)}
            className="mt-1 w-full border rounded-lg p-2 text-slate-900"
          />
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-slate-800">Results</div>
          <input
            value={results}
            onChange={(e) => setResults(e.target.value)}
            className="mt-1 w-full border rounded-lg p-2 text-slate-900"
          />
        </label>

        {existingImages.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-slate-800 mb-2">Current files</div>
            <ul className="space-y-1 text-sm text-slate-600">
              {existingImages.map((path) => (
                <li key={path} className="flex items-center justify-between gap-2">
                  <span className="truncate">{path.split('/').pop()}</span>
                  <button
                    type="button"
                    onClick={() => removeExistingImage(path)}
                    className="text-red-600 hover:text-red-800 text-xs font-semibold"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <label className="block">
          <div className="text-sm font-semibold text-slate-800">Add images / files</div>
          <input type="file" multiple onChange={handleFileChange} className="mt-1" />
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          <span className="text-sm text-slate-800">Featured</span>
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Upload work sample'}
          </button>
          {isEdit && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleDelete()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
