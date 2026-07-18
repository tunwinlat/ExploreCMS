/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { prisma } from '@/lib/db'
import { hashApiKey } from '@/lib/apiKeys'

vi.mock('@/lib/db', () => ({
  prisma: {
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    post: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    postIdempotencyKey: {
      findUnique: vi.fn(),
      create: vi.fn(),
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
const mockPostFindMany = prisma.post.findMany as unknown as ReturnType<typeof vi.fn>
const mockPostFindUnique = prisma.post.findUnique as unknown as ReturnType<typeof vi.fn>
const mockPostCreate = prisma.post.create as unknown as ReturnType<typeof vi.fn>
const mockIdempotencyFindUnique = prisma.postIdempotencyKey.findUnique as unknown as ReturnType<typeof vi.fn>

const PLAINTEXT_KEY = 'ecms_testkey123'

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

function authedRequest(url: string, init?: RequestInit): Request {
  return new Request(url, {
    ...init,
    headers: {
      authorization: `Bearer ${PLAINTEXT_KEY}`,
      ...(init?.headers || {}),
    },
  })
}

describe('GET /api/v1/posts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without an API key', async () => {
    const res = await GET(new Request('http://localhost/api/v1/posts'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when the key lacks posts:read', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['projects:read']))
    const res = await GET(authedRequest('http://localhost/api/v1/posts'))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toMatch(/posts:read/)
  })

  it('lists posts for an authorized key', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:read']))
    mockPostFindMany.mockResolvedValue([{ id: 'p1', title: 'Hello' }])

    const res = await GET(authedRequest('http://localhost/api/v1/posts?published=true&limit=10'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.posts).toHaveLength(1)
    expect(data.nextCursor).toBeUndefined()

    expect(mockKeyFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { keyHash: hashApiKey(PLAINTEXT_KEY) } })
    )
    expect(mockPostFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { published: true },
        take: 11,
      })
    )
  })

  it('supports the resource wildcard permission', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:*']))
    mockPostFindMany.mockResolvedValue([])

    const res = await GET(authedRequest('http://localhost/api/v1/posts'))
    expect(res.status).toBe(200)
  })

  it('returns a nextCursor when more posts exist', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:read']))
    const posts = Array.from({ length: 21 }, (_, i) => ({ id: `p${i + 1}` }))
    mockPostFindMany.mockResolvedValue(posts)

    const res = await GET(authedRequest('http://localhost/api/v1/posts?limit=20'))
    const data = await res.json()
    expect(data.posts).toHaveLength(20)
    expect(data.nextCursor).toBe('p21')
  })
})

