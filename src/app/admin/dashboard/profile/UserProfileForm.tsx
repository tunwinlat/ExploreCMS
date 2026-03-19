/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { updateUserProfile, sendVerificationEmail } from './profileActions'
import { useToast } from '@/components/admin/Toast'

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

export default function UserProfileForm({ user }: { user: { username: string; firstName?: string | null; lastName?: string | null; email?: string | null; emailVerified?: boolean; role?: string } }) {
  const [loading, setLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState(user.email || '')
  const [emailVerified, setEmailVerified] = useState(user.emailVerified ?? false)
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const strength = getPasswordStrength(password)

  // Handle verification callback
  useEffect(() => {
    const verified = searchParams.get('verified')
    if (verified === 'success') {
      setEmailVerified(true)
      toast('✅ Email verified successfully!', 'success')
      // Clean up the URL
      window.history.replaceState(null, '', window.location.pathname)
    } else if (verified === 'invalid') {
      toast('Verification link is invalid or has expired.', 'error')
      window.history.replaceState(null, '', window.location.pathname)
    } else if (verified === 'error') {
      toast('An error occurred during verification. Please try again.', 'error')
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [searchParams, toast])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (password && password.length < 6) {
      toast('Password must be at least 6 characters.', 'warning')
      return
    }
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    try {
      const res = await updateUserProfile(formData)
      if (res.error) {
        toast(res.error, 'error')
      } else {
        toast('Profile updated successfully!', 'success')
        setPassword('')
        // If email changed, mark as unverified
        if (res.emailChanged) {
          setEmailVerified(false)
          toast('Email updated — please verify your new address.', 'warning')
        }
      }
    } catch {
      toast('An unexpected error occurred.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSendVerification = async () => {
    setVerifyLoading(true)
    try {
      const res = await sendVerificationEmail()
      if (res.error) {
        toast(res.error, 'error')
      } else {
        toast('Verification email sent! Check your inbox.', 'success')
      }
    } catch {
      toast('Failed to send verification email.', 'error')
    } finally {
      setVerifyLoading(false)
    }
  }

  const emailHasChanged = email !== (user.email || '')

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
      {/* User card */}
      <div style={{
        padding: '1rem',
        background: 'var(--bg-color-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <span style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: 'var(--accent-color)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', fontWeight: 700, flexShrink: 0
        }}>
          {user.username?.charAt(0).toUpperCase() || '?'}
        </span>
        <div>
          <div style={{ fontWeight: 600 }}>{user.username}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.role || 'User'}</div>
        </div>
      </div>

      {/* First Name */}
      <div>
        <label htmlFor="firstName" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>First Name</label>
        <input
          id="firstName"
          type="text"
          name="firstName"
          defaultValue={user.firstName || ''}
          placeholder="e.g. John"
          className="input-field"
          style={{ width: '100%' }}
        />
      </div>

      {/* Last Name */}
      <div>
        <label htmlFor="lastName" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Last Name</label>
        <input
          id="lastName"
          type="text"
          name="lastName"
          defaultValue={user.lastName || ''}
          placeholder="e.g. Doe"
          className="input-field"
          style={{ width: '100%' }}
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
          Email Address
          {email && !emailHasChanged && (
            emailVerified
              ? <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 500 }}>✓ Verified</span>
              : <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 500 }}>Unverified</span>
          )}
        </label>
        <input
          id="email"
          type="email"
          name="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input-field"
          style={{ width: '100%' }}
          autoComplete="email"
        />
        {email && !emailHasChanged && !emailVerified && (
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Verify your email to enable password reset.
            </p>
            <button
              type="button"
              onClick={handleSendVerification}
              disabled={verifyLoading}
              className="btn"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', background: 'transparent', border: '1px solid var(--accent-color)', color: 'var(--accent-color)' }}
            >
              {verifyLoading ? 'Sending...' : 'Send Verification Email'}
            </button>
          </div>
        )}
        {emailHasChanged && (
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#f59e0b' }}>
            Save to update email. You&apos;ll need to verify the new address.
          </p>
        )}
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
          Used for password reset. Must be verified to receive reset emails.
        </p>
      </div>

      {/* New Password */}
      <div>
        <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>New Password</label>
        <input
          id="password"
          type="password"
          name="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Leave blank to keep current password"
          className="input-field"
          style={{ width: '100%' }}
          minLength={6}
          autoComplete="new-password"
        />
        {password && (
          <>
            <div className="password-strength" role="meter" aria-label="Password strength" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={5}>
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="password-strength-bar"
                  style={{ background: i <= strength.score ? strengthColors[strength.score] : undefined }}
                />
              ))}
            </div>
            <span style={{ fontSize: '0.8rem', color: strengthColors[strength.score], marginTop: '0.25rem', display: 'block' }}>
              {strength.label}
            </span>
          </>
        )}
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Minimum 6 characters. Use a mix of letters, numbers, and symbols for better security.
        </p>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading} style={{
        padding: '0.75rem',
        fontSize: '1rem',
      }}>
        {loading ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  )
}
