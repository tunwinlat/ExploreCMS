/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createClient } from '@libsql/client';

/**
 * Run incremental schema migrations on an existing LibSQL database.
 * Safe to call on every startup — each ALTER TABLE is silently ignored
 * if the column already exists.
 */
export async function runSchemaMigrations(): Promise<void> {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url) return;
  if (!url.startsWith('libsql://') && !url.startsWith('https://') && !url.startsWith('wss://')) return;

  try {
    const client = createClient({ url, authToken: authToken || undefined });
    const performanceIndexes = [
      `CREATE INDEX IF NOT EXISTS "Post_published_createdAt_idx" ON "Post"("published", "createdAt")`,
      `CREATE INDEX IF NOT EXISTS "Post_translationGroupId_published_idx" ON "Post"("translationGroupId", "published")`,
      `CREATE INDEX IF NOT EXISTS "Project_published_featured_order_createdAt_idx" ON "Project"("published", "featured", "order", "createdAt")`,
      `CREATE INDEX IF NOT EXISTS "ProjectImage_projectId_order_idx" ON "ProjectImage"("projectId", "order")`,
      `CREATE INDEX IF NOT EXISTS "PhotoAlbum_published_featured_order_createdAt_idx" ON "PhotoAlbum"("published", "featured", "order", "createdAt")`,
      `CREATE INDEX IF NOT EXISTS "Photo_albumId_order_idx" ON "Photo"("albumId", "order")`,
    ];

    // Fast path: check if the latest migration artifact already exists.
    // This avoids running 30+ sequential ALTER TABLE statements on every cold start
    // for databases that are already fully up to date.
    // IMPORTANT: whenever you add a new migration below, update this probe to check
    // for the NEWEST table/column — otherwise existing deployments never receive it.
    try {
      // One request verifies every compatibility artifact plus the newest
      // performance index. INDEXED BY makes SQLite fail if that index is absent.
      await client.execute({
        sql: `SELECT
          (SELECT "id" FROM "PostIdempotencyKey" WHERE 1=0),
          (SELECT "seoLlmsTxtEnabled" FROM "SiteSettings" WHERE 1=0),
          (SELECT "seoNoIndex" FROM "Post" WHERE 1=0),
          (SELECT "craftDocumentId" FROM "Post" WHERE 1=0),
          (SELECT "craftLastModifiedAt" FROM "Post" WHERE 1=0),
          (SELECT "craftUnlinked" FROM "Post" WHERE 1=0),
          (SELECT "craftServerUrl" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftApiToken" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftFolderId" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftFolderName" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftSyncMode" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftEnabled" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftWriteAccess" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftError" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftLastSyncAt" FROM "SiteSettings" WHERE 1=0),
          (SELECT "name" FROM "BackgroundJobLock" WHERE 1=0),
          (SELECT "id" FROM "Post" INDEXED BY "Post_published_createdAt_idx" WHERE 1=0),
          (SELECT "id" FROM "Post" INDEXED BY "Post_translationGroupId_published_idx" WHERE 1=0),
          (SELECT "id" FROM "Project" INDEXED BY "Project_published_featured_order_createdAt_idx" WHERE 1=0),
          (SELECT "id" FROM "ProjectImage" INDEXED BY "ProjectImage_projectId_order_idx" WHERE 1=0),
          (SELECT "id" FROM "PhotoAlbum" INDEXED BY "PhotoAlbum_published_featured_order_createdAt_idx" WHERE 1=0),
          (SELECT "id" FROM "Photo" INDEXED BY "Photo_albumId_order_idx" WHERE 1=0)`,
        args: [],
      });
      // Latest artifacts exist → all migrations have been applied, nothing to do.
      return;
    } catch {
      // Artifact missing → proceed with migrations below.
    }

    // Most upgrades only lack the newest indexes. Confirm the prior schema in
    // one request, then install all indexes in one LibSQL batch instead of
    // replaying every historical ALTER TABLE across the network.
    try {
      await client.execute({
        sql: `SELECT
          (SELECT "id" FROM "PostIdempotencyKey" WHERE 1=0),
          (SELECT "seoLlmsTxtEnabled" FROM "SiteSettings" WHERE 1=0),
          (SELECT "seoNoIndex" FROM "Post" WHERE 1=0),
          (SELECT "craftDocumentId" FROM "Post" WHERE 1=0),
          (SELECT "craftLastModifiedAt" FROM "Post" WHERE 1=0),
          (SELECT "craftUnlinked" FROM "Post" WHERE 1=0),
          (SELECT "craftServerUrl" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftApiToken" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftFolderId" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftFolderName" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftSyncMode" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftEnabled" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftWriteAccess" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftError" FROM "SiteSettings" WHERE 1=0),
          (SELECT "craftLastSyncAt" FROM "SiteSettings" WHERE 1=0),
          (SELECT "name" FROM "BackgroundJobLock" WHERE 1=0)`,
        args: [],
      });
      await client.batch(
        performanceIndexes.map((sql) => ({ sql, args: [] })),
        'write'
      );
      console.log('[DB Migrate] Public query indexes applied');
      return;
    } catch {
      // Older schema → use the complete idempotent migration list below.
    }

    // v2 → component system columns
    const migrations = [
      // v1 compatibility for the earliest production schemas
      `ALTER TABLE "Post" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "Post" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "enabledComponents" TEXT NOT NULL DEFAULT '["blog"]'`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "defaultComponent" TEXT NOT NULL DEFAULT 'blog'`,
      // v3 → post content formats
      `ALTER TABLE "Post" ADD COLUMN "contentFormat" TEXT NOT NULL DEFAULT 'html'`,
      // v4 → GitHub integration columns
      `ALTER TABLE "SiteSettings" ADD COLUMN "githubEnabled" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "githubAccessToken" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "githubUsername" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "githubSyncMode" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "githubLastSyncAt" TEXT`,
      `ALTER TABLE "Project" ADD COLUMN "contentFormat" TEXT NOT NULL DEFAULT 'html'`,
      `ALTER TABLE "Project" ADD COLUMN "githubRepoId" TEXT`,
      `ALTER TABLE "Project" ADD COLUMN "githubRepoFullName" TEXT`,
      `ALTER TABLE "Project" ADD COLUMN "githubSyncEnabled" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "Project" ADD COLUMN "githubLastSyncAt" TEXT`,
      `ALTER TABLE "Project" ADD COLUMN "githubDefaultBranch" TEXT`,
      // v5 → Multilingual support columns
      `ALTER TABLE "Post" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en'`,
      `ALTER TABLE "Post" ADD COLUMN "translationGroupId" TEXT`,
      // v6 → Email feature columns
      `ALTER TABLE "User" ADD COLUMN "email" TEXT`,
      `ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "User" ADD COLUMN "emailVerificationToken" TEXT`,
      `ALTER TABLE "User" ADD COLUMN "emailVerificationExpiry" DATETIME`,
      `ALTER TABLE "User" ADD COLUMN "passwordResetToken" TEXT`,
      `ALTER TABLE "User" ADD COLUMN "passwordResetExpiry" DATETIME`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "emailProvider" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "emailFromName" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "emailFromAddress" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "resendApiKey" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "smtpHost" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "smtpPort" INTEGER`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "smtpSecure" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "smtpUser" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "smtpPassword" TEXT`,
      // v7 → Dynamic particle background
      `ALTER TABLE "SiteSettings" ADD COLUMN "dynamicPattern" BOOLEAN NOT NULL DEFAULT true`,
      // v8 → REST API keys
      `CREATE TABLE "ApiKey" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "keyHash" TEXT NOT NULL,
        "prefix" TEXT NOT NULL,
        "permissions" TEXT NOT NULL DEFAULT '[]',
        "createdById" TEXT NOT NULL,
        "lastUsedAt" DATETIME,
        "expiresAt" DATETIME,
        "revoked" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash")`,
      `CREATE INDEX "ApiKey_createdById_idx" ON "ApiKey"("createdById")`,
      // v9 → durable POST idempotency
      `CREATE TABLE "PostIdempotencyKey" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "authorId" TEXT NOT NULL,
        "keyHash" TEXT NOT NULL,
        "requestHash" TEXT NOT NULL,
        "postId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PostIdempotencyKey_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "PostIdempotencyKey_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE UNIQUE INDEX "PostIdempotencyKey_authorId_keyHash_key" ON "PostIdempotencyKey"("authorId", "keyHash")`,
      `CREATE INDEX "PostIdempotencyKey_postId_idx" ON "PostIdempotencyKey"("postId")`,
      // New tables — CREATE IF NOT EXISTS is not supported by LibSQL, so we use CREATE TABLE and ignore "already exists"
      `CREATE TABLE "Project" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "tagline" TEXT NOT NULL DEFAULT '',
        "content" TEXT NOT NULL DEFAULT '',
        "contentFormat" TEXT NOT NULL DEFAULT 'html',
        "coverImage" TEXT,
        "status" TEXT NOT NULL DEFAULT 'completed',
        "featured" BOOLEAN NOT NULL DEFAULT false,
        "published" BOOLEAN NOT NULL DEFAULT false,
        "githubUrl" TEXT,
        "liveUrl" TEXT,
        "techTags" TEXT NOT NULL DEFAULT '[]',
        "order" INTEGER NOT NULL DEFAULT 0,
        "githubRepoId" TEXT,
        "githubRepoFullName" TEXT,
        "githubSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
        "githubLastSyncAt" TEXT,
        "githubDefaultBranch" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`,
      `CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug")`,
      `CREATE TABLE "ProjectImage" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "projectId" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "caption" TEXT NOT NULL DEFAULT '',
        "order" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "ProjectImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE TABLE "PhotoAlbum" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "description" TEXT NOT NULL DEFAULT '',
        "coverImage" TEXT,
        "published" BOOLEAN NOT NULL DEFAULT false,
        "featured" BOOLEAN NOT NULL DEFAULT false,
        "order" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`,
      `CREATE UNIQUE INDEX "PhotoAlbum_slug_key" ON "PhotoAlbum"("slug")`,
      `CREATE TABLE "Photo" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "albumId" TEXT NOT NULL,
        "title" TEXT NOT NULL DEFAULT '',
        "description" TEXT NOT NULL DEFAULT '',
        "url" TEXT NOT NULL,
        "location" TEXT NOT NULL DEFAULT '',
        "takenAt" DATETIME,
        "order" INTEGER NOT NULL DEFAULT 0,
        "featured" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "Photo_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "PhotoAlbum" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      // v10 → SEO columns
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoSiteUrl" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoDescription" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoOgImageUrl" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoTwitterHandle" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoRobotsIndex" BOOLEAN NOT NULL DEFAULT true`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoGoogleVerification" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoBingVerification" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoLlmsTxtEnabled" BOOLEAN NOT NULL DEFAULT true`,
      `ALTER TABLE "Post" ADD COLUMN "seoDescription" TEXT`,
      `ALTER TABLE "Post" ADD COLUMN "seoOgImageUrl" TEXT`,
      `ALTER TABLE "Post" ADD COLUMN "seoCanonicalUrl" TEXT`,
      `ALTER TABLE "Post" ADD COLUMN "seoNoIndex" BOOLEAN NOT NULL DEFAULT false`,
      // v12 → restore inert compatibility fields after the retired integration
      // was removed. They prevent stale serverless functions from failing while
      // a new deployment rolls out; the application no longer uses them.
      `ALTER TABLE "Post" ADD COLUMN "craftDocumentId" TEXT`,
      `ALTER TABLE "Post" ADD COLUMN "craftLastModifiedAt" TEXT`,
      `ALTER TABLE "Post" ADD COLUMN "craftUnlinked" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftServerUrl" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftApiToken" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftFolderId" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftFolderName" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftSyncMode" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftEnabled" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftWriteAccess" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftError" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftLastSyncAt" TEXT`,
      `CREATE TABLE "BackgroundJobLock" (
        "name" TEXT NOT NULL PRIMARY KEY,
        "ownerToken" TEXT NOT NULL,
        "leaseUntil" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`,
      // v13 → indexes for public listing, translation, and ordered media queries
      ...performanceIndexes,
    ];

    for (const stmt of migrations) {
      try {
        await client.execute(stmt + ';');
      } catch {
        // Ignore "already exists" / "duplicate column" errors — they are expected
      }
    }

    console.log('[DB Migrate] Schema migrations applied');
  } catch (error: any) {
    console.warn('[DB Migrate] Migration error (non-fatal):', error?.message);
  }
}

