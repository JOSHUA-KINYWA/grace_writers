'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaStar, FaPaperPlane, FaCheckCircle } from 'react-icons/fa'

export default function SubmitTestimonialPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    client_name: '',
    company: '',
    comment: '',
    rating: 5
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          approved: false, // Admin will review
          featured: false
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit testimonial')
      }

      setSuccess(true)
      setFormData({
        client_name: '',
        company: '',
        comment: '',
        rating: 5
      })

      // Redirect to home after 3 seconds
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to submit testimonial')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-2xl p-12 text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 rounded-full p-6">
              <FaCheckCircle size={48} className="text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h2>
          <p className="text-gray-600 mb-2">Your testimonial has been submitted successfully.</p>
          <p className="text-sm text-gray-500">It will be reviewed and published shortly.</p>
          <p className="text-xs text-gray-400 mt-4">Redirecting in 3 seconds...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Share Your Experience</h1>
          <p className="text-xl text-gray-600">Help others by sharing your testimonial with us</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                required
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Company/Organization (Optional)
              </label>
              <input
                type="text"
                value={formData.company || ''}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="ABC Corporation"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                How would you rate us? *
              </label>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className={`p-3 rounded-lg transition ${
                      formData.rating >= star
                        ? 'bg-yellow-100 text-yellow-500'
                        : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <FaStar size={32} />
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                You selected: {formData.rating} star{formData.rating !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Feedback *
              </label>
              <textarea
                required
                rows={6}
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Share your experience with our services. Tell us what you loved and what we can improve..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <FaPaperPlane size={18} />
              {loading ? 'Submitting...' : 'Submit Testimonial'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Your testimonial will be reviewed before being published.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
