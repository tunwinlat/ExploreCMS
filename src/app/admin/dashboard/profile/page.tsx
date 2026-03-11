/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>My Profile</h1>
      </header>

      <div className="glass" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          Personal Information
        </h2>
        <UserProfileForm user={user} />
      </div>
    </div>
  )
}
