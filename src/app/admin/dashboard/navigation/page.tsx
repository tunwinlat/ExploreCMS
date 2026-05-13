/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings-cache'
import { redirect } from 'next/navigation'
import NavBuilder from './NavBuilder'

export default async function NavigationPage() {
  const session = await verifySession()
  if (!session) return null

  if (session.role !== 'OWNER') {
    redirect('/admin/dashboard')
  }

  // ⚡ Bolt: Parallelize independent DB queries to avoid waterfalling
  let initialConfig = '[{"id":"latest","type":"latest","label":"Latest"}]'
  let availableTags: { name: string; slug: string }[] = []
  try {
    const [settings, tags] = await Promise.all([
      getSettings(),
      prisma.tag.findMany({
        select: { name: true, slug: true },
        orderBy: { name: 'asc' }
      })
    ])
    if (settings?.navigationConfig) initialConfig = settings.navigationConfig
    availableTags = tags
  } catch {
    // Database tables may not exist yet (e.g. during build)
  }

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="admin-page-title">Navigation Builder</h1>
        <p className="admin-page-subtitle">Design the layout and dropdowns for your public post filtering menu.</p>
      </header>
      
      <NavBuilder initialConfig={initialConfig} availableTags={availableTags} />
    </div>
  )
}

export const runtime = 'edge';
