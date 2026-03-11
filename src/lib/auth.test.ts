import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSession, verifySession, destroySession } from './auth'
import { jwtVerify, SignJWT } from 'jose'

const mockSet = vi.fn()
const mockGet = vi.fn()
const mockDelete = vi.fn()

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    set: mockSet,
    get: mockGet,
    delete: mockDelete,
  })),
}))

describe('Auth Module', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-hs256'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('createSession', () => {
    it('should set a session cookie with the correct payload and options in development', async () => {
      process.env.NODE_ENV = 'development'

      const payload = { userId: '123' }
      await createSession(payload)

      expect(mockSet).toHaveBeenCalledTimes(1)

      const [name, token, options] = mockSet.mock.calls[0]

      expect(name).toBe('session')

      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'explore-cms-super-secret-key-that-should-be-changed')
      const { payload: decodedPayload } = await jwtVerify(token, secret)

      expect(decodedPayload.userId).toBe('123')
      expect(decodedPayload.exp).toBeDefined()
      expect(typeof decodedPayload.exp).toBe('number')

      expect(options.httpOnly).toBe(true)
      expect(options.secure).toBe(false)
      expect(options.sameSite).toBe('lax')
      expect(options.path).toBe('/')
      if (options.expires) {
        expect(options.expires).toBeInstanceOf(Date)
      }
    })

    it('should set secure flag to true in production environment', async () => {
      process.env.NODE_ENV = 'production'

      const payload = { userId: '123' }
      await createSession(payload)

      expect(mockSet).toHaveBeenCalledTimes(1)
      const [, , options] = mockSet.mock.calls[0]
      expect(options.secure).toBe(true)
    })
  })

  describe('verifySession', () => {
    it('should return null if no session cookie exists', async () => {
      mockGet.mockReturnValue(undefined)
      const result = await verifySession()
      expect(result).toBeNull()
      expect(mockGet).toHaveBeenCalledWith('session')
    })

    it('should return payload if a valid session cookie exists', async () => {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET)
      const validToken = await new SignJWT({ userId: '456' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(secret)

      mockGet.mockReturnValue({ value: validToken })

      const result = await verifySession()
      expect(result).not.toBeNull()
      expect(result?.userId).toBe('456')
    })

    it('should return null if session cookie is invalid', async () => {
      mockGet.mockReturnValue({ value: 'invalid-token' })
      const result = await verifySession()
      expect(result).toBeNull()
    })
  })

  describe('destroySession', () => {
    it('should call cookies().delete with session', async () => {
      await destroySession()
      expect(mockDelete).toHaveBeenCalledTimes(1)
      expect(mockDelete).toHaveBeenCalledWith('session')
    })
  })
})
