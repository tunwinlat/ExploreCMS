/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Link from 'next/link'
import Image from 'next/image'

interface LeadPost {
  id: string
  title: string
  slug: string
  createdAt: string
  excerpt?: string
  coverImage?: string | null
  author: { username: string; firstName: string | null }
  tags: { name: string; slug: string }[]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/**
 * Editorial lead story: one large featured post, optionally followed by
 * up to two secondary featured posts. Static — no carousel, no autoplay.
 */
export function LeadStory({ posts }: { posts: LeadPost[] }) {
  if (posts.length === 0) return null

  const [lead, ...rest] = posts
  const secondary = rest.slice(0, 2)

  return (
    <section className="lead-story">
      <Link href={`/post/${lead.slug}`} className="lead-story-main">
        {lead.coverImage && (
          <div className="lead-story-cover">
            <Image
              src={lead.coverImage}
              alt={lead.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 760px"
              style={{ objectFit: 'cover' }}
            />
          </div>
        )}
        <div className="lead-story-body">
          <p className="eyebrow">Featured</p>
          <h2 className="display-1 lead-story-title">{lead.title}</h2>
          {lead.excerpt && <p className="lede">{lead.excerpt}</p>}
          <p className="meta">
            <span>{lead.author.firstName || lead.author.username}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={lead.createdAt}>{formatDate(lead.createdAt)}</time>
          </p>
        </div>
      </Link>

      {secondary.length > 0 && (
        <div className="lead-story-secondary">
          {secondary.map(post => (
            <Link key={post.id} href={`/post/${post.slug}`} className="lead-story-secondary-item">
              {post.coverImage && (
                <div className="lead-story-secondary-cover">
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    sizes="120px"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              )}
              <div>
                <h3>{post.title}</h3>
                <p className="meta">
                  <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
