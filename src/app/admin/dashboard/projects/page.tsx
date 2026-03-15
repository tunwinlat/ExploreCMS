/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { deleteProject } from './projectActions'

export default async function ProjectsAdminPage() {
  const session = await verifySession()
  if (!session) return null

  let projects: any[] = []
  try {
    projects = await (prisma as any).project.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { images: true } } },
    })
  } catch {}

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    completed:   { label: 'Completed', color: '#22c55e' },
    in_progress: { label: 'In Progress', color: 'var(--accent-color)' },
    archived:    { label: 'Archived', color: '#94a3b8' },
  }

  return (
    <div className="fade-in-up">
      <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h1 className="admin-page-title">Projects</h1>
          <p className="admin-page-subtitle">Manage your project showcase.</p>
        </div>
        <Link
          href="/admin/dashboard/projects/new"
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
          New Project
        </Link>
      </header>

      {projects.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          border: '2px dashed var(--border-color)',
          borderRadius: '16px',
          color: 'var(--text-secondary)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4 }}>🚀</div>
          <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>No projects yet. Create your first one!</p>
          <Link
            href="/admin/dashboard/projects/new"
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
            Create Project
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {projects.map((project: any) => {
            const st = STATUS_LABELS[project.status] || STATUS_LABELS.completed
            return (
              <div
                key={project.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color-secondary, rgba(0,0,0,0.02))',
                }}
              >
                {/* Status dot */}
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: st.color,
                  flexShrink: 0,
                }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {project.title}
                    </span>
                    {project.featured && (
                      <span style={{
                        padding: '0.1rem 0.5rem',
                        borderRadius: '20px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
                        color: '#fff',
                        letterSpacing: '0.04em',
                      }}>FEATURED</span>
                    )}
                    {!project.published && (
                      <span style={{
                        padding: '0.1rem 0.5rem',
                        borderRadius: '20px',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        background: 'var(--border-color)',
                        color: 'var(--text-secondary)',
                      }}>DRAFT</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.tagline || '—'} • {project._count.images} image{project._count.images !== 1 ? 's' : ''} • {st.label}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <Link
                    href={`/admin/dashboard/projects/edit/${project.id}`}
                    style={{
                      padding: '0.4rem 0.875rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    Edit
                  </Link>
                  <form action={async () => { await deleteProject(project.id) }}>
                    <button
                      type="submit"
                      style={{
                        padding: '0.4rem 0.875rem',
                        borderRadius: '8px',
                        border: '1px solid color-mix(in srgb, #ef4444 30%, transparent)',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        color: '#ef4444',
                        background: 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={e => {
                        if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) e.preventDefault()
                      }}
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
