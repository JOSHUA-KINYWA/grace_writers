'use client'

import { motion } from 'framer-motion'
import { FaEnvelope, FaEdit } from 'react-icons/fa'
import GetQuoteButton from '../GetQuoteButton'
import Link from 'next/link'

export default function FinalCTA() {
  return (
    <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            READY TO GET STARTED? LET&apos;S TALK!
          </h2>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6">🚀 START YOUR PROJECT NOW</h3>
            <p className="mb-6">Create an account or sign in to submit your order.</p>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <GetQuoteButton className="bg-white text-purple-600 hover:bg-gray-100 w-full justify-center">
                Get a quote
              </GetQuoteButton>

              <a
                href="mailto:Gracewriters82@gmail.com"
                className="flex items-center justify-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition w-full"
              >
                <FaEnvelope />
                Email
              </a>

              <Link
                href="/contact"
                className="flex items-center justify-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition w-full"
              >
                <FaEdit />
                Contact form
              </Link>
            </div>

            <div className="space-y-2 text-sm">
              <p>⚡ Get a response within 2 hours</p>
              <p>✅ Free quote, no obligations</p>
            </div>
          </div>

          <div>
            <p className="mb-4">New client? Sign up in minutes and place your first order.</p>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center bg-white text-purple-600 hover:bg-gray-100 px-8 py-3 rounded-full font-semibold transition"
            >
              Create account →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
