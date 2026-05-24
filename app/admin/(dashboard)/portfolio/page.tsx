import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPortfolioItems } from '@/lib/utils/supabase-helpers'
import Link from 'next/link'
import LogoutButton from '@/components/admin/LogoutButton'

export default async function AdminPortfolioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'admin') {
    redirect('/admin/login')
  }

  let portfolioItems: any[] = []
  try {
    portfolioItems = await getPortfolioItems()
  } catch (error) {
    portfolioItems = []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                ← Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Work Samples</h1>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Samples by category ({portfolioItems.length})</h2>
          <Link
            href="/admin/portfolio/new"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
          >
            + Upload Work Sample
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolioItems.length > 0 ? (
            portfolioItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                {item.services?.category && (
                  <p className="text-xs font-bold uppercase text-purple-700 mb-2">{item.services.category}</p>
                )}
                {item.client_name && (
                  <p className="text-sm text-gray-600 mb-2">Client: {item.client_name}</p>
                )}
                {item.results && (
                  <p className="text-sm text-green-600 mb-4">Result: {item.results}</p>
                )}
                <div className="flex gap-2">
                  <Link
                    href={`/admin/portfolio/${item.id}`}
                    className="text-purple-600 hover:text-purple-700 font-semibold text-sm"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/portfolio/${item.slug}`}
                    target="_blank"
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-12 text-gray-600">
              No portfolio items yet. Add your first case study!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
