import React, { ReactNode } from 'react'

interface ClientLayoutProps {
  clientName?: string
  children: ReactNode
}

export default function ClientLayout({ clientName = 'Client', children }: ClientLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold">Welcome back, {clientName}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
