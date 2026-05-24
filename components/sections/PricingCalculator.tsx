'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import GetQuoteButton from '../GetQuoteButton'

export default function PricingCalculator() {
  const [serviceType, setServiceType] = useState('academic')
  const [wordCount, setWordCount] = useState(1000)
  const [urgency, setUrgency] = useState('standard')

  return (
    <section className="py-20 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            REQUEST A CUSTOM QUOTE
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Tell us about your project. Pricing is agreed with our team after you place an order — nothing is shown until we confirm with you.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl shadow-2xl p-8"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                What do you need?
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="academic">Academic Writing</option>
                <option value="business">Business Content</option>
                <option value="technical">Technical Documentation</option>
                <option value="blog">Blog/SEO Content</option>
                <option value="resume">Resume/Cover Letter</option>
              </select>
            </div>

            {serviceType !== 'resume' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Approximate length ({wordCount} words)
                </label>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="100"
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>500</span>
                  <span>5000</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                When do you need it?
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setUrgency('standard')}
                  className={`px-4 py-3 rounded-lg border-2 transition ${
                    urgency === 'standard'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 text-gray-700'
                  }`}
                >
                  Standard (5-7 days)
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('rush')}
                  className={`px-4 py-3 rounded-lg border-2 transition ${
                    urgency === 'rush'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 text-gray-700'
                  }`}
                >
                  Rush (48hrs)
                </button>
              </div>
            </div>

            <div className="border-t-2 border-gray-200 pt-6">
              <div className="space-y-2 mb-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Research, writing, editing, and formatting</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Unlimited revisions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Plagiarism report included</span>
                </div>
              </div>

              <div className="text-center">
                <GetQuoteButton className="w-full justify-center">
                  Get a quote — sign in or create an account →
                </GetQuoteButton>
                <p className="mt-3 text-xs text-gray-500">
                  New here? You&apos;ll be asked to log in or sign up, then you can submit your order.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
