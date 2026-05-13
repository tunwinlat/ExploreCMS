/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // During Next.js build time in CI environments (like CF Pages), DATABASE_URL may be missing.
  // We provide a dummy fallback URL so that static prerendering succeeds and builds don't crash.
  // We use libsql:// rather than file: to avoid URL_SCHEME_NOT_SUPPORTED errors in Edge runtimes.
  // In production runtime, this will be safely overridden by bindings.
  const url = process.env.DATABASE_URL || 'libsql://dummy.turso.io'
  const authToken = process.env.DATABASE_AUTH_TOKEN
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Prisma] DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set (using fallback)')
    console.log('[Prisma] DATABASE_AUTH_TOKEN:', authToken ? 'Set' : 'Not set')
  }
  
  // Configure adapter with or without auth token
  const adapterConfig: { url: string; authToken?: string } = { url }
  if (authToken) {
    adapterConfig.authToken = authToken
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Prisma] Creating client with URL:', url.substring(0, 20) + '...')
  }
  
  const adapter = new PrismaLibSQL(adapterConfig)
  return new PrismaClient({ adapter })
}

// In serverless environments, create a new client for each request if needed
// Use globalThis to persist across hot reloads in development
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Helper to get a fresh Prisma instance (useful for server actions)
export function getPrismaClient() {
  // Always create a new client in production/serverless to ensure env vars are fresh
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return createPrismaClient()
  }
  return prisma
}

/**
 * Check if the database is properly configured and accessible.
 * Returns true if DATABASE_URL is set and database is reachable.
 */
export async function isDatabaseConfigured(): Promise<boolean> {
  const url = process.env.DATABASE_URL
  if (!url) return false

  try {
    // Try a simple query to verify connection
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

