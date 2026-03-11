import Link from 'next/link'
import { verifySession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LogoutButton from '@/app/admin/dashboard/LogoutButton'
import AdminSidebarNav from '@/app/admin/dashboard/AdminSidebarNav'
import { ThemeToggle } from '@/components/ThemeToggle'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()
  if (!session) redirect('/admin/login')

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)', flexDirection: 'column' }}>
      <style>{`
        .dashboard-layout {
          flex-direction: row !important;
        }
        .dashboard-sidebar {
          width: 250px;
          min-width: 250px;
          max-width: 250px;
        }
        @media (max-width: 768px) {
          .dashboard-layout {
            flex-direction: column !important;
          }
          .dashboard-sidebar {
            width: 100%;
            min-width: 100%;
            max-width: 100%;
            height: auto;
            border-right: none !important;
            border-bottom: 1px solid var(--border-color);
          }
          .dashboard-main {
            padding: 1rem !important;
          }
        }
      `}</style>
      
      {/* Sidebar sidebar */}
      <aside className="glass dashboard-sidebar" style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0, borderRight: '1px solid var(--border-color)', zIndex: 10 }}>
        <h2 className="heading-xl" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', paddingLeft: '0.5rem' }}>ExploreCMS</h2>
        
        <AdminSidebarNav role={(session as { role: string }).role} />
        
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Logged in as <strong style={{color: 'var(--text-primary)'}}>{(session as { username: string }).username}</strong>
            </div>
            <ThemeToggle />
          </div>
          <LogoutButton />
        </div>
      </aside>
      
      {/* Main content area */}
      <main className="dashboard-main" style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: '100%', flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