describe('POST /api/v1/posts', () => {
  beforeEach(() => vi.clearAllMocks())

  const validBody = JSON.stringify({ title: 'New post', content: '# Hello', published: true, tags: ['api', 'test'] })

  it('returns 403 when the key lacks posts:create', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:read']))
    const res = await POST(authedRequest('http://localhost/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: validBody,
    }))
    expect(res.status).toBe(403)
    expect(mockPostCreate).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid JSON', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:create']))
    const res = await POST(authedRequest('http://localhost/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid',
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when title is missing', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:create']))
    const res = await POST(authedRequest('http://localhost/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '# No title' }),
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/title/i)
  })

  it('creates a post and attributes it to the key owner', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:create']))
    mockPostFindUnique.mockResolvedValue(null) // no slug conflict
    const created = { id: 'post-1', title: 'New post', slug: 'new-post', translationGroupId: null }
    mockPostCreate.mockResolvedValue(created)

    const res = await POST(authedRequest('http://localhost/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: validBody,
    }))

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.post.id).toBe('post-1')

    expect(mockPostCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'New post',
          slug: 'new-post',
          published: true,
          authorId: 'user-1',
        }),
      })
    )

    // Tags are connected via connectOrCreate
    const createArgs = mockPostCreate.mock.calls[0][0]
    expect(createArgs.data.tags.connectOrCreate).toHaveLength(2)

    // translationGroupId backfill for base posts
    expect(prisma.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'post-1' },
        data: { translationGroupId: 'post-1' },
      })
    )
  })

  it('replays the original post for the same Idempotency-Key', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:create']))
    mockPostFindUnique.mockResolvedValue(null)
    const created = {
      id: 'post-idempotent',
      title: 'New post',
      slug: 'new-post',
      authorId: 'user-1',
      translationGroupId: 'post-idempotent',
    }
    mockPostCreate.mockResolvedValue(created)
    mockIdempotencyFindUnique
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(async () => ({
        requestHash: mockPostCreate.mock.calls[0][0].data.idempotencyKeys.create.requestHash,
        post: created,
      }))

    const first = await POST(authedRequest('http://localhost/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Idempotency-Key': 'request-123' },
      body: validBody,
    }))
    const replay = await POST(authedRequest('http://localhost/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Idempotency-Key': 'request-123' },
      body: validBody,
    }))

    expect(first.status).toBe(201)
    expect(replay.status).toBe(200)
    expect(replay.headers.get('Idempotent-Replayed')).toBe('true')
    expect((await replay.json()).post.id).toBe('post-idempotent')
    expect(mockPostCreate).toHaveBeenCalledTimes(1)
    expect(mockPostCreate.mock.calls[0][0].data.idempotencyKeys.create).toEqual(
      expect.objectContaining({ authorId: 'user-1', keyHash: expect.stringMatching(/^[a-f0-9]{64}$/) })
    )
  })

  it('accepts idempotencyKey in the request body', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:create']))
    mockIdempotencyFindUnique.mockResolvedValue(null)
    mockPostFindUnique.mockResolvedValue(null)
    mockPostCreate.mockResolvedValue({ id: 'post-body-key', translationGroupId: 'post-body-key' })

    const res = await POST(authedRequest('http://localhost/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'New post', content: '# Hello', idempotencyKey: 'body-key' }),
    }))

    expect(res.status).toBe(201)
    expect(mockPostCreate.mock.calls[0][0].data.idempotencyKeys.create.keyHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('returns 409 when an Idempotency-Key is reused with a different request', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:create']))
    mockIdempotencyFindUnique.mockResolvedValue({
      requestHash: 'hash-from-the-first-request',
      post: { id: 'original-post' },
    })

    const res = await POST(authedRequest('http://localhost/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Idempotency-Key': 'reused-key' },
      body: validBody,
    }))

    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/different request/i)
    expect(mockPostCreate).not.toHaveBeenCalled()
  })

  it('returns the winner when concurrent requests race on the same Idempotency-Key', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:create']))
    mockPostFindUnique.mockResolvedValue(null)
    const winner = {
      id: 'concurrent-winner',
      title: 'New post',
      slug: 'new-post',
      authorId: 'user-1',
      translationGroupId: 'concurrent-winner',
    }
    mockPostCreate.mockRejectedValue({ code: 'P2002' })
    mockIdempotencyFindUnique
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(async () => ({
        requestHash: mockPostCreate.mock.calls[0][0].data.idempotencyKeys.create.requestHash,
        post: winner,
      }))

    const res = await POST(authedRequest('http://localhost/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Idempotency-Key': 'concurrent-key' },
      body: validBody,
    }))

    expect(res.status).toBe(200)
    expect(res.headers.get('Idempotent-Replayed')).toBe('true')
    expect((await res.json()).post.id).toBe('concurrent-winner')
  })

  it('rejects different header and body idempotency keys', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:create']))

    const res = await POST(authedRequest('http://localhost/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Idempotency-Key': 'header-key' },
      body: JSON.stringify({ title: 'New post', content: '# Hello', idempotencyKey: 'body-key' }),
    }))

    expect(res.status).toBe(400)
    expect(mockPostCreate).not.toHaveBeenCalled()
  })

  it('returns the existing post for an exact title and slug collision', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:create']))
    mockPostFindUnique.mockResolvedValue({
      id: 'existing-post',
      title: '  NEW   POST ',
      slug: 'new-post',
      authorId: 'user-1',
    })

    const res = await POST(authedRequest('http://localhost/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: validBody,
    }))

    expect(res.status).toBe(200)
    expect(res.headers.get('Post-Already-Exists')).toBe('true')
    expect((await res.json()).post.id).toBe('existing-post')
    expect(mockPostCreate).not.toHaveBeenCalled()
  })

  it('resolves a concurrent exact collision without creating a suffix duplicate', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:create']))
    const winner = { id: 'winner', title: 'New post', slug: 'new-post', authorId: 'user-1' }
    mockPostFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(winner)
    mockPostCreate.mockRejectedValue({ code: 'P2002' })

    const res = await POST(authedRequest('http://localhost/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: validBody,
    }))

    expect(res.status).toBe(200)
    expect((await res.json()).post.id).toBe('winner')
    expect(mockPostCreate).toHaveBeenCalledTimes(1)
  })

  it('only adds a timestamp suffix when a different title owns the slug', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:create']))
    mockPostFindUnique.mockResolvedValue({
      id: 'other-post',
      title: 'New: post!',
      slug: 'new-post',
      authorId: 'user-1',
    })
    mockPostCreate.mockResolvedValue({ id: 'post-2', translationGroupId: 'post-2' })

    const res = await POST(authedRequest('http://localhost/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: validBody,
    }))

    expect(res.status).toBe(201)
    const createArgs = mockPostCreate.mock.calls[0][0]
    expect(createArgs.data.slug).toMatch(/^new-post-\d+$/)
  })

  it('allows a different-language translation to use a suffixed slug', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:create']))
    mockPostFindUnique.mockResolvedValue({
      id: 'english-post',
      title: 'New post',
      slug: 'new-post',
      language: 'en',
      authorId: 'user-1',
    })
    mockPostCreate.mockResolvedValue({ id: 'spanish-post', translationGroupId: 'english-post' })

    const res = await POST(authedRequest('http://localhost/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'New post',
        content: '# Hola',
        language: 'es',
        translationGroupId: 'english-post',
      }),
    }))

    expect(res.status).toBe(201)
    expect(mockPostCreate.mock.calls[0][0].data.slug).toMatch(/^new-post-\d+$/)
  })

  it('returns 409 for an exact collision owned by another author', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:create']))
    mockPostFindUnique.mockResolvedValue({
      id: 'other-post',
      title: 'New post',
      slug: 'new-post',
      authorId: 'user-2',
    })

    const res = await POST(authedRequest('http://localhost/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: validBody,
    }))

    expect(res.status).toBe(409)
    expect(mockPostCreate).not.toHaveBeenCalled()
  })
})
