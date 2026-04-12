/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma as localPrisma } from '@/lib/db'
import { getPostDb } from '@/lib/bunnyDb'
import { revalidatePath } from 'next/cache'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { encrypt, decrypt } from '@/lib/crypto'

// Storage Types
export type StorageType = 'bunny' | 's3'

// Base Storage Interface
interface StorageClient {
  testConnection(): Promise<{ success: boolean; error?: string }>
  uploadFile(path: string, buffer: Buffer, contentType?: string): Promise<string>
  downloadFile(path: string): Promise<Buffer>
  listFiles(path?: string): Promise<string[]>
  deleteFile(path: string): Promise<void>
  getPublicUrl(path: string): string
}

// Bunny Storage API Client
class BunnyStorageClient implements StorageClient {
  private apiKey: string
  private storageZoneName: string
  private region: string
  private cdnUrl: string
  private baseUrl: string

  constructor(apiKey: string, storageZoneName: string, region: string, cdnUrl: string) {
    this.apiKey = apiKey
    this.storageZoneName = storageZoneName
    this.region = region
    this.cdnUrl = cdnUrl.replace(/\/$/, '') // Remove trailing slash
    
    const defaultRegions = ['', 'fsn1', 'de']
    this.baseUrl = defaultRegions.includes(region) 
      ? 'storage.bunnycdn.com'
      : `${region}.storage.bunnycdn.com`
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `https://${this.baseUrl}/${this.storageZoneName}/`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'AccessKey': this.apiKey },
      })

      if (!response.ok) {
        const error = await response.text()
        return { success: false, error: `HTTP ${response.status}: ${error}` }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async uploadFile(path: string, buffer: Buffer, contentType?: string): Promise<string> {
    const normalizedPath = path.replace(/^\//, '') // Remove leading slash
    const url = `https://${this.baseUrl}/${this.storageZoneName}/${normalizedPath}`
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'AccessKey': this.apiKey,
        'Content-Type': contentType || 'application/octet-stream',
      },
      body: new Uint8Array(buffer),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Bunny Storage upload failed: ${response.status} ${error}`)
    }

    return `${this.cdnUrl}/${normalizedPath}`
  }

  async downloadFile(path: string): Promise<Buffer> {
    const normalizedPath = path.replace(/^\//, '')
    const url = `https://${this.baseUrl}/${this.storageZoneName}/${normalizedPath}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'AccessKey': this.apiKey },
    })

    if (!response.ok) {
      throw new Error(`Bunny Storage download failed: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async listFiles(path: string = ''): Promise<string[]> {
    const normalizedPath = path.replace(/^\//, '')
    const url = `https://${this.baseUrl}/${this.storageZoneName}/${normalizedPath}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'AccessKey': this.apiKey },
    })

    if (!response.ok) {
      throw new Error(`Bunny Storage list failed: ${response.status}`)
    }

    const files = await response.json()
    return files.map((f: any) => f.ObjectName || f.Path).filter(Boolean)
  }

  async deleteFile(path: string): Promise<void> {
    const normalizedPath = path.replace(/^\//, '')
    const url = `https://${this.baseUrl}/${this.storageZoneName}/${normalizedPath}`
    
    await fetch(url, {
      method: 'DELETE',
      headers: { 'AccessKey': this.apiKey },
    })
  }

  getPublicUrl(path: string): string {
    const normalizedPath = path.replace(/^\//, '')
    return `${this.cdnUrl}/${normalizedPath}`
  }
}

// S3-Compatible Storage Client
class S3StorageClient implements StorageClient {
  private endpoint: string
  private accessKeyId: string
  private secretAccessKey: string
  private bucket: string
  private region: string
  private cdnUrl?: string

  constructor(
    endpoint: string,
    accessKeyId: string,
    secretAccessKey: string,
    bucket: string,
    region: string,
    cdnUrl?: string
  ) {
    this.endpoint = endpoint.replace(/\/$/, '')
    this.accessKeyId = accessKeyId
    this.secretAccessKey = secretAccessKey
    this.bucket = bucket
    this.region = region
    this.cdnUrl = cdnUrl?.replace(/\/$/, '')
  }

  private async signRequest(method: string, path: string, headers: Record<string, string> = {}, payload?: Buffer) {
    // Simplified S3 signing - for production, use AWS SDK
    // This is a basic implementation for demonstration
    const date = new Date()
    const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, '')
    const amzDate = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z')
    
    const host = new URL(this.endpoint).host
    const canonicalUri = `/${this.bucket}/${path}`
    
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
    const payloadHash = payload 
      ? await this.sha256(payload)
      : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' // empty string hash
    
    const canonicalRequest = `${method}\n${canonicalUri}\n\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n\n${signedHeaders}\n${payloadHash}`
    
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await this.sha256(Buffer.from(canonicalRequest))}`
    
    const signingKey = await this.getSigningKey(dateStamp)
    const signature = await this.hmacSHA256(signingKey, stringToSign)
    
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
    
    return {
      ...headers,
      'Host': host,
      'X-Amz-Date': amzDate,
      'X-Amz-Content-SHA256': payloadHash,
      'Authorization': authorization,
    }
  }

  private async sha256(buffer: Buffer): Promise<string> {
    const crypto = await import('crypto')
    return crypto.createHash('sha256').update(buffer).digest('hex')
  }

  private async hmacSHA256(key: Buffer, message: string): Promise<string> {
    const crypto = await import('crypto')
    return crypto.createHmac('sha256', key).update(message).digest('hex')
  }

  private async getSigningKey(dateStamp: string): Promise<Buffer> {
    const crypto = await import('crypto')
    const kDate = crypto.createHmac('sha256', `AWS4${this.secretAccessKey}`).update(dateStamp).digest()
    const kRegion = crypto.createHmac('sha256', kDate).update(this.region).digest()
    const kService = crypto.createHmac('sha256', kRegion).update('s3').digest()
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest()
    return kSigning
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Try to list buckets or bucket contents
      const path = ''
      const headers = await this.signRequest('GET', path)
      const url = `${this.endpoint}/${this.bucket}/`
      
      const response = await fetch(url, { method: 'GET', headers })
      
      if (response.status === 200 || response.status === 403) {
        // 403 means credentials work but might lack permissions
        return { success: true }
      }
      
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async uploadFile(path: string, buffer: Buffer, contentType?: string): Promise<string> {
    const normalizedPath = path.replace(/^\//, '')
    const headers = await this.signRequest('PUT', normalizedPath, {
      'Content-Type': contentType || 'application/octet-stream',
    }, buffer)
    
    const url = `${this.endpoint}/${this.bucket}/${normalizedPath}`
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: new Uint8Array(buffer),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`S3 upload failed: ${response.status} ${error}`)
    }

    // Return CDN URL if provided, otherwise construct S3 URL
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${normalizedPath}`
    }
    return `${this.endpoint}/${this.bucket}/${normalizedPath}`
  }

  async downloadFile(path: string): Promise<Buffer> {
    const normalizedPath = path.replace(/^\//, '')
    const headers = await this.signRequest('GET', normalizedPath)
    const url = `${this.endpoint}/${this.bucket}/${normalizedPath}`
    
    const response = await fetch(url, { method: 'GET', headers })

    if (!response.ok) {
      throw new Error(`S3 download failed: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async listFiles(path: string = ''): Promise<string[]> {
    const normalizedPath = path.replace(/^\//, '')
    const headers = await this.signRequest('GET', normalizedPath)
    const url = `${this.endpoint}/${this.bucket}/${normalizedPath}?list-type=2`
    
    const response = await fetch(url, { method: 'GET', headers })

    if (!response.ok) {
      throw new Error(`S3 list failed: ${response.status}`)
    }

    // Parse XML response (simplified)
    const xml = await response.text()
    const keys = xml.match(/<Key>([^<]+)<\/Key>/g) || []
    return keys.map(k => k.replace(/<\/?Key>/g, ''))
  }

  async deleteFile(path: string): Promise<void> {
    const normalizedPath = path.replace(/^\//, '')
    const headers = await this.signRequest('DELETE', normalizedPath)
    const url = `${this.endpoint}/${this.bucket}/${normalizedPath}`
    
    await fetch(url, { method: 'DELETE', headers })
  }

  getPublicUrl(path: string): string {
    const normalizedPath = path.replace(/^\//, '')
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${normalizedPath}`
    }
    return `${this.endpoint}/${this.bucket}/${normalizedPath}`
  }
}

// Factory function to create storage client
function createStorageClient(
  type: StorageType,
  config: any
): StorageClient {
  if (type === 'bunny') {
    return new BunnyStorageClient(
      config.apiKey,
      config.zoneName,
      config.region || '',
      config.cdnUrl
    )
  } else {
    return new S3StorageClient(
      config.endpoint,
      config.accessKeyId,
      config.secretAccessKey,
      config.bucket,
      config.region || 'us-east-1',
      config.cdnUrl
    )
  }
}

// Get current storage client from settings
async function getCurrentStorageClient(): Promise<StorageClient | null> {
  const settings = await (localPrisma as any).siteSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      bunnyStorageEnabled: true,
      bunnyStorageRegion: true,
      bunnyStorageZoneName: true,
      bunnyStorageApiKey: true,
      bunnyStorageUrl: true,
    }
  })

  if (!settings?.bunnyStorageEnabled) {
    return null
  }

  // Decrypt the API key before use
  const apiKey = decrypt(settings.bunnyStorageApiKey) || settings.bunnyStorageApiKey
  return new BunnyStorageClient(
    apiKey,
    settings.bunnyStorageZoneName,
    settings.bunnyStorageRegion || '',
    settings.bunnyStorageUrl
  )
}

