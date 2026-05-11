/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { getSettings } from '@/lib/settings-cache'
import { redirect } from 'next/navigation'
import IntegrationsForm from './IntegrationsForm'

export default async function IntegrationsPage() {
  const session = await verifySession()
  if (!session) return null

  if (session.role !== 'OWNER') {
    redirect('/admin/dashboard')
  }

  let settings = null
  try {
    settings = await getSettings()
  } catch {
    // Database tables may not exist yet
  }

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="admin-page-title">Integrations</h1>
        <p className="admin-page-subtitle">Connect external services, configure storage, and manage database migrations.</p>
      </header>

      <IntegrationsForm initialSettings={settings} />
    </div>
  )
}
