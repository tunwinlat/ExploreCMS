/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { updateSiteSettings } from './settingsActions'
import { connectBunnyStorage, disconnectBunnyStorage } from './storageActions'
import { testTargetConnection, migrateToTarget } from './migrationActions'
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

  // Database Migration State
  const [targetUrl, setTargetUrl] = useState('')
  const [targetToken, setTargetToken] = useState('')
  const [migrationLoading, setMigrationLoading] = useState(false)
  const [migrationResult, setMigrationResult] = useState<any>(null)

  // Bunny Storage State
  const [bunnyStorageEnabled, setBunnyStorageEnabled] = useState(initialSettings?.bunnyStorageEnabled || false)
  const [bunnyStorageRegion, setBunnyStorageRegion] = useState(initialSettings?.bunnyStorageRegion || '')
  const [bunnyStorageZoneName, setBunnyStorageZoneName] = useState(initialSettings?.bunnyStorageZoneName || '')
  const [bunnyStorageApiKey, setBunnyStorageApiKey] = useState(initialSettings?.bunnyStorageApiKey || '')
  const [bunnyStorageUrl, setBunnyStorageUrl] = useState(initialSettings?.bunnyStorageUrl || '')
  const [bunnyStorageLoading, setBunnyStorageLoading] = useState(false)
  const [showStorageDisconnectDialog, setShowStorageDisconnectDialog] = useState(false)

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

  const handleTestTargetConnection = async () => {
    if (!targetUrl) {
      toast('Target database URL is required.', 'warning')
      return
    }

    setMigrationLoading(true)
    toast('Testing connection to target database...', 'info')

    const res = await testTargetConnection(targetUrl, targetToken || undefined)
    if (res.success) {
      toast(res.message || 'Connection successful!', 'success')
    } else {
      toast(res.error || 'Connection failed.', 'error')
    }
    setMigrationLoading(false)
  }

  const handleMigrate = async () => {
    if (!targetUrl) {
      toast('Target database URL is required.', 'warning')
      return
    }

    setMigrationLoading(true)
    setMigrationResult(null)
    toast('Starting migration... This may take a moment.', 'info')

    const res = await migrateToTarget(targetUrl, targetToken || undefined)
    if (res.success) {
      setMigrationResult(res.stats)
      toast(`Migration complete! Migrated ${res.stats?.posts || 0} posts, ${res.stats?.users || 0} users.`, 'success')
    } else {
      toast(res.error || 'Migration failed.', 'error')
    }
    setMigrationLoading(false)
  }

  const handleBunnyStorageConnect = async () => {
    if (!bunnyStorageZoneName || !bunnyStorageApiKey || !bunnyStorageUrl) {
      toast('Zone name, API key, and CDN URL are required.', 'warning')
      return
    }

    setBunnyStorageLoading(true)
    toast('Connecting to Bunny Storage... This may take a moment.', 'info')

    try {
      const res = await connectBunnyStorage(
        bunnyStorageRegion,
        bunnyStorageZoneName,
        bunnyStorageApiKey,
        bunnyStorageUrl
      )
      if (res.success) {
        setBunnyStorageEnabled(true)
        if (res.errors && res.errors.length > 0) {
          toast(`Connected with ${res.migratedCount} images migrated. ${res.errors.length} errors - check console.`, 'warning')
          console.error('Migration errors:', res.errors)
        } else {
          toast(`Successfully connected! Migrated ${res.migratedCount} images to Bunny Storage.`, 'success')
        }
      } else {
        toast(res.error || 'Failed to connect to Bunny Storage.', 'error')
      }
    } catch (err: any) {
      toast(`Connection failed: ${err.message}`, 'error')
    }
    setBunnyStorageLoading(false)
  }

  const handleBunnyStorageDisconnect = async () => {
    setShowStorageDisconnectDialog(false)
    setBunnyStorageLoading(true)
    toast('Disconnecting... This may take a moment.', 'info')

    try {
      const res = await disconnectBunnyStorage()
      console.log('Disconnect result:', res)
      if (res.success) {
        setBunnyStorageEnabled(false)
        toast(`Successfully disconnected${res.migratedCount && res.migratedCount > 0 ? `. Downloaded ${res.migratedCount} images` : ''}.`, 'success')
      } else {
        toast(res.error || 'Failed to disconnect.', 'error')
      }
    } catch (err: any) {
      console.error('Disconnect error:', err)
      toast(`Disconnect failed: ${err.message}`, 'error')
    }
    setBunnyStorageLoading(false)
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-color-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 500, margin: 0 }}>Database Migration</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Migrate your data to another LibSQL-compatible database. Useful for backups or preparing to switch databases. 
            After migration, update your <code>DATABASE_URL</code> environment variable and redeploy to use the new database.
          </p>

          <label htmlFor="targetUrl" style={{ fontWeight: 400 }}>Target Database URL</label>
          <input
            id="targetUrl"
            type="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="libsql://your-db.lite.bunnydb.net or libsql://your-db.turso.io"
            disabled={migrationLoading}
            suppressHydrationWarning
            className="input-field"
          />

          <label htmlFor="targetToken" style={{ fontWeight: 400, marginTop: '0.5rem' }}>Auth Token (Optional)</label>
          <input
            id="targetToken"
            type="password"
            value={targetToken}
            onChange={(e) => setTargetToken(e.target.value)}
            placeholder="ey... (required for most hosted databases)"
            disabled={migrationLoading}
            suppressHydrationWarning
            className="input-field"
          />

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              onClick={handleTestTargetConnection} 
              disabled={migrationLoading || !targetUrl} 
              className="btn" 
              style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
            >
              {migrationLoading ? 'Testing...' : 'Test Connection'}
            </button>
            <button 
              type="button" 
              onClick={handleMigrate} 
              disabled={migrationLoading || !targetUrl} 
              className="btn" 
              style={{ background: 'var(--accent-color)', color: 'white', border: 'none' }}
            >
              {migrationLoading ? 'Migrating...' : 'Migrate Data'}
            </button>
          </div>

          {migrationResult && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              background: 'rgba(34, 197, 94, 0.1)', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid #22c55e'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#22c55e' }}>✓ Migration Complete</h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <li>{migrationResult.users} users</li>
                <li>{migrationResult.posts} posts</li>
                <li>{migrationResult.tags} tags</li>
                <li>{migrationResult.postViews} post view records</li>
                {migrationResult.siteSettings && <li>Site settings</li>}
                {migrationResult.popupConfig && <li>Popup configuration</li>}
                {migrationResult.siteAnalytics && <li>Site analytics</li>}
              </ul>
              <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                To use this database, update your <code>DATABASE_URL</code> environment variable and redeploy.
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-color-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: bunnyStorageEnabled ? '2px solid #22c55e' : '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 500, margin: 0 }}>Bunny Storage (CDN)</h3>
            {bunnyStorageEnabled && (
              <span style={{ fontSize: '0.75rem', background: '#22c55e', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontWeight: 500 }}>STORAGE CONNECTED</span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Stores all images and assets on Bunny's global CDN. When connecting, all existing local images are migrated to storage and post URLs are automatically updated. New uploads go directly to Bunny Storage.
          </p>

          <label htmlFor="bunnyStorageRegion" style={{ fontWeight: 400 }}>Storage Region (Optional)</label>
          <select
            id="bunnyStorageRegion"
            value={bunnyStorageRegion}
            onChange={(e) => setBunnyStorageRegion(e.target.value)}
            disabled={bunnyStorageEnabled || bunnyStorageLoading}
            className="input-field"
            style={{ opacity: bunnyStorageEnabled ? 0.6 : 1 }}
          >
            <option value="">Auto (Default - Falkenstein)</option>
            <option value="fsn1">Falkenstein (fsn1)</option>
            <option value="de">Frankfurt (de)</option>
            <option value="uk">London (uk)</option>
            <option value="se">Stockholm (se)</option>
            <option value="ny">New York (ny)</option>
            <option value="la">Los Angeles (la)</option>
            <option value="sg">Singapore (sg)</option>
            <option value="syd">Sydney (syd)</option>
            <option value="br">Sao Paulo (br)</option>
            <option value="jh">Johannesburg (jh)</option>
          </select>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Only select a region if you created a region-specific storage zone. Most users should leave this as "Auto".
          </p>

          <label htmlFor="bunnyStorageZoneName" style={{ fontWeight: 400, marginTop: '0.5rem' }}>Storage Zone Name</label>
          <input
            id="bunnyStorageZoneName"
            type="text"
            value={bunnyStorageZoneName}
            onChange={(e) => setBunnyStorageZoneName(e.target.value)}
            placeholder="my-storage-zone"
            disabled={bunnyStorageEnabled || bunnyStorageLoading}
            suppressHydrationWarning
            className="input-field"
            style={{ opacity: bunnyStorageEnabled ? 0.6 : 1 }}
          />

          <label htmlFor="bunnyStorageApiKey" style={{ fontWeight: 400, marginTop: '0.5rem' }}>Storage API Key</label>
          <input
            id="bunnyStorageApiKey"
            type="password"
            value={bunnyStorageApiKey}
            onChange={(e) => setBunnyStorageApiKey(e.target.value)}
            placeholder="your-storage-api-key"
            disabled={bunnyStorageEnabled || bunnyStorageLoading}
            suppressHydrationWarning
            className="input-field"
            style={{ opacity: bunnyStorageEnabled ? 0.6 : 1 }}
          />

          <label htmlFor="bunnyStorageUrl" style={{ fontWeight: 400, marginTop: '0.5rem' }}>CDN URL</label>
          <input
            id="bunnyStorageUrl"
            type="url"
            value={bunnyStorageUrl}
            onChange={(e) => setBunnyStorageUrl(e.target.value)}
            placeholder="https://my-zone.b-cdn.net"
            disabled={bunnyStorageEnabled || bunnyStorageLoading}
            suppressHydrationWarning
            className="input-field"
            style={{ opacity: bunnyStorageEnabled ? 0.6 : 1 }}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Your Bunny CDN pull zone URL (e.g., https://my-zone.b-cdn.net)
          </p>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {!bunnyStorageEnabled && (
              <button 
                type="button" 
                onClick={async () => {
                  setBunnyStorageLoading(true)
                  try {
                    const res = await fetch('/api/test-bunny-storage', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        region: bunnyStorageRegion,
                        storageZoneName: bunnyStorageZoneName,
                        apiKey: bunnyStorageApiKey,
                        cdnUrl: bunnyStorageUrl
                      })
                    })
                    const data = await res.json()
                    if (data.success) {
                      toast(`Connection test successful! Found ${data.fileCount} files in storage. Endpoint: ${data.baseUrl}`, 'success')
                    } else {
                      toast(`Connection failed: ${data.error}`, 'error')
                    }
                  } catch (err: any) {
                    toast(`Test failed: ${err.message}`, 'error')
                  }
                  setBunnyStorageLoading(false)
                }} 
                disabled={bunnyStorageLoading || !bunnyStorageZoneName || !bunnyStorageApiKey} 
                className="btn" 
                style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
              >
                Test Connection
              </button>
            )}
            {bunnyStorageEnabled ? (
              <button type="button" onClick={() => setShowStorageDisconnectDialog(true)} disabled={bunnyStorageLoading} className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444' }}>
                {bunnyStorageLoading ? 'Downloading...' : 'Disconnect and Download to Local'}
              </button>
            ) : (
              <button type="button" onClick={handleBunnyStorageConnect} disabled={bunnyStorageLoading || !bunnyStorageZoneName || !bunnyStorageApiKey || !bunnyStorageUrl} className="btn" style={{ background: '#22c55e', color: 'white', border: 'none' }}>
                {bunnyStorageLoading ? 'Connecting & Migrating...' : 'Connect to Bunny Storage'}
              </button>
            )}
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.75rem', fontSize: '1rem' }}>
          {loading ? 'Saving...' : 'Save Site Settings'}
        </button>
      </form>

      <ConfirmDialog
        open={showStorageDisconnectDialog}
        title="Disconnect from Bunny Storage?"
        message="This will download all images from Bunny Storage back to your local server and update post URLs. This ensures your images work if you switch to a new instance."
        confirmLabel="Download & Disconnect"
        cancelLabel="Keep Using Storage"
        variant="warning"
        loading={bunnyStorageLoading}
        onConfirm={handleBunnyStorageDisconnect}
        onCancel={() => setShowStorageDisconnectDialog(false)}
      />
    </>
  )
}
