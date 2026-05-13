/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import Image from 'next/image'
import DeleteAlbumButton from './DeleteAlbumButton'

export default async function PhotosAdminPage() {
  const session = await verifySession()
  if (!session) return null

  let albums: any[] = []
  try {
    albums = await (prisma as any).photoAlbum.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { photos: true } } },
    })
  } catch (e) {
    console.error('Failed to load albums:', e)
  }

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h1 className="admin-page-title">Photo Gallery</h1>
          <p className="admin-page-subtitle">Manage albums and photos.</p>
        </div>
        <Link
          href="/admin/dashboard/photos/new-album"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Album
        </Link>
      </header>

      {albums.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          border: '2px dashed var(--border-color)',
          borderRadius: '16px',
          color: 'var(--text-secondary)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4 }}>📸</div>
          <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>No albums yet. Create your first one!</p>
          <Link
            href="/admin/dashboard/photos/new-album"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.5rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Create Album
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}>
          {albums.map((album: any) => (
            <div key={album.id} style={{
              borderRadius: '14px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-color-secondary, rgba(0,0,0,0.02))',
            }}>
              {/* Cover */}
              <div style={{ aspectRatio: '4/3', position: 'relative', background: 'var(--border-color)' }}>
                {album.coverImage ? (
                  <Image src={album.coverImage} alt={album.title} fill style={{ objectFit: 'cover' }} sizes="240px" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                )}
                <div style={{
                  position: 'absolute',
                  bottom: '0.4rem',
                  right: '0.4rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '20px',
                  background: 'rgba(0,0,0,0.65)',
                  fontSize: '0.7rem',
                  color: '#fff',
                  backdropFilter: 'blur(4px)',
                }}>
                  {album._count.photos} photos
                </div>
                {!album.published && (
                  <div style={{
                    position: 'absolute',
                    top: '0.4rem',
                    left: '0.4rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '20px',
                    background: 'rgba(0,0,0,0.65)',
                    fontSize: '0.65rem',
                    color: '#fff',
                    fontWeight: 600,
                  }}>
                    DRAFT
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '0.875rem 1rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.2rem', color: 'var(--text-primary)' }}>
                  {album.title}
                </h3>
                {album.description && (
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    margin: '0 0 0.75rem',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as any,
                  }}>
                    {album.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link
                    href={`/admin/dashboard/photos/${album.id}`}
                    style={{
                      flex: 1,
                      padding: '0.4rem 0',
                      borderRadius: '8px',
                      border: '1px solid var(--accent-color)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--accent-color)',
                      textDecoration: 'none',
                      textAlign: 'center',
                    }}
                  >
                    Manage
                  </Link>
                  <DeleteAlbumButton albumId={album.id} albumTitle={album.title} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const runtime = 'edge';
