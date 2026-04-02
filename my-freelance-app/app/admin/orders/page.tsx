import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import LogoutButton from '@/components/admin/LogoutButton'
import OrdersList from '@/components/admin/OrdersList'

export default async function AdminOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'admin') {
    redirect('/admin/login')
  }

  let orders: any[] = []
  let services: any[] = []
  
  try {
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        clients:client_id (id, name, email, phone),
        services:service_id (id, title, slug)
      `)
      .order('created_at', { ascending: false })
    
    if (!ordersError && ordersData) {
      orders = ordersData
    }

    const { data: servicesData } = await supabase
      .from('services')
      .select('id, title')
      .eq('status', 'active')
    
    if (servicesData) {
      services = servicesData
    }
  } catch (error) {
    orders = []
    services = []
  }

  const statusCounts = {
    pending: orders.filter((o: any) => o.status === 'pending').length,
    quote_sent: orders.filter((o: any) => o.status === 'quote_sent').length,
    in_progress: orders.filter((o: any) => o.status === 'in_progress').length,
    revision: orders.filter((o: any) => o.status === 'revision').length,
    delivered: orders.filter((o: any) => o.status === 'delivered').length,
    completed: orders.filter((o: any) => o.status === 'completed').length,
    cancelled: orders.filter((o: any) => o.status === 'cancelled').length,
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
              <h1 className="text-2xl font-bold text-gray-900">📦 Order Management</h1>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.quote_sent}</div>
            <div className="text-sm text-gray-600">Quote Sent</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">{statusCounts.in_progress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">{statusCounts.revision}</div>
            <div className="text-sm text-gray-600">Revision</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-teal-600">{statusCounts.delivered}</div>
            <div className="text-sm text-gray-600">Delivered</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600">{statusCounts.cancelled}</div>
            <div className="text-sm text-gray-600">Cancelled</div>
          </div>
        </div>

        <OrdersList initialOrders={orders} services={services} />
      </div>
    </div>
  )
}
