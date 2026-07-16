/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateApiKey,
  hashApiKey,
  extractApiKey,
  authenticateApiKey,
  hasPermission,
  sanitizePermissions,
  ALL_PERMISSIONS,
  API_KEY_PREFIX,
} from './apiKeys'
import { prisma } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  prisma: {
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

const mockFindUnique = prisma.apiKey.findUnique as unknown as ReturnType<typeof vi.fn>

describe('generateApiKey', () => {
  it('generates a key with the ecms_ prefix', () => {
    const { plaintext, hash, prefix } = generateApiKey()
    expect(plaintext.startsWith(API_KEY_PREFIX)).toBe(true)
    expect(plaintext.length).toBeGreaterThan(30)
    expect(prefix).toBe(plaintext.slice(0, API_KEY_PREFIX.length + 8))
    expect(hash).toBe(hashApiKey(plaintext))
  })

  it('generates unique keys each time', () => {
    const a = generateApiKey()
    const b = generateApiKey()
    expect(a.plaintext).not.toBe(b.plaintext)
    expect(a.hash).not.toBe(b.hash)
  })
})

describe('hashApiKey', () => {
  it('produces a stable sha256 hex digest', () => {
    const hash = hashApiKey('ecms_test')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hashApiKey('ecms_test')).toBe(hash)
  })
})

describe('extractApiKey', () => {
  it('extracts from Authorization: Bearer header', () => {
    const req = new Request('http://x', { headers: { authorization: 'Bearer ecms_abc123' } })
    expect(extractApiKey(req)).toBe('ecms_abc123')
  })

  it('extracts from X-API-Key header', () => {
    const req = new Request('http://x', { headers: { 'x-api-key': 'ecms_xyz' } })
    expect(extractApiKey(req)).toBe('ecms_xyz')
  })

  it('prefers Authorization over X-API-Key', () => {
    const req = new Request('http://x', {
      headers: { authorization: 'Bearer ecms_aaa', 'x-api-key': 'ecms_bbb' },
    })
    expect(extractApiKey(req)).toBe('ecms_aaa')
  })

  it('returns null when no key is present', () => {
    expect(extractApiKey(new Request('http://x'))).toBeNull()
  })

  it('returns null for empty bearer tokens', () => {
    const req = new Request('http://x', { headers: { authorization: 'Bearer ' } })
    expect(extractApiKey(req)).toBeNull()
  })
})

describe('hasPermission', () => {
  it('matches exact permissions', () => {
    expect(hasPermission(['posts:create'], 'posts:create')).toBe(true)
    expect(hasPermission(['posts:create'], 'posts:delete')).toBe(false)
  })

  it('matches resource wildcards', () => {
    expect(hasPermission(['posts:*'], 'posts:create')).toBe(true)
    expect(hasPermission(['posts:*'], 'posts:delete')).toBe(true)
    expect(hasPermission(['posts:*'], 'projects:read')).toBe(false)
  })

  it('matches the global wildcard', () => {
    expect(hasPermission(['*'], 'gallery:delete')).toBe(true)
  })

  it('rejects when the set is empty', () => {
    expect(hasPermission([], 'posts:read')).toBe(false)
  })
})

describe('sanitizePermissions', () => {
  it('keeps valid permissions and drops invalid ones', () => {
    expect(sanitizePermissions(['posts:read', 'bogus', 'posts:*', 'admin:all', '*'])).toEqual([
      'posts:read',
      'posts:*',
      '*',
    ])
  })

  it('deduplicates entries', () => {
    expect(sanitizePermissions(['posts:read', 'posts:read'])).toEqual(['posts:read'])
  })

  it('returns an empty array for non-array input', () => {
    expect(sanitizePermissions('posts:read')).toEqual([])
    expect(sanitizePermissions(null)).toEqual([])
    expect(sanitizePermissions(undefined)).toEqual([])
  })

  it('accepts every generated permission', () => {
    expect(sanitizePermissions(ALL_PERMISSIONS)).toEqual(ALL_PERMISSIONS)
  })
})

describe('authenticateApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const keyRecord = {
    id: 'key-1',
    name: 'Test key',
    permissions: JSON.stringify(['posts:read']),
    createdById: 'user-1',
    revoked: false,
    expiresAt: null,
  }

  it('returns 401 when no key is provided', async () => {
    const result = await authenticateApiKey(new Request('http://x'))
    expect(result.error?.status).toBe(401)
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns 401 for keys with the wrong prefix without hitting the db', async () => {
    const req = new Request('http://x', { headers: { authorization: 'Bearer wrongprefix_abc' } })
    const result = await authenticateApiKey(req)
    expect(result.error?.status).toBe(401)
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns 401 for unknown keys', async () => {
    mockFindUnique.mockResolvedValue(null)
    const req = new Request('http://x', { headers: { authorization: 'Bearer ecms_unknown' } })
    const result = await authenticateApiKey(req)
    expect(result.error?.status).toBe(401)
  })

  it('returns 401 for revoked keys', async () => {
    mockFindUnique.mockResolvedValue({ ...keyRecord, revoked: true })
    const req = new Request('http://x', { headers: { authorization: 'Bearer ecms_valid' } })
    const result = await authenticateApiKey(req)
    expect(result.error?.status).toBe(401)
    expect(result.error?.message).toMatch(/revoked/i)
  })

  it('returns 401 for expired keys', async () => {
    mockFindUnique.mockResolvedValue({ ...keyRecord, expiresAt: new Date(Date.now() - 1000) })
    const req = new Request('http://x', { headers: { authorization: 'Bearer ecms_valid' } })
    const result = await authenticateApiKey(req)
    expect(result.error?.status).toBe(401)
    expect(result.error?.message).toMatch(/expired/i)
  })

  it('authenticates a valid key and looks it up by hash', async () => {
    mockFindUnique.mockResolvedValue(keyRecord)
    const req = new Request('http://x', { headers: { authorization: 'Bearer ecms_validkey' } })
    const result = await authenticateApiKey(req)

    expect(result.error).toBeUndefined()
    expect(result.apiKey?.id).toBe('key-1')
    expect(result.apiKey?.permissions).toEqual(['posts:read'])
    expect(result.apiKey?.createdById).toBe('user-1')
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { keyHash: hashApiKey('ecms_validkey') },
      })
    )
  })

  it('treats unparseable permissions as none', async () => {
    mockFindUnique.mockResolvedValue({ ...keyRecord, permissions: 'not-json' })
    const req = new Request('http://x', { headers: { authorization: 'Bearer ecms_valid' } })
    const result = await authenticateApiKey(req)
    expect(result.apiKey?.permissions).toEqual([])
  })
})
