/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { getPostDb } from '@/lib/bunnyDb'
import TagList from './TagList'

export const metadata = { title: "Manage Tags | ExploreCMS" }

export default async function TagsPage() {
  const session = await verifySession()
  if (!session) return null

  const postDb = await getPostDb() as any;
  const tags = await postDb.tag.findMany({
    include: {
      _count: {
        select: { posts: true }
      }
    },
    orderBy: { name: 'asc' }
  })

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="admin-page-title">Manage Tags</h1>
          <p className="admin-page-subtitle">
            Rename or delete global tags. Changes will immediately sync across all associated posts.
          </p>
        </div>
      </header>
      
      <TagList initialTags={tags} />
    </div>
  )
}

export const runtime = 'edge';
