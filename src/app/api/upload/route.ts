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
}

export async function POST(req: Request) {
  try {
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

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileExtension = file.name.split('.').pop()
    const filename = `${uuidv4()}.${fileExtension}`

    // Use Bunny Storage if enabled
    if (settings?.bunnyStorageEnabled && settings.bunnyStorageApiKey) {
      try {
        const storage = new BunnyStorageClient(
          settings.bunnyStorageApiKey,
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
