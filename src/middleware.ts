/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

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

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (path.startsWith('/admin/dashboard')) {
    const session = request.cookies.get('session')?.value
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    try {
      const secret = getSecret()
      await jwtVerify(session, secret)
      return NextResponse.next()
    } catch (e) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  if (path === '/admin/login' || path === '/admin') {
    const session = request.cookies.get('session')?.value
    if (session) {
      try {
        const secret = getSecret()
        await jwtVerify(session, secret)
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      } catch (e) {}
    }

    // Redirect /admin directly to /admin/dashboard or login
    if (path === '/admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
