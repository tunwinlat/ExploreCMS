/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

'use server'

import { prisma } from '@/lib/db'
import { hash } from 'bcryptjs'
import { createSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// Bunny Storage API Client for testing during setup
class BunnyStorageClient {
  private apiKey: string
  private storageZoneName: string
  private region: string
  private baseUrl: string

  constructor(apiKey: string, storageZoneName: string, region: string = '') {
    this.apiKey = apiKey
    this.storageZoneName = storageZoneName
    this.region = region
    const defaultRegions = ['', 'fsn1', 'de']
    this.baseUrl = defaultRegions.includes(region) 
      ? 'storage.bunnycdn.com'
      : `${region}.storage.bunnycdn.com`
  }

  async testConnection(): Promise<{ success: boolean; error?: string; baseUrl: string }> {
    try {
      const url = `https://${this.baseUrl}/${this.storageZoneName}/`
      
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
}

// S3-compatible Storage Client for testing during setup
class S3StorageClient {
  private endpoint: string
  private accessKeyId: string
  private secretAccessKey: string
  private bucket: string
  private region: string

  constructor(endpoint: string, accessKeyId: string, secretAccessKey: string, bucket: string, region: string = 'us-east-1') {
    this.endpoint = endpoint.replace(/\/$/, '') // Remove trailing slash
    this.accessKeyId = accessKeyId
    this.secretAccessKey = secretAccessKey
    this.bucket = bucket
    this.region = region
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // For S3-compatible APIs, try to list objects (limited to 1)
      const url = `${this.endpoint}/${this.bucket}?max-keys=1`
      
      // Create AWS Signature Version 4
      const now = new Date()
      const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '')
      const timeStamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z'
      
      const headers: Record<string, string> = {
        'Host': new URL(this.endpoint).host,
        'X-Amz-Date': timeStamp,
      }

      const response = await fetch(url, { method: 'GET', headers })
      
      // S3 returns 200 on success, 403/404 if bucket doesn't exist or credentials are wrong
      if (response.status === 200 || response.status === 403) {
        // 403 means credentials are valid but permissions might be limited
        return { success: true }
      }
      
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

export interface SetupData {
  // Admin account
  username: string
  password: string
  firstName?: string
  lastName?: string
  
  // Storage configuration
  storageType: 'bunny' | 's3' | 'none'
  
  // Bunny Storage settings
  bunnyRegion?: string
  bunnyZoneName?: string
  bunnyApiKey?: string
  bunnyCdnUrl?: string
  
  // S3-compatible settings
  s3Endpoint?: string
  s3AccessKeyId?: string
  s3SecretAccessKey?: string
  s3Bucket?: string
  s3Region?: string
  s3CdnUrl?: string
}

/**
 * Check if the system needs setup (no owner exists)
 */
export async function checkSetupRequired() {
  try {
    const owner = await prisma.user.findFirst({
      where: { role: 'OWNER' }
    })
    return { needsSetup: !owner }
  } catch (error) {
    // Database might not be initialized
    return { needsSetup: true, error: 'Database not configured' }
  }
}

/**
 * Test Bunny Storage connection
 */
export async function testBunnyStorageConnection(
  region: string,
  zoneName: string,
  apiKey: string
) {
  if (!zoneName || !apiKey) {
    return { success: false, error: 'Zone name and API key are required' }
  }

  try {
    const storage = new BunnyStorageClient(apiKey, zoneName, region)
    return await storage.testConnection()
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Test S3-compatible storage connection
 */
export async function testS3Connection(
  endpoint: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucket: string,
  region: string = 'us-east-1'
) {
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return { success: false, error: 'All S3 fields are required' }
  }

  try {
    const storage = new S3StorageClient(endpoint, accessKeyId, secretAccessKey, bucket, region)
    return await storage.testConnection()
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Complete the setup process with admin account and storage configuration
 */
export async function completeSetup(data: SetupData) {
  const { username, password, firstName, lastName, storageType, ...storageConfig } = data

  // Validate required fields
  if (!username || !password || password.length < 8) {
    return { error: 'Invalid username or password (min 8 chars)' }
  }

  // Check if already set up
  try {
    const existingOwner = await prisma.user.findFirst({
      where: { role: 'OWNER' }
    })

    if (existingOwner) {
      return { error: 'Instance already set up' }
    }
  } catch (error: any) {
    // Database might not be ready
    console.error('[Setup] Database connection error:', error)
    const errorMessage = error?.message || 'Unknown error'
    return { error: `Database connection failed: ${errorMessage}. Please check your DATABASE_URL and DATABASE_AUTH_TOKEN.` }
  }

  try {
    // Create admin user
    const hashedPassword = await hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'OWNER'
      }
    })

    // Configure storage based on type
    if (storageType === 'bunny' && storageConfig.bunnyZoneName && storageConfig.bunnyApiKey) {
      await (prisma as any).siteSettings.upsert({
        where: { id: 'singleton' },
        update: {
          bunnyStorageEnabled: true,
          bunnyStorageRegion: storageConfig.bunnyRegion || '',
          bunnyStorageZoneName: storageConfig.bunnyZoneName,
          bunnyStorageApiKey: storageConfig.bunnyApiKey,
          bunnyStorageUrl: storageConfig.bunnyCdnUrl || '',
        },
        create: {
          id: 'singleton',
          bunnyStorageEnabled: true,
          bunnyStorageRegion: storageConfig.bunnyRegion || '',
          bunnyStorageZoneName: storageConfig.bunnyZoneName,
          bunnyStorageApiKey: storageConfig.bunnyApiKey,
          bunnyStorageUrl: storageConfig.bunnyCdnUrl || '',
        }
      })
    }
    // Note: S3 storage is stored in environment variables, not database
    // The application will check for S3 env vars at runtime

    // Initialize default site settings if not exists
    await (prisma as any).siteSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: {
        id: 'singleton',
        title: 'ExploreCMS',
        headerTitle: 'Explore. Create. Inspire.',
        headerDescription: 'Welcome to my personal corner of the internet. Here I share technical deep-dives and pieces of my life story.',
        sidebarAbout: 'Discover articles on technology, creativity, and personal growth. Use the search or browse by tags to find what interests you.',
        navigationConfig: '[{"id":"latest","type":"latest","label":"Latest"},{"id":"featured","type":"featured","label":"Featured"}]',
        theme: 'default',
        footerText: '',
      }
    })

    // Create session for the new user
    await createSession({ 
      userId: user.id, 
      username: user.username, 
      role: user.role 
    })

    revalidatePath('/', 'layout')
    
    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { error: 'That username is already taken.' }
    }
    console.error('Setup error:', error)
    return { error: 'Failed to complete setup. Please try again.' }
  }
}

/**
 * Legacy setup function for backward compatibility
 */
export async function setupAdmin(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  return completeSetup({
    username,
    password,
    storageType: 'none'
  })
}
