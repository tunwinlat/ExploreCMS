/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH } from './route'
import { prisma } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  prisma: {
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    siteSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
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
const mockSettingsFindUnique = prisma.siteSettings.findUnique as unknown as ReturnType<typeof vi.fn>
const mockSettingsUpsert = prisma.siteSettings.upsert as unknown as ReturnType<typeof vi.fn>

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

function patchRequest(body: unknown): Request {
  return authedRequest('http://localhost/api/v1/seo', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/v1/seo', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without an API key', async () => {
    const res = await GET(new Request('http://localhost/api/v1/seo'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when the key lacks seo:read', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['profile:read']))
    const res = await GET(authedRequest('http://localhost/api/v1/seo'))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toMatch(/seo:read/)
  })

  it('returns defaults when no settings row exists', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['seo:read']))
    mockSettingsFindUnique.mockResolvedValue(null)

    const res = await GET(authedRequest('http://localhost/api/v1/seo'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.seo.seoRobotsIndex).toBe(true)
    expect(data.seo.seoLlmsTxtEnabled).toBe(true)
    expect(data.seo.seoSiteUrl).toBeNull()
  })

  it('returns the stored SEO settings', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['seo:read']))
    mockSettingsFindUnique.mockResolvedValue({
      seoSiteUrl: 'https://www.tun.lat',
      seoDescription: 'Tun\u2019s Random Thoughts',
      seoOgImageUrl: null,
      seoTwitterHandle: null,
      seoRobotsIndex: true,
      seoGoogleVerification: 'goog-token',
      seoBingVerification: null,
      seoLlmsTxtEnabled: true,
    })

    const res = await GET(authedRequest('http://localhost/api/v1/seo'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.seo.seoSiteUrl).toBe('https://www.tun.lat')
    expect(data.seo.seoGoogleVerification).toBe('goog-token')
  })
})

describe('PATCH /api/v1/seo', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 403 when the key lacks seo:update', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['seo:read']))
    const res = await PATCH(patchRequest({ seoDescription: 'x' }))
    expect(res.status).toBe(403)
  })

  it('updates only the provided fields', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['seo:update']))
    mockSettingsUpsert.mockResolvedValue({ seoDescription: 'New description', seoRobotsIndex: true })

    const res = await PATCH(patchRequest({ seoDescription: 'New description' }))
    expect(res.status).toBe(200)

    const upsertArg = mockSettingsUpsert.mock.calls[0][0]
    expect(upsertArg.where).toEqual({ id: 'singleton' })
    expect(upsertArg.update).toEqual({ seoDescription: 'New description' })
  })

  it('normalizes a valid site URL and clears fields on empty string', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['seo:update']))
    mockSettingsUpsert.mockResolvedValue({})

    const res = await PATCH(patchRequest({ seoSiteUrl: 'https://www.tun.lat', seoTwitterHandle: '' }))
    expect(res.status).toBe(200)

    const upsertArg = mockSettingsUpsert.mock.calls[0][0]
    expect(upsertArg.update.seoSiteUrl).toBe('https://www.tun.lat/')
    expect(upsertArg.update.seoTwitterHandle).toBeNull()
  })

  it('rejects a non-absolute site URL', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['seo:update']))
    const res = await PATCH(patchRequest({ seoSiteUrl: '/relative/path' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/absolute URL/)
  })

  it('rejects an invalid OG image URL', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['seo:update']))
    const res = await PATCH(patchRequest({ seoOgImageUrl: 'javascript:alert(1)' }))
    expect(res.status).toBe(400)
  })

  it('rejects non-boolean toggles and empty bodies', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['seo:update']))

    const res = await PATCH(patchRequest({ seoRobotsIndex: 'yes' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/seoRobotsIndex must be a boolean/)

    const res2 = await PATCH(patchRequest({}))
    expect(res2.status).toBe(400)
  })
})
