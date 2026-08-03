/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath, updateTag } from 'next/cache'
import { parseProfileSections, validateProfileSection, type ParsedProfileSections } from '@/lib/profile-sections'

const SECTION_KEYS = [
  'links', 'experience', 'education', 'skills', 'certifications', 'languages', 'interests',
] as const

const STRING_SCALARS = [
  'fullName', 'headline', 'location', 'email', 'phone', 'website',
  'summary', 'availability', 'projectsHeading',
] as const

export interface SiteProfileInput {
  fullName: string
  headline: string
  avatarUrl: string
  location: string
  email: string
  phone: string
  website: string
  summary: string
  availability: string
  resumeUrl: string
  showProjects: boolean
  projectsHeading: string
  links: unknown[]
  experience: unknown[]
  education: unknown[]
  skills: unknown[]
  certifications: unknown[]
  languages: unknown[]
  interests: unknown[]
}

export async function getSiteProfile() {
  const profile = await prisma.profile.findUnique({ where: { id: 'singleton' } })
  if (!profile) return null
  return {
    ...profile,
    ...parseProfileSections(profile),
    updatedAt: profile.updatedAt.toISOString(),
  }
}

export async function updateSiteProfile(input: SiteProfileInput) {
  const payload = await verifySession()
  if (!payload || payload.role !== 'OWNER') {
    throw new Error('Unauthorized')
  }

  const data: Record<string, unknown> = {}

  for (const field of STRING_SCALARS) {
    const value = input[field]
    if (typeof value !== 'string') return { error: `${field} must be a string` }
    const max = field === 'summary' ? 100000 : 2000
    if (value.length > max) return { error: `${field} is too long (max ${max} characters)` }
    data[field] = value
  }

  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return { error: 'email must be a valid email address' }
  }

  for (const field of ['avatarUrl', 'resumeUrl'] as const) {
    const value = input[field]
    if (typeof value !== 'string') return { error: `${field} must be a string` }
    if (value) {
      try {
        new URL(value)
      } catch {
        return { error: `${field} must be a valid URL` }
      }
    }
    data[field] = value || null
  }

  if (typeof input.showProjects !== 'boolean') return { error: 'showProjects must be a boolean' }
  data.showProjects = input.showProjects

  for (const section of SECTION_KEYS) {
    const result = validateProfileSection(section as keyof ParsedProfileSections, input[section])
    if (result.error) return { error: result.error }
    data[section] = JSON.stringify(result.data)
  }

  try {
    await prisma.profile.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    })
    updateTag('site-profile')
    revalidatePath('/profile')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Error updating site profile:', error)
    return { error: 'Failed to save profile' }
  }
}
