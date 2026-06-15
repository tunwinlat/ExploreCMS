export const runtime = 'edge';
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Suspense } from 'react'
import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import UserProfileForm from './UserProfileForm'

export default async function UsersPage() {
  const session = await verifySession()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: (session as { userId: string }).userId }
  })

  if (!user) return <div>User not found.</div>

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="admin-page-title">My Profile</h1>
        <p className="admin-page-subtitle">Update your personal information, email address, and password.</p>
      </header>

      <div className="glass" style={{ padding: '2rem' }}>
        <Suspense fallback={null}>
          <UserProfileForm user={user} />
        </Suspense>
      </div>
    </div>
  )
}
