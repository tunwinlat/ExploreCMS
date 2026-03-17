-- AlterTable: Add language and translationGroupId columns to Post
ALTER TABLE "Post" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "Post" ADD COLUMN "translationGroupId" TEXT;
