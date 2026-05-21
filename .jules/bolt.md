## 2024-05-21 - Added Native Lazy Loading to Image Tags
**Learning:** Native `loading="lazy"` provides a highly effective performance optimization by deferring the loading of off-screen images until they are near the viewport. This reduces initial page load time, saves user bandwidth, and lessens the immediate load on the server.
**Action:** Always consider using native `loading="lazy"` for images rendered below the fold or in long lists to improve performance without introducing functional regressions.
