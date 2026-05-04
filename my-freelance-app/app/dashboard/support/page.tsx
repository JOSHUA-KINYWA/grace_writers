import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SupportTickets from '@/components/client/SupportTickets'

export const metadata = {
  title: 'Support Tickets - Grace Writers',
  description: 'Manage your support tickets and general inquiries'
}

export default async function SupportPage() {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get client ID
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('email', user.email)
    .single()

  if (!client) {
    redirect('/login')
  }

  return (
    <div className="h-screen bg-gray-50">
      <SupportTickets clientId={client.id} />
    </div>
  )
}
