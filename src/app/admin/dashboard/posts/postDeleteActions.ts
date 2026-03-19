/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { getPostDb } from '@/lib/bunnyDb'
import { verifySession } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { deletePostFromCraft } from '@/lib/craftSync'

export async function deletePostById(id: string) {
  const session = await verifySession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const postDb = await getPostDb() as any;
    const post = await postDb.post.findUnique({ where: { id } })
    if (!post) return { success: false, error: 'Not found' }

    // Only Owner or the Author can delete
    if (session.role !== 'OWNER' && post.authorId !== session.userId) {
      return { success: false, error: 'Permission denied' }
    }

    // Store craft document ID before deleting
    const craftDocumentId = post.craftDocumentId

    await postDb.post.delete({ where: { id } })

    // In full-sync mode, also delete from Craft
    if (craftDocumentId) {
      try {
        await deletePostFromCraft(craftDocumentId)
      } catch (err) {
        console.error('[CraftSync] Failed to delete from Craft:', err)
        // Non-critical - post is already deleted locally
      }
    }
    
    revalidatePath('/admin/dashboard')
    revalidatePath('/')
    revalidatePath('/blog')
    revalidateTag('blog-posts', 'default')
    
    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Database error deleting post' }
  }
}
