/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { updateSiteSettings } from './settingsActions'
import { THEMES } from '@/lib/themes'
import { useToast } from '@/components/admin/Toast'

// Expandable Section Component
function ExpandableSection({ 
  title, 
  children, 
  defaultExpanded = false,
  badge,
  icon
}: { 
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  badge?: React.ReactNode
  icon?: string
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  
  return (
    <div style={{ 
      background: 'var(--bg-color-secondary)', 
      borderRadius: 'var(--radius-md)', 
      border: '1px solid var(--border-color)',
      overflow: 'hidden'
    }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          fontSize: '1rem',
          fontWeight: 500,
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {icon && <span style={{ fontSize: '1.25rem' }}>{icon}</span>}
          <span>{title}</span>
          {badge && <span style={{ marginLeft: '0.5rem' }}>{badge}</span>}
        </div>
        <span style={{ 
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          fontSize: '0.875rem'
        }}>
          ▼
        </span>
      </button>
      
      {expanded && (
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function SettingsForm({ initialSettings }: { initialSettings: any }) {
  const [title, setTitle] = useState(initialSettings?.title || 'ExploreCMS')
  const [faviconUrl, setFaviconUrl] = useState(initialSettings?.faviconUrl || '')
  const [headerTitle, setHeaderTitle] = useState(initialSettings?.headerTitle || 'Explore. Create. Inspire.')
  const [headerDescription, setHeaderDescription] = useState(initialSettings?.headerDescription || 'Welcome to my personal corner of the internet. Here I share technical deep-dives and pieces of my life story.')
  const [theme, setTheme] = useState(initialSettings?.theme || 'default')
  const [footerText, setFooterText] = useState(initialSettings?.footerText || '')
  const [sidebarAbout, setSidebarAbout] = useState(initialSettings?.sidebarAbout || 'Discover articles on technology, creativity, and personal growth. Use the search or browse by tags to find what interests you.')
  const [dynamicPattern, setDynamicPattern] = useState(initialSettings?.dynamicPattern ?? true)

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        setFaviconUrl(data.url)
        toast('Favicon uploaded.', 'success')
      } else {
        toast('Failed to upload favicon.', 'error')
      }
    } catch {
      toast('An error occurred during upload.', 'error')
    }
    setUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast('Site title is required.', 'warning')
      return
    }
    setLoading(true)

    const res = await updateSiteSettings(title, faviconUrl || null, headerTitle, headerDescription, theme, footerText, sidebarAbout, dynamicPattern)
    if (res.success) {
      toast('Site settings saved! Reloading...', 'success')
      setTimeout(() => window.location.reload(), 1000)
    } else {
      toast(res.error || 'Failed to update settings.', 'error')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      <ExpandableSection title="Basic Information" icon="📝" defaultExpanded={true}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label htmlFor="title" style={{ fontWeight: 400 }}>Global Site Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ExploreCMS"
              required
              className="input-field"
            />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              This appears in the browser tab and search engines.
            </p>
          </div>

          <div>
            <label htmlFor="footerText" style={{ fontWeight: 400 }}>Footer Text</label>
            <input
              id="footerText"
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder={`${title || 'ExploreCMS'}. All rights reserved.`}
              className="input-field"
            />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Everything after "© {new Date().getFullYear()}". Leave blank to use site title.
            </p>
          </div>
        </div>
      </ExpandableSection>

      <ExpandableSection title="Landing Page" icon="🏠">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label htmlFor="headerTitle" style={{ fontWeight: 400 }}>Header Title</label>
            <input
              id="headerTitle"
              type="text"
              value={headerTitle}
              onChange={(e) => setHeaderTitle(e.target.value)}
              placeholder="Explore. Create. Inspire."
              required
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="headerDescription" style={{ fontWeight: 400 }}>Header Description</label>
            <textarea
              id="headerDescription"
              value={headerDescription}
              onChange={(e) => setHeaderDescription(e.target.value)}
              placeholder="Welcome to my personal corner of the internet..."
              rows={3}
              required
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
      </ExpandableSection>

      <ExpandableSection title="Sidebar" icon="📰">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <label htmlFor="sidebarAbout" style={{ fontWeight: 400 }}>About Text</label>
          <textarea
            id="sidebarAbout"
            value={sidebarAbout}
            onChange={(e) => setSidebarAbout(e.target.value)}
            placeholder="Discover articles on technology, creativity, and personal growth..."
            rows={4}
            className="input-field"
            style={{ resize: 'vertical' }}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            This text appears in the "About" card in the right sidebar on the home page.
          </p>
        </div>
      </ExpandableSection>

      <ExpandableSection title="Branding" icon="🎨">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <label style={{ fontWeight: 400 }}>Site Favicon</label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
            {faviconUrl && (
              <img src={faviconUrl} alt="Favicon Preview" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px', background: 'var(--bg-color)', padding: '4px' }} />
            )}

            <div style={{ flex: 1 }}>
              <input
                type="file"
                accept="image/png, image/jpeg, image/x-icon"
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: 'none' }}
                id="favicon-upload"
              />
              <label
                htmlFor="favicon-upload"
                className="btn"
                style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'inline-block', fontSize: '0.9rem', padding: '0.5rem 1rem' }}
              >
                {uploading ? 'Uploading...' : 'Upload Favicon'}
              </label>
            </div>
          </div>
          <input
            type="text"
            value={faviconUrl}
            onChange={(e) => setFaviconUrl(e.target.value)}
            placeholder="/favicon.ico or URL"
            className="input-field"
            style={{ marginTop: '0.5rem' }}
          />
        </div>
      </ExpandableSection>

      <ExpandableSection title="Theme & Background" icon="🎭">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            Select the core aesthetic of your entire platform. Each theme changes fonts, colors, accents, and roundness.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '0.75rem',
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '0.5rem',
            background: 'var(--bg-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)'
          }}>
            {THEMES.map(t => (
              <div
                key={t.id}
                onClick={() => {
                  setTheme(t.id)
                  document.documentElement.setAttribute('data-theme', t.id)
                }}
                role="radio"
                aria-checked={theme === t.id}
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setTheme(t.id)
                    document.documentElement.setAttribute('data-theme', t.id)
                  }
                }}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: theme === t.id ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                  background: 'var(--bg-color-secondary)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  transform: theme === t.id ? 'scale(0.98)' : 'scale(1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontFamily: t.fontFamily || 'unset',
                  fontSize: '0.9rem'
                }}
              >
                <strong>{t.name}</strong>
              </div>
            ))}
          </div>
          
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>Dynamic Particle Background</label>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Particles react to your cursor like antigravity. When idle, they drift randomly like stardust.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDynamicPattern(!dynamicPattern)}
                style={{
                  position: 'relative',
                  width: '52px',
                  height: '28px',
                  borderRadius: '14px',
                  border: 'none',
                  background: dynamicPattern ? 'var(--accent-color)' : 'var(--border-color)',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)',
                  flexShrink: 0
                }}
                aria-checked={dynamicPattern}
                role="switch"
              >
                <span style={{
                  position: 'absolute',
                  top: '3px',
                  left: dynamicPattern ? '27px' : '3px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'white',
                  transition: 'left var(--transition-fast)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>
          </div>
        </div>
      </ExpandableSection>

      <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '0.75rem', fontSize: '1rem' }}>
        {loading ? 'Saving...' : 'Save All Settings'}
      </button>
    </form>
  )
}
