/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Normalizes a URL and ensures it uses a safe protocol (http/https).
 * This prevents Stored XSS via javascript: or data: URIs in URL fields.
 */
export function normalizeUrl(url: string | null): string | null {
  if (!url) return null
  try {
    // Attempt to parse strictly without a base URL to ensure it's absolute
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString()
    }
    return null
  } catch {
    // If parsing without a base fails, check if it's a valid relative path
    if (url.startsWith('/')) return url
    return null
  }
}
