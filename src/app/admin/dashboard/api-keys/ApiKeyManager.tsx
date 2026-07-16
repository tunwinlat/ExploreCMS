/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_RESOURCES, API_ACTIONS, ALL_PERMISSIONS } from '@/lib/apiPermissions'
import {
  createApiKey,
  updateApiKeyPermissions,
  renameApiKey,
  setApiKeyRevoked,
  deleteApiKey,
} from './apiKeyActions'
import { useToast } from '@/components/admin/Toast'
import ConfirmDialog from '@/components/admin/ConfirmDialog'

interface ApiKeyItem {
  id: string
  name: string
  prefix: string
  permissions: string // JSON string from the server
  revoked: boolean
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
  expired: boolean
  createdBy: { username: string }
}

// Expand wildcards ("posts:*", "*") into a flat set of concrete permissions
function expandPermissions(perms: string[]): Set<string> {
  const set = new Set<string>()
  for (const p of perms) {
    if (p === '*') {
      ALL_PERMISSIONS.forEach(x => set.add(x))
    } else if (p.endsWith(':*')) {
      const resource = p.slice(0, -2)
      API_ACTIONS.forEach(a => set.add(`${resource}:${a}`))
    } else {
      set.add(p)
    }
  }
  return set
}

// Collapse a set of concrete permissions, using "resource:*" when all four
// actions of a resource are selected
function collapsePermissions(set: Set<string>): string[] {
  const result: string[] = []
  for (const resource of API_RESOURCES) {
    const all = API_ACTIONS.every(a => set.has(`${resource}:${a}`))
    if (all) {
      result.push(`${resource}:*`)
    } else {
      API_ACTIONS.forEach(a => {
        if (set.has(`${resource}:${a}`)) result.push(`${resource}:${a}`)
      })
    }
  }
  return result
}

function parsePermissions(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json)
    return Array.isArray(parsed) ? parsed.filter(p => typeof p === 'string') : []
  } catch {
    return []
  }
}

