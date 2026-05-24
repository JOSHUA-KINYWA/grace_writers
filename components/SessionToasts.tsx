'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCachedAuthUser } from '@/lib/auth/client-session'
import OrderToastStack from '@/components/OrderToastStack'
import NewMessageToastAlerts from '@/components/NewMessageToastAlerts'

export default function SessionToasts() {
  const [session, setSession] = useState<{
    role: 'admin' | 'client'
    userId: string
    clientId?: string
  } | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const user = await getCachedAuthUser(supabase)
      if (!user) {
        setSession(null)
        return
      }

      const role = user.user_metadata?.role === 'admin' ? 'admin' : 'client'
      let clientId = user.user_metadata?.client_id as string | undefined

      if (!clientId && role === 'client') {
        const { data } = await supabase
          .from('clients')
          .select('id')
          .or(`auth_user_id.eq.${user.id}${user.email ? `,email.eq.${user.email}` : ''}`)
          .limit(1)
        clientId = Array.isArray(data) ? data[0]?.id : (data as any)?.id
      }

      setSession({ role, userId: user.id, clientId })
    }

    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load()
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!session) return null

  return (
    <>
      <OrderToastStack
        role={session.role}
        userId={session.userId}
        clientId={session.clientId}
      />
      <NewMessageToastAlerts role={session.role} userId={session.userId} />
    </>
  )
}
