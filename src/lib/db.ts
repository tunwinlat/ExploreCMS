/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL
  
  if (!url) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Please set it to your LibSQL database URL (e.g., from Turso or Bunny.net). ' +
      'For local development, use: DATABASE_URL="file:./dev.db"'
    )
  }
  
  const adapter = new PrismaLibSql({ url })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

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
