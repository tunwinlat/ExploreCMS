/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default function DraftsLoading() {
  return (
    <div className="fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div className="skeleton" style={{ width: '200px', height: '2.5rem', marginBottom: '0.75rem' }} />
          <div className="skeleton" style={{ width: '280px', height: '1rem' }} />
        </div>
        <div className="skeleton" style={{ width: '120px', height: '38px', borderRadius: 'var(--radius-md)' }} />
      </div>

      <div className="glass" style={{ padding: '1.5rem' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: i < 4 ? '1px solid var(--border-color)' : 'none' }}>
            <div className="skeleton" style={{ width: '35%', height: '1rem' }} />
            <div className="skeleton" style={{ width: '60px', height: '22px', borderRadius: '9999px' }} />
            <div className="skeleton" style={{ width: '80px', height: '1rem' }} />
            <div className="skeleton" style={{ width: '80px', height: '1rem' }} />
            <div className="skeleton" style={{ width: '100px', height: '1rem' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
