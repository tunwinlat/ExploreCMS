/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { parseComponentConfig, COMPONENTS } from "@/lib/components-config";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ViewTracker } from "@/components/ViewTracker";
import { PopupToast } from "@/components/PopupToast";
import { getSettings, getPopupConfig } from "@/lib/settings-cache";
import { getProfile } from "@/lib/profile-cache";
import { getCachedProjects } from "@/lib/projects-cache";
import { buildPageMetadata, profilePageJsonLd, profileMetaDescription, breadcrumbJsonLd } from "@/lib/seo";
import { parseProfileSections } from "@/lib/profile-sections";
import { renderPostContent } from "@/lib/renderContent";

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const [settings, profile] = await Promise.all([getSettings(), getProfile()]);
  if (!profile?.fullName) return buildPageMetadata({ title: 'Profile', path: '/profile' }, settings);
  const sections = parseProfileSections(profile);
  const shortLocation = profile.location.split(',').slice(0, 2).map(p => p.trim()).filter(Boolean).join(', ');
  const titleParts = [profile.fullName, profile.headline, shortLocation].filter(Boolean);
  return buildPageMetadata({
    title: titleParts.join(' — '),
    description: profileMetaDescription(profile, sections),
    path: '/profile',
  }, settings);
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: '1rem',
};

function formatRange(start: string, end: string, current?: boolean): string {
  const s = start.trim();
  const e = current ? 'Present' : end.trim();
  if (s && e) return `${s} — ${e}`;
  return s || e;
}

