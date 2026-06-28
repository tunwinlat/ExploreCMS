const fs = require('fs');

const file = 'src/app/api/posts/route.test.ts';
let code = fs.readFileSync(file, 'utf8');

const search = `      include: {
        author: {
          select: { username: true, firstName: true }
        },
        tags: true,
        views: true
      }`;
const replace = `      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        contentFormat: true,
        isFeatured: true,
        createdAt: true,
        translationGroupId: true,
        author: {
          select: { username: true, firstName: true }
        },
        tags: {
          select: { name: true, slug: true }
        },
        views: {
          select: { uniqueViews: true }
        }
      }`;

code = code.replace(search, replace);

fs.writeFileSync(file, code);
console.log('Done');
