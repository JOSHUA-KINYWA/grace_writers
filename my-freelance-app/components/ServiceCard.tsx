import Link from 'next/link'
import WhatsAppButton from './WhatsAppButton'
import { Database } from '@/lib/types/database'

type Service = Database['public']['Tables']['services']['Row']

interface ServiceCardProps {
  service: Service
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const getPriceDisplay = () => {
    if (service.pricing_type === 'fixed' && service.base_price) {
      return `$${service.base_price}`
    }
    if (service.pricing_type === 'hourly' && service.hourly_rate) {
      return `$${service.hourly_rate}/hour`
    }
    if (service.pricing_type === 'package') {
      return 'View Packages'
    }
    return 'Contact for Quote'
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-2xl transition-all">
      <div className="mb-4">
        <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
          {service.category}
        </span>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{service.title}</h3>
      <p className="text-gray-600 mb-4 line-clamp-3">
        {service.description || 'Professional writing service tailored to your needs.'}
      </p>
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        {service.delivery_days && (
          <span>⚡ {service.delivery_days} days delivery</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-purple-600">{getPriceDisplay()}</span>
        <div className="flex gap-2">
          <Link
            href={`/services/${service.slug}`}
            className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition font-medium"
          >
            View Details
          </Link>
          <WhatsAppButton
            message={`Hi, I'm interested in your ${service.title} service. Can you send me more details?`}
            variant="icon"
          />
        </div>
      </div>
    </div>
  )
}