export default async function ProfilePage() {
  const [settings, profile, projects, popupConfig] = await Promise.all([
    getSettings(),
    getProfile(),
    getCachedProjects(),
    getPopupConfig(),
  ]);

  const componentConfig = parseComponentConfig(settings);
  const { enabledComponents, defaultComponent } = componentConfig;

  if (!enabledComponents.includes('profile')) notFound();

  const enabledMeta = COMPONENTS.filter(c => enabledComponents.includes(c.id));

  const sections = parseProfileSections(profile);
  const p = profile || { fullName: '', headline: '', avatarUrl: null, location: '', email: '', phone: '', website: '', summary: '', availability: '', resumeUrl: null, showProjects: true, projectsHeading: 'Projects' };

  const hasBasics = Boolean(
    p.fullName || p.headline || p.avatarUrl || p.location || p.email ||
    p.phone || p.website || p.availability || p.resumeUrl
  );
  const summaryHtml = p.summary ? await renderPostContent(p.summary, undefined) : '';
  const showProjects = p.showProjects !== false && projects.length > 0;

  // Group skills by category (uncategorised first)
  const skillGroups = new Map<string, typeof sections.skills>();
  for (const skill of sections.skills) {
    const key = skill.category.trim();
    if (!skillGroups.has(key)) skillGroups.set(key, []);
    skillGroups.get(key)!.push(skill);
  }

  const isEmpty = !hasBasics && !summaryHtml && Object.values(sections).every(arr => arr.length === 0);

  return (
    <div className="main-content fade-in-up">
      {/* Structured data: ProfilePage + Person entity, plus breadcrumb */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profilePageJsonLd(p, sections, settings)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Profile', path: '/profile' }], settings)) }}
      />
      <SiteHeader
        title={settings?.title || 'ExploreCMS'}
        enabledComponents={enabledMeta}
        defaultComponent={defaultComponent}
      />

      <div className="container" style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        {isEmpty ? (
          <p className="empty-state">This profile is being put together. Check back soon.</p>
        ) : (
          <>
            {hasBasics && (
              <header style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                {p.avatarUrl && (
                  <img
                    src={p.avatarUrl}
                    alt={p.fullName || 'Profile photo'}
                    width={112}
                    height={112}
                    style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--border-color)' }}
                  />
                )}
                <div style={{ flex: 1, minWidth: '220px' }}>
                  {p.fullName && <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{p.fullName}</h1>}
                  {p.headline && <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{p.headline}</p>}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {p.location && <span>📍 {p.location}</span>}
                    {p.availability && (
                      <span style={{ padding: '0.1rem 0.6rem', borderRadius: '20px', border: '1px solid var(--border-color)', color: 'var(--accent, #4f8cff)' }}>
                        {p.availability}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.9rem' }}>
                    {p.email && <a className="profile-contact-chip" href={`mailto:${p.email}`}>✉️ Email</a>}
                    {p.phone && <a className="profile-contact-chip" href={`tel:${p.phone}`}>📞 {p.phone}</a>}
                    {p.website && <a className="profile-contact-chip" href={p.website} target="_blank" rel="noopener noreferrer">🔗 Website</a>}
                    {p.resumeUrl && <a className="profile-contact-chip" href={p.resumeUrl} target="_blank" rel="noopener noreferrer">📄 Résumé</a>}
                  </div>
                </div>
              </header>
            )}

            {sections.links.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                {sections.links.map((link, i) => (
                  <a key={i} className="profile-contact-chip" href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label || link.url}
                  </a>
                ))}
              </div>
            )}

            {summaryHtml && (
              <section style={{ marginBottom: '2.5rem' }}>
                <h2 style={sectionTitleStyle}>About</h2>
                <div className="post-content profile-about" dangerouslySetInnerHTML={{ __html: summaryHtml }} />
              </section>
            )}

            {sections.experience.length > 0 && (
              <section style={{ marginBottom: '2.5rem' }}>
                <h2 style={sectionTitleStyle}>Experience</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {sections.experience.map((job, i) => (
                    <article key={i} style={{ borderLeft: '3px solid var(--accent, #4f8cff)', paddingLeft: '1rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{job.title}</h3>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {[job.company, job.location].filter(Boolean).join(' · ')}
                      </p>
                      {formatRange(job.startDate, job.endDate, job.current) && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {formatRange(job.startDate, job.endDate, job.current)}
                        </p>
                      )}
                      {job.description && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '0.5rem', whiteSpace: 'pre-line' }}>{job.description}</p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {sections.education.length > 0 && (
              <section style={{ marginBottom: '2.5rem' }}>
                <h2 style={sectionTitleStyle}>Education</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {sections.education.map((edu, i) => (
                    <article key={i} style={{ borderLeft: '3px solid var(--border-color)', paddingLeft: '1rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {[edu.degree, edu.field].filter(Boolean).join(', ') || edu.school}
                      </h3>
                      {(edu.degree || edu.field) && edu.school && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{edu.school}</p>
                      )}
                      {formatRange(edu.startDate, edu.endDate) && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{formatRange(edu.startDate, edu.endDate)}</p>
                      )}
                      {edu.description && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '0.5rem', whiteSpace: 'pre-line' }}>{edu.description}</p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {sections.skills.length > 0 && (
              <section style={{ marginBottom: '2.5rem' }}>
                <h2 style={sectionTitleStyle}>Skills</h2>
                {[...skillGroups.entries()].map(([category, skills]) => (
                  <div key={category || 'uncategorized'} style={{ marginBottom: '1rem' }}>
                    {category && <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>{category}</h3>}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {skills.map((skill, i) => (
                        <span key={i} className="profile-skill-chip">{skill.name}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {sections.certifications.length > 0 && (
              <section style={{ marginBottom: '2.5rem' }}>
                <h2 style={sectionTitleStyle}>Certifications</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {sections.certifications.map((cert, i) => (
                    <div key={i}>
                      {cert.url ? (
                        <a href={cert.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: 'var(--accent, #4f8cff)' }}>
                          {cert.name}
                        </a>
                      ) : (
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cert.name}</span>
                      )}
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {[cert.issuer, cert.date].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {sections.languages.length > 0 && (
              <section style={{ marginBottom: '2.5rem' }}>
                <h2 style={sectionTitleStyle}>Languages</h2>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {sections.languages.map((lang, i) => (
                    <span key={i} className="profile-skill-chip">
                      {lang.name}{lang.proficiency ? ` · ${lang.proficiency}` : ''}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {sections.interests.length > 0 && (
              <section style={{ marginBottom: '2.5rem' }}>
                <h2 style={sectionTitleStyle}>Interests</h2>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {sections.interests.map((interest, i) => (
                    <span key={i} className="profile-skill-chip">{interest.name}</span>
                  ))}
                </div>
              </section>
            )}

            {showProjects && (
              <section style={{ marginBottom: '2.5rem' }}>
                <h2 style={sectionTitleStyle}>{p.projectsHeading || 'Projects'}</h2>
                <div className="project-grid">
                  {projects.map((project: any) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </section>
            )}
          </>
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
