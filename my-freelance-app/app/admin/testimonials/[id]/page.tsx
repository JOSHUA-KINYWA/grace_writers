'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FaSave, FaTrash, FaArrowLeft } from 'react-icons/fa'

interface TestimonialEditProps {
  params: { id: string }
}

export default function TestimonialEditPage({ params }: TestimonialEditProps) {
  const router = useRouter()
  const isNew = params.id === 'new'
  const [testimonial, setTestimonial] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    client_name: '',
    company: '',
    comment: '',
    rating: 5,
    approved: false,
    featured: false
  })

  useEffect(() => {
    if (!isNew) {
      fetchTestimonial()
    } else {
      // if creating new, try prefilling from order rating query param
      const params = new URLSearchParams(window.location.search)
      const orderId = params.get('orderId')
      if (orderId) {
        fetch(`/api/order-ratings?order_id=${orderId}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              setFormData((f) => ({
                ...f,
                comment: data.review_comment || '',
                rating: data.rating || 5
              }))
            }
          })
          .catch(() => {})
      }
      setLoading(false)
    }
  }, [params.id])

  async function fetchTestimonial() {
    try {
      setLoading(true)
      const res = await fetch(`/api/testimonials?id=${params.id}`)
      if (!res.ok) throw new Error('Failed to fetch testimonial')
      const data = await res.json()
      setTestimonial(data)
      setFormData(data)
    } catch (err) {
      setError('Failed to load testimonial')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      setError('')

      let res
      if (isNew) {
        res = await fetch('/api/testimonials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
      } else {
        res = await fetch('/api/testimonials', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: params.id, ...formData })
        })
      }

      if (!res.ok) throw new Error('Failed to save testimonial')

      const data = await res.json()
      setTestimonial(data)
      alert(isNew ? 'Testimonial created successfully!' : 'Testimonial updated successfully!')
      if (isNew) router.push('/admin/testimonials')
    } catch (err: any) {
      setError(err.message || 'Failed to save testimonial')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this testimonial? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      setError('')

      const res = await fetch(`/api/testimonials?id=${params.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete testimonial')

      alert('Testimonial deleted successfully!')
      router.push('/admin/testimonials')
    } catch (err: any) {
      setError(err.message || 'Failed to delete testimonial')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading testimonial...</p>
        </div>
      </div>
    )
  }

{ !isNew && !testimonial && (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-600 mb-4">Testimonial not found</p>
        <button
          onClick={() => router.push('/admin/testimonials')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Testimonials
        </button>
      </div>
    </div>
  ) }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/testimonials')}
                className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                <FaArrowLeft size={16} /> Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Edit Testimonial</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
          className="space-y-6 bg-white rounded-lg shadow p-8"
        >
          {/* Client Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Name *
            </label>
            <input
              type="text"
              required
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company (Optional)
            </label>
            <input
              type="text"
              value={formData.company || ''}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comment *
            </label>
            <textarea
              required
              rows={6}
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating (1-5 stars) *
            </label>
            <div className="flex items-center gap-4">
              <select
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">⭐ 1 Star</option>
                <option value="2">⭐⭐ 2 Stars</option>
                <option value="3">⭐⭐⭐ 3 Stars</option>
                <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
              </select>
              <span className="text-2xl">
                {[...Array(formData.rating)].map((_, i) => (
                  <span key={i}>⭐</span>
                ))}
              </span>
            </div>
          </div>

          {/* Status Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.approved}
                onChange={(e) => setFormData({ ...formData, approved: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Approved</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Featured</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
            >
              <FaSave size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
            >
              <FaTrash size={16} />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
