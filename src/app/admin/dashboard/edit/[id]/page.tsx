/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getPostDb } from '@/lib/bunnyDb'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings-cache'
import PostEditor from '../../PostEditor'
import { notFound } from 'next/navigation'

export const metadata = { title: "Edit Post | ExploreCMS" }

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postDb = await getPostDb();

  const [post, availableTags, settings] = await Promise.all([
    postDb.post.findUnique({
      where: { id },
      include: { tags: { select: { name: true, slug: true } } }
    }),
    postDb.tag.findMany({
      select: { name: true, slug: true },
      orderBy: { name: 'asc' }
    }),
    getSettings()
  ])

  if (!post) notFound()

  const translationGroupId = (post as any).translationGroupId as string | null
  const siblingTranslations = translationGroupId
    ? await postDb.post.findMany({
        where: { translationGroupId, id: { not: post.id } },
        select: { id: true, language: true, title: true, slug: true }
      })
    : []

  const isCraftLinked = !!(post as any).craftDocumentId && !(post as any).craftUnlinked
  const craftMode = settings?.craftSyncMode || 'read-only'
  // Only lock editing in read-only mode. In backup/full-sync, posts are editable.
  const isReadOnly = isCraftLinked && craftMode === 'read-only'

  return <PostEditor post={post} availableTags={availableTags} readOnly={isReadOnly} craftPostId={isReadOnly ? post.id : undefined} siblingTranslations={siblingTranslations as any} />
}

export const runtime = 'edge';
