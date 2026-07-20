/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

interface SiteFooterProps {
  title?: string | null
  footerText?: string | null
}

export function SiteFooter({ title, footerText }: SiteFooterProps) {
  return (
    <footer className="site-footer container">
      <p>
        © {new Date().getFullYear()} {footerText || `${title || 'ExploreCMS'}. All rights reserved.`}
      </p>
    </footer>
  )
}
