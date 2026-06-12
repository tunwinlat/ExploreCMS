const fs = require('fs');
const glob = require('glob');

const nonStaticRoutes = [
  'src/app/admin/dashboard/components/page.tsx',
  'src/app/admin/dashboard/edit/[id]/page.tsx',
  'src/app/admin/dashboard/integrations/page.tsx',
  'src/app/admin/dashboard/navigation/page.tsx',
  'src/app/admin/dashboard/new/page.tsx',
  'src/app/admin/dashboard/photos/[albumId]/page.tsx',
  'src/app/admin/dashboard/photos/new-album/page.tsx',
  'src/app/admin/dashboard/photos/page.tsx',
  'src/app/admin/dashboard/popup/page.tsx',
  'src/app/admin/dashboard/posts/drafts/page.tsx',
  'src/app/admin/dashboard/posts/published/page.tsx',
  'src/app/admin/dashboard/profile/page.tsx',
  'src/app/admin/dashboard/projects/edit/[id]/page.tsx',
  'src/app/admin/dashboard/projects/github/page.tsx',
  'src/app/admin/dashboard/projects/new/page.tsx',
  'src/app/admin/dashboard/projects/page.tsx',
  'src/app/admin/dashboard/settings/page.tsx',
  'src/app/admin/dashboard/tags/page.tsx',
  'src/app/admin/dashboard/users/page.tsx',
  'src/app/admin/dashboard/page.tsx',
  'src/app/admin/reset-password/page.tsx',
  'src/app/api/craft/folders/route.ts',
  'src/app/api/craft/sync/route.ts',
  'src/app/api/craft/test/route.ts',
  'src/app/api/featured/route.ts',
  'src/app/api/posts/route.ts',
  'src/app/api/related/route.ts',
  'src/app/api/search/route.ts',
  'src/app/api/test-bunny-storage/route.ts',
  'src/app/api/trending/route.ts',
  'src/app/api/upload/route.ts',
  'src/app/api/verify-email/route.ts',
  'src/app/api/views/route.ts',
  'src/app/photos/[albumSlug]/page.tsx',
  'src/app/post/[slug]/page.tsx',
  'src/app/projects/[slug]/page.tsx'
];

nonStaticRoutes.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes("export const runtime = 'edge'")) {
      content += "\nexport const runtime = 'edge';\n";
      fs.writeFileSync(file, content, 'utf8');
      console.log('Patched', file);
    }
  } else {
    console.log('Not found:', file);
  }
});
