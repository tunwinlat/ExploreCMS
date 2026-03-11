import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const session = await verifySession()
  if (!session) return null

  // Ensure only OWNER can view this page
  if (session.role !== 'OWNER') {
    redirect('/admin/dashboard')
  }

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' }
  })

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0, marginBottom: '0.5rem' }}>Site Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configure your public blog aesthetics.</p>
      </header>
      
      <SettingsForm initialSettings={settings} />
    </div>
  )
}
