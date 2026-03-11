import { prisma } from '@/lib/db'
import Link from 'next/link'

export const metadata = { title: "Analytics Overview | ExploreCMS" }

export default async function DashboardPage() {
  const [analytics, totalPosts, draftPosts] = await Promise.all([
    prisma.siteAnalytics.findUnique({ where: { id: 'singleton' }}),
    prisma.post.count({ where: { published: true }}),
    prisma.post.count({ where: { published: false }})
  ])
  
  let topPosts: any[] = [];
  try {
    topPosts = await prisma.postView.findMany({
      orderBy: { totalViews: 'desc' },
      take: 5,
      include: { post: true }
    })
  } catch(e) {}


  return (
    <div className="fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="heading-xl" style={{ fontSize: '2.5rem', margin: 0 }}>Analytics Overview</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back. Here is how your content is performing.</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass" style={{ padding: '1.5rem', borderTop: '4px solid var(--accent-color)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Site Views</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{analytics?.totalViews || 0}</div>
        </div>
        <div className="glass" style={{ padding: '1.5rem', borderTop: '4px solid #10b981' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>Unique Site Visitors</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{analytics?.uniqueViews || 0}</div>
        </div>
        <div className="glass" style={{ padding: '1.5rem', borderTop: '4px solid #8b5cf6' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>Published Posts</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{totalPosts}</div>
        </div>
        <div className="glass" style={{ padding: '1.5rem', borderTop: '4px solid #f59e0b' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>Active Drafts</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{draftPosts}</div>
        </div>
      </div>

      {/* Top Posts Table */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Top Performing Articles</h2>
      <div className="glass" style={{ padding: '1.5rem' }}>
        {topPosts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
            No post analytics available yet.
          </div>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Article</th>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Total Views</th>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Unique Readers</th>
              </tr>
            </thead>
            <tbody>
              {topPosts.map(({ post, totalViews, uniqueViews }) => post ? (
                <tr key={post.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                    <Link href={`/admin/dashboard/edit/${post.id}`} prefetch={false} style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {post.title}
                    </Link>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600, textAlign: 'right', color: 'var(--accent-hover)' }}>{totalViews}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'right' }}>{uniqueViews}</td>
                </tr>
              ) : null)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
