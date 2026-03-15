/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export type ComponentId = 'blog' | 'projects' | 'photos'

export interface ComponentMeta {
  id: ComponentId
  label: string
  description: string
  path: string
  icon: string
}

export const COMPONENTS: ComponentMeta[] = [
  {
    id: 'blog',
    label: 'Blog',
    description: 'Share articles, stories and technical deep-dives.',
    path: '/blog',
    icon: 'blog',
  },
  {
    id: 'projects',
    label: 'Projects',
    description: 'Showcase your work, side projects and portfolio pieces.',
    path: '/projects',
    icon: 'projects',
  },
  {
    id: 'photos',
    label: 'Photo Gallery',
    description: 'Display your photography organised in albums.',
    path: '/photos',
    icon: 'photos',
  },
]

export interface ComponentConfig {
  enabledComponents: ComponentId[]
  defaultComponent: ComponentId
}

export function parseComponentConfig(settings: {
  enabledComponents?: string | null
  defaultComponent?: string | null
} | null): ComponentConfig {
  let enabled: ComponentId[] = ['blog']
  try {
    const parsed = JSON.parse(settings?.enabledComponents || '["blog"]')
    if (Array.isArray(parsed) && parsed.length > 0) {
      enabled = parsed as ComponentId[]
    }
  } catch {
    // use default
  }

  const def = (settings?.defaultComponent as ComponentId) || 'blog'
  const defaultComponent = enabled.includes(def) ? def : enabled[0]

  return { enabledComponents: enabled, defaultComponent }
}

export function getComponentMeta(id: ComponentId): ComponentMeta {
  return COMPONENTS.find(c => c.id === id) || COMPONENTS[0]
}

/** Returns the href for the default component landing page */
export function defaultComponentHref(config: ComponentConfig): string {
  return getComponentMeta(config.defaultComponent).path
}
