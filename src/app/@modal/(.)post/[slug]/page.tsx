/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getPostDb } from '@/lib/bunnyDb'
import { notFound } from 'next/navigation'
import Modal from '@/components/Modal'
import { ViewTracker } from '@/components/ViewTracker'
import '@/app/post/[slug]/post.css' // Import the specific typographic stylesheet
import { sanitizeContent } from '@/lib/sanitize'

export default async function PostModalIntercept({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  const db = await getPostDb()
  const post = await db.post.findUnique({
    where: { slug },
    include: { author: true, tags: true }
  }) as any

  // Enforce published check on the public frontend
  if (!post || !post.published) notFound()

  return (
    <Modal>
      <article className="glass" style={{ padding: '4rem 3rem', width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
        <header style={{ marginBottom: '3rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '2.5rem' }}>
          <h1 className="heading-xl" style={{ fontSize: '3.5rem', marginBottom: '1rem', letterSpacing: '-0.02em', background: 'var(--text-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'var(--text-primary)', lineHeight: 1.1 }}>
            {post.title}
          </h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            By <strong style={{ color: 'var(--text-primary)' }}>{post.author.firstName || post.author.username}</strong> on {new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {post.tags.map((tag: {name: string}) => (
              <span key={tag.name} style={{ background: 'var(--border-color)', color: 'var(--text-secondary)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                #{tag.name}
              </span>
            ))}
          </div>
        </header>

        <div 
          className="markdown-content" 
          style={{ fontSize: '1.2rem', lineHeight: 1.8 }}
          dangerouslySetInnerHTML={{ __html: sanitizeContent(post.content) }}
        />
      </article>
      <ViewTracker slug={post.slug} />
    </Modal>
  )
}
