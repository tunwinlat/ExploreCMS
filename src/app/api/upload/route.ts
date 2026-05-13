/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createWriteStream, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit'
import { isValidImageSignature } from '@/lib/upload'
import { decrypt } from '@/lib/crypto'

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
    // Storage endpoint: storage.bunnycdn.com (default/Falkenstein/Frankfurt) or region-specific
    // Region-specific endpoints: la.storage.bunnycdn.com, ny.storage.bunnycdn.com, etc.
    const defaultRegions = ['', 'fsn1', 'de']
    this.baseUrl = defaultRegions.includes(region) 
      ? 'storage.bunnycdn.com'
      : `${region}.storage.bunnycdn.com`
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
}

export async function POST(req: Request) {
  try {
    // Rate limiting
    const clientIP = getClientIP(req)
    const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.upload)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: { 'X-RateLimit-Reset': String(rateLimit.resetTime) } }
      )
    }

    const session = await verifySession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Bunny Storage is enabled
    const settings = await (prisma as any).siteSettings.findUnique({
      where: { id: 'singleton' },
      select: {
        bunnyStorageEnabled: true,
        bunnyStorageRegion: true,
        bunnyStorageZoneName: true,
        bunnyStorageApiKey: true,
        bunnyStorageUrl: true,
      }
    })

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Enforce file size limit (10 MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 413 })
    }

    // SECURITY FIX: Validate file type against an explicit allowlist of safe image types
    const ALLOWED_MIME_TYPES: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/x-icon': 'ico',
      'image/vnd.microsoft.icon': 'ico',
    }

    const mimeType = file.type.toLowerCase()
    if (!Object.prototype.hasOwnProperty.call(ALLOWED_MIME_TYPES, mimeType)) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 415 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // SECURITY FIX: Prevent MIME spoofing by verifying magic bytes
    if (!isValidImageSignature(buffer, mimeType)) {
      return NextResponse.json({ error: 'File content does not match the provided image type.' }, { status: 415 })
    }

    // Derive extension from validated MIME type (ignore client-supplied extension)
    const fileExtension = ALLOWED_MIME_TYPES[mimeType]

    const filename = `${uuidv4()}.${fileExtension}`

    // Use Bunny Storage if enabled
    if (settings?.bunnyStorageEnabled && settings.bunnyStorageApiKey) {
      try {
        const decryptedKey = decrypt(settings.bunnyStorageApiKey) || settings.bunnyStorageApiKey
        const storage = new BunnyStorageClient(
          decryptedKey,
          settings.bunnyStorageZoneName,
          settings.bunnyStorageRegion
        )

        const storagePath = `uploads/${filename}`
        await storage.uploadFile(storagePath, buffer, file.type)

        // Return CDN URL
        const cdnUrl = `${settings.bunnyStorageUrl}/uploads/${filename}`
        return NextResponse.json({ url: cdnUrl })
      } catch (storageError: any) {
        console.error('Bunny Storage upload failed:', storageError)
        // Fall back to local upload
        console.log('Falling back to local storage...')
      }
    }

    // Local upload
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true })
    }

    const path = join(uploadDir, filename)
    const stream = createWriteStream(path)
    stream.write(buffer)
    stream.end()

    return NextResponse.json({ url: `/uploads/${filename}` })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}

