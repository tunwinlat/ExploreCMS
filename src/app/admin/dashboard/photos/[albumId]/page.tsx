export const runtime = 'edge';
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AlbumEditor from '../AlbumEditor'
import PhotoManager from '../PhotoManager'

export default async function AlbumManagePage({ params }: { params: Promise<{ albumId: string }> }) {
  const session = await verifySession()
  if (!session) return null

  const { albumId } = await params

  let album: any = null
  try {
    album = await (prisma as any).photoAlbum.findUnique({
      where: { id: albumId },
      include: { photos: { orderBy: { order: 'asc' } } },
    })
  } catch (e) {
    console.error('Failed to load album:', e)
  }

  if (!album) notFound()

  return (
    <div className="fade-in-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/admin/dashboard/photos" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          textDecoration: 'none',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Albums
        </Link>
        <span style={{ color: 'var(--border-color)' }}>/</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{album.title}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}>
        {/* Left: Album settings */}
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
            Album Settings
          </h2>
          <AlbumEditor initialData={album} />
        </div>

        {/* Right: Photos */}
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
            Photos <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>({album.photos.length})</span>
          </h2>
          <PhotoManager albumId={album.id} initialPhotos={album.photos} />
        </div>
      </div>
    </div>
  )
}
