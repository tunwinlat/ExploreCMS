import { getExcerpt, getFirstImage } from './src/lib/renderContent';

const post = {
    content: "![alt](https://example.com/image.jpg) Some text",
    contentFormat: "markdown"
};

console.log(getExcerpt(post.content, post.contentFormat));
console.log(getFirstImage(post.content, post.contentFormat));
