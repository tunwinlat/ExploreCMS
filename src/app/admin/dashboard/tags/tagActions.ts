/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { getPostDb } from '@/lib/bunnyDb'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateTag(id: string, newName: string) {
  const session = await verifySession()
  if (!session) return { error: 'Unauthorized' }

  try {
    const postDb = await getPostDb() as any;
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    
    // Check if new slug already exists
    const existing = await postDb.tag.findFirst({
      where: { slug, id: { not: id } }
    })
    
    if (existing) {
      return { error: 'A tag with this name already exists' }
    }

    await postDb.tag.update({
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
  const session = await verifySession()
  if (!session) return { error: 'Unauthorized' }

  try {
    const postDb = await getPostDb() as any;
    // Due to implicit m-n, this safely removes relations automatically
    await postDb.tag.delete({
      where: { id }
    })

    revalidatePath('/admin/dashboard/tags')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to delete tag' }
  }
}
