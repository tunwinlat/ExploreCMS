/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { updateSiteSettings } from './settingsActions'
import { connectBunnyDb, disconnectBunnyDb } from './bunnyActions'
import { THEMES } from '@/lib/themes'
import { useToast } from '@/components/admin/Toast'
import ConfirmDialog from '@/components/admin/ConfirmDialog'

export default function SettingsForm({ initialSettings }: { initialSettings: any }) {
  const [title, setTitle] = useState(initialSettings?.title || 'ExploreCMS')
  const [faviconUrl, setFaviconUrl] = useState(initialSettings?.faviconUrl || '')
  const [headerTitle, setHeaderTitle] = useState(initialSettings?.headerTitle || 'Explore. Create. Inspire.')
  const [headerDescription, setHeaderDescription] = useState(initialSettings?.headerDescription || 'Welcome to my personal corner of the internet. Here I share technical deep-dives and pieces of my life story.')
  const [theme, setTheme] = useState(initialSettings?.theme || 'default')
  const [footerText, setFooterText] = useState(initialSettings?.footerText || '')
  const [sidebarAbout, setSidebarAbout] = useState(initialSettings?.sidebarAbout || 'Discover articles on technology, creativity, and personal growth. Use the search or browse by tags to find what interests you.')

  // Remote DB State
  const [bunnyEnabled, setBunnyEnabled] = useState(initialSettings?.bunnyEnabled || false)
  const [bunnyUrl, setBunnyUrl] = useState(initialSettings?.bunnyUrl || '')
  const [bunnyToken, setBunnyToken] = useState(initialSettings?.bunnyToken || '')
  const [bunnyLoading, setBunnyLoading] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)

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

    const res = await updateSiteSettings(title, faviconUrl || null, headerTitle, headerDescription, theme, footerText, sidebarAbout)
    if (res.success) {
      toast('Site settings saved! Reloading...', 'success')
      setTimeout(() => window.location.reload(), 1000)
    } else {
      toast(res.error || 'Failed to update settings.', 'error')
    }
    setLoading(false)
  }

  const handleBunnyConnect = async () => {
    if (!bunnyUrl || !bunnyToken) {
      toast('URL and Token are required to connect.', 'warning')
      return
    }

    setBunnyLoading(true)
    toast('Connecting to Bunny DB... This may take a moment.', 'info')

    const res = await connectBunnyDb(bunnyUrl, bunnyToken)
    if (res.success) {
      setBunnyEnabled(true)
      toast('Successfully connected and migrated to Bunny DB!', 'success')
    } else {
      toast(res.error || 'Failed to connect to Bunny DB.', 'error')
    }
    setBunnyLoading(false)
  }

  const handleBunnyDisconnect = async () => {
    setShowDisconnectDialog(false)
    setBunnyLoading(true)
    toast('Disconnecting... Pulling data back to local storage.', 'info')

    const res = await disconnectBunnyDb()
    if (res.success) {
      setBunnyEnabled(false)
      toast('Successfully disconnected. All data is restored locally.', 'success')
    } else {
      toast(res.error || 'Failed to disconnect.', 'error')
    }
    setBunnyLoading(false)
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="glass" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="title" style={{ fontWeight: 400 }}>Global Site Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ExploreCMS"
            required
            suppressHydrationWarning
            className="input-field"
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>This appears in the browser tab and search engines.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 500, marginTop: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Landing Page Customization</h3>
          <label htmlFor="headerTitle" style={{ fontWeight: 400, marginTop: '0.5rem' }}>Header Title</label>
          <input
            id="headerTitle"
            type="text"
            value={headerTitle}
            onChange={(e) => setHeaderTitle(e.target.value)}
            placeholder="Explore. Create. Inspire."
            required
            suppressHydrationWarning
            className="input-field"
          />

          <label htmlFor="headerDescription" style={{ fontWeight: 400, marginTop: '0.5rem' }}>Header Description</label>
          <textarea
            id="headerDescription"
            value={headerDescription}
            onChange={(e) => setHeaderDescription(e.target.value)}
            placeholder="Welcome to my personal corner of the internet..."
            rows={3}
            required
            suppressHydrationWarning
            className="input-field"
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 500, marginTop: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Sidebar About Section</h3>
          <label htmlFor="sidebarAbout" style={{ fontWeight: 400, marginTop: '0.5rem' }}>About Text</label>
          <textarea
            id="sidebarAbout"
            value={sidebarAbout}
            onChange={(e) => setSidebarAbout(e.target.value)}
            placeholder="Discover articles on technology, creativity, and personal growth..."
            rows={4}
            suppressHydrationWarning
            className="input-field"
            style={{ resize: 'vertical' }}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>This text appears in the "About" card in the right sidebar on the home page.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 500, marginTop: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Footer</h3>
          <label htmlFor="footerText" style={{ fontWeight: 400, marginTop: '0.5rem' }}>Footer Text</label>
          <input
            id="footerText"
            type="text"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder={`${title || 'ExploreCMS'}. All rights reserved.`}
            suppressHydrationWarning
            className="input-field"
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Everything after "© {new Date().getFullYear()}". Leave blank to default to your site title + "All rights reserved."</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 500, marginTop: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Site Favicon</h3>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
            {faviconUrl && (
              <img src={faviconUrl} alt="Favicon Preview" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px', background: 'var(--bg-color)', padding: '4px' }} />
            )}

            <div style={{ flex: 1 }}>
              <input
                type="file"
                accept="image/png, image/jpeg, image/x-icon, image/svg+xml"
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
                {uploading ? 'Uploading...' : 'Upload Favicon Image'}
              </label>
            </div>
          </div>
          <input
            type="text"
            value={faviconUrl}
            onChange={(e) => setFaviconUrl(e.target.value)}
            placeholder="/favicon.ico or uploaded URL"
            suppressHydrationWarning
            className="input-field"
            style={{ marginTop: '0.5rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 500, marginTop: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Global Theme Gallery</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Select the core aesthetic of your entire platform. Each theme fundamentally changes fonts, background layers, accents, and roundness. All themes support dynamic Light/Dark swapping!
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '1rem',
            maxHeight: '400px',
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
                  padding: '1rem',
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
                  fontFamily: t.fontFamily || 'unset'
                }}
              >
                <strong>{t.name}</strong>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-color-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: bunnyEnabled ? '2px solid var(--accent-color)' : '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 500, margin: 0 }}>Bunny Edge Database</h3>
            {bunnyEnabled && (
              <span className="status-badge status-badge--published" style={{ fontSize: '0.75rem' }}>CONNECTED TO EDGE</span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Offloads Post and Analytics querying to a lightning-fast Global Edge network. Local setup handles only Author configurations. Connect to automatically migrate existing posts upwards!
          </p>

          <label htmlFor="bunnyUrl" style={{ fontWeight: 400 }}>LibSQL HTTP URL</label>
          <input
            id="bunnyUrl"
            type="url"
            value={bunnyUrl}
            onChange={(e) => setBunnyUrl(e.target.value)}
            placeholder="libsql://yourapp-id.lite.bunnydb.net"
            disabled={bunnyEnabled || bunnyLoading}
            suppressHydrationWarning
            className="input-field"
            style={{ opacity: bunnyEnabled ? 0.6 : 1 }}
          />

          <label htmlFor="bunnyToken" style={{ fontWeight: 400, marginTop: '0.5rem' }}>Auth Token</label>
          <input
            id="bunnyToken"
            type="password"
            value={bunnyToken}
            onChange={(e) => setBunnyToken(e.target.value)}
            placeholder="ey..."
            disabled={bunnyEnabled || bunnyLoading}
            suppressHydrationWarning
            className="input-field"
            style={{ opacity: bunnyEnabled ? 0.6 : 1 }}
          />

          <div style={{ marginTop: '1rem' }}>
            {bunnyEnabled ? (
              <button type="button" onClick={() => setShowDisconnectDialog(true)} disabled={bunnyLoading} className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444' }}>
                {bunnyLoading ? 'Syncing...' : 'Disconnect and Fallback Local'}
              </button>
            ) : (
              <button type="button" onClick={handleBunnyConnect} disabled={bunnyLoading || !bunnyUrl || !bunnyToken} className="btn" style={{ background: 'var(--accent-color)', color: 'white', border: 'none' }}>
                {bunnyLoading ? 'Migrating Data to Edge...' : 'Connect to Bunny DB'}
              </button>
            )}
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.75rem', fontSize: '1rem' }}>
          {loading ? 'Saving...' : 'Save Site Settings'}
        </button>
      </form>

      <ConfirmDialog
        open={showDisconnectDialog}
        title="Disconnect from Bunny DB?"
        message="This will pull all remote data back to your local database and stop using the edge network. Your data will remain safe during the migration."
        confirmLabel="Disconnect"
        cancelLabel="Stay Connected"
        variant="warning"
        loading={bunnyLoading}
        onConfirm={handleBunnyDisconnect}
        onCancel={() => setShowDisconnectDialog(false)}
      />
    </>
  )
}
