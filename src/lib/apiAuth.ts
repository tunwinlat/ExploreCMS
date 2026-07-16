/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Authorization guard for the /api/v1 REST endpoints.
 * Combines API key authentication, per-key permission checks and rate limiting.
 */

import { NextResponse } from 'next/server'
import { authenticateApiKey, hasPermission, type ApiKeyContext } from '@/lib/apiKeys'
import { ensureMigrations } from '@/lib/db-init'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'

export type ApiAuthResult =
  | { apiKey: ApiKeyContext; error?: never }
  | { apiKey?: never; error: NextResponse }

/**
 * Authenticate the request's API key and assert it holds the given permission.
 *
 * Usage:
 *   const auth = await requireApiPermission(req, 'posts:create')
 *   if (auth.error) return auth.error
 *   // auth.apiKey is available here
 *
 * Rate limiting is applied per client IP: read limits for "*:read"
 * permissions, stricter write limits for everything else.
 */
export async function requireApiPermission(
  request: Request,
  permission: string
): Promise<ApiAuthResult> {
  const isRead = permission.endsWith(':read')
  const limits = isRead ? RATE_LIMITS.apiRead : RATE_LIMITS.apiWrite

  const clientIP = getClientIP(request)
  const rateLimit = checkRateLimit(clientIP, limits)
  if (!rateLimit.success) {
    return {
      error: NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: { 'X-RateLimit-Reset': String(rateLimit.resetTime) } }
      ),
    }
  }

  // Ensure the ApiKey table exists even if this cold instance's first request
  // is an API call (schema auto-migration otherwise runs on page renders).
  // Idempotent and a no-op for local file: databases.
  await ensureMigrations()

  const auth = await authenticateApiKey(request)
  if (auth.error) {
    return {
      error: NextResponse.json({ error: auth.error.message }, { status: auth.error.status }),
    }
  }

  if (!hasPermission(auth.apiKey.permissions, permission)) {
    return {
      error: NextResponse.json(
        { error: `API key is missing the required permission: ${permission}` },
        { status: 403 }
      ),
    }
  }

  return { apiKey: auth.apiKey }
}
