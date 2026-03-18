/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { updateUserRole, deleteUser } from './userAdminActions'
import { useToast } from '@/components/admin/Toast'
import ConfirmDialog from '@/components/admin/ConfirmDialog'

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
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const { toast } = useToast()

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoadingId(userId)
    try {
      await updateUserRole(userId, newRole)
      toast(`Role updated to ${newRole}`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update user role', 'error')
    }
    setLoadingId(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setLoadingId(deleteTarget.id)
    try {
      await deleteUser(deleteTarget.id)
      toast(`User "${deleteTarget.username}" has been removed.`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete user', 'error')
    }
    setLoadingId(null)
    setDeleteTarget(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass admin-table-wrapper" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--border-color)' }}>
              <th scope="col" style={{ padding: '0.875rem 1rem' }}>Username</th>
              <th scope="col" style={{ padding: '0.875rem 1rem' }}>Name</th>
              <th scope="col" style={{ padding: '0.875rem 1rem' }}>Role</th>
              <th scope="col" style={{ padding: '0.875rem 1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const isSelf = user.id === currentUserId
              const isTargetOwner = user.role === 'OWNER'
              const isTargetAdmin = user.role === 'ADMIN'
              const isDisabled = isSelf || loadingId === user.id || isTargetOwner || (currentUserRole === 'ADMIN' && isTargetAdmin)

              return (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: loadingId === user.id ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'var(--accent-color)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', fontWeight: 700, flexShrink: 0
                      }}>
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                      <span>
                        {user.username}
                        {isSelf && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>(You)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '\u2014'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <select
                      disabled={isDisabled}
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      aria-label={`Role for ${user.username}`}
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
                      onClick={() => setDeleteTarget(user)}
                      className="btn"
                      aria-label={`Remove user ${user.username}`}
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove user?"
        message={deleteTarget ? `Are you sure you want to permanently remove "${deleteTarget.username}"? This cannot be undone.` : ''}
        confirmLabel="Remove user"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={loadingId === deleteTarget?.id}
      />
    </div>
  )
}
