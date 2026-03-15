/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { prisma } from '@/lib/db'
import { getPostDb } from '@/lib/bunnyDb'
import { CraftClient } from '@/lib/craft'
import { marked } from 'marked'

// Concurrency guard
let syncInProgress = false
let lastSyncTime = 0
const SYNC_COOLDOWN_MS = 60_000 // 1 minute between auto-syncs
const POST_DELAY_MS = 10_000 // 10 seconds between posts

function generateSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

function stripPageTags(markdown: string): string {
  // Remove <page>...</page> wrapper tags but keep inner content
  return markdown
    .replace(/<page>[^<]*<\/page>\n?/g, '')
    .replace(/<page>/g, '')
    .replace(/<\/page>/g, '')
    .trim()
}

async function convertCraftMarkdownToHtml(craftMarkdown: string): Promise<string> {
  const cleaned = stripPageTags(craftMarkdown)
  return await marked(cleaned)
}

function convertHtmlToMarkdown(html: string): string {
  // Simple HTML to markdown conversion for backup
  let md = html
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    // Bold and italic
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    // Images
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
    // Lists
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/?[ou]l[^>]*>/gi, '\n')
    // Paragraphs and breaks
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Code
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '```\n$1\n```\n\n')
    // Blockquotes
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) =>
      content.split('\n').map((line: string) => `> ${line}`).join('\n') + '\n\n'
    )
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Clean up whitespace
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
  folderId: string
): Promise<SyncResult> {
  const result: SyncResult = { imported: 0, updated: 0, backedUp: 0, errors: [] }
  const postDb = await getPostDb()

  const owner = await getOwnerUser()
  if (!owner) {
    result.errors.push('No OWNER user found to assign imported posts')
    return result
  }

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

        // Check if updated
        if (
          doc.lastModifiedAt &&
          existingPost.craftLastModifiedAt &&
          doc.lastModifiedAt === existingPost.craftLastModifiedAt
        ) {
          continue // No changes
        }

        // Update the post
        const markdown = await client.getDocumentMarkdown(doc.id)
        const html = await convertCraftMarkdownToHtml(markdown)

        await postDb.post.update({
          where: { id: existingPost.id },
          data: {
            title: doc.title,
            content: html,
            craftLastModifiedAt: doc.lastModifiedAt || null,
          },
        })
        result.updated++
      } else {
        // Import new post
        const markdown = await client.getDocumentMarkdown(doc.id)
        const html = await convertCraftMarkdownToHtml(markdown)

        let slug = generateSlug(doc.title)
        const existingSlug = await postDb.post.findUnique({ where: { slug } })
        if (existingSlug) slug = `${slug}-${Date.now()}`

        await postDb.post.create({
          data: {
            title: doc.title,
            slug,
            content: html,
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

  // Get all published posts that don't come from Craft (or are unlinked)
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
        // Post was unlinked - update the existing Craft document
        await client.updateDocumentContent(post.craftDocumentId, markdown)
        result.backedUp++
      } else {
        // New post - create in Craft
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

    // Rate limiting: 10s delay between posts
    if (i < posts.length - 1) {
      await delay(POST_DELAY_MS)
    }
  }

  return result
}

export async function runCraftSync(
  options: { manual?: boolean } = {}
): Promise<SyncResult> {
  const result: SyncResult = { imported: 0, updated: 0, backedUp: 0, errors: [] }

  // Concurrency guard
  if (syncInProgress) {
    return { ...result, errors: ['Sync already in progress'] }
  }

  // Cooldown for auto-triggered syncs
  if (!options.manual && Date.now() - lastSyncTime < SYNC_COOLDOWN_MS) {
    return result
  }

  const settings = await getCraftSettings()
  if (!settings) return result

  syncInProgress = true
  try {
    const client = new CraftClient(settings.craftServerUrl, settings.craftApiToken)
    const mode = settings.craftSyncMode || 'read-only'

    if (mode === 'read-only' || mode === 'full-sync') {
      const importResult = await craftImportSync(client, settings.craftFolderId)
      result.imported = importResult.imported
      result.updated = importResult.updated
      result.errors.push(...importResult.errors)
    }

    if (mode === 'backup' || mode === 'full-sync') {
      const backupResult = await craftBackupSync(client, settings.craftFolderId)
      result.backedUp = backupResult.backedUp
      result.errors.push(...backupResult.errors)
    }

    // Update last sync timestamp
    try {
      await (prisma as any).siteSettings.update({
        where: { id: 'singleton' },
        data: { craftLastSyncAt: new Date().toISOString() },
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
