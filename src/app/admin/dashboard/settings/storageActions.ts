/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { verifySession } from '@/lib/auth'
import { prisma as localPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Bunny Storage API Client
class BunnyStorageClient {
  private apiKey: string
  private storageZoneName: string
  private region: string
  private baseUrl: string

  constructor(apiKey: string, storageZoneName: string, region: string) {
    this.apiKey = apiKey
    this.storageZoneName = storageZoneName
    this.region = region
    // Storage endpoint: storage.bunnycdn.com or region-specific
    this.baseUrl = region && region !== 'de' 
      ? `${region}.storage.bunnycdn.com`
      : 'storage.bunnycdn.com'
  }

  async uploadFile(path: string, buffer: Buffer, contentType?: string): Promise<string> {
    const url = `https://${this.baseUrl}/${this.storageZoneName}/${path}`
    
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

    return path
  }

  async deleteFile(path: string): Promise<void> {
    const url = `https://${this.baseUrl}/${this.storageZoneName}/${path}`
    
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
    const url = `https://${this.baseUrl}/${this.storageZoneName}/${path}`
    
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
    const url = `https://${this.baseUrl}/${this.storageZoneName}/${path}`
    
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
 * Connect to Bunny Storage and migrate all local images to storage
 */
export async function connectBunnyStorage(
  region: string,
  storageZoneName: string,
  apiKey: string,
  cdnUrl: string
) {
  const session = await verifySession()
  if (session?.role !== 'OWNER') return { success: false, error: 'Unauthorized' }

  if (!region || !storageZoneName || !apiKey || !cdnUrl) {
    return { success: false, error: 'All fields are required' }
  }

  try {
    const storage = new BunnyStorageClient(apiKey, storageZoneName, region)
    const db = localPrisma as any

    // 1. Get all posts with images
    const posts = await db.post.findMany({
      where: {
        content: {
          contains: '<img'
        }
      }
    })

    console.log(`Found ${posts.length} posts with images to migrate`)

    // 2. Extract and upload images
    const uploadPromises = []
    const publicDir = join(process.cwd(), 'public')

    for (const post of posts) {
      const imgRegex = /<img[^>]+src="([^">]+)"/g
      const matches = [...post.content.matchAll(imgRegex)]

      for (const match of matches) {
        const originalSrc = match[1]
        
        // Skip if already using external URL
        if (originalSrc.startsWith('http')) continue
        
        // Skip if not from uploads folder
        if (!originalSrc.startsWith('/uploads/')) continue

        const filename = originalSrc.replace('/uploads/', '')
        const localPath = join(publicDir, 'uploads', filename)

        uploadPromises.push(
          (async () => {
            try {
              // Read local file
              const buffer = await readFile(localPath)
              
              // Upload to Bunny Storage
              const storagePath = `uploads/${filename}`
              await storage.uploadFile(storagePath, buffer)
              
              return { originalSrc, newSrc: `${cdnUrl}/uploads/${filename}`, postId: post.id }
            } catch (err) {
              console.error(`Failed to upload ${filename}:`, err)
              return null
            }
          })()
        )
      }
    }

    const results = await Promise.all(uploadPromises)
    const successful = results.filter(r => r !== null)

    console.log(`Successfully uploaded ${successful.length} images`)

    // 3. Update post content with new URLs
    for (const result of successful) {
      if (!result) continue
      
      const post = await db.post.findUnique({ where: { id: result.postId } })
      if (post) {
        const updatedContent = post.content.replace(
          new RegExp(result.originalSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          result.newSrc
        )
        
        await db.post.update({
          where: { id: result.postId },
          data: { content: updatedContent }
        })
      }
    }

    // 4. Save settings
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
    return { success: true, migratedCount: successful.length }
  } catch (error: any) {
    console.error('Bunny Storage Connection Error:', error)
    return { success: false, error: error.message || 'Failed to connect to Bunny Storage' }
  }
}

/**
 * Disconnect from Bunny Storage and migrate all images back to local
 */
export async function disconnectBunnyStorage() {
  const session = await verifySession()
  if (session?.role !== 'OWNER') return { success: false, error: 'Unauthorized' }

  try {
    const settings = await (localPrisma as any).siteSettings.findUnique({
      where: { id: 'singleton' }
    })

    if (!settings?.bunnyStorageEnabled) {
      return { success: true, message: 'Already disconnected' }
    }

    const storage = new BunnyStorageClient(
      settings.bunnyStorageApiKey,
      settings.bunnyStorageZoneName,
      settings.bunnyStorageRegion
    )
    const db = localPrisma as any
    const publicDir = join(process.cwd(), 'public')

    // 1. Get all posts with Bunny Storage images
    const posts = await db.post.findMany({
      where: {
        content: {
          contains: settings.bunnyStorageUrl
        }
      }
    })

    console.log(`Found ${posts.length} posts with Bunny Storage images to migrate back`)

    // 2. Download and save images locally
    const downloadPromises = []

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
              // Download from Bunny Storage
              const buffer = await storage.downloadFile(filename)
              
              // Save locally
              const localPath = join(publicDir, filename)
              const { writeFile, mkdir } = await import('fs/promises')
              const { dirname } = await import('path')
              
              await mkdir(dirname(localPath), { recursive: true })
              await writeFile(localPath, buffer)
              
              return { originalSrc, newSrc: `/${filename}`, postId: post.id }
            } catch (err) {
              console.error(`Failed to download ${filename}:`, err)
              return null
            }
          })()
        )
      }
    }

    const results = await Promise.all(downloadPromises)
    const successful = results.filter(r => r !== null)

    console.log(`Successfully downloaded ${successful.length} images`)

    // 3. Update post content with local URLs
    for (const result of successful) {
      if (!result) continue
      
      const post = await db.post.findUnique({ where: { id: result.postId } })
      if (post) {
        const updatedContent = post.content.replace(
          new RegExp(result.originalSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          result.newSrc
        )
        
        await db.post.update({
          where: { id: result.postId },
          data: { content: updatedContent }
        })
      }
    }

    // 4. Disable storage connection
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
