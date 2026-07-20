/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default function Loading() {
  return (
    <div className="main-content">
      {/* Header skeleton (matches .site-header shape) */}
      <header className="site-header">
        <div className="container site-header-inner">
          <div className="skeleton" style={{ width: '140px', height: '26px', borderRadius: '6px' }} />
          <div className="site-header-actions">
            <div className="skeleton" style={{ width: '120px', height: '36px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
          </div>
        </div>
      </header>

      <div className="container">
        {/* Hero skeleton (left-aligned editorial) */}
        <div className="page-hero">
          <div className="skeleton" style={{ width: '55%', maxWidth: '420px', height: '44px', borderRadius: '8px' }} />
          <div className="skeleton" style={{ width: '70%', maxWidth: '560px', height: '18px', borderRadius: '6px' }} />
        </div>

        {/* Lead story skeleton */}
        <div style={{ marginBottom: 'var(--space-12)' }}>
          <div className="skeleton" style={{ width: '100%', aspectRatio: '16/9', borderRadius: '12px', marginBottom: 'var(--space-6)' }} />
          <div className="skeleton" style={{ width: '90px', height: '12px', borderRadius: '4px', marginBottom: 'var(--space-3)' }} />
          <div className="skeleton" style={{ width: '75%', height: '36px', borderRadius: '8px', marginBottom: 'var(--space-3)' }} />
          <div className="skeleton" style={{ width: '60%', height: '16px', borderRadius: '6px' }} />
        </div>

        {/* List skeleton */}
        <div className="post-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="post-row" aria-hidden="true">
              <div className="skeleton" style={{ width: '220px', aspectRatio: '3/2', borderRadius: '8px', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div className="skeleton" style={{ width: '70%', height: '24px', borderRadius: '6px' }} />
                <div className="skeleton" style={{ width: '95%', height: '14px', borderRadius: '4px' }} />
                <div className="skeleton" style={{ width: '85%', height: '14px', borderRadius: '4px' }} />
                <div className="skeleton" style={{ width: '35%', height: '12px', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
