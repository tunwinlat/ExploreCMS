/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Validates and normalizes URLs to prevent Stored XSS via dangerous protocols like javascript:
 * Allows absolute http/https URLs and valid relative paths.
 */
export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    // Attempt to parse strictly without a base URL to ensure it's absolute
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    // If parsing without a base fails, check if it's a valid relative path
    if (url.startsWith("/")) return url;
    return null;
  }
}
