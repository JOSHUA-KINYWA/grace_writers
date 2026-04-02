'use client'

import { motion } from 'framer-motion'
import { FaWhatsapp, FaEnvelope, FaEdit } from 'react-icons/fa'
import WhatsAppButton from '../WhatsAppButton'

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
            READY TO GET STARTED? LET'S TALK!
          </h2>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6">🚀 START YOUR PROJECT NOW</h3>
            <p className="mb-6">Choose your preferred way to connect:</p>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <WhatsAppButton
                message="Hi! I'm ready to start a project. Can we discuss my requirements?"
                className="bg-[#25D366] hover:bg-[#20BA5A] text-white w-full justify-center"
              >
                <FaWhatsapp className="text-xl" />
                WhatsApp Me
              </WhatsAppButton>

              <a
                href="mailto:Gracewriters82@gmail.com"
                className="flex items-center justify-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition w-full"
              >
                <FaEnvelope />
                Email
              </a>

              <a
                href="/contact"
                className="flex items-center justify-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition w-full"
              >
                <FaEdit />
                Fill Form
              </a>
            </div>

            <div className="space-y-2 text-sm">
              <p>⚡ Get response in 2 hours or less</p>
              <p>✅ Free quote, no obligations</p>
            </div>
          </div>

          <div>
            <p className="mb-4">Still not sure? Book a FREE 15-minute consultation</p>
            <WhatsAppButton
              message="Hi! I'd like to schedule a free 15-minute consultation to discuss my writing needs."
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              Schedule Call →
            </WhatsAppButton>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
