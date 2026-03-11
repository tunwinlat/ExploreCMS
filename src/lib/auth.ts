import { SignJWT, jwtVerify, JWTPayload } from 'jose'
import { cookies } from 'next/headers'

const getSecret = () => {
  const secret = process.env.JWT_SECRET || 'explore-cms-super-secret-key-that-should-be-changed'
  return new TextEncoder().encode(secret)
}

export async function createSession(payload: JWTPayload) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getSecret())

  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function verifySession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  
  if (!sessionCookie) return null
  
  try {
    const { payload } = await jwtVerify(sessionCookie, getSecret())
    return payload
  } catch (error) {
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}
