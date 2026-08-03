/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSiteProfile } from './siteProfileActions'
import SiteProfileForm from './SiteProfileForm'

export default async function SiteProfilePage() {
  const session = await verifySession()
  if (!session) return null

  if (session.role !== 'OWNER') {
    redirect('/admin/dashboard')
  }

  const profile = await getSiteProfile()

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="admin-page-title">Site Profile</h1>
        <p className="admin-page-subtitle">
          Your public biography for reviewers and visitors. Empty sections stay hidden on the profile page.
        </p>
      </header>

      <SiteProfileForm initialProfile={profile} />
    </div>
  )
}
