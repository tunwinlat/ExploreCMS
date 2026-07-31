import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { encrypt, decrypt, isEncryptionEnabled } from './crypto'

describe('Crypto Library', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('isEncryptionEnabled', () => {
    it('returns true when ENCRYPTION_KEY is set', () => {
      process.env.ENCRYPTION_KEY = 'test-key-123'
      expect(isEncryptionEnabled()).toBe(true)
    })

    it('returns false when ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY
      expect(isEncryptionEnabled()).toBe(false)
    })
  })

  describe('encrypt', () => {
    it('throws an error when ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY
      expect(() => encrypt('sensitive-data')).toThrowError(
        'Encryption failed: ENCRYPTION_KEY environment variable is not set'
      )
    })

    it('returns null for empty input', () => {
      process.env.ENCRYPTION_KEY = 'test-key-123'
      expect(encrypt(null)).toBeNull()
      expect(encrypt('')).toBeNull()
      expect(encrypt(undefined)).toBeNull()
    })

    it('successfully encrypts data when key is provided', () => {
      process.env.ENCRYPTION_KEY = 'test-key-123'
      const encrypted = encrypt('sensitive-data')

      expect(encrypted).not.toBeNull()
      expect(encrypted?.startsWith('enc:')).toBe(true)
    })
  })

  describe('decrypt', () => {
    it('successfully decrypts encrypted data', () => {
      process.env.ENCRYPTION_KEY = 'test-key-123'
      const originalText = 'my-secret-password-123'

      const encrypted = encrypt(originalText)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(originalText)
    })

    it('handles legacy plain text data with warning but returns null if no key to verify it is NOT plain text check (actually it returns the legacy data if no enc: prefix)', () => {
      const legacyData = 'just-some-data'
      expect(decrypt(legacyData)).toBe(legacyData)
    })

    it('correctly handles plain: prefixed data', () => {
       expect(decrypt('plain:my-secret-data')).toBe('my-secret-data')
    })

    it('returns null for null/empty input', () => {
        expect(decrypt(null)).toBeNull()
        expect(decrypt('')).toBeNull()
        expect(decrypt(undefined)).toBeNull()
    })
  })
})
