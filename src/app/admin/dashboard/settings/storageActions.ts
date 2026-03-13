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
import { readFile, access } from 'fs/promises'
import { join } from 'path'

// Bunny Storage API Client
class BunnyStorageClient {
  private apiKey: string
  private storageZoneName: string
  private region: string
  private baseUrl: string

  constructor(apiKey: string, storageZoneName: string, region: string = '') {
    this.apiKey = apiKey
    this.storageZoneName = storageZoneName
    this.region = region
    // Storage endpoint: storage.bunnycdn.com (default/Falkenstein/Frankfurt) or region-specific
    // Region-specific endpoints: la.storage.bunnycdn.com, ny.storage.bunnycdn.com, etc.
    const defaultRegions = ['', 'fsn1', 'de']
    this.baseUrl = defaultRegions.includes(region) 
      ? 'storage.bunnycdn.com'
      : `${region}.storage.bunnycdn.com`
  }

  async testConnection(): Promise<{ success: boolean; error?: string; baseUrl: string }> {
    try {
      const url = `https://${this.baseUrl}/${this.storageZoneName}/`
      console.log('Testing connection to:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'AccessKey': this.apiKey,
        },
      })

      if (!response.ok) {
        const error = await response.text()
        return { success: false, error: `HTTP ${response.status}: ${error}`, baseUrl: this.baseUrl }
      }

