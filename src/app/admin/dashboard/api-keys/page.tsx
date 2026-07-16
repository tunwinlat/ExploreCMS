/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import ApiKeyManager from './ApiKeyManager'

export const metadata = { title: "API Keys | ExploreCMS" }

export default async function ApiKeysPage() {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') redirect('/admin/dashboard')

  const keys = await prisma.apiKey.findMany({
    select: {
      id: true,
      name: true,
      prefix: true,
      permissions: true,
      revoked: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
      createdBy: { select: { username: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // eslint-disable-next-line react-hooks/purity -- Server Component: rendered once per request, Date.now() is safe here
  const now = Date.now()
  const serializedKeys = keys.map(key => ({
    ...key,
    permissions: key.permissions, // parsed client-side
    expiresAt: key.expiresAt?.toISOString() ?? null,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
    expired: key.expiresAt !== null && key.expiresAt.getTime() < now,
  }))

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="admin-page-title">API Keys</h1>
        <p className="admin-page-subtitle">
          Create and manage keys for the REST API at <code>/api/v1</code>. Each key gets its own
          set of permissions, so you can hand out exactly the access an integration needs.
        </p>
      </header>

      <ApiKeyManager initialKeys={serializedKeys} />
    </div>
  )
}
