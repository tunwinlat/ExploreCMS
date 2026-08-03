/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PUT, PATCH } from './route'
import { prisma } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  prisma: {
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    profile: {
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
const mockProfileFindUnique = prisma.profile.findUnique as unknown as ReturnType<typeof vi.fn>
const mockProfileUpsert = prisma.profile.upsert as unknown as ReturnType<typeof vi.fn>

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

function storedProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'singleton',
    fullName: 'Tun Win Lat',
    headline: 'Ops Tech',
    avatarUrl: null,
    location: '',
    email: '',
    phone: '',
    website: '',
    summary: '',
    availability: '',
    resumeUrl: null,
    links: '[]',
    experience: '[]',
    education: '[]',
    skills: '[]',
    certifications: '[]',
    languages: '[]',
    interests: '[]',
    showProjects: true,
    projectsHeading: 'Projects',
    updatedAt: new Date('2026-08-02T00:00:00Z'),
    ...overrides,
  }
}

describe('GET /api/v1/profile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without an API key', async () => {
    const res = await GET(new Request('http://localhost/api/v1/profile'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when the key lacks profile:read', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:read']))
    const res = await GET(authedRequest('http://localhost/api/v1/profile'))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toMatch(/profile:read/)
  })

  it('returns defaults when no profile row exists', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['profile:read']))
    mockProfileFindUnique.mockResolvedValue(null)

    const res = await GET(authedRequest('http://localhost/api/v1/profile'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.profile.id).toBe('singleton')
    expect(data.profile.fullName).toBe('')
    expect(data.profile.experience).toEqual([])
    expect(data.profile.showProjects).toBe(true)
  })

  it('returns the profile with parsed sections', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['profile:read']))
    mockProfileFindUnique.mockResolvedValue(storedProfile({
      skills: JSON.stringify([{ name: 'Intune', category: 'Endpoint' }]),
      experience: JSON.stringify([{ title: 'Tech', company: 'Acme', location: '', startDate: '2023', endDate: '', current: true, description: '' }]),
    }))

    const res = await GET(authedRequest('http://localhost/api/v1/profile'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.profile.fullName).toBe('Tun Win Lat')
    expect(data.profile.skills).toEqual([{ name: 'Intune', category: 'Endpoint' }])
    expect(data.profile.experience[0].current).toBe(true)
    expect(data.profile.updatedAt).toBe('2026-08-02T00:00:00.000Z')
  })
})

describe('PUT /api/v1/profile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 403 when the key lacks profile:update', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['profile:read']))
    const res = await PUT(authedRequest('http://localhost/api/v1/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fullName: 'X' }),
    }))
    expect(res.status).toBe(403)
  })

  it('replaces all fields, resetting omitted ones to defaults', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['profile:update']))
    mockProfileUpsert.mockResolvedValue(storedProfile())

    const res = await PUT(authedRequest('http://localhost/api/v1/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Tun Win Lat',
        skills: [{ name: 'Intune', category: 'Endpoint' }],
      }),
    }))
    expect(res.status).toBe(200)

    const upsertArg = mockProfileUpsert.mock.calls[0][0]
    expect(upsertArg.where).toEqual({ id: 'singleton' })
    expect(upsertArg.create.fullName).toBe('Tun Win Lat')
    expect(upsertArg.create.skills).toBe(JSON.stringify([{ name: 'Intune', category: 'Endpoint' }]))
    // Omitted fields reset on full replace
    expect(upsertArg.create.headline).toBe('')
    expect(upsertArg.create.experience).toBe('[]')
    expect(upsertArg.create.showProjects).toBe(true)
  })

  it('rejects invalid section shapes', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['profile:update']))
    const res = await PUT(authedRequest('http://localhost/api/v1/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ skills: 'not-an-array' }),
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/skills must be an array/)
  })

  it('rejects invalid email', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['profile:update']))
    const res = await PUT(authedRequest('http://localhost/api/v1/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    }))
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/v1/profile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates only the provided fields', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['profile:update']))
    mockProfileUpsert.mockResolvedValue(storedProfile({ headline: 'New headline' }))

    const res = await PATCH(authedRequest('http://localhost/api/v1/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ headline: 'New headline' }),
    }))
    expect(res.status).toBe(200)

    const upsertArg = mockProfileUpsert.mock.calls[0][0]
    expect(upsertArg.update).toEqual({ headline: 'New headline' })
    expect(upsertArg.update.fullName).toBeUndefined()
  })

  it('rejects an empty body', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['profile:update']))
    const res = await PATCH(authedRequest('http://localhost/api/v1/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(400)
  })
})
