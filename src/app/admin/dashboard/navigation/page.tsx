/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import NavBuilder from './NavBuilder'

export default async function NavigationPage() {
  const session = await verifySession()
  if (!session) return null

  if (session.role !== 'OWNER') {
    redirect('/admin/dashboard')
  }

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' }
  })
  
  const availableTags = await prisma.tag.findMany({
    select: { name: true, slug: true },
    orderBy: { name: 'asc' }
  })

  // Provide a default fallback if DB string empty/invalid
  const initialConfig = settings?.navigationConfig || '[{"id":"latest","type":"latest","label":"Latest"}]'

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
