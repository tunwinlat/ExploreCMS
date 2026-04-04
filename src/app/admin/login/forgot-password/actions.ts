/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'
import { sendEmail, getPasswordResetEmailHtml } from '@/lib/email'
import { headers } from 'next/headers'
import { checkRateLimit, RATE_LIMITS, getClientIPFromHeaders } from '@/lib/rateLimit'

export async function requestPasswordReset(formData: FormData) {
  // Rate limiting
  const headersList = await headers()
  const clientIP = getClientIPFromHeaders(headersList)

  const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.auth)
  if (!rateLimit.success) {
    return { error: 'Too many requests. Please try again later.' }
  }

  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email) return { error: 'Email address is required.' }

  // Always return generic success to prevent email enumeration attacks
  const genericSuccess = { success: true }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, username: true, email: true, emailVerified: true }
    })

    // Don't reveal if email exists or is unverified
    if (!user || !user.emailVerified || !user.email) {
      return genericSuccess
    }

    const token = randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpiry: expiry,
      }
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/admin/reset-password?token=${token}`

    await sendEmail({
      to: user.email,
      subject: 'Reset your password — ExploreCMS',
      html: getPasswordResetEmailHtml(user.username, resetUrl),
    })

    return genericSuccess
  } catch (error) {
    console.error('[requestPasswordReset] Error:', error)
    // Still return success to prevent info leakage
    return genericSuccess
  }
}
