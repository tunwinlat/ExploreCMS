-- CreateIndex
CREATE INDEX "Post_published_createdAt_idx" ON "Post"("published", "createdAt");

-- CreateIndex
CREATE INDEX "Post_translationGroupId_published_idx" ON "Post"("translationGroupId", "published");

-- CreateIndex
CREATE INDEX "Project_published_featured_order_createdAt_idx" ON "Project"("published", "featured", "order", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectImage_projectId_order_idx" ON "ProjectImage"("projectId", "order");

-- CreateIndex
CREATE INDEX "PhotoAlbum_published_featured_order_createdAt_idx" ON "PhotoAlbum"("published", "featured", "order", "createdAt");

-- CreateIndex
CREATE INDEX "Photo_albumId_order_idx" ON "Photo"("albumId", "order");
