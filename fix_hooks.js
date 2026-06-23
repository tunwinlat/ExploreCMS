const fs = require('fs');

const path = 'src/components/RelatedPosts.tsx';
let content = fs.readFileSync(path, 'utf8');

// Move useMemo before early return
const earlyReturnBlock = `
  if (loading) {
    return (
      <section className="related-posts">
        <div className="related-posts-header">
          <h3 className="related-posts-title">You Might Also Like</h3>
        </div>
        <div className="related-posts-grid">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="related-post-card skeleton" />
          ))}
        </div>
      </section>
    )
  }
`;

const useMemoBlock = `
  const processedPosts = useMemo(() => {
    return posts.map(post => {
      const excerpt = getExcerpt(post.content, post.contentFormat, 120)
      const coverImage = getFirstImage(post.content, post.contentFormat)
      return { ...post, excerpt, coverImage }
    })
  }, [posts])
`;

content = content.replace(earlyReturnBlock, '');
content = content.replace(useMemoBlock, useMemoBlock + earlyReturnBlock);

fs.writeFileSync(path, content);
console.log('Fixed RelatedPosts.tsx hooks');
