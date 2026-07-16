/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * API key authentication and authorization for the public REST API (/api/v1).
 *
 * Keys are 256-bit random tokens prefixed with "ecms_". Only the SHA-256
 * hash of a key is stored in the database — the plaintext key is shown to
 * the user exactly once at creation time.
 *
 * Permissions use a "resource:action" format (e.g. "posts:create").
 * Supported wildcards: "posts:*" (all actions on a resource) and "*" (full access).
 */

import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { sanitizePermissions } from '@/lib/apiPermissions'

export {
  API_RESOURCES,
  API_ACTIONS,
  ALL_PERMISSIONS,
  hasPermission,
  sanitizePermissions,
  type ApiResource,
  type ApiAction,
} from '@/lib/apiPermissions'

// ── Key generation & hashing ───────────────────────────────────────────────

export const API_KEY_PREFIX = 'ecms_'

export interface GeneratedApiKey {
  /** The full plaintext key. Shown to the user once, never stored. */
  plaintext: string
  /** SHA-256 hex digest of the plaintext key. Stored in the database. */
  hash: string
  /** Non-secret prefix stored for identification in the admin UI. */
  prefix: string
}

export function generateApiKey(): GeneratedApiKey {
  const plaintext = `${API_KEY_PREFIX}${randomBytes(24).toString('base64url')}`
  return {
    plaintext,
    hash: hashApiKey(plaintext),
    prefix: plaintext.slice(0, API_KEY_PREFIX.length + 8),
  }
}

export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

/**
 * Extract an API key from a request. Supports:
 *   Authorization: Bearer <key>
 *   X-API-Key: <key>
 */
export function extractApiKey(request: Request): string | null {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7).trim()
    if (token.length > 0) return token
  }
  const headerKey = request.headers.get('x-api-key')
  if (headerKey && headerKey.trim().length > 0) return headerKey.trim()
  return null
}

// ── Authentication ─────────────────────────────────────────────────────────

export interface ApiKeyContext {
  id: string
  name: string
  permissions: string[]
  /** ID of the user that created the key. Used as authorId for new posts. */
  createdById: string
}

export type ApiKeyAuthResult =
  | { apiKey: ApiKeyContext; error?: never }
  | { apiKey?: never; error: { status: number; message: string } }

/**
 * Authenticate a request via API key. Does NOT check permissions —
 * use hasPermission() or requireApiPermission() from '@/lib/apiAuth' for that.
 */
export async function authenticateApiKey(request: Request): Promise<ApiKeyAuthResult> {
  const plaintext = extractApiKey(request)
  if (!plaintext) {
    return { error: { status: 401, message: 'Missing API key. Provide it via the Authorization: Bearer header or X-API-Key header.' } }
  }

  // Fast-path reject before hitting the database
  if (!plaintext.startsWith(API_KEY_PREFIX)) {
    return { error: { status: 401, message: 'Invalid API key' } }
  }

  const record = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(plaintext) },
    select: {
      id: true,
      name: true,
      permissions: true,
      createdById: true,
      revoked: true,
      expiresAt: true,
    },
  })

  if (!record) {
    return { error: { status: 401, message: 'Invalid API key' } }
  }
  if (record.revoked) {
    return { error: { status: 401, message: 'API key has been revoked' } }
  }
  if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
    return { error: { status: 401, message: 'API key has expired' } }
  }

  let permissions: string[] = []
  try {
    permissions = sanitizePermissions(JSON.parse(record.permissions))
  } catch {
    // Treat unparseable permissions as "no permissions"
  }

  prisma.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => { /* non-critical */ })

  return {
    apiKey: {
      id: record.id,
      name: record.name,
      permissions,
      createdById: record.createdById,
    },
  }
}