function PermissionSelector({
  value,
  onChange,
  disabled,
}: {
  value: Set<string>
  onChange: (next: Set<string>) => void
  disabled?: boolean
}) {
  const toggle = (perm: string) => {
    const next = new Set(value)
    if (next.has(perm)) next.delete(perm)
    else next.add(perm)
    onChange(next)
  }

  const toggleResource = (resource: string) => {
    const next = new Set(value)
    const allChecked = API_ACTIONS.every(a => next.has(`${resource}:${a}`))
    API_ACTIONS.forEach(a => {
      if (allChecked) next.delete(`${resource}:${a}`)
      else next.add(`${resource}:${a}`)
    })
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {API_RESOURCES.map(resource => {
        const allChecked = API_ACTIONS.every(a => value.has(`${resource}:${a}`))
        return (
          <div
            key={resource}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              padding: '0.6rem 0.75rem',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '110px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
              <input
                type="checkbox"
                checked={allChecked}
                onChange={() => toggleResource(resource)}
                disabled={disabled}
              />
              {resource}
            </label>
            <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
              {API_ACTIONS.map(action => (
                <label key={action} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', textTransform: 'capitalize' }}>
                  <input
                    type="checkbox"
                    checked={value.has(`${resource}:${action}`)}
                    onChange={() => toggle(`${resource}:${action}`)}
                    disabled={disabled}
                  />
                  {action}
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ApiKeyManager({ initialKeys }: { initialKeys: ApiKeyItem[] }) {
  const router = useRouter()
  const [keys, setKeys] = useState(initialKeys)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPerms, setNewPerms] = useState<Set<string>>(new Set())
  const [newExpiry, setNewExpiry] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPerms, setEditPerms] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyItem | null>(null)
  const { toast } = useToast()

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast('Key name is required', 'warning')
      return
    }
    if (newPerms.size === 0) {
      toast('Select at least one permission', 'warning')
      return
    }

    setLoading(true)
    const res = await createApiKey(newName.trim(), collapsePermissions(newPerms), newExpiry || null)
    setLoading(false)

    if (res.success && res.plaintextKey) {
      setCreatedKey(res.plaintextKey)
      setShowCreate(false)
      setNewName('')
      setNewPerms(new Set())
      setNewExpiry('')
      router.refresh()
    } else {
      toast(res.error || 'Failed to create API key', 'error')
    }
  }

  const handleSavePermissions = async (id: string) => {
    if (editPerms.size === 0) {
      toast('Select at least one permission', 'warning')
      return
    }
    setLoading(true)
    const res = await updateApiKeyPermissions(id, collapsePermissions(editPerms))
    setLoading(false)

    if (res.success) {
      setKeys(keys.map(k => k.id === id ? { ...k, permissions: JSON.stringify(collapsePermissions(editPerms)) } : k))
      setEditingId(null)
      toast('Permissions updated.', 'success')
    } else {
      toast(res.error || 'Failed to update permissions', 'error')
    }
  }

  const handleToggleRevoke = async (key: ApiKeyItem) => {
    setLoading(true)
    const res = await setApiKeyRevoked(key.id, !key.revoked)
    setLoading(false)

    if (res.success) {
      setKeys(keys.map(k => k.id === key.id ? { ...k, revoked: !key.revoked } : k))
      toast(key.revoked ? 'Key restored.' : 'Key revoked.', 'success')
    } else {
      toast(res.error || 'Failed to update key', 'error')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setLoading(true)
    const res = await deleteApiKey(deleteTarget.id)
    setLoading(false)

    if (res.success) {
      setKeys(keys.filter(k => k.id !== deleteTarget.id))
      toast(`API key "${deleteTarget.name}" deleted.`, 'success')
    } else {
      toast(res.error || 'Failed to delete key', 'error')
    }
    setDeleteTarget(null)
  }

  const copyKey = async () => {
    if (!createdKey) return
    try {
      await navigator.clipboard.writeText(createdKey)
      toast('API key copied to clipboard.', 'success')
    } catch {
      toast('Failed to copy — please copy the key manually.', 'warning')
    }
  }

  const statusOf = (key: ApiKeyItem): { label: string; color: string } => {
    if (key.revoked) return { label: 'Revoked', color: '#ef4444' }
    if (key.expired) return { label: 'Expired', color: '#f59e0b' }
    return { label: 'Active', color: '#22c55e' }
  }

  const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : 'Never')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Newly created key — shown exactly once */}
      {createdKey && (
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--accent-color)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Your new API key</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Copy it now — for security reasons it will <strong>never be shown again</strong>.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{
              flex: 1,
              minWidth: '260px',
              padding: '0.75rem 1rem',
              background: 'var(--bg-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
              wordBreak: 'break-all',
              userSelect: 'all',
            }}>
              {createdKey}
            </code>
            <button onClick={copyKey} className="btn btn-primary" style={{ padding: '0.6rem 1.2rem' }}>Copy</button>
            <button onClick={() => setCreatedKey(null)} className="btn glass" style={{ padding: '0.6rem 1.2rem' }}>Done</button>
          </div>
        </div>
      )}

      {/* Create form */}
      <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
        {!showCreate ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              {keys.length} {keys.length === 1 ? 'key' : 'keys'} configured
            </p>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ padding: '0.6rem 1.4rem' }}>
              Create API Key
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0 }}>Create a new API key</h3>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label htmlFor="api-key-name" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Name
                </label>
                <input
                  id="api-key-name"
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Mobile app, CI deploy hook"
                  maxLength={100}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label htmlFor="api-key-expiry" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Expires (optional)
                </label>
                <input
                  id="api-key-expiry"
                  type="date"
                  value={newExpiry}
                  onChange={e => setNewExpiry(e.target.value)}
                  style={{ padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Permissions
              </span>
              <PermissionSelector value={newPerms} onChange={setNewPerms} disabled={loading} />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleCreate} disabled={loading} className="btn btn-primary" style={{ padding: '0.6rem 1.4rem' }}>
                {loading ? 'Creating…' : 'Create key'}
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewName(''); setNewPerms(new Set()); setNewExpiry('') }}
                disabled={loading}
                className="btn glass"
                style={{ padding: '0.6rem 1.4rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Key list */}
      <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
        {keys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>No API keys yet</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Create a key to let external apps manage your blog, projects and gallery via <code>/api/v1</code>.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {keys.map(key => {
              const status = statusOf(key)
              const perms = parsePermissions(key.permissions)
              return (
                <div key={key.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{key.name}</span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.55rem',
                          borderRadius: '999px',
                          color: status.color,
                          background: `color-mix(in srgb, ${status.color} 12%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${status.color} 35%, transparent)`,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}>
                          {status.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        <code>{key.prefix}…</code> &middot; created by {key.createdBy.username}
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                        {perms.map(p => (
                          <code key={p} style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            background: 'var(--bg-color)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-secondary)',
                          }}>
                            {p}
                          </code>
                        ))}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.6rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                        <span>Created: {formatDate(key.createdAt)}</span>
                        <span>Last used: {formatDate(key.lastUsedAt)}</span>
                        <span>Expires: {key.expiresAt ? formatDate(key.expiresAt) : 'Never'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          if (editingId === key.id) {
                            setEditingId(null)
                          } else {
                            setEditingId(key.id)
                            setEditPerms(expandPermissions(perms))
                          }
                        }}
                        className="btn glass"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      >
                        {editingId === key.id ? 'Close' : 'Edit permissions'}
                      </button>
                      <button
                        onClick={() => handleToggleRevoke(key)}
                        disabled={loading}
                        className="btn glass"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      >
                        {key.revoked ? 'Restore' : 'Revoke'}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(key)}
                        className="btn"
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {editingId === key.id && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <PermissionSelector value={editPerms} onChange={setEditPerms} disabled={loading} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleSavePermissions(key.id)} disabled={loading} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                          Save permissions
                        </button>
                        <button onClick={() => setEditingId(null)} disabled={loading} className="btn glass" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Usage hint */}
      <div className="glass" style={{ padding: '1.5rem 2rem', borderRadius: 'var(--radius-lg)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem' }}>Usage</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          Send the key in the <code>Authorization: Bearer</code> header (or <code>X-API-Key</code>):
        </p>
        <pre style={{
          margin: 0,
          padding: '1rem',
          background: 'var(--bg-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.82rem',
          overflowX: 'auto',
          color: 'var(--text-secondary)',
        }}>
{`curl -X POST https://your-site.com/api/v1/posts \\
  -H "Authorization: Bearer ecms_..." \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Hello API", "content": "# Hi", "published": true, "tags": ["api"]}'`}
        </pre>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.75rem', marginBottom: 0 }}>
          Endpoints: <code>/api/v1/posts</code>, <code>/api/v1/projects</code>, <code>/api/v1/gallery/albums</code>, <code>/api/v1/gallery/photos</code>.
          See <code>docs/api.md</code> for the full reference.
        </p>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete API key?"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? Any integration using this key will immediately lose access. This cannot be undone.` : ''}
        confirmLabel="Delete key"
        cancelLabel="Cancel"
        variant="danger"
        loading={loading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
