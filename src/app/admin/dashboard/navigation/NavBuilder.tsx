/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { updateNavigationConfig } from './navActions'
import { useToast } from '@/components/admin/Toast'

export type NavItem = {
  id: string
  type: 'latest' | 'featured' | 'tag' | 'dropdown'
  label: string
  tagSlug?: string
  children?: NavItem[]
}

let navIdCounter = 0

function generateId() {
  return `nav_${Date.now()}_${++navIdCounter}`
}

export default function NavBuilder({ initialConfig, availableTags }: { initialConfig: string, availableTags: {name: string, slug: string}[] }) {
  const [items, setItems] = useState<NavItem[]>(() => {
    try {
      return JSON.parse(initialConfig)
    } catch {
      return [{ id: 'latest', type: 'latest', label: 'Latest' }, { id: 'featured', type: 'featured', label: 'Featured' }]
    }
  })

  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    setLoading(true)

    try {
      await updateNavigationConfig(JSON.stringify(items))
      toast('Navigation updated!', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update navigation', 'error')
    }
    setLoading(false)
  }

  const addItem = (type: NavItem['type']) => {
    const newItem: NavItem = {
      id: generateId(),
      type,
      label: type === 'dropdown' ? 'New Dropdown' : type === 'latest' ? 'Latest Posts' : type === 'featured' ? 'Featured Posts' : 'Select Tag',
      children: type === 'dropdown' ? [] : undefined
    }
    setItems([...items, newItem])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, updates: Partial<NavItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= items.length) return
    const newItems = [...items]
    const [moved] = newItems.splice(index, 1)
    newItems.splice(newIndex, 0, moved)
    setItems(newItems)
  }

  const addChild = (parentId: string) => {
    setItems(items.map(item => {
      if (item.id === parentId && item.type === 'dropdown') {
        return {
          ...item,
          children: [...(item.children || []), { id: generateId(), type: 'tag' as const, label: 'Select Tag' }]
        }
      }
      return item
    }))
  }

  const removeChild = (parentId: string, childId: string) => {
    setItems(items.map(item => {
      if (item.id === parentId && item.type === 'dropdown') {
        return {
          ...item,
          children: item.children?.filter(c => c.id !== childId) || []
        }
      }
      return item
    }))
  }

  const updateChild = (parentId: string, childId: string, updates: Partial<NavItem>) => {
    setItems(items.map(item => {
      if (item.id === parentId && item.type === 'dropdown') {
        return {
          ...item,
          children: item.children?.map(c => c.id === childId ? { ...c, ...updates } : c) || []
        }
      }
      return item
    }))
  }

  const renderTagSelect = (value: string | undefined, onChange: (slug: string, label: string) => void) => (
    <select
      value={value || ''}
      onChange={(e) => {
        const option = e.target.selectedOptions[0]
        onChange(e.target.value, option.text)
      }}
      aria-label="Select a tag"
      style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
    >
      <option value="" disabled>Select a tag...</option>
      {availableTags.map(tag => (
        <option key={tag.slug} value={tag.slug}>{tag.name}</option>
      ))}
    </select>
  )

  return (
    <div className="glass" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button type="button" onClick={() => addItem('latest')} className="btn" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>+ Latest</button>
        <button type="button" onClick={() => addItem('featured')} className="btn" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>+ Featured</button>
        <button type="button" onClick={() => addItem('tag')} className="btn" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>+ Tag Link</button>
        <button type="button" onClick={() => addItem('dropdown')} className="btn" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>+ Dropdown</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>No navigation items. Add one above to get started.</p>}
        {items.map((item, index) => (
          <div key={item.id} style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                  style={{ background: 'transparent', border: 'none', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? 'var(--border-color)' : 'var(--text-secondary)', fontSize: '0.7rem', padding: '0 4px', lineHeight: 1 }}
                >
                  {'\u25B2'}
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label="Move down"
                  style={{ background: 'transparent', border: 'none', cursor: index === items.length - 1 ? 'default' : 'pointer', color: index === items.length - 1 ? 'var(--border-color)' : 'var(--text-secondary)', fontSize: '0.7rem', padding: '0 4px', lineHeight: 1 }}
                >
                  {'\u25BC'}
                </button>
              </div>

              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--accent-color)', color: 'white', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase' }}>{item.type}</span>

              <input
                type="text"
                value={item.label}
                onChange={e => updateItem(item.id, { label: e.target.value })}
                placeholder="Label"
                aria-label={`Label for navigation item ${index + 1}`}
                style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', flex: 1, minWidth: '150px' }}
              />

              {item.type === 'tag' && renderTagSelect(item.tagSlug, (slug, label) => updateItem(item.id, { tagSlug: slug, label }))}

              <button type="button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.label}`} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', fontWeight: 500, fontSize: '0.85rem' }}>Remove</button>
            </div>

            {item.type === 'dropdown' && (
              <div style={{ marginTop: '1rem', marginLeft: '2rem', paddingLeft: '1rem', borderLeft: '2px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-secondary)' }}>Dropdown Items:</h4>
                {item.children?.map((child) => (
                  <div key={child.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={child.label}
                      onChange={e => updateChild(item.id, child.id, { label: e.target.value })}
                      placeholder="Label"
                      aria-label="Dropdown item label"
                      style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', flex: 1 }}
                    />
                    {renderTagSelect(child.tagSlug, (slug, label) => updateChild(item.id, child.id, { tagSlug: slug, label }))}
                    <button type="button" onClick={() => removeChild(item.id, child.id)} aria-label="Remove dropdown item" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}>Remove</button>
                  </div>
                ))}
                <button type="button" onClick={() => addChild(item.id)} className="btn" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '0.8rem', alignSelf: 'flex-start', padding: '0.3rem 0.8rem' }}>+ Add to Dropdown</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.75rem', fontSize: '1rem' }}>
        {loading ? 'Saving...' : 'Save Navigation Layout'}
      </button>
    </div>
  )
}
