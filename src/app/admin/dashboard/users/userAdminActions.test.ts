/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteUser } from './userAdminActions'
import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  verifySession: vi.fn()
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      delete: vi.fn(),
      findUnique: vi.fn()
    }
  }
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

describe('deleteUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should throw Unauthorized if no session exists', async () => {
    vi.mocked(verifySession).mockResolvedValue(null)

    await expect(deleteUser('user-1')).rejects.toThrow('Unauthorized')

    expect(prisma.user.delete).not.toHaveBeenCalled()
  })

  it('should throw Unauthorized if session role is neither OWNER nor ADMIN', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user-1', role: 'CONTRIBUTOR' } as any)

    await expect(deleteUser('user-1')).rejects.toThrow('Unauthorized')

    expect(prisma.user.delete).not.toHaveBeenCalled()
  })

  it('should delete user and revalidate path on success (OWNER deleting CONTRIBUTOR)', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'admin-1', role: 'OWNER' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'CONTRIBUTOR' } as any)
    vi.mocked(prisma.user.delete).mockResolvedValue({} as any)

    const result = await deleteUser('user-1')

    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: 'user-1' }
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/dashboard/users')
    expect(result).toEqual({ success: true })
  })

  it('should delete user on success (ADMIN deleting CONTRIBUTOR)', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'CONTRIBUTOR' } as any)
    vi.mocked(prisma.user.delete).mockResolvedValue({} as any)

    const result = await deleteUser('user-1')

    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: 'user-1' }
    })
    expect(result).toEqual({ success: true })
  })

  it('should throw error if ANYONE tries to delete OWNER', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'admin-1', role: 'OWNER' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'OWNER' } as any)

    await expect(deleteUser('user-1')).rejects.toThrow('Unauthorized: Cannot delete the OWNER.')

    expect(prisma.user.delete).not.toHaveBeenCalled()
  })

  it('should throw error if ADMIN tries to delete ADMIN', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)

    await expect(deleteUser('user-1')).rejects.toThrow('Unauthorized: Only an OWNER can delete an ADMIN.')

    expect(prisma.user.delete).not.toHaveBeenCalled()
  })

  it('should throw error if database deletion fails', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'admin-1', role: 'OWNER' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'CONTRIBUTOR' } as any)
    vi.mocked(prisma.user.delete).mockRejectedValue(new Error('DB Error'))

    await expect(deleteUser('user-1')).rejects.toThrow('Failed to delete user')

    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: 'user-1' }
    })
    expect(console.error).toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
