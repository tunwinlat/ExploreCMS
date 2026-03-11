import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (path.startsWith('/admin/dashboard')) {
    const session = request.cookies.get('session')?.value
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'explore-cms-super-secret-key-that-should-be-changed')
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
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'explore-cms-super-secret-key-that-should-be-changed')
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
