/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import SetupForm from './SetupForm'

export default async function SetupPage() {
  const owner = await prisma.user.findFirst({
    where: { role: 'OWNER' }
  })

  // If already setup, redirect to login or home
  if (owner) {
    redirect('/admin/login')
  }

  return (
    <div className="container" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass fade-in-up" style={{ padding: '3rem', maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="heading-xl" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Welcome.</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Let's set up your amazing new ExploreCMS instance.
          </p>
        </div>
        <SetupForm />
      </div>
    </div>
  )
}
