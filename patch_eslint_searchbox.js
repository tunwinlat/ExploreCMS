const fs = require('fs');
const path = 'src/components/SearchBox.tsx';
let content = fs.readFileSync(path, 'utf8');

// The `useMemo` existing memoization error
content = content.replace(
  `  const processedResults = useMemo(() => {
    return results.map(post => {
      const excerpt = getExcerpt(post.content, post.contentFormat, 150)
      return { ...post, excerpt }
    })
  }, [results])

  useEffect(() => {
    if (selectedIndex >= 0) {
      const element = document.getElementById(\`search-result-\${selectedIndex}\`);
      if (element) {
        element.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);`,
  `  useEffect(() => {
    if (selectedIndex >= 0) {
      const element = document.getElementById(\`search-result-\${selectedIndex}\`);
      if (element) {
        element.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const processedResults = useMemo(() => {
    return results.map(post => {
      const excerpt = getExcerpt(post.content, post.contentFormat, 150)
      return { ...post, excerpt }
    })
  }, [results])`
);

fs.writeFileSync(path, content);
console.log('Fixed useMemo order');
