'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import WhatsAppButton from '../WhatsAppButton'

export default function LimitedOffer() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 45,
    seconds: 12
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev
        if (seconds > 0) {
          seconds--
        } else if (minutes > 0) {
          minutes--
          seconds = 59
        } else if (hours > 0) {
          hours--
          minutes = 59
          seconds = 59
        }
        return { hours, minutes, seconds }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <section className="py-20 bg-gradient-to-r from-red-600 to-orange-600 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            🔥 SPECIAL OFFER - DON'T MISS OUT! 🔥
          </h2>

          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
            <p className="text-lg mb-4">⏰ EXPIRES IN:</p>
            <div className="flex justify-center gap-4 text-4xl font-bold">
              <div>
                <div>{String(timeLeft.hours).padStart(2, '0')}</div>
                <div className="text-sm font-normal">Hours</div>
              </div>
              <div>:</div>
              <div>
                <div>{String(timeLeft.minutes).padStart(2, '0')}</div>
                <div className="text-sm font-normal">Minutes</div>
              </div>
              <div>:</div>
              <div>
                <div>{String(timeLeft.seconds).padStart(2, '0')}</div>
                <div className="text-sm font-normal">Seconds</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-bold">🎉 FIRST-TIME CLIENTS GET:</h3>
            <div className="grid md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
              <div className="flex items-start gap-2">
                <span>✨</span>
                <div>
                  <div className="font-semibold">20% OFF your first project</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span>✨</span>
                <div>
                  <div className="font-semibold">FREE plagiarism report ($15 value)</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span>✨</span>
                <div>
                  <div className="font-semibold">Priority support (24hr response)</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span>✨</span>
                <div>
                  <div className="font-semibold">Bonus: Content strategy consultation ($50 value)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
            <p className="text-lg font-semibold mb-2">Use Code: <span className="text-yellow-300">FIRST20</span></p>
            <p className="text-sm opacity-90">*Limited to first 10 clients this month (7 spots left)</p>
          </div>

          <div>
            <WhatsAppButton
              message="Hi! I'd like to claim the FIRST20 discount. Can we discuss my project?"
              className="bg-white text-orange-600 hover:bg-gray-100 text-lg px-8 py-4"
            >
              Claim Your Discount Now →
            </WhatsAppButton>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
