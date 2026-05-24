import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientDashboard from '@/components/client/ClientDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch client record linked to this user (support both email and username fields)
  let clientData: any = null
  const { data, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .or(`email.eq.${user.email},username.eq.${user.email}`)
    .limit(1)
    .single()

  if (!clientError && data) {
    clientData = data
  } else {
    // user might be stored by username in clients table
    const userKey = user.email?.split('@')[0]
    const { data: altClientData } = await supabase
      .from('clients')
      .select('*')
      .or(`username.eq.${userKey},email.eq.${userKey}`)
      .limit(1)
      .single()
    clientData = altClientData
  }

  // Fetch orders for this client, including service metadata for filtering
  let orders: any[] = []
  if (clientData?.id) {
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, services:service_id (id, title, slug, category)')
      .eq('client_id', clientData.id)
      .order('created_at', { ascending: false })

    orders = ordersData || []
  }

  return <ClientDashboard userId={user.id} initialOrders={orders} client={clientData} />
}
