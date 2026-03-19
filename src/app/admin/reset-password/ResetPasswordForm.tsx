/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { resetPassword } from './actions'
import Link from 'next/link'

function getPasswordStrength(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: '' }
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
  return { score, label: labels[score] || '' }
}

const strengthColors = ['', '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981']

export default function ResetPasswordForm({ username }: { username?: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const strength = getPasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('token', token)
    try {
      const res = await resetPassword(formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/admin/login'), 3000)
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{
          padding: '2rem',
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔓</div>
          <h3 style={{ margin: '0 0 0.5rem', color: '#22c55e' }}>Password Reset!</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Your password has been updated. Redirecting you to sign in...
          </p>
        </div>
        <Link href="/admin/login" className="btn btn-primary" style={{ textAlign: 'center' }}>
          Sign In Now
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {error && (
        <div style={{ color: '#ef4444', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {username && (
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Resetting password for <strong style={{ color: 'var(--text-primary)' }}>{username}</strong>
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label htmlFor="password" style={{ fontWeight: 500, fontSize: '0.9rem' }}>New Password</label>
        <input
          type="password"
          id="password"
          name="password"
          required
          minLength={8}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-color)',
            color: 'var(--text-primary)',
            boxSizing: 'border-box',
          }}
        />
        {password && (
          <>
            <div className="password-strength" role="meter" aria-label="Password strength">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="password-strength-bar"
                  style={{ background: i <= strength.score ? strengthColors[strength.score] : undefined }}
                />
              ))}
            </div>
            <span style={{ fontSize: '0.8rem', color: strengthColors[strength.score], display: 'block' }}>
              {strength.label}
            </span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label htmlFor="confirmPassword" style={{ fontWeight: 500, fontSize: '0.9rem' }}>Confirm Password</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          required
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${confirmPassword && confirmPassword !== password ? '#ef4444' : 'var(--border-color)'}`,
            background: 'var(--bg-color)',
            color: 'var(--text-primary)',
            boxSizing: 'border-box',
          }}
        />
        {confirmPassword && confirmPassword !== password && (
          <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>Passwords do not match</span>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || (!!confirmPassword && confirmPassword !== password)}
        className="btn btn-primary"
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>

      <Link
        href="/admin/login"
        style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', textAlign: 'center' }}
      >
        ← Back to Sign In
      </Link>
    </form>
  )
}
