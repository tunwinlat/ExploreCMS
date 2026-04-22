export const runtime = 'edge';
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/SiteHeader";
import { parseComponentConfig, COMPONENTS } from "@/lib/components-config";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ViewTracker } from "@/components/ViewTracker";
import { renderPostContent } from "@/lib/renderContent";
import { getSettings } from "@/lib/settings-cache";

import { unstable_cache } from "next/cache";

export const dynamic = 'force-dynamic';

const getProject = unstable_cache(
  async (slug: string) => {
    if (!process.env.DATABASE_URL) return null;
    try {
      const project = await (prisma as any).project.findUnique({
        where: { slug },
        include: { images: { orderBy: { order: 'asc' } } },
      });
      if (!project || !project.published) return null;
      return {
        ...project,
        createdAt: typeof project.createdAt === 'string' ? project.createdAt : project.createdAt?.toISOString(),
        updatedAt: typeof project.updatedAt === 'string' ? project.updatedAt : project.updatedAt?.toISOString(),
        techTags: (() => { try { return JSON.parse(project.techTags || '[]') } catch { return [] } })(),
      };
    } catch { return null; }
  },
  ['project-detail'],
  { revalidate: 60 }
);

function getSafeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url
    }
  } catch (e) {
    // Invalid URL
  }
  return undefined
}

const STATUS_COLORS: Record<string, { text: string; label: string }> = {
  completed:   { text: '#22c55e', label: 'Completed' },
  in_progress: { text: 'var(--accent-color)', label: 'In Progress' },
  archived:    { text: '#94a3b8', label: 'Archived' },
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [settings, project] = await Promise.all([getSettings(), getProject(slug)]);

  if (!project) notFound();

  const componentConfig = parseComponentConfig(settings);
  const { enabledComponents, defaultComponent } = componentConfig;
  if (!enabledComponents.includes('projects')) notFound();

  const enabledMeta = COMPONENTS.filter(c => enabledComponents.includes(c.id));
  const status = STATUS_COLORS[project.status] || STATUS_COLORS.completed;

  const safeGithubUrl = getSafeUrl(project.githubUrl)
  const safeLiveUrl = getSafeUrl(project.liveUrl)

  return (
    <div className="main-content fade-in-up">
      <SiteHeader
        title={settings?.title || 'ExploreCMS'}
        enabledComponents={enabledMeta}
        defaultComponent={defaultComponent}
      />

      <div className="container" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '5rem' }}>
        {/* Back link */}
        <Link href="/projects" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          marginBottom: '2rem',
          textDecoration: 'none',
          transition: 'color 0.2s',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          All Projects
        </Link>

        {/* Hero image */}
        {project.coverImage && (
          <div style={{
            borderRadius: '20px',
            overflow: 'hidden',
            marginBottom: '2.5rem',
            aspectRatio: '16/7',
            position: 'relative',
            border: '1px solid var(--border-color)',
          }}>
            <Image
              src={project.coverImage}
              alt={project.title}
              fill
              style={{ objectFit: 'cover' }}
              priority
              sizes="900px"
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, color-mix(in srgb, var(--bg-color) 30%, transparent) 0%, transparent 60%)',
            }} />
          </div>
        )}

        {/* Header info */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: status.text,
              background: `color-mix(in srgb, ${status.text} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${status.text} 25%, transparent)`,
            }}>
              {status.label}
            </span>
            {project.featured && (
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#fff',
                background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
              }}>
                Featured
              </span>
            )}
          </div>

          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.75rem', lineHeight: 1.2 }}>
            {project.title}
          </h1>
          {project.tagline && (
            <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              {project.tagline}
            </p>
          )}

          {/* Action links */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {safeGithubUrl && (
              <a href={safeGithubUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1.25rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
                textDecoration: 'none',
                transition: 'all 0.2s',
                background: 'transparent',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                View on GitHub
              </a>
            )}
            {safeLiveUrl && (
              <a href={safeLiveUrl} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1.25rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#fff',
                textDecoration: 'none',
                transition: 'opacity 0.2s',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Live Site
              </a>
            )}
          </div>
        </div>

        {/* Tech tags */}
        {project.techTags.length > 0 && (
          <div style={{
            padding: '1.25rem',
            borderRadius: '14px',
            border: '1px solid var(--border-color)',
            marginBottom: '2.5rem',
            background: 'var(--bg-color-secondary, rgba(0,0,0,0.02))',
          }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>
              Tech Stack
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {project.techTags.map((tag: string) => (
                <span key={tag} style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  background: 'color-mix(in srgb, var(--accent-color) 10%, transparent)',
                  color: 'var(--accent-color)',
                  border: '1px solid color-mix(in srgb, var(--accent-color) 20%, transparent)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Rich content */}
        {project.content && (
          <div className="post-content" dangerouslySetInnerHTML={{ __html: await renderPostContent(project.content, project.contentFormat) }} />
        )}

        {/* Image gallery */}
        {project.images && project.images.length > 0 && (
          <div style={{ marginTop: '3rem' }}>
            <h3 style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-secondary)',
              marginBottom: '1.25rem',
            }}>
              Gallery
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1rem',
            }}>
              {project.images.map((img: any) => (
                <div key={img.id} style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  aspectRatio: '4/3',
                  position: 'relative',
                }}>
                  <Image
                    src={img.url}
                    alt={img.caption || project.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="260px"
                  />
                  {img.caption && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '0.5rem 0.75rem',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                      fontSize: '0.75rem',
                      color: '#fff',
                    }}>
                      {img.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
      <ViewTracker />
    </div>
  );
}
