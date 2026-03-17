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
  return markdown
    // Remove all Craft-specific XML/HTML tags
    .replace(/<pageTitle>[^<]*<\/pageTitle>\s*/g, '')
    .replace(/<\/?page[^>]*>\s*/g, '')
    .replace(/<\/?content[^>]*>\s*/g, '')
    .replace(/<\/?card[^>]*>\s*/g, '')
    .replace(/<\/?collection[^>]*>\s*/g, '')
    // Dedent lines: Craft indents blocks which makes marked treat them as code
    .replace(/^[ \t]+/gm, '')
    .trim()
}

async function prepareCraftContent(craftMarkdown: string, storageConfig: StorageConfig): Promise<string> {
  let cleaned = cleanCraftMarkdown(craftMarkdown)
  // Download and re-host images
  cleaned = await processImages(cleaned, storageConfig)
  return cleaned
}

function convertHtmlToMarkdown(html: string): string {
  // Extract code blocks FIRST before any processing to preserve their content
  // This ensures HTML entities inside code blocks are not stripped
  const codeBlocks: { placeholder: string; content: string; isInline: boolean }[] = []
  let blockIndex = 0

  // Extract <pre> blocks (code blocks) - process these first to avoid nested <code> conflicts
  let text = html.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (match, content) => {
    const placeholder = `\n\n__CODE_BLOCK_${blockIndex}__\n\n`
    // Get the raw text content, preserving HTML entities
    const rawContent = extractRawText(content)
    codeBlocks.push({ placeholder, content: rawContent, isInline: false })
    blockIndex++
    return placeholder
  })

  // Extract inline <code> blocks (but not inside pre blocks which are already extracted)
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (match, content) => {
    const placeholder = `__INLINE_CODE_${blockIndex}__`
    const rawContent = extractRawText(content)
    codeBlocks.push({ placeholder, content: rawContent, isInline: true })
    blockIndex++
    return placeholder
  })

  // Now decode entities and process the rest of the HTML
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')

  let md = text
    // Images
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '\n\n![$2]($1)\n\n')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '\n\n![$1]($2)\n\n')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '\n\n![]($1)\n\n')
    // Headers
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, content) => `# ${stripHtml(content)}\n\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, content) => `## ${stripHtml(content)}\n\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, content) => `### ${stripHtml(content)}\n\n`)
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, content) => `#### ${stripHtml(content)}\n\n`)
    .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, content) => `##### ${stripHtml(content)}\n\n`)
    .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, content) => `###### ${stripHtml(content)}\n\n`)
    // Inline formatting
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, content) => `**${stripHtml(content)}**`)
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, content) => `**${stripHtml(content)}**`)
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, content) => `*${stripHtml(content)}*`)
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, (_, content) => `*${stripHtml(content)}*`)
    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, content) => `[${stripHtml(content)}](${href})`)
    // Lists - handle nested content
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => `- ${stripHtml(content)}\n`)
    .replace(/<\/?[ou]l[^>]*>/gi, '\n')
    // Blockquotes
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) =>
      stripHtml(content).split('\n').map((line: string) => `> ${line}`).join('\n') + '\n\n'
    )
    // Paragraphs - handle multiline content and nested tags
    .replace(/<p[^>]*><\/p>/gi, '\n') // empty paragraphs = line break
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => `${stripHtml(content)}\n\n`)
    // Line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Horizontal rules
    .replace(/<hr[^>]*\/?>/gi, '\n---\n\n')
    // Divs - treat as paragraphs
    .replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, (_, content) => `${stripHtml(content)}\n\n`)
    // Span tags - just remove them but keep content
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    // Tables - simplified conversion
    .replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_, row) => {
      const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []
      return '| ' + cells.map((c: string) => stripHtml(c)).join(' | ') + ' |\n'
    })
    .replace(/<\/table>/gi, '\n')
    .replace(/<table[^>]*>/gi, '\n')
    // Strip any remaining HTML tags that weren't handled
    .replace(/<[^>]+>/g, '')

  // Restore code blocks
  for (const block of codeBlocks) {
    if (block.isInline) {
      // Inline code: wrap in backticks, escape any backticks in content
      const escaped = block.content.replace(/`/g, '\\`')
      md = md.replace(block.placeholder, `\`${escaped}\``)
    } else {
      // Code block: wrap in triple backticks, remove any surrounding backticks
      let code = block.content.replace(/^```\n?|\n?```$/g, '')
      md = md.replace(block.placeholder, `\n\`\`\`\n${code}\n\`\`\`\n`)
    }
  }

  // Final cleanup
  md = md
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return md
}

