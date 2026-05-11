/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import LoginForm from './LoginForm'

export const metadata = { title: 'Admin Login | ExploreCMS' }

export default function LoginPage() {
  return (
    <div className="container" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass fade-in-up" style={{ padding: '3rem', maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="heading-xl" style={{ fontSize: '2.5rem', margin: '0' }}>Admin</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Sign in to manage your content.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
