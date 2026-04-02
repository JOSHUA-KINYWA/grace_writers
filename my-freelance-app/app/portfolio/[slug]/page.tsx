import { getPortfolioItems } from '@/lib/utils/supabase-helpers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import WhatsAppButton from '@/components/WhatsAppButton'

export default async function PortfolioDetailPage({ params }: { params: { slug: string } }) {
  const items = await getPortfolioItems().catch(() => [])
  const item = items.find(i => i.slug === params.slug)
  
  if (!item) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/portfolio" className="text-purple-600 hover:text-purple-700 mb-4 inline-block">
          ← Back to Portfolio
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{item.title}</h1>
          
          {item.client_name && (
            <p className="text-gray-600 mb-4">Client: {item.client_name}</p>
          )}

          {item.images && item.images.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {item.images.map((image, index) => (
                <img key={index} src={image} alt={`${item.title} ${index + 1}`} className="rounded-lg" />
              ))}
            </div>
          )}

          {item.description && (
            <div className="prose max-w-none mb-8" dangerouslySetInnerHTML={{ __html: item.description }} />
          )}

          {item.results && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-green-900 mb-2">Results Achieved</h2>
              <p className="text-green-800">{item.results}</p>
            </div>
          )}

          {item.technologies && item.technologies.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Technologies Used</h2>
              <div className="flex flex-wrap gap-2">
                {item.technologies.map((tech, index) => (
                  <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <WhatsAppButton
              message={`Hi! I'm interested in getting similar work done. Can we discuss my project?`}
              className="w-full justify-center text-lg py-4"
            >
              Get Similar Results
            </WhatsAppButton>
          </div>
        </div>
      </div>
    </div>
  )
}
