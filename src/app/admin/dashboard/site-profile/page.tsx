/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/settings-cache'
import { parseComponentConfig } from '@/lib/components-config'
import { getSiteProfile } from './siteProfileActions'
import SiteProfileForm from './SiteProfileForm'

export default async function SiteProfilePage() {
  const session = await verifySession()
  if (!session) return null

  if (session.role !== 'OWNER') {
    redirect('/admin/dashboard')
  }

  // The Public Profile editor is always available — saved data persists
  // regardless of whether the Profile component is enabled for visitors.
  const [profile, settings] = await Promise.all([getSiteProfile(), getSettings()])
  const { enabledComponents } = parseComponentConfig(settings as any)
  const profileEnabled = enabledComponents.includes('profile')

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="admin-page-title">Public Profile</h1>
        <p className="admin-page-subtitle">
          Your public biography for reviewers and visitors. Empty sections stay hidden on the profile page.
        </p>
      </header>

      {!profileEnabled && (
        <div className="glass" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--accent, #4f8cff)' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
            The Profile component is currently <strong>disabled</strong>, so visitors can&apos;t see your profile page yet.
            Everything you save here is kept — enable it anytime under{' '}
            <a href="/admin/dashboard/components" style={{ color: 'var(--accent, #4f8cff)' }}>Site Components</a>.
          </p>
        </div>
      )}

      <SiteProfileForm initialProfile={profile} />
    </div>
  )
}
