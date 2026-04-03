/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Encryption Migration Utility
 * 
 * Automatically migrates existing plain-text sensitive data to encrypted format
 * when ENCRYPTION_KEY is newly configured. This eliminates the UX pain of having
 * to reconfigure all integrations after enabling encryption.
 */

import { prisma } from './db'
import { encrypt, decrypt, isEncryptionEnabled } from './crypto'

// Fields that should be encrypted with their human-readable names
const ENCRYPTABLE_FIELDS: { field: string; label: string }[] = [
  { field: 'resendApiKey', label: 'Resend API Key' },
  { field: 'smtpPassword', label: 'SMTP Password' },
  { field: 'githubAccessToken', label: 'GitHub Access Token' },
  { field: 'bunnyToken', label: 'Bunny Storage Token' },
  { field: 'bunnyStorageApiKey', label: 'Bunny Storage API Key' },
  { field: 'craftApiToken', label: 'Craft.do API Token' },
]

export interface MigrationResult {
  success: boolean
  migrated: { field: string; label: string }[]
  skipped: { field: string; label: string; reason: string }[]
  failed: { field: string; label: string; error: string }[]
}

/**
 * Check if a value is already encrypted or marked as plain text
 */
function isAlreadyProcessed(value: string | null): boolean {
  if (!value) return true
  return value.startsWith('enc:') || value.startsWith('plain:')
}

/**
 * Get the actual value from a potentially prefixed string
 */
function getRawValue(value: string | null): string | null {
  if (!value) return null
  if (value.startsWith('plain:')) return value.slice(6)
  if (value.startsWith('enc:')) {
    // Already encrypted - decrypt to get raw value for re-encryption
    return decrypt(value)
  }
  // Legacy plain text (no prefix)
  return value
}

/**
 * Migrate all sensitive data to encrypted format
 * Should be called when ENCRYPTION_KEY is first configured
 */
export async function migrateToEncryption(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migrated: [],
    skipped: [],
    failed: []
  }

  // Check if encryption is enabled
  if (!isEncryptionEnabled()) {
    return {
      ...result,
      success: false,
      failed: [{ field: 'ENCRYPTION_KEY', label: 'Encryption Key', error: 'ENCRYPTION_KEY not configured' }]
    }
  }

  try {
    // Get current settings
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' }
    })

    if (!settings) {
      return {
        ...result,
        success: true, // No settings to migrate
        skipped: [{ field: 'settings', label: 'Site Settings', reason: 'No settings found' }]
      }
    }

    const updates: Record<string, string | null> = {}

    for (const { field, label } of ENCRYPTABLE_FIELDS) {
      try {
        const value = settings[field as keyof typeof settings] as string | null

        // Skip if null/empty
        if (!value) {
          result.skipped.push({ field, label, reason: 'No value set' })
          continue
        }

        // Skip if already encrypted with current key
        if (value.startsWith('enc:')) {
          result.skipped.push({ field, label, reason: 'Already encrypted' })
          continue
        }

        // Get raw value (removing 'plain:' prefix if present)
        const rawValue = getRawValue(value)
        
        if (!rawValue) {
          result.skipped.push({ field, label, reason: 'Empty after processing' })
          continue
        }

        // Encrypt the value
        const encrypted = encrypt(rawValue)
        
        if (encrypted) {
          updates[field] = encrypted
          result.migrated.push({ field, label })
        } else {
          result.failed.push({ field, label, error: 'Encryption returned null' })
        }
      } catch (error) {
        result.failed.push({ 
          field, 
          label, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    // Apply updates if any migrations occurred
    if (Object.keys(updates).length > 0) {
      await prisma.siteSettings.update({
        where: { id: 'singleton' },
        data: updates
      })
    }

    result.success = result.failed.length === 0
    return result

  } catch (error) {
    return {
      ...result,
      success: false,
      failed: [{ 
        field: 'database', 
        label: 'Database', 
        error: error instanceof Error ? error.message : 'Database error' 
      }]
    }
  }
}

/**
 * Check if there are any unencrypted sensitive values that could be migrated
 */
export async function hasUnencryptedData(): Promise<boolean> {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' }
    })

    if (!settings) return false

    return ENCRYPTABLE_FIELDS.some(({ field }) => {
      const value = settings[field as keyof typeof settings] as string | null
      // Has unencrypted data if there's a value that's not encrypted
      return value && !value.startsWith('enc:') && !value.startsWith('plain:')
    })
  } catch {
    return false
  }
}

/**
 * Get a summary of encryption status for all sensitive fields
 */
export async function getEncryptionStatus(): Promise<{
  field: string
  label: string
  status: 'encrypted' | 'plain' | 'legacy' | 'empty'
  value: string | null
}[]> {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' }
    })

    if (!settings) return []

    return ENCRYPTABLE_FIELDS.map(({ field, label }) => {
      const value = settings[field as keyof typeof settings] as string | null
      
      let status: 'encrypted' | 'plain' | 'legacy' | 'empty' = 'empty'
      
      if (!value) {
        status = 'empty'
      } else if (value.startsWith('enc:')) {
        status = 'encrypted'
      } else if (value.startsWith('plain:')) {
        status = 'plain'
      } else {
        status = 'legacy'
      }

      // For display purposes, mask the actual value
      const displayValue = value 
        ? `${value.substring(0, 10)}... (${value.length} chars)` 
        : null

      return { field, label, status, value: displayValue }
    })
  } catch {
    return []
  }
}
