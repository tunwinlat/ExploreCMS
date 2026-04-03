/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { 
  migrateToEncryption, 
  hasUnencryptedData, 
  getEncryptionStatus,
  MigrationResult 
} from '@/lib/encryption-migration'
import { isEncryptionEnabled } from '@/lib/crypto'

export interface EncryptionStatus {
  isEnabled: boolean
  hasUnencrypted: boolean
  fields: {
    field: string
    label: string
    status: 'encrypted' | 'plain' | 'legacy' | 'empty'
    value: string | null
  }[]
}

export async function getEncryptionMigrationStatus(): Promise<{ 
  success: boolean
  status?: EncryptionStatus
  error?: string 
}> {
  const session = await verifySession()
  if (!session) return { success: false, error: 'Unauthorized' }
  if ((session as { role: string }).role !== 'OWNER') {
    return { success: false, error: 'Permission denied' }
  }

  try {
    const [isEnabled, hasUnencrypted, fields] = await Promise.all([
      Promise.resolve(isEncryptionEnabled()),
      hasUnencryptedData(),
      getEncryptionStatus()
    ])

    return {
      success: true,
      status: {
        isEnabled,
        hasUnencrypted,
        fields
      }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function runEncryptionMigration(): Promise<{
  success: boolean
  result?: MigrationResult
  error?: string
}> {
  const session = await verifySession()
  if (!session) return { success: false, error: 'Unauthorized' }
  if ((session as { role: string }).role !== 'OWNER') {
    return { success: false, error: 'Permission denied' }
  }

  try {
    const result = await migrateToEncryption()
    return { success: result.success, result }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
