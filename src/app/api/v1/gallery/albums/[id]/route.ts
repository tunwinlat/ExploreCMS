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

const albumInclude = {
  photos: { orderBy: { order: 'asc' as const } },
  _count: { select: { photos: true } },
} as const

function revalidateGallery() {
  revalidatePath('/photos')
  revalidatePath('/admin/dashboard/photos')
}

// GET /api/v1/gallery/albums/[id] — get a single album with photos (requires gallery:read)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission(request, 'gallery:read')
  if (auth.error) return auth.error

  const { id } = await params

  try {
    const album = await prisma.photoAlbum.findUnique({ where: { id }, include: albumInclude })
    if (!album) return notFound('Album not found')
    return NextResponse.json({ album })
  } catch (error) {
    console.error('[API v1] Failed to get album:', error)
    return serverError('Failed to get album')
  }
}

// PATCH /api/v1/gallery/albums/[id] — update an album (requires gallery:update)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission(request, 'gallery:update')
  if (auth.error) return auth.error

  const { id } = await params
  const body = await parseJsonBody(request)
  if (body.error) return body.error
  const { title, description, coverImage, featured, published, order, slug: slugInput } = body.data

  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0 || title.length > 500)) {
    return badRequest('title must be a non-empty string of 500 characters or fewer')
  }
  if (description !== undefined && typeof description !== 'string') return badRequest('description must be a string')
  if (order !== undefined && !Number.isFinite(order)) return badRequest('order must be a number')
  if (slugInput !== undefined && typeof slugInput !== 'string') return badRequest('slug must be a string')
  if (coverImage !== undefined) {
    const coverResult = validateOptionalUrl(coverImage, 'coverImage')
    if (isUrlError(coverResult)) return badRequest(coverResult.error)
  }

  try {
    const existing = await prisma.photoAlbum.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return notFound('Album not found')

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title.trim()
    if (description !== undefined) data.description = description
    if (coverImage !== undefined) data.coverImage = coverImage || null
    if (featured !== undefined) data.featured = featured === true
    if (published !== undefined) data.published = published === true
    if (order !== undefined) data.order = order

    if (typeof slugInput === 'string' && slugInput.trim()) {
      let slug = generateSlug(slugInput)
      const conflict = await prisma.photoAlbum.findFirst({ where: { slug, id: { not: id } } })
      if (conflict) slug = `${slug}-${Date.now()}`
      data.slug = slug
    }

    if (Object.keys(data).length === 0) return badRequest('No updatable fields provided')

    const album = await prisma.photoAlbum.update({ where: { id }, data, include: albumInclude })

    revalidateGallery()

    return NextResponse.json({ album })
  } catch (error) {
    console.error('[API v1] Failed to update album:', error)
    return serverError('Failed to update album')
  }
}

// DELETE /api/v1/gallery/albums/[id] — delete an album and its photos (requires gallery:delete)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission(request, 'gallery:delete')
  if (auth.error) return auth.error

  const { id } = await params

  try {
    const album = await prisma.photoAlbum.findUnique({ where: { id }, select: { id: true } })
    if (!album) return notFound('Album not found')

    // Photos are removed via the onDelete: Cascade relation
    await prisma.photoAlbum.delete({ where: { id } })

    revalidateGallery()

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('[API v1] Failed to delete album:', error)
    return serverError('Failed to delete album')
  }
}
