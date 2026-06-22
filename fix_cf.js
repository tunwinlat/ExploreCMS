const fs = require('fs');

let content = fs.readFileSync('src/components/DynamicPostGrid.tsx', 'utf8');

// I am rewriting the file from my patch memory to make it pass linting.
content = content.replace(/type Post = \{[\s\S]*?\n\}/, (match) => {
  if (!match.includes('contentFormat')) {
    return match.replace(/id: string/, 'id: string\n  contentFormat?: string');
  }
  return match;
});

content = content.replace(/const contentFormat = \(post as any\)\.contentFormat/g, 'const contentFormat = post.contentFormat');
content = content.replace(/item\.type as any/g, "item.type as 'latest'|'featured'|'tag'");
content = content.replace(/role="menuitem"/g, 'role="menuitemradio"');
content = content.replace(/aria-pressed=\{activeFilter\.target === child\.tagSlug\}/g, 'aria-checked={activeFilter.target === child.tagSlug}');
content = content.replace(
  /<img src=\{post\.coverImage\} alt=\{post\.title\} style=\{\{ width: '100%', height: '100%', objectFit: 'cover' \}\} className="card-img" \/>/,
  '{/* eslint-disable-next-line @next/next/no-img-element */}\n                      <img src={post.coverImage} alt={post.title} style={{ width: \'100%\', height: \'100%\', objectFit: \'cover\' }} className="card-img" loading="lazy" />'
);

fs.writeFileSync('src/components/DynamicPostGrid.tsx', content);

let relatedContent = fs.readFileSync('src/components/RelatedPosts.tsx', 'utf8');
relatedContent = relatedContent.replace(
  /<img \s*\n\s*src=\{post\.coverImage\}\s*\n\s*alt="" \s*\n\s*className="related-post-image"\s*\n\s*\/>/m,
  '{/* eslint-disable-next-line @next/next/no-img-element */}\n                    <img \n                      src={post.coverImage}\n                      alt="" \n                      className="related-post-image"\n                      loading="lazy"\n                    />'
);

relatedContent = relatedContent.replace(
  /const fetchRelatedPosts = async \(\) => {[\s\S]*?}\n/,
  ''
);

relatedContent = relatedContent.replace(
  /useEffect\(\(\) => {\n\s*fetchRelatedPosts\(\)\n\s*}, \[currentSlug\]\)/,
  `useEffect(() => {
    const fetchRelatedPosts = async () => {
      setLoading(true)
      try {
        const res = await fetch(\`/api/related?slug=\${encodeURIComponent(currentSlug)}&limit=3\`)
        const data = await res.json()
        if (data.posts) {
          setPosts(data.posts)
        }
      } catch (err) {
        console.error('Failed to fetch related posts:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchRelatedPosts()
  }, [currentSlug])`
);

let lines = relatedContent.split('\n');
let useMemoStart = -1, useMemoEnd = -1, earlyReturnStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('if (loading) {')) earlyReturnStart = i;
  if (lines[i].includes('const processedPosts = useMemo(() => {')) useMemoStart = i;
  if (useMemoStart !== -1 && lines[i].includes('}, [posts])')) {
    useMemoEnd = i;
    break;
  }
}
if (useMemoStart > earlyReturnStart) {
  const useMemoBlock = lines.slice(useMemoStart, useMemoEnd + 1);
  lines.splice(useMemoStart, useMemoEnd - useMemoStart + 1);
  lines.splice(earlyReturnStart, 0, ...useMemoBlock, '');
}

fs.writeFileSync('src/components/RelatedPosts.tsx', lines.join('\n'));
