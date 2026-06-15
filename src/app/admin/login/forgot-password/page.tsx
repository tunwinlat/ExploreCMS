export const runtime = 'edge';
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import ForgotPasswordForm from './ForgotPasswordForm'

export const metadata = {
  title: 'Forgot Password — ExploreCMS',
  description: 'Reset your ExploreCMS admin password',
}

export default function ForgotPasswordPage() {
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
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 700 }}>Forgot Password?</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            We&apos;ll email you a reset link
          </p>
        </div>

        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  )
}
