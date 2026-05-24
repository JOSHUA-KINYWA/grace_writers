import { ReactNode } from 'react'

/** Shared admin segment — auth shell is only on routes under (dashboard). */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children
}
