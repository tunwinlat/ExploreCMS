/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function generateSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

// ── Album actions ──────────────────────────────────────────────────────────

export async function saveAlbum(formData: FormData) {
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')

  const id = formData.get('id') as string | null
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || ''
  const coverImage = (formData.get('coverImage') as string) || null
  const featured = formData.get('featured') === 'true'
  const published = formData.get('published') === 'true'
  const orderVal = parseInt((formData.get('order') as string) || '0', 10)
  const slugInput = formData.get('slug') as string | null

  if (!title) return { error: 'Title is required' }

  let slug = slugInput ? generateSlug(slugInput) : generateSlug(title)

  try {
    if (id) {
      const existing = await (prisma as any).photoAlbum.findFirst({ where: { slug, id: { not: id } } })
      if (existing) slug = `${slug}-${Date.now()}`
      await (prisma as any).photoAlbum.update({
        where: { id },
        data: { title, description, coverImage, featured, published, order: orderVal, slug },
      })
    } else {
      let existing = await (prisma as any).photoAlbum.findUnique({ where: { slug } })
      if (existing) slug = `${slug}-${Date.now()}`
      await (prisma as any).photoAlbum.create({
        data: { title, description, coverImage, featured, published, order: orderVal, slug },
      })
    }

    revalidatePath('/photos')
    revalidatePath('/admin/dashboard/photos')
  } catch {
    return { error: 'Failed to save album' }
  }

  redirect('/admin/dashboard/photos')
}

export async function deleteAlbum(id: string) {
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')

  try {
    await (prisma as any).photoAlbum.delete({ where: { id } })
    revalidatePath('/photos')
    revalidatePath('/admin/dashboard/photos')
  } catch {
    return { error: 'Failed to delete album' }
  }

  redirect('/admin/dashboard/photos')
}

// ── Photo actions ──────────────────────────────────────────────────────────

export async function addPhoto(formData: FormData) {
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')

  const albumId = formData.get('albumId') as string
  const url = formData.get('url') as string
  const title = (formData.get('title') as string) || ''
  const description = (formData.get('description') as string) || ''
  const location = (formData.get('location') as string) || ''
  const takenAtStr = formData.get('takenAt') as string | null
  const featured = formData.get('featured') === 'true'

  if (!url) return { error: 'Photo URL is required' }

  try {
    const maxOrder = await (prisma as any).photo.findFirst({
      where: { albumId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const order = (maxOrder?.order ?? -1) + 1

    await (prisma as any).photo.create({
      data: {
        albumId,
        url,
        title,
        description,
        location,
        takenAt: takenAtStr ? new Date(takenAtStr) : null,
        featured,
        order,
      },
    })

    revalidatePath('/photos')
    revalidatePath('/admin/dashboard/photos')
    return { success: true }
  } catch {
    return { error: 'Failed to add photo' }
  }
}

export async function deletePhoto(photoId: string, albumId: string) {
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')

  try {
    await (prisma as any).photo.delete({ where: { id: photoId } })
    revalidatePath('/photos')
    revalidatePath('/admin/dashboard/photos')
    return { success: true }
  } catch {
    return { error: 'Failed to delete photo' }
  }
}

export async function updateAlbumCover(albumId: string, coverImage: string) {
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')

  try {
    await (prisma as any).photoAlbum.update({ where: { id: albumId }, data: { coverImage } })
    revalidatePath('/photos')
    revalidatePath('/admin/dashboard/photos')
    return { success: true }
  } catch {
    return { error: 'Failed to update cover' }
  }
}
