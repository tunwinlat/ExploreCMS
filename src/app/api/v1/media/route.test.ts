/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { prisma } from '@/lib/db'
import { storeImage, MAX_IMAGE_FILE_SIZE } from '@/lib/upload'

vi.mock('@/lib/db', () => ({
  prisma: {
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
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

vi.mock('@/lib/upload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/upload')>()
  return {
    ...actual,
    storeImage: vi.fn().mockResolvedValue('/uploads/test.png'),
  }
})

const mockKeyFindUnique = prisma.apiKey.findUnique as unknown as ReturnType<typeof vi.fn>
const mockStoreImage = storeImage as unknown as ReturnType<typeof vi.fn>

const PLAINTEXT_KEY = 'ecms_testkey123'

// Minimal valid PNG: magic bytes + padding to satisfy the 12-byte minimum
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 1, 2, 3, 4])

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

function uploadRequest(file: File | null, key: string | null = PLAINTEXT_KEY): Request {
  const formData = new FormData()
  if (file) formData.append('file', file)
  return new Request('http://localhost/api/v1/media', {
    method: 'POST',
    body: formData,
    headers: key ? { authorization: `Bearer ${key}` } : {},
  })
}

function pngFile(): File {
  return new File([PNG_BYTES], 'test.png', { type: 'image/png' })
}

describe('POST /api/v1/media', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without an API key', async () => {
    const res = await POST(uploadRequest(pngFile(), null))
    expect(res.status).toBe(401)
  })

  it('returns 403 when the key lacks media:create', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:create', 'posts:read']))
    const res = await POST(uploadRequest(pngFile()))
    expect(res.status).toBe(403)
  })

  it('returns 403 for a posts:* key', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['posts:*']))
    const res = await POST(uploadRequest(pngFile()))
    expect(res.status).toBe(403)
  })

  it('returns 400 when no file is uploaded', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['media:create']))
    const res = await POST(uploadRequest(null))
    expect(res.status).toBe(400)
  })

  it('returns 413 for an oversized file', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['media:create']))
    const big = new File([new Uint8Array(MAX_IMAGE_FILE_SIZE + 1)], 'big.png', { type: 'image/png' })
    const res = await POST(uploadRequest(big))
    expect(res.status).toBe(413)
  })

  it('returns 415 for a disallowed MIME type', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['media:create']))
    const file = new File([PNG_BYTES], 'notes.txt', { type: 'text/plain' })
    const res = await POST(uploadRequest(file))
    expect(res.status).toBe(415)
  })

  it('returns 415 when the content does not match the declared type', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['media:create']))
    const fake = new File([new Uint8Array(16)], 'fake.png', { type: 'image/png' })
    const res = await POST(uploadRequest(fake))
    expect(res.status).toBe(415)
  })

  it('returns 201 with the stored URL for a valid upload', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['media:create']))
    const res = await POST(uploadRequest(pngFile()))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toEqual({ url: '/uploads/test.png' })
    expect(mockStoreImage).toHaveBeenCalledOnce()
  })

  it('accepts a media:* wildcard key', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['media:*']))
    const res = await POST(uploadRequest(pngFile()))
    expect(res.status).toBe(201)
  })

  it('accepts a full-access (*) key', async () => {
    mockKeyFindUnique.mockResolvedValue(keyRecordWith(['*']))
    const res = await POST(uploadRequest(pngFile()))
    expect(res.status).toBe(201)
  })
})
