/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import robots from './robots'
import { getSettings } from '@/lib/settings-cache'

vi.mock('@/lib/settings-cache', () => ({
  getSettings: vi.fn(),
}))

describe('robots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows crawling of public pages and references the sitemap', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      seoSiteUrl: 'https://blog.example.com',
      seoRobotsIndex: true,
    } as any)

    const result = await robots()

    expect(result.rules).toEqual({
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    })
    expect(result.sitemap).toBe('https://blog.example.com/sitemap.xml')
  })

  it('blocks all crawlers when indexing is disabled', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      seoSiteUrl: 'https://blog.example.com',
      seoRobotsIndex: false,
    } as any)

    const result = await robots()

    expect(result.rules).toEqual({ userAgent: '*', disallow: '/' })
    expect(result.sitemap).toBeUndefined()
  })

  it('omits the sitemap reference without a site URL', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      seoSiteUrl: null,
      seoRobotsIndex: true,
    } as any)

    const result = await robots()

    expect(result.sitemap).toBeUndefined()
  })
})
