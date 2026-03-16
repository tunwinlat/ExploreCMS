/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { prisma } from '@/lib/db'
import { getPostDb } from '@/lib/bunnyDb'
import { CraftClient } from '@/lib/craft'
import { createWriteStream, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

// Concurrency guard
let syncInProgress = false
let lastSyncTime = 0
const SYNC_COOLDOWN_MS = 60_000 // 1 minute between auto-syncs
const POST_DELAY_MS = 10_000 // 10 seconds between posts

function generateSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

// ── Storage helpers (mirrors upload/route.ts logic) ──

interface StorageConfig {
  bunnyStorageEnabled: boolean
  bunnyStorageApiKey?: string | null
  bunnyStorageZoneName?: string | null
  bunnyStorageRegion?: string | null
  bunnyStorageUrl?: string | null
}

async function getStorageConfig(): Promise<StorageConfig> {
  try {
    const settings = await (prisma as any).siteSettings.findUnique({
      where: { id: 'singleton' },
      select: {
        bunnyStorageEnabled: true,
        bunnyStorageRegion: true,
        bunnyStorageZoneName: true,
        bunnyStorageApiKey: true,
        bunnyStorageUrl: true,
      },
    })
    return settings || { bunnyStorageEnabled: false }
  } catch {
    return { bunnyStorageEnabled: false }
  }
}

async function uploadToBunnyStorage(
  buffer: Buffer,
  filename: string,
  contentType: string,
  config: StorageConfig
): Promise<string> {
  const defaultRegions = ['', 'fsn1', 'de']
  const region = config.bunnyStorageRegion || ''
  const baseUrl = defaultRegions.includes(region)
    ? 'storage.bunnycdn.com'
    : `${region}.storage.bunnycdn.com`

  const storagePath = `uploads/${filename}`
  const url = `https://${baseUrl}/${config.bunnyStorageZoneName}/${storagePath}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'AccessKey': config.bunnyStorageApiKey!,
      'Content-Type': contentType,
    },
    body: new Uint8Array(buffer),
  })

  if (!response.ok) {
    throw new Error(`Bunny upload failed: ${response.status}`)
  }

  return `${config.bunnyStorageUrl}/uploads/${filename}`
}

function uploadToLocalStorage(buffer: Buffer, filename: string): string {
  const uploadDir = join(process.cwd(), 'public', 'uploads')
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true })
  }
  const filePath = join(uploadDir, filename)
  const stream = createWriteStream(filePath)
  stream.write(buffer)
  stream.end()
  return `/uploads/${filename}`
}

function guessExtension(contentType: string, url: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg',
  }
  if (mimeMap[contentType]) return mimeMap[contentType]
  // Try from URL
  const match = url.match(/\.(jpe?g|png|gif|webp|svg)(\?|$)/i)
  if (match) return match[1].toLowerCase()
  return 'jpg' // fallback
}

async function downloadAndUploadImage(imageUrl: string, storageConfig: StorageConfig): Promise<string | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await response.arrayBuffer())
    const ext = guessExtension(contentType, imageUrl)
    const filename = `${uuidv4()}.${ext}`

    if (storageConfig.bunnyStorageEnabled && storageConfig.bunnyStorageApiKey) {
      try {
        return await uploadToBunnyStorage(buffer, filename, contentType, storageConfig)
      } catch {
        // Fall back to local
      }
    }
    return uploadToLocalStorage(buffer, filename)
  } catch {
    return null
  }
}

// ── Content conversion ──

/**
 * Extract image URLs from markdown, download them, upload to site storage,
 * and replace the URLs in the markdown.
 */
async function processImages(markdown: string, storageConfig: StorageConfig): Promise<string> {
  // Match markdown images: ![alt](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
  const matches = [...markdown.matchAll(imageRegex)]

  let result = markdown
  for (const match of matches) {
    const [fullMatch, alt, url] = match
    // Only process external Craft URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const localUrl = await downloadAndUploadImage(url, storageConfig)
      if (localUrl) {
        result = result.replace(fullMatch, `![${alt}](${localUrl})`)
      }
    }
  }

  return result
}

function cleanCraftMarkdown(markdown: string): string {
  // Remove <page>Title</page> lines (Craft wraps document titles in these)
  // Also handle self-closing and nested page tags
  return markdown
    .replace(/<page>[^<]*<\/page>\s*/g, '')
    .replace(/<page>\s*/g, '')
    .replace(/<\/page>\s*/g, '')
    .trim()
}

async function prepareCraftContent(craftMarkdown: string, storageConfig: StorageConfig): Promise<string> {
  let cleaned = cleanCraftMarkdown(craftMarkdown)
  // Download and re-host images
  cleaned = await processImages(cleaned, storageConfig)
  return cleaned
}

function convertHtmlToMarkdown(html: string): string {
  let md = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/?[ou]l[^>]*>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '```\n$1\n```\n\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) =>
      content.split('\n').map((line: string) => `> ${line}`).join('\n') + '\n\n'
    )
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return md
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface SyncResult {
  imported: number
  updated: number
  backedUp: number
  errors: string[]
}

async function getCraftSettings() {
  try {
    const settings = await (prisma as any).siteSettings.findUnique({
      where: { id: 'singleton' },
    })
    if (!settings?.craftEnabled || !settings.craftServerUrl || !settings.craftApiToken || !settings.craftFolderId) {
      return null
    }
    return settings
  } catch {
    return null
  }
}

async function getOwnerUser() {
  try {
    const owner = await prisma.user.findFirst({
      where: { role: 'OWNER' },
      select: { id: true },
    })
    return owner
  } catch {
    return null
  }
}

export async function craftImportSync(
  client: CraftClient,
  folderId: string,
  force = false
): Promise<SyncResult> {
  const result: SyncResult = { imported: 0, updated: 0, backedUp: 0, errors: [] }
  const postDb = await getPostDb()

  const owner = await getOwnerUser()
  if (!owner) {
    result.errors.push('No OWNER user found to assign imported posts')
    return result
  }

  const storageConfig = await getStorageConfig()

  let documents
  try {
    documents = await client.getDocuments(folderId, true)
  } catch (err: any) {
    result.errors.push(`Failed to list documents: ${err.message}`)
    return result
  }

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i]

    try {
      // Check if we already have this document
      const existingPost = await postDb.post.findFirst({
        where: { craftDocumentId: doc.id },
      })

      if (existingPost) {
        // Skip if unlinked
        if (existingPost.craftUnlinked) continue

        // Check if updated (skip if timestamps match, unless force re-sync)
        if (
          !force &&
          doc.lastModifiedAt &&
          existingPost.craftLastModifiedAt &&
          doc.lastModifiedAt === existingPost.craftLastModifiedAt
        ) {
          continue // No changes
        }

        // Update the post
        const rawMarkdown = await client.getDocumentMarkdown(doc.id)
        const content = await prepareCraftContent(rawMarkdown, storageConfig)

        await postDb.post.update({
          where: { id: existingPost.id },
          data: {
            title: doc.title,
            content,
            contentFormat: 'markdown',
            craftLastModifiedAt: doc.lastModifiedAt || null,
          },
        })
        result.updated++
      } else {
        // Import new post
        const rawMarkdown = await client.getDocumentMarkdown(doc.id)
        const content = await prepareCraftContent(rawMarkdown, storageConfig)

        let slug = generateSlug(doc.title)
        const existingSlug = await postDb.post.findUnique({ where: { slug } })
        if (existingSlug) slug = `${slug}-${Date.now()}`

        await postDb.post.create({
          data: {
            title: doc.title,
            slug,
            content,
            contentFormat: 'markdown',
            published: true,
            authorId: owner.id,
            craftDocumentId: doc.id,
            craftLastModifiedAt: doc.lastModifiedAt || null,
          },
        })
        result.imported++
      }
    } catch (err: any) {
      result.errors.push(`Error processing "${doc.title}": ${err.message}`)
    }

    // Rate limiting: 10s delay between posts (not after the last one)
    if (i < documents.length - 1) {
      await delay(POST_DELAY_MS)
    }
  }

  return result
}

export async function craftBackupSync(
  client: CraftClient,
  folderId: string
): Promise<SyncResult> {
  const result: SyncResult = { imported: 0, updated: 0, backedUp: 0, errors: [] }
  const postDb = await getPostDb()

  const posts = await postDb.post.findMany({
    where: {
      published: true,
      OR: [
        { craftDocumentId: null },
        { craftUnlinked: true },
      ],
    },
  })

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]

    try {
      const markdown = convertHtmlToMarkdown(post.content)

      if (post.craftDocumentId && post.craftUnlinked) {
        await client.updateDocumentContent(post.craftDocumentId, markdown)
        result.backedUp++
      } else {
        const craftDoc = await client.createDocument(folderId, post.title)
        await client.insertBlocks(craftDoc.id, markdown)

        await postDb.post.update({
          where: { id: post.id },
          data: {
            craftDocumentId: craftDoc.id,
          },
        })
        result.backedUp++
      }
    } catch (err: any) {
      result.errors.push(`Error backing up "${post.title}": ${err.message}`)
    }

    if (i < posts.length - 1) {
      await delay(POST_DELAY_MS)
    }
  }

  return result
}

async function setCraftError(error: string | null, disable = false) {
  try {
    const data: any = { craftError: error }
    if (disable) data.craftEnabled = false
    await (prisma as any).siteSettings.update({
      where: { id: 'singleton' },
      data,
    })
  } catch {
    // Non-critical
  }
}

export async function runCraftSync(
  options: { manual?: boolean; force?: boolean } = {}
): Promise<SyncResult> {
  const result: SyncResult = { imported: 0, updated: 0, backedUp: 0, errors: [] }

  if (syncInProgress) {
    return { ...result, errors: ['Sync already in progress'] }
  }

  if (!options.manual && Date.now() - lastSyncTime < SYNC_COOLDOWN_MS) {
    return result
  }

  const settings = await getCraftSettings()
  if (!settings) return result

  syncInProgress = true
  try {
    const client = new CraftClient(settings.craftServerUrl, settings.craftApiToken)
    const mode = settings.craftSyncMode || 'read-only'

    // Health check: verify connection is still working
    const connectionTest = await client.testConnection()
    if (!connectionTest.success) {
      const errMsg = `Craft connection failed: ${connectionTest.error || 'Unknown error'}. Please check your API key and permissions.`
      await setCraftError(errMsg, true)
      return { ...result, errors: [errMsg] }
    }

    // If backup/full-sync, verify write access still works
    if (mode === 'backup' || mode === 'full-sync') {
      if (!connectionTest.writeAccess) {
        const errMsg = 'Craft API no longer has write access. Backup/Full Sync requires write permissions. Integration has been disabled.'
        await setCraftError(errMsg, true)
        return { ...result, errors: [errMsg] }
      }
    }

    if (mode === 'read-only' || mode === 'full-sync') {
      const importResult = await craftImportSync(client, settings.craftFolderId, !!options.force)
      result.imported = importResult.imported
      result.updated = importResult.updated
      result.errors.push(...importResult.errors)
    }

    if (mode === 'backup' || mode === 'full-sync') {
      const backupResult = await craftBackupSync(client, settings.craftFolderId)
      result.backedUp = backupResult.backedUp
      result.errors.push(...backupResult.errors)
    }

    // Sync succeeded — clear any previous error and update timestamp
    try {
      await (prisma as any).siteSettings.update({
        where: { id: 'singleton' },
        data: {
          craftLastSyncAt: new Date().toISOString(),
          craftError: null,
        },
      })
    } catch {
      // Non-critical
    }

    lastSyncTime = Date.now()
  } finally {
    syncInProgress = false
  }

  return result
}
