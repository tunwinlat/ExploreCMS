/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { requestPasswordReset } from './actions'
import Link from 'next/link'

export default function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    try {
      const res = await requestPasswordReset(formData)
      if ('error' in res && res.error) {
        setError(res.error)
      } else {
        setSent(true)
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}>
        <div style={{
          padding: '2rem',
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📬</div>
          <h3 style={{ margin: '0 0 0.5rem', color: '#22c55e', fontSize: '1.1rem' }}>Check your inbox</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            If an account with that email exists and is verified, we&apos;ve sent you a password reset link.
            It will expire in <strong>1 hour</strong>.
          </p>
        </div>
        <Link
          href="/admin/login"
          style={{ color: 'var(--accent-color)', fontSize: '0.9rem', textDecoration: 'none' }}
        >
          ← Back to Sign In
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

      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
        Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label htmlFor="email" style={{ fontWeight: 500, fontSize: '0.9rem' }}>Email Address</label>
        <input
          type="email"
          id="email"
          name="email"
          required
          placeholder="you@example.com"
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-color)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary"
        style={{ marginTop: '0.25rem' }}
      >
        {loading ? 'Sending...' : 'Send Reset Link'}
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
