'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { FaClock, FaGlobe, FaCog } from 'react-icons/fa'

const problems = [
  {
    problem: "Deadline in 3 days, no time to write",
    solution: "I deliver quality work in 24-48 hours",
    icon: FaClock,
    iconColor: "text-red-500"
  },
  {
    problem: "Not a native English speaker, worried about mistakes",
    solution: "Flawless grammar, native-level writing",
    icon: FaGlobe,
    iconColor: "text-blue-500"
  },
  {
    problem: "Need technical docs but I'm not a writer",
    solution: "Experienced in 50+ technical subjects",
    icon: FaCog,
    iconColor: "text-purple-500"
  }
]

export default function ProblemSolution() {
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
            STRUGGLING WITH WRITING? YOU'RE NOT ALONE
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {problems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-100"
            >
              <div className="flex justify-center mb-4">
                <div className={`w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg`}>
                  <item.icon className={`text-3xl ${item.iconColor}`} />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-red-600 font-semibold mb-2">PROBLEM</div>
                  <p className="text-gray-700">{item.problem}</p>
                </div>
                <div className="text-2xl text-center">→</div>
                <div>
                  <div className="text-green-600 font-semibold mb-2">✨ SOLUTION</div>
                  <p className="text-gray-700 font-medium">{item.solution}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/services"
            className="inline-block bg-purple-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-purple-700 transition"
          >
            See How I Can Help You →
          </Link>
        </div>
      </div>
    </section>
  )
}
