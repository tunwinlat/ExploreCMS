'use client'

import { useState } from 'react'
import { updateSiteSettings } from './settingsActions'
import { connectBunnyDb, disconnectBunnyDb } from './bunnyActions'
import { THEMES } from '@/lib/themes'

export default function SettingsForm({ initialSettings }: { initialSettings: any }) {
  const [title, setTitle] = useState(initialSettings?.title || 'ExploreCMS')
  const [faviconUrl, setFaviconUrl] = useState(initialSettings?.faviconUrl || '')
  const [headerTitle, setHeaderTitle] = useState(initialSettings?.headerTitle || 'Explore. Create. Inspire.')
  const [headerDescription, setHeaderDescription] = useState(initialSettings?.headerDescription || 'Welcome to my personal corner of the internet. Here I share technical deep-dives and pieces of my life story.')
  const [theme, setTheme] = useState(initialSettings?.theme || 'default')
  
  // Remote DB State
  const [bunnyEnabled, setBunnyEnabled] = useState(initialSettings?.bunnyEnabled || false)
  const [bunnyUrl, setBunnyUrl] = useState(initialSettings?.bunnyUrl || '')
  const [bunnyToken, setBunnyToken] = useState(initialSettings?.bunnyToken || '')
  const [bunnyLoading, setBunnyLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage({ text: '', type: '' })
    
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
      } else {
        setMessage({ text: 'Failed to upload favicon', type: 'error' })
      }
    } catch (error) {
      setMessage({ text: 'An error occurred during upload', type: 'error' })
    }
    setUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })

    // Save standard settings natively
    const res = await updateSiteSettings(title, faviconUrl || null, headerTitle, headerDescription, theme)
    if (res.success) {
      window.location.reload()
    } else {
      setMessage({ text: res.error || 'Failed to update settings', type: 'error' })
    }
    setLoading(false)
  }

  const handleBunnyConnect = async () => {
    if (!bunnyUrl || !bunnyToken) {
      setMessage({ text: 'URL and Token are required to connect.', type: 'error' })
      return
    }

    setBunnyLoading(true)
    setMessage({ text: 'Connecting... This may take up to a minute while migrating all data.', type: 'success' })
    
    const res = await connectBunnyDb(bunnyUrl, bunnyToken)
    if (res.success) {
      setBunnyEnabled(true)
      setMessage({ text: 'Successfully connected and migrated to Bunny DB!', type: 'success' })
    } else {
      setMessage({ text: res.error || 'Failed to connect to Bunny DB', type: 'error' })
    }
    setBunnyLoading(false)
  }

  const handleBunnyDisconnect = async () => {
    setBunnyLoading(true)
    setMessage({ text: 'Disconnecting... Pulling Cloud Data back to Local Storage.', type: 'success' })
    
    const res = await disconnectBunnyDb()
    if (res.success) {
      setBunnyEnabled(false)
      setMessage({ text: 'Successfully disconnected. All data is restored locally.', type: 'success' })
    } else {
      setMessage({ text: res.error || 'Failed to disconnect', type: 'error' })
    }
    setBunnyLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="glass" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {message.text && (
        <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: message.type === 'success' ? '#22c55e' : '#ef4444' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label htmlFor="title" style={{ fontWeight: 500 }}>Global Site Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ExploreCMS"
          required
          suppressHydrationWarning
          style={{ padding: '0.8rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1rem' }}
        />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>This appears in the browser tab and search engines.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginTop: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Landing Page Customization</h3>
        <label htmlFor="headerTitle" style={{ fontWeight: 500, marginTop: '0.5rem' }}>Header Title</label>
        <input
          id="headerTitle"
          type="text"
          value={headerTitle}
          onChange={(e) => setHeaderTitle(e.target.value)}
          placeholder="Explore. Create. Inspire."
          required
          suppressHydrationWarning
          style={{ padding: '0.8rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1rem' }}
        />
        
        <label htmlFor="headerDescription" style={{ fontWeight: 500, marginTop: '0.5rem' }}>Header Description</label>
        <textarea
          id="headerDescription"
          value={headerDescription}
          onChange={(e) => setHeaderDescription(e.target.value)}
          placeholder="Welcome to my personal corner of the internet..."
          rows={3}
          required
          suppressHydrationWarning
          style={{ padding: '0.8rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1rem', resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginTop: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Site Favicon</h3>
        
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
            style={{ padding: '0.8rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1rem', marginTop: '0.5rem' }}
          />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginTop: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>Global Theme Gallery</h3>
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
          <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Bunny Edge Database</h3>
          {bunnyEnabled && (
            <span style={{ background: '#22c55e', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>CONNECTED TO EDGE</span>
          )}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Offloads Post and Analytics querying to a lightning-fast Global Edge network. Local setup handles only Author configurations. Connect to automatically migrate existing posts upwards!
        </p>

        <label htmlFor="bunnyUrl" style={{ fontWeight: 500 }}>LibSQL HTTP URL</label>
        <input
          id="bunnyUrl"
          type="url"
          value={bunnyUrl}
          onChange={(e) => setBunnyUrl(e.target.value)}
          placeholder="libsql://yourapp-id.lite.bunnydb.net"
          disabled={bunnyEnabled || bunnyLoading}
          suppressHydrationWarning
          style={{ padding: '0.8rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1rem', opacity: bunnyEnabled ? 0.6 : 1 }}
        />

        <label htmlFor="bunnyToken" style={{ fontWeight: 500, marginTop: '0.5rem' }}>Auth Token</label>
        <input
          id="bunnyToken"
          type="password"
          value={bunnyToken}
          onChange={(e) => setBunnyToken(e.target.value)}
          placeholder="ey..."
          disabled={bunnyEnabled || bunnyLoading}
          suppressHydrationWarning
          style={{ padding: '0.8rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1rem', opacity: bunnyEnabled ? 0.6 : 1 }}
        />

        <div style={{ marginTop: '1rem' }}>
          {bunnyEnabled ? (
            <button type="button" onClick={handleBunnyDisconnect} disabled={bunnyLoading} className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444' }}>
              {bunnyLoading ? 'Syncing...' : 'Disconnect and Fallback Local'}
            </button>
          ) : (
            <button type="button" onClick={handleBunnyConnect} disabled={bunnyLoading || !bunnyUrl || !bunnyToken} className="btn" style={{ background: 'var(--accent-color)', color: 'white', border: 'none' }}>
              {bunnyLoading ? 'Migrating Data to Edge...' : 'Connect to Bunny DB'}
            </button>
          )}
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '1rem' }}>
        {loading ? 'Saving...' : 'Save Site Settings'}
      </button>
    </form>
  )
}
