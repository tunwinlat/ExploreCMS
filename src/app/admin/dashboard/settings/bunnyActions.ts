/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma as localPrisma } from '@/lib/db'
import { PrismaClient } from '@prisma/client'
// package export is PrismaLibSQL (lowercase q) not PrismaLibSQL
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import { syncRemoteSchema } from '@/lib/schemaSyncer'
import { encrypt, decrypt } from '@/lib/crypto'

/**
 * Validates the Bunny connection and triggers a full upward Migration (Local -> Remote)
 */
export async function connectBunnyDb(url: string, token: string) {
  const session = await verifySession()
  if (session?.role !== 'OWNER') return { success: false, error: 'Unauthorized' }
  
  if (!url || !token) return { success: false, error: 'URL and Token are required' }
  
  // Guarantee a protocol layout to prevent LibSQL URL_INVALID parsing crashes
  let safeUrl = url.trim()
  if (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://') && !safeUrl.startsWith('libsql://') && !safeUrl.startsWith('ws://') && !safeUrl.startsWith('wss://')) {
    safeUrl = `https://${safeUrl}`
  }

  try {
    // 1. Temporarily construct a direct remote client to push the Schema and test connectivity
    console.log("Testing Bunny DB connection...")
    
    
    // Note: Schema sync is handled by syncRemoteSchema() which introspects the remote DB
    // and applies only missing tables/columns, preserving existing data.
    
    
    const remotePrisma = new PrismaClient({ adapter: new PrismaLibSQL({ url: safeUrl, authToken: token }) })
    
    // Verify connection by creating a dummy table or running a raw query
    await remotePrisma.$queryRaw`SELECT 1;`

    try {
      console.log("Synchronizing remote schema (incremental migration)...")
      
      // Use introspection-based syncer: detects missing tables/columns and applies
      // only the delta, preserving all existing data on the remote DB.
      const libsql = createClient({ url: safeUrl, authToken: token })
      const syncResult = await syncRemoteSchema(libsql)
      console.log(`Schema sync complete: ${syncResult.tablesCreated.length} tables created, ${syncResult.columnsAdded.length} columns added.`)
    } catch(pushErr) {
      console.warn("Schema synchronization failed or generated an exception:", pushErr)
    }

    console.log("Migrating data UPWARD (Local -> Remote Bunny DB)...")

    // 2. Read all local content
    const db = localPrisma as any
    const remote = remotePrisma as any
    // ⚡ Bolt: Parallelize independent DB queries to avoid waterfalling
    const [users, tags, posts, views] = await Promise.all([
      db.user.findMany(),
      db.tag.findMany(),
      db.post.findMany(),
      db.postView.findMany()
    ])

    // 3. Push to Remote Bunny Database using batch transactions
    await remote.$transaction([
      ...users.map((u: any) => remote.user.upsert({ where: { id: u.id }, create: u, update: u })),
      ...tags.map((t: any) => remote.tag.upsert({ where: { id: t.id }, create: t, update: t })),
      ...posts.map((p: any) => remote.post.upsert({ where: { id: p.id }, create: p, update: p })),
      ...views.map((v: any) => remote.postView.upsert({ where: { id: v.id }, create: v, update: v }))
    ])

    console.log("Migration complete!")

    // 4. Save settings locally to permanently route all traffic to Bunny (encrypt token)
    const encryptedToken = encrypt(token)
    await (localPrisma as any).siteSettings.update({
      where: { id: 'singleton' },
      data: { bunnyEnabled: true, bunnyUrl: safeUrl, bunnyToken: encryptedToken }
    })

    return { success: true }
  } catch (error: any) {
    console.error("Bunny Connection Error Detailed Stack:", JSON.stringify(error, null, 2))
    console.error("Stringified error Object:", String(error))
    return { success: false, error: 'Database Connection Failed: ' + (error.message || 'Unknown Error') }
  }
}

/**
 * Pulls all data down from Remote Bunny DB, merges it into Local SQLite, and disables the remote connection.
 */
export async function disconnectBunnyDb() {
  const session = await verifySession()
  if (session?.role !== 'OWNER') return { success: false, error: 'Unauthorized' }

  try {
    const settings = await (localPrisma as any).siteSettings.findUnique({ where: { id: 'singleton' } })
    if (!settings?.bunnyEnabled || !settings.bunnyUrl || !settings.bunnyToken) {
       return { success: true } // Already disconnected
    }

    // Decrypt the token before use
    const token = decrypt(settings.bunnyToken) || settings.bunnyToken
    const remotePrisma = new PrismaClient({ adapter: new PrismaLibSQL({ url: settings.bunnyUrl, authToken: token }) })
    
    // 1. Fetch Remote Data
    const remote = remotePrisma as any
    const db = localPrisma as any
    // ⚡ Bolt: Parallelize independent DB queries to avoid waterfalling
    const [users, tags, posts, views] = await Promise.all([
      remote.user.findMany(),
      remote.tag.findMany(),
      remote.post.findMany(),
      remote.postView.findMany()
    ])

    console.log("Migrating data DOWNWARD (Remote Bunny DB -> Local SQLite)...")

    // 2. Upsert it safely into Local SQLite
    await db.$transaction([
      ...users.map((u: any) => db.user.upsert({ where: { id: u.id }, create: u, update: u })),
      ...tags.map((t: any) => db.tag.upsert({ where: { id: t.id }, create: t, update: t })),
      ...posts.map((p: any) => db.post.upsert({ where: { id: p.id }, create: p, update: p })),
      ...views.map((v: any) => db.postView.upsert({ where: { id: v.id }, create: v, update: v }))
    ])

    // 3. Disable connection
    await (localPrisma as any).siteSettings.update({
      where: { id: 'singleton' },
      data: { bunnyEnabled: false }
    })

    return { success: true }
  } catch (error: any) {
    console.error("Bunny Disconnection Error:", error)
    return { success: false, error: 'Failed to extract data: ' + (error.message || 'Unknown Error') }
  }
}
