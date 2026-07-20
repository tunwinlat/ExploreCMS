/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPostDb } from '@/lib/bunnyDb'
import { GET } from './route'

vi.mock('@/lib/bunnyDb', () => ({
  getPostDb: vi.fn(),
}))

describe('GET /api/related', () => {
  const findUnique = vi.fn()
  const findMany = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPostDb).mockResolvedValue({
      post: { findUnique, findMany },
    } as never)

    findUnique.mockResolvedValue({
      id: 'current-post',
      slug: 'current-post',
      translationGroupId: null,
      tags: [{ id: 'shared-tag' }],
    })
  })

  it('returns related posts that do not contain an image', async () => {
    const textOnlyPost = {
      id: 'text-only-post',
      title: 'A text-only post',
      slug: 'text-only-post',
      content: '<p>This post has no image.</p>',
      contentFormat: 'html',
      createdAt: new Date('2026-07-01'),
      author: { username: 'author', firstName: null },
      tags: [{ id: 'shared-tag', name: 'News', slug: 'news' }],
      views: [],
    }

    findMany
      .mockResolvedValueOnce([textOnlyPost])
      .mockResolvedValueOnce([])

    const response = await GET(new Request('http://localhost/api/related?slug=current-post&limit=3'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.posts).toEqual([
      expect.objectContaining({ id: 'text-only-post', content: '<p>This post has no image.</p>' }),
    ])
    expect(findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ take: 3 }))
  })

  it('fills empty slots with recent posts while excluding existing results and the current post', async () => {
    const tagMatch = { id: 'tag-match' }
    const recentPost = { id: 'recent-post' }

    findUnique.mockResolvedValue({
      id: 'current-post',
      slug: 'current-post',
      translationGroupId: 'current-group',
      tags: [{ id: 'shared-tag' }],
    })

    findMany
      .mockResolvedValueOnce([tagMatch])
      .mockResolvedValueOnce([recentPost])

    const response = await GET(new Request('http://localhost/api/related?slug=current-post&limit=3'))
    const data = await response.json()

    expect(data.posts).toEqual([tagMatch, recentPost])
    expect(findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({
        OR: [
          { translationGroupId: null },
          { translationGroupId: { not: 'current-group' } },
        ],
      }),
    }))
    expect(findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({
        id: { notIn: ['current-post', 'tag-match'] },
        OR: [
          { translationGroupId: null },
          { translationGroupId: { not: 'current-group' } },
        ],
      }),
      take: 2,
    }))
  })
})
