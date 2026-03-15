/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { updatePopupConfig, togglePopupEnabled } from './popupActions'
import { useToast } from '@/components/admin/Toast'
import { sanitizeContent } from '@/lib/sanitize'

const TipTapEditor = dynamic(() => import('@/components/editor/TipTapEditor'), { ssr: false })

export default function PopupEditor({ initialConfig }: { initialConfig: any }) {
  const [enabled, setEnabled] = useState(initialConfig?.enabled || false)
  const [title, setTitle] = useState(initialConfig?.title || '')
  const [content, setContent] = useState(initialConfig?.content || '')
  const [displayMode, setDisplayMode] = useState(initialConfig?.displayMode || 'once')
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState(false)
  const { toast } = useToast()

  const handleToggle = async () => {
    const newVal = !enabled
    setEnabled(newVal)
    setToggling(true)
    const res = await togglePopupEnabled(newVal)
    if (res.success) {
      toast(newVal ? 'Popup enabled.' : 'Popup disabled.', 'success')
    } else {
      setEnabled(!newVal) // revert
      toast(res.error || 'Failed to toggle popup.', 'error')
    }
    setToggling(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (enabled && !content.trim()) {
      toast('Popup content is required when enabled.', 'warning')
      return
    }

    setLoading(true)
    const res = await updatePopupConfig(enabled, title, content, displayMode)
    if (res.success) {
      toast('Popup configuration saved!', 'success')
    } else {
      toast(res.error || 'Failed to save popup configuration.', 'error')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Enable Toggle */}
      <div className="glass" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <strong style={{ fontSize: '1rem' }}>Enable Popup</strong>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            When enabled, visitors will see this popup on the homepage.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          disabled={toggling}
          style={{
            width: '52px',
            height: '28px',
            borderRadius: '14px',
            border: 'none',
            background: enabled ? 'var(--accent-color)' : 'var(--border-color)',
            position: 'relative',
            cursor: toggling ? 'wait' : 'pointer',
            opacity: toggling ? 0.6 : 1,
            transition: 'background var(--transition-fast)',
            flexShrink: 0
          }}
        >
          <span style={{
            position: 'absolute',
            top: '3px',
            left: enabled ? '27px' : '3px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'white',
            transition: 'left var(--transition-fast)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }} />
        </button>
      </div>

      {/* Display Mode */}
      <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <strong style={{ fontSize: '1rem' }}>Display Frequency</strong>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Control how often visitors see this popup.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
          <label
            style={{
              flex: 1,
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: displayMode === 'once' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
              background: 'var(--bg-color-secondary)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              textAlign: 'center'
            }}
          >
            <input
              type="radio"
              name="displayMode"
              value="once"
              checked={displayMode === 'once'}
              onChange={() => setDisplayMode('once')}
              style={{ display: 'none' }}
            />
            <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Once per visitor</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Shows once, then remembers the visitor</div>
          </label>

          <label
            style={{
              flex: 1,
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: displayMode === 'always' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
              background: 'var(--bg-color-secondary)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              textAlign: 'center'
            }}
          >
            <input
              type="radio"
              name="displayMode"
              value="always"
              checked={displayMode === 'always'}
              onChange={() => setDisplayMode('always')}
              style={{ display: 'none' }}
            />
            <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Every visit</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Shows every time the homepage loads</div>
          </label>
        </div>
      </div>

      {/* Title */}
      <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label htmlFor="popupTitle" style={{ fontWeight: 500 }}>Popup Title</label>
        <input
          id="popupTitle"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Welcome! or Announcement"
          suppressHydrationWarning
          className="input-field"
        />
      </div>

      {/* Content Editor */}
      <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontWeight: 500 }}>Popup Content</label>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Use the rich text editor to create your popup message.
        </p>
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: '0.5rem' }}>
          <TipTapEditor
            initialContent={content}
            onChange={(html) => setContent(html)}
          />
        </div>
      </div>

      {/* Preview */}
      {content && (
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <strong style={{ fontSize: '1rem' }}>Preview</strong>
          <div style={{
            background: 'var(--bg-color-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '2rem',
            maxWidth: '500px',
            margin: '0 auto',
            width: '100%'
          }}>
            {title && (
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>{title}</h3>
            )}
            <div className="tiptap" dangerouslySetInnerHTML={{ __html: sanitizeContent(content) }} style={{ fontSize: '0.95rem', lineHeight: 1.6 }} />
          </div>
        </div>
      )}

      <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.75rem', fontSize: '1rem' }}>
        {loading ? 'Saving...' : 'Save Popup Configuration'}
      </button>
    </form>
  )
}
