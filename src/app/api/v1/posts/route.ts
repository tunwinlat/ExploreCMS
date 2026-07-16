/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireApiPermission } from '@/lib/apiAuth'
import { generateSlug, parseJsonBody, parsePagination, badRequest, serverError } from '@/lib/apiV1Utils'

const postInclude = {
  author: { select: { username: true, firstName: true, lastName: true } },
  tags: true,
} as const

// GET /api/v1/posts — list posts (requires posts:read)
export async function GET(request: Request) {
  const auth = await requireApiPermission(request, 'posts:read')
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const { limit, cursor } = parsePagination(searchParams)
  const publishedParam = searchParams.get('published')

  const where: { published?: boolean } = {}
  if (publishedParam === 'true') where.published = true
  else if (publishedParam === 'false') where.published = false

  try {
    const posts = await prisma.post.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: postInclude,
    })

    let nextCursor: string | undefined
    if (posts.length > limit) {
      nextCursor = posts.pop()!.id
    }

    return NextResponse.json({ posts, nextCursor })
  } catch (error) {
    console.error('[API v1] Failed to list posts:', error)
    return serverError('Failed to list posts')
  }
}

// POST /api/v1/posts — create a post (requires posts:create)
export async function POST(request: Request) {
  const auth = await requireApiPermission(request, 'posts:create')
  if (auth.error) return auth.error

  const body = await parseJsonBody(request)
  if (body.error) return body.error
  const { title, content, slug: slugInput, published, isFeatured, tags, contentFormat, language, translationGroupId } = body.data

  if (typeof title !== 'string' || title.trim().length === 0) return badRequest('title is required')
  if (typeof content !== 'string' || content.trim().length === 0) return badRequest('content is required')
  if (title.length > 500) return badRequest('title must be 500 characters or fewer')
  if (content.length > 500000) return badRequest('content is too large')
  if (contentFormat !== undefined && contentFormat !== 'html' && contentFormat !== 'markdown') {
    return badRequest('contentFormat must be "html" or "markdown"')
  }
  if (tags !== undefined && (!Array.isArray(tags) || tags.some(t => typeof t !== 'string'))) {
    return badRequest('tags must be an array of strings')
  }
  if (slugInput !== undefined && (typeof slugInput !== 'string' || slugInput.length > 500)) {
    return badRequest('slug must be a string of 500 characters or fewer')
  }

  const tagNames = ((tags as string[] | undefined) ?? []).map(t => t.trim()).filter(Boolean)
  const tagUpdates = tagNames.map(name => ({
    where: { name },
    create: { name, slug: generateSlug(name) },
  }))

  let slug = typeof slugInput === 'string' && slugInput.trim() ? generateSlug(slugInput) : generateSlug(title)
  if (!slug) slug = `post-${Date.now()}`

  try {
    const existing = await prisma.post.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now()}`

    const post = await prisma.post.create({
      data: {
        title: title.trim(),
        slug,
        content,
        contentFormat: (contentFormat as string | undefined) ?? 'markdown',
        published: published === true,
        isFeatured: isFeatured === true,
        language: typeof language === 'string' && language ? language : 'en',
        translationGroupId: typeof translationGroupId === 'string' ? translationGroupId : null,
        authorId: auth.apiKey.createdById,
        tags: { connectOrCreate: tagUpdates },
      },
      include: postInclude,
    })

    // Mirror the dashboard behavior: base posts without a translation group
    // get their own ID as the group ID.
    if (!post.translationGroupId) {
      await prisma.post.update({
        where: { id: post.id },
        data: { translationGroupId: post.id },
      })
      post.translationGroupId = post.id
    }

    revalidatePath('/')
    revalidatePath('/blog')
    revalidatePath('/admin/dashboard')
    revalidateTag('blog-posts', 'default')

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error('[API v1] Failed to create post:', error)
    return serverError('Failed to create post')
  }
}
