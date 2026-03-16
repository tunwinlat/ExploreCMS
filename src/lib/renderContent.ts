/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { marked } from 'marked'
import { sanitizeContent } from '@/lib/sanitize'

/**
 * Render post content to sanitized HTML based on the content format.
 * - "html" posts are sanitized directly
 * - "markdown" posts are converted to HTML via marked, then sanitized
 */
export async function renderPostContent(
  content: string,
  contentFormat?: string | null
): Promise<string> {
  if (contentFormat === 'markdown') {
    const html = await marked(content)
    return sanitizeContent(html)
  }
  return sanitizeContent(content)
}

/**
 * Extract a plain-text excerpt from post content regardless of format.
 */
export function getExcerpt(content: string, contentFormat?: string | null, maxLength = 200): string {
  if (contentFormat === 'markdown') {
    // Strip markdown syntax for excerpt
    const plain = content
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // images
      .replace(/\[[^\]]*\]\([^)]+\)/g, (m) => m.replace(/\[([^\]]*)\]\([^)]+\)/, '$1')) // links -> text
      .replace(/#{1,6}\s*/g, '') // headers
      .replace(/[*_~`]+/g, '') // bold/italic/code
      .replace(/>\s*/g, '') // blockquotes
      .replace(/[-*+]\s+/g, '') // list items
      .replace(/\n+/g, ' ')
      .trim()
    return plain.substring(0, maxLength) + (plain.length > maxLength ? '...' : '')
  }
  // HTML format
  const plain = content.replace(/<[^>]*>?/gm, '').trim()
  return plain.substring(0, maxLength) + (plain.length > maxLength ? '...' : '')
}

/**
 * Extract the first image URL from post content regardless of format.
 */
export function getFirstImage(content: string, contentFormat?: string | null): string | null {
  if (contentFormat === 'markdown') {
    const match = content.match(/!\[[^\]]*\]\(([^)]+)\)/)
    return match ? match[1] : null
  }
  // HTML format
  const match = content.match(/<img[^>]+src="([^">]+)"/)
  return match ? match[1] : null
}