/**
 * Extract raw text content from HTML, preserving HTML entities as-is
 * This is used for code blocks where we want to keep the original code
 */
function extractRawText(html: string): string {
  return html
    // Remove HTML tags but keep their content
    .replace(/<[^>]+>/g, '')
    // Don't decode entities - keep them as-is for code
    .trim()
}

/**
 * Strip HTML tags from content, handling nested elements
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface SyncResult {
  imported: number
  updated: number
  backedUp: number
  deleted: number
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
  force = false,
  fullSync = false
): Promise<SyncResult & { deleted: number }> {
  const result: SyncResult & { deleted: number } = { imported: 0, updated: 0, backedUp: 0, deleted: 0, errors: [] }
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

  // Create a set of document IDs from Craft
  const craftDocIds = new Set(documents.map(d => d.id))

  // In full-sync mode, find posts that were deleted from Craft
  if (fullSync) {
    const linkedPosts = await postDb.post.findMany({
      where: {
        craftDocumentId: { not: null },
        craftUnlinked: false,
      },
      select: { id: true, craftDocumentId: true, title: true },
    })

    for (const post of linkedPosts) {
      if (post.craftDocumentId && !craftDocIds.has(post.craftDocumentId)) {
        try {
          await postDb.post.delete({ where: { id: post.id } })
          result.deleted++
        } catch (err: any) {
          result.errors.push(`Error deleting post "${post.title}": ${err.message}`)
        }
      }
    }
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

        // Extract language from title if present: "My Post [es]"
        const titleMatch = doc.title.match(/(.+?)\s*\[([a-z]{2}(?:-[A-Z]{2})?)\]$/i)
        let cleanTitle = doc.title
        let language = 'en'
        
        if (titleMatch) {
          cleanTitle = titleMatch[1].trim()
          language = titleMatch[2].toLowerCase()
        }

        // Update the post
        const rawMarkdown = await client.getDocumentMarkdown(doc.id)
        const content = await prepareCraftContent(rawMarkdown, storageConfig)

        await postDb.post.update({
          where: { id: existingPost.id },
          data: {
            title: cleanTitle,
            language,
            content,
            contentFormat: 'markdown',
            craftLastModifiedAt: doc.lastModifiedAt || null,
          },
        })
        result.updated++
      } else {
        // Extract language from title if present: "My Post [es]"
        const titleMatch = doc.title.match(/(.+?)\s*\[([a-z]{2}(?:-[A-Z]{2})?)\]$/i)
        let cleanTitle = doc.title
        let language = 'en'
        
        if (titleMatch) {
          cleanTitle = titleMatch[1].trim()
          language = titleMatch[2].toLowerCase()
        }

        // Import new post
        const rawMarkdown = await client.getDocumentMarkdown(doc.id)
        const content = await prepareCraftContent(rawMarkdown, storageConfig)

        let slug = generateSlug(cleanTitle)
        const existingSlug = await postDb.post.findUnique({ where: { slug } })
        if (existingSlug) slug = `${slug}-${Date.now()}`

        // Check if there's already a base post we can group with
        const basePost = await postDb.post.findFirst({
          where: {
            title: cleanTitle,
            OR: [
              { translationGroupId: { not: null } },
              { language: { not: language } }
            ]
          }
        })

        let translationGroupId = null
        if (basePost) {
          translationGroupId = basePost.translationGroupId || basePost.id
          
          // If base doesn't have a group yet, update it
          if (!basePost.translationGroupId) {
            await postDb.post.update({
              where: { id: basePost.id },
              data: { translationGroupId: basePost.id }
            })
          }
        }

        await postDb.post.create({
          data: {
            title: cleanTitle,
            slug,
            content,
            contentFormat: 'markdown',
            language,
            translationGroupId,
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
  const result: SyncResult = { imported: 0, updated: 0, backedUp: 0, deleted: 0, errors: [] }
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
      // Convert to markdown only if content is HTML (legacy posts)
      const markdown = (post as any).contentFormat === 'html'
        ? convertHtmlToMarkdown(post.content)
        : post.content

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
            craftLastModifiedAt: craftDoc.lastModifiedAt || null,
          },
        })
        result.backedUp++
      }
    } catch (err: any) {
      console.error(`[CraftSync] Failed to back up "${post.title}":`, err.message)
      result.errors.push(`Error backing up "${post.title}": ${err.message}`)
    }

    if (i < posts.length - 1) {
      await delay(POST_DELAY_MS)
    }
  }

  return result
}

/**
 * Get the current Craft sync mode. Returns null if Craft is not enabled.
 */
