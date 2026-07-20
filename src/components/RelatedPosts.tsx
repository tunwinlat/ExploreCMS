/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
    fetchRelatedPosts()
  }, [currentSlug])

  const processedPosts = useMemo(() => {
    return posts.map(post => {
      const excerpt = getExcerpt(post.content, post.contentFormat, 120)
      const coverImage = getFirstImage(post.content, post.contentFormat)
      return { ...post, excerpt, coverImage }
    })
  }, [posts])

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
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    style={{ objectFit: 'cover' }}
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
    </section>
  )
}
