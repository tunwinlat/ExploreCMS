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

function validatePhotoFields(body: Record<string, unknown>): { error?: string } {
  const { url, title, description, location, takenAt, order } = body
  if (title !== undefined && typeof title !== 'string') return { error: 'title must be a string' }
  if (description !== undefined && typeof description !== 'string') return { error: 'description must be a string' }
  if (location !== undefined && typeof location !== 'string') return { error: 'location must be a string' }
  if (order !== undefined && !Number.isFinite(order)) return { error: 'order must be a number' }
  if (takenAt !== undefined && takenAt !== null) {
    if (typeof takenAt !== 'string' || Number.isNaN(Date.parse(takenAt))) {
      return { error: 'takenAt must be an ISO 8601 date string or null' }
    }
  }
  const urlResult = validateOptionalUrl(url, 'url')
  if (isUrlError(urlResult)) return urlResult
  return {}
}

// POST /api/v1/gallery/albums/[id]/photos — add a photo to an album (requires gallery:create)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission(request, 'gallery:create')
  if (auth.error) return auth.error

  const { id: albumId } = await params
  const body = await parseJsonBody(request)
  if (body.error) return body.error
  const { url, title, description, location, takenAt, featured, order } = body.data

  if (url === undefined || url === null || url === '') return badRequest('url is required')
  const validation = validatePhotoFields(body.data)
  if (validation.error) return badRequest(validation.error)

  try {
    const album = await prisma.photoAlbum.findUnique({ where: { id: albumId }, select: { id: true } })
    if (!album) return notFound('Album not found')

    let photoOrder: number
    if (Number.isFinite(order)) {
      photoOrder = order as number
    } else {
      const maxOrder = await prisma.photo.findFirst({
        where: { albumId },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      photoOrder = (maxOrder?.order ?? -1) + 1
    }

    const photo = await prisma.photo.create({
      data: {
        albumId,
        url: url as string,
        title: typeof title === 'string' ? title : '',
        description: typeof description === 'string' ? description : '',
        location: typeof location === 'string' ? location : '',
        takenAt: typeof takenAt === 'string' ? new Date(takenAt) : null,
        featured: featured === true,
        order: photoOrder,
      },
    })

    revalidateGallery()

    return NextResponse.json({ photo }, { status: 201 })
  } catch (error) {
    console.error('[API v1] Failed to add photo:', error)
    return serverError('Failed to add photo')
  }
}

// PATCH /api/v1/gallery/albums/[id]/photos — reorder/replace photo set is not supported;
// use /api/v1/gallery/photos/[photoId] to update individual photos.
export async function PATCH() {
  return NextResponse.json(
    { error: 'Use /api/v1/gallery/photos/{photoId} to update individual photos' },
    { status: 405 }
  )
}
