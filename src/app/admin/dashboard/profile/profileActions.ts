/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { sendEmail, getVerificationEmailHtml } from '@/lib/email'
import { headers } from 'next/headers'
import { checkRateLimit, getClientIPFromHeaders, RATE_LIMITS } from '@/lib/rateLimit'

export async function updateUserProfile(formData: FormData) {
  const session = await verifySession()
  if (!session) return { error: 'Unauthorized' }

  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const password = formData.get('password') as string
  const email = (formData.get('email') as string)?.trim().toLowerCase() || null

  try {
    const updateData: Record<string, unknown> = {
      firstName: firstName || null,
      lastName: lastName || null,
    }

    // Handle email change
    const userId = (session as { userId: string }).userId
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true }
    })

    if (email !== currentUser?.email) {
      // Email changed — validate uniqueness and reset verification
      if (email) {
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing && existing.id !== userId) {
          return { error: 'This email address is already in use.' }
        }
        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          return { error: 'Please enter a valid email address.' }
        }
      }
      updateData.email = email
      updateData.emailVerified = false
      updateData.emailVerificationToken = null
      updateData.emailVerificationExpiry = null
    }

    if (password) {
      if (password.length < 8) {
        return { error: 'Password must be at least 8 characters' }
      }
      const hashedPassword = await bcrypt.hash(password, 10)
      updateData.password = hashedPassword
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    })
    revalidatePath('/admin/dashboard/profile')
    revalidatePath('/')
    return { success: true, emailChanged: email !== currentUser?.email }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { error: 'Failed to update profile' }
  }
}

export async function sendVerificationEmail() {
  const headersList = await headers()
  const clientIP = getClientIPFromHeaders(headersList)

  const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.auth)
  if (!rateLimit.success) {
    return { error: 'Too many requests. Please try again later.' }
  }

  const session = await verifySession()
  if (!session) return { error: 'Unauthorized' }

  const userId = (session as { userId: string }).userId

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true, username: true }
    })

    if (!user?.email) return { error: 'No email address on file.' }
    if (user.emailVerified) return { error: 'Email is already verified.' }

    // Generate a secure random token
    const token = randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationExpiry: expiry,
      }
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const verifyUrl = `${baseUrl}/api/verify-email?token=${token}`

    const result = await sendEmail({
      to: user.email,
      subject: 'Verify your email address — ExploreCMS',
      html: getVerificationEmailHtml(user.username, verifyUrl),
    })

    if (!result.success) {
      return { error: result.error || 'Failed to send verification email.' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending verification email:', error)
    return { error: 'Failed to send verification email.' }
  }
}
