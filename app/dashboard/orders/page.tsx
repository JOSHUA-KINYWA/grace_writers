'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientDashboard from '@/components/client/ClientDashboard'

export default async function DashboardOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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
    const userKey = user.email?.split('@')[0]
    const { data: altClientData } = await supabase
      .from('clients')
      .select('*')
      .or(`username.eq.${userKey},email.eq.${userKey}`)
      .limit(1)
      .single()
    clientData = altClientData
  }

  let orders: any[] = []
  if (clientData && clientData.id) {
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, services:service_id (id, title, slug, category)')
      .eq('client_id', clientData.id)
      .order('created_at', { ascending: false })

    orders = ordersData || []
  }

  return <ClientDashboard userId={user.id} initialOrders={orders} client={clientData} />
}
