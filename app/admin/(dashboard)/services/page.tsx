import { isAdminUser } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServices } from '@/lib/utils/supabase-helpers'
import Link from 'next/link'
import LogoutButton from '@/components/admin/LogoutButton'

export default async function AdminServicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminUser(user)) {
    redirect('/admin/login')
  }

  let services: any[] = []
  try {
    services = await getServices()
  } catch (error) {
    services = []
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
              <h1 className="text-2xl font-bold text-gray-900">💼 Service Management</h1>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Active Services ({services.length})</h2>
          <Link
            href="/admin/services/new"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
          >
            + Add New Service
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">Pricing</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.length > 0 ? (
                services.map((service) => (
                  <tr key={service.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{service.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{service.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {service.pricing_type === 'fixed' && service.base_price && `$${service.base_price}`}
                      {service.pricing_type === 'hourly' && service.hourly_rate && `$${service.hourly_rate}/hr`}
                      {service.pricing_type === 'package' && 'Packages'}
                      {service.pricing_type === 'custom' && 'Custom Quote'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        service.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {service.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/services/${service.id}`}
                        className="text-purple-600 hover:text-purple-700 font-semibold mr-4"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/services/${service.slug}`}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-600">
                    No services yet. Create your first service!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
