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
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="site-wordmark">
          {title}
        </Link>

        {showTabs && (
          <ComponentTabs
            enabledComponents={enabledComponents}
            defaultComponent={defaultComponent}
          />
        )}

        <div className="site-header-actions">
          {showSearch && <SearchBox />}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
