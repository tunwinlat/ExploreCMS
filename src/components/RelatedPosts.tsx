/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { getExcerpt, getFirstImage } from '@/lib/renderContent'

interface RelatedPost {
  id: string
  title: string
  slug: string
  content: string
  contentFormat?: string
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
      const res = await fetch(`/api/related?slug=${encodeURIComponent(currentSlug)}&limit=3`)
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
      <section className="related-posts">
        <div className="related-posts-header">
          <h3 className="related-posts-title">You Might Also Like</h3>
        </div>
        <div className="related-posts-grid">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="related-post-card skeleton" />
          ))}
        </div>
      </section>
    )
  }

  const processedPosts = useMemo(() => {
    return posts.map(post => {
      const excerpt = getExcerpt(post.content, post.contentFormat, 120)
      const coverImage = getFirstImage(post.content, post.contentFormat)
      return { ...post, excerpt, coverImage }
    })
  }, [posts])

  if (posts.length === 0) return null

  return (
    <section className="related-posts">
      <div className="related-posts-header">
        <h3 className="related-posts-title">You Might Also Like</h3>
        <Link href="/blog" className="related-posts-explore">
          Explore All
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/>
            <path d="m12 5 7 7-7 7"/>
          </svg>
        </Link>
      </div>

      <div className="related-posts-grid">
        {processedPosts.map((post) => {
          const primaryTag = post.tags[0]

          return (
            <Link 
              key={post.id} 
              href={`/post/${post.slug}`}
              className="related-post-card"
            >
              <div className="related-post-image-wrapper">
                {post.coverImage ? (
                  <img 
                    src={post.coverImage}
                    alt="" 
                    loading="lazy"
                    className="related-post-image"
                  />
                ) : (
                  <div className="related-post-image-placeholder">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                      <circle cx="9" cy="9" r="2"/>
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                    </svg>
                  </div>
                )}
              </div>
              
              <div className="related-post-content">
                {primaryTag && (
                  <span className="related-post-category">
                    {primaryTag.name.toUpperCase()}
                  </span>
                )}
                
                <h4 className="related-post-card-title">
                  {post.title}
                </h4>
                
                <p className="related-post-excerpt">
                  {post.excerpt}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      <style jsx>{`
        .related-posts {
          margin-top: 5rem;
          padding-top: 3rem;
          border-top: 1px solid var(--border-color);
        }
        
        .related-posts-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
        }
        
        .related-posts-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        
        .related-posts-explore {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--accent-color);
          text-decoration: none;
          transition: gap 0.2s ease;
        }
        
        .related-posts-explore:hover {
          gap: 0.75rem;
        }
        
        .related-posts-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        
        @media (max-width: 768px) {
          .related-posts-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .related-post-card {
          display: flex;
          flex-direction: column;
          background: var(--bg-color-secondary);
          border-radius: var(--radius-md, 12px);
          border: 1px solid var(--border-color);
          overflow: hidden;
          text-decoration: none;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .related-post-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }
        
        .related-post-card.skeleton {
          height: 300px;
          background: linear-gradient(
            90deg,
            var(--bg-color-secondary) 25%,
            var(--bg-color) 50%,
            var(--bg-color-secondary) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        .related-post-image-wrapper {
          position: relative;
          height: 160px;
          overflow: hidden;
          background: var(--bg-color);
        }
        
        .related-post-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        
        .related-post-card:hover .related-post-image {
          transform: scale(1.05);
        }
        
        .related-post-image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          opacity: 0.5;
        }
        
        .related-post-content {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        
        .related-post-category {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--accent-color);
          margin-bottom: 0.75rem;
        }
        
        .related-post-card-title {
          font-size: 1.1rem;
          font-weight: 600;
          line-height: 1.4;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .related-post-excerpt {
          font-size: 0.875rem;
          line-height: 1.6;
          color: var(--text-secondary);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }
      `}</style>
    </section>
  )
}
