const fs = require('fs');
const path = 'src/components/SearchBox.tsx';
let content = fs.readFileSync(path, 'utf8');

// A common fix for "Existing memoization could not be preserved" is removing useMemo if React Compiler is enabled,
// OR extracting it differently. Actually, let's see why it's skipped.
// "This value was memoized in source but not in compilation output."
// React 19's React Compiler is likely on in Next 15/16.
// If we just remove useMemo and do `const processedResults = results.map(...)`, React Compiler handles it anyway.
// The file is currently:
//   const processedResults = useMemo(() => {
//     return results.map(post => { ... })
//   }, [results])

content = content.replace(
  `  const processedResults = useMemo(() => {
    return results.map(post => {
      const excerpt = getExcerpt(post.content, post.contentFormat, 150)
      return { ...post, excerpt }
    })
  }, [results])`,
  `  const processedResults = results.map(post => {
    const excerpt = getExcerpt(post.content, post.contentFormat, 150)
    return { ...post, excerpt }
  })`
);

fs.writeFileSync(path, content);
console.log('Removed useMemo');
