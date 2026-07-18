/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockFindMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  }
})

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidateTag: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    post: {
      findMany: mockFindMany,
    },
  },
}))

import { getBlogPageData } from '@/lib/blog-cache'

function createPost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'post-1',
    title: 'Post 1',
    slug: 'post-1',
    contentFormat: 'html',
    isFeatured: false,
    createdAt: new Date(),
    translationGroupId: null,
    author: { username: 'author', firstName: null },
    tags: [],
    views: { totalViews: 3, uniqueViews: 2 },
    ...overrides,
  }
}

describe('getBlogPageData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DATABASE_URL = 'file:./test.db'
  })

  it('does not substitute recent posts when there are no featured posts', async () => {
    mockFindMany.mockResolvedValue([createPost()])

    const result = await getBlogPageData()

    expect(result.featuredPosts).toEqual([])
    expect(result.latestPosts).toHaveLength(1)
  })

  it('loads both total and unique view counts for listing components', async () => {
    mockFindMany.mockResolvedValue([createPost()])

    await getBlogPageData()

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        views: {
          select: { totalViews: true, uniqueViews: true },
        },
      }),
    }))
  })
})
