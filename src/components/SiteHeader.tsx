/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SearchBox } from '@/components/SearchBox'
import { ComponentTabs } from '@/components/ComponentTabs'
import type { ComponentId, ComponentMeta } from '@/lib/components-config'

interface SiteHeaderProps {
  title: string
  enabledComponents: ComponentMeta[]
  defaultComponent: ComponentId
  showSearch?: boolean
}

export function SiteHeader({ title, enabledComponents, defaultComponent, showSearch = true }: SiteHeaderProps) {
  const showTabs = enabledComponents.length > 1

  return (
    <header style={{
      borderBottom: '1px solid var(--border-color)',
      padding: '1rem 0',
      marginBottom: '2rem',
    }}>
      <div className="container">
        {/* Top bar: logo + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {title}
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {showSearch && <SearchBox />}
            <ThemeToggle />
          </div>
        </div>

        {/* Component Tabs row */}
        {showTabs && (
          <div style={{ marginTop: '0.875rem' }}>
            <ComponentTabs
              enabledComponents={enabledComponents}
              defaultComponent={defaultComponent}
            />
          </div>
        )}
      </div>
    </header>
  )
}