// Module-level flag so migrations only run once per server process
let migrationsDone = false;

/**
 * Call this early in server startup to ensure the schema is up to date.
 * Idempotent and fast — typically a few milliseconds.
 */
export async function ensureMigrations(): Promise<void> {
  if (migrationsDone) return;
  migrationsDone = true;
  await runSchemaMigrations();
}

/**
 * Initialize the database schema by executing raw SQL.
 * This is needed for LibSQL databases (Turso, Bunny.net) where
 * prisma db push doesn't work with libsql:// URLs.
 */
export async function initializeDatabase(): Promise<{ success: boolean; error?: string }> {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  
  if (!url) {
    return { success: false, error: 'DATABASE_URL not set' };
  }
  
  // Only run for LibSQL URLs, not local SQLite
  if (!url.startsWith('libsql://') && !url.startsWith('https://') && !url.startsWith('wss://')) {
    console.log("[DB Init] Skipping for local SQLite");
    return { success: true };
  }
  
  try {
    console.log('[DB Init] Connecting to database...');
    
    const client = createClient({
      url,
      authToken: authToken || undefined,
    });
    
    // Check if tables already exist
    const result = await client.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='User'",
      args: []
    });
    
    const tablesExist = result.rows.length > 0;

    if (!tablesExist) {
      console.log('[DB Init] Creating base tables...');
    }

    // Always run schema statements — CREATE TABLE/INDEX are skipped if they already exist
    // Execute schema creation SQL
    const schemaSQL = `
      CREATE TABLE "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "username" TEXT NOT NULL,
          "firstName" TEXT,
          "lastName" TEXT,
          "password" TEXT NOT NULL,
          "role" TEXT NOT NULL DEFAULT 'COLLABORATOR',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
      );

      CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

      CREATE TABLE "Post" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "title" TEXT NOT NULL,
          "slug" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "contentFormat" TEXT NOT NULL DEFAULT 'html',
          "published" BOOLEAN NOT NULL DEFAULT false,
          "isFeatured" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          "authorId" TEXT NOT NULL,
          "language" TEXT NOT NULL DEFAULT 'en',
          "translationGroupId" TEXT,
          CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );

      CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
      CREATE INDEX "Post_published_createdAt_idx" ON "Post"("published", "createdAt");
      CREATE INDEX "Post_translationGroupId_published_idx" ON "Post"("translationGroupId", "published");

      CREATE TABLE "Tag" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "slug" TEXT NOT NULL
      );

      CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
      CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

      CREATE TABLE "_PostToTag" (
          "A" TEXT NOT NULL,
          "B" TEXT NOT NULL,
          CONSTRAINT "_PostToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "_PostToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE UNIQUE INDEX "_PostToTag_AB_unique" ON "_PostToTag"("A", "B");
      CREATE INDEX "_PostToTag_B_index" ON "_PostToTag"("B");

      CREATE TABLE "SiteSettings" (
          "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
          "title" TEXT NOT NULL DEFAULT 'ExploreCMS',
          "faviconUrl" TEXT,
          "headerTitle" TEXT NOT NULL DEFAULT 'Explore. Create. Inspire.',
          "headerDescription" TEXT NOT NULL DEFAULT 'Welcome to my personal corner of the internet. Here I share technical deep-dives and pieces of my life story.',
          "sidebarAbout" TEXT NOT NULL DEFAULT 'Discover articles on technology, creativity, and personal growth. Use the search or browse by tags to find what interests you.',
          "navigationConfig" TEXT NOT NULL DEFAULT '[{"id":"latest","type":"latest","label":"Latest"},{"id":"featured","type":"featured","label":"Featured"}]',
          "theme" TEXT NOT NULL DEFAULT 'default',
          "footerText" TEXT NOT NULL DEFAULT '',
          "bunnyEnabled" BOOLEAN NOT NULL DEFAULT false,
          "bunnyUrl" TEXT,
          "bunnyToken" TEXT,
          "bunnyStorageEnabled" BOOLEAN NOT NULL DEFAULT false,
          "bunnyStorageRegion" TEXT,
          "bunnyStorageZoneName" TEXT,
          "bunnyStorageApiKey" TEXT,
          "bunnyStorageUrl" TEXT,
          "updatedAt" DATETIME NOT NULL
      );

      CREATE TABLE "PopupConfig" (
          "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
          "enabled" BOOLEAN NOT NULL DEFAULT false,
          "title" TEXT NOT NULL DEFAULT '',
          "content" TEXT NOT NULL DEFAULT '',
          "displayMode" TEXT NOT NULL DEFAULT 'once',
          "updatedAt" DATETIME NOT NULL
      );

      CREATE TABLE "SiteAnalytics" (
          "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
          "totalViews" INTEGER NOT NULL DEFAULT 0,
          "uniqueViews" INTEGER NOT NULL DEFAULT 0,
          "updatedAt" DATETIME NOT NULL
      );

      CREATE TABLE "PostView" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "postId" TEXT NOT NULL,
          "totalViews" INTEGER NOT NULL DEFAULT 0,
          "uniqueViews" INTEGER NOT NULL DEFAULT 0,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "PostView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE UNIQUE INDEX "PostView_postId_key" ON "PostView"("postId");

      CREATE TABLE "Project" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "title" TEXT NOT NULL,
          "slug" TEXT NOT NULL,
          "tagline" TEXT NOT NULL DEFAULT '',
          "content" TEXT NOT NULL DEFAULT '',
          "contentFormat" TEXT NOT NULL DEFAULT 'html',
          "coverImage" TEXT,
          "status" TEXT NOT NULL DEFAULT 'completed',
          "featured" BOOLEAN NOT NULL DEFAULT false,
          "published" BOOLEAN NOT NULL DEFAULT false,
          "githubUrl" TEXT,
          "liveUrl" TEXT,
          "techTags" TEXT NOT NULL DEFAULT '[]',
          "order" INTEGER NOT NULL DEFAULT 0,
          "githubRepoId" TEXT,
          "githubRepoFullName" TEXT,
          "githubSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
          "githubLastSyncAt" TEXT,
          "githubDefaultBranch" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
      );

      CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
      CREATE INDEX "Project_published_featured_order_createdAt_idx" ON "Project"("published", "featured", "order", "createdAt");

      CREATE TABLE "ProjectImage" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "projectId" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "caption" TEXT NOT NULL DEFAULT '',
          "order" INTEGER NOT NULL DEFAULT 0,
          CONSTRAINT "ProjectImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX "ProjectImage_projectId_order_idx" ON "ProjectImage"("projectId", "order");

      CREATE TABLE "PhotoAlbum" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "title" TEXT NOT NULL,
          "slug" TEXT NOT NULL,
          "description" TEXT NOT NULL DEFAULT '',
          "coverImage" TEXT,
          "published" BOOLEAN NOT NULL DEFAULT false,
          "featured" BOOLEAN NOT NULL DEFAULT false,
          "order" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
      );

      CREATE UNIQUE INDEX "PhotoAlbum_slug_key" ON "PhotoAlbum"("slug");
      CREATE INDEX "PhotoAlbum_published_featured_order_createdAt_idx" ON "PhotoAlbum"("published", "featured", "order", "createdAt");

      CREATE TABLE "Photo" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "albumId" TEXT NOT NULL,
          "title" TEXT NOT NULL DEFAULT '',
          "description" TEXT NOT NULL DEFAULT '',
          "url" TEXT NOT NULL,
          "location" TEXT NOT NULL DEFAULT '',
          "takenAt" DATETIME,
          "order" INTEGER NOT NULL DEFAULT 0,
          "featured" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "Photo_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "PhotoAlbum" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX "Photo_albumId_order_idx" ON "Photo"("albumId", "order");

      CREATE TABLE "ApiKey" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "keyHash" TEXT NOT NULL,
          "prefix" TEXT NOT NULL,
          "permissions" TEXT NOT NULL DEFAULT '[]',
          "createdById" TEXT NOT NULL,
          "lastUsedAt" DATETIME,
          "expiresAt" DATETIME,
          "revoked" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
      CREATE INDEX "ApiKey_createdById_idx" ON "ApiKey"("createdById");

      CREATE TABLE "PostIdempotencyKey" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "authorId" TEXT NOT NULL,
          "keyHash" TEXT NOT NULL,
          "requestHash" TEXT NOT NULL,
          "postId" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PostIdempotencyKey_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "PostIdempotencyKey_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE UNIQUE INDEX "PostIdempotencyKey_authorId_keyHash_key" ON "PostIdempotencyKey"("authorId", "keyHash");
      CREATE INDEX "PostIdempotencyKey_postId_idx" ON "PostIdempotencyKey"("postId");

    `;

    // Split and execute statements one by one (CREATE TABLE/INDEX are no-ops if already exist)
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      try {
        await client.execute(stmt + ';');
      } catch (err: any) {
        // Ignore "already exists" errors
        if (!err.message?.includes('already exists')) {
          console.warn('[DB Init] Statement warning:', err.message);
        }
      }
    }

    // Always run schema migrations — safely ignored when already applied.
    // This handles existing deployments upgrading to a new schema version.
    const alterStatements = [
      `ALTER TABLE "SiteSettings" ADD COLUMN "enabledComponents" TEXT NOT NULL DEFAULT '["blog"]'`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "defaultComponent" TEXT NOT NULL DEFAULT 'blog'`,
      `ALTER TABLE "Post" ADD COLUMN "contentFormat" TEXT NOT NULL DEFAULT 'html'`,
      // Multilingual support
      `ALTER TABLE "Post" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en'`,
      `ALTER TABLE "Post" ADD COLUMN "translationGroupId" TEXT`,
      // Email feature
      `ALTER TABLE "User" ADD COLUMN "email" TEXT`,
      `ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "User" ADD COLUMN "emailVerificationToken" TEXT`,
      `ALTER TABLE "User" ADD COLUMN "emailVerificationExpiry" DATETIME`,
      `ALTER TABLE "User" ADD COLUMN "passwordResetToken" TEXT`,
      `ALTER TABLE "User" ADD COLUMN "passwordResetExpiry" DATETIME`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "emailProvider" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "emailFromName" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "emailFromAddress" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "resendApiKey" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "smtpHost" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "smtpPort" INTEGER`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "smtpSecure" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "smtpUser" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "smtpPassword" TEXT`,
      // Dynamic particle background
      `ALTER TABLE "SiteSettings" ADD COLUMN "dynamicPattern" BOOLEAN NOT NULL DEFAULT true`,
      // SEO columns
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoSiteUrl" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoDescription" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoOgImageUrl" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoTwitterHandle" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoRobotsIndex" BOOLEAN NOT NULL DEFAULT true`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoGoogleVerification" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoBingVerification" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "seoLlmsTxtEnabled" BOOLEAN NOT NULL DEFAULT true`,
      `ALTER TABLE "Post" ADD COLUMN "seoDescription" TEXT`,
      `ALTER TABLE "Post" ADD COLUMN "seoOgImageUrl" TEXT`,
      `ALTER TABLE "Post" ADD COLUMN "seoCanonicalUrl" TEXT`,
      `ALTER TABLE "Post" ADD COLUMN "seoNoIndex" BOOLEAN NOT NULL DEFAULT false`,
      // Inert rolling-deployment compatibility fields. The retired integration
      // has no runtime, API, or admin code, but older functions may still select
      // these columns briefly while a deployment is being replaced.
      `ALTER TABLE "Post" ADD COLUMN "craftDocumentId" TEXT`,
      `ALTER TABLE "Post" ADD COLUMN "craftLastModifiedAt" TEXT`,
      `ALTER TABLE "Post" ADD COLUMN "craftUnlinked" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftServerUrl" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftApiToken" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftFolderId" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftFolderName" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftSyncMode" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftEnabled" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftWriteAccess" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftError" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftLastSyncAt" TEXT`,
      `CREATE TABLE "BackgroundJobLock" (
        "name" TEXT NOT NULL PRIMARY KEY,
        "ownerToken" TEXT NOT NULL,
        "leaseUntil" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`,
    ];
    for (const stmt of alterStatements) {
      try {
        await client.execute(stmt + ';');
      } catch {
        // Column already exists — safe to ignore
      }
    }

    console.log('[DB Init] Database initialized successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[DB Init] Error:', error);
    return { success: false, error: error.message };
  }
}
