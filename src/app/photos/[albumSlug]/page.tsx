/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/SiteHeader";
import { parseComponentConfig, COMPONENTS } from "@/lib/components-config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { ViewTracker } from "@/components/ViewTracker";
import { getSettings } from "@/lib/settings-cache";

import { cache } from "react";

export const dynamic = 'force-dynamic';

const getAlbum = cache(
  async (slug: string) => {
    if (!process.env.DATABASE_URL) return null;
    try {
      const album = await (prisma as any).photoAlbum.findUnique({
        where: { slug },
        include: {
          photos: {
            orderBy: { order: 'asc' },
          },
        },
      });
      if (!album || !album.published) return null;
      return {
        ...album,
        createdAt: typeof album.createdAt === 'string' ? album.createdAt : album.createdAt?.toISOString(),
        updatedAt: typeof album.updatedAt === 'string' ? album.updatedAt : album.updatedAt?.toISOString(),
      };
    } catch { return null; }
  },


);

export default async function AlbumPage({ params }: { params: Promise<{ albumSlug: string }> }) {
  const { albumSlug } = await params;
  const [settings, album] = await Promise.all([getSettings(), getAlbum(albumSlug)]);

  if (!album) notFound();

  const componentConfig = parseComponentConfig(settings);
  const { enabledComponents, defaultComponent } = componentConfig;

  if (!enabledComponents.includes('photos')) notFound();

  const enabledMeta = COMPONENTS.filter(c => enabledComponents.includes(c.id));

  const lightboxPhotos = album.photos.map((p: any) => ({
    id: p.id,
    url: p.url,
    title: p.title || undefined,
    description: p.description || undefined,
    location: p.location || undefined,
    takenAt: p.takenAt ? (typeof p.takenAt === 'string' ? p.takenAt : p.takenAt.toISOString()) : null,
  }));

  return (
    <div className="main-content fade-in-up">
      <SiteHeader
        title={settings?.title || 'ExploreCMS'}
        enabledComponents={enabledMeta}
        defaultComponent={defaultComponent}
      />

      <div className="container" style={{ paddingBottom: '5rem' }}>
        {/* Back link */}
        <Link href="/photos" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          marginBottom: '2rem',
          textDecoration: 'none',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          All Albums
        </Link>

        {/* Album header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>{album.title}</h1>
            <span style={{
              padding: '0.2rem 0.65rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              background: 'var(--border-color)',
            }}>
              {album.photos.length} photos
            </span>
          </div>
          {album.description && (
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              {album.description}
            </p>
          )}
        </div>

        <PhotoGrid photos={lightboxPhotos} />
      </div>

      <footer className="container" style={{
        borderTop: '1px solid var(--border-color)',
        paddingTop: '2rem',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        marginBottom: '2rem',
      }}>
        <p>© {new Date().getFullYear()} {settings?.footerText || `${settings?.title || 'ExploreCMS'}. All rights reserved.`}</p>
      </footer>
      <ViewTracker />
    </div>
  );
}
