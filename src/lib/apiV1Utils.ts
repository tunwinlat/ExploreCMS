/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Shared helpers for the /api/v1 REST endpoints.
 */

import { NextResponse } from 'next/server'

export function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

/**
 * Safely parse a JSON request body.
 * Returns { data } on success or { error: NextResponse } with a 400 status.
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const data = (await request.json()) as T
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return { error: NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 }) }
    }
    return { data }
  } catch {
    return { error: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  }
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function notFound(message = 'Resource not found'): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function serverError(message = 'Internal server error'): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 })
}

/**
 * Parse pagination query params shared by list endpoints.
 * limit defaults to 20, capped at 100.
 */
export function parsePagination(searchParams: URLSearchParams): { limit: number; cursor: string | null } {
  const rawLimit = parseInt(searchParams.get('limit') || '20', 10)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20
  const cursor = searchParams.get('cursor')
  return { limit, cursor }
}

/**
 * Validate a URL string if present. Returns the URL if valid, null if the
 * input was empty, or throws if non-empty but invalid.
 */
export function validateOptionalUrl(value: unknown, field: string): string | null | { error: string } {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return { error: `${field} must be a string` }
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
    return value
  } catch {
    return { error: `${field} must be a valid http(s) URL` }
  }
}

export function isUrlError(result: unknown): result is { error: string } {
  return typeof result === 'object' && result !== null && 'error' in result
}
