/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default function Loading() {
  return (
    <div className="main-content">
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <p className="empty-state">Loading profile…</p>
      </div>
    </div>
  );
}
