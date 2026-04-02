import { getPortfolioItems } from '@/lib/utils/supabase-helpers'
import PortfolioCard from '@/components/PortfolioCard'

export default async function PortfolioPage() {
  const portfolioItems = await getPortfolioItems().catch(() => [])

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Our Portfolio
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Real projects, real results. See how we've helped clients achieve their goals.
          </p>
        </div>

        {portfolioItems.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {portfolioItems.map((item) => (
              <PortfolioCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Portfolio items coming soon!</p>
          </div>
        )}
      </div>
    </div>
  )
}
