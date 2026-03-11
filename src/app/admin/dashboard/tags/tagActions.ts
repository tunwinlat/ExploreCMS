/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateTag(id: string, newName: string) {
  const session = await verifySession()
  if (!session) return { error: 'Unauthorized' }

  try {
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    
    // Check if new slug already exists
    const existing = await prisma.tag.findFirst({
      where: { slug, id: { not: id } }
    })
    
    if (existing) {
      return { error: 'A tag with this name already exists' }
    }

    await prisma.tag.update({
      where: { id },
      data: { name: newName, slug }
    })

    revalidatePath('/admin/dashboard/tags')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to update tag' }
  }
}

export async function deleteTag(id: string) {
  const payload = await verifySession()
  if (!payload || payload.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  try {
    await prisma.tag.delete({
      where: { id }
    })
    revalidatePath('/admin/dashboard/tags')
    return { success: true }
  } catch (error) {
    console.error('Error deleting tag:', error)
    throw new Error('Failed to delete tag')
  }
}