      return { success: true, baseUrl: this.baseUrl }
    } catch (error: any) {
      return { success: false, error: error.message, baseUrl: this.baseUrl }
    }
  }

  async uploadFile(path: string, buffer: Buffer, contentType?: string): Promise<string> {
    // Bunny Storage expects forward slashes in path
    const normalizedPath = path.replace(/\\/g, '/')
    const url = `https://${this.baseUrl}/${this.storageZoneName}/${normalizedPath}`
    
    console.log(`Uploading to: ${url}`)
    
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

    return normalizedPath
  }

  async deleteFile(path: string): Promise<void> {
    const normalizedPath = path.replace(/\\/g, '/')
    const url = `https://${this.baseUrl}/${this.storageZoneName}/${normalizedPath}`
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'AccessKey': this.apiKey,
      },
    })

    if (!response.ok && response.status !== 404) {
      const error = await response.text()
      throw new Error(`Bunny Storage delete failed: ${response.status} ${error}`)
    }
  }

  async listFiles(path: string = ''): Promise<any[]> {
    const normalizedPath = path.replace(/\\/g, '/')
    const url = `https://${this.baseUrl}/${this.storageZoneName}/${normalizedPath}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'AccessKey': this.apiKey,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Bunny Storage list failed: ${response.status} ${error}`)
    }

    return response.json()
  }

  async downloadFile(path: string): Promise<Buffer> {
    const normalizedPath = path.replace(/\\/g, '/')
    const url = `https://${this.baseUrl}/${this.storageZoneName}/${normalizedPath}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'AccessKey': this.apiKey,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Bunny Storage download failed: ${response.status} ${error}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }
}

/**
 * Check if file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Connect to Bunny Storage and migrate all local images to storage
 */
export async function connectBunnyStorage(
  region: string,
  storageZoneName: string,
  apiKey: string,
  cdnUrl: string
) {
  console.log('=== connectBunnyStorage called ===')
  console.log('Region:', region || '(default)')
  console.log('Zone:', storageZoneName)
  console.log('CDN URL:', cdnUrl)
  
  try {
    const session = await verifySession()
    console.log('Session verified:', session?.role)
    
    if (session?.role !== 'OWNER') {
      return { success: false, error: 'Unauthorized' }
    }

    if (!storageZoneName || !apiKey || !cdnUrl) {
      return { success: false, error: 'Zone name, API key, and CDN URL are required' }
    }

    const storage = new BunnyStorageClient(apiKey, storageZoneName, region)
    
    // Use getPostDb() to get the correct database (local or remote Bunny DB)
    const postDb = await getPostDb() as any
    const db = localPrisma as any

    // Test connection first
    console.log('Testing connection to Bunny Storage...')
    const testResult = await storage.testConnection()
    if (!testResult.success) {
      console.error('Connection test failed:', testResult.error)
      return { success: false, error: `Connection failed: ${testResult.error}. Make sure your zone name and API key are correct.` }
    }
    console.log('Connection test successful, using endpoint:', testResult.baseUrl)

    // 1. Get all posts with images from the active database
    console.log('Fetching posts with images...')
    const posts = await postDb.post.findMany({
      where: {
        content: {
          contains: '<img'
        }
      }
    })

    console.log(`Found ${posts.length} posts with images to migrate`)

    if (posts.length === 0) {
      console.log('No posts with images found, just saving settings...')
      // No posts with images, just save settings
      await db.siteSettings.update({
        where: { id: 'singleton' },
        data: {
          bunnyStorageEnabled: true,
          bunnyStorageRegion: region,
          bunnyStorageZoneName: storageZoneName,
          bunnyStorageApiKey: apiKey,
          bunnyStorageUrl: cdnUrl,
        }
      })
      
      revalidatePath('/', 'layout')
      return { success: true, migratedCount: 0 }
    }
    
    // Limit concurrent uploads to avoid overwhelming the server
    const MAX_CONCURRENT = 5

    // 2. Extract and upload images
    const uploadPromises: Promise<{ originalSrc: string; newSrc: string; postId: string } | null>[] = []
    const publicDir = join(process.cwd(), 'public')
    const errors: string[] = []

    for (const post of posts) {
      const imgRegex = /<img[^>]+src="([^">]+)"/g
      const matches = [...post.content.matchAll(imgRegex)]

      console.log(`Post ${post.id}: found ${matches.length} images`)

      for (const match of matches) {
        const originalSrc = match[1]
        
        // Skip if already using external URL
        if (originalSrc.startsWith('http')) {
          console.log(`Skipping external URL: ${originalSrc}`)
          continue
        }
        
        // Skip if not from uploads folder
        if (!originalSrc.startsWith('/uploads/')) {
          console.log(`Skipping non-upload path: ${originalSrc}`)
          continue
        }

        const filename = originalSrc.replace('/uploads/', '')
        const localPath = join(publicDir, 'uploads', filename)

        uploadPromises.push(
          (async () => {
            try {
              // Check if file exists
              const exists = await fileExists(localPath)
              if (!exists) {
                console.error(`File not found: ${localPath}`)
                errors.push(`File not found: ${filename}`)
                return null
              }

              console.log(`Reading file: ${localPath}`)
              
              // Read local file
              const buffer = await readFile(localPath)
              
              console.log(`Uploading ${filename} (${buffer.length} bytes) to Bunny Storage...`)
              
              // Upload to Bunny Storage
              const storagePath = `uploads/${filename}`
              await storage.uploadFile(storagePath, buffer)
              
              console.log(`Successfully uploaded: ${filename}`)
              
              return { originalSrc, newSrc: `${cdnUrl}/uploads/${filename}`, postId: post.id }
            } catch (err: any) {
              console.error(`Failed to upload ${filename}:`, err.message)
              errors.push(`${filename}: ${err.message}`)
              return null
            }
          })()
        )
      }
    }

    // Process uploads with concurrency limit
    const results: ({ originalSrc: string; newSrc: string; postId: string } | null)[] = []
    for (let i = 0; i < uploadPromises.length; i += MAX_CONCURRENT) {
      const batch = uploadPromises.slice(i, i + MAX_CONCURRENT)
      const batchResults = await Promise.all(batch)
      results.push(...batchResults)
      console.log(`Processed batch ${Math.floor(i / MAX_CONCURRENT) + 1}/${Math.ceil(uploadPromises.length / MAX_CONCURRENT)}`)
    }
    
    const successful = results.filter((r): r is { originalSrc: string; newSrc: string; postId: string } => r !== null)

    console.log(`Successfully uploaded ${successful.length} images`)
    if (errors.length > 0) {
      console.error('Upload errors:', errors)
    }

    // 3. Update post content with new URLs in the active database
    for (const result of successful) {
      try {
        const post = await postDb.post.findUnique({ where: { id: result.postId } })
        if (post) {
          const updatedContent = post.content.replace(
            new RegExp(result.originalSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            result.newSrc
          )
          
          await postDb.post.update({
            where: { id: result.postId },
            data: { content: updatedContent }
          })
          
          console.log(`Updated post ${result.postId}: ${result.originalSrc} -> ${result.newSrc}`)
        }
      } catch (err: any) {
        console.error(`Failed to update post ${result.postId}:`, err.message)
      }
    }

    // 4. Save settings (always to local database)
    await db.siteSettings.update({
      where: { id: 'singleton' },
      data: {
        bunnyStorageEnabled: true,
        bunnyStorageRegion: region,
        bunnyStorageZoneName: storageZoneName,
        bunnyStorageApiKey: apiKey,
        bunnyStorageUrl: cdnUrl,
      }
    })

    revalidatePath('/', 'layout')
    
    return { 
      success: true, 
      migratedCount: successful.length,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error: any) {
    console.error('Bunny Storage Connection Error:', error)
    return { success: false, error: error.message || 'Failed to connect to Bunny Storage' }
  }
}

/**
 * Disconnect from Bunny Storage and migrate all images back to local
 */
export async function disconnectBunnyStorage() {
  console.log('=== disconnectBunnyStorage called ===')
  
  try {
    const session = await verifySession()
    console.log('Session:', session?.role)
    
    if (session?.role !== 'OWNER') {
      return { success: false, error: 'Unauthorized' }
    }

    console.log('Fetching settings...')
    const settings = await (localPrisma as any).siteSettings.findUnique({
      where: { id: 'singleton' }
    })

    console.log('Settings found:', !!settings)
    console.log('Storage enabled:', settings?.bunnyStorageEnabled)
    console.log('Storage URL:', settings?.bunnyStorageUrl)

    if (!settings?.bunnyStorageEnabled) {
      return { success: true, message: 'Already disconnected' }
    }

    // Use getPostDb() to get the correct database (local or remote Bunny DB)
    const postDb = await getPostDb() as any
    const db = localPrisma as any
    const publicDir = join(process.cwd(), 'public')

    // 1. Get all posts with Bunny Storage images from the active database
    console.log('Searching for posts with Bunny Storage URL:', settings.bunnyStorageUrl)
    
    // If no bunnyStorageUrl, just disable and return
    if (!settings.bunnyStorageUrl) {
      console.log('No CDN URL found, just disabling...')
      await db.siteSettings.update({
        where: { id: 'singleton' },
        data: { bunnyStorageEnabled: false }
      })
      revalidatePath('/', 'layout')
      return { success: true, migratedCount: 0 }
    }

    console.log('Querying posts...')
    let posts: any[] = []
    try {
      posts = await postDb.post.findMany({
        where: {
          content: {
            contains: settings.bunnyStorageUrl
          }
        }
      })
    } catch (dbErr: any) {
      console.error('Database query failed:', dbErr.message)
      // If query fails (maybe wrong DB), just disable storage
      await db.siteSettings.update({
        where: { id: 'singleton' },
        data: { bunnyStorageEnabled: false }
      })
      revalidatePath('/', 'layout')
      return { success: true, migratedCount: 0, warning: 'Database query failed, disabled storage only' }
    }

    console.log(`Found ${posts.length} posts with Bunny Storage images to migrate back`)

    // If no posts have Bunny Storage images, just disable
    if (posts.length === 0) {
      console.log('No posts with Bunny Storage images found, just disabling...')
      await db.siteSettings.update({
        where: { id: 'singleton' },
        data: { bunnyStorageEnabled: false }
      })
      revalidatePath('/', 'layout')
      return { success: true, migratedCount: 0 }
    }

    const storage = new BunnyStorageClient(
      settings.bunnyStorageApiKey,
      settings.bunnyStorageZoneName,
      settings.bunnyStorageRegion
    )

    // 2. Download and save images locally
    const downloadPromises: Promise<{ originalSrc: string; newSrc: string; postId: string } | null>[] = []

    for (const post of posts) {
      const imgRegex = /<img[^>]+src="([^">]+)"/g
      const matches = [...post.content.matchAll(imgRegex)]

      for (const match of matches) {
        const originalSrc = match[1]
        
        // Skip if not from Bunny Storage
        if (!originalSrc.includes(settings.bunnyStorageUrl)) continue

        const filename = originalSrc.replace(`${settings.bunnyStorageUrl}/`, '')

        downloadPromises.push(
          (async () => {
            try {
              console.log(`Downloading ${filename} from Bunny Storage...`)
              
              // Download from Bunny Storage
              const buffer = await storage.downloadFile(filename)
              
              // Save locally
              const localPath = join(publicDir, filename)
              const { writeFile, mkdir } = await import('fs/promises')
              const { dirname } = await import('path')
              
              await mkdir(dirname(localPath), { recursive: true })
              await writeFile(localPath, buffer)
              
              console.log(`Saved locally: ${localPath}`)
              
              return { originalSrc, newSrc: `/${filename}`, postId: post.id }
            } catch (err: any) {
              console.error(`Failed to download ${filename}:`, err.message)
              return null
            }
          })()
        )
      }
    }

    // Process downloads with concurrency limit
    const MAX_CONCURRENT = 5
    const results: ({ originalSrc: string; newSrc: string; postId: string } | null)[] = []
    for (let i = 0; i < downloadPromises.length; i += MAX_CONCURRENT) {
      const batch = downloadPromises.slice(i, i + MAX_CONCURRENT)
      const batchResults = await Promise.all(batch)
      results.push(...batchResults)
      console.log(`Processed download batch ${Math.floor(i / MAX_CONCURRENT) + 1}/${Math.ceil(downloadPromises.length / MAX_CONCURRENT)}`)
    }
    
    const successful = results.filter((r): r is { originalSrc: string; newSrc: string; postId: string } => r !== null)

    console.log(`Successfully downloaded ${successful.length} images`)

    // 3. Update post content with local URLs in the active database
    for (const result of successful) {
      try {
        const post = await postDb.post.findUnique({ where: { id: result.postId } })
        if (post) {
          const updatedContent = post.content.replace(
            new RegExp(result.originalSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            result.newSrc
          )
          
          await postDb.post.update({
            where: { id: result.postId },
            data: { content: updatedContent }
          })
          
          console.log(`Updated post ${result.postId}`)
        }
      } catch (err: any) {
        console.error(`Failed to update post ${result?.postId}:`, err.message)
      }
    }

    // 4. Disable storage connection (always in local database)
    await db.siteSettings.update({
      where: { id: 'singleton' },
      data: { bunnyStorageEnabled: false }
    })

    revalidatePath('/', 'layout')
    return { success: true, migratedCount: successful.length }
  } catch (error: any) {
    console.error('Bunny Storage Disconnection Error:', error)
    return { success: false, error: error.message || 'Failed to disconnect from Bunny Storage' }
  }
}

/**
 * Get current storage settings (without sensitive data)
 */
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
