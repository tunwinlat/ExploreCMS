/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { prisma as localPrisma } from './db'

/**
 * Cached remote PrismaClient to avoid creating a new connection on every request.
 * Invalidated when the configured URL changes (e.g., user switches Bunny DBs).
 */
let cachedRemotePrisma: PrismaClient | null = null
let cachedRemoteUrl: string | null = null

/**
 * Dynamically resolves the correct Prisma instance based on the SiteSettings configuration.
 * Always retrieves the most up-to-date configuration, so toggles in the Admin panel apply instantly.
 * 
 * Returns a cached client when the remote URL hasn't changed to improve performance.
 */
export async function getPostDb(): Promise<PrismaClient> {
  // Always query the local sqlite database for the single source-of-truth configuration
  const settings = await (localPrisma as any).siteSettings.findUnique({
    where: { id: 'singleton' }
  })

  // If Bunny DB is disabled, or missing creds, safely fallback to local sqlite
  if (!settings?.bunnyEnabled || !settings?.bunnyUrl || !settings?.bunnyToken) {
    // Clear cache when disconnected
    cachedRemotePrisma = null
    cachedRemoteUrl = null
    return localPrisma
  }

  // Return cached client if the URL hasn't changed
  if (cachedRemotePrisma && cachedRemoteUrl === settings.bunnyUrl) {
    return cachedRemotePrisma
  }

  // Bridge the LibSQL Socket over to Prisma's Native Query Engine
  const adapter = new PrismaLibSQL({ url: settings.bunnyUrl, authToken: settings.bunnyToken })
  
  const remotePrisma = new PrismaClient({ adapter })

  // Cache the new client
  cachedRemotePrisma = remotePrisma
  cachedRemoteUrl = settings.bunnyUrl

  return remotePrisma
}
