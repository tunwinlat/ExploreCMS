const fs = require('fs');

let relatedContent = fs.readFileSync('src/components/RelatedPosts.tsx', 'utf8');
let lines = relatedContent.split('\n');
lines.splice(50, 7); // removing the stray try catch block

fs.writeFileSync('src/components/RelatedPosts.tsx', lines.join('\n'));

// Now add the wrapper for the JSX ESLint rule in ternary
relatedContent = fs.readFileSync('src/components/RelatedPosts.tsx', 'utf8');
relatedContent = relatedContent.replace(
  /\{post\.coverImage \? \(\s*\{\/\* eslint-disable-next-line @next\/next\/no-img-element \*\/\}\s*<img\s+src=\{post\.coverImage\}\s+alt=""\s+className="related-post-image"\s+loading="lazy"\s*\/>\s*\) : \(/,
  `{post.coverImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.coverImage}
                      alt=""
                      className="related-post-image"
                      loading="lazy"
                    />
                  </>
                ) : (`
);
fs.writeFileSync('src/components/RelatedPosts.tsx', relatedContent);
