import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['nodemailer'],
  images: {
    // Post covers are extracted from post HTML and may live on any host
    // (Bunny CDN or embedded third-party images), so allow any https origin.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async rewrites() {
    return [
      {
        // Conventional feed URLs: /feed/en.xml → /feed/en (per-language RSS)
        source: '/feed/:lang(en|my|[a-z]{2}).xml',
        destination: '/feed/:lang',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // Serve uploaded SVGs with restrictive CSP to prevent embedded script execution
        source: '/uploads/:path*.svg',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
