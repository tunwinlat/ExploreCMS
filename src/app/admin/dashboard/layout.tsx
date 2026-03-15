/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Link from 'next/link'
import { verifySession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LogoutButton from '@/app/admin/dashboard/LogoutButton'
import AdminSidebarNav from '@/app/admin/dashboard/AdminSidebarNav'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ToastProvider } from '@/components/admin/Toast'

// Admin pages require authentication and fresh data; never prerender them
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()
  if (!session) redirect('/admin/login')

  return (
    <ToastProvider>
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

        {/* Sidebar */}
        <aside className="glass dashboard-sidebar" style={{ padding: '2rem 1.25rem', display: 'flex', flexDirection: 'column', borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0, borderRight: '1px solid var(--border-color)', zIndex: 10 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '2rem', paddingLeft: '0.5rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>ExploreCMS</h2>

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
        <main className="dashboard-main" style={{ flex: 1, padding: '2.5rem 3rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: '100%', flex: 1 }}>
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
