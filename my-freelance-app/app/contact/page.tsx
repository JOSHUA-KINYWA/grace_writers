'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import WhatsAppButton from '@/components/WhatsAppButton'
import { FaEnvelope, FaWhatsapp } from 'react-icons/fa'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('inquiries')
      .insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message
      })

    setLoading(false)
    if (!error) {
      setSubmitted(true)
      setFormData({ name: '', email: '', phone: '', service: '', message: '' })
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Message Sent!</h2>
          <p className="text-gray-600 mb-6">
            Thank you for contacting us. We'll get back to you within 2 hours.
          </p>
          <WhatsAppButton
            message="Hi! I just submitted a contact form. Can we discuss my project?"
            className="w-full justify-center"
          >
            Chat on WhatsApp
          </WhatsAppButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-600">
            Have a project in mind? Let's discuss how I can help you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Contact Form</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6">Direct Contact</h2>
              <div className="space-y-4">
                <a
                  href="https://wa.me/254715423188"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
                >
                  <FaWhatsapp className="text-3xl text-green-600" />
                  <div>
                    <div className="font-semibold text-gray-900">WhatsApp</div>
                    <div className="text-gray-600">+254 715 423188</div>
                  </div>
                </a>

                <a
                  href="mailto:Gracewriters82@gmail.com"
                  className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                >
                  <FaEnvelope className="text-3xl text-blue-600" />
                  <div>
                    <div className="font-semibold text-gray-900">Email</div>
                    <div className="text-gray-600">Gracewriters82@gmail.com</div>
                  </div>
                </a>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-8">
              <h3 className="font-bold text-lg mb-4">Quick Response</h3>
              <p className="text-gray-700 mb-4">
                Get a response within 2 hours via WhatsApp or email.
              </p>
              <WhatsAppButton
                message="Hi! I'd like to discuss a project. Can we chat?"
                className="w-full justify-center"
              >
                Start Chat Now
              </WhatsAppButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
