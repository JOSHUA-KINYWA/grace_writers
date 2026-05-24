'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

const portfolioItems = [
  {
    title: 'E-commerce Product Descriptions',
    client: 'Fashion Startup',
    result: '43% increase in sales',
    delivery: '3 days (100 products)',
    preview: 'Elevate your wardrobe with this...'
  },
  {
    title: 'Technical API Documentation',
    client: 'SaaS Company',
    result: 'Reduced support tickets by 60%',
    delivery: '5 days',
    preview: 'Complete REST API guide...'
  },
  {
    title: 'Academic Research Paper',
    client: 'University Student',
    result: 'Received A+ grade',
    delivery: '7 days',
    preview: 'Comprehensive analysis of...'
  }
]

export default function PortfolioShowcase() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            PROOF: REAL PROJECTS, REAL RESULTS
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {portfolioItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-2xl transition-all"
            >
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">CLIENT: {item.client}</p>
              </div>
              <div className="mb-4">
                <p className="text-green-600 font-semibold">RESULT: ⬆️ {item.result}</p>
                <p className="text-gray-600 text-sm mt-1">DELIVERY: {item.delivery}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700 italic">&ldquo;{item.preview}&rdquo;</p>
              </div>
              <Link
                href="/portfolio"
                className="text-purple-600 font-semibold hover:text-purple-700 transition"
              >
                View Full Case Study →
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
