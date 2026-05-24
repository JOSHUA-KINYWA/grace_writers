import Link from 'next/link'
import { Database } from '@/lib/types/database'

type PortfolioItem = Database['public']['Tables']['portfolio_items']['Row']

interface PortfolioCardProps {
  item: PortfolioItem
}

export default function PortfolioCard({ item }: PortfolioCardProps) {
  return (
    <Link href={`/portfolio/${item.slug}`}>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-2xl transition-all">
        {item.images && item.images.length > 0 && (
          <div className="aspect-video bg-gray-200 overflow-hidden">
            <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
          {item.client_name && (
            <p className="text-sm text-gray-600 mb-2">Client: {item.client_name}</p>
          )}
          {item.description && (
            <p className="text-gray-700 mb-4 line-clamp-3">{item.description}</p>
          )}
          {item.results && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-green-800 font-semibold text-sm">Result: {item.results}</p>
            </div>
          )}
          <span className="text-purple-600 font-semibold hover:text-purple-700">
            View Case Study →
          </span>
        </div>
      </div>
    </Link>
  )
}
