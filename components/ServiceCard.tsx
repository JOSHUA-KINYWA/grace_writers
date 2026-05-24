import Link from 'next/link'
import { Database } from '@/lib/types/database'

type Service = Database['public']['Tables']['services']['Row']

interface ServiceCardProps {
  service: Service
}

export default function ServiceCard({ service }: ServiceCardProps) {
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
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-600">Custom quote after order</span>
        <div className="flex gap-2">
          <Link
            href={`/services/${service.slug}`}
            className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition font-medium"
          >
            View Details
          </Link>
          <Link
            href="/login?next=%2Forders%2Fnew"
            className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition font-medium"
          >
            Get quote
          </Link>
        </div>
      </div>
    </div>
  )
}
