/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import { prisma as localPrisma } from './db'

/**
 * Dynamically resolves the correct Prisma instance based on the SiteSettings configuration.
 * Always retrieves the most up-to-date configuration, so toggles in the Admin panel apply instantly.
 */
export async function getPostDb(): Promise<PrismaClient> {
  // Always query the local sqlite database for the single source-of-truth configuration
  const settings = await localPrisma.siteSettings.findUnique({
    where: { id: 'singleton' }
  })

  // If Bunny DB is disabled, or missing creds, safely fallback to local sqlite
  if (!settings?.bunnyEnabled || !settings?.bunnyUrl || !settings?.bunnyToken) {
    return localPrisma
  }

  // Instantiate the Edge LibSQL Client
  const libsql = createClient({
    url: settings.bunnyUrl,
    authToken: settings.bunnyToken
  })

  // Bridge the LibSQL Socket over to Prisma's Native Query Engine
  const adapter = new PrismaLibSql(libsql as any)
  
  // Polyfill env for Prisma schema parser when using adapters in Server Actions
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:./dev.db"
  }
  
  const remotePrisma = new PrismaClient({ adapter })

  return remotePrisma
}
