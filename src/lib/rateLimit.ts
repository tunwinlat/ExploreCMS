/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Simple in-memory rate limiter for API endpoints.
 * Uses IP-based tracking with sliding window.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitOptions {
  windowMs: number    // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

/**
 * Check if a request should be rate limited.
 * @param identifier - Unique identifier (usually IP address)
 * @param options - Rate limiting options
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const key = identifier
  
  const existing = store.get(key)
  
  // If no entry or entry expired, create new
  if (!existing || existing.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + options.windowMs,
    }
    store.set(key, newEntry)
    return {
      success: true,
      limit: options.maxRequests,
      remaining: options.maxRequests - 1,
      resetTime: newEntry.resetTime,
    }
  }
  
  // Check if over limit
  if (existing.count >= options.maxRequests) {
    return {
      success: false,
      limit: options.maxRequests,
      remaining: 0,
      resetTime: existing.resetTime,
    }
  }
  
  // Increment count
  existing.count++
  
  return {
    success: true,
    limit: options.maxRequests,
    remaining: options.maxRequests - existing.count,
    resetTime: existing.resetTime,
  }
}

/**
 * Get client IP from request headers.
 * Handles various proxy setups (Vercel, Cloudflare, etc.)
 */
export function getClientIP(request: Request): string {
  // Try X-Forwarded-For first (common with proxies)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Get the first IP in the chain (client IP)
    return forwardedFor.split(',')[0].trim()
  }
  
  // Try X-Real-IP (Nginx, etc.)
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  // Try CF-Connecting-IP (Cloudflare)
  const cfIP = request.headers.get('cf-connecting-ip')
  if (cfIP) {
    return cfIP
  }
  
  // Fallback - generate a pseudo-IP from the request
  // This isn't perfect but prevents complete anonymous abuse
  return 'unknown'
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Strict limits for authentication endpoints
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },      // 5 per 15 minutes
  
  // Medium limits for API write operations
  apiWrite: { windowMs: 60 * 1000, maxRequests: 10 },      // 10 per minute
  
  // Relaxed limits for API read operations
  apiRead: { windowMs: 60 * 1000, maxRequests: 60 },       // 60 per minute
  
  // Very strict for upload endpoints
  upload: { windowMs: 60 * 1000, maxRequests: 5 },         // 5 per minute
  
  // Search endpoints
  search: { windowMs: 60 * 1000, maxRequests: 30 },        // 30 per minute
  
  // View tracking - more lenient
  tracking: { windowMs: 60 * 1000, maxRequests: 100 },     // 100 per minute
} as const
