/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getPostDb } from '@/lib/bunnyDb'
import { verifySession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PostEditor from '../PostEditor'

export const metadata = { title: "New Post | ExploreCMS" }

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ translationGroupId?: string; lang?: string }> }) {
  const session = await verifySession()
  if (!session) redirect('/admin/login')

  const { translationGroupId, lang } = await searchParams

  const postDb = await getPostDb();
  const [availableTags, parentPost] = await Promise.all([
    postDb.tag.findMany({
      select: { name: true, slug: true },
      orderBy: { name: 'asc' }
    }),
    // When adding a translation, the translationGroupId is the parent post's ID
    translationGroupId
      ? postDb.post.findUnique({ where: { id: translationGroupId }, select: { title: true } }).catch(() => null)
      : Promise.resolve(null),
  ])

  return (
    <PostEditor
      availableTags={availableTags}
      initialTranslationGroupId={translationGroupId}
      parentPostTitle={parentPost?.title ?? undefined}
      initialLanguage={lang}
    />
  )
}
