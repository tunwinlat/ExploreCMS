/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { getSettings } from '@/lib/settings-cache'
import { redirect } from 'next/navigation'
import { parseComponentConfig } from '@/lib/components-config'
import ComponentsForm from './ComponentsForm'

export default async function ComponentsPage() {
  const session = await verifySession()
  if (!session) return null

  if (session.role !== 'OWNER') redirect('/admin/dashboard')

  let settings = null
  try {
    settings = await getSettings()
  } catch {}

  const config = parseComponentConfig(settings as any)

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="admin-page-title">Site Components</h1>
        <p className="admin-page-subtitle">
          Choose which sections to enable on your site and configure the homepage default.
        </p>
      </header>

      <ComponentsForm
        initialEnabled={config.enabledComponents}
        initialDefault={config.defaultComponent}
      />
    </div>
  )
}
