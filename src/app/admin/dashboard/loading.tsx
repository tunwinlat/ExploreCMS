/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default function DashboardLoading() {
  return (
    <div className="fade-in-up">
      <div style={{ marginBottom: '2rem' }}>
        <div className="skeleton" style={{ width: '300px', height: '2.5rem', marginBottom: '0.75rem' }} />
        <div className="skeleton" style={{ width: '250px', height: '1rem' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass" style={{ padding: '1.5rem' }}>
            <div className="skeleton" style={{ width: '120px', height: '0.9rem', marginBottom: '0.75rem' }} />
            <div className="skeleton" style={{ width: '80px', height: '2.5rem' }} />
          </div>
        ))}
      </div>

      <div className="skeleton" style={{ width: '220px', height: '1.5rem', marginBottom: '1rem' }} />
      <div className="glass" style={{ padding: '1.5rem' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: i < 3 ? '1px solid var(--border-color)' : 'none' }}>
            <div className="skeleton" style={{ width: '40%', height: '1rem' }} />
            <div className="skeleton" style={{ width: '60px', height: '1rem' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
