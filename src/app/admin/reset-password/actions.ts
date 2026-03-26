/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { headers } from 'next/headers'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

export async function resetPassword(formData: FormData) {
  // Rate limiting
  const headersList = await headers()
  const forwardedFor = headersList.get('x-forwarded-for')
  const realIP = headersList.get('x-real-ip')
  const cfIP = headersList.get('cf-connecting-ip')

  let clientIP = 'unknown'
  if (forwardedFor) {
    clientIP = forwardedFor.split(',')[0].trim()
  } else if (realIP) {
    clientIP = realIP
  } else if (cfIP) {
    clientIP = cfIP
  }

  const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.auth)
  if (!rateLimit.success) {
    return { error: 'Too many requests. Please try again later.' }
  }

  const token = formData.get('token') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!token) return { error: 'Invalid or missing reset token.' }
  if (!password) return { error: 'Password is required.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }
  if (password !== confirmPassword) return { error: 'Passwords do not match.' }

  try {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() }
      }
    })

    if (!user) {
      return { error: 'This reset link has expired or is invalid. Please request a new one.' }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      }
    })

    return { success: true }
  } catch (error) {
    console.error('[resetPassword] Error:', error)
    return { error: 'Failed to reset password. Please try again.' }
  }
}

export async function validateResetToken(token: string) {
  if (!token) return { valid: false }

  try {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() }
      },
      select: { id: true, username: true }
    })

    if (!user) return { valid: false }
    return { valid: true, username: user.username }
  } catch {
    return { valid: false }
  }
}
