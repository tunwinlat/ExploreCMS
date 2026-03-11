/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import UserList from './UserList'

export default async function UsersPage() {
  const session = await verifySession()
  if (!session) return null

  // Ensure only OWNER can view this page
  if (session.role !== 'OWNER') {
    redirect('/admin/dashboard')
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="fade-in-up">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>Manage Users</h1>
      </header>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        As an Owner, you can grant or revoke Collaborator access. Collaborators can create and edit posts but cannot manage other users.
      </p>

      <UserList users={users} currentUserId={(session as { userId: string }).userId} />
    </div>
  )
}
