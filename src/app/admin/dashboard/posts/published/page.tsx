/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getPostDb } from '@/lib/bunnyDb'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { DeletePostButton } from '../DeletePostButton'
import { UnlinkCraftButton } from './UnlinkCraftButton'
import { isPrimaryPost } from '@/lib/translationUtils'

export const metadata = { title: "Published Posts | ExploreCMS" }

export default async function PublishedPostsPage() {
  const postDb = await getPostDb() as any;
  const [posts, settings] = await Promise.all([
    postDb.post.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      include: { author: true }
    }),
    (prisma as any).siteSettings.findUnique({ where: { id: 'singleton' } }).catch(() => null)
  ])

  const craftEnabled = settings?.craftEnabled || false
  const craftMode = settings?.craftSyncMode || 'read-only'

  // Separate primary posts from translation variants
  const primaryPosts = posts.filter(isPrimaryPost)
  const translationsByGroup: Record<string, any[]> = {}
  for (const post of posts) {
    if (!isPrimaryPost(post) && post.translationGroupId) {
      if (!translationsByGroup[post.translationGroupId]) {
        translationsByGroup[post.translationGroupId] = []
      }
      translationsByGroup[post.translationGroupId].push(post)
    }
  }

  const renderPostRow = (post: any, isTranslation = false) => {
    const isCraftLinked = post.craftDocumentId && !post.craftUnlinked
    const isReadOnlyMode = craftMode === 'read-only'
    const isWriteMode = craftMode === 'backup' || craftMode === 'full-sync'

    let craftBadge = null
    if (craftEnabled) {
      if (isCraftLinked && isReadOnlyMode) {
        craftBadge = <span style={{ fontSize: '0.65rem', background: '#6366f1', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '9999px', whiteSpace: 'nowrap', flexShrink: 0 }}>Craft</span>
      } else if (isCraftLinked && isWriteMode) {
        craftBadge = <span style={{ fontSize: '0.65rem', background: '#22c55e', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '9999px', whiteSpace: 'nowrap', flexShrink: 0 }}>Synced</span>
      } else if (!post.craftDocumentId && isWriteMode) {
        craftBadge = <span style={{ fontSize: '0.65rem', background: 'var(--border-color)', color: 'var(--text-secondary)', padding: '0.1rem 0.4rem', borderRadius: '9999px', whiteSpace: 'nowrap', flexShrink: 0 }}>Not synced</span>
      }
    }

    const isLocked = isCraftLinked && isReadOnlyMode

    return (
      <tr key={post.id} style={{ borderBottom: '1px solid var(--border-color)', background: isTranslation ? 'rgba(99,102,241,0.03)' : undefined }}>
        <td style={{ padding: '1rem', maxWidth: '300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isTranslation && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', flexShrink: 0, paddingLeft: '1rem' }}>↳</span>
            )}
            <Link href={`/admin/dashboard/edit/${post.id}`} prefetch={false} style={{ fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {post.title}
            </Link>
            {post.language && post.language !== 'en' && (
              <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.1rem 0.35rem', borderRadius: '4px', flexShrink: 0 }}>
                {post.language.toUpperCase()}
              </span>
            )}
            {craftBadge}
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
            {isLocked ? (
              <UnlinkCraftButton id={post.id} title={post.title} />
            ) : (
              <Link href={`/admin/dashboard/edit/${post.id}`} prefetch={false} style={{ color: 'var(--accent-hover)', fontSize: '0.9rem', fontWeight: 500 }}>Edit</Link>
            )}
            <DeletePostButton id={post.id} title={post.title} />
          </div>
        </td>
      </tr>
    )
  }

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
        {primaryPosts.length === 0 ? (
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
                {primaryPosts.map((post: any) => (
                  <>
                    {renderPostRow(post, false)}
                    {(translationsByGroup[post.id] || []).map((t: any) => renderPostRow(t, true))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
