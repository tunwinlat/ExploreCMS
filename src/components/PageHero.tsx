/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

interface PageHeroProps {
  eyebrow?: string
  title: string
  description?: string
}

/**
 * Editorial page header: small uppercase eyebrow, serif display title,
 * optional lede paragraph. Left-aligned (publication style).
 */
export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <div className="page-hero container">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="display-1">{title}</h1>
      {description && <p className="lede">{description}</p>}
    </div>
  )
}
