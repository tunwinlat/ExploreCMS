/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { updateUserRole, deleteUser } from './userAdminActions'

type User = {
  id: string
  username: string
  firstName: string | null
  lastName: string | null
  role: string
  createdAt: Date
}

export default function UserList({ users, currentUserId, currentUserRole }: { users: User[], currentUserId: string, currentUserRole: string }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoadingId(userId)
    setError(null)
    try {
      await updateUserRole(userId, newRole)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role')
    }
    setLoadingId(null)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to completely delete this user?')) return
    setLoadingId(userId)
    setError(null)
    try {
      await deleteUser(userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    }
    setLoadingId(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 'var(--radius-md)' }}>
          {error}
        </div>
      )}

      <div className="glass" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Username</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Name</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Role</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const isSelf = user.id === currentUserId
              const isTargetOwner = user.role === 'OWNER'
              const isTargetAdmin = user.role === 'ADMIN'
              const isDisabled = isSelf || loadingId === user.id || isTargetOwner || (currentUserRole === 'ADMIN' && isTargetAdmin)

              return (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: loadingId === user.id ? 0.5 : 1 }}>
                  <td style={{ padding: '1rem' }}>{user.username} {isSelf && '(You)'}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}` : '-'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <select
                      disabled={isDisabled}
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      style={{ padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                    >
                      {/* Only display OWNER if this user is the OWNER, since others cannot be made OWNER */}
                      {isTargetOwner && <option value="OWNER">OWNER</option>}
                      <option value="ADMIN">ADMIN</option>
                      <option value="CONTRIBUTOR">CONTRIBUTOR</option>
                    </select>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button
                      disabled={isDisabled}
                      onClick={() => handleDelete(user.id)}
                      className="btn"
                      style={{
                        background: isDisabled ? 'transparent' : 'rgba(239, 68, 68, 0.1)',
                        color: isDisabled ? 'var(--text-secondary)' : '#ef4444',
                        border: 'none',
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.85rem',
                        cursor: isDisabled ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
