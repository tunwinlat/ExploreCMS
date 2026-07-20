/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateSeoSettings, type SeoSettingsInput } from '../seoActions'
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

const validInput: SeoSettingsInput = {
  seoSiteUrl: 'https://blog.example.com',
  seoDescription: 'The best dev blog.',
  seoOgImageUrl: '/uploads/og.png',
  seoTwitterHandle: '@myblog',
  seoRobotsIndex: true,
  seoGoogleVerification: 'goog-token',
  seoBingVerification: 'bing-token',
  seoLlmsTxtEnabled: false,
}

describe('updateSeoSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should throw error if no session', async () => {
    vi.mocked(verifySession).mockResolvedValue(null)

    await expect(updateSeoSettings(validInput)).rejects.toThrow('Unauthorized')
    expect(prisma.siteSettings.upsert).not.toHaveBeenCalled()
  })

  it('should throw error if session role is not OWNER', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'ADMIN' })

    await expect(updateSeoSettings(validInput)).rejects.toThrow('Unauthorized')
    expect(prisma.siteSettings.upsert).not.toHaveBeenCalled()
  })

  it('should successfully update SEO settings when authorized', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'OWNER' })
    vi.mocked(prisma.siteSettings.upsert).mockResolvedValue({} as any)

    const result = await updateSeoSettings(validInput)

    expect(result).toEqual({ success: true })
    expect(prisma.siteSettings.upsert).toHaveBeenCalledTimes(1)
    expect(prisma.siteSettings.upsert).toHaveBeenCalledWith({
      where: { id: 'singleton' },
      update: {
        seoSiteUrl: 'https://blog.example.com/',
        seoDescription: 'The best dev blog.',
        seoOgImageUrl: '/uploads/og.png',
        seoTwitterHandle: '@myblog',
        seoRobotsIndex: true,
        seoGoogleVerification: 'goog-token',
        seoBingVerification: 'bing-token',
        seoLlmsTxtEnabled: false,
      },
      create: {
        id: 'singleton',
        seoSiteUrl: 'https://blog.example.com/',
        seoDescription: 'The best dev blog.',
        seoOgImageUrl: '/uploads/og.png',
        seoTwitterHandle: '@myblog',
        seoRobotsIndex: true,
        seoGoogleVerification: 'goog-token',
        seoBingVerification: 'bing-token',
        seoLlmsTxtEnabled: false,
      },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('stores empty fields as null', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'OWNER' })
    vi.mocked(prisma.siteSettings.upsert).mockResolvedValue({} as any)

    const result = await updateSeoSettings({
      seoSiteUrl: '',
      seoDescription: '   ',
      seoOgImageUrl: '',
      seoTwitterHandle: '',
      seoRobotsIndex: true,
      seoGoogleVerification: '',
      seoBingVerification: '',
      seoLlmsTxtEnabled: true,
    })

    expect(result).toEqual({ success: true })
    expect(prisma.siteSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          seoSiteUrl: null,
          seoDescription: null,
          seoOgImageUrl: null,
          seoTwitterHandle: null,
          seoRobotsIndex: true,
          seoGoogleVerification: null,
          seoBingVerification: null,
          seoLlmsTxtEnabled: true,
        },
      })
    )
  })

  it('rejects a non-absolute site URL', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'OWNER' })

    const result = await updateSeoSettings({ ...validInput, seoSiteUrl: 'blog.example.com' })

    expect(result).toEqual({ error: 'Site URL must be a valid absolute URL, e.g. https://example.com' })
    expect(prisma.siteSettings.upsert).not.toHaveBeenCalled()
  })

  it('rejects an unsafe share image URL', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'OWNER' })

    const result = await updateSeoSettings({ ...validInput, seoOgImageUrl: 'javascript:alert(1)' })

    expect(result).toEqual({ error: 'Share image must be a valid http(s) URL or a site-relative path' })
    expect(prisma.siteSettings.upsert).not.toHaveBeenCalled()
  })

  it('should return error if database operation fails', async () => {
    vi.mocked(verifySession).mockResolvedValue({ role: 'OWNER' })
    vi.mocked(prisma.siteSettings.upsert).mockRejectedValue(new Error('DB Error'))

    const result = await updateSeoSettings(validInput)

    expect(result).toEqual({ error: 'Failed to update SEO settings' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
