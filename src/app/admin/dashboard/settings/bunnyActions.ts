/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma as localPrisma } from '@/lib/db'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
    
    // We run Prisma db push natively utilizing the env override to force the schema onto remote
    const pushEnv = { ...process.env, DATABASE_URL: url }
    // Note: Since Prisma's adapter-enabled push is still experimental, standard HTTP pushing isn't officially supported via `db push`. 
    // However, LibSQL works with regular connection strings. Let's make sure the client simply connects first.
    
    const remotePrisma = new PrismaClient({ adapter: new PrismaLibSQL({ url: safeUrl, authToken: token }) })
    
    // Verify connection by creating a dummy table or running a raw query
    await remotePrisma.$queryRaw`SELECT 1;`

    try {
      console.log("Attempting remote Schema Push over Edge HTTP...")
      
      // Since `prisma db push` relies on the Rust engine which fails against raw HTTP LibSQL edge nodes,
      // we generate the raw SQLite DDL from our Prisma schema instead!
      const { stdout } = await execAsync(`npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`)
      
      // Inject idempotency so we don't crash if the tables already exist
      const idempotentSql = stdout
        .replace(/CREATE TABLE/g, 'CREATE TABLE IF NOT EXISTS')
        .replace(/CREATE UNIQUE INDEX/g, 'CREATE UNIQUE INDEX IF NOT EXISTS')
        .replace(/CREATE INDEX/g, 'CREATE INDEX IF NOT EXISTS')
        
      // Execute it dynamically across the edge client
      const libsql = createClient({ url: safeUrl, authToken: token })
      await libsql.executeMultiple(idempotentSql)
      console.log("Remote Schema synchronized perfectly!")
    } catch(pushErr) {
      console.warn("Schema synchronization failed or generated an exception:", pushErr)
    }

    console.log("Migrating data UPWARD (Local -> Remote Bunny DB)...")

    // 2. Read all local content
    const users = await localPrisma.user.findMany()
    const tags = await localPrisma.tag.findMany()
    const posts = await localPrisma.post.findMany()
    const views = await localPrisma.postView.findMany()

    // 3. Push to Remote Bunny Database using batch transactions
    await remotePrisma.$transaction([
      ...users.map(u => remotePrisma.user.upsert({ where: { id: u.id }, create: u, update: u })),
      ...tags.map(t => remotePrisma.tag.upsert({ where: { id: t.id }, create: t, update: t })),
      ...posts.map(p => remotePrisma.post.upsert({ where: { id: p.id }, create: p, update: p })),
      ...views.map(v => remotePrisma.postView.upsert({ where: { id: v.id }, create: v, update: v }))
    ])

    console.log("Migration complete!")

    // 4. Save settings locally to permanently route all traffic to Bunny
    await localPrisma.siteSettings.update({
      where: { id: 'singleton' },
      data: { bunnyEnabled: true, bunnyUrl: safeUrl, bunnyToken: token }
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
    const settings = await localPrisma.siteSettings.findUnique({ where: { id: 'singleton' } })
    if (!settings?.bunnyEnabled || !settings.bunnyUrl || !settings.bunnyToken) {
       return { success: true } // Already disconnected
    }

    const remotePrisma = new PrismaClient({ adapter: new PrismaLibSQL({ url: settings.bunnyUrl, authToken: settings.bunnyToken }) })
    
    // 1. Fetch Remote Data
    const users = await remotePrisma.user.findMany()
    const tags = await remotePrisma.tag.findMany()
    const posts = await remotePrisma.post.findMany()
    const views = await remotePrisma.postView.findMany()

    console.log("Migrating data DOWNWARD (Remote Bunny DB -> Local SQLite)...")

    // 2. Upsert it safely into Local SQLite
    await localPrisma.$transaction([
      ...users.map(u => localPrisma.user.upsert({ where: { id: u.id }, create: u, update: u })),
      ...tags.map(t => localPrisma.tag.upsert({ where: { id: t.id }, create: t, update: t })),
      ...posts.map(p => localPrisma.post.upsert({ where: { id: p.id }, create: p, update: p })),
      ...views.map(v => localPrisma.postView.upsert({ where: { id: v.id }, create: v, update: v }))
    ])

    // 3. Disable connection
    await localPrisma.siteSettings.update({
      where: { id: 'singleton' },
      data: { bunnyEnabled: false }
    })

    return { success: true }
  } catch (error: any) {
    console.error("Bunny Disconnection Error:", error)
    return { success: false, error: 'Failed to extract data: ' + (error.message || 'Unknown Error') }
  }
}
