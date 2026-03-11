'use client'

import { useState } from 'react'
import { updateNavigationConfig } from './navActions'

export type NavItem = {
  id: string
  type: 'latest' | 'featured' | 'tag' | 'dropdown'
  label: string
  tagSlug?: string // if type === 'tag'
  children?: NavItem[] // if type === 'dropdown'
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
  const [message, setMessage] = useState({ text: '', type: '' })

  const handleSave = async () => {
    setLoading(true)
    setMessage({ text: '', type: '' })
    
    const res = await updateNavigationConfig(JSON.stringify(items))
    if (res.success) {
      setMessage({ text: 'Navigation updated successfully!', type: 'success' })
    } else {
      setMessage({ text: res.error || 'Failed to update workflow', type: 'error' })
    }
    setLoading(false)
  }

  // Very basic list builder operations for MVP
  const addItem = (type: NavItem['type']) => {
    const newItem: NavItem = {
      id: Math.random().toString(36).substring(7),
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

  const addChild = (parentId: string) => {
    setItems(items.map(item => {
      if (item.id === parentId && item.type === 'dropdown') {
        return {
          ...item,
          children: [...(item.children || []), { id: Math.random().toString(36).substring(7), type: 'tag', label: 'Select Tag' }]
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
      {message.text && (
        <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: message.type === 'success' ? '#22c55e' : '#ef4444' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button type="button" onClick={() => addItem('latest')} className="btn" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>+ Add Latest</button>
        <button type="button" onClick={() => addItem('featured')} className="btn" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>+ Add Featured</button>
        <button type="button" onClick={() => addItem('tag')} className="btn" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>+ Add Direct Tag Link</button>
        <button type="button" onClick={() => addItem('dropdown')} className="btn" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>+ Add Dropdown Menu</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No navigation items added yet.</p>}
        {items.map((item, index) => (
          <div key={item.id} style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, width: '24px' }}>{index + 1}.</span>
              <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'var(--accent-color)', color: 'white', borderRadius: '4px' }}>{item.type.toUpperCase()}</span>
              
              <input 
                type="text" 
                value={item.label} 
                onChange={e => updateItem(item.id, { label: e.target.value })}
                placeholder="Label"
                style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', flex: 1, minWidth: '150px' }}
              />

              {item.type === 'tag' && renderTagSelect(item.tagSlug, (slug, label) => updateItem(item.id, { tagSlug: slug, label }))}

              <button type="button" onClick={() => removeItem(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}>✕ Remove</button>
            </div>

            {item.type === 'dropdown' && (
              <div style={{ marginTop: '1rem', marginLeft: '2rem', paddingLeft: '1rem', borderLeft: '2px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-secondary)' }}>Dropdown Items:</h4>
                {item.children?.map((child) => (
                  <div key={child.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={child.label} 
                      onChange={e => updateChild(item.id, child.id, { label: e.target.value })}
                      placeholder="Label"
                      style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', flex: 1 }}
                    />
                    {renderTagSelect(child.tagSlug, (slug, label) => updateChild(item.id, child.id, { tagSlug: slug, label }))}
                    <button type="button" onClick={() => removeChild(item.id, child.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={() => addChild(item.id)} className="btn" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '0.8rem', alignSelf: 'flex-start', padding: '0.3rem 0.8rem' }}>+ Add Tag to Dropdown</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ marginTop: '1rem' }}>
        {loading ? 'Saving Layout...' : 'Save Navigation Layout'}
      </button>
    </div>
  )
}
