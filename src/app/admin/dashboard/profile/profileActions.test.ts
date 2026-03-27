/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateUserProfile } from './profileActions'
import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

// Mock dependencies
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

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}))

describe('updateUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return error if not authenticated', async () => {
    vi.mocked(verifySession).mockResolvedValue(null)
    const formData = new FormData()

    const result = await updateUserProfile(formData)

    expect(result).toEqual({ error: 'Unauthorized' })
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('should update profile with firstName and lastName when password is not provided', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'test@example.com' } as any)
    const formData = new FormData()
    formData.append('firstName', 'John')
    formData.append('lastName', 'Doe')
    formData.append('email', 'test@example.com')

    const result = await updateUserProfile(formData)

    expect(result).toEqual({ success: true, emailChanged: false })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user123' },
      data: {
        firstName: 'John',
        lastName: 'Doe',
      },
    })
    expect(bcrypt.hash).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/admin/dashboard/profile')
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('should format data correctly with nulls if empty fields are submitted', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'test@example.com' } as any)
    const formData = new FormData()
    formData.append('firstName', '')
    formData.append('lastName', '')
    formData.append('email', 'test@example.com')

    const result = await updateUserProfile(formData)

    expect(result).toEqual({ success: true, emailChanged: false })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user123' },
      data: {
        firstName: null,
        lastName: null,
      },
    })
  })

  it('should hash and update password if provided', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'test@example.com' } as any)
    vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword123' as never)

    const formData = new FormData()
    formData.append('firstName', 'Jane')
    formData.append('lastName', 'Smith')
    formData.append('password', 'newsecretpassword')
    formData.append('email', 'test@example.com')

    const result = await updateUserProfile(formData)

    expect(result).toEqual({ success: true, emailChanged: false })
    expect(bcrypt.hash).toHaveBeenCalledWith('newsecretpassword', 10)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user123' },
      data: {
        firstName: 'Jane',
        lastName: 'Smith',
        password: 'hashedPassword123',
      },
    })
  })

  it('should return error if database update fails', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(prisma.user.update).mockRejectedValue(new Error('Database connection failed'))

    const formData = new FormData()
    formData.append('firstName', 'Test')

    // Suppress console.error in this test to keep test output clean
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await updateUserProfile(formData)

    expect(result).toEqual({ error: 'Failed to update profile' })
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})
