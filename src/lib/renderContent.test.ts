/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect } from 'vitest'
import { getFirstImage } from './renderContent'

describe('getFirstImage', () => {
  describe('Markdown format', () => {
    it('should extract the URL from a single markdown image', () => {
      const content = '![Alt text](https://example.com/image.jpg)'
      const result = getFirstImage(content, 'markdown')
      expect(result).toBe('https://example.com/image.jpg')
    })

    it('should extract the URL from the first of multiple markdown images', () => {
      const content = '![First](https://example.com/1.jpg) ![Second](https://example.com/2.jpg)'
      const result = getFirstImage(content, 'markdown')
      expect(result).toBe('https://example.com/1.jpg')
    })

    it('should return null if there are no markdown images', () => {
      const content = 'Just some text without images.'
      const result = getFirstImage(content, 'markdown')
      expect(result).toBeNull()
    })

    it('should handle empty alt text', () => {
      const content = '![](https://example.com/empty-alt.jpg)'
      const result = getFirstImage(content, 'markdown')
      expect(result).toBe('https://example.com/empty-alt.jpg')
    })

    it('should handle special characters in the URL', () => {
      const content = '![Alt](https://example.com/path?query=1&other=2#fragment)'
      const result = getFirstImage(content, 'markdown')
      expect(result).toBe('https://example.com/path?query=1&other=2#fragment')
    })
  })

  describe('HTML format', () => {
    it('should extract the URL from a single img tag', () => {
      const content = '<img src="https://example.com/image.png">'
      const result = getFirstImage(content, 'html')
      expect(result).toBe('https://example.com/image.png')
    })

    it('should extract the URL from the first of multiple img tags', () => {
      const content = '<img src="https://example.com/1.png"> <img src="https://example.com/2.png">'
      const result = getFirstImage(content, 'html')
      expect(result).toBe('https://example.com/1.png')
    })

    it('should return null if there are no img tags', () => {
      const content = '<p>Just some text without images.</p>'
      const result = getFirstImage(content, 'html')
      expect(result).toBeNull()
    })

    it('should handle attributes before and after src', () => {
      const content = '<img alt="description" src="https://example.com/attr.png" class="responsive">'
      const result = getFirstImage(content, 'html')
      expect(result).toBe('https://example.com/attr.png')
    })
  })

  describe('Default/Null format', () => {
    it('should default to HTML regex if no format is provided', () => {
      const content = '<img src="https://example.com/default.png">'
      const result = getFirstImage(content)
      expect(result).toBe('https://example.com/default.png')
    })

    it('should return null if no format is provided and no HTML image is found', () => {
      const content = '![Markdown image](https://example.com/md.png)'
      const result = getFirstImage(content)
      // The current implementation defaults to HTML if format is not 'markdown'
      expect(result).toBeNull()
    })
  })
})
