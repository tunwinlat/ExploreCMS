'use client'

import { useState } from 'react'
import { updateTag, deleteTag } from './tagActions'

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
  const [error, setError] = useState('')

  const handleEditClick = (tag: Tag) => {
    setEditingId(tag.id)
    setEditName(tag.name)
    setError('')
  }

  const handleSave = async (id: string) => {
    if (!editName.trim()) {
      setError('Tag name cannot be empty')
      return
    }

    setLoading(true)
    setError('')
    
    const res = await updateTag(id, editName.trim())
    
    if (res.success) {
      setTags(tags.map(t => t.id === id ? { ...t, name: editName.trim(), slug: editName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') } : t))
      setEditingId(null)
    } else {
      setError(res.error || 'Failed to update tag')
    }
    
    setLoading(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the tag "${name}"? This will remove it from all associated posts.`)) {
      setLoading(true)
      const res = await deleteTag(id)
      if (res.success) {
        setTags(tags.filter(t => t.id !== id))
      } else {
        setError(res.error || 'Failed to delete tag')
      }
      setLoading(false)
    }
  }

  return (
    <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
      {error && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 'var(--radius-md)' }}>{error}</div>}
      
      {tags.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No tags have been created yet. Add them directly from the Post Editor!</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {tags.map(tag => (
            <div key={tag.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              {editingId === tag.id ? (
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)}
                    style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', background: 'var(--bg-color)', color: 'var(--text-primary)', flex: 1 }}
                    autoFocus
                  />
                  <button onClick={() => handleSave(tag.id)} disabled={loading} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Save</button>
                  <button onClick={() => setEditingId(null)} disabled={loading} className="btn glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Cancel</button>
                </div>
              ) : (
                <>
                  <div>
                    <div style={{ fontWeight: 600 }}>{tag.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>/{tag.slug} • {tag._count.posts} posts</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEditClick(tag)} className="btn glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Edit</button>
                    <button onClick={() => handleDelete(tag.id, tag.name)} className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
