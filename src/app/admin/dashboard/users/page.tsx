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

  // Ensure only OWNER or ADMIN can view this page
  if (session.role !== 'OWNER' && session.role !== 'ADMIN') {
    redirect('/admin/dashboard')
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="admin-page-title">Manage Users</h1>
        <p className="admin-page-subtitle">
          Grant or revoke Collaborator access. Collaborators can create and edit posts but cannot manage other users.
        </p>
      </header>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        As an Owner or Admin, you can grant or revoke Contributor access. Admins have similar permissions but cannot manage Owners or other Admins.
      </p>

      <UserList users={users} currentUserId={(session as { userId: string }).userId} currentUserRole={(session as { role: string }).role} />
    </div>
  )
}

export const runtime = 'edge';
