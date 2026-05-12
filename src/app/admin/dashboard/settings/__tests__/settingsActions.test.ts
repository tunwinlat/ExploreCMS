/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateSiteSettings } from '../settingsActions'
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

describe('updateSiteSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should throw error if no session', async () => {
    vi.mocked(verifySession).mockResolvedValue(null)

    await expect(updateSiteSettings('Title', null, 'Header Title', 'Header Description', 'dark')).rejects.toThrow('Unauthorized')

    expect(prisma.siteSettings.upsert).not.toHaveBeenCalled()
  })

  it('should throw error if session role is not ADMIN', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'EDITOR' })

    await expect(updateSiteSettings('Title', null, 'Header Title', 'Header Description', 'dark')).rejects.toThrow('Unauthorized')

    expect(prisma.siteSettings.upsert).not.toHaveBeenCalled()
  })

  it('should successfully update site settings when authorized', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'OWNER' })
    vi.mocked(prisma.siteSettings.upsert).mockResolvedValue({} as any)

    const args = ['New Title', 'favicon.ico', 'New Header Title', 'New Header Description', 'light', 'Footer', 'About', true] as const
    const result = await updateSiteSettings(...args)

    expect(result).toEqual({ success: true })
    expect(prisma.siteSettings.upsert).toHaveBeenCalledTimes(1)
    expect(prisma.siteSettings.upsert).toHaveBeenCalledWith({
      where: { id: 'singleton' },
      update: {
        title: args[0],
        faviconUrl: args[1],
        headerTitle: args[2],
        headerDescription: args[3],
        theme: args[4],
        footerText: args[5],
        sidebarAbout: args[6],
        dynamicPattern: args[7]
      },
      create: {
        id: 'singleton',
        title: args[0],
        faviconUrl: args[1],
        headerTitle: args[2],
        headerDescription: args[3],
        theme: args[4],
        footerText: args[5],
        sidebarAbout: args[6],
        dynamicPattern: args[7]
      }
    })
    expect(revalidatePath).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('should return error if database operation fails', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'OWNER' })
    vi.mocked(prisma.siteSettings.upsert).mockRejectedValue(new Error('DB Error'))

    const result = await updateSiteSettings('Title', null, 'Header Title', 'Header Description', 'dark', '', '', true)

    expect(result).toEqual({ error: 'Failed to update site settings' })
    expect(prisma.siteSettings.upsert).toHaveBeenCalledTimes(1)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
