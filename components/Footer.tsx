import Link from 'next/link'
import { FaEnvelope, FaLinkedin, FaTwitter, FaInstagram } from 'react-icons/fa'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-xl font-bold mb-4">Grace Writers</h3>
            <p className="text-gray-400">
              Professional writing services for all your content needs. Academic, business, technical, and creative writing.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/services" className="hover:text-white transition">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="hover:text-white transition">
                  Portfolio
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/services/academic-writing" className="hover:text-white transition">
                  Academic Writing
                </Link>
              </li>
              <li>
                <Link href="/services/business-content" className="hover:text-white transition">
                  Business Content
                </Link>
              </li>
              <li>
                <Link href="/services/technical-documentation" className="hover:text-white transition">
                  Technical Docs
                </Link>
              </li>
              <li>
                <Link href="/services/blog-seo" className="hover:text-white transition">
                  Blog & SEO
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Get in Touch</h4>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Contact us
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <FaEnvelope className="text-blue-400" />
                <a href="mailto:Gracewriters82@gmail.com" className="hover:text-white transition">
                  Gracewriters82@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-4 mt-4">
                <a href="#" className="hover:text-white transition">
                  <FaLinkedin size={20} />
                </a>
                <a href="#" className="hover:text-white transition">
                  <FaTwitter size={20} />
                </a>
                <a href="#" className="hover:text-white transition">
                  <FaInstagram size={20} />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Grace Writers. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
