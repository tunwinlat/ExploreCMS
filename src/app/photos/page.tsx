/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { SiteHeader } from "@/components/SiteHeader";
import { parseComponentConfig, COMPONENTS } from "@/lib/components-config";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ViewTracker } from "@/components/ViewTracker";
import { PopupToast } from "@/components/PopupToast";
import { getSettings, getPopupConfig } from "@/lib/settings-cache";

import { getCachedAlbums } from "@/lib/photos-cache";

export const dynamic = 'force-dynamic'

export default async function PhotosPage() {
  const [settings, albums, popupConfig] = await Promise.all([
    getSettings(),
    getCachedAlbums(),
    getPopupConfig()
  ]);

  const componentConfig = parseComponentConfig(settings);
  const { enabledComponents, defaultComponent } = componentConfig;

  if (!enabledComponents.includes('photos')) notFound();

  const enabledMeta = COMPONENTS.filter(c => enabledComponents.includes(c.id));

  return (
    <div className="main-content fade-in-up">
      <SiteHeader
        title={settings?.title || 'ExploreCMS'}
        enabledComponents={enabledMeta}
        defaultComponent={defaultComponent}
      />

      <div className="container" style={{ paddingBottom: '5rem' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', maxWidth: '580px', margin: '0 auto 3.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 1rem',
            borderRadius: '20px',
            background: 'color-mix(in srgb, var(--accent-color) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-color) 25%, transparent)',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--accent-color)',
            marginBottom: '1rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Photo Gallery
          </div>
          <h1 className="heading-xl">Moments Captured</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            A visual journey through places, moments and stories.
          </p>
        </div>

        {albums.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '5rem 2rem',
            color: 'var(--text-secondary)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>📸</div>
            <p style={{ fontSize: '1.1rem' }}>No albums published yet. Check back soon!</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}>
            {albums.map((album: any) => (
              <Link
                key={album.id}
                href={`/photos/${album.slug}`}
                style={{ textDecoration: 'none' }}
                className="album-card"
              >
                <style>{`
                  .album-card > div {
                    border-radius: 16px;
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
                    background: var(--bg-color-secondary, rgba(0,0,0,0.02));
                  }
                  .album-card:hover > div {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 40px color-mix(in srgb, var(--accent-color) 12%, transparent);
                    border-color: color-mix(in srgb, var(--accent-color) 35%, transparent);
                  }
                `}</style>
                <div>
                  {/* Album cover */}
                  <div style={{ aspectRatio: '4/3', position: 'relative', overflow: 'hidden' }}>
                    {album.coverImage ? (
                      <Image
                        src={album.coverImage}
                        alt={album.title}
                        fill
                        style={{ objectFit: 'cover', transition: 'transform 0.4s ease' }}
                        sizes="320px"
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-color) 15%, var(--bg-color)), var(--bg-color))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      </div>
                    )}

                    {/* Photo count badge */}
                    <div style={{
                      position: 'absolute',
                      bottom: '0.6rem',
                      right: '0.6rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '20px',
                      background: 'rgba(0,0,0,0.6)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: '#fff',
                      backdropFilter: 'blur(6px)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                      {album._count.photos}
                    </div>

                    {/* Featured badge */}
                    {album.featured && (
                      <div style={{
                        position: 'absolute',
                        top: '0.6rem',
                        left: '0.6rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#fff',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}>
                        Featured
                      </div>
                    )}
                  </div>

                  {/* Album info */}
                  <div style={{ padding: '1rem' }}>
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      margin: '0 0 0.35rem',
                      color: 'var(--text-primary)',
                    }}>
                      {album.title}
                    </h3>
                    {album.description && (
                      <p style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        margin: 0,
                        lineHeight: 1.5,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as any,
                      }}>
                        {album.description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
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

      {popupConfig?.enabled && popupConfig.content && (
        <PopupToast title={popupConfig.title || ''} content={popupConfig.content} displayMode={popupConfig.displayMode || 'once'} />
      )}
      <ViewTracker />
    </div>
  );
}
