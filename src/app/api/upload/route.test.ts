/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from './route'
import { verifySession } from '@/lib/auth'
import { createWriteStream, mkdirSync, existsSync } from 'fs'

// Mocking dependencies
vi.mock('@/lib/auth', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    siteSettings: {
      findUnique: vi.fn().mockResolvedValue({
        bunnyStorageEnabled: false,
      }),
    },
  },
}))

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ success: true }),
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  RATE_LIMITS: { upload: { windowMs: 60000, maxRequests: 10 } },
}))

vi.mock('fs', () => ({
  createWriteStream: vi.fn(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn(),
}))

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid'),
}))

describe('POST /api/upload', () => {
  let originalConsoleError: typeof console.error;
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    vi.clearAllMocks()
    originalConsoleError = console.error
    originalConsoleLog = console.log
    console.error = vi.fn() // Silence console.error for tests
    console.log = vi.fn() // Silence console.log for tests
  })

  afterEach(() => {
    console.error = originalConsoleError
    console.log = originalConsoleLog
  })

  it('returns 401 if unauthorized', async () => {
    vi.mocked(verifySession).mockResolvedValue(null)
    const req = new Request('http://localhost')

    const res = await POST(req)
    expect(res.status).toBe(401)

    const json = await res.json()
    expect(json).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 if no file is uploaded', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 1 })

    const formData = new FormData() // empty
    const req = {
      formData: async () => formData
    } as unknown as Request

    const res = await POST(req)
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json).toEqual({ error: 'No file uploaded' })
  })

  it('returns 415 if file type is invalid', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 1 })

    const formData = new FormData()
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    formData.append('file', file)

    const req = {
      formData: async () => formData
    } as unknown as Request

    const res = await POST(req)
    expect(res.status).toBe(415)

    const json = await res.json()
    expect(json).toEqual({ error: 'Invalid file type. Only images are allowed.' })
  })

  it('uploads a file successfully', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 1 })
    vi.mocked(existsSync).mockReturnValue(false) // simulate dir not exists

    const formData = new FormData()
    // Provide a valid PNG magic byte signature so validation passes
    const validPngBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
    const file = new File([validPngBuffer], 'test.png', { type: 'image/png' })
    formData.append('file', file)

    const req = {
      formData: async () => formData
    } as unknown as Request

    const mockStream = {
      write: vi.fn(),
      end: vi.fn(),
    }
    vi.mocked(createWriteStream).mockReturnValue(mockStream as any)

    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json).toEqual({ url: '/uploads/mock-uuid.png' })

    expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('uploads'), { recursive: true })
    expect(createWriteStream).toHaveBeenCalled()
    expect(mockStream.write).toHaveBeenCalled()
    expect(mockStream.end).toHaveBeenCalled()
  })

  it('returns 500 when an error is thrown', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 1 })

    // Force an error to be thrown by rejecting formData()
    const req = {
      formData: async () => { throw new Error('Stream error') }
    } as unknown as Request

    const res = await POST(req)
    expect(res.status).toBe(500)

    const json = await res.json()
    expect(json).toEqual({ error: 'Failed to upload file' })
  })
})
