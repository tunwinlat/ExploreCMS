/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default function Loading() {
  return (
    <div className="post-page">
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

      {/* Hero skeleton (matches .post-hero) */}
      <div className="post-hero" aria-hidden="true">
        <div className="post-hero-content">
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <div className="skeleton" style={{ width: '90px', height: '22px', borderRadius: '20px' }} />
            <div className="skeleton" style={{ width: '70px', height: '16px', borderRadius: '4px' }} />
          </div>
          <div className="skeleton" style={{ width: '80%', height: '56px', borderRadius: '10px', marginBottom: 'var(--space-4)' }} />
          <div className="skeleton" style={{ width: '55%', height: '56px', borderRadius: '10px', marginBottom: 'var(--space-8)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
            <div className="skeleton" style={{ width: '140px', height: '16px', borderRadius: '4px' }} />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <main className="post-main" aria-hidden="true">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 'var(--measure)' }}>
          <div className="skeleton" style={{ width: '100%', height: '16px', borderRadius: '4px' }} />
          <div className="skeleton" style={{ width: '95%', height: '16px', borderRadius: '4px' }} />
          <div className="skeleton" style={{ width: '98%', height: '16px', borderRadius: '4px' }} />
          <div className="skeleton" style={{ width: '90%', height: '16px', borderRadius: '4px' }} />
          <div className="skeleton" style={{ width: '100%', height: '16px', borderRadius: '4px' }} />
          <div style={{ height: '1rem' }} />
          <div className="skeleton" style={{ width: '92%', height: '16px', borderRadius: '4px' }} />
          <div className="skeleton" style={{ width: '96%', height: '16px', borderRadius: '4px' }} />
          <div className="skeleton" style={{ width: '88%', height: '16px', borderRadius: '4px' }} />
        </div>
      </main>
    </div>
  )
}
