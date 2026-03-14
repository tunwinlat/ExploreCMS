/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import sanitizeHtml from 'sanitize-html'

/**
 * Sanitize HTML content produced by the TipTap editor before rendering.
 * Allows the rich-text tags and attributes that TipTap generates while
 * blocking dangerous elements such as <script>, event handlers, and
 * javascript: URLs.
 */
export function sanitizeContent(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      // Block elements
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'blockquote', 'pre', 'hr',
      'ul', 'ol', 'li',
      'div', 'section', 'article',
      'br',
      // Inline elements
      'strong', 'b', 'em', 'i', 'u', 's', 'code', 'mark', 'small', 'sub', 'sup',
      'a', 'span',
      // Media
      'img', 'figure', 'figcaption',
      // Table
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col',
      // TipTap task lists
      'input',
      // YouTube iframe (TipTap embeds via iframe)
      'iframe',
    ],
    allowedAttributes: {
      '*': ['class', 'style'],
      'a': ['href', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height', 'loading'],
      'iframe': ['src', 'width', 'height', 'allowfullscreen', 'frameborder', 'allow'],
      'input': ['type', 'checked', 'disabled'],
      'th': ['colspan', 'rowspan'],
      'td': ['colspan', 'rowspan'],
      'col': ['span'],
    },
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com'],
    // Ensure links with javascript: are stripped
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
    // Strip event handler attributes and dangerous protocols
    disallowedTagsMode: 'discard',
  })
}
