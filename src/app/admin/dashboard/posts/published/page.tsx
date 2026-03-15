/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getPostDb } from '@/lib/bunnyDb'
import Link from 'next/link'
import { DeletePostButton } from '../DeletePostButton'
import { UnlinkCraftButton } from './UnlinkCraftButton'

export const metadata = { title: "Published Posts | ExploreCMS" }

export default async function PublishedPostsPage() {
  const postDb = await getPostDb() as any;
  const posts = await postDb.post.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    include: { author: true }
  })

  return (
    <div className="fade-in-up">
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="admin-page-title">Published Posts</h1>
          <p className="admin-page-subtitle">Manage all articles currently live on your site.</p>
        </div>
        <Link href="/admin/dashboard/new" prefetch={false} className="btn btn-primary">
          Create Post
        </Link>
      </div>

      <div className="glass" style={{ padding: '0.5rem' }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 0' }}>
            No published posts yet. Go to Drafts to push an article live!
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th scope="col" style={{ padding: '0.875rem 1rem' }}>Title</th>
                  <th scope="col" style={{ padding: '0.875rem 1rem' }}>Status</th>
                  <th scope="col" style={{ padding: '0.875rem 1rem' }}>Author</th>
                  <th scope="col" style={{ padding: '0.875rem 1rem' }}>Date Published</th>
                  <th scope="col" style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post: any) => {
                  const isCraftLinked = post.craftDocumentId && !post.craftUnlinked
                  return (
                    <tr key={post.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem', maxWidth: '300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Link href={`/admin/dashboard/edit/${post.id}`} prefetch={false} style={{ fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {post.title}
                          </Link>
                          {isCraftLinked && (
                            <span style={{ fontSize: '0.65rem', background: '#6366f1', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '9999px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              Craft
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="status-badge status-badge--published">Published</span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{post.author.username}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                        {new Date(post.updatedAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
                          <a href={`/post/${post.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>View</a>
                          {isCraftLinked ? (
                            <UnlinkCraftButton id={post.id} title={post.title} />
                          ) : (
                            <Link href={`/admin/dashboard/edit/${post.id}`} prefetch={false} style={{ color: 'var(--accent-hover)', fontSize: '0.9rem', fontWeight: 500 }}>Edit</Link>
                          )}
                          <DeletePostButton id={post.id} title={post.title} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
