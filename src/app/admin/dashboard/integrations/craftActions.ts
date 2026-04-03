/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPostDb } from '@/lib/bunnyDb'
import { revalidatePath } from 'next/cache'
import { encrypt, decrypt } from '@/lib/crypto'

export async function saveCraftSettings(
  serverUrl: string,
  apiToken: string,
  folderId: string,
  folderName: string,
  syncMode: string,
  enabled: boolean,
  writeAccess: boolean
) {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') {
    return { error: 'Unauthorized' }
  }

  // Validate: backup/full-sync requires write access
  if ((syncMode === 'backup' || syncMode === 'full-sync') && !writeAccess) {
    return { error: 'Backup and Full Sync modes require write access to Craft. Please test connection first.' }
  }

  try {
    // Encrypt the API token before saving
    const encryptedToken = apiToken ? encrypt(apiToken) : null
    
    await (prisma as any).siteSettings.upsert({
      where: { id: 'singleton' },
      update: {
        craftServerUrl: serverUrl || null,
        craftApiToken: encryptedToken,
        craftFolderId: folderId || null,
        craftFolderName: folderName || null,
        craftSyncMode: syncMode || 'read-only',
        craftEnabled: enabled,
        craftWriteAccess: writeAccess,
        craftError: null, // Clear error on save
      },
      create: {
        id: 'singleton',
        craftServerUrl: serverUrl || null,
        craftApiToken: encryptedToken,
        craftFolderId: folderId || null,
        craftFolderName: folderName || null,
        craftSyncMode: syncMode || 'read-only',
        craftEnabled: enabled,
        craftWriteAccess: writeAccess,
      },
    })

    revalidatePath('/admin/dashboard/integrations')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to save Craft settings' }
  }
}

export async function updateCraftWriteAccess(writeAccess: boolean) {
  const session = await verifySession()
  if (!session || session.role !== 'OWNER') {
    return { error: 'Unauthorized' }
  }

  try {
    await (prisma as any).siteSettings.update({
      where: { id: 'singleton' },
      data: { craftWriteAccess: writeAccess },
    })
    return { success: true }
  } catch {
    return { error: 'Failed to update' }
  }
}

export async function unlinkCraftPost(postId: string) {
  const session = await verifySession()
  if (!session) {
    return { error: 'Unauthorized' }
  }

  try {
    const postDb = await getPostDb()
    const post = await postDb.post.findUnique({ where: { id: postId } })
    if (!post) return { error: 'Post not found' }
    if (!post.craftDocumentId) return { error: 'Post is not linked to Craft' }

    await postDb.post.update({
      where: { id: postId },
      data: { craftUnlinked: true },
    })

    revalidatePath('/admin/dashboard/posts/published')
    revalidatePath(`/admin/dashboard/edit/${postId}`)
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to unlink post' }
  }
}
