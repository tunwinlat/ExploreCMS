import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import TagList from './TagList'

export const metadata = { title: "Manage Tags | ExploreCMS" }

export default async function TagsPage() {
  const session = await verifySession()
  if (!session) return null

  const tags = await prisma.tag.findMany({
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
          <h1 className="heading-xl" style={{ fontSize: '2.5rem', margin: 0 }}>Manage Tags</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.1rem' }}>
            Rename or delete global tags. Changes will immediately sync across all associated posts.
          </p>
        </div>
      </header>
      
      <TagList initialTags={tags} />
    </div>
  )
}
