'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { FaBook, FaBriefcase, FaCog, FaBlog, FaFileAlt, FaMagic } from 'react-icons/fa'
import WhatsAppButton from '../WhatsAppButton'

const services = [
  {
    icon: FaBook,
    title: 'ACADEMIC WRITING',
    items: ['Essays', 'Research Papers', 'Theses'],
    price: 'From $50',
    color: 'blue',
    href: '/services/academic-writing'
  },
  {
    icon: FaBriefcase,
    title: 'BUSINESS CONTENT',
    items: ['Proposals', 'Reports', 'White Papers'],
    price: 'From $80',
    color: 'purple',
    href: '/services/business-content'
  },
  {
    icon: FaCog,
    title: 'TECHNICAL DOCUMENTATION',
    items: ['API Docs', 'User Guides', 'SOPs'],
    price: 'From $100',
    color: 'green',
    href: '/services/technical-documentation'
  },
  {
    icon: FaBlog,
    title: 'BLOG & SEO CONTENT',
    items: ['Blog Posts', 'Website Copy', 'Product Desc'],
    price: 'From $30',
    color: 'orange',
    href: '/services/blog-seo'
  },
  {
    icon: FaFileAlt,
    title: 'RESUMES & COVER LETTERS',
    items: ['Professional Resume', 'LinkedIn Profile', 'Career Docs'],
    price: 'From $60',
    color: 'pink',
    href: '/services/resumes'
  },
  {
    icon: FaMagic,
    title: 'CREATIVE WRITING',
    items: ['Scripts', 'Stories', 'Speeches'],
    price: 'From $40',
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
                <div className="flex items-center justify-between mt-6">
                  <span className="text-lg font-semibold text-gray-900">{service.price}</span>
                  <WhatsAppButton
                    message={`Hi, I'm interested in your ${service.title} service. Can you send me more details?`}
                    variant="icon"
                    className="text-sm"
                  />
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="text-center">
          <Link
            href="/services"
            className="inline-block text-purple-600 font-semibold hover:text-purple-700 transition"
          >
            View All 25+ Services →
          </Link>
        </div>
      </div>
    </section>
  )
}
