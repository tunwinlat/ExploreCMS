/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use client'

import { logout } from './actions'

export default function LogoutButton() {
  return (
    <button 
      onClick={() => logout()} 
      style={{ 
        background: 'transparent', 
        border: '1px solid var(--border-color)', 
        color: 'inherit', 
        padding: '0.5rem 1rem', 
        borderRadius: 'var(--radius-md)', 
        cursor: 'pointer', 
        transition: 'all var(--transition-fast)' 
      }}
      className="btn"
    >
      Sign Out
    </button>
  )
}
