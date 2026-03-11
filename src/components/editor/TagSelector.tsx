/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'

type Tag = {
  name: string
  slug: string
}

export default function TagSelector({ 
  availableTags, 
  initialTags = [] 
}: { 
  availableTags: Tag[], 
  initialTags?: string[] 
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags)
  const [newTagInput, setNewTagInput] = useState('')

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    )
  }

  const handleAddNewTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = newTagInput.trim()
      if (val && !selectedTags.includes(val)) {
        // Technically, this just marks it as "selected".
        // The server action (savePost) will handle `connectOrCreate` automatically!
        setSelectedTags([...selectedTags, val])
        setNewTagInput('')
      }
    }
  }

  const addTagBtn = () => {
    const val = newTagInput.trim()
    if (val && !selectedTags.includes(val)) {
      setSelectedTags([...selectedTags, val])
      setNewTagInput('')
    }
  }

  // Find tags that are dynamically added but not in available tags from DB yet
  const customTags = selectedTags.filter(t => !availableTags.some(a => a.name === t))

  return (
    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
      {/* Hidden input to pass selected tags back to the server form action */}
      <input type="hidden" name="tags" value={selectedTags.join(',')} />
      
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Select Tags</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Click tags to toggle them, or create a new one below.</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {availableTags.map(tag => {
          const isSelected = selectedTags.includes(tag.name)
          return (
            <button
              key={tag.slug}
              type="button"
              onClick={() => toggleTag(tag.name)}
              className={`btn ${isSelected ? 'btn-primary' : 'glass'}`}
              style={{
                padding: '0.3rem 0.8rem',
                fontSize: '0.85rem',
                borderRadius: '30px',
                transition: 'all var(--transition-fast)'
              }}
            >
              {tag.name} {isSelected && '✓'}
            </button>
          )
        })}

        {customTags.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className="btn btn-primary"
            style={{
              padding: '0.3rem 0.8rem',
              fontSize: '0.85rem',
              borderRadius: '30px',
              transition: 'all var(--transition-fast)'
            }}
          >
            {tag} ✓
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input 
          type="text" 
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyDown={handleAddNewTag}
          placeholder="Type new tag and press Enter..." 
          style={{ 
            padding: '0.5rem 1rem', 
            borderRadius: 'var(--radius-sm)', 
            border: '1px solid var(--border-color)', 
            background: 'var(--bg-color)', 
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            width: '250px'
          }}
        />
        <button 
          type="button" 
          onClick={addTagBtn} 
          className="btn glass" 
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          Add Tag
        </button>
      </div>
    </div>
  )
}
