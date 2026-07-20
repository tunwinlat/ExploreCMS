/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentId, ComponentMeta } from '@/lib/components-config'

interface ComponentTabsProps {
  enabledComponents: ComponentMeta[]
  defaultComponent: ComponentId
}

export function ComponentTabs({ enabledComponents, defaultComponent }: ComponentTabsProps) {
  const pathname = usePathname()

  function isActive(comp: ComponentMeta): boolean {
    if (pathname === '/') return comp.id === defaultComponent
    return pathname === comp.path || pathname.startsWith(comp.path + '/')
  }

  return (
    <nav aria-label="Main Navigation" className="component-tabs-scroll">
      <div className="component-tabs">
        {enabledComponents.map(comp => (
          <Link
            key={comp.id}
            href={comp.id === defaultComponent ? '/' : comp.path}
            prefetch={true}
            aria-current={isActive(comp) ? 'page' : undefined}
            className="component-tab"
          >
            {comp.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
