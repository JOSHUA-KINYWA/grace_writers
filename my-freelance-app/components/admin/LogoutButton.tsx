'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FaSignOutAlt } from 'react-icons/fa'

interface LogoutButtonProps {
  compact?: boolean
}

export default function LogoutButton({ compact = false }: LogoutButtonProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return compact ? (
    <button
      onClick={handleLogout}
      className="w-full p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center"
      title="Logout"
    >
      <FaSignOutAlt size={20} />
    </button>
  ) : (
    <button
      onClick={handleLogout}
      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold flex items-center justify-center gap-2"
    >
      <FaSignOutAlt /> Logout
    </button>
  )
}

