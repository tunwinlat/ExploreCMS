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

      <div className="container">
        {/* Hero skeleton */}
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div className="skeleton" style={{ width: '100px', height: '28px', borderRadius: '20px' }} />
          <div className="skeleton" style={{ width: '55%', height: '40px', borderRadius: '8px' }} />
          <div className="skeleton" style={{ width: '75%', height: '20px', borderRadius: '6px' }} />
        </div>

        {/* Project cards skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '0',
            }}>
              <div className="skeleton" style={{ width: '100%', height: '200px', borderRadius: '0' }} />
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div className="skeleton" style={{ width: '65%', height: '22px', borderRadius: '4px' }} />
                <div className="skeleton" style={{ width: '90%', height: '16px', borderRadius: '4px' }} />
                <div className="skeleton" style={{ width: '80%', height: '16px', borderRadius: '4px' }} />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="skeleton" style={{ width: '60px', height: '22px', borderRadius: '20px' }} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
