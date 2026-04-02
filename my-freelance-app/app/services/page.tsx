import { getServices } from '@/lib/utils/supabase-helpers'
import ServiceCard from '@/components/ServiceCard'
import Link from 'next/link'

export default async function ServicesPage() {
  const services = await getServices().catch(() => [])

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Our Writing Services
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional writing services for every need. From academic papers to business content, we've got you covered.
          </p>
        </div>

        {services.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No services available yet. Check back soon!</p>
            <Link href="/" className="text-purple-600 hover:text-purple-700 font-semibold">
              Return to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
