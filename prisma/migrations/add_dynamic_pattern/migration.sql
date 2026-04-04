-- Add dynamicPattern column to SiteSettings table
ALTER TABLE "SiteSettings" ADD COLUMN "dynamicPattern" BOOLEAN DEFAULT true;
