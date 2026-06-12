/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { prisma } from '@/lib/db'
import { getPostDb } from '@/lib/bunnyDb'
import Link from 'next/link'

export const metadata = { title: "Analytics Overview | ExploreCMS" }

export default async function DashboardPage() {
  let analytics = null;
  let totalPosts = 0;
  let draftPosts = 0;
  let topPosts: any[] = [];

  try {
    const postDb = await getPostDb() as any;
    // ⚡ Bolt: Fetch all dashboard data concurrently to prevent query waterfalls and reduce latency
    [analytics, totalPosts, draftPosts, topPosts] = await Promise.all([
      prisma.siteAnalytics.findUnique({ where: { id: 'singleton' }}),
      postDb.post.count({ where: { published: true }}),
      postDb.post.count({ where: { published: false }}),
      postDb.postView.findMany({
        orderBy: { totalViews: 'desc' },
        take: 5,
        include: { post: true }
      })
    ]);
  } catch {
    // Database tables may not exist yet (e.g. during build)
  }


  return (
    <div className="fade-in-up">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="admin-page-title">Analytics Overview</h1>
        <p className="admin-page-subtitle">Welcome back. Here is how your content is performing.</p>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        <div className="glass" style={{ padding: '1.5rem', borderLeft: '3px solid var(--accent-color)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem', fontWeight: 500 }}>Total Site Views</div>
          <div style={{ fontSize: '2rem', fontWeight: 600 }}>{analytics?.totalViews?.toLocaleString() || '0'}</div>
        </div>
        <div className="glass" style={{ padding: '1.5rem', borderLeft: '3px solid #10b981' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem', fontWeight: 500 }}>Unique Visitors</div>
          <div style={{ fontSize: '2rem', fontWeight: 600 }}>{analytics?.uniqueViews?.toLocaleString() || '0'}</div>
        </div>
        <div className="glass" style={{ padding: '1.5rem', borderLeft: '3px solid #8b5cf6' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem', fontWeight: 500 }}>Published Posts</div>
          <div style={{ fontSize: '2rem', fontWeight: 600 }}>{totalPosts}</div>
        </div>
        <div className="glass" style={{ padding: '1.5rem', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem', fontWeight: 500 }}>Active Drafts</div>
          <div style={{ fontSize: '2rem', fontWeight: 600 }}>{draftPosts}</div>
        </div>
      </div>

      {/* Top Posts Table */}
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Top Performing Articles</h2>
      <div className="glass" style={{ padding: '0.25rem' }}>
        {topPosts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2.5rem 0', fontSize: '0.9rem' }}>
            No post analytics available yet.
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th scope="col" style={{ padding: '0.875rem 1rem' }}>Article</th>
                  <th scope="col" style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Views</th>
                  <th scope="col" style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Unique</th>
                </tr>
              </thead>
              <tbody>
                {topPosts.map(({ post, totalViews, uniqueViews }) => post ? (
                  <tr key={post.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.875rem 1rem', maxWidth: '400px' }}>
                      <Link href={`/admin/dashboard/edit/${post.id}`} prefetch={false} style={{ fontWeight: 400, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                        {post.title}
                      </Link>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 500, textAlign: 'right', color: 'var(--accent-hover)' }}>{totalViews?.toLocaleString()}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)', textAlign: 'right' }}>{uniqueViews?.toLocaleString()}</td>
                  </tr>
                ) : null)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
