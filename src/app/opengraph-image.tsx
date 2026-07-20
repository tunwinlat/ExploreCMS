/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ImageResponse } from 'next/og'
import { getSettings } from '@/lib/settings-cache'
import { DEFAULT_SITE_TITLE, DEFAULT_SITE_DESCRIPTION } from '@/lib/seo'

export const runtime = 'nodejs'
export const revalidate = 60
export const alt = 'Site share image'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Branded default Open Graph card, used when no uploaded share image applies.
 */
export default async function Image() {
  const settings = await getSettings()
  const title = settings?.title || DEFAULT_SITE_TITLE
  const description =
    settings?.seoDescription || settings?.headerDescription || DEFAULT_SITE_DESCRIPTION

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 72,
            fontWeight: 700,
            color: '#f8fafc',
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            color: '#94a3b8',
            marginTop: 24,
            lineHeight: 1.4,
          }}
        >
          {description.length > 120 ? `${description.slice(0, 120)}…` : description}
        </div>
      </div>
    ),
    { ...size }
  )
}
