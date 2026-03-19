/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Email sending library for ExploreCMS.
 * Supports Resend.com API and custom SMTP via nodemailer.
 */

import nodemailer from 'nodemailer'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'

type EmailOptions = {
  to: string
  subject: string
  html: string
}

type EmailResult = {
  success: boolean
  error?: string
}

async function getEmailSettings() {
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
  return settings
}

async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string
): Promise<EmailResult> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    })
    const data = await res.json() as { id?: string; statusCode?: number; message?: string; name?: string }
    if (!res.ok) {
      return { success: false, error: data.message || `Resend error: ${res.status}` }
    }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Resend send failed' }
  }
}

async function sendViaSMTP(
  host: string,
  port: number,
  secure: boolean,
  user: string | null,
  password: string | null,
  from: string,
  to: string,
  subject: string,
  html: string
): Promise<EmailResult> {
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && password ? { user, pass: password } : undefined,
    })

    await transporter.sendMail({ from, to, subject, html })
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'SMTP send failed' }
  }
}

/**
 * Send an email using the configured provider (Resend or SMTP).
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const settings = await getEmailSettings()

  if (!settings?.emailProvider) {
    return { success: false, error: 'No email provider configured. Please configure email in Integrations settings.' }
  }

  const fromAddress = settings.emailFromAddress
  if (!fromAddress) {
    return { success: false, error: 'No sender email address configured.' }
  }

  const fromName = settings.emailFromName
  const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress

  if (settings.emailProvider === 'resend') {
    const rawKey = settings.resendApiKey
    if (!rawKey) return { success: false, error: 'Resend API key not configured.' }
    const apiKey = decrypt(rawKey) || rawKey
    return sendViaResend(apiKey, from, options.to, options.subject, options.html)
  }

  if (settings.emailProvider === 'smtp') {
    if (!settings.smtpHost) return { success: false, error: 'SMTP host not configured.' }
    const rawPass = settings.smtpPassword
    const password = rawPass ? (decrypt(rawPass) || rawPass) : null
    return sendViaSMTP(
      settings.smtpHost,
      settings.smtpPort ?? 587,
      settings.smtpSecure ?? false,
      settings.smtpUser || null,
      password,
      from,
      options.to,
      options.subject,
      options.html
    )
  }

  return { success: false, error: `Unknown email provider: ${settings.emailProvider}` }
}

// ─────────────────────────────────────────────
// Email Templates
// ─────────────────────────────────────────────

export function getVerificationEmailHtml(username: string, verifyUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#1a1d27;border-radius:12px;border:1px solid #2a2d3a;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 24px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">ExploreCMS</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Email Verification</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#e2e8f0;font-size:16px;">Hi <strong>${username}</strong>,</p>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Please verify your email address to enable email notifications and password recovery for your ExploreCMS account.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                  Verify Email Address
                </a>
              </div>
              <p style="margin:0 0 8px;color:#64748b;font-size:13px;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;color:#6366f1;font-size:12px;">${verifyUrl}</p>
              <hr style="border:none;border-top:1px solid #2a2d3a;margin:24px 0;">
              <p style="margin:0;color:#475569;font-size:12px;">
                This link expires in <strong>24 hours</strong>. If you did not request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function getPasswordResetEmailHtml(username: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#1a1d27;border-radius:12px;border:1px solid #2a2d3a;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 24px;background:linear-gradient(135deg,#f59e0b 0%,#ef4444 100%);">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">ExploreCMS</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Password Reset Request</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#e2e8f0;font-size:16px;">Hi <strong>${username}</strong>,</p>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                We received a request to reset the password for your ExploreCMS account. Click the button below to create a new password.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b 0%,#ef4444 100%);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                  Reset Password
                </a>
              </div>
              <p style="margin:0 0 8px;color:#64748b;font-size:13px;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;color:#f59e0b;font-size:12px;">${resetUrl}</p>
              <hr style="border:none;border-top:1px solid #2a2d3a;margin:24px 0;">
              <p style="margin:0;color:#475569;font-size:12px;">
                This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
