# Public UI Redesign — Option B: Editorial

Master checklist for redesigning the three public components (**blog**, **projects**, **photos**)
plus shared chrome and the post detail page, moving ExploreCMS from a "glass dashboard"
aesthetic to an **editorial / publication** aesthetic.

> **How to use this file:** work top to bottom, phase by phase. Check items off (`[x]`) as
> they are completed and add a dated entry to the **Progress Log** at the bottom whenever
> you stop. If work is interrupted, resume from the first unchecked item in the current phase.

---

## 1. Goal & Design Direction

**Goal:** one coherent, type-led public site where blog, projects, and photos feel like
sections of the same publication — not three different products.

**Design principles (apply to every phase):**

- **Type-first.** Serif display face for headings (Fraunces), clean sans for body.
  Dramatic heading/body contrast; body text ≥ 18px on reading surfaces.
- **One accent.** `var(--accent-color)` for links/active states only. No gradient text
  headings, no gradient tiles/icons.
- **Flat surfaces, hairline borders.** Public pages drop `.glass` (glass stays in admin).
  Cards = flat `var(--bg-color-secondary)` or transparent + `1px var(--border-color)`.
- **Restrained motion.** No auto-play, no lift-and-scale hovers, no entrance animations
  beyond a subtle fade. Everything disabled under `prefers-reduced-motion`.
- **Consistent chrome.** One shared header and one shared footer on every public route.

**Hard constraints:**

- The **41-theme system must keep working** (`themes.css` + `data-theme` + per-theme Google
  Fonts in `src/lib/themes.ts`). Themes keep owning colors + body font; the redesign works
  purely through shared CSS variables.
- **Dark + light mode** (next-themes `.dark`/`.light`) must both pass on every page.
- **No new runtime dependencies.** Fonts via Google Fonts `<link>` (existing pattern in
  `layout.tsx`). No Tailwind, no component library.
- Keep ISR/caching behavior (`revalidate = 60`, `getBlogPageData`, `getSettings`, etc.).
- Server Components by default; `'use client'` only where hooks/browser APIs demand it.
- All new/edited source files keep the MPL-2.0 header (see `AGENTS.md`).
- Verify each phase with `npm run lint && npm run test && npm run build` before moving on.

**Reference files (current state):**

- Public routes: `src/app/page.tsx`, `src/app/blog/page.tsx`, `src/app/projects/page.tsx`,
  `src/app/projects/[slug]/page.tsx`, `src/app/photos/page.tsx`,
  `src/app/photos/[albumSlug]/page.tsx`, `src/app/post/[slug]/page.tsx`
- Shared chrome: `src/components/SiteHeader.tsx`, `src/components/ComponentTabs.tsx`,
  `src/components/SearchBox.tsx`, `src/components/ThemeToggle.tsx`
- Blog: `src/components/blog/BlogContent.tsx`, `src/components/DynamicPostGrid.tsx`,
  `src/components/FeaturedPostsCarousel.tsx`, `src/components/TrendingPosts.tsx`,
  `src/components/RelatedPosts.tsx`
- Projects: `src/components/projects/ProjectCard.tsx`
- Photos: `src/components/photos/PhotoGrid.tsx`, `src/components/photos/Lightbox.tsx`
- Styles: `src/app/globals.css` (715 lines; admin styles from ~line 503),
  `src/app/themes.css` (1201 lines), `src/app/post/[slug]/post.css`,
  `src/app/post/[slug]/markdown.css`
- Data: `src/lib/blog-cache.ts`, `src/lib/projects-cache.ts`, `src/lib/photos-cache.ts`,
  `src/lib/settings-cache.ts`, `src/lib/renderContent.ts` (`getExcerpt`, `getFirstImage`)

---

## Phase 0 — Defect fixes (pre-redesign, user-facing bugs)

These are broken today regardless of redesign. Fix first, ship independently if needed.

