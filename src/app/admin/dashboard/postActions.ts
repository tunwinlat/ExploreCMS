/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { prisma } from '@/lib/db'
import { getPostDb } from '@/lib/bunnyDb'
import { verifySession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath, revalidateTag } from 'next/cache'
import { after } from 'next/server'
import { pushPostToCraft, getCraftSyncMode, deletePostFromCraft } from '@/lib/craftSync'

function generateSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

export async function savePost(formData: FormData, options: { redirect?: boolean } = { redirect: true }) {
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')
  
  const postDb = await getPostDb();

  const id = formData.get('id') as string | null
  const title = formData.get('title') as string
  const slugInput = formData.get('slug') as string | null
  const content = formData.get('content') as string
  const published = formData.get('published') === 'true'
  // If the checkbox isn't in the submitted form (e.g. advanced pane closed) we
  // shouldn't blindly reset the flag to false. Only override if an explicit value
  // was provided; otherwise we will read the previous value from the database.
  let isFeatured: boolean
  const rawFeatured = formData.get('isFeatured')
  if (rawFeatured === null && id) {
    // fetch current flag
    const existing = await postDb.post.findUnique({ where: { id }, select: { isFeatured: true } })
    isFeatured = existing?.isFeatured ?? false
  } else {
    isFeatured = rawFeatured === 'true'
  }
  const tagsString = formData.get('tags') as string || ''
  
  const language = (formData.get('language') as string) || 'en'
  const translationGroupId = formData.get('translationGroupId') as string | null

  if (!title || !content) return { error: 'Title and content are required' }
  if (title.length > 500) return { error: 'Title must be 500 characters or fewer' }
  if (content.length > 500000) return { error: 'Content is too large' }

  // Process Tags
  const tagNames = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0)
  const tagUpdates = tagNames.map(name => ({
    where: { name },
    create: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }
  }))

  let slug = slugInput ? generateSlug(slugInput) : generateSlug(title)

  if (id) {
    // Guard: prevent editing Craft-linked posts in read-only mode only
    const craftCheck = await postDb.post.findUnique({ where: { id }, select: { craftDocumentId: true, craftUnlinked: true } })
    if (craftCheck?.craftDocumentId && !craftCheck?.craftUnlinked) {
      const syncMode = await getCraftSyncMode()
      if (syncMode === 'read-only') {
        return { error: 'This post is synced from Craft.do and cannot be edited. Unlink it first.' }
      }
    }

    // If slug changed, verify uniqueness
    const existing = await postDb.post.findFirst({ where: { slug, id: { not: id } } })
    if (existing) slug = `${slug}-${Date.now()}`

    await postDb.post.update({
      where: { id },
      data: { 
        title, slug, content, published, isFeatured, 
        language, 
        translationGroupId,
        tags: {
          set: [], // Clear old tags
          connectOrCreate: tagUpdates
        }
      } as any
    })
  } else {
    // Generate unique slug
    let existing = await postDb.post.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now()}`

    // Ensure we handle setting the translationGroupId correctly.
    // If it's a new translation group, we'll set it to the new post's ID after creation.
    const createdPost = await postDb.post.create({
      data: {
        title,
        slug,
        content,
        contentFormat: 'markdown',
        language,
        translationGroupId,
        published,
        isFeatured,
        authorId: session.userId as string,
        tags: {
          connectOrCreate: tagUpdates
        }
      } as any
    })
    
    // Auto-generate translationGroupId for base posts that don't have one
    if (!translationGroupId) {
       await postDb.post.update({
         where: { id: createdPost.id },
         data: { translationGroupId: createdPost.id } as any
       });
    }
  }

  // Bust the homepage cache so the new/updated post appears on the site
  revalidatePath('/')
  revalidatePath('/blog')
  revalidatePath('/admin/dashboard')
  revalidateTag('blog-posts', 'default')

  // Push to Craft in backup/full-sync mode (runs after response)
  if (published) {
    const postIdForCraft = id || (await postDb.post.findUnique({ where: { slug } }))?.id
    if (postIdForCraft) {
      after(async () => {
        try {
          await pushPostToCraft(postIdForCraft)
        } catch {
          // Non-critical
        }
      })
    }
  }

  if (options.redirect) {
    redirect('/admin/dashboard')
  }

  return { success: true }
}

export async function deletePost(id: string) {
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')

  const postDb = await getPostDb();

  // Verify the post exists and the user has permission to delete it
  const post = await postDb.post.findUnique({ where: { id } })
  if (!post) throw new Error('Post not found')
  if (session.role !== 'OWNER' && post.authorId !== session.userId) {
    throw new Error('Permission denied')
  }

  // Store craft document ID before deleting
  const craftDocumentId = post.craftDocumentId

  await postDb.post.delete({ where: { id } })

  // In full-sync mode, also delete from Craft (run before redirect)
  if (craftDocumentId) {
    try {
      await deletePostFromCraft(craftDocumentId)
    } catch (err) {
      console.error('[CraftSync] Failed to delete from Craft:', err)
      // Non-critical - post is already deleted locally
    }
  }

  revalidatePath('/')
  revalidatePath('/blog')
  revalidatePath('/admin/dashboard')
  revalidateTag('blog-posts', 'default')
  redirect('/admin/dashboard')
}
