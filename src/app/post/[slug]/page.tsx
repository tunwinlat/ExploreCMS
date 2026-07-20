/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { cache } from 'react'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ViewTracker } from '@/components/ViewTracker'
import { RelatedPosts } from '@/components/RelatedPosts'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { renderPostContent } from '@/lib/renderContent'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { getFirstImage } from '@/lib/renderContent'
import { getSettings } from '@/lib/settings-cache'
import { parseComponentConfig, COMPONENTS } from '@/lib/components-config'
import './post.css'

export const dynamic = 'force-dynamic';

// ⚡ Bolt: Memoize the post query to avoid duplicate database calls
const getPost = cache(async (slug: string) => {
  return await prisma.post.findUnique({
    where: { slug },
    include: {
      author: true,
      tags: true,
    }
  })
})

const getTranslations = cache(async (translationGroupId: string | null, currentSlug: string) => {
  if (!translationGroupId) return [];

  return await prisma.post.findMany({
    where: {
      translationGroupId,
      published: true,
      slug: { not: currentSlug }
    },
    select: { language: true, slug: true }
  })
})

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Not Found' }
  return { title: `${post.title} | ExploreCMS` }
}

// Calculate reading time
function getReadingTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.replace(/<[^>]*>?/gm, '').split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // ⚡ Bolt: Parallelize independent DB queries
  const [post, settings] = await Promise.all([
    getPost(slug),
    getSettings()
  ])

  if (!post || !post.published) notFound()

  // ⚡ Bolt: Parallelize content rendering and translation fetching
  const [renderedContent, translations] = await Promise.all([
    renderPostContent(post.content, (post as any).contentFormat),
    getTranslations((post as any).translationGroupId, post.slug)
  ])

  const coverImage = getFirstImage(post.content, (post as any).contentFormat)
  const readingTime = getReadingTime(post.content)

  // Get primary tag for category display
  const primaryTag = post.tags[0]

  const { enabledComponents, defaultComponent } = parseComponentConfig(settings)
  const enabledMeta = COMPONENTS.filter(c => enabledComponents.includes(c.id))

  return (
    <div className="post-page">
      <SiteHeader
        title={settings?.title || 'ExploreCMS'}
        enabledComponents={enabledMeta}
        defaultComponent={defaultComponent}
      />

      {/* Hero Section with Cover Image */}
      <header className="post-hero">
        {coverImage && (
          <div className="post-hero-background">
            <Image
              src={coverImage}
              alt={post.title}
              fill
              priority
              className="post-hero-image"
              style={{ objectFit: 'cover' }}
            />
            <div className="post-hero-overlay" />
          </div>
        )}

        <div className="post-hero-content">
          {/* Category & Reading Time */}
          <div className="post-hero-meta">
            {primaryTag && (
              <Link
                href={`/blog?tag=${encodeURIComponent(primaryTag.slug)}`}
                className="post-hero-category"
              >
                {primaryTag.name.toUpperCase()}
              </Link>
            )}
            <span className="post-hero-reading-time">
              {readingTime} MIN READ
            </span>
            {translations.length > 0 && (
              <LanguageSwitcher
                currentLanguage={(post as any).language}
                translations={translations}
                compact
              />
            )}
          </div>

          {/* Title */}
          <h1 className="post-hero-title">
            {post.title}
          </h1>

          {/* Author & Date Row */}
          <div className="post-hero-author-row">
            <div className="post-hero-author">
              <div className="post-hero-author-avatar">
                <span>{post.author.firstName?.[0] || post.author.username[0]}</span>
              </div>
              <div className="post-hero-author-info">
                <span className="post-hero-author-name">
                  {post.author.firstName || post.author.username}
                </span>
              </div>
            </div>

            <div className="post-hero-date">
              <time dateTime={post.createdAt.toISOString()}>
                {new Date(post.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
              {(post as any).location && (
                <span className="post-hero-location">{(post as any).location}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="post-main">
        <article className="post-article">
          <div
            className="post-content"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="post-tags">
              {post.tags.map(tag => (
                <Link
                  key={tag.name}
                  href={`/blog?tag=${encodeURIComponent(tag.slug)}`}
                  className="tag-chip"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}
        </article>

        {/* Related Posts Section */}
        <RelatedPosts currentSlug={slug} />
      </main>

      <SiteFooter title={settings?.title} footerText={settings?.footerText} />

      <ViewTracker slug={post.slug} />
    </div>
  )
}
