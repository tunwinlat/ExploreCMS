/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  completeSetup, 
  testBunnyStorageConnection, 
  testS3Connection,
  SetupData 
} from './actions'

type Step = 'welcome' | 'admin' | 'storage' | 'review'
type StorageType = 'bunny' | 's3' | 'none'

export default function SetupWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form data
  const [adminData, setAdminData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  })
  
  const [storageType, setStorageType] = useState<StorageType>('bunny')
  const [bunnyConfig, setBunnyConfig] = useState({
    region: '',
    zoneName: '',
    apiKey: '',
    cdnUrl: ''
  })
  const [s3Config, setS3Config] = useState({
    endpoint: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucket: '',
    region: 'us-east-1',
    cdnUrl: ''
  })
  
  const [testStatus, setTestStatus] = useState<{
    testing: boolean
    success?: boolean
    message?: string
  }>({ testing: false })

  const validateAdminStep = () => {
    if (!adminData.username.trim()) {
      setError('Username is required')
      return false
    }
    if (adminData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }
    if (adminData.password !== adminData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const validateStorageStep = () => {
    if (storageType === 'none') return true
    
    if (storageType === 'bunny') {
      if (!bunnyConfig.zoneName.trim() || !bunnyConfig.apiKey.trim()) {
        setError('Zone name and API key are required for Bunny Storage')
        return false
      }
    }
    
    if (storageType === 's3') {
      if (!s3Config.endpoint.trim() || !s3Config.accessKeyId.trim() || 
          !s3Config.secretAccessKey.trim() || !s3Config.bucket.trim()) {
        setError('All S3 fields are required')
        return false
      }
    }
    
    return true
  }

  const testConnection = async () => {
    setTestStatus({ testing: true })
    setError(null)
    
    try {
      if (storageType === 'bunny') {
        const result = await testBunnyStorageConnection(
          bunnyConfig.region,
          bunnyConfig.zoneName,
          bunnyConfig.apiKey
        )
        setTestStatus({
          testing: false,
          success: result.success,
          message: result.success ? 'Connection successful!' : result.error
        })
      } else if (storageType === 's3') {
        const result = await testS3Connection(
          s3Config.endpoint,
          s3Config.accessKeyId,
          s3Config.secretAccessKey,
          s3Config.bucket,
          s3Config.region
        )
        setTestStatus({
          testing: false,
          success: result.success,
          message: result.success ? 'Connection successful!' : result.error
        })
      }
    } catch (err: any) {
      setTestStatus({
        testing: false,
        success: false,
        message: err.message || 'Connection test failed'
      })
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const setupData: SetupData = {
        username: adminData.username,
        password: adminData.password,
        firstName: adminData.firstName || undefined,
        lastName: adminData.lastName || undefined,
        storageType,
        ...(storageType === 'bunny' ? {
          bunnyRegion: bunnyConfig.region,
          bunnyZoneName: bunnyConfig.zoneName,
          bunnyApiKey: bunnyConfig.apiKey,
          bunnyCdnUrl: bunnyConfig.cdnUrl
        } : {}),
        ...(storageType === 's3' ? {
          s3Endpoint: s3Config.endpoint,
          s3AccessKeyId: s3Config.accessKeyId,
          s3SecretAccessKey: s3Config.secretAccessKey,
          s3Bucket: s3Config.bucket,
          s3Region: s3Config.region,
          s3CdnUrl: s3Config.cdnUrl
        } : {})
      }
      
      const result = await completeSetup(setupData)
      
      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else if (result.success) {
        router.push('/admin/dashboard')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const renderWelcomeStep = () => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        width: '80px', 
        height: '80px', 
        borderRadius: '20px', 
        background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem',
        fontSize: '2rem'
      }}>
        🚀
      </div>
      <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Welcome to ExploreCMS</h2>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
        Let's get your new blog set up. This quick wizard will guide you through creating 
        an admin account and configuring your media storage.
      </p>
      <button 
        onClick={() => setCurrentStep('admin')}
        className="btn btn-primary"
        style={{ width: '100%', padding: '0.875rem' }}
      >
        Get Started →
      </button>
    </div>
  )

  const renderAdminStep = () => (
    <div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Create Admin Account</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        This will be the owner account with full access to manage your blog.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Username *
          </label>
          <input
            type="text"
            value={adminData.username}
            onChange={(e) => setAdminData({ ...adminData, username: e.target.value })}
            placeholder="admin"
            style={inputStyle}
          />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              First Name
            </label>
            <input
              type="text"
              value={adminData.firstName}
              onChange={(e) => setAdminData({ ...adminData, firstName: e.target.value })}
              placeholder="John"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Last Name
            </label>
            <input
              type="text"
              value={adminData.lastName}
              onChange={(e) => setAdminData({ ...adminData, lastName: e.target.value })}
              placeholder="Doe"
              style={inputStyle}
            />
          </div>
        </div>
        
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Password *
          </label>
          <input
            type="password"
            value={adminData.password}
            onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
            placeholder="••••••••"
            minLength={8}
            style={inputStyle}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Minimum 8 characters
          </span>
        </div>
        
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Confirm Password *
          </label>
          <input
            type="password"
            value={adminData.confirmPassword}
            onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button 
          onClick={() => setCurrentStep('welcome')}
          className="btn"
          style={{ flex: 1, padding: '0.875rem' }}
        >
          ← Back
        </button>
        <button 
          onClick={() => {
            if (validateAdminStep()) {
              setError(null)
              setCurrentStep('storage')
            }
          }}
          className="btn btn-primary"
          style={{ flex: 1, padding: '0.875rem' }}
        >
          Continue →
        </button>
      </div>
    </div>
  )

  const renderStorageStep = () => (
    <div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Configure Storage</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Choose where your images and media files will be stored.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <StorageOption
          id="bunny"
          title="Bunny Storage"
          description="Recommended. Affordable, fast, and easy to set up."
          icon="🐰"
          selected={storageType === 'bunny'}
          onClick={() => setStorageType('bunny')}
        />
        <StorageOption
          id="s3"
          title="S3-Compatible Storage"
          description="AWS S3, Cloudflare R2, MinIO, or any S3-compatible service."
          icon="☁️"
          selected={storageType === 's3'}
          onClick={() => setStorageType('s3')}
        />
        <StorageOption
          id="none"
          title="Skip for now"
          description="Configure storage later from the admin dashboard."
          icon="⏭️"
          selected={storageType === 'none'}
          onClick={() => setStorageType('none')}
        />
      </div>
      
      {storageType === 'bunny' && (
        <div style={{ 
          padding: '1.25rem', 
          background: 'var(--bg-secondary)', 
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem'
        }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Bunny Storage Settings</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Storage Zone Name *</label>
              <input
                type="text"
                value={bunnyConfig.zoneName}
                onChange={(e) => setBunnyConfig({ ...bunnyConfig, zoneName: e.target.value })}
                placeholder="my-blog-storage"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>API Key (Password) *</label>
              <input
                type="password"
                value={bunnyConfig.apiKey}
                onChange={(e) => setBunnyConfig({ ...bunnyConfig, apiKey: e.target.value })}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Region</label>
              <select
                value={bunnyConfig.region}
                onChange={(e) => setBunnyConfig({ ...bunnyConfig, region: e.target.value })}
                style={inputStyle}
              >
                <option value="">Falkenstein (Default)</option>
                <option value="fsn1">Falkenstein (fsn1)</option>
                <option value="ny">New York (ny)</option>
                <option value="la">Los Angeles (la)</option>
                <option value="sg">Singapore (sg)</option>
                <option value="syd">Sydney (syd)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>CDN URL (optional)</label>
              <input
                type="url"
                value={bunnyConfig.cdnUrl}
                onChange={(e) => setBunnyConfig({ ...bunnyConfig, cdnUrl: e.target.value })}
                placeholder="https://my-zone.b-cdn.net"
                style={inputStyle}
              />
            </div>
            <button
              onClick={testConnection}
              disabled={testStatus.testing}
              className="btn"
              style={{ marginTop: '0.5rem' }}
            >
              {testStatus.testing ? 'Testing...' : 'Test Connection'}
            </button>
            {testStatus.message && (
              <div style={{ 
                padding: '0.75rem', 
                borderRadius: 'var(--radius-md)',
                background: testStatus.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: testStatus.success ? '#22c55e' : '#ef4444',
                fontSize: '0.9rem'
              }}>
                {testStatus.success ? '✓ ' : '✗ '}{testStatus.message}
              </div>
            )}
          </div>
        </div>
      )}
      
      {storageType === 's3' && (
        <div style={{ 
          padding: '1.25rem', 
          background: 'var(--bg-secondary)', 
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem'
        }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>S3-Compatible Storage</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Note: For S3 storage, credentials are configured via environment variables 
            (S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET).
          </p>
          <div style={{ 
            padding: '0.75rem', 
            background: 'rgba(59, 130, 246, 0.1)', 
            borderRadius: 'var(--radius-md)',
            color: '#3b82f6',
            fontSize: '0.85rem'
          }}>
            ℹ️ S3 storage configuration will be available after setup. 
            Please set the required environment variables and configure in Settings.
          </div>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button 
          onClick={() => setCurrentStep('admin')}
          className="btn"
          style={{ flex: 1, padding: '0.875rem' }}
        >
          ← Back
        </button>
        <button 
          onClick={() => {
            if (validateStorageStep()) {
              setError(null)
              setCurrentStep('review')
            }
          }}
          className="btn btn-primary"
          style={{ flex: 1, padding: '0.875rem' }}
        >
          Continue →
        </button>
      </div>
    </div>
  )

  const renderReviewStep = () => (
    <div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Review & Complete</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Review your settings before completing the setup.
      </p>
      
      <div style={{ 
        background: 'var(--bg-secondary)', 
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', 
                     color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Admin Account
        </h4>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <ReviewItem label="Username" value={adminData.username} />
          <ReviewItem label="Name" value={`${adminData.firstName || ''} ${adminData.lastName || ''}`.trim() || 'Not set'} />
          <ReviewItem label="Role" value="Owner (Full Access)" />
        </div>
      </div>
      
      <div style={{ 
        background: 'var(--bg-secondary)', 
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', 
                     color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Storage Configuration
        </h4>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <ReviewItem 
            label="Storage Type" 
            value={storageType === 'bunny' ? 'Bunny Storage' : storageType === 's3' ? 'S3-Compatible' : 'Not configured'} 
          />
          {storageType === 'bunny' && (
            <>
              <ReviewItem label="Zone Name" value={bunnyConfig.zoneName} />
              <ReviewItem label="Region" value={bunnyConfig.region || 'Default (Falkenstein)'} />
              <ReviewItem label="CDN URL" value={bunnyConfig.cdnUrl || 'Not set'} />
            </>
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button 
          onClick={() => setCurrentStep('storage')}
          className="btn"
          style={{ flex: 1, padding: '0.875rem' }}
          disabled={loading}
        >
          ← Back
        </button>
        <button 
          onClick={handleComplete}
          disabled={loading}
          className="btn btn-primary"
          style={{ flex: 1, padding: '0.875rem' }}
        >
          {loading ? 'Setting up...' : 'Complete Setup 🎉'}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {/* Progress indicator */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '0.5rem',
        marginBottom: '2rem'
      }}>
        {(['welcome', 'admin', 'storage', 'review'] as Step[]).map((step, index) => {
          const stepOrder = ['welcome', 'admin', 'storage', 'review']
          const currentIndex = stepOrder.indexOf(currentStep)
          const stepIndex = stepOrder.indexOf(step)
          const isActive = step === currentStep
          const isCompleted = stepIndex < currentIndex
          
          return (
            <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: isActive ? 'var(--accent-color)' : isCompleted ? '#22c55e' : 'var(--bg-secondary)',
                color: isActive || isCompleted ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}>
                {isCompleted ? '✓' : index + 1}
              </div>
              {index < 3 && (
                <div style={{
                  width: '24px',
                  height: '2px',
                  background: stepIndex < currentIndex ? '#22c55e' : 'var(--border-color)',
                  margin: '0 0.5rem'
                }} />
              )}
            </div>
          )
        })}
      </div>
      
      {error && (
        <div style={{ 
          color: '#ef4444', 
          padding: '0.875rem', 
          background: 'rgba(239, 68, 68, 0.1)', 
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}
      
      {currentStep === 'welcome' && renderWelcomeStep()}
      {currentStep === 'admin' && renderAdminStep()}
      {currentStep === 'storage' && renderStorageStep()}
      {currentStep === 'review' && renderReviewStep()}
    </div>
  )
}

// Helper components
function StorageOption({ 
  id, 
  title, 
  description, 
  icon, 
  selected, 
  onClick 
}: { 
  id: string
  title: string
  description: string
  icon: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem',
        borderRadius: 'var(--radius-md)',
        border: `2px solid ${selected ? 'var(--accent-color)' : 'var(--border-color)'}`,
        background: selected ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-color)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'all 0.2s'
      }}
    >
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{title}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{description}</div>
      </div>
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        border: `2px solid ${selected ? 'var(--accent-color)' : 'var(--border-color)'}`,
        background: selected ? 'var(--accent-color)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {selected && <span style={{ color: 'white', fontSize: '0.75rem' }}>✓</span>}
      </div>
    </button>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-color)',
  color: 'var(--text-primary)',
  fontSize: '0.95rem'
}

const labelStyle = {
  display: 'block', 
  fontWeight: 500, 
  marginBottom: '0.5rem', 
  fontSize: '0.9rem'
}
