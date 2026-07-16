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

const albumInclude = {
  photos: { orderBy: { order: 'asc' as const } },
  _count: { select: { photos: true } },
} as const

function revalidateGallery() {
  revalidatePath('/photos')
  revalidatePath('/admin/dashboard/photos')
}

// GET /api/v1/gallery/albums — list photo albums (requires gallery:read)
export async function GET(request: Request) {
  const auth = await requireApiPermission(request, 'gallery:read')
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const { limit, cursor } = parsePagination(searchParams)
  const publishedParam = searchParams.get('published')

  const where: { published?: boolean } = {}
  if (publishedParam === 'true') where.published = true
  else if (publishedParam === 'false') where.published = false

  try {
    const albums = await prisma.photoAlbum.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: albumInclude,
    })

    let nextCursor: string | undefined
    if (albums.length > limit) {
      nextCursor = albums.pop()!.id
    }

    return NextResponse.json({ albums, nextCursor })
  } catch (error) {
    console.error('[API v1] Failed to list albums:', error)
    return serverError('Failed to list albums')
  }
}

// POST /api/v1/gallery/albums — create a photo album (requires gallery:create)
export async function POST(request: Request) {
  const auth = await requireApiPermission(request, 'gallery:create')
  if (auth.error) return auth.error

  const body = await parseJsonBody(request)
  if (body.error) return body.error
  const { title, description, coverImage, featured, published, order, slug: slugInput } = body.data

  if (typeof title !== 'string' || title.trim().length === 0) return badRequest('title is required')
  if (title.length > 500) return badRequest('title must be 500 characters or fewer')
  if (description !== undefined && typeof description !== 'string') return badRequest('description must be a string')
  if (order !== undefined && !Number.isFinite(order)) return badRequest('order must be a number')
  if (slugInput !== undefined && typeof slugInput !== 'string') return badRequest('slug must be a string')
  const coverResult = validateOptionalUrl(coverImage, 'coverImage')
  if (isUrlError(coverResult)) return badRequest(coverResult.error)

  let slug = typeof slugInput === 'string' && slugInput.trim() ? generateSlug(slugInput) : generateSlug(title)
  if (!slug) slug = `album-${Date.now()}`

  try {
    const existing = await prisma.photoAlbum.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now()}`

    const album = await prisma.photoAlbum.create({
      data: {
        title: title.trim(),
        slug,
        description: typeof description === 'string' ? description : '',
        coverImage: coverResult,
        featured: featured === true,
        published: published === true,
        order: Number.isFinite(order) ? (order as number) : 0,
      },
      include: albumInclude,
    })

    revalidateGallery()

    return NextResponse.json({ album }, { status: 201 })
  } catch (error) {
    console.error('[API v1] Failed to create album:', error)
    return serverError('Failed to create album')
  }
}
