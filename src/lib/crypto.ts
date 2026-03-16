/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Simple encryption/decryption for sensitive data stored in the database.
 * Uses AES-256-GCM via Node.js crypto module.
 * 
 * NOTE: The encryption key must be set via ENCRYPTION_KEY environment variable.
 * If not set, tokens will be stored in plain text (not recommended for production).
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32

function getKey(): Buffer | null {
  const encryptionKey = process.env.ENCRYPTION_KEY
  if (!encryptionKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Crypto] Warning: ENCRYPTION_KEY not set. Sensitive data will be stored in plain text.')
    }
    return null
  }
  // Derive a 32-byte key from the provided key using scrypt
  return scryptSync(encryptionKey, 'explore-cms-salt', 32)
}

/**
 * Encrypt sensitive data.
 * Returns the encrypted string in format: salt:iv:authTag:ciphertext (base64 encoded)
 * Returns plain text if encryption key is not set.
 */
export function encrypt(text: string | null | undefined): string | null {
  if (!text) return null
  
  const key = getKey()
  if (!key) {
    // No encryption key configured, store as plain text with a prefix
    return `plain:${text}`
  }

  try {
    const salt = randomBytes(SALT_LENGTH)
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    
    const authTag = cipher.getAuthTag()
    
    // Combine all components: salt:iv:authTag:encrypted
    const result = `${salt.toString('base64')}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
    return `enc:${result}`
  } catch (error) {
    console.error('[Crypto] Encryption failed:', error)
    return null
  }
}

/**
 * Decrypt encrypted data.
 * Handles both encrypted (enc:) and plain text (plain:) formats.
 */
export function decrypt(encryptedData: string | null | undefined): string | null {
  if (!encryptedData) return null
  
  // Check if it's plain text
  if (encryptedData.startsWith('plain:')) {
    return encryptedData.slice(6)
  }
  
  // Check if it's encrypted
  if (!encryptedData.startsWith('enc:')) {
    // Legacy data without prefix - return as-is
    return encryptedData
  }
  
  const key = getKey()
  if (!key) {
    console.warn('[Crypto] Cannot decrypt: ENCRYPTION_KEY not set')
    return null
  }

  try {
    const data = encryptedData.slice(4) // Remove 'enc:' prefix
    const parts = data.split(':')
    
    if (parts.length !== 4) {
      console.error('[Crypto] Invalid encrypted data format')
      return null
    }
    
    const [saltB64, ivB64, authTagB64, encrypted] = parts
    
    const salt = Buffer.from(saltB64, 'base64')
    const iv = Buffer.from(ivB64, 'base64')
    const authTag = Buffer.from(authTagB64, 'base64')
    
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error)
    return null
  }
}

/**
 * Check if encryption is properly configured.
 */
export function isEncryptionEnabled(): boolean {
  return !!process.env.ENCRYPTION_KEY
}
