/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default function Loading() {
  return (
    <>
      {/* Sticky Navigation Bar skeleton */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--bg-color)',
        borderBottom: '1px solid var(--border-color)',
        backdropFilter: 'blur(10px)',
        padding: '1rem 0'
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '6px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="skeleton" style={{ width: '120px', height: '32px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          </div>
        </div>
      </nav>

      <main className="container main-content fade-in-up">
        <article className="glass" style={{ padding: '4rem 3rem' }}>
          <header style={{ 
            marginBottom: '3rem', 
            textAlign: 'center', 
            borderBottom: '1px solid var(--border-color)', 
            paddingBottom: '2.5rem' 
          }}>
            {/* Title skeleton */}
            <div className="skeleton" style={{ 
              width: '80%', 
              height: '48px', 
              borderRadius: '8px',
              margin: '0 auto 1rem'
            }} />
            
            {/* Meta info skeleton */}
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <div className="skeleton" style={{ width: '120px', height: '20px', borderRadius: '4px' }} />
              <div className="skeleton" style={{ width: '8px', height: '8px', borderRadius: '50%' }} />
              <div className="skeleton" style={{ width: '140px', height: '20px', borderRadius: '4px' }} />
            </div>
          </header>

          {/* Content skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
        </article>
      </main>
    </>
  )
}
