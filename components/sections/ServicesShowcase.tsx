'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { FaBook, FaBriefcase, FaCog, FaBlog, FaFileAlt, FaMagic } from 'react-icons/fa'
import GetQuoteButton from '../GetQuoteButton'

const services = [
  {
    icon: FaBook,
    title: 'ACADEMIC WRITING',
    items: ['Essays', 'Research Papers', 'Theses'],
    price: 'Custom quote',
    color: 'blue',
    href: '/services/academic-writing'
  },
  {
    icon: FaBriefcase,
    title: 'BUSINESS CONTENT',
    items: ['Proposals', 'Reports', 'White Papers'],
    price: 'Custom quote',
    color: 'purple',
    href: '/services/business-content'
  },
  {
    icon: FaCog,
    title: 'TECHNICAL DOCUMENTATION',
    items: ['API Docs', 'User Guides', 'SOPs'],
    price: 'Custom quote',
    color: 'green',
    href: '/services/technical-documentation'
  },
  {
    icon: FaBlog,
    title: 'BLOG & SEO CONTENT',
    items: ['Blog Posts', 'Website Copy', 'Product Desc'],
    price: 'Custom quote',
    color: 'orange',
    href: '/services/blog-seo'
  },
  {
    icon: FaFileAlt,
    title: 'RESUMES & COVER LETTERS',
    items: ['Professional Resume', 'LinkedIn Profile', 'Career Docs'],
    price: 'Custom quote',
    color: 'pink',
    href: '/services/resumes'
  },
  {
    icon: FaMagic,
    title: 'CREATIVE WRITING',
    items: ['Scripts', 'Stories', 'Speeches'],
    price: 'Custom quote',
    color: 'indigo',
    href: '/services/creative-writing'
  }
]

const colorClasses = {
  blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
  purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
  green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
  orange: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
  pink: 'from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700',
  indigo: 'from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700'
}

export default function ServicesShowcase() {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            I WRITE EVERYTHING. LITERALLY EVERYTHING.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-2xl transition-all"
              >
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${colorClasses[service.color as keyof typeof colorClasses]} flex items-center justify-center mb-4`}>
                  <Icon className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                <ul className="space-y-2 mb-4 text-gray-600">
                  {service.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-purple-600">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between mt-6 gap-3">
                  <span className="text-sm font-medium text-gray-600">{service.price}</span>
                  <GetQuoteButton className="text-sm px-4 py-2">Get quote</GetQuoteButton>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="text-center">
          <p className="text-gray-600">
            Sign in to request a quote — our team will confirm pricing after you place an order.
          </p>
        </div>
      </div>
    </section>
  )
}
