/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface RelatedPost {
  id: string
  title: string
  slug: string
  content: string
  createdAt: string
  author: { username: string; firstName: string | null }
  tags: { name: string; slug: string }[]
  views?: { uniqueViews: number }[]
}

interface RelatedPostsProps {
  currentSlug: string
}

export function RelatedPosts({ currentSlug }: RelatedPostsProps) {
  const [posts, setPosts] = useState<RelatedPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRelatedPosts()
  }, [currentSlug])

  const fetchRelatedPosts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/related?slug=${encodeURIComponent(currentSlug)}&limit=4`)
      const data = await res.json()
      if (data.posts) {
        setPosts(data.posts)
      }
    } catch (err) {
      console.error('Failed to fetch related posts:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="related-posts" style={{ marginTop: '4rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          You Might Also Like
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass" style={{ padding: '1.5rem', height: '150px', animation: 'pulse 2s infinite' }} />
          ))}
        </div>
      </section>
    )
  }

  if (posts.length === 0) return null

  return (
    <section className="related-posts" style={{ marginTop: '4rem' }}>
      <h3 
        style={{ 
          fontSize: '1.5rem', 
          fontWeight: 700, 
          marginBottom: '1.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          color: 'var(--text-primary)'
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
        You Might Also Like
      </h3>

      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
          gap: '1.5rem' 
        }}
      >
        {posts.map((post) => {
          const isMarkdown = (post as any).contentFormat === 'markdown'
          const excerpt = isMarkdown
            ? post.content.replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/#{1,6}\s*/g, '').replace(/[*_~`]+/g, '').replace(/\n+/g, ' ').trim().substring(0, 100) + '...'
            : post.content.replace(/<[^>]*>?/gm, '').trim().substring(0, 100) + '...'

          const imgMatch = isMarkdown
            ? post.content.match(/!\[[^\]]*\]\(([^)]+)\)/)
            : post.content.match(/<img[^>]+src="([^">]+)"/)
          const coverImage = imgMatch ? imgMatch[1] : null

          return (
            <Link 
              key={post.id} 
              href={`/post/${post.slug}`}
              className="related-post-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-color-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                textDecoration: 'none',
                height: '100%'
              }}
            >
              {coverImage && (
                <div style={{ height: '140px', overflow: 'hidden' }}>
                  <img 
                    src={coverImage} 
                    alt="" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      transition: 'transform 0.4s ease'
                    }}
                    className="related-post-img"
                  />
                </div>
              )}
              
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h4 
                  style={{ 
                    fontSize: '1rem', 
                    fontWeight: 600, 
                    marginBottom: '0.75rem',
                    lineHeight: 1.4,
                    color: 'var(--text-primary)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {post.title}
                </h4>
                
                <p 
                  style={{ 
                    fontSize: '0.875rem', 
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    marginBottom: '1rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    flex: 1
                  }}
                >
                  {excerpt}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>{post.author.firstName || post.author.username}</span>
                  <span>•</span>
                  <span>{new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
