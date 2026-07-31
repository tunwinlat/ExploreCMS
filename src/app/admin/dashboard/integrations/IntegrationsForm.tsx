/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { testTargetConnection, migrateToTarget } from '../settings/migrationActions'
import { testStorageConnection, migrateStorage, saveStorageSettings, type StorageType } from '../settings/storageActions'
import { saveEmailSettings, testEmailSettings } from './emailActions'
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

export default function IntegrationsForm({ initialSettings }: { initialSettings: any }) {
  const { toast } = useToast()

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
  // Track if email is configured (has credentials stored)
  const hasExistingEmail = !!initialSettings?.emailProvider && 
    ((initialSettings?.emailProvider === 'resend' && !!initialSettings?.resendApiKey) ||
     (initialSettings?.emailProvider === 'smtp' && !!initialSettings?.smtpPassword))
  const [emailEditMode, setEmailEditMode] = useState(!hasExistingEmail)
  const [resendApiKey, setResendApiKey] = useState('')
  const [smtpHost, setSmtpHost] = useState(initialSettings?.smtpHost || '')
  const [smtpPort, setSmtpPort] = useState(initialSettings?.smtpPort || 587)
  const [smtpSecure, setSmtpSecure] = useState(initialSettings?.smtpSecure || false)
  const [smtpUser, setSmtpUser] = useState(initialSettings?.smtpUser || '')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [testEmailTo, setTestEmailTo] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

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
  const handleSaveEmailSettings = async () => {
    // Check for required fields, allowing existing credentials
    const hasResendKey = resendApiKey.trim() !== '' || (initialSettings?.resendApiKey && emailProvider === 'resend')
    const hasSmtpCreds = (smtpPassword.trim() !== '' || initialSettings?.smtpPassword) && emailProvider === 'smtp'
    
    if (emailProvider === 'resend' && !hasResendKey) { 
      toast('Resend API key is required.', 'warning'); return 
    }
    if (emailProvider === 'smtp' && !smtpHost) { 
      toast('SMTP host is required.', 'warning'); return 
    }
    if (emailProvider && !emailFromAddress) { 
      toast('Sender email address is required.', 'warning'); return 
    }
    
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
      if (res.success) { 
        toast('Email settings saved!', 'success')
        // Clear sensitive fields after save
        setResendApiKey('')
        setSmtpPassword('')
        setEmailEditMode(false)
      }
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

            {/* Configured Summary (Locked View) */}
            {!emailEditMode && hasExistingEmail ? (
              <div style={{ 
                padding: '1rem 1.25rem', 
                background: 'rgba(34, 197, 94, 0.1)', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid rgba(34, 197, 94, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e', fontWeight: 500 }}>
                  <span>✓</span>
                  <span>Email is configured and enabled</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <strong>Provider:</strong> {emailProvider === 'resend' ? 'Resend.com' : 'SMTP'}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <strong>From:</strong> {emailFromName || 'ExploreCMS'} &lt;{emailFromAddress}&gt;
                </div>
                {emailProvider === 'smtp' && (
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <strong>Host:</strong> {smtpHost}:{smtpPort}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setEmailEditMode(true)}
                  className="btn"
                  style={{ 
                    marginTop: '0.5rem',
                    alignSelf: 'flex-start',
                    background: 'var(--accent-color)', 
                    color: 'white',
                    border: 'none' 
                  }}
                >
                  Modify Configuration
                </button>
              </div>
            ) : (
              <>
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
                        placeholder={initialSettings?.resendApiKey ? '•••••••• (configured - enter new to change)' : 're_...'}
                        disabled={emailLoading}
                        className="input-field"
                        autoComplete="new-password"
                        style={{ flex: 1 }}
                      />
                    </div>
                    {initialSettings?.resendApiKey && resendApiKey === '' && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        API key is configured. Leave empty to keep it, or enter a new one to replace it.
                      </p>
                    )}
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
                            placeholder={initialSettings?.smtpPassword ? '•••••••• (configured)' : 'SMTP password'}
                            disabled={emailLoading}
                            className="input-field"
                            autoComplete="new-password"
                            style={{ flex: 1 }}
                          />
                        </div>
                        {initialSettings?.smtpPassword && smtpPassword === '' && (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                            Password is configured. Leave empty to keep it.
                          </p>
                        )}
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

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSaveEmailSettings}
                disabled={emailLoading}
                className="btn btn-primary"
              >
                {emailLoading ? 'Saving...' : 'Save Email Settings'}
              </button>
              {hasExistingEmail && (
                <button
                  type="button"
                  onClick={() => setEmailEditMode(false)}
                  disabled={emailLoading}
                  className="btn"
                  style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </>
        )}
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
