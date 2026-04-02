'use client'

import { motion } from 'framer-motion'
import { FaBolt, FaShieldAlt, FaRedo, FaGlobe, FaBriefcase, FaLock, FaBook, FaCheckCircle } from 'react-icons/fa'

const values = [
  {
    icon: FaBolt,
    title: 'LIGHTNING FAST',
    description: '24-48 hour delivery',
    subtext: 'Rush jobs available'
  },
  {
    icon: FaShieldAlt,
    title: 'ZERO PLAGIARISM',
    description: '100% original content',
    subtext: 'Plagiarism report included'
  },
  {
    icon: FaRedo,
    title: 'UNLIMITED REVISIONS',
    description: 'Free edits until perfect',
    subtext: 'No extra charges'
  },
  {
    icon: FaGlobe,
    title: 'NATIVE ENGLISH',
    description: 'Flawless grammar & style',
    subtext: 'Cultural fluency'
  },
  {
    icon: FaBriefcase,
    title: 'MULTI-INDUSTRY EXPERT',
    description: '50+ subjects covered',
    subtext: 'Technical to creative'
  },
  {
    icon: FaLock,
    title: 'CONFIDENTIAL',
    description: 'NDA available',
    subtext: 'Your secrets are safe'
  },
  {
    icon: FaBook,
    title: 'RESEARCH PRO',
    description: 'Access to paid databases',
    subtext: 'Properly cited sources'
  },
  {
    icon: FaCheckCircle,
    title: 'MONEY-BACK GUARANTEE',
    description: 'Not satisfied? Full refund',
    subtext: 'Risk-free service'
  }
]

export default function ValuePropositions() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            WHY 500+ CLIENTS CHOOSE MY WRITING SERVICES
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => {
            const Icon = value.icon
            return (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-100 text-center"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                    <Icon className="text-white text-2xl" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-700 font-medium mb-1">{value.description}</p>
                <p className="text-sm text-gray-600">{value.subtext}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
