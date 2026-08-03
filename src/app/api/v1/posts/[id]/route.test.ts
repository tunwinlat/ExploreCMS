/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from './route'
import { prisma } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  prisma: {
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    post: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ success: true, limit: 100, remaining: 99, resetTime: Date.now() + 60000 }),
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  RATE_LIMITS: {
    apiRead: { windowMs: 60000, maxRequests: 60 },
    apiWrite: { windowMs: 60000, maxRequests: 10 },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

const mockKeyFindUnique = prisma.apiKey.findUnique as unknown as ReturnType<typeof vi.fn>
const mockPostFindUnique = prisma.post.findUnique as unknown as ReturnType<typeof vi.fn>
const mockPostUpdate = prisma.post.update as unknown as ReturnType<typeof vi.fn>

const PLAINTEXT_KEY = 'ecms_testkey123'
const PARAMS = Promise.resolve({ id: 'post-1' })

function keyRecordWith(permissions: string[]) {
  return {
    id: 'key-1',
    name: 'Test',
    permissions: JSON.stringify(permissions),
    createdById: 'user-1',
    revoked: false,
    expiresAt: null,
  }
}

function patchRequest(body: unknown): Request {
  return new Request('http://localhost/api/v1/posts/post-1', {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${PLAINTEXT_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/v1/posts/[id] — SEO overrides', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:update']))
    mockPostFindUnique.mockResolvedValue({ slug: 'hello-world' })
    mockPostUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'post-1', ...data }))
  })

  it('accepts SEO override fields and passes them to the update', async () => {
    const res = await PATCH(patchRequest({
      seoDescription: 'Custom meta description',
      seoOgImageUrl: '/uploads/og.png',
      seoCanonicalUrl: 'https://www.tun.lat/post/hello-world',
      seoNoIndex: true,
    }), { params: PARAMS })
    expect(res.status).toBe(200)

    const updateArg = mockPostUpdate.mock.calls[0][0]
    expect(updateArg.data.seoDescription).toBe('Custom meta description')
    expect(updateArg.data.seoOgImageUrl).toBe('/uploads/og.png')
    expect(updateArg.data.seoCanonicalUrl).toBe('https://www.tun.lat/post/hello-world')
    expect(updateArg.data.seoNoIndex).toBe(true)
  })

  it('clears SEO fields when null is passed', async () => {
    const res = await PATCH(patchRequest({ seoDescription: null, seoOgImageUrl: null }), { params: PARAMS })
    expect(res.status).toBe(200)

    const updateArg = mockPostUpdate.mock.calls[0][0]
    expect(updateArg.data.seoDescription).toBeNull()
    expect(updateArg.data.seoOgImageUrl).toBeNull()
  })

  it('rejects a relative canonical URL', async () => {
    const res = await PATCH(patchRequest({ seoCanonicalUrl: '/post/hello' }), { params: PARAMS })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/absolute URL/)
  })

  it('rejects an invalid OG image URL and non-boolean seoNoIndex', async () => {
    const res = await PATCH(patchRequest({ seoOgImageUrl: 'javascript:alert(1)' }), { params: PARAMS })
    expect(res.status).toBe(400)

    const res2 = await PATCH(patchRequest({ seoNoIndex: 'yes' }), { params: PARAMS })
    expect(res2.status).toBe(400)
    expect((await res2.json()).error).toMatch(/seoNoIndex must be a boolean/)
  })
})
