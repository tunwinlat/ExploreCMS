/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose'
import { cookies } from 'next/headers'

const getSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is not set. This is a critical security risk.')
    }
    // Fallback for development/testing only
    return new TextEncoder().encode('explore-cms-development-secret-only')
  }
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
