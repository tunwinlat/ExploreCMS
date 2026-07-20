/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import sitemap from './sitemap'
import { getSettings } from '@/lib/settings-cache'
import { prisma } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  prisma: {
    post: { findMany: vi.fn() },
    project: { findMany: vi.fn() },
    photoAlbum: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/settings-cache', () => ({
  getSettings: vi.fn(),
}))

const settingsWithUrl = {
  title: 'My Blog',
  seoSiteUrl: 'https://blog.example.com',
  enabledComponents: '["blog","projects","photos"]',
  defaultComponent: 'blog',
}

describe('sitemap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.post.findMany).mockResolvedValue([])
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    vi.mocked(prisma.photoAlbum.findMany).mockResolvedValue([])
  })

  it('returns an empty sitemap when no site URL is configured', async () => {
    vi.mocked(getSettings).mockResolvedValue({ seoSiteUrl: null } as any)

    const result = await sitemap()

    expect(result).toEqual([])
    expect(prisma.post.findMany).not.toHaveBeenCalled()
  })

  it('lists static routes and published content with absolute URLs', async () => {
    vi.mocked(getSettings).mockResolvedValue(settingsWithUrl as any)
    vi.mocked(prisma.post.findMany).mockResolvedValue([
      { slug: 'hello-world', updatedAt: new Date('2026-03-01T00:00:00Z') },
    ] as any)
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      { slug: 'cool-app', updatedAt: new Date('2026-02-01T00:00:00Z') },
    ] as any)
    vi.mocked(prisma.photoAlbum.findMany).mockResolvedValue([
      { slug: 'trips', updatedAt: new Date('2026-01-01T00:00:00Z') },
    ] as any)

    const result = await sitemap()
    const urls = result.map((entry) => entry.url)

    expect(urls).toContain('https://blog.example.com')
    expect(urls).toContain('https://blog.example.com/blog')
    expect(urls).toContain('https://blog.example.com/projects')
    expect(urls).toContain('https://blog.example.com/photos')
    expect(urls).toContain('https://blog.example.com/post/hello-world')
    expect(urls).toContain('https://blog.example.com/projects/cool-app')
    expect(urls).toContain('https://blog.example.com/photos/trips')

    const postEntry = result.find((e) => e.url.endsWith('/post/hello-world'))
    expect(postEntry?.lastModified).toEqual(new Date('2026-03-01T00:00:00Z'))

    // noindex posts are excluded from the sitemap query
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { published: true, seoNoIndex: false } })
    )
  })

  it('omits disabled components', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ...settingsWithUrl,
      enabledComponents: '["blog"]',
    } as any)

    const result = await sitemap()
    const urls = result.map((entry) => entry.url)

    expect(urls).toContain('https://blog.example.com/blog')
    expect(urls).not.toContain('https://blog.example.com/projects')
    expect(urls).not.toContain('https://blog.example.com/photos')
    expect(prisma.project.findMany).not.toHaveBeenCalled()
    expect(prisma.photoAlbum.findMany).not.toHaveBeenCalled()
  })
})
