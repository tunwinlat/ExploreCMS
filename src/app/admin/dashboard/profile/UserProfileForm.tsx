'use client'

import { useState } from 'react'
import { updateUserProfile } from './profileActions'

export default function UserProfileForm({ user }: { user: any }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error'|'success', text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await updateUserProfile(formData)
      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
      {message && (
        <div style={{ 
          padding: '1rem', 
          background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', 
          color: message.type === 'error' ? '#ef4444' : '#22c55e', 
          borderRadius: 'var(--radius-md)' 
        }}>
          {message.text}
        </div>
      )}

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>First Name</label>
        <input 
          type="text" 
          name="firstName" 
          defaultValue={user.firstName || ''}
          placeholder="e.g. John"
          className="glass"
          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--text-primary)' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Last Name</label>
        <input 
          type="text" 
          name="lastName" 
          defaultValue={user.lastName || ''}
          placeholder="e.g. Doe"
          className="glass"
          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--text-primary)' }}
        />
      </div>

      <button type="submit" className="glass" disabled={loading} style={{ 
        padding: '0.75rem', 
        background: 'var(--text-primary)', 
        color: 'var(--bg-color)', 
        border: 'none', 
        borderRadius: 'var(--radius-md)', 
        fontWeight: 600, 
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1
      }}>
        {loading ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  )
}
