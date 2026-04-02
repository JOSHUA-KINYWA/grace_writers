import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import LogoutButton from '@/components/admin/LogoutButton'
import AdminChatView from '@/components/admin/AdminChatView'

export default async function AdminChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'admin') {
    redirect('/admin/login')
  }

  // Get all chat rooms with client info
  let chatRooms: any[] = []
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        clients:client_id (id, name, email, phone)
      `)
      .order('last_message_at', { ascending: false })

    if (!error && data) {
      chatRooms = data
    }
  } catch (error) {
    chatRooms = []
  }

  // Get unread counts for each room
  for (const room of chatRooms) {
    try {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_room_id', room.id)
        .eq('replied', false)
      
      room.unread_count = count || 0
    } catch (error) {
      room.unread_count = 0
    }
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
              <h1 className="text-2xl font-bold text-gray-900">💬 Client Communications</h1>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminChatView initialChatRooms={chatRooms} />
      </div>
    </div>
  )
}
