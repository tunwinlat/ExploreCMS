import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifySession } from './auth'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('jose', async (importOriginal) => {
  const mod = await importOriginal<typeof import('jose')>()
  return {
    ...mod,
    jwtVerify: vi.fn(),
  }
})

describe('verifySession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret'
  })

  it('should return null if no session cookie is present', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any)

    const result = await verifySession()

    expect(result).toBeNull()
    expect(cookies).toHaveBeenCalled()
    expect(jwtVerify).not.toHaveBeenCalled()
  })

  it('should return null if token verification throws an error', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'invalid-token' }),
    } as any)

    vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid token'))

    const result = await verifySession()

    expect(result).toBeNull()
    expect(cookies).toHaveBeenCalled()
    expect(jwtVerify).toHaveBeenCalledWith(
      'invalid-token',
      expect.any(Uint8Array)
    )
  })

  it('should return the payload if token verification succeeds', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'valid-token' }),
    } as any)

    const mockPayload = { userId: 123 }
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: mockPayload,
      protectedHeader: { alg: 'HS256' },
    } as any)

    const result = await verifySession()

    expect(result).toEqual(mockPayload)
    expect(cookies).toHaveBeenCalled()
    expect(jwtVerify).toHaveBeenCalledWith(
      'valid-token',
      expect.any(Uint8Array)
    )
  })
})