- [x] **0.1** Listing cards missing excerpt + cover image: `normalizePosts()` in
  `src/app/page.tsx:20-33` (and the copy in `src/app/blog/page.tsx`) sets `content: ''`
  without pre-computing `excerpt`/`coverImage`, so `DynamicPostGrid.tsx:244-245` derives
  both from an empty string for all SSR posts (infinite-scroll posts get them from
  `src/app/api/posts/route.ts:61-62` — hence the inconsistency).
  **Fix:** pre-compute `excerpt` + `coverImage` in `getBlogPageData()` in
  `src/lib/blog-cache.ts` (same pattern as the API route) and pass them through
  `normalizePosts()`; drop the client-side derivation fallback in `DynamicPostGrid`.
- [x] **0.2** Featured carousel always excerpt-less/cover-less: `FeaturedPostsCarousel.tsx:59-60`
  computes excerpt/cover from `post.content`, which is `''` by then.
  **Fix:** consume the pre-computed `excerpt`/`coverImage` from 0.1.
- [x] **0.3** Hardcoded leftovers in `src/app/post/[slug]/page.tsx`:
  - `'Oceanic Velocity'` fallback ×3 (lines ~97, ~226, ~236) → `'ExploreCMS'`
    (and make the footer respect `settings.footerText` like the other pages).
  - Author role hardcoded to `'Design Strategist & Explorer'` (~line 174) → drop the role
    line or derive from settings.
  - Post nav links hardcoded to Home/Blog/Projects/Gallery → build from
    `enabledComponents` so disabled sections aren't linked (they 404).
- [x] **0.4** Per-card `<style>` tag injection — move the rules into `globals.css`:
  `src/app/photos/page.tsx:94` (`.album-card`), `src/components/projects/ProjectCard.tsx:69`,
  `src/components/photos/PhotoGrid.tsx:60`.
- [x] **0.5** `alt=""` on content images: `src/components/RelatedPosts.tsx:106` and post
  hero `src/app/post/[slug]/page.tsx:135` → use the post title.
- [x] **0.6** Raw `<img>` for blog covers: `src/components/DynamicPostGrid.tsx:310` →
  `next/image` with proper `sizes`; keep `className="card-img"` hover behavior working.
- [x] **0.7** Photos page "0 photos" badge seen on production album card — check
  `_count.photos` in `src/lib/photos-cache.ts`; hide the badge when count is 0.
- [x] **0.8** Verify: `npm run lint && npm run test && npm run build`; eyeball `/` on dev —
  SSR cards now show excerpt + cover, carousel shows excerpt + image.

---

## Phase 1 — Design tokens & typography foundation

- [x] **1.1** In `src/app/globals.css` `:root`, add editorial tokens (keep all existing
  variables untouched for admin/themes):
  - Fonts: `--font-display: 'Fraunces', Georgia, serif` and `--font-body` (already
    effectively theme-controlled; formalize).
  - Type scale: `--text-sm` through `--text-4xl` (fluid `clamp()` for the top steps).
  - Spacing scale: `--space-1`…`--space-16` (4px base).
  - Line lengths: `--measure: 68ch` for reading columns.
  - Hairline: reuse `--border-color`.
- [x] **1.2** Load Fraunces globally in `src/app/layout.tsx` `<head>` (Google Fonts,
  alongside the existing per-theme `fontUrl`; `display=swap`). Display font is
  theme-independent; themes that already use serif body fonts (marble, royal, autumn,
  copper, steampunk…) get a per-theme `--font-display` override in `themes.css` if the
  pairing clashes — spot-check those themes specifically.