export async function getCraftSyncMode(): Promise<string | null> {
  const settings = await getCraftSettings()
  if (!settings) return null
  return settings.craftSyncMode || 'read-only'
}

/**
 * Push a single post to Craft. Called after publishing/editing in backup/full-sync mode.
 * Non-blocking — errors are logged but don't break the publish flow.
 */
export async function pushPostToCraft(postId: string): Promise<void> {
  try {
    const settings = await getCraftSettings()
    if (!settings) return

    const mode = settings.craftSyncMode || 'read-only'
    if (mode !== 'backup' && mode !== 'full-sync') return

    const postDb = await getPostDb()
    const post = await postDb.post.findUnique({ where: { id: postId } })
    if (!post || !post.published) return

    const client = new CraftClient(settings.craftServerUrl, settings.craftApiToken)

    // Convert HTML content to markdown if needed (matches craftBackupSync behaviour)
    const markdown = (post as any).contentFormat === 'html'
      ? convertHtmlToMarkdown(post.content)
      : post.content

    if (post.craftDocumentId) {
      // Update existing Craft document
      await client.updateDocumentContent(post.craftDocumentId, markdown)
    } else {
      // Create new document in Craft
      const craftDoc = await client.createDocument(settings.craftFolderId, post.title)
      await client.insertBlocks(craftDoc.id, markdown)

      // Save the Craft document ID (and timestamp if the API returned it)
      await postDb.post.update({
        where: { id: postId },
        data: {
          craftDocumentId: craftDoc.id,
          craftLastModifiedAt: craftDoc.lastModifiedAt || null,
        },
      })
    }
  } catch (err: any) {
    console.error(`[CraftSync] Failed to push post ${postId} to Craft:`, err.message)
  }
}

/**
 * Delete a post from Craft when it's deleted from the site.
 * Only works in full-sync mode.
 */
export async function deletePostFromCraft(craftDocumentId: string): Promise<void> {
  console.log(`[CraftSync] Attempting to delete document ${craftDocumentId} from Craft`)
  try {
    const settings = await getCraftSettings()
    if (!settings) {
      console.log('[CraftSync] No Craft settings found, skipping delete')
      return
    }

    const mode = settings.craftSyncMode || 'read-only'
    console.log(`[CraftSync] Craft sync mode: ${mode}`)
    if (mode !== 'full-sync') {
      console.log('[CraftSync] Not in full-sync mode, skipping delete')
      return
    }

    const client = new CraftClient(settings.craftServerUrl, settings.craftApiToken)
    console.log(`[CraftSync] Deleting document ${craftDocumentId} from Craft...`)
    await client.deleteDocument(craftDocumentId)
    console.log(`[CraftSync] Successfully deleted document ${craftDocumentId} from Craft`)
  } catch (err: any) {
    console.error(`[CraftSync] Failed to delete document ${craftDocumentId} from Craft:`, err.message)
    throw err
  }
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
  const result: SyncResult = { imported: 0, updated: 0, backedUp: 0, deleted: 0, errors: [] }

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

    // Health check: verify connection is still working (lightweight, no write test)
    const connectionTest = await client.testConnection(false)
    if (!connectionTest.success) {
      const errMsg = `Craft connection failed: ${connectionTest.error || 'Unknown error'}. Please check your API key and permissions.`
      await setCraftError(errMsg, true)
      return { ...result, errors: [errMsg] }
    }

    // If backup/full-sync, verify write access on manual sync only
    if ((mode === 'backup' || mode === 'full-sync') && options.manual) {
      const writeOk = await client.testWriteAccess()
      if (!writeOk) {
        const errMsg = 'Craft API no longer has write access. Backup/Full Sync requires write permissions. Integration has been disabled.'
        await setCraftError(errMsg, true)
        return { ...result, errors: [errMsg] }
      }
    }

    if (mode === 'read-only' || mode === 'full-sync') {
      const importResult = await craftImportSync(client, settings.craftFolderId, !!options.force, mode === 'full-sync')
      result.imported = importResult.imported
      result.updated = importResult.updated
      result.deleted = importResult.deleted
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
