import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin | Listening Room',
  description: 'Manage bookings and waitlist for the listening room event',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
