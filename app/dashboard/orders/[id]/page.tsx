import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientOrderDetail from '@/components/client/ClientOrderDetail'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  // In some Next.js dev environments `params` may be a Promise — unwrap it safely
  const { id } = (await params) as { id: string }
  const supabase: any = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get client
  const userEmail = user?.email
  let client: any = null
  if (userEmail) {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('email', userEmail)
      .single()
    client = data
  }

  if (!client) {
    redirect('/dashboard')
  }

  // Get order
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      services:service_id (id, title, slug),
      clients:client_id (id, name, email, phone)
    `)
    .eq('id', id)
    .eq('client_id', client.id)
    .single()

  if (error || !order) {
    redirect('/dashboard')
  }

  return <ClientOrderDetail order={order} clientId={client.id} />
}
