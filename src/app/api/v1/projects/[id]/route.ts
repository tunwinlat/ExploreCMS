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
  generateSlug, parseJsonBody, badRequest, notFound, serverError,
  validateOptionalUrl, isUrlError,
} from '@/lib/apiV1Utils'

const PROJECT_STATUSES = ['completed', 'in_progress', 'archived'] as const

function revalidateProjects() {
  revalidatePath('/projects')
  revalidatePath('/admin/dashboard/projects')
}

// GET /api/v1/projects/[id] — get a single project (requires projects:read)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission(request, 'projects:read')
  if (auth.error) return auth.error

  const { id } = await params

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: { images: { orderBy: { order: 'asc' as const } } },
    })
    if (!project) return notFound('Project not found')
    return NextResponse.json({ project })
  } catch (error) {
    console.error('[API v1] Failed to get project:', error)
    return serverError('Failed to get project')
  }
}

// PATCH /api/v1/projects/[id] — update a project (requires projects:update)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission(request, 'projects:update')
  if (auth.error) return auth.error

  const { id } = await params
  const body = await parseJsonBody(request)
  if (body.error) return body.error
  const { title, tagline, content, coverImage, status, featured, published, githubUrl, liveUrl, techTags, order, slug: slugInput, contentFormat } = body.data

  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0 || title.length > 500)) {
    return badRequest('title must be a non-empty string of 500 characters or fewer')
  }
  if (tagline !== undefined && typeof tagline !== 'string') return badRequest('tagline must be a string')
  if (content !== undefined && (typeof content !== 'string' || content.length > 500000)) {
    return badRequest('content must be a string of 500000 characters or fewer')
  }
  if (contentFormat !== undefined && contentFormat !== 'html' && contentFormat !== 'markdown') {
    return badRequest('contentFormat must be "html" or "markdown"')
  }
  if (status !== undefined && !PROJECT_STATUSES.includes(status as typeof PROJECT_STATUSES[number])) {
    return badRequest(`status must be one of: ${PROJECT_STATUSES.join(', ')}`)
  }
  if (order !== undefined && !Number.isFinite(order)) return badRequest('order must be a number')
  if (slugInput !== undefined && typeof slugInput !== 'string') return badRequest('slug must be a string')
  if (techTags !== undefined && (!Array.isArray(techTags) || techTags.some(t => typeof t !== 'string'))) {
    return badRequest('techTags must be an array of strings')
  }
  for (const [field, value] of [['coverImage', coverImage], ['githubUrl', githubUrl], ['liveUrl', liveUrl]] as const) {
    const result = validateOptionalUrl(value, field)
    if (isUrlError(result)) return badRequest(result.error)
  }

  try {
    const existing = await prisma.project.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return notFound('Project not found')

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title.trim()
    if (tagline !== undefined) data.tagline = tagline
    if (content !== undefined) data.content = content
    if (contentFormat !== undefined) data.contentFormat = contentFormat
    if (coverImage !== undefined) data.coverImage = coverImage || null
    if (status !== undefined) data.status = status
    if (featured !== undefined) data.featured = featured === true
    if (published !== undefined) data.published = published === true
    if (githubUrl !== undefined) data.githubUrl = githubUrl || null
    if (liveUrl !== undefined) data.liveUrl = liveUrl || null
    if (techTags !== undefined) data.techTags = JSON.stringify(techTags)
    if (order !== undefined) data.order = order

    if (typeof slugInput === 'string' && slugInput.trim()) {
      let slug = generateSlug(slugInput)
      const conflict = await prisma.project.findFirst({ where: { slug, id: { not: id } } })
      if (conflict) slug = `${slug}-${Date.now()}`
      data.slug = slug
    }

    if (Object.keys(data).length === 0) return badRequest('No updatable fields provided')

    const project = await prisma.project.update({
      where: { id },
      data,
      include: { images: { orderBy: { order: 'asc' as const } } },
    })

    revalidateProjects()

    return NextResponse.json({ project })
  } catch (error) {
    console.error('[API v1] Failed to update project:', error)
    return serverError('Failed to update project')
  }
}

// DELETE /api/v1/projects/[id] — delete a project (requires projects:delete)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission(request, 'projects:delete')
  if (auth.error) return auth.error

  const { id } = await params

  try {
    const project = await prisma.project.findUnique({ where: { id }, select: { id: true } })
    if (!project) return notFound('Project not found')

    await prisma.project.delete({ where: { id } })

    revalidateProjects()

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('[API v1] Failed to delete project:', error)
    return serverError('Failed to delete project')
  }
}
