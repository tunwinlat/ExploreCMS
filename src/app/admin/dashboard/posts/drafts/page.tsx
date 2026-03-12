/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getPostDb } from '@/lib/bunnyDb'
import Link from 'next/link'
import { DeletePostButton } from '../DeletePostButton'

export const metadata = { title: "Draft Posts | ExploreCMS" }

export default async function DraftPostsPage() {
  const postDb = await getPostDb() as any;
  const posts = await postDb.post.findMany({
    where: { published: false },
    orderBy: { updatedAt: 'desc' },
    include: { author: true }
  })

  return (
    <div className="fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="heading-xl" style={{ fontSize: '2.5rem', margin: 0 }}>Drafts</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your work-in-progress articles.</p>
        </div>
        <Link href="/admin/dashboard/new" prefetch={false} className="btn btn-primary">
          Create Post
        </Link>
      </div>

      <div className="glass" style={{ padding: '2rem' }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 0' }}>
            No drafts right now. Time to brainstorm something amazing!
          </div>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Title</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Author</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Last Edited</th>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post: any) => (
                <tr key={post.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                    <Link href={`/admin/dashboard/edit/${post.id}`} prefetch={false} style={{ fontWeight: 500 }}>
                      {post.title || "Untitled Draft"}
                    </Link>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: 'var(--radius-md)', 
                      fontSize: '0.85rem',
                      background: 'rgba(234, 179, 8, 0.1)',
                      color: '#eab308'
                    }}>
                      Draft
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{post.author.username}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    {new Date(post.updatedAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
                    <Link href={`/admin/dashboard/edit/${post.id}`} prefetch={false} style={{ color: 'var(--accent-hover)' }}>Resume Editing</Link>
                    <DeletePostButton id={post.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
