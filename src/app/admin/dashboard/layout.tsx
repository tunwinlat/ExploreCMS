/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSidebarWrapper from '@/app/admin/dashboard/AdminSidebarWrapper'
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
          @media (max-width: 768px) {
            .dashboard-layout {
              flex-direction: column !important;
            }
            .dashboard-main {
              padding: 1rem !important;
            }
          }
        `}</style>

        {/* Sidebar Wrapper */}
        <AdminSidebarWrapper
          role={(session as { role: string }).role}
          username={(session as { username: string }).username}
        />

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
