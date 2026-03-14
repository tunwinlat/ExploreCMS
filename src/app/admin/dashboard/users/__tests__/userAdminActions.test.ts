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
      findUnique: vi.fn(),
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

    await expect(updateUserRole('user-1', 'ADMIN')).rejects.toThrow('Unauthorized')
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('should throw Unauthorized error if session role is neither OWNER nor ADMIN', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'CONTRIBUTOR' } as any)

    await expect(updateUserRole('user-1', 'ADMIN')).rejects.toThrow('Unauthorized')
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('should successfully update role if session role is OWNER', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'OWNER' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'CONTRIBUTOR' } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const result = await updateUserRole('user-1', 'ADMIN')

    expect(result).toEqual({ success: true })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'ADMIN' },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/dashboard/users')
  })

  it('should successfully update role if session role is ADMIN (and not modifying an OWNER or ADMIN)', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'CONTRIBUTOR' } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const result = await updateUserRole('user-1', 'ADMIN')

    expect(result).toEqual({ success: true })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'ADMIN' },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/dashboard/users')
  })

  it('should throw error if ANY user tries to assign OWNER role', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'OWNER' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'CONTRIBUTOR' } as any)

    await expect(updateUserRole('user-1', 'OWNER')).rejects.toThrow('Unauthorized: There can only be one OWNER.')

    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('should throw error if ANY user tries to modify an OWNERs role', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'OWNER' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'OWNER' } as any)

    await expect(updateUserRole('user-1', 'CONTRIBUTOR')).rejects.toThrow('Unauthorized: Cannot modify the OWNER.')

    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('should throw error if ADMIN tries to modify another ADMIN', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'ADMIN' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'ADMIN' } as any)

    await expect(updateUserRole('user-1', 'CONTRIBUTOR')).rejects.toThrow('Unauthorized: Only an OWNER can modify an ADMIN.')

    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('should throw error if database update fails', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'OWNER' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: 'CONTRIBUTOR' } as any)
    vi.mocked(prisma.user.update).mockRejectedValue(new Error('DB Error'))

    await expect(updateUserRole('user-1', 'ADMIN')).rejects.toThrow('Failed to update user role')
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
