import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import LogoutButton from '@/components/admin/LogoutButton'
import OrderManageForm from '@/components/admin/OrderManageForm'

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // In Next.js 16+, params is a Promise that must be awaited
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'admin') {
    redirect('/admin/login')
  }

  // Get order with client info
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      clients:client_id (id, name, email, phone),
      services:service_id (id, title, slug)
    `)
    .eq('id', id)
    .single()

  if (error || !order) {
    redirect('/admin/orders')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin/orders" className="text-gray-600 hover:text-gray-900 font-semibold">
                ← Orders
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Manage Order</h1>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OrderManageForm order={order} />
      </div>
    </div>
  )
}
