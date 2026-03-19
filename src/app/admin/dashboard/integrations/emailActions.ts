/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/crypto'
import { sendEmail } from '@/lib/email'

type EmailProvider = 'resend' | 'smtp' | null

type SaveEmailSettingsInput = {
  provider: EmailProvider
  fromName: string
  fromAddress: string
  resendApiKey: string
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPassword: string
}

export async function saveEmailSettings(input: SaveEmailSettingsInput) {
  const session = await verifySession()
  if (!session) return { error: 'Unauthorized' }
  if ((session as { role: string }).role !== 'OWNER') return { error: 'Permission denied' }

  try {
    // Only encrypt non-empty secrets
    const encryptedResendKey = input.resendApiKey ? encrypt(input.resendApiKey) : null
    const encryptedSmtpPassword = input.smtpPassword ? encrypt(input.smtpPassword) : null

    await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        emailProvider: input.provider,
        emailFromName: input.fromName || null,
        emailFromAddress: input.fromAddress || null,
        resendApiKey: encryptedResendKey,
        smtpHost: input.smtpHost || null,
        smtpPort: input.smtpPort || 587,
        smtpSecure: input.smtpSecure,
        smtpUser: input.smtpUser || null,
        smtpPassword: encryptedSmtpPassword,
      },
      update: {
        emailProvider: input.provider,
        emailFromName: input.fromName || null,
        emailFromAddress: input.fromAddress || null,
        resendApiKey: encryptedResendKey,
        smtpHost: input.smtpHost || null,
        smtpPort: input.smtpPort || 587,
        smtpSecure: input.smtpSecure,
        smtpUser: input.smtpUser || null,
        smtpPassword: encryptedSmtpPassword,
      }
    })

    return { success: true }
  } catch (error) {
    console.error('[saveEmailSettings]', error)
    return { error: 'Failed to save email settings.' }
  }
}

export async function testEmailSettings(testTo: string) {
  const session = await verifySession()
  if (!session) return { error: 'Unauthorized' }
  if ((session as { role: string }).role !== 'OWNER') return { error: 'Permission denied' }

  if (!testTo) return { error: 'Test recipient email is required.' }

  const result = await sendEmail({
    to: testTo,
    subject: 'Test Email — ExploreCMS',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><title>Test Email</title></head>
      <body style="margin:0;padding:40px 16px;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:560px;margin:0 auto;background:#1a1d27;border-radius:12px;border:1px solid #2a2d3a;overflow:hidden;">
          <div style="padding:32px 40px 24px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">ExploreCMS</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Email Test</p>
          </div>
          <div style="padding:40px;">
            <p style="margin:0 0 16px;color:#e2e8f0;font-size:16px;">✅ Your email configuration is working!</p>
            <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.6;">
              This is a test email sent from ExploreCMS to confirm your email provider is properly configured.
              You can now use email features like verification and password reset.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  })

  return result
}

export async function getEmailSettings() {
  const session = await verifySession()
  if (!session) return { error: 'Unauthorized' }

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      emailProvider: true,
      emailFromName: true,
      emailFromAddress: true,
      resendApiKey: true,
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUser: true,
      smtpPassword: true,
    }
  })

  if (!settings) return { settings: null }

  // Decrypt for display (show masked value indicator)
  return {
    settings: {
      ...settings,
      resendApiKey: settings.resendApiKey ? (decrypt(settings.resendApiKey) || '') : '',
      smtpPassword: settings.smtpPassword ? (decrypt(settings.smtpPassword) || '') : '',
    }
  }
}
