/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createHash } from 'crypto'
import { prisma } from '@/lib/db'
import { requireApiPermission } from '@/lib/apiAuth'
import { generateSlug, parseJsonBody, parsePagination, badRequest, serverError } from '@/lib/apiV1Utils'

const postInclude = {
  author: { select: { username: true, firstName: true, lastName: true } },
  tags: true,
} as const

const MAX_IDEMPOTENCY_KEY_LENGTH = 255

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function normalizeTitle(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

function conflict(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 409 })
}

function existingPostResponse(post: unknown, idempotentReplay: boolean): NextResponse {
  return NextResponse.json(
    { post },
    {
      status: 200,
      headers: idempotentReplay
        ? { 'Idempotent-Replayed': 'true' }
        : { 'Post-Already-Exists': 'true' },
    }
  )
}

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
  const {
    title,
    content,
    slug: slugInput,
    published,
    isFeatured,
    tags,
    contentFormat,
    language,
    translationGroupId,
    idempotencyKey: bodyIdempotencyKey,
  } = body.data

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
  if (bodyIdempotencyKey !== undefined && typeof bodyIdempotencyKey !== 'string') {
    return badRequest('idempotencyKey must be a string')
  }

  const headerIdempotencyKey = request.headers.get('idempotency-key')
  if (headerIdempotencyKey !== null && headerIdempotencyKey.trim().length === 0) {
    return badRequest('Idempotency-Key must not be empty')
  }
  if (typeof bodyIdempotencyKey === 'string' && bodyIdempotencyKey.trim().length === 0) {
    return badRequest('idempotencyKey must not be empty')
  }

  const normalizedHeaderKey = headerIdempotencyKey?.trim()
  const normalizedBodyKey = typeof bodyIdempotencyKey === 'string' ? bodyIdempotencyKey.trim() : undefined
  if (normalizedHeaderKey && normalizedBodyKey && normalizedHeaderKey !== normalizedBodyKey) {
    return badRequest('Idempotency-Key header and idempotencyKey body field must match')
  }

  const idempotencyKey = normalizedHeaderKey ?? normalizedBodyKey
  if (idempotencyKey && idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return badRequest(`Idempotency-Key must be ${MAX_IDEMPOTENCY_KEY_LENGTH} characters or fewer`)
  }
  if (idempotencyKey && /[\u0000-\u001f\u007f]/.test(idempotencyKey)) {
    return badRequest('Idempotency-Key must not contain control characters')
  }

  const tagNames = Array.from(new Set(
    ((tags as string[] | undefined) ?? []).map(t => t.trim()).filter(Boolean)
  ))
  const tagUpdates = tagNames.map(name => ({
    where: { name },
    create: { name, slug: generateSlug(name) },
  }))

  const trimmedTitle = title.trim()
  const normalizedPostTitle = normalizeTitle(trimmedTitle)
  const normalizedContentFormat = (contentFormat as string | undefined) ?? 'markdown'
  const normalizedLanguage = typeof language === 'string' && language ? language : 'en'
  const normalizedTranslationGroupId = typeof translationGroupId === 'string' ? translationGroupId : null
  let baseSlug = typeof slugInput === 'string' && slugInput.trim() ? generateSlug(slugInput) : generateSlug(trimmedTitle)
  if (!baseSlug) baseSlug = `post-${sha256(normalizedPostTitle).slice(0, 12)}`

  const requestHash = sha256(JSON.stringify({
    title: trimmedTitle,
    content,
    slug: baseSlug,
    published: published === true,
    isFeatured: isFeatured === true,
    tags: [...tagNames].sort(),
    contentFormat: normalizedContentFormat,
    language: normalizedLanguage,
    translationGroupId: normalizedTranslationGroupId,
  }))
  const idempotencyKeyHash = idempotencyKey ? sha256(idempotencyKey) : null
  const authorId = auth.apiKey.createdById

  const findIdempotencyRecord = async () => {
    if (!idempotencyKeyHash) return null
    return prisma.postIdempotencyKey.findUnique({
      where: {
        authorId_keyHash: { authorId, keyHash: idempotencyKeyHash },
      },
      include: {
        post: { include: postInclude },
      },
    })
  }

  const resolveIdempotencyRecord = async (): Promise<NextResponse | null> => {
    const record = await findIdempotencyRecord()
    if (!record) return null
    if (record.requestHash !== requestHash) {
      return conflict('This idempotency key was already used with a different request')
    }
    return existingPostResponse(record.post, true)
  }

  const returnExistingPost = async (post: { id: string }): Promise<NextResponse> => {
    if (!idempotencyKeyHash) return existingPostResponse(post, false)

    try {
      await prisma.postIdempotencyKey.create({
        data: {
          authorId,
          keyHash: idempotencyKeyHash,
          requestHash,
          postId: post.id,
        },
      })
      return existingPostResponse(post, true)
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error
      const replay = await resolveIdempotencyRecord()
      if (replay) return replay
      throw error
    }
  }

  try {
    const replay = await resolveIdempotencyRecord()
    if (replay) return replay

    let slug = baseSlug
    const existing = await prisma.post.findUnique({ where: { slug }, include: postInclude })
    if (existing) {
      if (
        normalizeTitle(existing.title) === normalizedPostTitle
        && (existing.language || 'en') === normalizedLanguage
      ) {
        if (existing.authorId !== authorId) {
          return conflict('A post with this title and slug already exists')
        }
        return returnExistingPost(existing)
      }
      // Different titles can legitimately normalize to the same slug base.
      slug = `${baseSlug}-${Date.now()}`
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const post = await prisma.post.create({
          data: {
            title: trimmedTitle,
            slug,
            content,
            contentFormat: normalizedContentFormat,
            published: published === true,
            isFeatured: isFeatured === true,
            language: normalizedLanguage,
            translationGroupId: normalizedTranslationGroupId,
            authorId,
            tags: { connectOrCreate: tagUpdates },
            ...(idempotencyKeyHash ? {
              idempotencyKeys: {
                create: { authorId, keyHash: idempotencyKeyHash, requestHash },
              },
            } : {}),
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
        if (!isUniqueConstraintError(error)) throw error

        // A concurrent request with the same key may have committed first.
        const concurrentReplay = await resolveIdempotencyRecord()
        if (concurrentReplay) return concurrentReplay

        // The unique slug is the concurrency backstop for requests without a key.
        const slugOwner = await prisma.post.findUnique({ where: { slug }, include: postInclude })
        if (
          slugOwner
          && normalizeTitle(slugOwner.title) === normalizedPostTitle
          && (slugOwner.language || 'en') === normalizedLanguage
        ) {
          if (slugOwner.authorId !== authorId) {
            return conflict('A post with this title and slug already exists')
          }
          return returnExistingPost(slugOwner)
        }

        if (slugOwner && attempt < 2) {
          slug = `${baseSlug}-${Date.now() + attempt + 1}`
          continue
        }

        throw error
      }
    }

    return conflict('Unable to allocate a unique slug for this post')
  } catch (error) {
    console.error('[API v1] Failed to create post:', error)
    return serverError('Failed to create post')
  }
}
