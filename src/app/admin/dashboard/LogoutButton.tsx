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
