/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { cache } from 'react'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ViewTracker } from '@/components/ViewTracker'
import { RelatedPosts } from '@/components/RelatedPosts'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SearchBox } from '@/components/SearchBox'
import { renderPostContent } from '@/lib/renderContent'
import './post.css'

// ⚡ Bolt: Memoize the post query to avoid duplicate database calls
// between generateMetadata and the PostPage component.
const getPost = cache(async (slug: string) => {
  return await prisma.post.findUnique({
    where: { slug },
    include: { author: true, tags: true }
  })
})

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Not Found' }
  return { title: `${post.title} | ExploreCMS` }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)

  // Enforce published check on the public frontend
  if (!post || !post.published) notFound()

  const renderedContent = await renderPostContent(post.content, (post as any).contentFormat)

  return (
    <>
      {/* Sticky Navigation Bar */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--bg-color)',
        borderBottom: '1px solid var(--border-color)',
        backdropFilter: 'blur(10px)',
        padding: '1rem 0'
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Link 
            href="/" 
            style={{ 
              color: 'var(--text-primary)', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'color var(--transition-fast)'
            }}
            className="back-link"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Home
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <SearchBox />
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="container main-content fade-in-up">
        <article className="glass" style={{ padding: '4rem 3rem' }}>
          <header style={{ 
            marginBottom: '3rem', 
            textAlign: 'center', 
            borderBottom: '1px solid var(--border-color)', 
            paddingBottom: '2.5rem' 
          }}>
            <h1 
              className="heading-xl" 
              style={{ 
                fontSize: 'clamp(2rem, 5vw, 3rem)', 
                marginBottom: '1rem', 
                letterSpacing: '-0.02em'
              }}
            >
              {post.title}
            </h1>
            
            <div style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '1.1rem', 
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <span>By <strong style={{ color: 'var(--text-primary)' }}>{post.author.firstName || post.author.username}</strong></span>
              <span>•</span>
              <span>{new Date(post.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            
            {post.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                {post.tags.map(tag => (
                  <Link 
                    key={tag.name} 
                    href={`/?tag=${tag.slug}`}
                    style={{ 
                      background: 'var(--bg-color)', 
                      color: 'var(--text-secondary)', 
                      padding: '0.4rem 0.8rem', 
                      borderRadius: '20px', 
                      fontSize: '0.85rem',
                      transition: 'all 0.2s ease',
                      border: '1px solid var(--border-color)'
                    }}
                    className="post-tag"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}
          </header>

          <div 
            className="markdown-content" 
            style={{ fontSize: '1.15rem', lineHeight: 1.8 }}
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        </article>

        {/* Related Posts Section */}
        <RelatedPosts currentSlug={slug} />

        {/* Back to Home Link */}
        <div style={{ marginTop: '4rem', textAlign: 'center' }}>
          <Link 
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'var(--bg-color-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
            className="back-home-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Browse More Stories
          </Link>
        </div>

        <ViewTracker slug={post.slug} />
      </main>
    </>
  )
}
