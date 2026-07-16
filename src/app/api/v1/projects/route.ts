/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireApiPermission } from '@/lib/apiAuth'
import {
  generateSlug, parseJsonBody, parsePagination,
  badRequest, serverError, validateOptionalUrl, isUrlError,
} from '@/lib/apiV1Utils'

const PROJECT_STATUSES = ['completed', 'in_progress', 'archived'] as const

function revalidateProjects() {
  revalidatePath('/projects')
  revalidatePath('/admin/dashboard/projects')
}

function validateProjectFields(body: Record<string, unknown>, partial: boolean): { error?: string } {
  const { title, tagline, content, coverImage, status, githubUrl, liveUrl, techTags, order, slug, contentFormat } = body

  if (!partial || title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) return { error: 'title is required' }
    if (title.length > 500) return { error: 'title must be 500 characters or fewer' }
  }
  if (tagline !== undefined && typeof tagline !== 'string') return { error: 'tagline must be a string' }
  if (content !== undefined && typeof content !== 'string') return { error: 'content must be a string' }
  if (content !== undefined && (content as string).length > 500000) return { error: 'content is too large' }
  if (contentFormat !== undefined && contentFormat !== 'html' && contentFormat !== 'markdown') {
    return { error: 'contentFormat must be "html" or "markdown"' }
  }
  if (status !== undefined && !PROJECT_STATUSES.includes(status as typeof PROJECT_STATUSES[number])) {
    return { error: `status must be one of: ${PROJECT_STATUSES.join(', ')}` }
  }
  if (order !== undefined && !Number.isFinite(order)) return { error: 'order must be a number' }
  if (slug !== undefined && typeof slug !== 'string') return { error: 'slug must be a string' }
  if (techTags !== undefined && (!Array.isArray(techTags) || techTags.some(t => typeof t !== 'string'))) {
    return { error: 'techTags must be an array of strings' }
  }
  for (const [field, value] of [['coverImage', coverImage], ['githubUrl', githubUrl], ['liveUrl', liveUrl]] as const) {
    const result = validateOptionalUrl(value, field)
    if (isUrlError(result)) return result
  }
  return {}
}

// GET /api/v1/projects — list projects (requires projects:read)
export async function GET(request: Request) {
  const auth = await requireApiPermission(request, 'projects:read')
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const { limit, cursor } = parsePagination(searchParams)
  const publishedParam = searchParams.get('published')

  const where: { published?: boolean } = {}
  if (publishedParam === 'true') where.published = true
  else if (publishedParam === 'false') where.published = false

  try {
    const projects = await prisma.project.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: { images: { orderBy: { order: 'asc' as const } } },
    })

    let nextCursor: string | undefined
    if (projects.length > limit) {
      nextCursor = projects.pop()!.id
    }

    return NextResponse.json({ projects, nextCursor })
  } catch (error) {
    console.error('[API v1] Failed to list projects:', error)
    return serverError('Failed to list projects')
  }
}

// POST /api/v1/projects — create a project (requires projects:create)
export async function POST(request: Request) {
  const auth = await requireApiPermission(request, 'projects:create')
  if (auth.error) return auth.error

  const body = await parseJsonBody(request)
  if (body.error) return body.error

  const validation = validateProjectFields(body.data, false)
  if (validation.error) return badRequest(validation.error)

  const { title, tagline, content, coverImage, status, featured, published, githubUrl, liveUrl, techTags, order, slug: slugInput, contentFormat } = body.data

  let slug = typeof slugInput === 'string' && slugInput.trim() ? generateSlug(slugInput) : generateSlug(title as string)
  if (!slug) slug = `project-${Date.now()}`

  try {
    const existing = await prisma.project.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now()}`

    const project = await prisma.project.create({
      data: {
        title: (title as string).trim(),
        slug,
        tagline: typeof tagline === 'string' ? tagline : '',
        content: typeof content === 'string' ? content : '',
        contentFormat: (contentFormat as string | undefined) ?? 'html',
        coverImage: (coverImage as string | undefined) ?? null,
        status: (status as string | undefined) ?? 'completed',
        featured: featured === true,
        published: published === true,
        githubUrl: (githubUrl as string | undefined) ?? null,
        liveUrl: (liveUrl as string | undefined) ?? null,
        techTags: JSON.stringify((techTags as string[] | undefined) ?? []),
        order: Number.isFinite(order) ? (order as number) : 0,
      },
      include: { images: true },
    })

    revalidateProjects()

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('[API v1] Failed to create project:', error)
    return serverError('Failed to create project')
  }
}
