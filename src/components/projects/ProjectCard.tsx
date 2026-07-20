/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { normalizeUrl } from '@/lib/urlUtils'
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

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  archived: 'Archived',
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

function PlaceholderIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="6" height="6" rx="1"/>
      <rect x="16" y="3" width="6" height="6" rx="1"/>
      <rect x="2" y="15" width="6" height="6" rx="1"/>
      <path d="M22 15H16a1 1 0 0 0-1 1v1"/>
      <path d="M19 18v3"/>
      <path d="M9 6h6"/>
      <path d="M9 18h3"/>
    </svg>
  )
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const statusLabel = STATUS_LABELS[project.status] || STATUS_LABELS.completed

  const safeGithubUrl = normalizeUrl(project.githubUrl)
  const safeLiveUrl = normalizeUrl(project.liveUrl)

  return (
    <article className="project-card">
      {/* Cover */}
      <div className="project-card-cover">
        {project.coverImage ? (
          <Image
            src={project.coverImage}
            alt={project.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="project-card-cover-placeholder">
            <PlaceholderIcon />
          </div>
        )}
        {project.featured && (
          <span className="eyebrow card-badge">Featured</span>
        )}
      </div>

      {/* Body */}
      <div className="project-card-body">
        <h3 className="project-card-title">
          <Link href={`/projects/${project.slug}`}>{project.title}</Link>
        </h3>

        {project.tagline && (
          <p className="project-card-tagline">{project.tagline}</p>
        )}

        <p className="meta">
          <span className={`status-dot status-${project.status}`} aria-hidden="true" />
          <span>{statusLabel}</span>
        </p>

        {project.techTags.length > 0 && (
          <div className="tag-list">
            {project.techTags.slice(0, 5).map(tag => (
              <span key={tag} className="tag-chip">{tag}</span>
            ))}
            {project.techTags.length > 5 && (
              <span className="tag-chip">+{project.techTags.length - 5}</span>
            )}
          </div>
        )}
      </div>

      {/* External links (above the stretched card link) */}
      {(safeGithubUrl || safeLiveUrl) && (
        <div className="project-card-links">
          {safeGithubUrl && (
            <a
              href={safeGithubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="icon-btn"
              title="View on GitHub"
              aria-label={`${project.title} on GitHub`}
            >
              <GitHubIcon />
            </a>
          )}
          {safeLiveUrl && (
            <a
              href={safeLiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="icon-btn"
              title="View live site"
              aria-label={`${project.title} live site`}
            >
              <ExternalLinkIcon />
            </a>
          )}
        </div>
      )}
    </article>
  )
}
