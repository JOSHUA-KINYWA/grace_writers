import { createClient } from '@/lib/supabase/server'
import { getServices } from '@/lib/utils/supabase-helpers'
import Link from 'next/link'
import LogoutButton from './LogoutButton'
import { FaBriefcase, FaPalette, FaStar, FaBox, FaEnvelope, FaCog, FaComments, FaChartBar, FaHome, FaChevronRight } from 'react-icons/fa'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get services
  let services: any[] = []
  try {
    services = await getServices()
  } catch (error) {
    services = []
  }

  // Get stats
  let servicesCount = 0
  try {
    const { count } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
    servicesCount = count || 0
  } catch (error) {
    servicesCount = 0
  }

  let inquiriesCount = 0
  try {
    const { count } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new')
    inquiriesCount = count || 0
  } catch (error) {
    inquiriesCount = 0
  }

  let portfolioCount = 0
  try {
    const { count } = await supabase
      .from('portfolio_items')
      .select('*', { count: 'exact', head: true })
    portfolioCount = count || 0
  } catch (error) {
    portfolioCount = 0
  }

  let testimonialsCount = 0
  try {
    const { count } = await supabase
      .from('testimonials')
      .select('*', { count: 'exact', head: true })
      .eq('approved', true)
    testimonialsCount = count || 0
  } catch (error) {
    testimonialsCount = 0
  }

  let ordersCount = 0
  let pendingOrdersCount = 0
  try {
    const { count: totalCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
    ordersCount = totalCount || 0

    const { count: pendingCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'quote_sent', 'in_progress', 'revision'])
    pendingOrdersCount = pendingCount || 0
  } catch (error) {
    ordersCount = 0
    pendingOrdersCount = 0
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-purple-600 flex items-center gap-2">
            <FaChartBar /> Admin Panel
          </h2>
          <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* Dashboard */}
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg font-semibold hover:bg-purple-100 transition"
          >
            <FaHome size={16} />
            Dashboard
            <FaChevronRight size={12} className="ml-auto" />
          </Link>

          <div className="mt-6 mb-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase px-4 mb-3">Content Management</h3>
          </div>

          {/* Services */}
          <Link
            href="/admin/services"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-purple-50 rounded-lg transition"
          >
            <FaBriefcase size={16} className="text-purple-600" />
            <span>Services</span>
            <FaChevronRight size={12} className="ml-auto text-gray-400" />
          </Link>

          {/* Portfolio */}
          <Link
            href="/admin/portfolio"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 rounded-lg transition"
          >
            <FaPalette size={16} className="text-blue-600" />
            <span>Portfolio</span>
            <FaChevronRight size={12} className="ml-auto text-gray-400" />
          </Link>

          {/* Testimonials */}
          <Link
            href="/admin/testimonials"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-green-50 rounded-lg transition"
          >
            <FaStar size={16} className="text-green-600" />
            <span>Testimonials</span>
            <FaChevronRight size={12} className="ml-auto text-gray-400" />
          </Link>

          <div className="mt-6 mb-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase px-4 mb-3">Client Management</h3>
          </div>

          {/* Orders */}
          <Link
            href="/admin/orders"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-purple-50 rounded-lg transition"
          >
            <FaBox size={16} className="text-purple-600" />
            <span>Orders</span>
            <span className="ml-auto bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingOrdersCount || 0}
            </span>
          </Link>

          {/* Inquiries */}
          <Link
            href="/admin/inquiries"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-orange-50 rounded-lg transition"
          >
            <FaEnvelope size={16} className="text-orange-600" />
            <span>Inquiries</span>
            {inquiriesCount > 0 && (
              <span className="ml-auto bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {inquiriesCount}
              </span>
            )}
          </Link>

          {/* Chat */}
          <Link
            href="/admin/chat"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-indigo-50 rounded-lg transition"
          >
            <FaComments size={16} className="text-indigo-600" />
            <span>Client Chat</span>
            <FaChevronRight size={12} className="ml-auto text-gray-400" />
          </Link>

          <div className="mt-6 mb-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase px-4 mb-3">System</h3>
          </div>

          {/* Settings */}
          <Link
            href="/admin/settings"
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <FaCog size={16} className="text-gray-600" />
            <span>Settings</span>
            <FaChevronRight size={12} className="ml-auto text-gray-400" />
          </Link>
        </nav>

        <div className="border-t border-gray-200 p-4">
          <LogoutButton />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white shadow">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <div className="md:hidden">
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-8">
            <div className="grid md:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Total Services</div>
                <div className="text-3xl font-bold text-gray-900">{servicesCount || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Active Orders</div>
                <div className="text-3xl font-bold text-purple-600">{pendingOrdersCount || 0}</div>
                <div className="text-xs text-gray-500 mt-1">of {ordersCount || 0} total</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">New Inquiries</div>
                <div className="text-3xl font-bold text-orange-600">{inquiriesCount || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Portfolio Items</div>
                <div className="text-3xl font-bold text-gray-900">{portfolioCount}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Testimonials</div>
                <div className="text-3xl font-bold text-gray-900">{testimonialsCount}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <Link
                    href="/admin/services"
                    className="block w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <FaBriefcase className="text-purple-600 text-lg" />
                      <span className="font-semibold text-gray-900">Manage Services</span>
                    </div>
                  </Link>
                  <Link
                    href="/admin/portfolio"
                    className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <FaPalette className="text-blue-600 text-lg" />
                      <span className="font-semibold text-gray-900">Manage Portfolio</span>
                    </div>
                  </Link>
                  <Link
                    href="/admin/testimonials"
                    className="block w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <FaStar className="text-green-600 text-lg" />
                      <span className="font-semibold text-gray-900">Manage Testimonials</span>
                    </div>
                  </Link>
                  <Link
                    href="/admin/orders"
                    className="block w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <FaBox className="text-purple-600 text-lg" />
                      <span className="font-semibold text-gray-900">Manage Orders</span>
                      <span className="ml-auto text-sm font-bold text-purple-600">({pendingOrdersCount || 0} active)</span>
                    </div>
                  </Link>
                  <Link
                    href="/admin/inquiries"
                    className="block w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <FaEnvelope className="text-orange-600 text-lg" />
                      <span className="font-semibold text-gray-900">View Inquiries</span>
                    </div>
                  </Link>
                  <Link
                    href="/admin/chat"
                    className="block w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <FaComments className="text-indigo-600 text-lg" />
                      <span className="font-semibold text-gray-900">Client Chat</span>
                    </div>
                  </Link>
                  <Link
                    href="/admin/settings"
                    className="block w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <FaCog className="text-gray-600 text-lg" />
                      <span className="font-semibold text-gray-900">Site Settings</span>
                    </div>
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Recent Services</h2>
                {services.length > 0 ? (
                  <div className="space-y-2">
                    {services.slice(0, 5).map((service) => (
                      <Link
                        key={service.id}
                        href={`/admin/services/${service.id}`}
                        className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      >
                        <div className="font-semibold">{service.title}</div>
                        <div className="text-sm text-gray-600">{service.category}</div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No services yet. Create your first service!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
