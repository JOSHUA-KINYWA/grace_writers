'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import WhatsAppButton from '../WhatsAppButton'

const pricingRates = {
  'academic': { min: 0.15, max: 0.25 },
  'business': { min: 0.18, max: 0.28 },
  'technical': { min: 0.20, max: 0.30 },
  'blog': { min: 0.10, max: 0.15 },
  'resume': { flat: 60 }
}

export default function PricingCalculator() {
  const [serviceType, setServiceType] = useState('academic')
  const [wordCount, setWordCount] = useState(1000)
  const [urgency, setUrgency] = useState('standard')

  const calculatePrice = () => {
    if (serviceType === 'resume') {
      return pricingRates.resume.flat || 60
    }

    const rate = pricingRates[serviceType as keyof typeof pricingRates]
    if (!rate || 'flat' in rate) return 0

    const avgRate = (rate.min + rate.max) / 2
    let basePrice = wordCount * avgRate

    if (urgency === 'rush') basePrice *= 1.5
    if (urgency === 'super-rush') basePrice *= 1.5

    return Math.round(basePrice)
  }

  const price = calculatePrice()

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
            SIMPLE, HONEST PRICING - NO SURPRISES
          </h2>
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
                  How many words? ({wordCount} words)
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
                  onClick={() => setUrgency('rush')}
                  className={`px-4 py-3 rounded-lg border-2 transition ${
                    urgency === 'rush'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-300 text-gray-700'
                  }`}
                >
                  Rush (48hrs) +50%
                </button>
              </div>
            </div>

            <div className="border-t-2 border-gray-200 pt-6">
              <div className="text-center mb-6">
                <div className="text-sm text-gray-600 mb-2">ESTIMATED PRICE</div>
                <div className="text-5xl font-bold text-purple-600">${price}</div>
              </div>

              <div className="space-y-2 mb-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Research, Writing, Editing, Formatting</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Unlimited Revisions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Plagiarism Report</span>
                </div>
              </div>

              <div className="text-center">
                <WhatsAppButton
                  message={`Hi! I need ${serviceType} writing. Estimated ${wordCount} words. Can you send me an exact quote?`}
                  className="w-full justify-center"
                >
                  Get Exact Quote via WhatsApp →
                </WhatsAppButton>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="font-semibold mb-2">💡 PRICING GUIDE:</p>
          <div className="grid md:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
            <div>• Blog Posts: $0.10-0.15/word</div>
            <div>• Technical Docs: $0.20-0.30/word</div>
            <div>• Academic Papers: $0.15-0.25/word</div>
            <div>• Business Reports: $0.18-0.28/word</div>
            <div>• Resume Writing: $60-150 (flat rate)</div>
          </div>
        </div>
      </div>
    </section>
  )
}
