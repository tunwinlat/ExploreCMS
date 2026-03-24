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
import { renderPostContent } from '@/lib/renderContent'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { getFirstImage } from '@/lib/renderContent'
import { getSettings } from '@/lib/settings-cache'
import './post.css'

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
  
  // Navigation items based on settings
  const navItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Blog', href: '/blog', active: true },
    { label: 'Projects', href: '/projects' },
    { label: 'Gallery', href: '/photos' },
  ]

  return (
    <div className="post-page">
      {/* Fixed Navigation */}
      <nav className="post-nav">
        <div className="post-nav-container">
          <Link href="/" className="post-nav-logo">
            {settings?.title || 'Oceanic Velocity'}
          </Link>
          
          <div className="post-nav-links">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`post-nav-link ${item.active ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          
          <div className="post-nav-actions">
            {translations.length > 0 && (
              <LanguageSwitcher 
                currentLanguage={(post as any).language} 
                translations={translations}
                compact
              />
            )}
            <Link href="/admin/dashboard" className="post-nav-avatar">
              <span className="post-nav-avatar-text">
                {post.author.firstName?.[0] || post.author.username[0]}
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with Cover Image */}
      <header className="post-hero">
        {coverImage && (
          <div className="post-hero-background">
            <Image
              src={coverImage}
              alt=""
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
              <span className="post-hero-category">
                {primaryTag.name.toUpperCase()}
              </span>
            )}
            <span className="post-hero-reading-time">
              {readingTime} MIN READ
            </span>
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
                <span className="post-hero-author-role">
                  {post.author.role === 'OWNER' ? 'Design Strategist & Explorer' : 'Author'}
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
            className="post-content markdown-content" 
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
          
          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="post-tags">
              {post.tags.map(tag => (
                <Link 
                  key={tag.name} 
                  href={`/?tag=${tag.slug}`}
                  className="post-tag"
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

      {/* Footer */}
      <footer className="post-footer">
        <div className="post-footer-brand">
          {settings?.title || 'Oceanic Velocity'}
        </div>
        
        <div className="post-footer-links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/contact">Contact</Link>
        </div>
        
        <div className="post-footer-social">
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <a href="/rss" aria-label="RSS Feed">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248-1.796 0-3.252-1.454-3.252-3.248 0-1.794 1.456-3.248 3.252-3.248 1.795.001 3.251 1.454 3.251 3.248zm-6.503-12.572v4.811c6.05.062 10.96 4.966 11.022 11.009h4.817c-.062-8.71-7.118-15.758-15.839-15.82zm0-3.368c10.58.046 19.152 8.594 19.183 19.188h4.817c-.03-13.231-10.755-23.954-24-24v4.812z"/>
            </svg>
          </a>
        </div>
        
        <div className="post-footer-copyright">
          © {new Date().getFullYear()} {settings?.title || 'Oceanic Velocity'}. All rights reserved.
        </div>
      </footer>

      <ViewTracker slug={post.slug} />
    </div>
  )
}
