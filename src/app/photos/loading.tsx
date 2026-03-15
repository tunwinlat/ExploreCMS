/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default function Loading() {
  return (
    <div className="main-content">
      {/* Header skeleton */}
      <header style={{ borderBottom: '1px solid var(--border-color)', padding: '1rem 0', marginBottom: '2rem' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="skeleton" style={{ width: '140px', height: '28px', borderRadius: '6px' }} />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div className="skeleton" style={{ width: '120px', height: '32px', borderRadius: '8px' }} />
              <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            </div>
          </div>
          <div style={{ marginTop: '0.875rem' }}>
            <div className="skeleton" style={{ width: '240px', height: '40px', borderRadius: '14px' }} />
          </div>
        </div>
      </header>

      <div className="container" style={{ paddingBottom: '5rem' }}>
        {/* Hero skeleton */}
        <div style={{ textAlign: 'center', maxWidth: '580px', margin: '0 auto 3.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div className="skeleton" style={{ width: '120px', height: '28px', borderRadius: '20px' }} />
          <div className="skeleton" style={{ width: '50%', height: '40px', borderRadius: '8px' }} />
          <div className="skeleton" style={{ width: '72%', height: '20px', borderRadius: '6px' }} />
        </div>

        {/* Album grid skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
            }}>
              <div className="skeleton" style={{ width: '100%', aspectRatio: '4/3', borderRadius: '0' }} />
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="skeleton" style={{ width: '60%', height: '18px', borderRadius: '4px' }} />
                <div className="skeleton" style={{ width: '85%', height: '14px', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
