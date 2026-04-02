'use client'

import { motion } from 'framer-motion'

const testimonials = [
  {
    rating: 5,
    comment: "Delivered my thesis 2 days early! Got an A+ thanks to the thorough research and clear writing. Will definitely use again for my thesis!",
    name: 'Sarah K.',
    role: 'PhD Student',
    country: '🇺🇸 USA'
  },
  {
    rating: 5,
    comment: "Best technical writer I've worked with. Complex topics made simple. Very professional and understood our requirements perfectly.",
    name: 'Mike T.',
    role: 'CTO, TechCorp',
    country: '🇬🇧 UK'
  },
  {
    rating: 5,
    comment: "Saved my startup with killer copy. The new product descriptions completely transformed our store! Sales doubled in the first month.",
    name: 'Jay P.',
    role: 'CEO',
    country: '🇰🇪 KE'
  }
]

export default function Testimonials() {
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
            WHAT CLIENTS SAY (500+ FIVE-STAR REVIEWS)
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">⭐</span>
                ))}
              </div>
              <p className="text-gray-700 mb-4 italic">"{testimonial.comment}"</p>
              <div className="border-t border-purple-200 pt-4">
                <p className="font-semibold text-gray-900">{testimonial.name}</p>
                <p className="text-sm text-gray-600">{testimonial.role}</p>
                <p className="text-sm text-gray-500 mt-1">{testimonial.country}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
