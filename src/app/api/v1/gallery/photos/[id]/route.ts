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
  parseJsonBody, badRequest, notFound, serverError,
  validateOptionalUrl, isUrlError,
} from '@/lib/apiV1Utils'

function revalidateGallery() {
  revalidatePath('/photos')
  revalidatePath('/admin/dashboard/photos')
}

// GET /api/v1/gallery/photos/[id] — get a single photo (requires gallery:read)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission(request, 'gallery:read')
  if (auth.error) return auth.error

  const { id } = await params

  try {
    const photo = await prisma.photo.findUnique({ where: { id } })
    if (!photo) return notFound('Photo not found')
    return NextResponse.json({ photo })
  } catch (error) {
    console.error('[API v1] Failed to get photo:', error)
    return serverError('Failed to get photo')
  }
}

// PATCH /api/v1/gallery/photos/[id] — update a photo (requires gallery:update)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission(request, 'gallery:update')
  if (auth.error) return auth.error

  const { id } = await params
  const body = await parseJsonBody(request)
  if (body.error) return body.error
  const { url, title, description, location, takenAt, featured, order, albumId } = body.data

  if (url !== undefined) {
    const urlResult = validateOptionalUrl(url, 'url')
    if (isUrlError(urlResult)) return badRequest(urlResult.error)
    if (urlResult === null) return badRequest('url cannot be empty')
  }
  if (title !== undefined && typeof title !== 'string') return badRequest('title must be a string')
  if (description !== undefined && typeof description !== 'string') return badRequest('description must be a string')
  if (location !== undefined && typeof location !== 'string') return badRequest('location must be a string')
  if (order !== undefined && !Number.isFinite(order)) return badRequest('order must be a number')
  if (albumId !== undefined && typeof albumId !== 'string') return badRequest('albumId must be a string')
  if (takenAt !== undefined && takenAt !== null) {
    if (typeof takenAt !== 'string' || Number.isNaN(Date.parse(takenAt))) {
      return badRequest('takenAt must be an ISO 8601 date string or null')
    }
  }

  try {
    const existing = await prisma.photo.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return notFound('Photo not found')

    if (typeof albumId === 'string') {
      const album = await prisma.photoAlbum.findUnique({ where: { id: albumId }, select: { id: true } })
      if (!album) return badRequest('Target albumId does not exist')
    }

    const data: Record<string, unknown> = {}
    if (url !== undefined) data.url = url
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (location !== undefined) data.location = location
    if (takenAt !== undefined) data.takenAt = takenAt === null ? null : new Date(takenAt as string)
    if (featured !== undefined) data.featured = featured === true
    if (order !== undefined) data.order = order
    if (typeof albumId === 'string') data.albumId = albumId

    if (Object.keys(data).length === 0) return badRequest('No updatable fields provided')

    const photo = await prisma.photo.update({ where: { id }, data })

    revalidateGallery()

    return NextResponse.json({ photo })
  } catch (error) {
    console.error('[API v1] Failed to update photo:', error)
    return serverError('Failed to update photo')
  }
}

// DELETE /api/v1/gallery/photos/[id] — delete a photo (requires gallery:delete)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission(request, 'gallery:delete')
  if (auth.error) return auth.error

  const { id } = await params

  try {
    const photo = await prisma.photo.findUnique({ where: { id }, select: { id: true } })
    if (!photo) return notFound('Photo not found')

    await prisma.photo.delete({ where: { id } })

    revalidateGallery()

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('[API v1] Failed to delete photo:', error)
    return serverError('Failed to delete photo')
  }
}
