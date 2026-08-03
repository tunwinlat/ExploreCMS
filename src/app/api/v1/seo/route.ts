/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireApiPermission } from '@/lib/apiAuth'
import { parseJsonBody, badRequest, serverError } from '@/lib/apiV1Utils'
import { normalizeUrl } from '@/lib/urlUtils'

const SEO_SELECT = {
  seoSiteUrl: true,
  seoDescription: true,
  seoOgImageUrl: true,
  seoTwitterHandle: true,
  seoRobotsIndex: true,
  seoGoogleVerification: true,
  seoBingVerification: true,
  seoLlmsTxtEnabled: true,
} as const

const SEO_DEFAULTS = {
  seoSiteUrl: null,
  seoDescription: null,
  seoOgImageUrl: null,
  seoTwitterHandle: null,
  seoRobotsIndex: true,
  seoGoogleVerification: null,
  seoBingVerification: null,
  seoLlmsTxtEnabled: true,
}

const STRING_FIELDS = [
  'seoDescription', 'seoTwitterHandle', 'seoGoogleVerification', 'seoBingVerification',
] as const

const BOOLEAN_FIELDS = ['seoRobotsIndex', 'seoLlmsTxtEnabled'] as const

function revalidateSeo() {
  revalidateTag('site-settings', 'max')
  revalidatePath('/', 'layout')
}

function validateSeoInput(body: Record<string, unknown>): { data?: Record<string, unknown>; error?: string } {
  const data: Record<string, unknown> = {}

  for (const field of ['seoSiteUrl', 'seoOgImageUrl'] as const) {
    const value = body[field]
    if (value === undefined) continue
    if (value !== null && typeof value !== 'string') return { error: `${field} must be a string or null` }
    const raw = (value as string | null)?.trim() ?? ''
    if (!raw) {
      data[field] = null
      continue
    }
    const normalized = normalizeUrl(raw)
    if (!normalized) return { error: `${field} must be a valid http(s) URL or a site-relative path` }
    if (field === 'seoSiteUrl' && !/^https?:\/\//.test(normalized)) {
      return { error: 'seoSiteUrl must be an absolute URL, e.g. https://example.com' }
    }
    data[field] = normalized
  }

  for (const field of STRING_FIELDS) {
    const value = body[field]
    if (value === undefined) continue
    if (value !== null && typeof value !== 'string') return { error: `${field} must be a string or null` }
    const trimmed = (value as string | null)?.trim() ?? ''
    if (trimmed.length > 2000) return { error: `${field} must be 2000 characters or fewer` }
    data[field] = trimmed || null
  }

  for (const field of BOOLEAN_FIELDS) {
    const value = body[field]
    if (value === undefined) continue
    if (typeof value !== 'boolean') return { error: `${field} must be a boolean` }
    data[field] = value
  }

  if (Object.keys(data).length === 0) return { error: 'Request body must contain at least one SEO field' }
  return { data }
}

// GET /api/v1/seo — site-level SEO settings (requires seo:read)
export async function GET(request: Request) {
  const auth = await requireApiPermission(request, 'seo:read')
  if (auth.error) return auth.error

  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: SEO_SELECT,
    })
    return NextResponse.json({ seo: settings ?? SEO_DEFAULTS })
  } catch (error) {
    console.error('GET /api/v1/seo error:', error)
    return serverError('Failed to fetch SEO settings')
  }
}

// PATCH /api/v1/seo — partial update of site-level SEO settings (requires seo:update)
export async function PATCH(request: Request) {
  const auth = await requireApiPermission(request, 'seo:update')
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(request)
  if (parsed.error) return parsed.error

  const { data, error } = validateSeoInput(parsed.data)
  if (error) return badRequest(error)

  try {
    const settings = await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: data!,
      create: { id: 'singleton', ...data! },
      select: SEO_SELECT,
    })
    revalidateSeo()
    return NextResponse.json({ seo: settings })
  } catch (err) {
    console.error('PATCH /api/v1/seo error:', err)
    return serverError('Failed to save SEO settings')
  }
}
