import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateNavigationConfig } from './navActions'

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

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

describe('updateNavigationConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should throw an error if session is not found', async () => {
    vi.mocked(verifySession).mockResolvedValue(null)

    await expect(updateNavigationConfig('[]')).rejects.toThrow('Unauthorized')

    expect(prisma.siteSettings.upsert).not.toHaveBeenCalled()
  })

  it('should throw an error if user is not ADMIN', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'USER', id: '1' } as any)

    await expect(updateNavigationConfig('[]')).rejects.toThrow('Unauthorized')

    expect(prisma.siteSettings.upsert).not.toHaveBeenCalled()
  })

  it('should throw an error if prisma upsert fails', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'ADMIN', id: '1' } as any)
    vi.mocked(prisma.siteSettings.upsert).mockRejectedValue(new Error('DB Error'))

    await expect(updateNavigationConfig('[]')).rejects.toThrow('Failed to update navigation')

    expect(prisma.siteSettings.upsert).toHaveBeenCalled()
  })

  it('should successfully update navigation config and revalidate paths', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'ADMIN', id: '1' } as any)
    vi.mocked(prisma.siteSettings.upsert).mockResolvedValue({} as any)
    const mockJson = '[{"title": "Home", "url": "/"}]'

    const result = await updateNavigationConfig(mockJson)

    expect(prisma.siteSettings.upsert).toHaveBeenCalledWith({
      where: { id: 'default' },
      update: { navigation: mockJson },
      create: {
        id: 'default',
        title: 'ExploreCMS',
        navigation: mockJson
      }
    })
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/dashboard/navigation')
    expect(result).toEqual({ success: true })
  })
})
