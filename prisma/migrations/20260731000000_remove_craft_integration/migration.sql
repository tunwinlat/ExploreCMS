-- This Source Code Form is subject to the terms of the Mozilla Public
-- License, v. 2.0. If a copy of the MPL was not distributed with this
-- file, You can obtain one at https://mozilla.org/MPL/2.0/.

ALTER TABLE "Post" DROP COLUMN "craftDocumentId";
ALTER TABLE "Post" DROP COLUMN "craftLastModifiedAt";
ALTER TABLE "Post" DROP COLUMN "craftUnlinked";

ALTER TABLE "SiteSettings" DROP COLUMN "craftServerUrl";
ALTER TABLE "SiteSettings" DROP COLUMN "craftApiToken";
ALTER TABLE "SiteSettings" DROP COLUMN "craftFolderId";
ALTER TABLE "SiteSettings" DROP COLUMN "craftFolderName";
ALTER TABLE "SiteSettings" DROP COLUMN "craftSyncMode";
ALTER TABLE "SiteSettings" DROP COLUMN "craftEnabled";
ALTER TABLE "SiteSettings" DROP COLUMN "craftWriteAccess";
ALTER TABLE "SiteSettings" DROP COLUMN "craftError";
ALTER TABLE "SiteSettings" DROP COLUMN "craftLastSyncAt";

DROP TABLE "BackgroundJobLock";
