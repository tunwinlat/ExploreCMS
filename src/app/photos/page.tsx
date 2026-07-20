/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { parseComponentConfig, COMPONENTS } from "@/lib/components-config";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ViewTracker } from "@/components/ViewTracker";
import { PopupToast } from "@/components/PopupToast";
import { getSettings, getPopupConfig } from "@/lib/settings-cache";

import { getCachedAlbums } from "@/lib/photos-cache";

export const revalidate = 60

function CameraIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

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

      <PageHero
        eyebrow="Photo Gallery"
        title="Moments Captured"
        description="A visual journey through places, moments and stories."
      />

      <div className="container">
        {albums.length === 0 ? (
          <p className="empty-state">No albums published yet. Check back soon.</p>
        ) : (
          <div className="album-grid">
            {albums.map((album: any) => (
              <Link
                key={album.id}
                href={`/photos/${album.slug}`}
                className="album-card"
              >
                {/* Album cover (falls back to first photo, then placeholder) */}
                <div className="album-card-cover">
                  {album.coverImage ? (
                    <Image
                      src={album.coverImage}
                      alt={album.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="album-card-cover-placeholder">
                      <CameraIcon />
                    </div>
                  )}
                  {album.featured && (
                    <span className="eyebrow card-badge">Featured</span>
                  )}
                </div>

                {/* Album info */}
                <div className="album-card-body">
                  <h3 className="album-card-title">{album.title}</h3>
                  {album.description && (
                    <p className="album-card-desc">{album.description}</p>
                  )}
                  {album._count.photos > 0 && (
                    <p className="meta">{album._count.photos} photos</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <SiteFooter title={settings?.title} footerText={settings?.footerText} />

      {popupConfig?.enabled && popupConfig.content && (
        <PopupToast title={popupConfig.title || ''} content={popupConfig.content} displayMode={popupConfig.displayMode || 'once'} />
      )}
      <ViewTracker />
    </div>
  );
}
