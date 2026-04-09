/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { SiteHeader } from "@/components/SiteHeader";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { parseComponentConfig, COMPONENTS } from "@/lib/components-config";
import { notFound } from "next/navigation";
import { ViewTracker } from "@/components/ViewTracker";
import { PopupToast } from "@/components/PopupToast";
import { getSettings, getPopupConfig } from "@/lib/settings-cache";

import { getCachedProjects } from "@/lib/projects-cache";

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const [settings, projects, popupConfig] = await Promise.all([
    getSettings(),
    getCachedProjects(),
    getPopupConfig()
  ]);

  const componentConfig = parseComponentConfig(settings);
  const { enabledComponents, defaultComponent } = componentConfig;

  if (!enabledComponents.includes('projects')) notFound();

  const enabledMeta = COMPONENTS.filter(c => enabledComponents.includes(c.id));

  const featured = projects.filter((p: any) => p.featured);
  const rest = projects.filter((p: any) => !p.featured);

  return (
    <div className="main-content fade-in-up">
      <SiteHeader
        title={settings?.title || 'ExploreCMS'}
        enabledComponents={enabledMeta}
        defaultComponent={defaultComponent}
      />

      <div className="container" style={{ marginBottom: '3rem' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3rem' }}>
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Projects
          </div>
          <h1 className="heading-xl">Built with Purpose</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            A collection of projects, experiments, and things I&apos;ve shipped.
          </p>
        </div>

        {projects.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '5rem 2rem',
            color: 'var(--text-secondary)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🚀</div>
            <p style={{ fontSize: '1.1rem' }}>No projects published yet. Check back soon!</p>
          </div>
        ) : (
          <>
            {/* Featured projects */}
            {featured.length > 0 && (
              <section style={{ marginBottom: '3rem' }}>
                <h2 style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--text-secondary)',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <span style={{
                    width: '20px',
                    height: '2px',
                    background: 'var(--accent-color)',
                    display: 'inline-block',
                  }} />
                  Featured
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '1.5rem',
                }}>
                  {featured.map((project: any) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </section>
            )}

            {/* All other projects */}
            {rest.length > 0 && (
              <section>
                {featured.length > 0 && (
                  <h2 style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--text-secondary)',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <span style={{
                      width: '20px',
                      height: '2px',
                      background: 'var(--border-color)',
                      display: 'inline-block',
                    }} />
                    All Projects
                  </h2>
                )}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '1.25rem',
                }}>
                  {rest.map((project: any) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <footer className="container" style={{
        marginTop: '5rem',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '2rem',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
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
