-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Post" (
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
    "craftDocumentId" TEXT,
    "craftLastModifiedAt" TEXT,
    "craftUnlinked" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "translationGroupId" TEXT,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("authorId", "content", "createdAt", "id", "isFeatured", "language", "published", "slug", "title", "translationGroupId", "updatedAt") SELECT "authorId", "content", "createdAt", "id", "isFeatured", "language", "published", "slug", "title", "translationGroupId", "updatedAt" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
CREATE TABLE "new_Project" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "githubRepoId" TEXT,
    "githubRepoFullName" TEXT,
    "githubSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "githubLastSyncAt" TEXT,
    "githubDefaultBranch" TEXT DEFAULT 'main'
);
INSERT INTO "new_Project" ("content", "coverImage", "createdAt", "featured", "githubUrl", "id", "liveUrl", "order", "published", "slug", "status", "tagline", "techTags", "title", "updatedAt") SELECT "content", "coverImage", "createdAt", "featured", "githubUrl", "id", "liveUrl", "order", "published", "slug", "status", "tagline", "techTags", "title", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
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
    "dynamicPattern" BOOLEAN NOT NULL DEFAULT true,
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
    "craftServerUrl" TEXT,
    "craftApiToken" TEXT,
    "craftFolderId" TEXT,
    "githubEnabled" BOOLEAN NOT NULL DEFAULT false,
    "githubAccessToken" TEXT,
    "githubUsername" TEXT,
    "githubSyncMode" TEXT DEFAULT 'manual',
    "githubLastSyncAt" TEXT,
    "craftFolderName" TEXT,
    "craftSyncMode" TEXT,
    "craftEnabled" BOOLEAN NOT NULL DEFAULT false,
    "craftWriteAccess" BOOLEAN NOT NULL DEFAULT false,
    "craftError" TEXT,
    "craftLastSyncAt" TEXT,
    "emailProvider" TEXT,
    "emailFromName" TEXT,
    "emailFromAddress" TEXT,
    "resendApiKey" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SiteSettings" ("bunnyEnabled", "bunnyStorageApiKey", "bunnyStorageEnabled", "bunnyStorageRegion", "bunnyStorageUrl", "bunnyStorageZoneName", "bunnyToken", "bunnyUrl", "defaultComponent", "dynamicPattern", "enabledComponents", "faviconUrl", "footerText", "headerDescription", "headerTitle", "id", "navigationConfig", "sidebarAbout", "theme", "title", "updatedAt") SELECT "bunnyEnabled", "bunnyStorageApiKey", "bunnyStorageEnabled", "bunnyStorageRegion", "bunnyStorageUrl", "bunnyStorageZoneName", "bunnyToken", "bunnyUrl", "defaultComponent", coalesce("dynamicPattern", true) AS "dynamicPattern", "enabledComponents", "faviconUrl", "footerText", "headerDescription", "headerTitle", "id", "navigationConfig", "sidebarAbout", "theme", "title", "updatedAt" FROM "SiteSettings";
DROP TABLE "SiteSettings";
ALTER TABLE "new_SiteSettings" RENAME TO "SiteSettings";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CONTRIBUTOR',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "emailVerificationExpiry" DATETIME,
    "passwordResetToken" TEXT,
    "passwordResetExpiry" DATETIME
);
INSERT INTO "new_User" ("createdAt", "firstName", "id", "lastName", "password", "role", "updatedAt", "username") SELECT "createdAt", "firstName", "id", "lastName", "password", "role", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
