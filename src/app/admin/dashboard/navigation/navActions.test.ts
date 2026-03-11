import { updateNavigationConfig } from './navActions'
import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  verifySession: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    siteSettings: {
      upsert: jest.fn(),
    },
  },
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

describe('updateNavigationConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {}) // Suppress console.error in tests
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should throw an error if no session exists', async () => {
    (verifySession as jest.Mock).mockResolvedValueOnce(null)
    await expect(updateNavigationConfig('{}')).rejects.toThrow('Unauthorized')
    expect(prisma.siteSettings.upsert).not.toHaveBeenCalled()
  })

  it('should throw an error if role is not ADMIN', async () => {
    (verifySession as jest.Mock).mockResolvedValueOnce({ role: 'USER' })
    await expect(updateNavigationConfig('{}')).rejects.toThrow('Unauthorized')
    expect(prisma.siteSettings.upsert).not.toHaveBeenCalled()
  })

  it('should update navigation config if session is ADMIN', async () => {
    (verifySession as jest.Mock).mockResolvedValueOnce({ role: 'ADMIN' })
    ;(prisma.siteSettings.upsert as jest.Mock).mockResolvedValueOnce({})

    const validConfig = '{"links":[]}'
    const result = await updateNavigationConfig(validConfig)

    expect(result).toEqual({ success: true })
    expect(prisma.siteSettings.upsert).toHaveBeenCalledWith({
      where: { id: 'default' },
      update: { navigation: validConfig },
      create: {
        id: 'default',
        title: 'ExploreCMS',
        navigation: validConfig
      }
    })
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/dashboard/navigation')
  })

  it('should throw an error if database upsert fails', async () => {
    (verifySession as jest.Mock).mockResolvedValueOnce({ role: 'ADMIN' })
    ;(prisma.siteSettings.upsert as jest.Mock).mockRejectedValueOnce(new Error('DB Error'))

    await expect(updateNavigationConfig('{}')).rejects.toThrow('Failed to update navigation')
    expect(console.error).toHaveBeenCalledWith('Error updating navigation:', expect.any(Error))
  })
})
