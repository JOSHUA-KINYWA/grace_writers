'use client'

import { motion } from 'framer-motion'
import { FaChartLine, FaBolt, FaStar, FaTrophy } from 'react-icons/fa'

const stats = [
  { label: 'Projects Delivered', value: '500+', icon: FaChartLine, color: 'text-blue-500' },
  { label: 'Turnaround', value: '24-48hr', icon: FaBolt, color: 'text-yellow-500' },
  { label: 'Average Rating', value: '4.9', icon: FaStar, color: 'text-purple-500' },
  { label: 'Client Satisfaction', value: '98%', icon: FaTrophy, color: 'text-green-500' },
]

export default function SocialProof() {
  return (
    <section className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-gray-600 mb-4">Trusted by professionals from:</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="text-2xl font-bold text-gray-400">Universities</div>
            <div className="text-2xl font-bold text-gray-400">Startups</div>
            <div className="text-2xl font-bold text-gray-400">NGOs</div>
            <div className="text-2xl font-bold text-gray-400">Corporations</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition"
            >
              <div className="flex justify-center mb-3">
                <stat.icon className={`text-4xl ${stat.color}`} />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