// Test new storage connection
export async function testStorageConnection(
  type: StorageType,
  config: any
) {
  const session = await verifySession()
  if (session?.role !== 'OWNER') return { success: false, error: 'Unauthorized' }

  try {
    const client = createStorageClient(type, config)
    const result = await client.testConnection()
    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Migrate storage
export async function migrateStorage(
  type: StorageType,
  config: any,
  options: { updatePostUrls: boolean } = { updatePostUrls: true }
) {
  const session = await verifySession()
  if (session?.role !== 'OWNER') return { success: false, error: 'Unauthorized' }

  const results = {
    filesMigrated: 0,
    postsUpdated: 0,
    errors: [] as string[],
    warnings: [] as string[],
    filesThroughVercel: 0,
  }

  try {
    // Create new storage client
    const newClient = createStorageClient(type, config)
    
    // Test connection first
    const testResult = await newClient.testConnection()
    if (!testResult.success) {
      return { success: false, error: testResult.error }
    }

    // Get current storage client (if any)
    const currentClient = await getCurrentStorageClient()
    
    // Get all posts with images
    const postDb = await getPostDb() as any
    const posts = await postDb.post.findMany({
      where: {
        content: {
          contains: '<img'
        }
      }
    })

    console.log(`[Storage Migration] Found ${posts.length} posts with images`)

    // Extract all unique image URLs
    const imageUrls = new Set<string>()
    const postImageMap = new Map<string, string[]>() // postId -> array of image URLs

    for (const post of posts) {
      const imgRegex = /<img[^>]+src="([^"]+)"/g
      const matches = [...post.content.matchAll(imgRegex)]
      const postImages: string[] = []
      
      for (const match of matches) {
        const url = match[1]
        // Only migrate external URLs (skip data URIs)
        if (url && !url.startsWith('data:')) {
          imageUrls.add(url)
          postImages.push(url)
        }
      }
      
      if (postImages.length > 0) {
        postImageMap.set(post.id, postImages)
      }
    }

    console.log(`[Storage Migration] Found ${imageUrls.size} unique images`)

    // Migrate each image
    const urlMapping = new Map<string, string>() // old URL -> new URL
    
    for (const oldUrl of imageUrls) {
      try {
        let buffer: Buffer
        let filename: string
        let contentType = 'image/jpeg'

        // Determine source
        if (oldUrl.startsWith('http')) {
          // External URL (current storage or other CDN)
          if (currentClient && oldUrl.includes(config.cdnUrl || '')) {
            // Already on target storage, skip
            console.log(`[Storage Migration] Skipping (already on target): ${oldUrl}`)
            urlMapping.set(oldUrl, oldUrl)
            continue
          }

          // Download from current storage or external URL
          console.log(`[Storage Migration] Downloading from external: ${oldUrl}`)
          
          if (currentClient) {
            // Extract path from URL
            const urlObj = new URL(oldUrl)
            const pathParts = urlObj.pathname.split('/').filter(Boolean)
            const path = pathParts.slice(1).join('/') // Remove first part (zone/bucket)
            
            try {
              buffer = await currentClient.downloadFile(path)
              filename = path.split('/').pop() || `image-${Date.now()}`
            } catch {
              // Fall back to fetching via HTTP
              results.filesThroughVercel++
              const response = await fetch(oldUrl)
              if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
              buffer = Buffer.from(await response.arrayBuffer())
              filename = pathParts.pop() || `image-${Date.now()}`
            }
          } else {
            // Local storage - fetch via HTTP
            results.filesThroughVercel++
            const response = await fetch(oldUrl)
            if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
            buffer = Buffer.from(await response.arrayBuffer())
            const pathParts = new URL(oldUrl).pathname.split('/')
            filename = pathParts.pop() || `image-${Date.now()}`
          }
        } else {
          // Local file path (/uploads/...)
          results.filesThroughVercel++
          const publicDir = join(process.cwd(), 'public')
          const localPath = join(publicDir, oldUrl.replace(/^\//, ''))
          buffer = await readFile(localPath)
          filename = oldUrl.split('/').pop() || `image-${Date.now()}`
        }

        // Determine content type
        if (filename.endsWith('.png')) contentType = 'image/png'
        else if (filename.endsWith('.gif')) contentType = 'image/gif'
        else if (filename.endsWith('.webp')) contentType = 'image/webp'
        else if (filename.endsWith('.ico')) contentType = 'image/x-icon'

        // Upload to new storage
        const storagePath = `uploads/${filename}`
        const newUrl = await newClient.uploadFile(storagePath, buffer, contentType)
        
        urlMapping.set(oldUrl, newUrl)
        results.filesMigrated++
        
        console.log(`[Storage Migration] Migrated: ${oldUrl} -> ${newUrl}`)
      } catch (error: any) {
        console.error(`[Storage Migration] Failed to migrate ${oldUrl}:`, error)
        results.errors.push(`Failed to migrate ${oldUrl}: ${error.message}`)
      }
    }

    // Update post content with new URLs
    if (options.updatePostUrls) {
      for (const [postId, images] of postImageMap) {
        try {
          const post = await postDb.post.findUnique({ where: { id: postId } })
          if (!post) continue

          let updatedContent = post.content
          let hasChanges = false

          for (const oldUrl of images) {
            const newUrl = urlMapping.get(oldUrl)
            if (newUrl && newUrl !== oldUrl) {
              // Replace all occurrences
              const escapedOldUrl = oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              updatedContent = updatedContent.replace(
                new RegExp(escapedOldUrl, 'g'),
                newUrl
              )
              hasChanges = true
            }
          }

          if (hasChanges) {
            await postDb.post.update({
              where: { id: postId },
              data: { content: updatedContent }
            })
            results.postsUpdated++
          }
        } catch (error: any) {
          console.error(`[Storage Migration] Failed to update post ${postId}:`, error)
          results.errors.push(`Failed to update post ${postId}: ${error.message}`)
        }
      }
    }

    // Save new storage settings (only Bunny is supported for now)
    const updateData: any = {
      bunnyStorageEnabled: true,
      bunnyStorageRegion: config.region || '',
      bunnyStorageZoneName: config.zoneName,
      bunnyStorageApiKey: encrypt(config.apiKey),
      bunnyStorageUrl: config.cdnUrl,
    }

    await (localPrisma as any).siteSettings.upsert({
      where: { id: 'singleton' },
      update: updateData,
      create: { id: 'singleton', ...updateData }
    })

    revalidatePath('/', 'layout')

    // Add warnings
    if (results.filesThroughVercel > 10) {
      results.warnings.push(
        `${results.filesThroughVercel} files were transferred through Vercel. ` +
        `Consider migrating directly between storage providers for better performance.`
      )
    }

    return {
      success: true,
      stats: results
    }

  } catch (error: any) {
    console.error('[Storage Migration] Error:', error)
    return {
      success: false,
      error: error.message,
      stats: results
    }
  }
}

// Disconnect storage (download back to local)
export async function disconnectBunnyStorage() {
  const session = await verifySession()
  if (session?.role !== 'OWNER') return { success: false, error: 'Unauthorized' }

  try {
    const settings = await (localPrisma as any).siteSettings.findUnique({
      where: { id: 'singleton' }
    })

    if (!settings?.bunnyStorageEnabled) {
      return { success: true, message: 'Already using local storage' }
    }

    // Get current storage client
    const currentClient = await getCurrentStorageClient()
    if (!currentClient) {
      return { success: true, message: 'No storage to disconnect' }
    }

    const results = {
      filesDownloaded: 0,
      postsUpdated: 0,
      errors: [] as string[],
    }

    // Get posts with external images
    const postDb = await getPostDb() as any
    const storageUrl = settings.bunnyStorageUrl || settings.s3CdnUrl
    
    if (!storageUrl) {
      // Just disable, nothing to download
      await (localPrisma as any).siteSettings.update({
        where: { id: 'singleton' },
        data: { 
          bunnyStorageEnabled: false,
        }
      })
      return { success: true, stats: results }
    }

    const posts = await postDb.post.findMany({
      where: {
        content: {
          contains: storageUrl
        }
      }
    })

    const publicDir = join(process.cwd(), 'public')

    // Download files and update posts
    for (const post of posts) {
      const imgRegex = new RegExp(`${storageUrl.replace(/[.*+?^${}()|[\]\\\\]/g, '\\\\$&')}([^"\\s]+)`, 'g')
      const matches = [...post.content.matchAll(imgRegex)]
      
      let updatedContent = post.content

      const downloadResults = await Promise.allSettled(
        matches.map(async (match) => {
          const fullUrl = match[0]
          const path = match[1].replace(/^\//, '')
          
          // Download from storage
          const buffer = await currentClient.downloadFile(path)
          
          // Save locally
          const localPath = join(publicDir, 'uploads', path.split('/').pop()!)
          await mkdir(dirname(localPath), { recursive: true })
          await writeFile(localPath, buffer)
          
          const localUrl = `/uploads/${path.split('/').pop()}`
          return { fullUrl, localUrl, path }
        })
      )

      let hasChanges = false
      for (const result of downloadResults) {
        if (result.status === 'fulfilled') {
          const { fullUrl, localUrl } = result.value
          updatedContent = updatedContent.replace(fullUrl, localUrl)
          results.filesDownloaded++
          hasChanges = true
        } else {
          console.error('[Storage] Failed to download file:', result.reason)
          results.errors.push(`Failed to download file: ${result.reason?.message || result.reason}`)
        }
      }

      if (hasChanges) {
        await postDb.post.update({
          where: { id: post.id },
          data: { content: updatedContent }
        })
        results.postsUpdated++
      }
    }

    // Disable storage
    await (localPrisma as any).siteSettings.update({
      where: { id: 'singleton' },
      data: { 
        bunnyStorageEnabled: false,
      }
    })

    revalidatePath('/', 'layout')
    return { success: true, stats: results }

  } catch (error: any) {
    console.error('[Storage] Disconnection error:', error)
    return { success: false, error: error.message }
  }
}

// Get current storage settings
export async function getStorageSettings() {
  const session = await verifySession()
  if (session?.role !== 'OWNER') return { success: false, error: 'Unauthorized' }

  try {
    const settings = await (localPrisma as any).siteSettings.findUnique({
      where: { id: 'singleton' },
      select: {
        bunnyStorageEnabled: true,
        bunnyStorageRegion: true,
        bunnyStorageZoneName: true,
        bunnyStorageUrl: true,
      }
    })

    return { success: true, settings }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Save storage settings without migrating files (for updating API key, etc.)
export async function saveStorageSettings(
  type: StorageType,
  config: any
) {
  const session = await verifySession()
  if (session?.role !== 'OWNER') return { success: false, error: 'Unauthorized' }

  try {
    // Fetch existing settings to get current API key if not provided
    const existing = await (localPrisma as any).siteSettings.findUnique({
      where: { id: 'singleton' },
      select: { bunnyStorageApiKey: true }
    })
    
    // Determine which API key to use for testing
    let apiKeyForTesting = config.apiKey
    if (!apiKeyForTesting || apiKeyForTesting.trim() === '') {
      // Use existing API key from database
      apiKeyForTesting = existing?.bunnyStorageApiKey 
        ? decrypt(existing.bunnyStorageApiKey) || existing.bunnyStorageApiKey
        : null
    }
    
    if (!apiKeyForTesting) {
      return { success: false, error: 'API key is required' }
    }

    // Create client with the API key for testing
    const testConfig = { ...config, apiKey: apiKeyForTesting }
    const client = createStorageClient(type, testConfig)
    const testResult = await client.testConnection()
    
    if (!testResult.success) {
      return { success: false, error: testResult.error || 'Connection test failed' }
    }

    // Build update data - only include API key if provided
    const updateData: any = {
      bunnyStorageEnabled: true,
      bunnyStorageRegion: config.region || '',
      bunnyStorageZoneName: config.zoneName,
      bunnyStorageUrl: config.cdnUrl,
    }
    
    // Only update API key if a new one was provided
    if (config.apiKey && config.apiKey.trim() !== '') {
      updateData.bunnyStorageApiKey = encrypt(config.apiKey.trim())
    }

    // Save settings to database
    await (localPrisma as any).siteSettings.upsert({
      where: { id: 'singleton' },
      update: updateData,
      create: {
        id: 'singleton',
        bunnyStorageEnabled: true,
        bunnyStorageRegion: config.region || '',
        bunnyStorageZoneName: config.zoneName,
        bunnyStorageApiKey: encrypt(config.apiKey),
        bunnyStorageUrl: config.cdnUrl,
      }
    })

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error: any) {
    console.error('[Storage] Save settings error:', error)
    return { success: false, error: error.message }
  }
}
