/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { normalizeUrl } from '@/lib/urlUtils'
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { parseComponentConfig, COMPONENTS } from "@/lib/components-config";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ViewTracker } from "@/components/ViewTracker";
import { renderPostContent } from "@/lib/renderContent";
import { getSettings } from "@/lib/settings-cache";
import { buildPageMetadata } from "@/lib/seo";

import { unstable_cache } from "next/cache";
// Shared rich-content typography (deduplication with post.css tracked for Phase 6/8)
import "../../post/[slug]/post.css";

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
        createdAt: typeof project.createdAt === 'string' ? project.createdAt : (project.createdAt ? project.createdAt.toISOString() : null),
        updatedAt: typeof project.updatedAt === 'string' ? project.updatedAt : (project.updatedAt ? project.updatedAt.toISOString() : null),
        techTags: (() => { try { return JSON.parse(project.techTags || '[]') } catch { return [] } })(),
      };
    } catch { return null; }
  },
  ['project-detail'],
  { revalidate: 60 }
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [settings, project] = await Promise.all([getSettings(), getProject(slug)]);
  if (!project) return { title: 'Not Found' };
  return buildPageMetadata(
    {
      title: project.title,
      description: project.tagline || undefined,
      path: `/projects/${slug}`,
      image: project.coverImage,
    },
    settings
  );
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  archived: 'Archived',
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [settings, project] = await Promise.all([getSettings(), getProject(slug)]);

  if (!project) notFound();

  const componentConfig = parseComponentConfig(settings);
  const { enabledComponents, defaultComponent } = componentConfig;
  if (!enabledComponents.includes('projects')) notFound();

  const enabledMeta = COMPONENTS.filter(c => enabledComponents.includes(c.id));
  const statusLabel = STATUS_LABELS[project.status] || STATUS_LABELS.completed;

  const safeGithubUrl = normalizeUrl(project.githubUrl)
  const safeLiveUrl = normalizeUrl(project.liveUrl)

  return (
    <div className="main-content fade-in-up">
      <SiteHeader
        title={settings?.title || 'ExploreCMS'}
        enabledComponents={enabledMeta}
        defaultComponent={defaultComponent}
      />

      <div className="container project-detail">
        {/* Back link */}
        <Link href="/projects" className="back-link" style={{
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
          All Projects
        </Link>

        {/* Hero image */}
        {project.coverImage && (
          <div className="project-detail-hero">
            <Image
              src={project.coverImage}
              alt={project.title}
              fill
              style={{ objectFit: 'cover' }}
              priority
              sizes="900px"
            />
          </div>
        )}

        {/* Header info */}
        <div className="project-detail-header">
          <p className="meta">
            <span className={`status-dot status-${project.status}`} aria-hidden="true" />
            <span>{statusLabel}</span>
            {project.featured && (
              <>
                <span aria-hidden="true">·</span>
                <span className="eyebrow">Featured</span>
              </>
            )}
          </p>

          <h1 className="display-1">{project.title}</h1>
          {project.tagline && (
            <p className="lede">{project.tagline}</p>
          )}

          {/* Action links */}
          {(safeGithubUrl || safeLiveUrl) && (
            <div className="project-detail-actions">
              {safeGithubUrl && (
                <a href={safeGithubUrl} target="_blank" rel="noopener noreferrer" className="action-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  View on GitHub
                </a>
              )}
              {safeLiveUrl && (
                <a href={safeLiveUrl} target="_blank" rel="noopener noreferrer" className="action-btn action-btn-primary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  Live Site
                </a>
              )}
            </div>
          )}
        </div>

        {/* Tech tags */}
        {project.techTags.length > 0 && (
          <div className="project-detail-stack">
            <span className="eyebrow">Tech Stack</span>
            <div className="tag-list">
              {project.techTags.map((tag: string) => (
                <span key={tag} className="tag-chip">{tag}</span>
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
          <div className="project-gallery">
            <span className="eyebrow">Gallery</span>
            <div className="project-gallery-grid">
              {project.images.map((img: any) => (
                <div key={img.id} className="project-gallery-item">
                  <Image
                    src={img.url}
                    alt={img.caption || project.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="260px"
                  />
                  {img.caption && (
                    <div className="project-gallery-caption">
                      {img.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <SiteFooter title={settings?.title} footerText={settings?.footerText} />
      <ViewTracker />
    </div>
  );
}
