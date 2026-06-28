const fs = require('fs');

const file = 'src/components/DynamicPostGrid.tsx';
let code = fs.readFileSync(file, 'utf8');

const search = `  views?: { uniqueViews: number }[]
  content: string
}`;
const replace = `  views?: { uniqueViews: number }[]
  content?: string
  excerpt?: string
  coverImage?: string | null
}`;
code = code.replace(search, replace);

const search2 = `  // ⚡ Bolt: Memoize post processing (expensive regex for images/excerpts) and filtering
  const processedFilteredPosts = useMemo(() => {
    return posts
      .filter(post => {
        if (activeFilter.type === 'latest') return true;
        if (activeFilter.type === 'featured') return post.isFeatured;
        if (activeFilter.type === 'tag' && activeFilter.target) {
          return post.tags.some(t => t.slug === activeFilter.target);
        }
        return true;
      })
      .map(post => {
        const contentFormat = (post as any).contentFormat
        return {
          ...post,
          coverImage: getFirstImage(post.content, contentFormat),
          excerpt: getExcerpt(post.content, contentFormat, 120)
        }
      });
  }, [posts, activeFilter]);`;

const replace2 = `  // ⚡ Bolt: Memoize post processing and filtering
  const processedFilteredPosts = useMemo(() => {
    return posts
      .filter(post => {
        if (activeFilter.type === 'latest') return true;
        if (activeFilter.type === 'featured') return post.isFeatured;
        if (activeFilter.type === 'tag' && activeFilter.target) {
          return post.tags.some(t => t.slug === activeFilter.target);
        }
        return true;
      })
      .map(post => {
        const contentFormat = (post as any).contentFormat
        return {
          ...post,
          coverImage: post.coverImage !== undefined ? post.coverImage : (post.content ? getFirstImage(post.content, contentFormat) : null),
          excerpt: post.excerpt !== undefined ? post.excerpt : (post.content ? getExcerpt(post.content, contentFormat, 120) : '')
        }
      });
  }, [posts, activeFilter]);`;

code = code.replace(search2, replace2);

fs.writeFileSync(file, code);
console.log('Done');
