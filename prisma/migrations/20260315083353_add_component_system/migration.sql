-- CreateTable
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

-- CreateTable
CREATE TABLE "ProjectImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProjectImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
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

-- CreateTable
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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SiteSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "title" TEXT NOT NULL DEFAULT 'ExploreCMS',
    "faviconUrl" TEXT,
    "headerTitle" TEXT NOT NULL DEFAULT 'Explore. Create. Inspire.',
    "headerDescription" TEXT NOT NULL DEFAULT 'Welcome to my personal corner of the internet. Here I share technical deep-dives and pieces of my life story.',
    "sidebarAbout" TEXT NOT NULL DEFAULT 'Discover articles on technology, creativity, and personal growth. Use the search or browse by tags to find what interests you.',
    "navigationConfig" TEXT NOT NULL DEFAULT '[{"id":"latest","type":"latest","label":"Latest"},{"id":"featured","type":"featured","label":"Featured"}]',
    "theme" TEXT NOT NULL DEFAULT 'default',
    "footerText" TEXT NOT NULL DEFAULT '',
    "enabledComponents" TEXT NOT NULL DEFAULT '["blog"]',
    "defaultComponent" TEXT NOT NULL DEFAULT 'blog',
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
INSERT INTO "new_SiteSettings" ("bunnyEnabled", "bunnyStorageApiKey", "bunnyStorageEnabled", "bunnyStorageRegion", "bunnyStorageUrl", "bunnyStorageZoneName", "bunnyToken", "bunnyUrl", "faviconUrl", "footerText", "headerDescription", "headerTitle", "id", "navigationConfig", "sidebarAbout", "theme", "title", "updatedAt") SELECT "bunnyEnabled", "bunnyStorageApiKey", "bunnyStorageEnabled", "bunnyStorageRegion", "bunnyStorageUrl", "bunnyStorageZoneName", "bunnyToken", "bunnyUrl", "faviconUrl", "footerText", "headerDescription", "headerTitle", "id", "navigationConfig", "sidebarAbout", "theme", "title", "updatedAt" FROM "SiteSettings";
DROP TABLE "SiteSettings";
ALTER TABLE "new_SiteSettings" RENAME TO "SiteSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoAlbum_slug_key" ON "PhotoAlbum"("slug");
