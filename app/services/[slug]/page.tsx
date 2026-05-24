import { getServiceBySlug, getPricingTiers } from '@/lib/utils/supabase-helpers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import OrderButton from '@/components/OrderButton'

export default async function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const service = await getServiceBySlug(params.slug).catch(() => null)
  
  if (!service) {
    notFound()
  }

  const pricingTiers = service.pricing_type === 'package' 
    ? await getPricingTiers(service.id).catch(() => [])
    : []

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/services" className="text-purple-600 hover:text-purple-700 mb-4 inline-block">
          ← Back to Services
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="mb-6">
            <span className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full font-semibold">
              {service.category}
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{service.title}</h1>
          
          <div className="prose max-w-none mb-8" dangerouslySetInnerHTML={{ __html: service.description || '' }} />

          {service.images && service.images.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              {service.images.map((image, index) => (
                <img key={index} src={image} alt={`${service.title} ${index + 1}`} className="rounded-lg" />
              ))}
            </div>
          )}

          {service.pricing_type === 'package' && pricingTiers.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Pricing Packages</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {pricingTiers.map((tier) => (
                  <div key={tier.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-2">{tier.tier_name}</h3>
                    <p className="text-2xl font-bold text-purple-600 mb-2">${tier.price}</p>
                    {tier.features && tier.features.length > 0 && (
                      <ul className="space-y-1 text-sm">
                        {tier.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <OrderButton serviceId={service.id} serviceTitle={service.title} />
          </div>
        </div>
      </div>
    </div>
  )
}
