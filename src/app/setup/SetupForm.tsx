'use client'

import { useState } from 'react'
import { setupAdmin } from './actions'

export default function SetupForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    try {
      const res = await setupAdmin(formData)
      if (res?.error) setError(res.error)
    } catch (err: unknown) {
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setError('An unexpected error occurred.')
      } else if (!(err instanceof Error)) {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {error && <div style={{ color: '#ef4444', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)' }}>{error}</div>}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label htmlFor="username" style={{ fontWeight: 500 }}>Username</label>
        <input 
          type="text" 
          id="username" 
          name="username" 
          required 
          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label htmlFor="password" style={{ fontWeight: 500 }}>Password</label>
        <input 
          type="password" 
          id="password" 
          name="password" 
          required 
          minLength={6}
          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
        />
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
        {loading ? 'Creating Account...' : 'Complete Setup'}
      </button>
    </form>
  )
}
