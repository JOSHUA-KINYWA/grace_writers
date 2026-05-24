'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaChevronDown, FaQuestionCircle, FaCheckCircle, FaClock, FaShieldAlt, FaGlobe, FaComments, FaLock } from 'react-icons/fa'

const faqs = [
  {
    question: 'Is the content 100% original?',
    answer: 'Absolutely! Every piece is written from scratch and includes a plagiarism report. Zero tolerance for copied content.',
    icon: FaCheckCircle,
    iconColor: 'text-green-600'
  },
  {
    question: 'How fast can you deliver?',
    answer: 'Standard: 5-7 days. Rush: 24-48 hours (+50%). Same-day available for urgent projects.',
    icon: FaClock,
    iconColor: 'text-blue-600'
  },
  {
    question: 'What if I\'m not satisfied?',
    answer: 'Unlimited free revisions until you love it. If still unhappy, 100% money-back guarantee.',
    icon: FaShieldAlt,
    iconColor: 'text-purple-600'
  },
  {
    question: 'Do you write in other languages?',
    answer: 'English is my specialty (native level). Can coordinate translations through partners.',
    icon: FaGlobe,
    iconColor: 'text-indigo-600'
  },
  {
    question: 'How do I share my requirements?',
    answer: 'Sign in, place an order with your files and details, or use our contact form. Our team will follow up in messages.',
    icon: FaComments,
    iconColor: 'text-orange-600'
  },
  {
    question: 'Is my information confidential?',
    answer: 'Yes! All projects are covered by NDA. Your content and info are 100% private.',
    icon: FaLock,
    iconColor: 'text-red-600'
  }
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            FREQUENTLY ASKED QUESTIONS - GET ANSWERS NOW
          </h2>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <faq.icon className={`${faq.iconColor} text-xl`} />
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                </div>
                <FaChevronDown
                  className={`text-gray-600 transition-transform ${
                    openIndex === index ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 py-4 text-gray-700 bg-white">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <a href="/contact" className="text-purple-600 font-semibold hover:text-purple-700 transition">
            View All 20 FAQs →
          </a>
        </div>
      </div>
    </section>
  )
}
