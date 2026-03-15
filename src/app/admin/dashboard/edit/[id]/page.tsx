/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getPostDb } from '@/lib/bunnyDb'
import PostEditor from '../../PostEditor'
import { notFound } from 'next/navigation'

export const metadata = { title: "Edit Post | ExploreCMS" }

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postDb = await getPostDb();
  
  // Parallelize independent queries to improve page load performance
  const [post, availableTags] = await Promise.all([
    postDb.post.findUnique({
      where: { id },
      include: { tags: { select: { name: true, slug: true } } }
    }),
    postDb.tag.findMany({
      select: { name: true, slug: true },
      orderBy: { name: 'asc' }
    })
  ])

  if (!post) notFound()

  const isCraftLinked = !!(post as any).craftDocumentId && !(post as any).craftUnlinked

  return <PostEditor post={post} availableTags={availableTags} readOnly={isCraftLinked} craftPostId={isCraftLinked ? post.id : undefined} />
}
