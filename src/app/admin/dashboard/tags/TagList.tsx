/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { updateTag, deleteTag } from './tagActions'
import { useToast } from '@/components/admin/Toast'
import ConfirmDialog from '@/components/admin/ConfirmDialog'

type Tag = {
  id: string
  name: string
  slug: string
  _count: { posts: number }
}

export default function TagList({ initialTags }: { initialTags: Tag[] }) {
  const [tags, setTags] = useState(initialTags)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null)
  const { toast } = useToast()

  const handleEditClick = (tag: Tag) => {
    setEditingId(tag.id)
    setEditName(tag.name)
  }

  const handleSave = async (id: string) => {
    if (!editName.trim()) {
      toast('Tag name cannot be empty', 'warning')
      return
    }

    setLoading(true)

    const res = await updateTag(id, editName.trim())

    if (res.success) {
      setTags(tags.map(t => t.id === id ? { ...t, name: editName.trim(), slug: editName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') } : t))
      setEditingId(null)
      toast('Tag updated.', 'success')
    } else {
      toast(res.error || 'Failed to update tag', 'error')
    }

    setLoading(false)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setLoading(true)
    const res = await deleteTag(deleteTarget.id)
    if (res.success) {
      setTags(tags.filter(t => t.id !== deleteTarget.id))
      toast(`Tag "${deleteTarget.name}" deleted.`, 'success')
    } else {
      toast(res.error || 'Failed to delete tag', 'error')
    }
    setLoading(false)
    setDeleteTarget(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave(id)
    } else if (e.key === 'Escape') {
      setEditingId(null)
    }
  }

  return (
    <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
      {tags.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>No tags yet</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tags are created automatically when you add them in the Post Editor.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {tags.map(tag => (
            <div key={tag.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', transition: 'border-color 0.2s' }}>
              {editingId === tag.id ? (
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => handleKeyDown(e, tag.id)}
                    aria-label="Edit tag name"
                    style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', flex: 1 }}
                    autoFocus
                  />
                  <button onClick={() => handleSave(tag.id)} disabled={loading} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Save</button>
                  <button onClick={() => setEditingId(null)} disabled={loading} className="btn glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Cancel</button>
                </div>
              ) : (
                <>
                  <div>
                    <div style={{ fontWeight: 500 }}>{tag.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      /{tag.slug} &middot; {tag._count.posts} {tag._count.posts === 1 ? 'post' : 'posts'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEditClick(tag)} className="btn glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Edit</button>
                    <button onClick={() => setDeleteTarget(tag)} className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete tag?"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This will remove the tag from ${deleteTarget._count.posts} associated ${deleteTarget._count.posts === 1 ? 'post' : 'posts'}.` : ''}
        confirmLabel="Delete tag"
        cancelLabel="Cancel"
        variant="danger"
        loading={loading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
