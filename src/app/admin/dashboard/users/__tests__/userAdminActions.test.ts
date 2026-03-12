/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateUserRole } from '../userAdminActions'
import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

vi.mock('@/lib/auth', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('updateUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {}) // silence console.error during tests
  })

  it('should throw Unauthorized error if no session exists', async () => {
    vi.mocked(verifySession).mockResolvedValue(null)

    await expect(updateUserRole('user-1', 'OWNER')).rejects.toThrow('Unauthorized')
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('should throw Unauthorized error if session role is not ADMIN', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'USER' } as any)

    await expect(updateUserRole('user-1', 'OWNER')).rejects.toThrow('Unauthorized')
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('should successfully update role if session role is ADMIN', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const result = await updateUserRole('user-1', 'OWNER')

    expect(result).toEqual({ success: true })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'OWNER' },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/dashboard/users')
  })

  it('should throw error if database update fails', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.user.update).mockRejectedValue(new Error('DB Error'))

    await expect(updateUserRole('user-1', 'OWNER')).rejects.toThrow('Failed to update user role')
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
