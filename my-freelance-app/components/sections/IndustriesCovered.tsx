'use client'

import { motion } from 'framer-motion'
import { 
  FaLaptop, FaHeartbeat, FaDollarSign, FaGraduationCap, FaGavel,
  FaBullhorn, FaCog, FaBrain, FaBriefcase, FaFlask,
  FaLeaf, FaHome, FaUtensils, FaIndustry, FaSeedling,
  FaHandHoldingHeart, FaLandmark, FaShoppingBag, FaTv, FaFootballBall,
  FaPlane, FaTshirt, FaHamburger, FaCar, FaBolt
} from 'react-icons/fa'

const industries = [
  { name: 'Technology', icon: FaLaptop },
  { name: 'Healthcare', icon: FaHeartbeat },
  { name: 'Finance', icon: FaDollarSign },
  { name: 'Education', icon: FaGraduationCap },
  { name: 'Legal', icon: FaGavel },
  { name: 'Marketing', icon: FaBullhorn },
  { name: 'Engineering', icon: FaCog },
  { name: 'Psychology', icon: FaBrain },
  { name: 'Business', icon: FaBriefcase },
  { name: 'Science', icon: FaFlask },
  { name: 'Environment', icon: FaLeaf },
  { name: 'Real Estate', icon: FaHome },
  { name: 'Hospitality', icon: FaUtensils },
  { name: 'Manufacturing', icon: FaIndustry },
  { name: 'Agriculture', icon: FaSeedling },
  { name: 'Non-Profit', icon: FaHandHoldingHeart },
  { name: 'Government', icon: FaLandmark },
  { name: 'Retail', icon: FaShoppingBag },
  { name: 'Media', icon: FaTv },
  { name: 'Sports', icon: FaFootballBall },
  { name: 'Travel', icon: FaPlane },
  { name: 'Fashion', icon: FaTshirt },
  { name: 'Food', icon: FaHamburger },
  { name: 'Automotive', icon: FaCar },
  { name: 'Energy', icon: FaBolt }
]

const academicSubjects = [
  'Computer Science', 'Biology', 'Economics', 'Literature',
  'History', 'Chemistry', 'Physics', 'Philosophy', 'Sociology',
  'Political Science', 'Mathematics', 'Nursing', 'MBA', 'Law'
]

export default function IndustriesCovered() {
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
            I WRITE FOR 50+ INDUSTRIES & ACADEMIC SUBJECTS
          </h2>
        </motion.div>

        <div className="mb-12">
          <div className="flex flex-wrap justify-center gap-3">
            {industries.map((industry, index) => {
              const Icon = industry.icon
              return (
                <motion.div
                  key={industry.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.02 }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 cursor-pointer transition flex items-center gap-2 shadow-sm hover:shadow-md"
                >
                  <Icon className="text-purple-600" />
                  <span>{industry.name}</span>
                </motion.div>
              )
            })}
          </div>
        </div>

        <div className="mt-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            📚 ACADEMIC SUBJECTS:
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {academicSubjects.map((subject, index) => (
              <motion.span
                key={subject}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.02 }}
                whileHover={{ scale: 1.1 }}
                className="px-4 py-2 bg-purple-50 border border-purple-200 rounded-full text-sm font-medium text-purple-700 hover:bg-purple-100 cursor-pointer transition"
              >
                {subject}
              </motion.span>
            ))}
          </div>
        </div>

        <div className="text-center mt-12 space-x-4">
          <a href="/portfolio" className="text-purple-600 font-semibold hover:text-purple-700 transition">
            View Full Subject List →
          </a>
          <span className="text-gray-400">|</span>
          <a href="/contact" className="text-purple-600 font-semibold hover:text-purple-700 transition">
            Don't See Yours? Ask Me! →
          </a>
        </div>
      </div>
    </section>
  )
}
