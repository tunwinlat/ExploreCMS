/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { updateSiteSettings } from './settingsActions'
import { testTargetConnection, migrateToTarget } from './migrationActions'
import { testStorageConnection, migrateStorage, type StorageType } from './storageActions'
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

  // Database Migration State
  const [targetUrl, setTargetUrl] = useState('')
  const [targetToken, setTargetToken] = useState('')
  const [migrationLoading, setMigrationLoading] = useState(false)
  const [migrationResult, setMigrationResult] = useState<any>(null)

  // Storage Migration State
  const [storageType, setStorageType] = useState<StorageType>('bunny')
  const [currentStorageEnabled, setCurrentStorageEnabled] = useState(initialSettings?.bunnyStorageEnabled || false)
  
  // Bunny Storage config
  const [bunnyRegion, setBunnyRegion] = useState('')
  const [bunnyZoneName, setBunnyZoneName] = useState('')
  const [bunnyApiKey, setBunnyApiKey] = useState('')
  const [bunnyCdnUrl, setBunnyCdnUrl] = useState('')
  
  // S3 Storage config
  const [s3Endpoint, setS3Endpoint] = useState('')
  const [s3AccessKeyId, setS3AccessKeyId] = useState('')
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState('')
  const [s3Bucket, setS3Bucket] = useState('')
  const [s3Region, setS3Region] = useState('us-east-1')
  const [s3CdnUrl, setS3CdnUrl] = useState('')
  
  const [storageLoading, setStorageLoading] = useState(false)
  const [storageResult, setStorageResult] = useState<any>(null)
  const [storageWarning, setStorageWarning] = useState<string | null>(null)

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

  const handleTestStorageConnection = async () => {
    const config = storageType === 'bunny' 
      ? { region: bunnyRegion, zoneName: bunnyZoneName, apiKey: bunnyApiKey, cdnUrl: bunnyCdnUrl }
      : { endpoint: s3Endpoint, accessKeyId: s3AccessKeyId, secretAccessKey: s3SecretAccessKey, bucket: s3Bucket, region: s3Region, cdnUrl: s3CdnUrl }
    
    if (storageType === 'bunny' && (!bunnyZoneName || !bunnyApiKey)) {
      toast('Zone name and API key are required.', 'warning')
      return
    }
    if (storageType === 's3' && (!s3Endpoint || !s3AccessKeyId || !s3SecretAccessKey || !s3Bucket)) {
      toast('All S3 fields are required.', 'warning')
      return
    }

    setStorageLoading(true)
    setStorageWarning(null)
    toast('Testing connection to storage...', 'info')

    try {
      const res = await testStorageConnection(storageType, config)
      if (res.success) {
        toast('Connection successful! Ready to migrate.', 'success')
      } else {
        toast(res.error || 'Connection failed.', 'error')
      }
    } catch (err: any) {
      toast(`Test failed: ${err.message}`, 'error')
    }
    setStorageLoading(false)
  }

  const handleStorageMigrate = async () => {
    const config = storageType === 'bunny' 
      ? { region: bunnyRegion, zoneName: bunnyZoneName, apiKey: bunnyApiKey, cdnUrl: bunnyCdnUrl }
      : { endpoint: s3Endpoint, accessKeyId: s3AccessKeyId, secretAccessKey: s3SecretAccessKey, bucket: s3Bucket, region: s3Region, cdnUrl: s3CdnUrl }
    
    if (storageType === 'bunny' && (!bunnyZoneName || !bunnyApiKey || !bunnyCdnUrl)) {
      toast('Zone name, API key, and CDN URL are required.', 'warning')
      return
    }
    if (storageType === 's3' && (!s3Endpoint || !s3AccessKeyId || !s3SecretAccessKey || !s3Bucket)) {
      toast('All S3 fields are required.', 'warning')
      return
    }

    setStorageLoading(true)
    setStorageResult(null)
    setStorageWarning(null)
    toast('Starting storage migration... This may take a moment.', 'info')

    try {
      const res = await migrateStorage(storageType, config, { updatePostUrls: true })
      if (res.success) {
        setStorageResult(res.stats)
        setCurrentStorageEnabled(true)
        if (res.stats?.warnings && res.stats.warnings.length > 0) {
          setStorageWarning(res.stats.warnings[0])
        }
        toast(`Migration complete! Migrated ${res.stats?.filesMigrated || 0} files.`, 'success')
      } else {
        toast(res.error || 'Migration failed.', 'error')
      }
    } catch (err: any) {
      toast(`Migration failed: ${err.message}`, 'error')
    }
    setStorageLoading(false)
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

      <ExpandableSection title="Theme" icon="🎭">
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
        </div>
      </ExpandableSection>

      <ExpandableSection 
        title="Database Migration" 
        icon="🗄️"
        badge={targetUrl ? <span style={{ fontSize: '0.7rem', background: 'var(--accent-color)', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>configured</span> : undefined}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Migrate your data to another LibSQL-compatible database. Useful for backups or switching providers.
          </p>

          <div>
            <label htmlFor="targetUrl" style={{ fontWeight: 400 }}>Target Database URL</label>
            <input
              id="targetUrl"
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="libsql://your-db.lite.bunnydb.net or libsql://your-db.turso.io"
              disabled={migrationLoading}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="targetToken" style={{ fontWeight: 400 }}>Auth Token (Optional)</label>
            <input
              id="targetToken"
              type="password"
              value={targetToken}
              onChange={(e) => setTargetToken(e.target.value)}
              placeholder="ey... (required for most hosted databases)"
              disabled={migrationLoading}
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
      </ExpandableSection>

      <ExpandableSection 
        title="Storage Configuration" 
        icon="☁️"
        badge={currentStorageEnabled ? <span style={{ fontSize: '0.7rem', background: '#22c55e', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>active</span> : undefined}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {!currentStorageEnabled && (
            <div style={{ 
              padding: '0.75rem', 
              background: 'rgba(234, 179, 8, 0.1)', 
              borderRadius: 'var(--radius-md)',
            }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#eab308' }}>
                You are using local storage. <strong>Not recommended for production</strong> - files may not persist on serverless platforms like Vercel.
              </p>
            </div>
          )}

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Store images on an external CDN. Supports Bunny Storage and S3-compatible services (AWS S3, Cloudflare R2, MinIO, etc.).
          </p>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setStorageType('bunny')}
              disabled={storageLoading}
              className="btn"
              style={{ 
                flex: 1,
                background: storageType === 'bunny' ? 'var(--accent-color)' : 'var(--bg-color)',
                color: storageType === 'bunny' ? 'white' : 'var(--text-primary)',
                border: `1px solid ${storageType === 'bunny' ? 'var(--accent-color)' : 'var(--border-color)'}`
              }}
            >
              🐰 Bunny
            </button>
            <button
              type="button"
              onClick={() => setStorageType('s3')}
              disabled={storageLoading}
              className="btn"
              style={{ 
                flex: 1,
                background: storageType === 's3' ? 'var(--accent-color)' : 'var(--bg-color)',
                color: storageType === 's3' ? 'white' : 'var(--text-primary)',
                border: `1px solid ${storageType === 's3' ? 'var(--accent-color)' : 'var(--border-color)'}`
              }}
            >
              ☁️ S3
            </button>
          </div>

          {storageType === 'bunny' ? (
            <>
              <div>
                <label style={{ fontWeight: 400 }}>Region (Optional)</label>
                <select
                  value={bunnyRegion}
                  onChange={(e) => setBunnyRegion(e.target.value)}
                  disabled={storageLoading}
                  className="input-field"
                >
                  <option value="">Auto (Falkenstein)</option>
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
              </div>

              <div>
                <label style={{ fontWeight: 400 }}>Zone Name *</label>
                <input
                  type="text"
                  value={bunnyZoneName}
                  onChange={(e) => setBunnyZoneName(e.target.value)}
                  placeholder="my-storage-zone"
                  disabled={storageLoading}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontWeight: 400 }}>API Key *</label>
                <input
                  type="password"
                  value={bunnyApiKey}
                  onChange={(e) => setBunnyApiKey(e.target.value)}
                  placeholder="your-api-key"
                  disabled={storageLoading}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontWeight: 400 }}>CDN URL *</label>
                <input
                  type="url"
                  value={bunnyCdnUrl}
                  onChange={(e) => setBunnyCdnUrl(e.target.value)}
                  placeholder="https://my-zone.b-cdn.net"
                  disabled={storageLoading}
                  className="input-field"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={{ fontWeight: 400 }}>S3 Endpoint *</label>
                <input
                  type="url"
                  value={s3Endpoint}
                  onChange={(e) => setS3Endpoint(e.target.value)}
                  placeholder="https://s3.amazonaws.com or https://<account>.r2.cloudflarestorage.com"
                  disabled={storageLoading}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontWeight: 400 }}>Access Key ID *</label>
                <input
                  type="text"
                  value={s3AccessKeyId}
                  onChange={(e) => setS3AccessKeyId(e.target.value)}
                  placeholder="AKIA..."
                  disabled={storageLoading}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontWeight: 400 }}>Secret Access Key *</label>
                <input
                  type="password"
                  value={s3SecretAccessKey}
                  onChange={(e) => setS3SecretAccessKey(e.target.value)}
                  placeholder="..."
                  disabled={storageLoading}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontWeight: 400 }}>Bucket Name *</label>
                <input
                  type="text"
                  value={s3Bucket}
                  onChange={(e) => setS3Bucket(e.target.value)}
                  placeholder="my-bucket"
                  disabled={storageLoading}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontWeight: 400 }}>Region</label>
                <input
                  type="text"
                  value={s3Region}
                  onChange={(e) => setS3Region(e.target.value)}
                  placeholder="us-east-1"
                  disabled={storageLoading}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontWeight: 400 }}>CDN URL (Optional)</label>
                <input
                  type="url"
                  value={s3CdnUrl}
                  onChange={(e) => setS3CdnUrl(e.target.value)}
                  placeholder="https://cdn.example.com"
                  disabled={storageLoading}
                  className="input-field"
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              onClick={handleTestStorageConnection} 
              disabled={storageLoading} 
              className="btn" 
              style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
            >
              {storageLoading ? 'Testing...' : 'Test Connection'}
            </button>
            <button 
              type="button" 
              onClick={handleStorageMigrate} 
              disabled={storageLoading} 
              className="btn" 
              style={{ background: '#22c55e', color: 'white', border: 'none' }}
            >
              {storageLoading ? 'Migrating...' : 'Migrate Files'}
            </button>
          </div>

          {storageWarning && (
            <div style={{ 
              padding: '0.75rem', 
              background: 'rgba(234, 179, 8, 0.1)', 
              borderRadius: 'var(--radius-md)',
            }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#eab308' }}>
                ⚠️ {storageWarning}
              </p>
            </div>
          )}

          {storageResult && (
            <div style={{ 
              padding: '1rem', 
              background: 'rgba(34, 197, 94, 0.1)', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid #22c55e'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#22c55e' }}>✓ Migration Complete</h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <li>{storageResult.filesMigrated} files migrated</li>
                <li>{storageResult.postsUpdated} posts updated</li>
                {storageResult.errors.length > 0 && (
                  <li style={{ color: '#ef4444' }}>{storageResult.errors.length} errors</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </ExpandableSection>

      <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '0.75rem', fontSize: '1rem' }}>
        {loading ? 'Saving...' : 'Save All Settings'}
      </button>
    </form>
  )
}
