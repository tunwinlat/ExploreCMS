/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { saveCraftSettings, updateCraftWriteAccess } from './craftActions'
import { testTargetConnection, migrateToTarget } from '../settings/migrationActions'
import { testStorageConnection, migrateStorage, saveStorageSettings, type StorageType } from '../settings/storageActions'
import { saveEmailSettings, testEmailSettings, getEmailSettings } from './emailActions'
import { useToast } from '@/components/admin/Toast'
import EncryptionMigration from './EncryptionMigration'

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

interface CraftFolder {
  id: string
  name: string
  documentCount: number
  folders: CraftFolder[]
}

function flattenFolders(folders: CraftFolder[], prefix = ''): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = []
  for (const f of folders) {
    if (f.id === 'trash' || f.id === 'templates') continue
    const label = prefix ? `${prefix} / ${f.name}` : f.name
    result.push({ id: f.id, label: `${label} (${f.documentCount} docs)` })
    if (f.folders?.length) {
      result.push(...flattenFolders(f.folders, label))
    }
  }
  return result
}

export default function IntegrationsForm({ initialSettings }: { initialSettings: any }) {
  const { toast } = useToast()

  // ── Craft State ──
  const [craftServerUrl, setCraftServerUrl] = useState(initialSettings?.craftServerUrl || '')
  // API token is encrypted in DB - never load it client-side, always start empty
  // Users must re-enter when modifying (placeholder shows if already configured)
  const hasExistingToken = !!initialSettings?.craftApiToken
  const [craftApiToken, setCraftApiToken] = useState('')
  const [craftFolderId, setCraftFolderId] = useState(initialSettings?.craftFolderId || '')
  const [craftFolderName, setCraftFolderName] = useState(initialSettings?.craftFolderName || '')
  const [craftSyncMode, setCraftSyncMode] = useState(initialSettings?.craftSyncMode || 'read-only')
  const [craftEnabled, setCraftEnabled] = useState(initialSettings?.craftEnabled || false)
  const [craftWriteAccess, setCraftWriteAccess] = useState(initialSettings?.craftWriteAccess || false)
  const [craftError, setCraftError] = useState(initialSettings?.craftError || '')
  const [craftLoading, setCraftLoading] = useState(false)
  const [craftEditMode, setCraftEditMode] = useState(!initialSettings?.craftEnabled)
  const [craftFolders, setCraftFolders] = useState<{ id: string; label: string }[]>([])
  const [craftSyncResult, setCraftSyncResult] = useState<any>(null)
  const [craftLastSync, setCraftLastSync] = useState(initialSettings?.craftLastSyncAt || '')

  // ── Database Migration State ──
  const [targetUrl, setTargetUrl] = useState('')
  const [targetToken, setTargetToken] = useState('')
  const [migrationLoading, setMigrationLoading] = useState(false)
  const [migrationResult, setMigrationResult] = useState<any>(null)

  // ── Storage State ──
  const [storageType, setStorageType] = useState<StorageType>('bunny')
  const [currentStorageEnabled, setCurrentStorageEnabled] = useState(initialSettings?.bunnyStorageEnabled || false)
  const [storageEditMode, setStorageEditMode] = useState(!initialSettings?.bunnyStorageEnabled)
  const [bunnyRegion, setBunnyRegion] = useState(initialSettings?.bunnyStorageRegion || '')
  const [bunnyZoneName, setBunnyZoneName] = useState(initialSettings?.bunnyStorageZoneName || '')
  // Note: API key is not loaded from settings for security (encrypted), user must re-enter to modify
  const [bunnyApiKey, setBunnyApiKey] = useState('')
  const [bunnyCdnUrl, setBunnyCdnUrl] = useState(initialSettings?.bunnyStorageUrl || '')
  const [s3Endpoint, setS3Endpoint] = useState('')
  const [s3AccessKeyId, setS3AccessKeyId] = useState('')
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState('')
  const [s3Bucket, setS3Bucket] = useState('')
  const [s3Region, setS3Region] = useState('us-east-1')
  const [s3CdnUrl, setS3CdnUrl] = useState('')
  const [storageLoading, setStorageLoading] = useState(false)
  const [storageResult, setStorageResult] = useState<any>(null)
  const [storageWarning, setStorageWarning] = useState<string | null>(null)

  // ── Email State ──
  type EmailProvider = 'resend' | 'smtp' | null
  const [emailProvider, setEmailProvider] = useState<EmailProvider>((initialSettings?.emailProvider as EmailProvider) || null)
  const [emailFromName, setEmailFromName] = useState(initialSettings?.emailFromName || '')
  const [emailFromAddress, setEmailFromAddress] = useState(initialSettings?.emailFromAddress || '')
  const [resendApiKey, setResendApiKey] = useState('')
  const [smtpHost, setSmtpHost] = useState(initialSettings?.smtpHost || '')
  const [smtpPort, setSmtpPort] = useState(initialSettings?.smtpPort || 587)
  const [smtpSecure, setSmtpSecure] = useState(initialSettings?.smtpSecure || false)
  const [smtpUser, setSmtpUser] = useState(initialSettings?.smtpUser || '')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [testEmailTo, setTestEmailTo] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSettingsLoaded, setEmailSettingsLoaded] = useState(false)

  // ── Craft Handlers ──
  const handleTestCraftConnection = async () => {
    const hasToken = craftApiToken.trim() !== '' || hasExistingToken
    if (!craftServerUrl || !hasToken) {
      toast('Server URL and API token are required.', 'warning')
      return
    }
    setCraftLoading(true)
    try {
      const res = await fetch('/api/craft/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          serverUrl: craftServerUrl, 
          apiToken: craftApiToken || undefined // Send empty as undefined to use DB token
        }),
      })
      const data = await res.json()
      if (data.success) {
        const hasWrite = data.writeAccess || false
        setCraftWriteAccess(hasWrite)
        setCraftError('')
        // Persist write access to DB so it survives page reloads
        await updateCraftWriteAccess(hasWrite)
        const accessLevel = hasWrite ? 'Read & Write' : 'Read Only'
        toast(`Connected to Craft space: ${data.spaceId} (${accessLevel})`, 'success')
        // If mode requires write but we don't have it, downgrade to read-only
        if (!data.writeAccess && (craftSyncMode === 'backup' || craftSyncMode === 'full-sync')) {
          setCraftSyncMode('read-only')
          toast('Sync mode changed to Read Only (API does not have write access).', 'warning')
        }
      } else {
        setCraftWriteAccess(false)
        toast(data.error || 'Connection failed.', 'error')
      }
    } catch (err: any) {
      toast(`Connection error: ${err.message}`, 'error')
    }
    setCraftLoading(false)
  }

  const handleLoadFolders = async () => {
    const hasToken = craftApiToken.trim() !== '' || hasExistingToken
    if (!craftServerUrl || !hasToken) {
      toast('Server URL and API token are required.', 'warning')
      return
    }
    setCraftLoading(true)
    try {
      const res = await fetch('/api/craft/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          serverUrl: craftServerUrl, 
          apiToken: craftApiToken || undefined // Send empty as undefined to use DB token
        }),
      })
      const data = await res.json()
      if (data.folders) {
        const flat = flattenFolders(data.folders)
        setCraftFolders(flat)
        if (flat.length === 0) {
          toast('No folders found in your Craft space.', 'info')
        } else {
          toast(`Found ${flat.length} folders.`, 'success')
        }
      } else {
        toast(data.error || 'Failed to load folders.', 'error')
      }
    } catch (err: any) {
      toast(`Error: ${err.message}`, 'error')
    }
    setCraftLoading(false)
  }

  const handleSaveCraft = async () => {
    // When enabling Craft, we need either a new token or an existing one
    const hasToken = craftApiToken.trim() !== '' || hasExistingToken
    if (craftEnabled && (!craftServerUrl || !hasToken || !craftFolderId)) {
      toast('Server URL, API token, and folder are required to enable Craft.', 'warning')
      return
    }
    setCraftLoading(true)
    const res = await saveCraftSettings(
      craftServerUrl,
      craftApiToken, // Empty string is fine - server will preserve existing token
      craftFolderId,
      craftFolderName,
      craftSyncMode,
      craftEnabled,
      craftWriteAccess
    )
    if (res.success) {
      toast('Craft settings saved!', 'success')
      // Clear the API token field after save (for security)
      setCraftApiToken('')
    } else {
      toast(res.error || 'Failed to save.', 'error')
    }
    setCraftLoading(false)
  }

  const handleCraftSync = async (force: boolean) => {
    setCraftLoading(true)
    setCraftSyncResult(null)
    toast(force ? 'Re-syncing all posts... This may take a while.' : 'Syncing changes...', 'info')
    try {
      const res = await fetch('/api/craft/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const data = await res.json()
      if (data.error || (data.errors && data.errors.length > 0 && data.imported === 0 && data.updated === 0 && data.backedUp === 0)) {
        const errMsg = data.error || data.errors?.[0] || 'Sync failed.'
        toast(errMsg, 'error')
        // Show error in UI but don't disable integration - user should decide
        setCraftError(errMsg)
        setCraftSyncResult(data)
      } else {
        setCraftSyncResult(data)
        setCraftLastSync(new Date().toISOString())
        setCraftError('')
        const parts = []
        if (data.imported) parts.push(`${data.imported} imported`)
        if (data.updated) parts.push(`${data.updated} updated`)
        if (data.backedUp) parts.push(`${data.backedUp} backed up`)
        toast(parts.length ? `Sync complete: ${parts.join(', ')}` : 'Sync complete. No changes.', 'success')
      }
    } catch (err: any) {
      toast(`Sync failed: ${err.message}`, 'error')
    }
    setCraftLoading(false)
  }

  // ── Database Migration Handlers ──
  const handleTestTargetConnection = async () => {
    if (!targetUrl) { toast('Target database URL is required.', 'warning'); return }
    setMigrationLoading(true)
    toast('Testing connection to target database...', 'info')
    const res = await testTargetConnection(targetUrl, targetToken || undefined)
    if (res.success) { toast(res.message || 'Connection successful!', 'success') }
    else { toast(res.error || 'Connection failed.', 'error') }
    setMigrationLoading(false)
  }

  const handleMigrate = async () => {
    if (!targetUrl) { toast('Target database URL is required.', 'warning'); return }
    setMigrationLoading(true)
    setMigrationResult(null)
    toast('Starting migration... This may take a moment.', 'info')
    const res = await migrateToTarget(targetUrl, targetToken || undefined)
    if (res.success) {
      setMigrationResult(res.stats)
      toast(`Migration complete! Migrated ${res.stats?.posts || 0} posts, ${res.stats?.users || 0} users.`, 'success')
    } else { toast(res.error || 'Migration failed.', 'error') }
    setMigrationLoading(false)
  }

  // ── Storage Handlers ──
  const handleTestStorageConnection = async () => {
    const config = storageType === 'bunny'
      ? { region: bunnyRegion, zoneName: bunnyZoneName, apiKey: bunnyApiKey, cdnUrl: bunnyCdnUrl }
      : { endpoint: s3Endpoint, accessKeyId: s3AccessKeyId, secretAccessKey: s3SecretAccessKey, bucket: s3Bucket, region: s3Region, cdnUrl: s3CdnUrl }
    if (storageType === 'bunny' && (!bunnyZoneName || !bunnyApiKey)) { toast('Zone name and API key are required.', 'warning'); return }
    if (storageType === 's3' && (!s3Endpoint || !s3AccessKeyId || !s3SecretAccessKey || !s3Bucket)) { toast('All S3 fields are required.', 'warning'); return }
    setStorageLoading(true)
    setStorageWarning(null)
    toast('Testing connection to storage...', 'info')
    try {
      const res = await testStorageConnection(storageType, config)
      if (res.success) { toast('Connection successful! Ready to migrate.', 'success') }
      else { toast(res.error || 'Connection failed.', 'error') }
    } catch (err: any) { toast(`Test failed: ${err.message}`, 'error') }
    setStorageLoading(false)
  }

  const handleStorageMigrate = async () => {
    const config = storageType === 'bunny'
      ? { region: bunnyRegion, zoneName: bunnyZoneName, apiKey: bunnyApiKey, cdnUrl: bunnyCdnUrl }
      : { endpoint: s3Endpoint, accessKeyId: s3AccessKeyId, secretAccessKey: s3SecretAccessKey, bucket: s3Bucket, region: s3Region, cdnUrl: s3CdnUrl }
    if (storageType === 'bunny' && (!bunnyZoneName || !bunnyApiKey || !bunnyCdnUrl)) { toast('Zone name, API key, and CDN URL are required.', 'warning'); return }
    if (storageType === 's3' && (!s3Endpoint || !s3AccessKeyId || !s3SecretAccessKey || !s3Bucket)) { toast('All S3 fields are required.', 'warning'); return }
    setStorageLoading(true)
    setStorageResult(null)
    setStorageWarning(null)
    toast('Starting storage migration... This may take a moment.', 'info')
    try {
      const res = await migrateStorage(storageType, config, { updatePostUrls: true })
      if (res.success) {
        setStorageResult(res.stats)
        setCurrentStorageEnabled(true)
        if (res.stats?.warnings && res.stats.warnings.length > 0) { setStorageWarning(res.stats.warnings[0]) }
        toast(`Migration complete! Migrated ${res.stats?.filesMigrated || 0} files.`, 'success')
      } else { toast(res.error || 'Migration failed.', 'error') }
    } catch (err: any) { toast(`Migration failed: ${err.message}`, 'error') }
    setStorageLoading(false)
  }

  const handleSaveStorageSettings = async () => {
    const config = { region: bunnyRegion, zoneName: bunnyZoneName, apiKey: bunnyApiKey, cdnUrl: bunnyCdnUrl }
    if (!bunnyZoneName || !bunnyApiKey || !bunnyCdnUrl) { toast('Zone name, API key, and CDN URL are required.', 'warning'); return }
    setStorageLoading(true)
    toast('Saving storage settings...', 'info')
    try {
      const res = await saveStorageSettings(storageType, config)
      if (res.success) {
        setCurrentStorageEnabled(true)
        setStorageEditMode(false)
        toast('Storage settings saved successfully!', 'success')
      } else { toast(res.error || 'Failed to save settings.', 'error') }
    } catch (err: any) { toast(`Save failed: ${err.message}`, 'error') }
    setStorageLoading(false)
  }

  // ── Email Handlers ──
  const handleLoadEmailSettings = async () => {
    setEmailLoading(true)
    try {
      const res = await getEmailSettings()
      if (res.error) { toast(res.error, 'error'); return }
      if (res.settings) {
        setResendApiKey(res.settings.resendApiKey || '')
        setSmtpPassword(res.settings.smtpPassword || '')
        setEmailSettingsLoaded(true)
        toast('Credentials loaded for editing.', 'info')
      }
    } catch (err: any) { toast(`Error: ${err.message}`, 'error') }
    setEmailLoading(false)
  }

  const handleSaveEmailSettings = async () => {
    if (emailProvider === 'resend' && !resendApiKey) { toast('Resend API key is required.', 'warning'); return }
    if (emailProvider === 'smtp' && !smtpHost) { toast('SMTP host is required.', 'warning'); return }
    if (emailProvider && !emailFromAddress) { toast('Sender email address is required.', 'warning'); return }
    setEmailLoading(true)
    try {
      const res = await saveEmailSettings({
        provider: emailProvider,
        fromName: emailFromName,
        fromAddress: emailFromAddress,
        resendApiKey,
        smtpHost,
        smtpPort,
        smtpSecure,
        smtpUser,
        smtpPassword,
      })
      if (res.success) { toast('Email settings saved!', 'success') }
      else { toast(res.error || 'Failed to save.', 'error') }
    } catch (err: any) { toast(`Error: ${err.message}`, 'error') }
    setEmailLoading(false)
  }

  const handleTestEmail = async () => {
    if (!testEmailTo) { toast('Enter a test recipient email.', 'warning'); return }
    setEmailLoading(true)
    toast('Sending test email...', 'info')
    try {
      const res = await testEmailSettings(testEmailTo)
      if ('error' in res && res.error) { toast(res.error, 'error') }
      else { toast('Test email sent successfully!', 'success') }
    } catch (err: any) { toast(`Error: ${err.message}`, 'error') }
    setEmailLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>

      {/* ── Craft.do Integration ── */}
      <div className="glass" style={{ padding: '2rem' }}>
        <ExpandableSection
          title="Craft.do Integration"
          icon="C"
          defaultExpanded={true}
          badge={
            craftError
              ? <span style={{ fontSize: '0.7rem', background: '#ef4444', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>error</span>
              : craftEnabled
                ? <span style={{ fontSize: '0.7rem', background: '#22c55e', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>active</span>
                : undefined
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {craftError && (
              <div style={{
                padding: '1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: 'var(--radius-md)',
              }}>
                <strong style={{ color: '#ef4444', fontSize: '0.9rem' }}>Integration Error</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {craftError}
                </p>
              </div>
            )}

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Sync blog posts with Craft.do. Import notes from a Craft folder as blog posts, back up posts to Craft, or enable full two-way sync.
            </p>

            {/* Show Modify button when Craft is configured but not in edit mode */}
            {craftEnabled && !craftEditMode && (
              <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid #22c55e' }}>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#22c55e' }}>
                  ✅ Craft is configured and {craftEnabled ? 'enabled' : 'disabled'}
                </p>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  <div><strong>Server:</strong> {craftServerUrl}</div>
                  <div><strong>Folder:</strong> {craftFolderName || craftFolderId}</div>
                  <div><strong>Mode:</strong> {craftSyncMode}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setCraftEditMode(true)}
                  className="btn"
                  style={{ background: 'var(--accent-color)', color: 'white', border: 'none' }}
                >
                  Modify Configuration
                </button>
              </div>
            )}

            {/* Show form fields only in edit mode */}
            {craftEditMode && (
              <>
            <div>
              <label style={{ fontWeight: 400 }}>Server URL *</label>
              <input
                type="url"
                value={craftServerUrl}
                onChange={(e) => setCraftServerUrl(e.target.value)}
                placeholder="https://connect.craft.do/links/your-server-id/api/v1"
                disabled={craftLoading}
                className="input-field"
                autoComplete="off"
              />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                The full API URL from your Craft integration settings.
              </p>
            </div>

            <div>
              <label style={{ fontWeight: 400 }}>API Token *</label>
              <input
                type="password"
                value={craftApiToken}
                onChange={(e) => setCraftApiToken(e.target.value)}
                placeholder={hasExistingToken ? '•••••••• (token configured - enter new to change)' : 'Your Craft API bearer token'}
                disabled={craftLoading}
                className="input-field"
                autoComplete="new-password"
              />
              {hasExistingToken && craftApiToken === '' && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  A token is already configured. Leave empty to keep it, or enter a new one to replace it.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleTestCraftConnection}
                disabled={craftLoading || !craftServerUrl || (!craftApiToken && !hasExistingToken)}
                className="btn"
                style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
              >
                {craftLoading ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                type="button"
                onClick={handleLoadFolders}
                disabled={craftLoading || !craftServerUrl || (!craftApiToken && !hasExistingToken)}
                className="btn"
                style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
              >
                {craftLoading ? 'Loading...' : 'Load Folders'}
              </button>
            </div>

            <div>
              <label style={{ fontWeight: 400 }}>Sync Folder *</label>
              {craftFolders.length > 0 ? (
                <select
                  value={craftFolderId}
                  onChange={(e) => {
                    setCraftFolderId(e.target.value)
                    const selected = craftFolders.find(f => f.id === e.target.value)
                    setCraftFolderName(selected?.label.split(' (')[0] || '')
                  }}
                  disabled={craftLoading}
                  className="input-field"
                >
                  <option value="">Select a folder...</option>
                  {craftFolders.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={craftFolderId}
                  onChange={(e) => setCraftFolderId(e.target.value)}
                  placeholder={craftFolderName ? `${craftFolderName} (${craftFolderId})` : 'Click "Load Folders" or enter folder ID manually'}
                  disabled={craftLoading}
                  className="input-field"
                />
              )}
              {craftFolderName && craftFolderId && craftFolders.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Currently set to: {craftFolderName}
                </p>
              )}
            </div>

            <div>
              <label style={{ fontWeight: 400, display: 'block', marginBottom: '0.75rem' }}>Sync Mode</label>
              {craftWriteAccess ? (
                <p style={{ color: '#22c55e', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>API has read &amp; write access.</p>
              ) : (
                <p style={{ color: '#eab308', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>API has read-only access. Test connection to check write permissions.</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { value: 'read-only', label: 'Read Only', desc: 'Import posts from Craft and sync updates. No writing to Craft.', requiresWrite: false },
                  { value: 'backup', label: 'Backup', desc: 'Write all blog posts to Craft as backup. No importing from Craft.', requiresWrite: true },
                  { value: 'full-sync', label: 'Full Sync', desc: 'Both import from Craft and backup to Craft.', requiresWrite: true },
                ].map(mode => {
                  const disabled = mode.requiresWrite && !craftWriteAccess
                  return (
                    <label
                      key={mode.value}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${craftSyncMode === mode.value ? 'var(--accent-color)' : 'var(--border-color)'}`,
                        background: craftSyncMode === mode.value ? 'rgba(var(--accent-color-rgb, 99, 102, 241), 0.05)' : 'transparent',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.5 : 1,
                      }}
                    >
                      <input
                        type="radio"
                        name="craftSyncMode"
                        value={mode.value}
                        checked={craftSyncMode === mode.value}
                        onChange={() => setCraftSyncMode(mode.value)}
                        disabled={disabled}
                        style={{ marginTop: '0.2rem' }}
                      />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                          {mode.label}
                          {disabled && <span style={{ fontSize: '0.75rem', color: '#eab308', marginLeft: '0.5rem' }}>(requires write access)</span>}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{mode.desc}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={craftEnabled}
                  onChange={(e) => setCraftEnabled(e.target.checked)}
                />
                <span style={{ fontWeight: 500 }}>Enable Craft Integration</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={async () => {
                  await handleSaveCraft()
                  if (craftServerUrl && craftApiToken && craftFolderId) {
                    setCraftEditMode(false)
                  }
                }}
                disabled={craftLoading}
                className="btn btn-primary"
              >
                {craftLoading ? 'Saving...' : (craftEnabled ? 'Update Settings' : 'Save Craft Settings')}
              </button>
              {craftEnabled && (
                <>
                  <button
                    type="button"
                    onClick={() => handleCraftSync(false)}
                    disabled={craftLoading}
                    className="btn"
                    style={{ background: 'transparent', color: '#22c55e', border: '1px solid #22c55e' }}
                  >
                    {craftLoading ? 'Syncing...' : 'Sync Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCraftSync(true)}
                    disabled={craftLoading}
                    className="btn"
                    style={{ background: '#22c55e', color: 'white', border: 'none' }}
                  >
                    {craftLoading ? 'Syncing...' : 'Sync Everything'}
                  </button>
                </>
              )}
            </div>

            {craftLastSync && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                Last sync: {new Date(craftLastSync).toLocaleString()}
              </p>
            )}

            {craftSyncResult && (
              <div style={{
                padding: '1rem',
                background: craftSyncResult.errors?.length > 0 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${craftSyncResult.errors?.length > 0 ? '#eab308' : '#22c55e'}`
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#22c55e' }}>Sync Results</h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {craftSyncResult.imported > 0 && <li>{craftSyncResult.imported} posts imported</li>}
                  {craftSyncResult.updated > 0 && <li>{craftSyncResult.updated} posts updated</li>}
                  {craftSyncResult.backedUp > 0 && <li>{craftSyncResult.backedUp} posts backed up</li>}
                  {craftSyncResult.imported === 0 && craftSyncResult.updated === 0 && craftSyncResult.backedUp === 0 && (
                    <li>No changes detected</li>
                  )}
                  {craftSyncResult.errors?.map((err: string, i: number) => (
                    <li key={i} style={{ color: '#ef4444' }}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
              </>
            )}
          </div>
        </ExpandableSection>
      </div>

      {/* ── Database Migration ── */}
      <div className="glass" style={{ padding: '2rem' }}>
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
                autoComplete="new-password"
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
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#22c55e' }}>Migration Complete</h4>
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
      </div>

      {/* ── Storage Configuration ── */}
      <div className="glass" style={{ padding: '2rem' }}>
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
                Bunny
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
                S3
              </button>
            </div>

            {/* Show Modify button when storage is configured but not in edit mode */}
            {currentStorageEnabled && !storageEditMode && (
              <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid #22c55e', marginBottom: '1rem' }}>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#22c55e' }}>
                  ✅ Storage is configured and active
                </p>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  <div><strong>Zone:</strong> {bunnyZoneName}</div>
                  <div><strong>Region:</strong> {bunnyRegion || 'Auto'}</div>
                  <div><strong>CDN:</strong> {bunnyCdnUrl}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setStorageEditMode(true)}
                  className="btn"
                  style={{ background: 'var(--accent-color)', color: 'white', border: 'none' }}
                >
                  Modify Configuration
                </button>
              </div>
            )}

            {/* Show form fields only in edit mode */}
            {storageEditMode && (
              <>
                {storageType === 'bunny' ? (
                  <>
                    <div>
                      <label style={{ fontWeight: 400 }}>Region (Optional)</label>
                      <select value={bunnyRegion} onChange={(e) => setBunnyRegion(e.target.value)} disabled={storageLoading} className="input-field">
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
                      <input type="text" value={bunnyZoneName} onChange={(e) => setBunnyZoneName(e.target.value)} placeholder="my-storage-zone" disabled={storageLoading} className="input-field" autoComplete="off" />
                    </div>
                    <div>
                      <label style={{ fontWeight: 400 }}>API Key * {currentStorageEnabled && '(enter new key to update)'}</label>
                      <input type="password" value={bunnyApiKey} onChange={(e) => setBunnyApiKey(e.target.value)} placeholder={currentStorageEnabled ? 'Enter new API key to update' : 'your-api-key'} disabled={storageLoading} className="input-field" autoComplete="new-password" />
                    </div>
                    <div>
                      <label style={{ fontWeight: 400 }}>CDN URL *</label>
                      <input type="url" value={bunnyCdnUrl} onChange={(e) => setBunnyCdnUrl(e.target.value)} placeholder="https://my-zone.b-cdn.net" disabled={storageLoading} className="input-field" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={{ fontWeight: 400 }}>S3 Endpoint *</label>
                      <input type="url" value={s3Endpoint} onChange={(e) => setS3Endpoint(e.target.value)} placeholder="https://s3.amazonaws.com or https://<account>.r2.cloudflarestorage.com" disabled={storageLoading} className="input-field" />
                    </div>
                    <div>
                      <label style={{ fontWeight: 400 }}>Access Key ID *</label>
                      <input type="text" value={s3AccessKeyId} onChange={(e) => setS3AccessKeyId(e.target.value)} placeholder="AKIA..." disabled={storageLoading} className="input-field" />
                    </div>
                    <div>
                      <label style={{ fontWeight: 400 }}>Secret Access Key *</label>
                      <input type="password" value={s3SecretAccessKey} onChange={(e) => setS3SecretAccessKey(e.target.value)} placeholder="..." disabled={storageLoading} className="input-field" autoComplete="new-password" />
                    </div>
                    <div>
                      <label style={{ fontWeight: 400 }}>Bucket Name *</label>
                      <input type="text" value={s3Bucket} onChange={(e) => setS3Bucket(e.target.value)} placeholder="my-bucket" disabled={storageLoading} className="input-field" />
                    </div>
                    <div>
                      <label style={{ fontWeight: 400 }}>Region</label>
                      <input type="text" value={s3Region} onChange={(e) => setS3Region(e.target.value)} placeholder="us-east-1" disabled={storageLoading} className="input-field" />
                    </div>
                    <div>
                      <label style={{ fontWeight: 400 }}>CDN URL (Optional)</label>
                      <input type="url" value={s3CdnUrl} onChange={(e) => setS3CdnUrl(e.target.value)} placeholder="https://cdn.example.com" disabled={storageLoading} className="input-field" />
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
                    onClick={handleSaveStorageSettings}
                    disabled={storageLoading}
                    className="btn"
                    style={{ background: 'var(--accent-color)', color: 'white', border: 'none' }}
                  >
                    {storageLoading ? 'Saving...' : (currentStorageEnabled ? 'Update Settings' : 'Save Settings')}
                  </button>
                </div>

                {/* Migration option - only show if storage is already enabled */}
                {currentStorageEnabled && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--accent-color)' }}>Migrate Files</h4>
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Use this only when switching to a different storage provider or a different zone. 
                      This will download all files from the current storage and upload them to the new one, 
                      then update all URLs in your posts.
                    </p>
                    <button
                      type="button"
                      onClick={handleStorageMigrate}
                      disabled={storageLoading}
                      className="btn"
                      style={{ background: '#22c55e', color: 'white', border: 'none' }}
                    >
                      {storageLoading ? 'Migrating...' : 'Migrate Files to New Storage'}
                    </button>
                  </div>
                )}
              </>
            )}

            {storageWarning && (
              <div style={{ padding: '0.75rem', background: 'rgba(234, 179, 8, 0.1)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#eab308' }}>{storageWarning}</p>
              </div>
            )}

            {storageResult && (
              <div style={{
                padding: '1rem',
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #22c55e'
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#22c55e' }}>Migration Complete</h4>
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
      </div>

      {/* ── Email / SMTP Integration ── */}
      <div className="glass" style={{ padding: '2rem' }}>
        <ExpandableSection
          title="Email / SMTP"
          icon="✉️"
          badge={
            emailProvider
              ? <span style={{ fontSize: '0.7rem', background: '#22c55e', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>active</span>
              : undefined
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Configure an email provider to enable email verification and password reset for admin users.
              Supports <strong>Resend.com</strong> (recommended) or any custom <strong>SMTP</strong> server.
            </p>

            {/* Provider Selection */}
            <div>
              <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.75rem' }}>Email Provider</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[{ value: null, label: '🚫 None' }, { value: 'resend', label: '⚡ Resend' }, { value: 'smtp', label: '📬 SMTP' }].map(opt => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setEmailProvider(opt.value as EmailProvider)}
                    disabled={emailLoading}
                    className="btn"
                    style={{
                      flex: 1,
                      minWidth: '80px',
                      background: emailProvider === opt.value ? 'var(--accent-color)' : 'var(--bg-color)',
                      color: emailProvider === opt.value ? 'white' : 'var(--text-primary)',
                      border: `1px solid ${emailProvider === opt.value ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {emailProvider && (
              <>
                {/* From */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontWeight: 400 }}>Sender Name</label>
                    <input
                      type="text"
                      value={emailFromName}
                      onChange={e => setEmailFromName(e.target.value)}
                      placeholder="ExploreCMS"
                      disabled={emailLoading}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: 400 }}>From Email Address *</label>
                    <input
                      type="email"
                      value={emailFromAddress}
                      onChange={e => setEmailFromAddress(e.target.value)}
                      placeholder="noreply@yourdomain.com"
                      disabled={emailLoading}
                      className="input-field"
                    />
                  </div>
                </div>

                {emailProvider === 'resend' && (
                  <div>
                    <label style={{ fontWeight: 400 }}>Resend API Key *</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="password"
                        value={resendApiKey}
                        onChange={e => setResendApiKey(e.target.value)}
                        placeholder={emailSettingsLoaded ? 'Enter API key' : initialSettings?.resendApiKey ? '••••••••••••••••' : 're_...'}
                        disabled={emailLoading}
                        className="input-field"
                        autoComplete="new-password"
                        style={{ flex: 1 }}
                      />
                      {!emailSettingsLoaded && initialSettings?.resendApiKey && (
                        <button
                          type="button"
                          onClick={handleLoadEmailSettings}
                          disabled={emailLoading}
                          className="btn"
                          style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      Get your API key at <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)' }}>resend.com/api-keys</a>.
                      The sending domain must be verified in your Resend account.
                    </p>
                  </div>
                )}

                {emailProvider === 'smtp' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '1rem' }}>
                      <div>
                        <label style={{ fontWeight: 400 }}>SMTP Host *</label>
                        <input
                          type="text"
                          value={smtpHost}
                          onChange={e => setSmtpHost(e.target.value)}
                          placeholder="smtp.example.com"
                          disabled={emailLoading}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label style={{ fontWeight: 400 }}>Port</label>
                        <input
                          type="number"
                          value={smtpPort}
                          onChange={e => setSmtpPort(Number(e.target.value))}
                          placeholder="587"
                          disabled={emailLoading}
                          className="input-field"
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={smtpSecure}
                          onChange={e => setSmtpSecure(e.target.checked)}
                        />
                        <span style={{ fontWeight: 400 }}>Use TLS (SSL) — enable for port 465</span>
                      </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontWeight: 400 }}>Username (Optional)</label>
                        <input
                          type="text"
                          value={smtpUser}
                          onChange={e => setSmtpUser(e.target.value)}
                          placeholder="user@example.com"
                          disabled={emailLoading}
                          className="input-field"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label style={{ fontWeight: 400 }}>Password (Optional)</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="password"
                            value={smtpPassword}
                            onChange={e => setSmtpPassword(e.target.value)}
                            placeholder={emailSettingsLoaded ? 'Enter password' : initialSettings?.smtpPassword ? '••••••••' : 'SMTP password'}
                            disabled={emailLoading}
                            className="input-field"
                            autoComplete="new-password"
                            style={{ flex: 1 }}
                          />
                          {!emailSettingsLoaded && initialSettings?.smtpPassword && (
                            <button
                              type="button"
                              onClick={handleLoadEmailSettings}
                              disabled={emailLoading}
                              className="btn"
                              style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Test Email */}
                <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                  <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Test Email</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="email"
                      value={testEmailTo}
                      onChange={e => setTestEmailTo(e.target.value)}
                      placeholder="test@example.com"
                      disabled={emailLoading}
                      className="input-field"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleTestEmail}
                      disabled={emailLoading || !testEmailTo}
                      className="btn"
                      style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}
                    >
                      {emailLoading ? 'Sending...' : 'Send Test'}
                    </button>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem', margin: '0.5rem 0 0' }}>
                    Save settings first, then send a test to verify your configuration.
                  </p>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={handleSaveEmailSettings}
              disabled={emailLoading}
              className="btn btn-primary"
            >
              {emailLoading ? 'Saving...' : 'Save Email Settings'}
            </button>
          </div>
        </ExpandableSection>
      </div>

      {/* ── Encryption Migration ── */}
      <div className="glass" style={{ padding: '2rem' }}>
        <ExpandableSection
          title="Security & Encryption"
          icon="🔐"
        >
          <EncryptionMigration />
        </ExpandableSection>
      </div>

    </div>
  )
}
