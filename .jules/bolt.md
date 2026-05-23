## 2024-05-23 - Native Lazy Loading as Standard Practice
**Learning:** Implementing `loading="lazy"` on standard `<img>` tags for below-the-fold content is a low-effort, high-impact performance optimization, especially when `<Image>` cannot be used due to unpredictable external domains.
**Action:** Always add `loading="lazy"` to `<img>` tags handling user-generated or dynamic content to improve initial page load speed without adding structural complexity.
