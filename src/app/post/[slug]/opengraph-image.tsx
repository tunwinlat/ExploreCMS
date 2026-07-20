/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings-cache'
import { getFirstImage } from '@/lib/renderContent'
import { DEFAULT_SITE_TITLE } from '@/lib/seo'

export const runtime = 'nodejs'
export const revalidate = 60
export const alt = 'Post share image'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Per-post Open Graph card: post title over the cover image (when the post
 * has one) with the site name. Used when no explicit og image applies.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [post, settings] = await Promise.all([
    prisma.post.findUnique({
      where: { slug },
      select: { title: true, content: true, contentFormat: true },
    }),
    getSettings(),
  ])

  const siteTitle = settings?.title || DEFAULT_SITE_TITLE
  const postTitle = post?.title || siteTitle
  const coverImage = post ? getFirstImage(post.content, post.contentFormat) : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        }}
      >
        {coverImage && (
          // External content image — plain img, satori fetches it server-side
          <img
            src={coverImage}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.35,
            }}
          />
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            width: '100%',
            height: '100%',
            padding: 80,
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 60,
              fontWeight: 700,
              color: '#f8fafc',
              lineHeight: 1.2,
            }}
          >
            {postTitle.length > 90 ? `${postTitle.slice(0, 90)}…` : postTitle}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              color: '#94a3b8',
              marginTop: 24,
            }}
          >
            {siteTitle}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
