/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { updateNavigationConfig } from './navActions'
import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    siteSettings: {
      upsert: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('updateNavigationConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {}) // Suppress console.error in tests
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should throw an error if no session exists', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce(null)
    await expect(updateNavigationConfig('{}')).rejects.toThrow('Unauthorized')
    expect(prisma.siteSettings.upsert).not.toHaveBeenCalled()
  })

  it('should throw an error if role is not ADMIN', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({ role: 'USER' } as any)
    await expect(updateNavigationConfig('{}')).rejects.toThrow('Unauthorized')
    expect(prisma.siteSettings.upsert).not.toHaveBeenCalled()
  })

  it('should update navigation config if session is OWNER', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({ role: 'OWNER' } as any)
    vi.mocked(prisma.siteSettings.upsert).mockResolvedValueOnce({} as any)

    const validConfig = '{"links":[]}'
    const result = await updateNavigationConfig(validConfig)

    expect(result).toEqual({ success: true })
    expect(prisma.siteSettings.upsert).toHaveBeenCalledWith({
      where: { id: 'singleton' },
      update: { navigationConfig: validConfig },
      create: {
        id: 'singleton',
        title: 'ExploreCMS',
        navigationConfig: validConfig
      }
    })
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/dashboard/navigation')
  })

  it('should throw an error if database upsert fails', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({ role: 'OWNER' } as any)
    vi.mocked(prisma.siteSettings.upsert).mockRejectedValueOnce(new Error('DB Error'))

    await expect(updateNavigationConfig('{}')).rejects.toThrow('Failed to update navigation')
    expect(console.error).toHaveBeenCalledWith('Error updating navigation:', expect.any(Error))
  })
})
