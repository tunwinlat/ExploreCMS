/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // If no owner exists, redirect immediately to setup across all admin routes
  let owner = null
  try {
    owner = await prisma.user.findFirst({ where: { role: 'OWNER' } })
  } catch {
    // Database tables may not exist yet (e.g. during build or first deploy)
  }
  if (!owner) {
    redirect('/setup')
  }

  return children
}
