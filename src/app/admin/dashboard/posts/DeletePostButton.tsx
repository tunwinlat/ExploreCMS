'use client'

import { useState } from 'react'
import { deletePostById } from './postDeleteActions'
import { useRouter } from 'next/navigation'

export function DeletePostButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this post?')) return
    
    setLoading(true)
    const res = await deletePostById(id)
    if (res.success) {
      router.refresh()
    } else {
      alert(res.error)
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleDelete} 
      disabled={loading} 
      style={{ 
        color: 'var(--accent-hover)', 
        border: 'none', 
        background: 'none', 
        cursor: 'pointer', 
        fontSize: '1rem',
        opacity: loading ? 0.5 : 1
      }}
    >
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  )
}
