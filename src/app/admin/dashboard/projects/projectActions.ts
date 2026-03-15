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

export async function saveProject(formData: FormData) {
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')

  const id = formData.get('id') as string | null
  const title = formData.get('title') as string
  const tagline = (formData.get('tagline') as string) || ''
  const content = (formData.get('content') as string) || ''
  const coverImage = (formData.get('coverImage') as string) || null
  const status = (formData.get('status') as string) || 'completed'
  const featured = formData.get('featured') === 'true'
  const published = formData.get('published') === 'true'
  const githubUrl = (formData.get('githubUrl') as string) || null
  const liveUrl = (formData.get('liveUrl') as string) || null
  const techTagsRaw = (formData.get('techTags') as string) || '[]'
  const orderVal = parseInt((formData.get('order') as string) || '0', 10)
  const slugInput = formData.get('slug') as string | null

  if (!title) return { error: 'Title is required' }

  const techTags = techTagsRaw.startsWith('[')
    ? techTagsRaw
    : JSON.stringify(techTagsRaw.split(',').map(t => t.trim()).filter(Boolean))

  let slug = slugInput ? generateSlug(slugInput) : generateSlug(title)

  try {
    if (id) {
      const existing = await (prisma as any).project.findFirst({ where: { slug, id: { not: id } } })
      if (existing) slug = `${slug}-${Date.now()}`

      await (prisma as any).project.update({
        where: { id },
        data: { title, tagline, content, coverImage, status, featured, published, githubUrl, liveUrl, techTags, order: orderVal, slug },
      })
    } else {
      let existing = await (prisma as any).project.findUnique({ where: { slug } })
      if (existing) slug = `${slug}-${Date.now()}`

      await (prisma as any).project.create({
        data: { title, tagline, content, coverImage, status, featured, published, githubUrl, liveUrl, techTags, order: orderVal, slug },
      })
    }

    revalidatePath('/projects')
    revalidatePath('/admin/dashboard/projects')
  } catch (error) {
    return { error: 'Failed to save project' }
  }

  redirect('/admin/dashboard/projects')
}

export async function deleteProject(id: string) {
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')

  try {
    await (prisma as any).project.delete({ where: { id } })
    revalidatePath('/projects')
    revalidatePath('/admin/dashboard/projects')
  } catch {
    return { error: 'Failed to delete project' }
  }

  redirect('/admin/dashboard/projects')
}

export async function addProjectImage(projectId: string, url: string, caption: string) {
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')

  try {
    const maxOrder = await (prisma as any).projectImage.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const order = (maxOrder?.order ?? -1) + 1
    await (prisma as any).projectImage.create({ data: { projectId, url, caption, order } })
    revalidatePath('/admin/dashboard/projects')
    return { success: true }
  } catch {
    return { error: 'Failed to add image' }
  }
}

export async function deleteProjectImage(imageId: string) {
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')

  try {
    await (prisma as any).projectImage.delete({ where: { id: imageId } })
    revalidatePath('/admin/dashboard/projects')
    return { success: true }
  } catch {
    return { error: 'Failed to delete image' }
  }
}
