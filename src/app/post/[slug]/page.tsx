import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ViewTracker } from '@/components/ViewTracker'
import './post.css'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await prisma.post.findUnique({ where: { slug } })
  if (!post) return { title: 'Not Found' }
  return { title: `${post.title} | ExploreCMS` }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await prisma.post.findUnique({
    where: { slug },
    include: { author: true, tags: true }
  })

  // Enforce published check on the public frontend
  if (!post || !post.published) notFound()

  return (
    <main className="container main-content fade-in-up">
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ color: 'var(--text-secondary)', transition: 'color var(--transition-fast)' }} className="back-link">
          ← Home
        </Link>
      </div>
      
      <article className="glass" style={{ padding: '4rem 3rem' }}>
        <header style={{ marginBottom: '3rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '2.5rem' }}>
          <h1 className="heading-xl" style={{ fontSize: '3rem', marginBottom: '1rem', letterSpacing: '-0.02em', background: 'var(--text-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'var(--text-primary)' }}>
            {post.title}
          </h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            By <strong style={{ color: 'var(--text-primary)' }}>{post.author.firstName || post.author.username}</strong> on {new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {post.tags.map(tag => (
              <span key={tag.name} style={{ background: 'var(--bg-color)', color: 'var(--text-secondary)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                #{tag.name}
              </span>
            ))}
          </div>
        </header>

        <div 
          className="markdown-content" 
          style={{ fontSize: '1.15rem', lineHeight: 1.8 }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
      <ViewTracker slug={post.slug} />
    </main>
  )
}
