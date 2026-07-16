/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireApiPermission } from '@/lib/apiAuth'
import { generateSlug, parseJsonBody, badRequest, notFound, serverError } from '@/lib/apiV1Utils'
import { getCraftSyncMode, deletePostFromCraft } from '@/lib/craftSync'

const postInclude = {
  author: { select: { username: true, firstName: true, lastName: true } },
  tags: true,
} as const

function revalidateBlog() {
  revalidatePath('/')
  revalidatePath('/blog')
  revalidatePath('/admin/dashboard')
  revalidateTag('blog-posts', 'default')
}

// GET /api/v1/posts/[id] — get a single post (requires posts:read)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission(request, 'posts:read')
  if (auth.error) return auth.error

  const { id } = await params

  try {
    const post = await prisma.post.findUnique({ where: { id }, include: postInclude })
    if (!post) return notFound('Post not found')
    return NextResponse.json({ post })
  } catch (error) {
    console.error('[API v1] Failed to get post:', error)
    return serverError('Failed to get post')
  }
}

// PATCH /api/v1/posts/[id] — update a post (requires posts:update)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission(request, 'posts:update')
  if (auth.error) return auth.error

  const { id } = await params
  const body = await parseJsonBody(request)
  if (body.error) return body.error
  const { title, content, slug: slugInput, published, isFeatured, tags, contentFormat, language, translationGroupId } = body.data

  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0 || title.length > 500)) {
    return badRequest('title must be a non-empty string of 500 characters or fewer')
  }
  if (content !== undefined && (typeof content !== 'string' || content.length === 0 || content.length > 500000)) {
    return badRequest('content must be a non-empty string of 500000 characters or fewer')
  }
  if (contentFormat !== undefined && contentFormat !== 'html' && contentFormat !== 'markdown') {
    return badRequest('contentFormat must be "html" or "markdown"')
  }
  if (tags !== undefined && (!Array.isArray(tags) || tags.some(t => typeof t !== 'string'))) {
    return badRequest('tags must be an array of strings')
  }
  if (slugInput !== undefined && typeof slugInput !== 'string') {
    return badRequest('slug must be a string')
  }

  try {
    const existing = await prisma.post.findUnique({
      where: { id },
      select: { craftDocumentId: true, craftUnlinked: true, slug: true },
    })
    if (!existing) return notFound('Post not found')

    // Same guard as the dashboard: Craft-linked posts are read-only in read-only sync mode
    if (existing.craftDocumentId && !existing.craftUnlinked) {
      const syncMode = await getCraftSyncMode()
      if (syncMode === 'read-only') {
        return NextResponse.json(
          { error: 'This post is synced from Craft.do and cannot be edited. Unlink it first.' },
          { status: 409 }
        )
      }
    }

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title.trim()
    if (content !== undefined) data.content = content
    if (contentFormat !== undefined) data.contentFormat = contentFormat
    if (published !== undefined) data.published = published === true
    if (isFeatured !== undefined) data.isFeatured = isFeatured === true
    if (language !== undefined) data.language = language
    if (translationGroupId !== undefined) data.translationGroupId = translationGroupId

    if (typeof slugInput === 'string' && slugInput.trim()) {
      let slug = generateSlug(slugInput)
      const conflict = await prisma.post.findFirst({ where: { slug, id: { not: id } } })
      if (conflict) slug = `${slug}-${Date.now()}`
      data.slug = slug
    }

    if (tags !== undefined) {
      const tagNames = (tags as string[]).map(t => t.trim()).filter(Boolean)
      data.tags = {
        set: [],
        connectOrCreate: tagNames.map(name => ({
          where: { name },
          create: { name, slug: generateSlug(name) },
        })),
      }
    }

    if (Object.keys(data).length === 0) return badRequest('No updatable fields provided')

    const post = await prisma.post.update({ where: { id }, data, include: postInclude })

    revalidateBlog()

    return NextResponse.json({ post })
  } catch (error) {
    console.error('[API v1] Failed to update post:', error)
    return serverError('Failed to update post')
  }
}

// DELETE /api/v1/posts/[id] — delete a post (requires posts:delete)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission(request, 'posts:delete')
  if (auth.error) return auth.error

  const { id } = await params

  try {
    const post = await prisma.post.findUnique({ where: { id }, select: { id: true, craftDocumentId: true } })
    if (!post) return notFound('Post not found')

    await prisma.post.delete({ where: { id } })

    // In full-sync mode, also delete from Craft (same behavior as the dashboard)
    if (post.craftDocumentId) {
      try {
        await deletePostFromCraft(post.craftDocumentId)
      } catch (err) {
        console.error('[API v1] Failed to delete post from Craft:', err)
      }
    }

    revalidateBlog()

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('[API v1] Failed to delete post:', error)
    return serverError('Failed to delete post')
  }
}
