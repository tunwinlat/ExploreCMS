/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { parseComponentConfig, COMPONENTS } from "@/lib/components-config";
import { notFound } from "next/navigation";
import { ViewTracker } from "@/components/ViewTracker";
import { PopupToast } from "@/components/PopupToast";
import { getSettings, getPopupConfig } from "@/lib/settings-cache";

import { getCachedProjects } from "@/lib/projects-cache";

export const revalidate = 60

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

  // Single grid, featured projects pinned first
  const sorted = [...projects].sort((a: any, b: any) => Number(b.featured) - Number(a.featured));

  return (
    <div className="main-content fade-in-up">
      <SiteHeader
        title={settings?.title || 'ExploreCMS'}
        enabledComponents={enabledMeta}
        defaultComponent={defaultComponent}
      />

      <PageHero
        eyebrow="Projects"
        title="Built with Purpose"
        description="A collection of projects, experiments, and things I've shipped."
      />

      <div className="container">
        {sorted.length === 0 ? (
          <p className="empty-state">No projects published yet. Check back soon.</p>
        ) : (
          <div className="project-grid">
            {sorted.map((project: any) => (
              <ProjectCard key={project.id} project={project} />
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
