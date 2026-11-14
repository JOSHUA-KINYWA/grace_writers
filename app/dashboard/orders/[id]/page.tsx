import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientOrderDetail from '@/components/client/ClientOrderDetail'

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
      id,
      client_id,
      service_id,
      status,
      title,
      description,
      requirements,
      word_count,
      deadline,
      quote_amount,
      paid_amount,
      payment_status,
      paypal_order_id,
      paypal_authorization_id,
      authorized_amount,
      approved_release_amount,
      captured_amount,
      escrow_status,
      order_completion_date,
      final_payment_released_at,
      deliverables,
      files_uploaded,
      created_at,
      updated_at,
      completed_at,
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
