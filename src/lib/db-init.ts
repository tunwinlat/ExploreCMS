/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createClient } from '@libsql/client';

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
    
    if (result.rows.length > 0) {
      console.log('[DB Init] Tables already exist, skipping initialization');
      return { success: true };
    }
    
    console.log('[DB Init] Creating tables...');
    
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
    `;
    
    // Split and execute statements one by one
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
    
    console.log('[DB Init] Database initialized successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[DB Init] Error:', error);
    return { success: false, error: error.message };
  }
}
