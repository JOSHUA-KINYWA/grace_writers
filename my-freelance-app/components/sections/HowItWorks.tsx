'use client'

import { motion } from 'framer-motion'
import { FaEdit, FaCog, FaCheckCircle, FaShoppingCart } from 'react-icons/fa'
import Link from 'next/link'

const steps = [
  {
    icon: FaEdit,
    title: 'TELL ME WHAT YOU NEED',
    items: ['Fill form', 'Share details', 'WhatsApp quote'],
    time: 'Takes 5 minutes'
  },
  {
    icon: FaCog,
    title: 'I WRITE YOUR CONTENT',
    items: ['24-48hr delivery', 'Progress updates', 'Draft review'],
    time: 'I do all the work'
  },
  {
    icon: FaCheckCircle,
    title: 'YOU GET PERFECT CONTENT',
    items: ['Review draft', 'Request changes', 'Download files'],
    time: 'Get your content'
  }
]

export default function HowItWorks() {
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
            GET YOUR CONTENT IN 3 EASY STEPS - NO HASSLE
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="text-center"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                    <Icon className="text-white text-3xl" />
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-sm font-semibold text-purple-600 mb-2">STEP {index + 1}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                </div>
                <ul className="space-y-2 mb-4 text-gray-600">
                  {step.items.map((item, i) => (
                    <li key={i} className="flex items-center justify-center gap-2">
                      <span className="text-purple-600">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-gray-500 italic">[{step.time}]</p>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 text-3xl text-purple-600">
                    →
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        <div className="text-center">
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-full font-semibold hover:from-purple-700 hover:to-blue-700 transition shadow-lg hover:shadow-xl text-lg"
          >
            <FaShoppingCart /> Create Your Order Now - Get Started
          </Link>
        </div>
      </div>
    </section>
  )
}
