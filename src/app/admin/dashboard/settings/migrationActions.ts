/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma as sourcePrisma } from '@/lib/db'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import { syncRemoteSchema } from '@/lib/schemaSyncer'
import { getEncryptionStatus, getRawFieldValues, migrateToEncryption } from '@/lib/encryption-migration'

/**
 * Get encryption status for all sensitive fields
 */
export async function getEncryptionStatusAction() {
  const session = await verifySession()
  if (session?.role !== 'OWNER') return { success: false, error: 'Unauthorized' }
  
  try {
    const status = await getEncryptionStatus()
    const rawValues = await getRawFieldValues()
    return { success: true, status, rawValues }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Run encryption migration for all legacy/plain fields
 */
export async function runEncryptionMigration() {
  const session = await verifySession()
  if (session?.role !== 'OWNER') return { success: false, error: 'Unauthorized' }
  
  try {
    const result = await migrateToEncryption()
    return { success: true, result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export interface MigrationResult {
  success: boolean
  error?: string
  stats?: {
    users: number
    tags: number
    posts: number
    postViews: number
    siteSettings: boolean
    popupConfig: boolean
    siteAnalytics: boolean
  }
}

/**
 * Test connection to a target LibSQL database
 */
export async function testTargetConnection(url: string, authToken?: string) {
  const session = await verifySession()
  if (session?.role !== 'OWNER') return { success: false, error: 'Unauthorized' }

  if (!url) return { success: false, error: 'URL is required' }

  // Normalize URL
  let safeUrl = url.trim()
  if (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://') && !safeUrl.startsWith('libsql://') && !safeUrl.startsWith('ws://') && !safeUrl.startsWith('wss://')) {
    safeUrl = `https://${safeUrl}`
  }

  try {
    const client = createClient({
      url: safeUrl,
      authToken: authToken || undefined,
    })

    // Test connection
    await client.execute('SELECT 1')

    // Check if tables exist
    const tablesResult = await client.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='User'",
      args: []
    })

    const hasTables = tablesResult.rows.length > 0

    return { 
      success: true, 
      hasTables,
      message: hasTables 
        ? 'Connected to existing database with tables' 
        : 'Connected to empty database - ready for migration'
    }
  } catch (error: any) {
    console.error('[Migration] Connection test failed:', error)
    return { 
      success: false, 
      error: 'Connection failed: ' + (error.message || 'Unknown error')
    }
  }
}

/**
 * Migrate data from current database to target LibSQL database
 */
export async function migrateToTarget(url: string, authToken?: string): Promise<MigrationResult> {
  const session = await verifySession()
  if (session?.role !== 'OWNER') return { success: false, error: 'Unauthorized' }

  if (!url) return { success: false, error: 'URL is required' }

  // Normalize URL
  let safeUrl = url.trim()
  if (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://') && !safeUrl.startsWith('libsql://') && !safeUrl.startsWith('ws://') && !safeUrl.startsWith('wss://')) {
    safeUrl = `https://${safeUrl}`
  }

  try {
    console.log('[Migration] Starting migration to:', safeUrl)

    // Create target client
    const targetClient = createClient({
      url: safeUrl,
      authToken: authToken || undefined,
    })

    // Sync schema first
    console.log('[Migration] Syncing schema...')
    try {
      const syncResult = await syncRemoteSchema(targetClient)
      console.log(`[Migration] Schema sync: ${syncResult.tablesCreated.length} tables created`)
    } catch (schemaErr: any) {
      console.warn('[Migration] Schema sync warning:', schemaErr.message)
      // Continue anyway - tables might already exist
    }

    // Create Prisma client for target
    const adapterConfig: { url: string; authToken?: string } = { url: safeUrl }
    if (authToken) {
      adapterConfig.authToken = authToken
    }
    
    const targetPrisma = new PrismaClient({ 
      adapter: new PrismaLibSql(adapterConfig)
    })

    // Fetch all data from source
    console.log('[Migration] Fetching data from source database...')
    const source = sourcePrisma as any
    const [
      users,
      tags,
      posts,
      postViews,
      siteSettings,
      popupConfig,
      siteAnalytics
    ] = await Promise.all([
      source.user.findMany(),
      source.tag.findMany(),
      source.post.findMany(),
      source.postView.findMany(),
      source.siteSettings.findUnique({ where: { id: 'singleton' } }),
      source.popupConfig.findUnique({ where: { id: 'singleton' } }),
      source.siteAnalytics.findUnique({ where: { id: 'singleton' } })
    ])

    console.log(`[Migration] Found: ${users.length} users, ${tags.length} tags, ${posts.length} posts, ${postViews.length} post views`)

    // Migrate to target
    const target = targetPrisma as any

    // Migrate users
    if (users.length > 0) {
      await target.$transaction(
        users.map((u: any) => target.user.upsert({
          where: { id: u.id },
          create: u,
          update: u
        }))
      )
    }

    // Migrate tags
    if (tags.length > 0) {
      await target.$transaction(
        tags.map((t: any) => target.tag.upsert({
          where: { id: t.id },
          create: t,
          update: t
        }))
      )
    }

    // Migrate posts
    if (posts.length > 0) {
      await target.$transaction(
        posts.map((p: any) => target.post.upsert({
          where: { id: p.id },
          create: p,
          update: p
        }))
      )
    }

    // Migrate post views
    if (postViews.length > 0) {
      await target.$transaction(
        postViews.map((v: any) => target.postView.upsert({
          where: { id: v.id },
          create: v,
          update: v
        }))
      )
    }

    // Migrate singleton tables
    if (siteSettings) {
      await target.siteSettings.upsert({
        where: { id: 'singleton' },
        create: siteSettings,
        update: siteSettings
      })
    }

    if (popupConfig) {
      await target.popupConfig.upsert({
        where: { id: 'singleton' },
        create: popupConfig,
        update: popupConfig
      })
    }

    if (siteAnalytics) {
      await target.siteAnalytics.upsert({
        where: { id: 'singleton' },
        create: siteAnalytics,
        update: siteAnalytics
      })
    }

    console.log('[Migration] Migration complete!')

    return {
      success: true,
      stats: {
        users: users.length,
        tags: tags.length,
        posts: posts.length,
        postViews: postViews.length,
        siteSettings: !!siteSettings,
        popupConfig: !!popupConfig,
        siteAnalytics: !!siteAnalytics
      }
    }
  } catch (error: any) {
    console.error('[Migration] Migration failed:', error)
    return {
      success: false,
      error: 'Migration failed: ' + (error.message || 'Unknown error')
    }
  }
}
