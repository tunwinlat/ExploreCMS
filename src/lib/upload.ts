/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'

/** Maximum accepted image size (10 MB). */
export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024

/** Allowed image MIME types mapped to the file extension they are stored with. */
export const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
}

export function isValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false

  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }

  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    )
  }

  if (mimeType === 'image/gif') {
    return (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38
    )
  }

  if (mimeType === 'image/webp') {
    return (
      buffer[0] === 0x52 && // R
      buffer[1] === 0x49 && // I
      buffer[2] === 0x46 && // F
      buffer[3] === 0x46 && // F
      buffer[8] === 0x57 && // W
      buffer[9] === 0x45 && // E
      buffer[10] === 0x42 && // B
      buffer[11] === 0x50    // P
    )
  }

  if (mimeType === 'image/x-icon' || mimeType === 'image/vnd.microsoft.icon') {
    return (
      buffer[0] === 0x00 &&
      buffer[1] === 0x00 &&
      buffer[2] === 0x01 &&
      buffer[3] === 0x00
    )
  }

  return false
}

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

/**
 * Store an already-validated image and return its public URL.
 *
 * Uses Bunny Storage when enabled in the site settings and falls back to
 * `public/uploads/` when Bunny is disabled or the upload fails.
 * Callers must validate the buffer (size, MIME allowlist, magic bytes) first.
 */
export async function storeImage(buffer: Buffer, mimeType: string): Promise<string> {
  const fileExtension = ALLOWED_IMAGE_MIME_TYPES[mimeType]
  if (!fileExtension) {
    throw new Error(`Unsupported image type: ${mimeType}`)
  }
  const filename = `${uuidv4()}.${fileExtension}`

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
      await storage.uploadFile(storagePath, buffer, mimeType)

      // Return CDN URL
      return `${settings.bunnyStorageUrl}/uploads/${filename}`
    } catch (storageError: unknown) {
      console.error('Bunny Storage upload failed:', storageError)
      // Fall back to local upload
      console.log('Falling back to local storage...')
    }
  }

  // Local upload
  const uploadDir = join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, filename), buffer)

  return `/uploads/${filename}`
}
