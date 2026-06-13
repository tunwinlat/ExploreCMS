export const runtime = 'edge';
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { getSettings } from '@/lib/settings-cache'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const session = await verifySession()
  if (!session) return null

  // Ensure only OWNER can view this page
  if (session.role !== 'OWNER') {
    redirect('/admin/dashboard')
  }

  let settings = null
  try {
    settings = await getSettings()
  } catch {
    // Database tables may not exist yet (e.g. during build)
  }

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="admin-page-title">Site Settings</h1>
        <p className="admin-page-subtitle">Configure your public blog aesthetics.</p>
      </header>
      
      <SettingsForm initialSettings={settings} />
    </div>
  )
}