- [x] **1.3** Add shared public-page utility classes to `globals.css` (new "Public
  editorial" section, admin section untouched):
  `.eyebrow` (uppercase section label w/ letterspacing, replaces pill badges),
  `.display-1/.display-2` (serif display headings; *retire `.heading-xl` gradient text on
  public pages*), `.lede` (intro paragraph, `var(--text-secondary)`),
  `.rule` (hairline divider), `.section` (vertical rhythm),
  `.card` (flat surface + hairline + subtle hover border-color change),
  `.meta` (small caps date/author rows).
- [x] **1.4** Add a global `@media (prefers-reduced-motion: reduce)` block in
  `globals.css`: disable `.fade-in-up`, `gradientFlow`, skeleton pulse, card transitions,
  and scroll-behavior smoothing.
- [x] **1.5** Verify: `npm run lint && npm run build`; spot-check ≥5 themes (default,
  midnight — production's theme, plus marble/royal/autumn for serif clashes) in dark+light.

---

## Phase 2 — Shared chrome (header, footer, hero, icons)

- [x] **2.1** Create `src/components/SiteFooter.tsx` (settings-aware `footerText`,
  hairline top border, small caps). Replace the 6 copy-pasted footers in `page.tsx`,
  `blog/page.tsx`, `projects/page.tsx`, `projects/[slug]/page.tsx`, `photos/page.tsx`,
  `photos/[albumSlug]/page.tsx`.
- [x] **2.2** Create `src/components/PageHero.tsx`: `.eyebrow` + display heading + lede,
  left-aligned (editorial) instead of the current centered pill + gradient heading.
  Props: `eyebrow`, `title`, `description`.
- [x] **2.3** Redesign `src/components/SiteHeader.tsx`: single row, sticky, hairline bottom
  border, backdrop blur; wordmark left (plain strong text, no gradient), component nav as
  text links with an underline active state (fold `ComponentTabs` in, keep
  `aria-current="page"` and mobile horizontal scroll), `SearchBox` + `ThemeToggle` right.
  Remove all inline styles from the header.
- [x] **2.4** `src/components/ThemeToggle.tsx`: replace 🌞/🌙 emoji with inline SVG
  sun/moon; fix the empty-40px-button-before-mount flash (fixed-size placeholder with
  `aria-label`).
- [x] **2.5** De-duplicate `src/app/page.tsx` vs `src/app/blog/page.tsx`: extract the shared
  render into one server component (e.g. `src/components/blog/BlogHome.tsx`); the two route
  files keep only their redirect/404 differences.
- [x] **2.6** Delete dead code: `src/components/Modal.tsx` (orphaned),
  `src/components/PostFeed.tsx` (unused), the `@modal` parallel route slot in
  `src/app/layout.tsx` + `src/app/@modal/` (verify no references first).
- [x] **2.7** Verify: `npm run lint && npm run test && npm run build`; header/footer identical
  on all public routes; mobile header scrolls nav horizontally.

---

## Phase 3 — Blog redesign

- [x] **3.1** Lead story: replace the auto-playing `FeaturedPostsCarousel` with a
  static editorial lead — large 16/9 cover, serif `display-1` headline, real excerpt
  (uses 0.1/0.2 data), `.meta` row (author, date, reading time if cheap). Multiple featured
  posts → 1 lead + up to 2 secondary stories in a row beneath. **Remove autoplay entirely.**
  (Delete `FeaturedPostsCarousel.tsx` once replaced.)
- [x] **3.2** "Latest Stories" becomes a magazine list in `DynamicPostGrid.tsx`: full-width
  rows (small fixed-aspect thumbnail left, headline + 2-line excerpt + meta right) separated
  by hairlines — *or* a 2-column grid on wide screens. Drop the masonry auto-fill grid and
  the lift-scale hover; hover = headline color/underline only. Keep cursor-based infinite
  scroll + `role="status"` loading announcement; add an end-of-list marker ("You've reached
  the end") instead of the empty sentinel.
- [x] **3.3** Filter nav: replace pill buttons + hover dropdowns with a simple underline
  tab row (Latest / Featured / tags). If dropdowns survive, add real menu keyboard support
  (arrow keys, Home/End, Escape, `aria-expanded`).
- [x] **3.4** Sidebar (`BlogContent.tsx`): keep position, restyle — Trending as a numbered
  editorial list (no glass panel), About as an "editor's note" blockquote style. Replace
  `onMouseEnter/Leave` hover in `TrendingPosts.tsx` with CSS `:hover`/`:focus-visible`.
- [x] **3.5** Section headers: drop the gradient icon tile; `.eyebrow` + `.display-2` +
  `.rule`.
- [x] **3.6** Empty state: typographic ("No stories yet."), no emoji.
- [x] **3.7** Update `src/app/blog/loading.tsx` (and root loading if present) skeletons to
  match the new list layout.
- [x] **3.8** Update/extend tests: `src/components/blog/BlogContent.test.tsx`,
  `src/components/TrendingPosts.test.tsx`, plus coverage for the new lead-story and list
  rendering (excerpt/cover present, filters work, end-of-list marker).
- [x] **3.9** Verify: `npm run lint && npm run test && npm run build`; home + `/blog`
  parity; tag filter URLs (`/?tag=x`) still work.

---

## Phase 4 — Projects redesign

- [x] **4.1** One unified grid in `src/app/projects/page.tsx` — remove the separate
  "Featured" section; featured projects sort first with a small "Featured" eyebrow badge.
- [x] **4.2** Case-study cards (`ProjectCard.tsx`): 16/9 cover, serif title, tagline,
  `.meta` row (status dot + label), tech chips (quiet, hairline-bordered). **Whole card is
  a link** to `/projects/[slug]`; GitHub/live remain separate icon links inside (nested-link
  safe pattern: card via stretched-link or absolutely-positioned overlay link).
- [x] **4.3** Page hero via `PageHero` (eyebrow "Projects", title, lede). Replace the
  centered pill + `heading-xl`.
- [x] **4.4** `projects/[slug]/page.tsx`: bring onto shared tokens/chrome — `SiteHeader`
  (already), `SiteFooter`, content in a `--measure` reading column, typographic gallery
  grid for `images[]`, quiet tech chips, status/featured as `.meta`, not gradient badges.
- [x] **4.5** Empty state typographic (no 🚀).
- [x] **4.6** Verify: lint/test/build; keyboard tab order on cards (card link → github →
  live); dark+light.

---

## Phase 5 — Photos redesign

- [ ] **5.1** Album cards (`src/app/photos/page.tsx`): larger 3:2 cover, title + `.meta`
  (photo count + newest photo date if cheap), no per-card `<style>` (done in 0.4), no
  "Featured" gradient badge (eyebrow instead).
- [ ] **5.2** Cover fallback: albums with no explicit cover use the **first photo** as
  cover (extend `getCachedAlbums()` in `src/lib/photos-cache.ts` to select the earliest
  photo URL); only if the album is empty show the gradient placeholder — kills the
  "empty product" look seen on production.
- [ ] **5.3** Album detail grid (`PhotoGrid.tsx`): replace CSS-columns masonry (breaks
  chronological order, causes reflow jank) with a **justified row layout** (fixed row
  height ~260–320px, `object-fit: cover`, small gaps) or a square-crop grid with
  `next/image` + `sizes`. Preserve photo order.
- [ ] **5.4** Lightbox polish (`Lightbox.tsx`): verify arrow-key/Escape handling, add
  caption + counter ("3 / 24"), respect reduced motion for transitions.
- [ ] **5.5** Page hero via `PageHero`; empty state typographic (no 📸).
- [ ] **5.6** Verify: lint/test/build; grid keeps order; no layout shift on load
  (widths/heights reserved); light+ dark.

---

## Phase 6 — Post detail unification

- [ ] **6.1** Replace the custom `.post-nav` in `src/app/post/[slug]/page.tsx` with the
  shared `SiteHeader` (keep `LanguageSwitcher`; move it into `SiteHeader` or the article
  toolbar). Delete the custom footer → `SiteFooter`.
- [ ] **6.2** Keep the good editorial bones (full-bleed hero, drop cap, reading time) but
  re-token `post.css` onto the shared variables from Phase 1 (fonts, spacing, hairlines);
  hero title uses `.display-1`; body uses `--font-body` at ≥18px with `--measure`.
- [ ] **6.3** `RelatedPosts.tsx`: match the Phase-3 card style, fix `alt=""` (0.5), and
  replace the `<style jsx>` block with a plain CSS module/globals class (styled-jsx is not
  a declared dependency — verify it even applies today).
- [ ] **6.4** Align `markdown.css` (code blocks, quotes, tables) with the editorial tokens.
- [ ] **6.5** Author row: real data only (name, date, reading time) — no hardcoded role
  (0.3). Tags as quiet `.meta` links to `/?tag=`.
- [ ] **6.6** Verify: lint/test/build; transition from listing → post feels like the same
  site; dark+light; reduced-motion.

---

## Phase 7 — Accessibility & motion pass (whole public site)

- [ ] **7.1** `prefers-reduced-motion` verified on every animation that survives
  (1.4 covers globals; check route CSS + inline transitions too).
- [ ] **7.2** `:focus-visible` styles on all public interactive elements (cards, tabs,
  search, toggle, lightbox controls, dropdowns).
- [ ] **7.3** Keyboard sweep: header nav, filter tabs, lightbox, search dialog
  (`SearchBox` already has good ARIA — regression-check only).
- [ ] **7.4** Alt-text audit on every `<img>`/`Image` (0.5 + blog covers use post title;
  photos use title/description; decorative-only images get `alt=""` deliberately).
- [ ] **7.5** Contrast spot-check: `var(--accent-color)` on `var(--bg-color)` for the
  default + midnight themes in both modes (WCAG AA for text links).
- [ ] **7.6** Emoji-free UI: no emoji used as icons anywhere public (empty states, toggle,
  badges).

---

## Phase 8 — Cleanup & ship

- [ ] **8.1** Remove dead CSS: `.heading-xl` gradient flow (if fully replaced),
  unused keyframes, `.glass` usages left on public pages, orphaned carousel styles
  (`globals.css` "Featured Posts Carousel" section).
- [ ] **8.2** Final gate: `npm run lint && npm run test && npm run build` — all green.
- [ ] **8.3** Manual sweep at 375px / 768px / 1280px in dark+light:
  `/`, `/blog`, `/post/[slug]`, `/projects`, `/projects/[slug]`, `/photos`,
  `/photos/[albumSlug]` — on default theme + midnight + one serif theme.
- [ ] **8.4** Update `AGENTS.md`: document the editorial tokens, `PageHero`/`SiteFooter`,
  "no inline styles on public pages" convention, global display-font loading, and the
  reduced-motion requirement.
- [ ] **8.5** Complete the Progress Log below; summarize residual risks.

---

## Progress Log

| Date | Phase | What happened | Next step |
|------|-------|---------------|-----------|
| 2026-07-20 | — | Plan created (Option B chosen after UI review of tun.lat). | Start Phase 0, item 0.1. |
| 2026-07-20 | 0 | **Phase 0 complete.** 0.1: excerpt/coverImage now pre-computed in `getBlogPageData()` (`blog-cache.ts`) and passed through both `normalizePosts()` copies; client-side derivation dropped from `DynamicPostGrid`. 0.2: carousel consumes pre-computed fields. 0.3: post page — `'ExploreCMS'` fallbacks, footer respects `footerText`, hardcoded author role removed, nav built from `enabledComponents`. 0.4: three per-card `<style>` blocks moved to `globals.css` ("Public Card Hover States"). 0.5: alt text on post hero + related cards. 0.6: blog covers now `next/image` (`fill`, sizes) — **added `images.remotePatterns: https/**` to `next.config.ts`** since covers come from arbitrary hosts (trade-off: any https image can be optimized). 0.7: 0-count badge hidden on empty albums. 0.8: lint clean, 189/189 tests pass, `next build` succeeds. **Committed `f184ea5`, pushed to `origin/related-posts-empty-end-of-posts`.** | Start Phase 1, item 1.1. |
| 2026-07-20 | 1 | **Phase 1 complete.** 1.1: editorial tokens in `:root` (`--font-display`, `--text-*` scale, `--space-*` scale, `--measure`). 1.2: Fraunces variable font loaded globally in `layout.tsx` (eslint-disable for the Pages-Router-oriented font rule); `--font-display` overrides for 7 serif themes (royal/marble/autumn/gothic/parchment/copper/steampunk) in `themes.css`. 1.3: public utilities `.eyebrow`, `.display-1/2`, `.lede`, `.rule`, `.section`, `.card`, `.meta`. 1.4: global `prefers-reduced-motion` block. 1.5: lint clean, 189/189 tests, build green. No visual change yet — foundations only. **Not committed yet.** | Commit Phase 1, then Phase 2 item 2.1 (SiteFooter). |
| 2026-07-20 | 2 | **Phase 2 complete.** 2.1: `SiteFooter.tsx` replaces all 6 duplicated footers. 2.2: `PageHero.tsx` created (adoption in Phases 3–5). 2.3: `SiteHeader` rebuilt — sticky + blur + hairline, serif wordmark, tabs as text links with `aria-current` underline, wraps to scrollable row 2 on mobile; `ComponentTabs` rewritten without inline styles/icons. 2.4: `ThemeToggle` SVG sun/moon on `.icon-btn`, no mount flash. 2.5: shared `BlogHome.tsx`; `page.tsx`/`blog/page.tsx` now thin shells. 2.6: deleted `Modal.tsx`, `PostFeed.tsx`, `@modal/` slot. Also added missing `--radius-sm`. 2.7: lint clean, 189/189 tests, build green (one fix: `sidebarAbout ?? undefined`). **Phases 1+2 uncommitted in working tree.** | Commit Phases 1+2, then Phase 3 item 3.1 (lead story). |
| 2026-07-20 | 1–2 | Phases 1+2 committed `7f8b2ec`, pushed to `origin/related-posts-empty-end-of-posts`. | Start Phase 3, item 3.1. |
| 2026-07-20 | 3 | **Phase 3 complete.** 3.1: `LeadStory.tsx` (1 lead + up to 2 secondary, static) replaces carousel — `FeaturedPostsCarousel.tsx` + all carousel/dropdown CSS deleted. 3.2: `DynamicPostGrid` now a magazine list (`.post-row`: thumb left, serif title, 2-line excerpt, tag chips, meta) + "You've reached the end." marker. 3.3: pill/dropdown filters → `.filter-tab` underline tabs (dropdown nav items flattened to tag tabs). 3.4: sidebar un-glassed — `.sidebar-section` hairlines, About as italic serif editor's note, TrendingPosts hover via `.trending-link` CSS (no JS handlers). 3.5: section headers = eyebrow + display-2 + rule; blog home hero → `PageHero` (kills `heading-xl` on blog). 3.6: `.empty-state` typographic. 3.7: blog loading skeleton matches new layout. 3.8: 2 new BlogContent tests (lead story link/excerpt, list excerpt + end marker). 3.9: lint clean, 191/191 tests, build green. **Committed `b84ee25`, pushed.** | Start Phase 4, item 4.1 (unified projects grid). |
| 2026-07-20 | 4 | **Phase 4 complete.** 4.1: unified `.project-grid`, featured pinned first. 4.2: `ProjectCard` rebuilt (server component, stretched-link whole-card nav, status dot + meta, quiet `.tag-chip`s, icon links z-indexed above). 4.3: `PageHero` on `/projects`. 4.4: detail page on shared tokens (`.display-1`, `.lede`, `.action-btn`, `.project-gallery-*`); **also fixed: project rich content was entirely unstyled — now imports post.css typography (dedup tracked for Phase 6/8)**. 4.5: `.empty-state`. Cleanup: old `.project-card:hover` lift rules removed; `.post-row-tags` renamed to shared `.tag-list`. 4.6: lint clean, 191/191 tests, build green. **Not committed yet.** | Commit Phase 4, then Phase 5 item 5.1 (album cards). |
