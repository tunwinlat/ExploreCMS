/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { prisma } from '@/lib/db'
import { getPostDb } from '@/lib/bunnyDb'
import { verifySession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata = { title: "Creating Draft | ExploreCMS" }

export default async function NewPostPage() {
  const session = await verifySession()
  if (!session) redirect('/admin/login')

  const postDb = await getPostDb();

  const draft = await postDb.post.create({
    data: {
      title: '',
      slug: `draft-${Date.now()}`,
      content: '',
      published: false,
      isFeatured: false,
      authorId: session.userId as string,
    }
  })

  redirect(`/admin/dashboard/edit/${draft.id}`)
}
