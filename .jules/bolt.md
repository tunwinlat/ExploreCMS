## 2024-06-10 - Adding lazy loading to images

## 2024-06-10 - Adding lazy loading to images
**Learning:** Native `loading="lazy"` attribute on `<img>` tags is a simple and effective way to defer loading of off-screen images, improving initial page load times and reducing bandwidth usage without the need for complex intersection observers or external libraries. Next.js `<Image>` is intentionally avoided in this codebase due to unpredictable external domains, making standard `<img>` with `loading="lazy"` the correct approach. Additionally, when adding comments within JSX conditional rendering logic, it's necessary to wrap the comment and the adjacent element in a React Fragment (`<>...</>`) to prevent JSX parsing errors.
**Action:** When adding images that appear below the fold, consistently apply `loading="lazy"`. Ensure JSX comments within ternary operators or conditionals are properly wrapped in fragments to avoid syntax errors.
