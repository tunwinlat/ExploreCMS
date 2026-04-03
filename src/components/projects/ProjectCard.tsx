/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'

export interface ProjectCardData {
  id: string
  title: string
  slug: string
  tagline: string
  coverImage?: string | null
  status: string
  featured: boolean
  githubUrl?: string | null
  liveUrl?: string | null
  techTags: string[]
}

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

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  completed:   { bg: 'color-mix(in srgb, #22c55e 15%, transparent)', text: '#22c55e', label: 'Completed' },
  in_progress: { bg: 'color-mix(in srgb, var(--accent-color) 15%, transparent)', text: 'var(--accent-color)', label: 'In Progress' },
  archived:    { bg: 'color-mix(in srgb, #94a3b8 15%, transparent)', text: '#94a3b8', label: 'Archived' },
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const status = STATUS_COLORS[project.status] || STATUS_COLORS.completed

  const safeGithubUrl = getSafeUrl(project.githubUrl)
  const safeLiveUrl = getSafeUrl(project.liveUrl)

  return (
    <div
      className="project-card"
      style={{
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-color-secondary, rgba(255,255,255,0.02))',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        .project-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px color-mix(in srgb, var(--accent-color) 15%, transparent);
          border-color: color-mix(in srgb, var(--accent-color) 35%, transparent) !important;
        }
        .project-card:hover .project-cover-overlay {
          opacity: 1 !important;
        }
      `}</style>

      {/* Cover Image */}
      <Link href={`/projects/${project.slug}`} style={{ display: 'block', position: 'relative', overflow: 'hidden', aspectRatio: '16/9' }}>
        {project.coverImage ? (
          <>
            <Image
              src={project.coverImage}
              alt={project.title}
              fill
              style={{ objectFit: 'cover', transition: 'transform 0.4s ease' }}
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div
              className="project-cover-overlay"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-color) 30%, transparent), transparent)',
                opacity: 0,
                transition: 'opacity 0.3s ease',
              }}
            />
          </>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-color) 20%, var(--bg-color)), var(--bg-color))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
              <rect x="2" y="3" width="6" height="6" rx="1"/>
              <rect x="16" y="3" width="6" height="6" rx="1"/>
              <rect x="2" y="15" width="6" height="6" rx="1"/>
              <path d="M22 15H16a1 1 0 0 0-1 1v1"/>
              <path d="M19 18v3"/>
              <path d="M9 6h6"/>
              <path d="M9 18h3"/>
            </svg>
          </div>
        )}

        {/* Featured badge */}
        {project.featured && (
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
      </Link>

      {/* Card Body */}
      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Status + links row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{
            padding: '0.2rem 0.65rem',
            borderRadius: '20px',
            fontSize: '0.7rem',
            fontWeight: 600,
            background: status.bg,
            color: status.text,
            letterSpacing: '0.03em',
          }}>
            {status.label}
          </span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {safeGithubUrl && (
              <a
                href={safeGithubUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  transition: 'color 0.2s, border-color 0.2s',
                }}
                onClick={e => e.stopPropagation()}
                title="View on GitHub"
              >
                <GitHubIcon />
              </a>
            )}
            {safeLiveUrl && (
              <a
                href={safeLiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  transition: 'color 0.2s, border-color 0.2s',
                }}
                onClick={e => e.stopPropagation()}
                title="View live site"
              >
                <ExternalLinkIcon />
              </a>
            )}
          </div>
        </div>

        {/* Title */}
        <Link href={`/projects/${project.slug}`} style={{ textDecoration: 'none' }}>
          <h3 style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            margin: 0,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            transition: 'color 0.2s',
          }}>
            {project.title}
          </h3>
        </Link>

        {/* Tagline */}
        {project.tagline && (
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.5,
            flex: 1,
          }}>
            {project.tagline}
          </p>
        )}

        {/* Tech tags */}
        {project.techTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: 'auto' }}>
            {project.techTags.slice(0, 5).map(tag => (
              <span key={tag} style={{
                padding: '0.15rem 0.55rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 500,
                background: 'color-mix(in srgb, var(--accent-color) 10%, transparent)',
                color: 'var(--accent-color)',
                border: '1px solid color-mix(in srgb, var(--accent-color) 20%, transparent)',
              }}>
                {tag}
              </span>
            ))}
            {project.techTags.length > 5 && (
              <span style={{
                padding: '0.15rem 0.55rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                color: 'var(--text-secondary)',
              }}>+{project.techTags.length - 5}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
