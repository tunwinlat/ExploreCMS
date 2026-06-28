const fs = require('fs');

const file = 'src/app/api/posts/route.ts';
let code = fs.readFileSync(file, 'utf8');

const search = `import { isPrimaryPost } from '@/lib/translationUtils'`;
const replace = `import { isPrimaryPost } from '@/lib/translationUtils'
import { getExcerpt, getFirstImage } from '@/lib/renderContent'`;

code = code.replace(search, replace);

const search2 = `      include: {
        author: {
          select: { username: true, firstName: true }
        },
        tags: true,
        views: true
      }`;
const replace2 = `      select: {
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

code = code.replace(search2, replace2);

const search3 = `    let nextCursor: typeof cursor | undefined = undefined;
    const posts = primaryPosts.slice(0, limit + 1)
    if (posts.length > limit) {
      const nextItem = posts.pop()
      nextCursor = nextItem!.id
    }

    return NextResponse.json({
      posts,
      nextCursor
    })`;
const replace3 = `    let nextCursor: typeof cursor | undefined = undefined;
    const posts = primaryPosts.slice(0, limit + 1)
    if (posts.length > limit) {
      const nextItem = posts.pop()
      nextCursor = nextItem!.id
    }

    // Process posts on the server to reduce payload size
    const processedPosts = posts.map(post => {
      const { content, ...rest } = post;
      return {
        ...rest,
        excerpt: content ? getExcerpt(content, post.contentFormat, 120) : '',
        coverImage: content ? getFirstImage(content, post.contentFormat) : null
      };
    });

    return NextResponse.json({
      posts: processedPosts,
      nextCursor
    })`;

code = code.replace(search3, replace3);

fs.writeFileSync(file, code);
console.log('Done');
