'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaPenFancy } from 'react-icons/fa'
import WhatsAppButton from '../WhatsAppButton'

const typingMessages = [
  "Need a research paper? → I write it.",
  "Technical documentation? → I got you.",
  "Business proposal? → Done professionally.",
  "Blog posts? → SEO-optimized content.",
  "Resume? → Stand out from the crowd."
]

export default function Hero() {
  const [currentMessage, setCurrentMessage] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const message = typingMessages[currentMessage]
    let timeout: NodeJS.Timeout

    if (!isDeleting && displayText.length < message.length) {
      timeout = setTimeout(() => {
        setDisplayText(message.slice(0, displayText.length + 1))
      }, 100)
    } else if (!isDeleting && displayText.length === message.length) {
      timeout = setTimeout(() => setIsDeleting(true), 2000)
    } else if (isDeleting && displayText.length > 0) {
      timeout = setTimeout(() => {
        setDisplayText(message.slice(0, displayText.length - 1))
      }, 50)
    } else if (isDeleting && displayText.length === 0) {
      timeout = setTimeout(() => {
        setIsDeleting(false)
        setCurrentMessage((prev) => (prev + 1) % typingMessages.length)
      }, 0)
    }

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, currentMessage])

  return (
    <section className="relative min-h-screen flex items-center justify-center gradient-purple-blue overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          {/* Icon */}
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="flex justify-center"
          >
            <FaPenFancy className="text-6xl md:text-8xl" />
          </motion.div>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
            ✍️ WORDS THAT WORK.
            <br />
            CONTENT THAT CONVERTS.
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-purple-100">
            Professional Writing Services for Every Need
          </p>

          {/* Typing Animation */}
          <div className="h-16 flex items-center justify-center">
            <p className="text-2xl md:text-3xl font-semibold min-h-[3rem]">
              {displayText}
              <span className="animate-pulse">|</span>
            </p>
          </div>

          {/* Rating */}
          <div className="flex items-center justify-center gap-2 text-yellow-300">
            <span className="text-2xl">⭐⭐⭐⭐⭐</span>
            <span className="text-lg">4.9/5 from 500+ Happy Clients</span>
          </div>

          {/* CTA Button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="pt-4"
          >
            <WhatsAppButton
              message="Hi! I'm interested in your writing services. Can we discuss my project?"
              className="text-lg px-8 py-4"
            >
              🚀 GET YOUR PROJECT STARTED - FREE QUOTE
            </WhatsAppButton>
          </motion.div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 text-sm md:text-base pt-4">
            <div className="flex items-center gap-2">
              <span className="text-green-300">✅</span>
              <span>Fast Turnaround</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-300">✅</span>
              <span>100% Original</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-300">✅</span>
              <span>Unlimited Revisions</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white rounded-full mt-2"></div>
        </div>
      </motion.div>
    </section>
  )
}
