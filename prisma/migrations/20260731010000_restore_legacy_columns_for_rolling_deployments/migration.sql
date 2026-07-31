-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at https://mozilla.org/MPL/2.0/.

-- These columns are intentionally not mapped by Prisma. They temporarily
-- preserve compatibility with stale serverless functions during deployments.
ALTER TABLE "Post" ADD COLUMN "craftDocumentId" TEXT;
ALTER TABLE "Post" ADD COLUMN "craftLastModifiedAt" TEXT;
ALTER TABLE "Post" ADD COLUMN "craftUnlinked" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SiteSettings" ADD COLUMN "craftServerUrl" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "craftApiToken" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "craftFolderId" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "craftFolderName" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "craftSyncMode" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "craftEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN "craftWriteAccess" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN "craftError" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "craftLastSyncAt" TEXT;

CREATE TABLE "BackgroundJobLock" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "ownerToken" TEXT NOT NULL,
    "leaseUntil" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
