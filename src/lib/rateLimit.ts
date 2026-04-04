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
 * Trusted proxy IP addresses or CIDR ranges.
 * These are IPs that we trust to provide accurate X-Forwarded-For headers.
 * 
 * By default, we only trust private IP ranges (local development, internal networks).
 * For production, add your specific load balancer/proxy IPs here.
 */
const TRUSTED_PROXIES = [
  // Private IP ranges (RFC 1918)
  '127.0.0.1',
  '::1',
  /^10\./,                              // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,     // 172.16.0.0/12
  /^192\.168\./,                        // 192.168.0.0/16
  /^fc00:/i,                            // IPv6 unique local
  /^fe80:/i,                            // IPv6 link-local
  /^::1$/,                              // IPv6 loopback
]

/**
 * Cloudflare IP ranges.
 * These are trusted when CF-Connecting-IP header is present.
 * @see https://www.cloudflare.com/ips/
 */
const CLOUDFLARE_IPS = [
  /^173\.245\.48\./,   // 173.245.48.0/20
  /^103\.21\.244\./,   // 103.21.244.0/22
  /^103\.22\.200\./,   // 103.22.200.0/22
  /^103\.31\.4\./,     // 103.31.4.0/22
  /^141\.101\.64\./,   // 141.101.64.0/18
  /^108\.162\.192\./,  // 108.162.192.0/18
  /^190\.93\.240\./,   // 190.93.240.0/20
  /^188\.114\.96\./,   // 188.114.96.0/20
  /^197\.234\.240\./,  // 197.234.240.0/22
  /^198\.41\.128\./,   // 198.41.128.0/17
  /^162\.158\.0\./,    // 162.158.0.0/15
  /^104\.16\.0\./,     // 104.16.0.0/13
  /^104\.24\.0\./,     // 104.24.0.0/14
  /^172\.64\.0\./,     // 172.64.0.0/13
  /^131\.0\.72\./,     // 131.0.72.0/22
  /^2400:cb00:/i,       // 2400:cb00::/32
  /^2606:4700:/i,       // 2606:4700::/32
  /^2803:f800:/i,       // 2803:f800::/32
  /^2405:b500:/i,       // 2405:b500::/32
  /^2405:8100:/i,       // 2405:8100::/32
  /^2a06:98c0:/i,       // 2a06:98c0::/29
  /^2c0f:f248:/i,       // 2c0f:f248::/32
]

/**
 * Check if an IP address matches any of the trusted proxy patterns.
 */
function isTrustedProxy(ip: string): boolean {
  return TRUSTED_PROXIES.some(pattern => 
    pattern instanceof RegExp ? pattern.test(ip) : pattern === ip
  )
}

/**
 * Check if an IP address is a known Cloudflare proxy.
 */
function isCloudflareProxy(ip: string): boolean {
  return CLOUDFLARE_IPS.some(pattern => pattern.test(ip))
}

/**
 * Get the connecting IP (the immediate peer's IP).
 * In production this would come from the connection info.
 * For now, we use a heuristic based on headers or return null.
 */
function getConnectingIP(request: Request): string | null {
  // In a real server environment, this would be the socket remoteAddress.
  // Since we're in a serverless/edge environment, we rely on headers
  // that are set by the platform (not user-controllable).
  
  // Next.js/Vercel specific: use the platform-provided IP
  const vercelIP = request.headers.get('x-vercel-forwarded-for') || 
                   request.headers.get('x-vercel-ip')
  if (vercelIP) {
    return vercelIP.split(',')[0].trim()
  }
  
  // If we can't determine the connecting IP, return null
  // and rely on safer fallback mechanisms
  return null
}

/**
 * Get client IP from request headers.
 * Handles various proxy setups (Vercel, Cloudflare, etc.)
 * 
 * SECURITY: Only trusts forwarded headers from known trusted proxies.
 * Direct connections or untrusted proxies return a fallback identifier.
 */
export function getClientIP(request: Request): string {
  const connectingIP = getConnectingIP(request)
  const isTrusted = connectingIP ? isTrustedProxy(connectingIP) : false
  
  // Cloudflare-specific: Check CF-Connecting-IP only if request comes from Cloudflare
  const cfIP = request.headers.get('cf-connecting-ip')
  if (cfIP && connectingIP && isCloudflareProxy(connectingIP)) {
    return cfIP
  }
  
  // Only trust X-Forwarded-For from trusted proxies
  if (isTrusted) {
    const forwardedFor = request.headers.get('x-forwarded-for')
    if (forwardedFor) {
      // Get the first IP in the chain (client IP)
      const clientIP = forwardedFor.split(',')[0].trim()
      // Validate the IP format
      if (isValidIP(clientIP)) {
        return clientIP
      }
    }
    
    // Try X-Real-IP from trusted proxies only
    const realIP = request.headers.get('x-real-ip')
    if (realIP && isValidIP(realIP)) {
      return realIP
    }
  }
  
  // Fallback: If we have a trusted connecting IP, use that
  if (connectingIP && isValidIP(connectingIP)) {
    return connectingIP
  }
  
  // Last resort: return 'unknown' to prevent abuse
  // This prevents IP spoofing but may reduce rate limit effectiveness
  // for shared NAT scenarios
  return 'unknown'
}

/**
 * Validate IP address format (IPv4 or IPv6).
 */
function isValidIP(ip: string): boolean {
  // Basic IPv4 validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  // Basic IPv6 validation (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F:]{2,39})$/
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
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
