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

    // v2 → component system columns
    const migrations = [
      `ALTER TABLE "SiteSettings" ADD COLUMN "enabledComponents" TEXT NOT NULL DEFAULT '["blog"]'`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "defaultComponent" TEXT NOT NULL DEFAULT 'blog'`,
      // v3 → Craft.do integration columns
      `ALTER TABLE "Post" ADD COLUMN "craftDocumentId" TEXT`,
      `ALTER TABLE "Post" ADD COLUMN "craftLastModifiedAt" TEXT`,
      `ALTER TABLE "Post" ADD COLUMN "craftUnlinked" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftServerUrl" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftApiToken" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftFolderId" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftFolderName" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftSyncMode" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftEnabled" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftLastSyncAt" TEXT`,
      // New tables — CREATE IF NOT EXISTS is not supported by LibSQL, so we use CREATE TABLE and ignore "already exists"
      `CREATE TABLE "Project" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "tagline" TEXT NOT NULL DEFAULT '',
        "content" TEXT NOT NULL DEFAULT '',
        "coverImage" TEXT,
        "status" TEXT NOT NULL DEFAULT 'completed',
        "featured" BOOLEAN NOT NULL DEFAULT false,
        "published" BOOLEAN NOT NULL DEFAULT false,
        "githubUrl" TEXT,
        "liveUrl" TEXT,
        "techTags" TEXT NOT NULL DEFAULT '[]',
        "order" INTEGER NOT NULL DEFAULT 0,
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
    console.log('[DB Init] Skipping for local SQLite');
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
          "published" BOOLEAN NOT NULL DEFAULT false,
          "isFeatured" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          "authorId" TEXT NOT NULL,
          CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );

      CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

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
          "coverImage" TEXT,
          "status" TEXT NOT NULL DEFAULT 'completed',
          "featured" BOOLEAN NOT NULL DEFAULT false,
          "published" BOOLEAN NOT NULL DEFAULT false,
          "githubUrl" TEXT,
          "liveUrl" TEXT,
          "techTags" TEXT NOT NULL DEFAULT '[]',
          "order" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
      );

      CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

      CREATE TABLE "ProjectImage" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "projectId" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "caption" TEXT NOT NULL DEFAULT '',
          "order" INTEGER NOT NULL DEFAULT 0,
          CONSTRAINT "ProjectImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

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

    // Always run ALTER TABLE migrations — safely ignored if columns already exist.
    // This handles existing deployments upgrading to a new schema version.
    const alterStatements = [
      `ALTER TABLE "SiteSettings" ADD COLUMN "enabledComponents" TEXT NOT NULL DEFAULT '["blog"]'`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "defaultComponent" TEXT NOT NULL DEFAULT 'blog'`,
      // Craft.do integration
      `ALTER TABLE "Post" ADD COLUMN "craftDocumentId" TEXT`,
      `ALTER TABLE "Post" ADD COLUMN "craftLastModifiedAt" TEXT`,
      `ALTER TABLE "Post" ADD COLUMN "craftUnlinked" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftServerUrl" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftApiToken" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftFolderId" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftFolderName" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftSyncMode" TEXT`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftEnabled" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "SiteSettings" ADD COLUMN "craftLastSyncAt" TEXT`,
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
