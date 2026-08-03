/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireApiPermission } from '@/lib/apiAuth'
import {
  parseJsonBody, badRequest, serverError, validateOptionalUrl, isUrlError,
} from '@/lib/apiV1Utils'
import { parseProfileSections, validateProfileSection, type ParsedProfileSections } from '@/lib/profile-sections'

const SECTION_KEYS = [
  'links', 'experience', 'education', 'skills', 'certifications', 'languages', 'interests',
] as const

const STRING_SCALARS = [
  'fullName', 'headline', 'location', 'email', 'phone', 'website', 'summary', 'availability', 'projectsHeading',
] as const

const URL_SCALARS = ['avatarUrl', 'resumeUrl'] as const

const SCALAR_DEFAULTS: Record<string, string> = {
  fullName: '', headline: '', location: '', email: '', phone: '', website: '',
  summary: '', availability: '', projectsHeading: 'Projects',
}

function revalidateProfile() {
  revalidateTag('site-profile', 'max')
  revalidatePath('/profile')
  revalidatePath('/')
  revalidatePath('/admin/dashboard/site-profile')
}

function serializeProfile(profile: Record<string, unknown>) {
  const sections = parseProfileSections(profile as Parameters<typeof parseProfileSections>[0])
  return { ...profile, ...sections, updatedAt: (profile.updatedAt as Date)?.toISOString?.() ?? profile.updatedAt }
}

function emptyProfile() {
  const sections = parseProfileSections(null)
  return {
    id: 'singleton',
    ...SCALAR_DEFAULTS,
    avatarUrl: null,
    resumeUrl: null,
    showProjects: true,
    ...sections,
    updatedAt: null,
  }
}

function validateScalarFields(body: Record<string, unknown>): { error?: string } {
  for (const field of STRING_SCALARS) {
    const value = body[field]
    if (value === undefined) continue
    if (typeof value !== 'string') return { error: `${field} must be a string` }
    const max = field === 'summary' ? 100000 : 2000
    if (value.length > max) return { error: `${field} is too long (max ${max} characters)` }
  }
  if (body.email !== undefined && body.email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email as string)) {
    return { error: 'email must be a valid email address' }
  }
  for (const field of URL_SCALARS) {
    const result = validateOptionalUrl(body[field], field)
    if (isUrlError(result)) return result
  }
  if (body.showProjects !== undefined && typeof body.showProjects !== 'boolean') {
    return { error: 'showProjects must be a boolean' }
  }
  return {}
}

function buildUpdateData(body: Record<string, unknown>, partial: boolean): { data?: Record<string, unknown>; error?: string } {
  const scalarError = validateScalarFields(body)
  if (scalarError.error) return scalarError

  const data: Record<string, unknown> = {}

  for (const field of STRING_SCALARS) {
    if (body[field] !== undefined) data[field] = body[field]
    else if (!partial) data[field] = SCALAR_DEFAULTS[field]
  }
  for (const field of URL_SCALARS) {
    if (body[field] !== undefined) data[field] = body[field] === '' ? null : body[field]
    else if (!partial) data[field] = null
  }
  if (body.showProjects !== undefined) data.showProjects = body.showProjects
  else if (!partial) data.showProjects = true

  for (const section of SECTION_KEYS) {
    const value = body[section]
    if (value === undefined) {
      if (!partial) data[section] = '[]'
      continue
    }
    const result = validateProfileSection(section as keyof ParsedProfileSections, value)
    if (result.error) return { error: result.error }
    data[section] = JSON.stringify(result.data)
  }

  return { data }
}

// GET /api/v1/profile — read the public biography (requires profile:read)
export async function GET(request: Request) {
  const auth = await requireApiPermission(request, 'profile:read')
  if (auth.error) return auth.error

  try {
    const profile = await prisma.profile.findUnique({ where: { id: 'singleton' } })
    return NextResponse.json({ profile: profile ? serializeProfile(profile as unknown as Record<string, unknown>) : emptyProfile() })
  } catch (error) {
    console.error('GET /api/v1/profile error:', error)
    return serverError('Failed to fetch profile')
  }
}

// PUT /api/v1/profile — full replace of the profile (requires profile:update)
export async function PUT(request: Request) {
  const auth = await requireApiPermission(request, 'profile:update')
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(request)
  if (parsed.error) return parsed.error

  const { data, error } = buildUpdateData(parsed.data, false)
  if (error) return badRequest(error)

  try {
    const profile = await prisma.profile.upsert({
      where: { id: 'singleton' },
      update: data!,
      create: { id: 'singleton', ...data! },
    })
    revalidateProfile()
    return NextResponse.json({ profile: serializeProfile(profile as unknown as Record<string, unknown>) })
  } catch (err) {
    console.error('PUT /api/v1/profile error:', err)
    return serverError('Failed to save profile')
  }
}

// PATCH /api/v1/profile — partial update; only provided fields change (requires profile:update)
export async function PATCH(request: Request) {
  const auth = await requireApiPermission(request, 'profile:update')
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(request)
  if (parsed.error) return parsed.error

  if (Object.keys(parsed.data).length === 0) return badRequest('Request body must contain at least one field')

  const { data, error } = buildUpdateData(parsed.data, true)
  if (error) return badRequest(error)

  try {
    const profile = await prisma.profile.upsert({
      where: { id: 'singleton' },
      update: data!,
      create: { id: 'singleton', ...data! },
    })
    revalidateProfile()
    return NextResponse.json({ profile: serializeProfile(profile as unknown as Record<string, unknown>) })
  } catch (err) {
    console.error('PATCH /api/v1/profile error:', err)
    return serverError('Failed to save profile')
  }
}
