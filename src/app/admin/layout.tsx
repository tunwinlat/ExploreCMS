import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // If no owner exists, redirect immediately to setup across all admin routes
  const owner = await prisma.user.findFirst({ where: { role: 'OWNER' } })
  if (!owner) {
    redirect('/setup')
  }

  return children
}
