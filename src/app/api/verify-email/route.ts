/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/admin/dashboard/profile?verified=invalid', request.url))
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiry: { gt: new Date() }
      }
    })

    if (!user) {
      // Token not found or expired
      const baseUrl = new URL(request.url).origin
      return NextResponse.redirect(`${baseUrl}/admin/dashboard/profile?verified=invalid`)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      }
    })

    const baseUrl = new URL(request.url).origin
    return NextResponse.redirect(`${baseUrl}/admin/dashboard/profile?verified=success`)
  } catch (error) {
    console.error('[verify-email] Error:', error)
    const baseUrl = new URL(request.url).origin
    return NextResponse.redirect(`${baseUrl}/admin/dashboard/profile?verified=error`)
  }
}

export const runtime = 'edge';
