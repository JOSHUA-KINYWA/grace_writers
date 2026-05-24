'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

interface AppShellProps {
  children: ReactNode
}

/** Marketing pages get Navbar + Footer; admin/dashboard use their own layouts. */
export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const isStandaloneApp =
    pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard')

  if (isStandaloneApp) {
    return <>{children}</>
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
