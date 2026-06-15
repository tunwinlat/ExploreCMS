const fs = require('fs');

const fixClientFile = (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  if (content.includes("export const runtime = 'edge';") && content.includes("'use client'")) {
    content = content.replace("export const runtime = 'edge';\n", "");
    content = content.replace("'use client'", "'use client'\nexport const runtime = 'edge';");
    fs.writeFileSync(filepath, content);
  }
};

fixClientFile('src/app/admin/dashboard/projects/github/page.tsx');
fixClientFile('src/app/test-editor/page.tsx');
