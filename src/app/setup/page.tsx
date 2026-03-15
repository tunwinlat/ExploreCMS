/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { initializeDatabase } from '@/lib/db-init'
import SetupWizard from './SetupWizard'

export default async function SetupPage() {
  // First, try to initialize the database (for LibSQL databases)
  let initError: string | null = null;
  try {
    const initResult = await initializeDatabase();
    if (!initResult.success) {
      console.error('[Setup] Database initialization failed:', initResult.error);
      initError = initResult.error || null;
    }
  } catch (error) {
    console.error('[Setup] Database initialization error:', error);
    initError = error instanceof Error ? error.message : 'Unknown error';
  }

  // Check if an owner already exists
  let owner = null
  let dbError = null
  
  try {
    owner = await prisma.user.findFirst({
      where: { role: 'OWNER' }
    })
  } catch (error) {
    // Database might not be initialized or connection failed
    dbError = error instanceof Error ? error.message : 'Unknown database error'
    console.error('[Setup] Database error:', dbError)
  }

  // If already set up, redirect to login
  if (owner) {
    redirect('/admin/login')
  }

  // If there's a database error (not just missing tables), show error page
  if (dbError && !dbError.includes('no such table')) {
    return (
      <div className="container" style={{ 
        display: 'flex', 
        minHeight: '100vh', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div className="glass fade-in-up" style={{ 
          padding: '2.5rem', 
          maxWidth: '500px', 
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            fontSize: '1.5rem'
          }}>
            ⚠️
          </div>
          <h1 className="heading-xl" style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>
            Database Connection Error
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Unable to connect to the database. Please make sure you have set the{' '}
            <code style={{ 
              background: 'var(--bg-secondary)', 
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}>
              DATABASE_URL
            </code>{' '}
            environment variable correctly.
          </p>
          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            textAlign: 'left',
            fontFamily: 'monospace',
            wordBreak: 'break-word'
          }}>
            {dbError}
          </div>
          <p style={{ 
            marginTop: '1.5rem', 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)'
          }}>
            Example: <code>DATABASE_URL=&quot;libsql://your-db.turso.io&quot;</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ 
      display: 'flex', 
      minHeight: '100vh', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="glass fade-in-up" style={{ 
        padding: '2.5rem', 
        maxWidth: '480px', 
        width: '100%'
      }}>
        <SetupWizard initError={initError} />
      </div>
    </div>
  )
}
