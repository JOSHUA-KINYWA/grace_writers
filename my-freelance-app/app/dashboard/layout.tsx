import { ReactNode } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // Dashboard layout without main page navbar/footer styling
  return (
    <>{children}</>
  )
}
