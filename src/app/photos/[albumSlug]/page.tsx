/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { parseComponentConfig, COMPONENTS } from "@/lib/components-config";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { ViewTracker } from "@/components/ViewTracker";
import { getSettings } from "@/lib/settings-cache";
import { buildPageMetadata } from "@/lib/seo";

import { unstable_cache } from "next/cache";

export const dynamic = 'force-dynamic';

const getAlbum = unstable_cache(
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
        createdAt: typeof album.createdAt === 'string' ? album.createdAt : (album.createdAt ? album.createdAt.toISOString() : null),
        updatedAt: typeof album.updatedAt === 'string' ? album.updatedAt : (album.updatedAt ? album.updatedAt.toISOString() : null),
      };
    } catch { return null; }
  },
  ['album-detail'],
  { revalidate: 60 }
);

export async function generateMetadata({ params }: { params: Promise<{ albumSlug: string }> }): Promise<Metadata> {
  const { albumSlug } = await params;
  const [settings, album] = await Promise.all([getSettings(), getAlbum(albumSlug)]);
  if (!album) return { title: 'Not Found' };
  return buildPageMetadata(
    {
      title: album.title,
      description: album.description || undefined,
      path: `/photos/${albumSlug}`,
      image: album.coverImage,
    },
    settings
  );
}

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
        <Link href="/photos" className="back-link" style={{
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
        <div className="page-hero" style={{ marginBottom: 'var(--space-8)' }}>
          <h1 className="display-1">{album.title}</h1>
          <p className="meta">{album.photos.length} photos</p>
          {album.description && (
            <p className="lede">{album.description}</p>
          )}
        </div>

        <PhotoGrid photos={lightboxPhotos} />
      </div>

      <SiteFooter title={settings?.title} footerText={settings?.footerText} />
      <ViewTracker />
    </div>
  );
}
