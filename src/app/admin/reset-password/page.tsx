/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Suspense } from 'react'
import { validateResetToken } from './actions'
import ResetPasswordForm from './ResetPasswordForm'
import Link from 'next/link'

export const metadata = {
  title: 'Reset Password — ExploreCMS',
  description: 'Set a new password for your ExploreCMS account',
}

async function ResetPasswordContent({ token }: { token: string }) {
  const result = await validateResetToken(token)

  if (!result.valid) {
    return (
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{
          padding: '2rem',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏰</div>
          <h3 style={{ margin: '0 0 0.5rem', color: '#ef4444' }}>Link Expired</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            This password reset link has expired or is invalid.
            Reset links are only valid for <strong>1 hour</strong>.
          </p>
        </div>
        <Link href="/admin/login/forgot-password" className="btn btn-primary" style={{ textAlign: 'center' }}>
          Request a New Link
        </Link>
        <Link href="/admin/login" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', textAlign: 'center' }}>
          ← Back to Sign In
        </Link>
      </div>
    )
  }

  return <ResetPasswordForm username={result.username} />
}

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = params.token || ''

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'var(--bg-color)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 700 }}>Reset Password</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Create a new secure password
          </p>
        </div>

        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <Suspense fallback={<p style={{ color: 'var(--text-secondary)' }}>Validating link...</p>}>
            {token ? (
              <ResetPasswordContent token={token} />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#ef4444' }}>No reset token provided.</p>
                <Link href="/admin/login/forgot-password" style={{ color: 'var(--accent-color)', fontSize: '0.9rem' }}>
                  Request a reset link
                </Link>
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export const runtime = 'edge';
