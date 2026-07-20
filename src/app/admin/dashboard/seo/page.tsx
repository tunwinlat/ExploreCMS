/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { getSettings } from '@/lib/settings-cache'
import { redirect } from 'next/navigation'
import SeoForm from './SeoForm'

export const metadata = { title: 'SEO | ExploreCMS' }

export default async function SeoPage() {
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
        <h1 className="admin-page-title">SEO</h1>
        <p className="admin-page-subtitle">
          Search engine, social sharing and AI-discovery configuration. Per-post overrides live in the post editor.
        </p>
      </header>

      <SeoForm initialSettings={settings} />
    </div>
  )
}
