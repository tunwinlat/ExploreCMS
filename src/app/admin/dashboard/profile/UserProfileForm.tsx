/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState } from 'react'
import { updateUserProfile } from './profileActions'
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

export default function UserProfileForm({ user }: { user: any }) {
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const { toast } = useToast()

  const strength = getPasswordStrength(password)

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
      }
    } catch {
      toast('An unexpected error occurred.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
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
